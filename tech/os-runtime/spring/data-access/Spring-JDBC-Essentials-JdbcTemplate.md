---
tags: [spring, jdbc, jdbc-template, named-parameter, generated-key]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JdbcTemplate API 계약", "SimpleJdbcInsert", "NamedParameterJdbcTemplate"]
---

# JdbcTemplate API 계약

`JdbcTemplate` 계열 API가 조회 결과 개수, 변경 행 수, 생성 key와 parameter binding에 대해 약속하는 계약과 흔한 실패를 다룬다. JDBC resource 관리, 예외 번역과 transaction 참여는 [[Spring-JDBC-Essentials|Spring JDBC Essentials]]에 있다. 기준은 Spring Framework 7.0.9와 Spring Boot 4.1.1이다.

## 조회 결과 개수 계약

| API | 0건 | 2건 이상 |
|---|---|---|
| `queryForObject(sql, rowMapper, args...)` | `EmptyResultDataAccessException` | `IncorrectResultSizeDataAccessException` |
| `query(sql, rowMapper, args...)` | 빈 `List` | 전체 `List` |
| `DataAccessUtils.optionalResult(list)`, `JdbcClient`의 `optional()` | `Optional.empty()` | `IncorrectResultSizeDataAccessException` |

`EmptyResultDataAccessException`은 `IncorrectResultSizeDataAccessException`의 하위 타입이다. `queryForObject`는 count처럼 반드시 1행이 나오는 조회에 쓴다. 없을 수 있는 ID 조회에 그대로 쓰면 not found가 unchecked 예외로 service와 web 계층까지 올라가고, 전역 예외 처리에서 404 대신 500으로 매핑될 수 있다.

```java
record Member(long id, String name) {}

private static final RowMapper<Member> MEMBER_ROW_MAPPER =
    (rs, rowNum) -> new Member(rs.getLong("id"), rs.getString("name"));

Optional<Member> findById(long id) {
    List<Member> rows = jdbcTemplate.query(
        "select id, name from member where id = ?", MEMBER_ROW_MAPPER, id);
    return DataAccessUtils.optionalResult(rows);
}
```

- 없을 수 있는 조회는 repository가 `Optional`을 반환하고 호출자가 부재를 업무 흐름으로 처리한다. 중복 가입 검증은 `findByName(name).ifPresent(m -> { throw new IllegalStateException("이미 존재하는 회원입니다."); })`처럼 값이 있을 때만 실패한다.
- `queryForObject`의 `EmptyResultDataAccessException`을 repository 안에서 잡아 `Optional.empty()`로 바꾸는 방식도 같은 계약을 만든다. 부재를 예외로 service까지 올리지 않는 것이 핵심이다.
- `rows.stream().findAny()`는 2건 이상일 때 조용히 한 행을 고른다. business key 조회에서 2건은 데이터 오류이므로 DB UNIQUE 제약으로 막고 크기를 검사하는 API를 쓴다.
- 숫자나 문자열 하나는 `queryForObject(sql, Integer.class, args...)`처럼 반환 타입을 넘긴다.
- memory, JDBC, JPA 구현이 같은 계약(없는 ID는 empty)을 지키는지 공통 계약 test로 확인한다([[Spring-Testing-Essentials]]).

## 변경 결과 행 수

`update(...)`는 INSERT, UPDATE, DELETE에 공통으로 쓰고 영향받은 행 수를 반환한다. 순수 JDBC `executeUpdate()`의 반환값과 같다. 단건 수정과 삭제에서 0은 대상이 없거나 version 조건이 맞지 않은 동시 변경일 수 있으므로 버리지 말고 예상 개수와 비교해 업무 오류로 바꾼다. DDL 같은 임의 SQL은 `execute(...)`, stored procedure는 `SimpleJdbcCall`로 호출한다.

## 생성 key 회수

id 생성 주체(application sequence, DB identity, DB sequence, UUID)를 정하면 생성 값을 객체로 되돌리는 경로도 함께 정한다.

| API | 회수 방법 |
|---|---|
| 순수 JDBC | `prepareStatement(sql, new String[]{"id"})`나 `Statement.RETURN_GENERATED_KEYS`로 만들고 실행 뒤 `getGeneratedKeys()` |
| `JdbcTemplate` | `update(PreparedStatementCreator, KeyHolder)`에 `GeneratedKeyHolder`를 넘기고 `keyHolder.getKey()` |
| `NamedParameterJdbcTemplate` | `update(sql, paramSource, keyHolder)` |
| `SimpleJdbcInsert` | `withTableName("item").usingGeneratedKeyColumns("id")`로 만들고 `executeAndReturnKey(paramSource)`가 반환한 `Number` |
| `JdbcClient` | `update(keyHolder)` |
| JPA | `@GeneratedValue(strategy = GenerationType.IDENTITY)`면 `persist` 뒤 entity id가 채워진다([[Spring-Data-JPA-Entity-Persistence]]) |

- `PreparedStatementCreator` 방식은 statement를 직접 다뤄 가장 번거롭고, 생성 key를 요청하는 표준 방법이 하나로 정해져 있지 않아 key column 지정 방식을 driver별로 확인한다.
- `SimpleJdbcInsert`는 INSERT SQL 없이 `DataSource`의 table metadata로 column을 알아낸다. 일부 column만 넣을 때만 `usingColumns(...)`를 지정한다. 첫 실행 때 compile하며 DEBUG log `Compiled insert object: insert string is [...]`로 만들어진 SQL을 확인한다.
- `SimpleJdbcInsert`는 여러 thread가 재사용할 수 있지만 table 하나에 묶이므로 공용 Bean보다 해당 repository 생성자에서 `DataSource`로 만든다.
- metadata 편의와 별개로 schema와 생성 key 규칙은 migration과 test로 검증한다.
- 회수를 빠뜨리면 INSERT는 성공해도 반환 객체의 id가 비어 저장 뒤 반환하는 id, 후속 조회와 응답 DTO가 깨진다. 저장 뒤 반환 id로 다시 조회하는 계약 test를 구현마다 둔다.

