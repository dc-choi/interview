---
tags: [database, rdbms, index, mysql, postgresql, performance, operations]
status: done
verified_at: 2026-09-29
category: "Data & Storage - RDB"
aliases: ["Index Write Cost and Cleanup", "인덱스의 쓰기 비용과 정리", "미사용 인덱스 정리", "Unused Index Cleanup"]
---

# 인덱스의 쓰기 비용과 정리

인덱스는 읽기 범위를 줄이는 대신 모든 쓰기에 유지 비용을 붙인다. 느린 쿼리에 인덱스를 추가하는 판단과 쓰이지 않는 인덱스를 걷어 내는 판단은 같은 비용 계산의 양면이다. 이 문서는 인덱스가 쓰기, 저장 공간과 옵티마이저에 주는 부담, 그리고 불필요한 인덱스를 안전하게 제거하는 절차를 다룬다.

B-tree 구조, 복합 인덱스의 최좌측 접두사 규칙, 카디널리티는 [[Index|Index]]에, 트리 깊이 계산은 [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]에, 테이블 룩업을 생략하는 원리는 [[Covering-Index|커버링 인덱스]]에 있다.

## Mental model: 쓰기 한 건은 여러 트리를 고친다

- 행 하나를 `INSERT`하거나 `DELETE`하면 테이블 저장 구조와 그 테이블의 모든 인덱스를 함께 고친다. 보조 인덱스가 다섯 개면 쓰기 한 건이 테이블 저장 구조 하나와 인덱스 다섯 개, 모두 여섯 곳을 고친다.
- `UPDATE`는 바뀐 컬럼을 포함한 인덱스만 고치는 것이 원칙이지만, 엔진의 MVCC 구현에 따라 달라진다. PostgreSQL은 HOT 조건을 벗어나면 새 행 버전을 가리키는 항목을 인덱스마다 추가한다.
- `UNIQUE` 인덱스는 쓰기 전에 중복을 확인하는 읽기가 따라온다.
- 인덱스 페이지도 버퍼 풀과 shared buffers를 차지한다. 자주 쓰이지 않는 인덱스가 캐시를 밀어내면 정작 필요한 페이지의 적중률이 떨어진다.
- 후보 인덱스가 많을수록 옵티마이저가 고를 경로가 늘고, 통계 오차가 있으면 덜 적합한 인덱스를 고를 여지도 커진다.

결국 인덱스 하나의 가치는 그 인덱스가 줄이는 읽기 비용에서 모든 쓰기와 저장, 캐시 비용을 뺀 값이다. 읽기가 거의 없고 쓰기가 많은 테이블에서는 인덱스가 순손실이 되기 쉽다.

## InnoDB 보조 인덱스와 PK 크기

InnoDB는 행을 PK 순서의 clustered index에 저장하고, 보조 인덱스의 각 레코드에 PK 컬럼을 함께 담아 그 값으로 행을 다시 찾는다. 그래서 PK가 길면 모든 보조 인덱스가 함께 커진다.

- 36자 문자열 UUID 같은 긴 PK는 보조 인덱스 개수만큼 저장 공간과 캐시 부담을 곱한다.
- 무작위 순서로 생성되는 PK는 clustered index의 임의 위치에 삽입되어 페이지 분할과 버퍼 풀 miss가 늘기 쉽다. 시간 순서가 있는 키나 내부 정수 PK와 공개 ID 분리 같은 선택지는 [[Primary-Key-Strategy|Primary Key 전략]]에서 비교한다.

## PostgreSQL의 HOT와 Partial Index

PostgreSQL은 `UPDATE`마다 새 행 버전을 만들지만, 다음 두 조건을 만족하면 HOT(heap-only tuple) update로 인덱스 항목 추가를 피한다.

- 갱신이 테이블 인덱스가 참조하는 컬럼을 바꾸지 않는다. BRIN 같은 요약 인덱스는 예외다.
- 기존 행이 있는 페이지에 새 버전을 넣을 여유 공간이 있다.

운영에서 이 조건은 두 가지 판단으로 이어진다.

- 자주 갱신되는 컬럼에 인덱스를 추가하면 그 컬럼의 갱신이 HOT 대상에서 빠진다. 인덱스 추가의 비용에 쓰기 증폭 증가가 숨어 있다.
- 갱신이 많은 테이블은 `fillfactor`를 100보다 낮춰 페이지에 여유 공간을 남기면 HOT 가능성이 높아진다. 대신 테이블이 커진다. `pg_stat_user_tables`의 `n_tup_hot_upd`와 `n_tup_upd` 비율로 효과를 관찰한다.

