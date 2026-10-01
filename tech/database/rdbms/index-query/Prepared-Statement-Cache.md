---
tags: [database, mysql, postgresql, prepared-statement, performance, nodejs]
status: done
verified_at: 2026-09-30
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

## 서버 사이드 준비가 이득이 되는 조건

server-side prepared statement는 공짜 캐시가 아니다. 다음 조건이 맞을 때 이득이 남는다.

- 왕복: 첫 실행은 prepare와 execute로 서버와 두 번 통신한다. 반복문 안에서 매번 prepare하면 매번 두 번 통신하고 재사용 없이 준비 비용만 낸다. ORM이 이런 호출을 만들기 쉽다.
- 절약되는 비용: MySQL 문서는 문장을 내부 구조로 변환해 세션에 캐시하고 metadata가 바뀌면 최대 세 번까지 다시 파싱한다고 설명할 뿐 실행 계획 재사용은 약속하지 않는다. 절약되는 것은 주로 파싱과 변환이라 복잡한 쿼리에는 이득이 있지만 단순 OLTP 쿼리는 원래 파싱 비용이 작다.
- connection 수와 수명: 캐시가 connection마다 따로 쌓이므로 connection이 적고 오래 살아야 재사용된다. pool의 max lifetime이나 idle 정리가 짧거나 요청마다 연결하면 준비 비용만 반복된다.
- 서버 상한: connection 5,000개에 shape 100개면 이론상 50만 개가 필요하지만 `max_prepared_stmt_count` 기본값은 서버 전체 16,382개다. 상한에 닿으면 서버가 LRU로 비우는 것이 아니라 새 prepare가 오류 1461(`ER_MAX_PREPARED_STMT_COUNT_REACHED`, SQLSTATE 42000)로 실패한다. 오래된 statement를 닫고 다시 준비하는 LRU는 mysql2 같은 드라이버 쪽 캐시 동작이다.
- 메모리: 많은 connection과 shape의 준비 구조는 서버 메모리를 쓴다. 사양이 낮은 서버라면 그 메모리를 InnoDB buffer pool에 주는 편이 나을 수 있다.

MySQL Connector/J는 `useServerPrepStmts` 기본값이 `false`라 켜지 않으면 드라이버가 값을 이스케이프해 문장을 완성하는 클라이언트 사이드 prepared statement를 쓴다. 문자열 연결과 달리 값의 이스케이프를 드라이버가 맡고, 서버 쪽 캐시 비용은 없다. 쿼리 복잡도, connection 수와 수명, 메모리 여유를 보고 프로젝트마다 고른다.

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

## PostgreSQL: parse, plan 재사용과 드라이버 경계

PostgreSQL의 prepared statement도 session 로컬이다. 쿼리는 parse, plan, execute를 거치는데, MySQL과 달리 plan 재사용이 문서화되어 있어 파싱뿐 아니라 planning 비용까지 아낄 수 있다. 다만 조건부다.

- `plan_cache_mode = auto`(기본)에서는 파라미터가 있는 문장의 처음 다섯 번을 값마다 만든 custom plan으로 실행해 평균 비용을 잰다. 그 뒤 값과 무관한 generic plan의 추정 비용이 평균보다 크게 높지 않으면 generic plan으로 바꾼다. `force_generic_plan`, `force_custom_plan`으로 강제할 수 있다.
- 값에 따라 분포가 크게 다른 컬럼은 generic plan이 특정 값에서 느릴 수 있다. `EXPLAIN EXECUTE`에 `$1` 같은 파라미터 기호가 보이면 generic plan이다.
- 참조 객체의 DDL이나 planner 통계 갱신이 있으면 다음 사용 전에 다시 분석하고 계획한다.
- 이득은 한 session이 비슷한 문장을 많이 실행하고 planning이 복잡할 때 크고, planning이 단순하고 실행이 비싸면 작다.

| 경계 | 서버 prepare 재사용 조건 |
|---|---|
| node-postgres | query config에 `name`을 준 쿼리만 connection별로 한 번 parse한 뒤 재사용한다. 이름 없는 파라미터 쿼리에 재사용을 기대하지 않는다 |
| pgjdbc | 같은 `PreparedStatement`를 `prepareThreshold`(기본 5)번 실행한 뒤부터 server-side prepare를 쓴다. connection별 캐시는 기본 256개 |
| PgBouncer transaction pooling | 1.21부터 protocol 수준 named prepared statement를 추적하고, 1.24부터 `max_prepared_statements` 기본값이 200이다. SQL `PREPARE`/`EXECUTE`는 추적하지 않는다 |

injection 방어와 성능 이득은 별개다. 파라미터 바인딩은 드라이버가 prepare를 재사용하지 않아도 값과 SQL 구조를 분리한다. 드라이버가 내부적으로 재사용한다는 말은 드라이버와 설정별로 확인하고, pooler 호환은 [[PostgreSQL-Production-Operations|PostgreSQL 운영]]과 함께 본다.

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
| 단순 OLTP 쿼리와 짧은 수명의 connection 다수 | 클라이언트 사이드 바인딩 검토, 서버 상한과 메모리 확인 |
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
- [MySQL 8.4 Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [MySQL Connector/J Developer Guide, Configuration Properties - Prepared Statements](https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-prepared-statements.html)
- [mysql2, Prepared Statements](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements)
- [PostgreSQL 18 Documentation, PREPARE](https://www.postgresql.org/docs/18/sql-prepare.html)
- [node-postgres, Queries](https://node-postgres.com/features/queries)
- [pgJDBC, Initializing the Driver](https://jdbc.postgresql.org/documentation/use/)
- [PgBouncer, Configuration](https://www.pgbouncer.org/config.html)
- [PgBouncer, Changelog](https://www.pgbouncer.org/changelog.html)
- [인프런, Real MySQL 시즌 1 - Part 1, Prepared Statement](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226571)
- [인프런, Hong, Database Performance를 위한 최적화 패턴 및 전략 - 2](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439103)

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[Execution-Plan|실행 계획]]
- [[Connection-Pool|Connection Pool]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[OOM-Troubleshooting-Cases|Node.js OOM 사례]]
