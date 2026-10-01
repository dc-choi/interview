---
tags: [database, rdbms, index, mysql, postgresql, performance, operations]
status: done
verified_at: 2026-09-30
category: "Data & Storage - RDB"
aliases: ["Index Write Cost and Cleanup", "인덱스의 쓰기 비용과 정리", "미사용 인덱스 정리", "Unused Index Cleanup"]
---

# 인덱스의 쓰기 비용과 정리

인덱스는 읽기 범위를 줄이는 대신 모든 쓰기에 유지 비용을 붙인다. 느린 쿼리에 인덱스를 추가하는 판단과 쓰이지 않는 인덱스를 걷어 내는 판단은 같은 비용 계산의 양면이다. 이 문서는 인덱스가 쓰기, 저장 공간과 옵티마이저에 주는 부담, 인덱스를 만드는 비용, 불필요한 인덱스를 안전하게 제거하는 절차를 다룬다. 추가 전에 제약이 만든 인덱스와 과잉 최적화를 따지는 기준은 [[Index-Composite-Design#추가 전 판단|추가 전 판단]]에 있다.

B-tree 구조와 카디널리티는 [[Index|Index]]에, 컬럼 순서 설계는 [[Index-Composite-Design|복합 인덱스 설계]]에, 트리 깊이 계산은 [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]에, 테이블 룩업을 생략하는 원리는 [[Covering-Index|커버링 인덱스]]에 있다.

## Mental model: 쓰기 한 건은 여러 트리를 고친다

- 행 하나를 `INSERT`하거나 `DELETE`하면 테이블 저장 구조와 그 테이블의 모든 인덱스를 함께 고친다. 보조 인덱스가 다섯 개면 쓰기 한 건이 테이블 저장 구조 하나와 인덱스 다섯 개, 모두 여섯 곳을 고친다.
- `UPDATE`는 바뀐 컬럼을 포함한 인덱스만 고치는 것이 원칙이지만, 엔진의 MVCC 구현에 따라 달라진다. PostgreSQL은 HOT 조건을 벗어나면 새 행 버전을 가리키는 항목을 인덱스마다 추가한다.
- `UNIQUE` 인덱스는 쓰기 전에 중복을 확인하는 읽기가 따라온다.
- 인덱스 페이지도 버퍼 풀과 shared buffers를 차지한다. 자주 쓰이지 않는 인덱스가 캐시를 밀어내면 정작 필요한 페이지의 적중률이 떨어진다.
- 후보 인덱스가 많을수록 옵티마이저가 고를 경로가 늘고, 통계 오차가 있으면 덜 적합한 인덱스를 고를 여지도 커진다.

결국 인덱스 하나의 가치는 그 인덱스가 줄이는 읽기 비용에서 모든 쓰기와 저장, 캐시 비용을 뺀 값이다. 읽기가 거의 없고 쓰기가 많은 테이블에서는 인덱스가 순손실이 되기 쉽다.

### 인덱스 수와 쓰기 부하

- 강의 실측에서 인덱스 2개인 테이블의 1만 건 `INSERT`는 약 160ms였고, 보조 인덱스 5개를 더해 7개가 되자 인덱스 크기가 원본 데이터보다 큰 약 600MB가 되며 같은 `INSERT`가 약 1.3초로 늘었다. 특정 실습 환경의 값이므로 배수보다 방향으로 읽는다.
- 이메일, 회원 ID처럼 삽입 위치가 무작위인 보조 인덱스는 순차 PK와 달리 페이지 분할이 잦아 I/O를 계속 쓴다([[B-Tree-Index-Depth#페이지 분할과 병합|페이지 분할과 병합]]).
- 쇼핑몰, 게시판처럼 읽기가 쓰기보다 훨씬 많은 테이블은 인덱스의 읽기 이득이 쓰기 지연을 압도하기 쉽다. 로그 수집, 센서 데이터처럼 쓰기 위주인 테이블은 자주 쓰는 쿼리 패턴에만 인덱스를 두고, 원본은 인덱스 없이 빠르게 적재한 뒤 조회용 테이블이나 통계를 배치로 따로 만든다.

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

## 인덱스를 만드는 비용

InnoDB는 인덱스를 만들거나 재구성할 때 행을 한 건씩 넣지 않고 sorted index build로 bulk load한다. clustered index를 스캔해 index entry를 sort buffer에 모으고, 가득 찰 때마다 정렬해 임시 파일에 쓴 뒤 merge sort하고, 정렬된 entry를 가장 오른쪽 leaf에 이어 붙이며 트리를 아래에서 위로 채운다. 건마다 삽입 위치를 찾고 페이지를 분할, 병합하던 방식의 비용을 피한다. 공간 인덱스는 이 방식을 지원하지 않는다.

- 초기 대량 적재와 마이그레이션은 데이터를 먼저 넣고 보조 인덱스를 나중에 만든다. MySQL 8.4 문서도 보조 인덱스 없이 테이블을 만들어 적재한 뒤 인덱스를 추가하면 전체 과정이 빨라질 수 있다고 안내한다. 강의 측정에서는 적재 구간이 약 3.4배 빨랐고, 데이터가 커질수록 랜덤 I/O 차이로 격차가 벌어진다.
- 트래픽이 흐르는 테이블의 보조 인덱스 추가와 삭제는 in-place online DDL이라 동시 DML을 허용하지만 무영향은 아니다. clustered index 스캔과 정렬 파일 I/O, 작업 중 들어온 DML 변경을 기록했다가 반영하는 처리가 서비스와 자원을 나누고, `CREATE INDEX`는 테이블에 접근 중인 트랜잭션이 끝나야 완료된다. 주문, 결제 같은 핵심 테이블은 요청이 적은 시간대에 하고 작은 테이블도 지연을 보며 진행한다([[Index#운영 중 추가의 함정|운영 중 추가의 함정]]).

## 쓰이지 않는 인덱스 찾기

| 엔진 | 관찰 지점 | 주의점 |
|---|---|---|
| MySQL 8.4 | `sys.schema_unused_indexes`(이벤트가 없는 인덱스), `sys.schema_redundant_indexes`(다른 인덱스에 포함되는 인덱스) | Performance Schema는 메모리 테이블이라 서버 재시작 뒤 다시 쌓인다. 워크로드가 대표성을 가질 만큼 운영된 뒤에 본다 |
| PostgreSQL | `pg_stat_user_indexes`의 `idx_scan = 0`, 16부터 `last_idx_scan` | 비정상 종료, PITR, 베이스 백업에서 시작하면 통계가 초기화되고 `pg_stat_reset()`도 누적값을 지운다. 리셋 시점 이후만 보고 있다는 점을 확인한다 |

두 엔진 공통으로 다음을 확인한 뒤에야 제거 후보로 올린다.

- 통계는 서버별로 쌓인다. primary에서 0이어도 읽기 복제본의 조회가 그 인덱스를 쓸 수 있으므로 복제본의 통계도 본다.
- 월말 정산, 분기 리포트처럼 드물게 도는 작업은 관찰 기간이 짧으면 드러나지 않는다.
- PK, `UNIQUE`, FK를 받치는 인덱스는 조회에 쓰이지 않아도 제약을 위해 필요하다.

### 접두사 중복이어도 남길 인덱스

`(A, B, C)`가 있으면 `(A)`는 좌측 접두사라 보통 제거 후보다. VIP 조회용 `(grade)`를 `(grade, member_name)` 커버링으로 대체했다면 같은 목적이므로 `(grade)`를 지운다. 하지만 `sys.schema_redundant_indexes`가 중복으로 표시해도 바로 지우지 않는 경우가 있다.

- 통계 리포트용 `(member_id, total_price)` 커버링을 추가해도 `(member_id)`는 남긴다. member_id 경로는 주문 목록, 주문 상세 연결, 회원별 집계를 받치는 기반 인덱스이고, 커버링 인덱스는 특정 리포트를 위해 얹었다가 필요 없어지면 걷어 내는 특화 인덱스다. 기반 인덱스를 먼저 지우면 특화 인덱스를 걷어 낼 때 조인이 갑자기 풀 스캔으로 떨어질 수 있다.
- 좁은 기반 인덱스는 페이지가 적어 버퍼 풀에 오래 머물고 탐색과 갱신 부담이 작다. 넓은 커버링 인덱스는 크기와 쓰기 비용이 커서 빈도 높은 읽기 쿼리에 한정한다.
- FK 제약이 자동으로 만든 인덱스는 FK를 받칠 수 있는 다른 인덱스가 생기면 조용히 제거될 수 있다. MySQL 8.4.6 재현에서 FK가 만든 `(member_id)`는 `(member_id, total_price)`를 추가하자 사라졌고, 직접 만든 `(member_id)`는 남았다. 기반 인덱스로 둘 것은 이름을 붙여 명시적으로 만든다. FK를 받치는 유일한 인덱스는 `DROP`이 오류 1553으로 막힌다.
- 조인 경로와 FK 요구, 충분히 긴 기간의 사용 통계, 특화 인덱스의 예상 수명을 보고 판단한다.

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
- 관찰 기간은 강의 기준으로 최소 하루에서 일주일, 월 단위 배치가 있으면 한 달까지 두고 피크 시간대의 계획과 응답 시간도 본다.
- 숨긴 인덱스를 쓰는 계획과 비교하려면 세션의 `optimizer_switch`에서 `use_invisible_indexes=on`(기본 off)을 켜거나 `SET_VAR` 힌트로 한 쿼리에만 켠다. 인덱스는 invisible 상태로 남는다.

PostgreSQL에는 같은 기능이 없다. `pg_get_indexdef()`로 재생성 DDL을 보관하고, `DROP INDEX CONCURRENTLY`로 테이블 쓰기를 막지 않고 제거한다. 이 명령은 트랜잭션 블록 안에서 실행할 수 없고 PK나 `UNIQUE` 제약을 받치는 인덱스에는 쓸 수 없다. 되돌릴 때는 `CREATE INDEX CONCURRENTLY`로 다시 만드는 시간이 걸린다는 점을 롤백 계획에 넣는다.

## 변경 기록: EXPLAIN 전후 비교

인덱스를 추가하든 제거하든 효과를 말하려면 같은 조건의 전후 비교가 필요하다.

- 대상 쿼리의 실행 계획, 읽은 행 수, 지연 분포를 변경 전후로 남긴다. 계획만 비교하지 말고 실제 실행 통계(`EXPLAIN ANALYZE`)를 안전한 환경에서 함께 본다([[Execution-Plan|실행 계획]]).
- 쓰기 쪽 지표도 같이 기록한다. 테이블의 쓰기 지연, 인덱스 크기, 버퍼 적중률이 바뀌었는지 본다.
- 기록은 변경 PR이나 운영 변경 기록에 붙여 다음 판단의 근거로 쓴다. 전후 기록이 없으면 인덱스가 늘기만 하고 줄일 근거가 사라진다.

### MySQL에서 크기 재기

```sql
ANALYZE TABLE products;  -- 캐시된 통계를 갱신한다

SELECT data_length, index_length, table_rows
FROM information_schema.TABLES
WHERE table_schema = 'shop' AND table_name = 'products';

SELECT index_name, SUM(stat_value) * @@innodb_page_size AS size_bytes
FROM mysql.innodb_index_stats
WHERE database_name = 'shop' AND table_name = 'products' AND stat_name = 'size'
GROUP BY index_name;
```

- InnoDB의 `DATA_LENGTH`는 clustered index, `INDEX_LENGTH`는 보조 인덱스 전체의 페이지 수에 페이지 크기를 곱한 근삿값이다. 둘을 더해 총 용량을 보고 인덱스별 크기는 `innodb_index_stats`의 `size`로 본다.
- `TABLE_ROWS`는 InnoDB에서 최적화용 대략치라 실제와 40~50%까지 다를 수 있다. 정확한 건수는 `COUNT(*)`로 센다.
- 이 통계 컬럼은 `information_schema_stats_expiry`(기본 86,400초) 동안 캐시된다. 인덱스를 막 추가하거나 지웠다면 `ANALYZE TABLE`로 갱신하거나 세션에서 이 변수를 0으로 두고 읽는다. 갱신 전 값으로는 효과를 오판한다.
- 느린 가격 검색에 `price` 단일 인덱스를 급히 추가했지만 `possible_keys`에만 오르고 `key`는 FK가 만든 `category_id` 인덱스여서 실행 시간은 그대로인데 용량만 약 120MB에서 216MB로 늘었던 강의 사례가 있다([[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]). 효과 없는 인덱스를 반복해 더하면 관리조차 어려운 악순환이 되고, 행이 작고 인덱스가 많으면 인덱스 총량이 원본 데이터보다 커지기도 한다.
- 추가와 제거 전후로 `DATA_LENGTH`, `INDEX_LENGTH`, 인덱스별 `size`와 대상 쿼리에서 실제 선택된 `key`를 함께 남긴다.

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
- 대량 적재에서 보조 인덱스를 나중에 만드는 이유와 FK가 자동으로 만든 인덱스가 사라지는 경우

## 출처

- [MySQL 8.4 Reference Manual, Invisible Indexes](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html)
- [MySQL 8.4 Reference Manual, The schema_unused_indexes View](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-unused-indexes.html)
- [MySQL 8.4 Reference Manual, The schema_redundant_indexes and x$schema_flattened_keys Views](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-redundant-indexes.html)
- [MySQL 8.4 Reference Manual, MySQL Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html)
- [MySQL 8.4 Reference Manual, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [MySQL 8.4 Reference Manual, Sorted Index Builds](https://dev.mysql.com/doc/refman/8.4/en/sorted-index-builds.html)
- [MySQL 8.4 Reference Manual, Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [MySQL 8.4 Reference Manual, Online DDL Performance and Concurrency](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-performance.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA TABLES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html)
- [MySQL 8.4 Reference Manual, Configuring Persistent Optimizer Statistics Parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html)
- [MySQL 8.4 Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [PostgreSQL 18 Documentation, Heap-Only Tuples (HOT)](https://www.postgresql.org/docs/18/storage-hot.html)
- [PostgreSQL 18 Documentation, The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 Documentation, DROP INDEX](https://www.postgresql.org/docs/18/sql-dropindex.html)
- [PostgreSQL 18 Documentation, CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/release/16.0/)
- [DB 인덱스 원리 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/Dbohewzk3lI)
- [인프런, 김영한, 실습 데이터 확인 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471847)
- [인프런, 김영한, 데이터 저장 구조](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471854)
- [인프런, 김영한, 실행 계획 필요성](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471858)
- [인프런, 김영한, 인덱스 신기능 2 - 인덱스 숨기기](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471915)
- [인프런, 김영한, 인덱스 비용 1](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471918)
- [인프런, 김영한, 인덱스 비용 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471919)
- [인프런, 김영한, 정리 (인덱스 비용 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471920)
- [인프런, 김영한, 실전 진단 - 해결 방안 1](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471938)
- [인프런, 김영한, 실전 진단 - 해결 방안 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471939)

## 관련 문서

- [[Index|Index]]
- [[Index-Composite-Design|복합 인덱스 설계]]
- [[Covering-Index|커버링 인덱스]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
