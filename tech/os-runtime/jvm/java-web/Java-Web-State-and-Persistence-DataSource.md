---
tags: [java, web, jdbc, datasource, jndi, tomcat, connection-pool]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Container-managed DataSource", "JNDI DataSource", "JDBC driver 배치"]
---

# Servlet Container의 JDBC driver와 DataSource

외부 Servlet Container에 WAR로 배포한 애플리케이션은 JDBC driver와 connection pool을 누가 load하고 소유하는지에 따라 설정 위치와 실패 양상이 달라진다. JDBC 실행 흐름과 DAO 경계는 [[Java-Web-State-and-Persistence]], pool 크기 산정과 운영 지표는 [[Connection-Pool]]에서 다룬다.

## driver jar는 load하는 주체가 보는 곳에 둔다

과거 실습처럼 driver jar를 JRE의 `lib/ext`에 복사하는 방식은 현재 JDK에서 재현되지 않는다. JDK 9의 JEP 220이 extension mechanism(`lib/ext` 디렉터리와 `java.ext.dirs` system property)을 제거했고, 이 디렉터리가 있거나 property를 지정하면 compiler와 launcher가 실패한다. jar를 runtime 전역에 설치해 모든 애플리케이션에 보이게 하는 방식 자체가 없어졌으므로 driver는 class path나 module path에 둔다.

| connection을 만드는 주체 | driver 위치 | 주의점 |
|---|---|---|
| 애플리케이션이 `DriverManager`나 자체 pool로 직접 연결 | WAR의 `WEB-INF/lib`(build dependency) | Tomcat에서는 자동 등록되지 않는다. 아래 절 참고 |
| Tomcat이 관리하는 JNDI DataSource | `$CATALINA_HOME/lib` | Container의 pool이 driver class를 볼 수 있어야 한다. |
| Spring Boot 실행 JAR | application class path | driver와 pool이 같은 class path에 있다. |

같은 driver의 서로 다른 버전을 두 위치에 함께 두지 않는다.

### WEB-INF/lib의 driver는 자동 등록되지 않는다

JDBC 4 driver는 `META-INF/services/java.sql.Driver`로 자신을 알려 `DriverManager`가 자동으로 찾는다. Tomcat 11 문서는 이 service provider 방식이 servlet container 환경에서는 모든 Java 버전에서 근본적으로 깨져 있다고 설명한다. `DriverManager`는 driver를 한 번만 scan하는데, Tomcat에 기본으로 켜진 JRE Memory Leak Prevention Listener가 startup 때 이 scan을 실행한다. 그래서 common classloader가 보는 `$CATALINA_HOME/lib`, `$CATALINA_BASE/lib`, class path와 module path의 driver만 자동 등록된다.

- `WEB-INF/lib`에 driver를 둔 web application은 `Class.forName` 등으로 driver를 명시적으로 등록해야 한다. 오래된 강의 코드에서 `Class.forName`을 지웠을 때 driver를 찾지 못하는 조건이 이것이다.
- web application이 등록한 driver는 application이 멈출 때 해제해야 memory leak을 피한다. Tomcat도 web application classloader가 load한 driver를 찾아 해제하려 시도하지만, 문서는 application이 `ServletContextListener`로 직접 하기를 기대한다.
- Oracle 9i 이후 driver class 이름은 `oracle.jdbc.OracleDriver`다. 옛 이름 `oracle.jdbc.driver.OracleDriver`는 Oracle이 deprecated로 밝힌 이름이다.

## Container-managed DataSource와 JNDI

요청마다 driver 로드, 연결, 종료를 반복하면 요청이 몰릴 때 연결 비용이 커진다. Container가 pool을 소유하게 하면 애플리케이션 코드는 driver, URL과 credential을 모른 채 이름으로 DataSource만 찾는다.