Partial Index는 `WHERE status = 'active'`처럼 조건을 만족하는 행만 인덱싱한다. 인덱스 크기와 조건 밖 행의 유지 비용이 줄지만, 쿼리의 조건이 인덱스 조건을 함의해야 planner가 사용한다. MySQL에는 같은 기능이 없다([[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]).

## 쓰이지 않는 인덱스 찾기

| 엔진 | 관찰 지점 | 주의점 |
|---|---|---|
| MySQL 8.4 | `sys.schema_unused_indexes`(이벤트가 없는 인덱스), `sys.schema_redundant_indexes`(다른 인덱스에 포함되는 인덱스) | Performance Schema는 메모리 테이블이라 서버 재시작 뒤 다시 쌓인다. 워크로드가 대표성을 가질 만큼 운영된 뒤에 본다 |
| PostgreSQL | `pg_stat_user_indexes`의 `idx_scan = 0`, 16부터 `last_idx_scan` | 비정상 종료, PITR, 베이스 백업에서 시작하면 통계가 초기화되고 `pg_stat_reset()`도 누적값을 지운다. 리셋 시점 이후만 보고 있다는 점을 확인한다 |

두 엔진 공통으로 다음을 확인한 뒤에야 제거 후보로 올린다.

- 통계는 서버별로 쌓인다. primary에서 0이어도 읽기 복제본의 조회가 그 인덱스를 쓸 수 있으므로 복제본의 통계도 본다.
- 월말 정산, 분기 리포트처럼 드물게 도는 작업은 관찰 기간이 짧으면 드러나지 않는다.
- PK, `UNIQUE`, FK를 받치는 인덱스는 조회에 쓰이지 않아도 제약을 위해 필요하다.

## 안전하게 제거하는 절차

MySQL 8.4는 Invisible Index로 되돌릴 수 있는 시험 단계를 둔다.

```sql
ALTER TABLE orders ALTER INDEX idx_orders_status INVISIBLE;
-- 관찰 기간 동안 slow query log, Performance Schema, 주요 쿼리 EXPLAIN 변화를 본다
ALTER TABLE orders ALTER INDEX idx_orders_status VISIBLE;  -- 문제가 생기면 즉시 복구
ALTER TABLE orders DROP INDEX idx_orders_status;            -- 문제가 없으면 제거
```

- 보이기 전환은 인덱스를 다시 만드는 것보다 훨씬 싼 in-place 작업이다.
- invisible 상태에서도 인덱스 유지와 uniqueness 검사는 계속된다. 쓰기 비용은 실제 `DROP` 뒤에야 줄어든다.
- PK와 암묵적 PK 역할을 하는 인덱스는 invisible로 만들 수 없다.
- invisible 인덱스를 지정한 인덱스 힌트가 있는 쿼리는 오류를 내므로, 전환 전에 코드와 ORM 설정의 인덱스 힌트를 검색한다.

PostgreSQL에는 같은 기능이 없다. `pg_get_indexdef()`로 재생성 DDL을 보관하고, `DROP INDEX CONCURRENTLY`로 테이블 쓰기를 막지 않고 제거한다. 이 명령은 트랜잭션 블록 안에서 실행할 수 없고 PK나 `UNIQUE` 제약을 받치는 인덱스에는 쓸 수 없다. 되돌릴 때는 `CREATE INDEX CONCURRENTLY`로 다시 만드는 시간이 걸린다는 점을 롤백 계획에 넣는다.

## 변경 기록: EXPLAIN 전후 비교

인덱스를 추가하든 제거하든 효과를 말하려면 같은 조건의 전후 비교가 필요하다.

- 대상 쿼리의 실행 계획, 읽은 행 수, 지연 분포를 변경 전후로 남긴다. 계획만 비교하지 말고 실제 실행 통계(`EXPLAIN ANALYZE`)를 안전한 환경에서 함께 본다([[Execution-Plan|실행 계획]]).
- 쓰기 쪽 지표도 같이 기록한다. 테이블의 쓰기 지연, 인덱스 크기, 버퍼 적중률이 바뀌었는지 본다.
- 기록은 변경 PR이나 운영 변경 기록에 붙여 다음 판단의 근거로 쓴다. 전후 기록이 없으면 인덱스가 늘기만 하고 줄일 근거가 사라진다.

## 트레이드오프와 한계

- 미사용 통계는 관찰 기간의 증거일 뿐이다. 0이라는 숫자가 앞으로도 쓰이지 않는다는 보장은 아니다.
- 인덱스 제거로 줄어드는 쓰기 비용은 테이블의 쓰기 비중이 클 때 체감된다. 읽기 위주 테이블에서는 제거의 이득이 작고 위험만 남을 수 있다.
- 복합 인덱스 하나로 여러 단일 인덱스를 대체하면 개수는 줄지만 인덱스가 커지고 컬럼 순서가 맞지 않는 쿼리는 이득을 잃는다.

## 면접 체크포인트

- 인덱스를 추가했더니 쓰기가 느려진 이유를 테이블과 인덱스 트리 수로 설명할 수 있는가
- InnoDB에서 PK 크기가 보조 인덱스 크기에 영향을 주는 이유와 무작위 UUID PK의 삽입 비용
- PostgreSQL HOT update의 두 조건과, 인덱스 추가가 HOT를 깨뜨리는 경우
- 미사용 인덱스를 찾는 뷰와 그 통계가 틀릴 수 있는 상황(재시작, 리셋, 복제본, 드문 배치)
- Invisible Index로 제거를 시험하는 절차와 invisible 상태에서도 남는 비용

## 출처

- [MySQL 8.4 Reference Manual, Invisible Indexes](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html)
- [MySQL 8.4 Reference Manual, The schema_unused_indexes View](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-unused-indexes.html)
- [MySQL 8.4 Reference Manual, The schema_redundant_indexes and x$schema_flattened_keys Views](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-redundant-indexes.html)
- [MySQL 8.4 Reference Manual, MySQL Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html)
- [MySQL 8.4 Reference Manual, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [PostgreSQL 18 Documentation, Heap-Only Tuples (HOT)](https://www.postgresql.org/docs/18/storage-hot.html)
- [PostgreSQL 18 Documentation, The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 Documentation, DROP INDEX](https://www.postgresql.org/docs/18/sql-dropindex.html)
- [PostgreSQL 18 Documentation, CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/release/16.0/)
- [DB 인덱스 원리 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/Dbohewzk3lI)

## 관련 문서

- [[Index|Index]]
- [[Covering-Index|커버링 인덱스]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Execution-Plan|실행 계획]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
