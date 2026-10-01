---
tags: [spring, mybatis, sql-mapper, jdbc, dynamic-sql]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["MyBatis Spring Essentials", "MyBatis와 Spring"]
---

# MyBatis와 Spring

MyBatis는 SQL을 직접 소유하면서 JDBC parameter binding, result mapping과 resource lifecycle을 추상화하는 SQL mapper다. ORM처럼 object graph의 변경을 추적하지 않으며, 실행할 SQL과 반환 mapping을 application이 명시한다.

## Spring Boot 4.1 구성

MyBatis Spring Boot Starter 4.0 계열은 공식 호환표에서 Spring Boot 4.0 이상과 Java 17 이상을 대상으로 한다. Starter는 기존 `DataSource`를 찾아 다음 infrastructure를 구성한다.

```text
Mapper interface proxy
  -> SqlSessionTemplate
  -> SqlSessionFactory
  -> DataSource
  -> database
```

- `@Mapper`가 붙은 interface를 기본 scan하고 Spring bean proxy로 등록한다.
- Scan package나 marker를 바꾸려면 `@MapperScan`을 사용한다.
- Mapper XML 위치, type alias와 MyBatis 설정은 `mybatis.*` property로 구성한다.
- 여러 `DataSource`를 수동 구성하면 factory, template, transaction manager와 mapper scan의 연결을 각각 명시한다.

설정에서 조용히 틀리기 쉬운 지점은 다음과 같다.

- Mapper XML이 mapper interface와 같은 classpath 경로에 같은 이름으로 있으면(`src/main/resources/com/example/ItemMapper.xml`, namespace는 interface의 전체 이름) MyBatis-Spring이 자동으로 읽는다. 다른 곳에 모으면 `mybatis.mapper-locations=classpath:mapper/**/*.xml`처럼 위치를 지정한다.
- `mybatis.type-aliases-package`를 지정하면 XML의 `resultType`, `parameterType`에서 package 이름을 생략할 수 있다. 여러 package는 쉼표, 세미콜론이나 공백으로 구분한다.
- `mybatis.configuration.map-underscore-to-camel-case`는 MyBatis 기본값이 `false`다. 켜지 않으면 `item_name` column이 `itemName`에 매핑되지 않는데 예외 없이 `null` field로 남아 mapping test가 없으면 늦게 발견된다.
- `src/test/resources`에 같은 이름의 `application.properties`가 있으면 test classpath에서 그 파일이 먼저 발견돼 main 파일 대신 로드된다. MyBatis와 logging 설정을 test 쪽에도 넣는다.

Starter version을 강의의 오래된 조합으로 고정하지 않고 현재 Boot dependency graph 및 starter 호환표와 함께 검증한다.

## Mapper contract

Mapper interface의 method와 XML statement는 namespace와 id로 연결된다. Parameter와 result contract를 Java type으로 드러내고, XML은 SQL과 mapping에 집중시킨다.

```java
@Mapper
public interface ItemMapper {
    Optional<ItemRow> findById(long id);
    List<ItemRow> search(ItemCondition condition);
}
```

```xml
<select id="findById" resultType="com.example.ItemRow">
  select id, item_name, price
  from item
  where id = #{id}
</select>
```

Mapper proxy가 interface를 구현하므로 별도 위임 repository가 의미 있는 application contract나 mapping을 추가하지 않는다면 중복 계층이 될 수 있다. 반대로 persistence type과 domain type을 분리하거나 여러 mapper를 조합한다면 repository adapter가 유용하다.