```xml
<!-- META-INF/context.xml -->
<Context>
  <Resource name="jdbc/app" auth="Container" type="javax.sql.DataSource"
            driverClassName="oracle.jdbc.OracleDriver"
            url="jdbc:oracle:thin:@db:1521/app" username="app" password="..."
            initialSize="5" minIdle="5" maxTotal="20" maxIdle="10" maxWaitMillis="3000"/>
</Context>

<!-- WEB-INF/web.xml -->
<resource-ref>
  <res-ref-name>jdbc/app</res-ref-name>
  <res-type>javax.sql.DataSource</res-type>
  <res-auth>Container</res-auth>
</resource-ref>
```

```java
Context env = (Context) new InitialContext().lookup("java:/comp/env");
DataSource dataSource = (DataSource) env.lookup("jdbc/app");
try (Connection connection = dataSource.getConnection()) {
    // query와 mapping
}
```

- 코드에서 찾을 때는 `java:/comp/env`를 앞에 붙인다. `<resource-ref>`는 애플리케이션이 요구하는 resource를 선언한다.
- resource는 애플리케이션 전용 `Context`에 두거나, server의 `GlobalNamingResources`에 두고 여러 Context가 공유하게 할 수 있다.
- `type`은 Java SE JDBC API이므로 Jakarta namespace 전환 뒤에도 `javax.sql.DataSource`다.
- driver, URL과 credential이 code 밖 Container 설정으로 나가 재compile 없이 바꿀 수 있지만, `context.xml`의 평문 password는 별도 secret 관리 대상이다.
- 사용한 connection은 try-with-resources로 반드시 pool에 반환한다.

JNDI lookup은 Container가 소유한 resource를 이름으로 찾는 dependency lookup이다. Spring과 Spring Boot는 같은 역할을 DataSource bean 주입으로 하고 일반적으로 HikariCP를 쓴다([[Spring-JDBC-Essentials]]).

### Tomcat 기본 pool의 기본값

Tomcat의 기본 pool은 `$CATALINA_HOME/lib/tomcat-dbcp.jar`에 package 이름을 바꿔 담은 Commons DBCP 2다. DBCP 2의 기본값은 `initialSize` 0, `minIdle` 0, `maxTotal` 8, `maxIdle` 8이고 `maxWaitMillis`는 무한 대기다.

- 기본값만으로는 startup 때 connection을 열지 않고, 첫 대여 요청에서 만든 뒤 `maxIdle`까지 보관한다. 첫 요청 지연을 줄이려면 `initialSize`와 `minIdle`을 명시한다. 예제나 강의의 connection 수를 기본값으로 옮기지 않는다.
- `maxWaitMillis`가 무한 대기면 pool이 고갈될 때 요청 thread가 끝없이 기다린다. Tomcat 문서의 Oracle 예시도 `-1`이므로 그대로 복사하지 않고 request deadline보다 짧은 획득 timeout을 둔다. 위 예시의 값은 설명용이며 pool 크기는 [[Connection-Pool]]의 기준으로 정한다.

## 면접 체크포인트

- JDK 9 이후 driver jar를 어디에 두는지, Tomcat에서 `WEB-INF/lib` driver가 자동 등록되지 않는 이유를 설명한다.
- JNDI DataSource에서 `context.xml`, `resource-ref`와 `java:/comp/env` lookup의 역할을 나눠 말한다.
- DBCP 2 기본값이 첫 요청 지연과 pool 고갈 때 무한 대기로 이어지는 이유를 설명한다.

## 출처

- [OpenJDK, JEP 220: Modular Run-Time Images](https://openjdk.org/jeps/220)
- [Apache Tomcat 11, JNDI Datasource How-To](https://tomcat.apache.org/tomcat-11.0-doc/jndi-datasource-examples-howto.html)
- [Apache Commons DBCP, BasicDataSource Configuration](https://commons.apache.org/proper/commons-dbcp/configuration.html)
- [Java SE, DataSource](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/javax/sql/DataSource.html)
- [인프런, JDBC](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13671)
- [인프런, DAO와 DTO](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13672)
- [인프런, Connection Pool](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13673)

## 관련 문서

- [[Java-Web-State-and-Persistence|웹 상태와 JDBC 영속성]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[JVM-Architecture|JVM 아키텍처 (ClassLoader)]]
