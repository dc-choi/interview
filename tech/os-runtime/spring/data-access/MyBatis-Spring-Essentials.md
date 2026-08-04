---
tags: [spring, mybatis, sql-mapper, jdbc, dynamic-sql]
status: done
verified_at: 2026-08-04
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

Dynamic SQL이 syntax 조립을 줄여도 query cardinality, empty collection, wildcard escaping과 index 사용 여부는 대신 결정하지 않는다. 가능한 조건 조합을 parameterized integration test로 검증한다.

## Result mapping

단순 row는 `resultType`과 `mapUnderscoreToCamelCase`로 mapping할 수 있다. Column과 property가 다르거나 constructor, nested object와 collection이 필요하면 `resultMap`을 명시한다.

Association mapping이 object graph를 편리하게 만들 수 있지만 nested select는 N+1을 만들 수 있다. Join result mapping은 row 중복과 identity grouping을 확인한다. API가 필요한 projection이라면 entity graph를 흉내 내기보다 query 전용 row 또는 DTO를 반환하는 편이 단순할 수 있다.

## Transaction과 exception

`SqlSessionTemplate`은 thread-safe한 Spring integration 지점이며 현재 Spring transaction에 연결된 session을 사용한다. Mapper 호출에서 session을 직접 commit, rollback하거나 close하지 않는다. 같은 `DataSource`와 transaction manager를 사용하는지 확인한다.

MyBatis-Spring은 persistence exception을 Spring `DataAccessException`으로 변환한다. Retry는 exception class만 보고 자동 적용하지 않고 deadlock, serialization failure 같은 일시적 오류인지와 작업의 idempotency를 함께 판단한다.

## 검증 체크리스트

- Mapper XML namespace와 method id가 일치하는가
- 모든 외부 값이 `#{}`로 binding되는가
- `${}` identifier가 닫힌 allowlist에서만 나오는가
- Dynamic condition의 빈 값과 조합을 test했는가
- Result mapping이 null, alias와 중복 row를 처리하는가
- 실제 transaction에 mapper가 참여하는가
- Generated SQL의 실행 계획과 row 수를 확인했는가

## 출처

- [MyBatis Spring Boot Starter 4.0, Introduction](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
- [MyBatis-Spring, Getting Started](https://mybatis.org/spring/getting-started.html)
- [MyBatis 3, Mapper XML Files](https://mybatis.org/mybatis-3/sqlmap-xml.html)
- [MyBatis 3, Dynamic SQL](https://mybatis.org/mybatis-3/dynamic-sql.html)
- [MyBatis-Spring, Transactions](https://mybatis.org/spring/transactions.html)
- 김영한 강사, [MyBatis 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114642)
- 김영한 강사, [MyBatis 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114643)
- 김영한 강사, [MyBatis 적용 1, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114644)
- 김영한 강사, [MyBatis 적용 2, 설정과 실행](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114645)
- 김영한 강사, [MyBatis 적용 3, 분석](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114646)
- 김영한 강사, [MyBatis 기능 정리 1, 동적 쿼리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114647)
- 김영한 강사, [MyBatis 기능 정리 2, 기타 기능](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114648)
- 김영한 강사, [MyBatis 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114649)

## 관련 문서

- [[Spring-Data-Access-Strategy|Spring 데이터 접근 기술 선택]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Spring-Transactional|Spring transaction]]
- [[SQL|SQL]]