- 파라미터가 둘 이상이면 `void update(@Param("id") Long id, @Param("updateParam") ItemUpdateDto updateParam)`처럼 이름을 붙이고 XML에서 `#{updateParam.itemName}`으로 참조한다. MyBatis mapper에는 `org.apache.ibatis.annotations.Param`, Spring Data repository의 `@Query`에는 `org.springframework.data.repository.query.Param`을 쓰므로 두 기술을 함께 쓰면 import를 혼동하기 쉽다.
- MyBatis 3.4.1부터 `useActualParamName` 기본값이 `true`라 `-parameters`로 compile하면 `@Param` 없이도 이름이 보존된다. build 설정에 따라 결과가 달라지므로 다중 파라미터는 `@Param`을 명시한다.
- DB가 만드는 key는 `<insert id="save" useGeneratedKeys="true" keyProperty="id">`로 파라미터 객체의 `id`에 채운다. 설정을 빠뜨리면 INSERT는 성공해도 반환 객체의 id가 비어 있다.
- `@Select` 같은 annotation SQL도 가능하지만 여러 줄 SQL과 동적 SQL에 약하다. 같은 statement를 annotation과 XML에 모두 두면 mapper 해석 중 `Mapped Statements collection already contains key` 오류로 기동이 실패한다.
- XML을 쓰는 이유 중 하나는 SQL tool에서 쓰던 여러 줄 SQL을 그대로 옮길 수 있다는 점이다. Java 문자열을 이어 붙이면 줄 끝 공백 누락 같은 실수가 compile이 아니라 실행 시 SQL 문법 오류로 드러난다. Java text block도 이 문제를 줄인다.

## Parameter binding과 injection

`#{value}`는 JDBC `PreparedStatement` parameter로 binding한다. 일반적인 사용자 값은 이 방식을 사용한다. `${value}`는 문자열을 SQL에 그대로 삽입하므로 escaping을 제공하지 않는다.

- 값에는 `#{}`를 사용한다.
- Column, direction 같은 SQL identifier를 동적으로 선택해야 하면 enum 또는 allowlist로 application에서 변환한다.
- `${}`에 request 값을 직접 전달하지 않는다.
- 실제 SQL과 bind 값을 test하되 운영 log에 credential과 개인정보를 남기지 않는다.

## Dynamic SQL

MyBatis XML은 OGNL expression과 다음 element로 SQL 조립을 돕는다.

| Element | 용도 |
|---|---|
| `if` | 조건부 fragment |
| `choose`, `when`, `otherwise` | 여러 분기 중 하나 선택 |
| `where`, `trim` | 비어 있는 WHERE와 앞쪽 AND, OR 정리 |
| `set` | Dynamic UPDATE의 comma 정리 |
| `foreach` | Collection을 IN, bulk value 등으로 전개 |

`<where>`는 안쪽 결과가 있을 때만 `WHERE`를 붙이고 맨 앞의 `AND`, `OR`를 제거한다. `<trim prefix="WHERE" prefixOverrides="AND |OR ">`와 같은 동작이다.

```xml
<select id="findAll" resultType="Item">
  select id, item_name, price, quantity from item
  <where>
    <if test="itemName != null and itemName != ''">
      and item_name like concat('%', #{itemName}, '%')
    </if>
    <if test="maxPrice != null">
      and price &lt;= #{maxPrice}
    </if>
  </where>
</select>
```

- XML에서 `<`, `>`는 태그로 해석되므로 `&lt;`, `&gt;`로 escape하거나 `<![CDATA[ ... ]]>`로 감싼다. CDATA 안은 문자 그대로라 `<if>`, `<where>` 같은 동적 태그가 동작하지 않으므로 조건 fragment 안쪽에만 쓴다. 표기 실수는 기동 시 XML parsing 오류나 실행 시 SQL 문법 오류로 드러난다.
- `if test`의 OGNL은 null과 빈 문자열 비교처럼 단순하게 유지하고, 복잡한 분기는 Java에서 조건 객체를 만들어 넘긴다.
- 단건 조회와 목록 조회가 공유하는 column 목록이나 조건은 `<sql id>`로 정의하고 `<include refid>`로 재사용한다. `<include>` 안의 `<property>` 값은 load 시점에 정적으로 치환된다.

Dynamic SQL이 syntax 조립을 줄여도 query cardinality, empty collection, wildcard escaping과 index 사용 여부는 대신 결정하지 않는다. 가능한 조건 조합을 parameterized integration test로 검증한다.

