---
tags: [database, mysql, prepared-statement, performance, nodejs]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["Prepared Statement Cache", "Prepared Statement 캐시", "PS 캐시 폭발"]
---

# Prepared Statement와 캐시 경계

Prepared Statement는 SQL 구조를 먼저 준비하고 실행할 때 값만 바인딩한다. 같은 SQL shape를 한 세션에서 반복하면 parsing 변환 비용을 줄이고, 값이 SQL 문법으로 해석되지 않게 해 injection 위험을 낮춘다(방어 범위와 식별자 자리의 한계는 [[SQL-Injection]]). 일회성 shape가 계속 늘면 준비와 캐시 비용만 커질 수 있다.

## 서버 동작

MySQL 8.4는 SQL의 `PREPARE`/`EXECUTE` 인터페이스와 client/server binary protocol의 server-side prepared statement를 지원한다. 서버가 prepared statement를 기본으로 켜거나 끄는 단일 모드가 있는 것이 아니라, 애플리케이션이 사용하는 connector와 API가 어느 프로토콜을 선택하는지가 중요하다. 특정 JDBC 옵션의 기본값을 MySQL 전체 동작으로 일반화하지 않는다.

```sql
PREPARE find_user FROM
  'SELECT id, email FROM users WHERE id = ?';
SET @user_id = 42;
EXECUTE find_user USING @user_id;
DEALLOCATE PREPARE find_user;
```

- 준비한 내부 구조는 생성한 session에만 속하며 다른 connection과 공유되지 않는다.
- session이 끝나면 서버가 남은 statement를 해제한다. 수동 API는 사용이 끝나면 명시적으로 close한다.
- 테이블 metadata가 바뀌면 다음 실행에서 자동 reprepare가 일어날 수 있다.
- `max_prepared_stmt_count`는 모든 session을 합친 서버 전역 상한이며 MySQL 8.4 기본값은 16,382다. 0이면 prepared statement 생성을 막는다.
- prepared statement는 query result cache가 아니다. 실행 결과를 재사용하지 않으며 실행 계획 이득도 workload와 버전에 따라 측정해야 한다.

파라미터는 값을 바인딩하는 경계다. table, column, 정렬 방향 같은 식별자와 SQL 구조를 안전하게 만들어 주지 않는다. 동적 식별자는 서버 허용 목록에서 선택한다.

## mysql2와 TypeORM

현재 NestJS 경계의 mysql2에서 `connection.execute(sql, values)`는 SQL을 준비하고 같은 connection의 cache에서 재사용한다. cache는 connection별 LRU이며 기본 최대 크기는 16,000이다. eviction된 statement는 close된다.

```typescript
await dataSource.query(
  'SELECT id, email FROM users WHERE id = ?',
  [userId],
)
```

실제 TypeORM 경로가 mysql2의 `execute()` 또는 text protocol 중 무엇을 쓰는지는 사용 중인 버전과 호출 API로 확인한다. 파라미터 배열이 보인다는 사실만으로 server-side prepare와 재사용을 단정하지 않는다.

mysql2의 수동 `prepare()`는 자동 LRU에 들어가지 않는다. 반환된 statement의 `close()`를 호출해야 하며, connection reset이나 종료 뒤에는 재사용할 수 없다.

## 동적 SQL shape 폭증

다음은 값만 달라지는 것이 아니라 SQL 자체가 달라지는 경우다.

- bulk INSERT의 행 수가 매번 달라져 placeholder 개수가 변함
- 선택 column 조합과 table 이름이 계속 변함
- optional filter를 문자열로 조합해 조건 순서까지 달라짐
- 값 literal을 SQL에 직접 넣어 같은 의미가 매번 다른 문자열이 됨

connection pool에서는 같은 shape도 connection마다 별도 statement가 된다. 가능한 고유 shape 수에 pool connection 수를 곱한 값이 client cache 수요의 상한 후보지만, 서버 전역 상한과 client LRU 상한은 서로 다른 값이다.

## 선택과 대응

| 상황 | 기본 선택 |
|---|---|
| 같은 짧은 OLTP 쿼리 반복 | 파라미터화, driver의 재사용 동작 확인 |
| 명시적 prepare 후 반복 loop | loop 밖에서 한 번 준비, 같은 connection에서 실행 후 close |
| 거의 모든 SQL shape가 일회성 | text protocol 또는 shape 정규화 검토 |
| 가변 bulk INSERT | 고정 batch 크기, 허용된 column set, 재사용률과 packet 한도 비교 |
| cache 증가가 의심됨 | server count와 client heap, connection별 shape를 함께 관측 |

text protocol로 바꾸는 것은 문자열 연결을 허용한다는 뜻이 아니다. mysql2 `query()`를 쓰더라도 값은 driver parameter API로 전달하고 식별자는 허용 목록으로 제한한다.

## 관측

```sql
SHOW GLOBAL STATUS LIKE 'Prepared_stmt_count';
SHOW GLOBAL VARIABLES LIKE 'max_prepared_stmt_count';
```

- `Prepared_stmt_count`와 `Com_stmt_prepare`, `Com_stmt_execute`, `Com_stmt_close`, `Com_stmt_reprepare`의 추이를 본다.
- client heap에서 cached statement 수와 retained size를 connection별로 본다.
- 고유 normalized SQL shape 수, prepare 대비 execute 비율과 pool 크기를 같이 기록한다.
- 상한만 키우기 전에 shape 폭증과 connection 수가 의도된 것인지 확인한다.

## 출처

- [MySQL 8.4 Reference Manual, Prepared Statements](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html)
- [MySQL 8.4 Reference Manual, Caching of Prepared Statements and Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/statement-caching.html)
- [MySQL 8.4 Reference Manual, max_prepared_stmt_count](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_max_prepared_stmt_count)
- [mysql2, Prepared Statements](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements)
- [인프런, Real MySQL 시즌 1 - Part 1, Prepared Statement](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226571)

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[Execution-Plan|실행 계획]]
- [[Connection-Pool|Connection Pool]]
- [[OOM-Troubleshooting-Cases|Node.js OOM 사례]]