## 순서 binding과 이름 binding

`?` 순서 binding은 SQL column 순서와 인자 순서가 어긋나면 값이 다른 column에 들어간다. `update item set item_name=?, price=?, quantity=? where id=?`에 price와 quantity 순서를 바꿔 넘기면 둘 다 정수라 예외 없이 뒤바뀐 값이 저장된다. 코드는 재배포로 고쳐도 이미 저장된 데이터는 찾아서 보정해야 하므로 가장 비싼 종류의 버그다. 코드 몇 줄을 줄이는 것보다 모호함을 없애는 편이 중요하므로 값이 여러 개면 이름 binding을 기본으로 한다.

`NamedParameterJdbcTemplate`은 `:name` placeholder를 실제 JDBC parameter로 변환해 순서가 바뀌어도 값과 의미를 연결하기 쉽다. 동적 query에서 순서 binding은 조건 분기마다 parameter 목록을 SQL 조립 순서와 맞춰야 하지만, 이름 binding은 값을 먼저 넣어 두고 SQL에 필요한 이름만 등장시키면 된다.

| Parameter source | 쓰는 경우 |
|---|---|
| `Map.of("id", id)` | 값이 한두 개일 때 |
| `MapSqlParameterSource` | key를 직접 지정하고 method chain으로 값이나 SQL type을 더할 때 |
| `BeanPropertySqlParameterSource` | 객체 getter나 record component 이름으로 key를 자동 생성할 때 |

`BeanPropertySqlParameterSource`는 객체에 없는 값을 만들 수 없다. id가 없는 update DTO로 `where id = :id`를 채우려면 `MapSqlParameterSource`로 id를 함께 넣는다. 반대로 예상하지 않은 field까지 binding되지 않는지 SQL과 계약을 함께 검토한다.

## Row mapping

`BeanPropertyRowMapper.newInstance(Item.class)`는 column 이름으로 setter를 찾고 `item_name` 같은 underscore column을 `itemName` 같은 camel-case property에 매핑한다. 이름이 완전히 다르면 `select member_name as username`처럼 SQL alias로 맞춘다. 기본 생성자와 setter가 필요하므로 record는 `DataClassRowMapper`를 쓴다. 두 mapper 모두 constructor invariant와 복잡한 conversion을 대신 설계하지 않으므로 domain object에는 명시적 `RowMapper`가 더 안전할 수 있다.

## Dynamic SQL

Optional condition이 많아지면 문자열 조립에서 빈 `WHERE`, 앞쪽 `AND`, parameter 누락이 생기기 쉽다. 작은 query라면 clause와 parameter를 같은 분기에서 조립하고 조합 test를 둔다. 조건이 복잡해지면 MyBatis, Querydsl 또는 명시적 query builder와 비교한다.

## 흔한 실수

- 없을 수 있는 조회에 `queryForObject`를 쓰고 0건 test를 두지 않는다.
- `update`의 반환값을 버려 0건 변경을 성공으로 처리한다.
- 순서 binding 인자를 바꿔 넘겨 예외 없이 잘못된 값을 저장한다.
- 생성 key를 회수하지 않아 id가 빈 객체를 반환한다.

## 출처

- [Spring Framework, JDBC Core](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)
- [Spring Framework, Simplifying JDBC Operations with the SimpleJdbc Classes](https://docs.spring.io/spring-framework/reference/data-access/jdbc/simple.html)
- [Spring Framework API, JdbcTemplate](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html)
- [Spring Framework API, DataAccessUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/support/DataAccessUtils.html)
- [Spring Framework API, SimpleJdbcInsert](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/simple/SimpleJdbcInsert.html)
- [Spring Framework API, BeanPropertyRowMapper](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/BeanPropertyRowMapper.html)
- [Spring Framework 7.0.9, `AbstractJdbcInsert` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/core/simple/AbstractJdbcInsert.java)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Java SE 26 API, Statement](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/Statement.html)
- [인프런, JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13738)
- 김영한 강사, [회원 도메인과 리포지토리 만들기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49581)
- 김영한 강사, [회원 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49583)
- 김영한 강사, [회원 서비스 테스트](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49584)
- 김영한 강사, [스프링 JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49596)
- 김영한 강사, [JPA](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49597)
- 김영한 강사, [JdbcTemplate 적용 1, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114624)
- 김영한 강사, [JdbcTemplate 적용 2, 동적 쿼리 문제](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114625)
- 김영한 강사, [JdbcTemplate 이름 지정 파라미터 1](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114627)
- 김영한 강사, [JdbcTemplate 이름 지정 파라미터 2](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114628)
- 김영한 강사, [JdbcTemplate 이름 지정 파라미터 3](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114629)
- 김영한 강사, [JdbcTemplate SimpleJdbcInsert](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114630)
- 김영한 강사, [JdbcTemplate 기능 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114631)
- 김영한 강사, [JdbcTemplate 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114632)

## 관련 문서

- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[MyBatis-Spring-Essentials|MyBatis와 Spring]]
- [[Spring-Data-Access-Strategy|Spring 데이터 접근 기술 선택]]
- [[Spring-Data-JPA-Entity-Persistence|엔티티 저장]]