## Result mapping

단순 row는 `resultType`과 `mapUnderscoreToCamelCase`로 mapping할 수 있다. Column과 property가 다르거나 constructor, nested object와 collection이 필요하면 `resultMap`을 명시한다.

Association mapping이 object graph를 편리하게 만들 수 있지만 nested select는 N+1을 만들 수 있다. Join result mapping은 row 중복과 identity grouping을 확인한다. API가 필요한 projection이라면 entity graph를 흉내 내기보다 query 전용 row 또는 DTO를 반환하는 편이 단순할 수 있다.

## Transaction과 exception

`SqlSessionTemplate`은 thread-safe한 Spring integration 지점이며 현재 Spring transaction에 연결된 session을 사용한다. Mapper 호출에서 session을 직접 commit, rollback하거나 close하지 않는다. 같은 `DataSource`와 transaction manager를 사용하는지 확인한다.

MyBatis-Spring은 persistence exception을 Spring `DataAccessException`으로 변환한다. Retry는 exception class만 보고 자동 적용하지 않고 deadlock, serialization failure 같은 일시적 오류인지와 작업의 idempotency를 함께 판단한다. Transient와 NonTransient 분류는 [[Spring-JDBC-Essentials]]의 예외 번역 경계에 있다.

## 검증 체크리스트

- Mapper XML namespace와 method id가 일치하는가
- `map-underscore-to-camel-case`, type alias와 XML 위치 설정이 test 설정에도 있는가
- 다중 파라미터에 MyBatis의 `@Param`을 명시했는가
- 생성 key가 필요한 INSERT에 `useGeneratedKeys`와 `keyProperty`가 있는가
- XML의 `<`, `>`를 escape했고 CDATA가 동적 태그를 감싸지 않는가
- 모든 외부 값이 `#{}`로 binding되는가
- `${}` identifier가 닫힌 allowlist에서만 나오는가
- Dynamic condition의 빈 값과 조합을 test했는가
- Result mapping이 null, alias와 중복 row를 처리하는가
- 실제 transaction에 mapper가 참여하는가
- Generated SQL의 실행 계획과 row 수를 확인했는가

## 출처

- [MyBatis Spring Boot Starter 4.0, Introduction](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
- [MyBatis-Spring, Getting Started](https://mybatis.org/spring/getting-started.html)
- [MyBatis-Spring, Injecting Mappers](https://mybatis.org/spring/mappers.html)
- [MyBatis 3, Configuration](https://mybatis.org/mybatis-3/configuration.html)
- [MyBatis 3, Mapper XML Files](https://mybatis.org/mybatis-3/sqlmap-xml.html)
- [MyBatis 3, Dynamic SQL](https://mybatis.org/mybatis-3/dynamic-sql.html)
- [MyBatis 3.5.19, `Configuration` source](https://github.com/mybatis/mybatis-3/blob/mybatis-3.5.19/src/main/java/org/apache/ibatis/session/Configuration.java)
- [MyBatis-Spring, Transactions](https://mybatis.org/spring/transactions.html)
- 김영한 강사, [MyBatis 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114642)
- 김영한 강사, [MyBatis 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114643)
- 김영한 강사, [MyBatis 적용 1, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114644)
- 김영한 강사, [MyBatis 적용 2, 설정과 실행](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114645)
- 김영한 강사, [MyBatis 적용 3, 분석](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114646)
- 김영한 강사, [MyBatis 기능 정리 1, 동적 쿼리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114647)
- 김영한 강사, [MyBatis 기능 정리 2, 기타 기능](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114648)
- 김영한 강사, [MyBatis 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114649)
- 김영한 강사, [스프링 데이터 JPA 적용 1](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114663)

## 관련 문서

- [[Spring-Data-Access-Strategy|Spring 데이터 접근 기술 선택]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Spring-Transactional|Spring transaction]]
- [[SQL|SQL]]
