---
tags: [database, rdbms, postgresql, operations, performance, reliability]
status: done
verified_at: 2026-07-24
category: "Data & Storage - RDB"
aliases: ["PostgreSQL Operations", "PostgreSQL 운영", "PostgreSQL Production Operations"]
---

# PostgreSQL 운영: 쿼리, 변경, 유지보수

PostgreSQL 운영의 핵심은 빠른 쿼리 하나를 찾는 데 있지 않다. 쿼리 계획, 트랜잭션 수명, 연결 예산, MVCC 유지보수와 스키마 변경이 서로 영향을 주므로, 변경 전에는 잠금과 자원 사용을 확인하고 변경 후에는 실제 관측값으로 결과를 검증한다.

이 문서는 PostgreSQL 18을 기준으로 한다. 관리형 서비스의 권한, 파라미터와 관측 화면은 제공자별로 다를 수 있다.

## 운영 mental model

- planner는 쿼리 구조와 통계로 실행 계획을 고른다. 인덱스가 존재해도 반환 행 비율, heap 접근 비용, 캐시와 통계에 따라 순차 스캔이 더 싼 계획일 수 있다.
- `UPDATE`와 `DELETE`는 이전 행 버전을 즉시 지우지 않는다. 아직 보일 수 있는 버전은 유지되고, 이후 `VACUUM`이 재사용 가능한 공간으로 회수한다.
- 잠금, 장기 트랜잭션과 연결 포화는 서로 증폭될 수 있다. 느린 요청을 풀 크기 증가로 숨기기보다 대기 원인과 점유 시간을 먼저 확인한다.
- 운영 변경은 기능 지원 여부, lock mode, 트랜잭션 블록 실행 가능 여부, rollback 가능성을 함께 검토한다.

## 실행 계획, 통계와 인덱스

### 측정 순서

1. 정상 구간과 문제 구간의 호출량, 지연, 오류와 wait event를 비교한다.
2. 먼저 `EXPLAIN`으로 예상 계획을 확인한다. 이는 쿼리를 실행하지 않는다.
3. 실제 실행이 안전한 읽기 쿼리와 환경에서만 `EXPLAIN (ANALYZE, BUFFERS)`를 사용해 예상 행 수와 실제 행 수, 버퍼 접근을 비교한다. `ANALYZE` 옵션은 실제 쿼리를 실행하며 DML의 trigger도 실행될 수 있다.
4. 추정과 실측이 크게 다르면 데이터 분포, `ANALYZE` 시점, predicate와 조인 조건을 함께 점검한다.

`ANALYZE` 통계는 표본 기반이라 추정값은 정확한 행 수가 아니다. autovacuum은 변경량 조건에 따라 `ANALYZE`를 실행하지만, 특정 컬럼 분포가 바뀐 시점을 의미적으로 알지는 못한다. 대량 적재나 분포 변화 뒤에는 필요한 범위에서 명시적 `ANALYZE`를 검토한다.

### 인덱스 설계

- PK와 `UNIQUE` 제약은 B-tree 인덱스를 만든다. 반면 FK의 참조하는 쪽 컬럼은 자동 인덱스 대상이 아니므로, 부모 행 삭제나 갱신과 해당 조인 경로를 보고 별도로 판단한다.
- 다중 컬럼 B-tree는 선행 컬럼의 equality 조건과 그 다음 첫 non-equality 조건이 있을 때 스캔 범위를 가장 잘 줄인다. 컬럼 순서는 카디널리티 하나가 아니라 실제 filter, range, sort와 write 비용으로 정한다.
- 단일 컬럼 B-tree는 정방향과 역방향 scan이 가능하다. 혼합 정렬 방향의 다중 컬럼 `ORDER BY`는 별도 정렬 방향을 가진 인덱스가 필요할 수 있다.
- 인덱스는 read 범위를 줄이는 대신 쓰기 유지 비용과 저장 공간을 추가한다. 새 인덱스의 필요성은 실제 계획과 측정으로 검증한다.

## 트랜잭션과 연결

- 트랜잭션에는 정합성에 필요한 DB 작업만 넣고, 외부 API 호출이나 장시간 계산은 경계 밖으로 이동한다. 외부 API와 DB 커밋은 하나의 원자적 경계를 공유하지 않으므로 [[Transactional-Outbox|Outbox]], 멱등성 키, 보상과 대사로 부분 실패를 설계한다. 동기 호출이 불가피해도 timeout과 재시도만으로 원자성이 생기지 않으며, 잠금 점유 시간과 결과 불명확성을 함께 다룬다.
- 잠글 행과 테이블을 좁히고, 일관된 순서로 여러 자원에 접근한다. 데드락은 완전히 없애기보다 감지 가능한 오류로 취급하고 멱등 재시도를 설계한다.
- 풀 크기는 앱 인스턴스별 최대치가 아니라 모든 앱 풀과 배치 작업의 합으로 계산한다. 요청 대기, DB CPU/I/O, lock wait와 실제 처리량을 함께 보고 조정한다.
- 외부 pooler를 쓸 때는 session state, prepared statement와 transaction pooling의 호환성을 확인한다. 배치와 OLTP가 같은 풀을 공유해 서로의 연결을 점유하지 않도록 워크로드 예산을 분리한다.

## 안전한 스키마 변경과 데이터 이동

### 호환 가능한 변경 순서

새 컬럼, 새 쓰기 경로와 읽기 호환을 먼저 배포하고, 데이터 보정과 검증을 마친 뒤 이전 경로를 제거한다. 제거 단계는 모든 배포 인스턴스가 새 스키마를 사용한다는 확인과 rollback 경계를 전제로 한다.

### Online DDL

- 일반 `CREATE INDEX`는 쓰기를 막을 수 있다. `CREATE INDEX CONCURRENTLY`는 `INSERT`, `UPDATE`, `DELETE`를 막지 않지만 두 번의 table scan과 기존 트랜잭션 대기를 수반하므로 더 오래 걸리고 추가 I/O를 사용한다.
- 동시 인덱스 생성은 트랜잭션 블록 안에서 실행할 수 없고, 같은 테이블에는 한 번에 하나만 실행할 수 있다. 실패하면 invalid index가 남을 수 있으므로 progress, 실패 처리와 재실행 절차를 준비한다.
- PostgreSQL 18에서는 partitioned table의 partitioned index를 `CONCURRENTLY`로 직접 생성할 수 없다. 각 partition에 동시 생성 후 parent index에 연결하는 절차를 검토한다.
- 큰 테이블의 FK, `CHECK`, not-null 제약은 `NOT VALID`로 먼저 추가하고 `VALIDATE CONSTRAINT`로 기존 행을 나중에 검증할 수 있다. 새 쓰기에는 즉시 제약이 적용되며, validation의 lock과 참조 테이블 영향도 사전에 확인한다.

### 대용량 데이터 이동

대량 복사를 단일 장기 트랜잭션으로 끝낼 때는 lock, MVCC horizon과 실패 복구 비용을 먼저 평가한다. 서비스 쓰기가 계속되거나 재시도 비용이 큰 경우에는 범위를 정한 작은 batch를 반복하고, 각 batch의 재시도와 중복 실행이 안전하도록 stable key와 멱등 쓰기를 사용한다.

이전 중에도 원본에 쓰기가 계속되면 write capture 방식, backfill 경계, 검증 쿼리, cutover 순서와 rollback을 하나의 절차로 설계한다. trigger와 `UNIQUE` 제약은 일부 중복 방어에 쓸 수 있지만, 누락 방지와 최종 정합성을 자동으로 보장하지는 않는다.

## Vacuum, bloat와 wraparound

- standard `VACUUM`은 dead row version과 index의 공간을 이후 재사용할 수 있게 하지만, 보통 운영체제에 디스크 공간을 반환하지는 않는다.
- `VACUUM FULL`은 table을 다시 작성해 공간을 반환할 수 있지만 `ACCESS EXCLUSIVE` lock과 추가 디스크 공간을 요구한다. bloat를 발견한 뒤의 기본 대응이 아니라, 원인과 허용 가능한 중단 시간을 확인한 뒤 선택한다.
- autovacuum은 table별 변경량과 XID age를 기준으로 `VACUUM`과 `ANALYZE`를 실행한다. write가 집중된 relation은 전역 기본값만 보지 말고 dead tuple, worker 포화, I/O, `relfrozenxid`, `relminmxid`와 장기 transaction을 함께 관측한다.
- XID와 MultiXact wraparound 방지는 가용성 문제다. anti-wraparound vacuum, 오래 열린 transaction, 오래된 prepared transaction과 replication slot을 정기적으로 점검한다.
- index bloat의 재구성은 `REINDEX INDEX CONCURRENTLY` 같은 선택지가 있지만, 지원 버전, 디스크 여유, 작업 시간과 실패 복구를 확인한다.

## `FOR UPDATE SKIP LOCKED`

`SKIP LOCKED`는 즉시 잠글 수 없는 행을 건너뛰므로 여러 worker가 queue-like table에서 서로 기다리지 않고 일을 가져갈 때 유용하다. 잠긴 행을 건너뛴 결과는 일관된 전체 조회 결과가 아니므로 일반 조회에는 적합하지 않다.

큐 설계에는 결정적인 정렬 기준, 상태 전이, lease 또는 timeout, retry, 독립적인 멱등 처리와 관측 지표가 함께 필요하다. row lock을 피하더라도 필요한 table-level lock은 별도로 획득될 수 있다.

## 파티셔닝

- partition key는 주된 `WHERE` 조건과 retention 정책을 기준으로 고른다. partition pruning은 인덱스 유무가 아니라 partition bound로 불필요한 partition을 제외한다.
- 오래된 데이터는 partition을 `DROP`하거나 detach해 행별 `DELETE`와 뒤이은 vacuum 부담을 줄일 수 있다. `DROP`은 parent table lock을 요구할 수 있고, concurrent detach에도 별도 제약이 있다.
- pruning 뒤에도 많은 partition이 남으면 planning time과 메모리 사용이 증가할 수 있다. partition 수, 실제 query predicate와 `EXPLAIN` 결과를 함께 확인한다.
- autovacuum은 실제 row를 가진 각 partition을 처리하지만 partitioned parent에는 자동 `ANALYZE`를 수행하지 않는다. partition 분포가 크게 바뀌면 parent 통계도 갱신한다.

## 운영 체크리스트

### 느린 쿼리 또는 DB 부하

1. 정상 대비 호출량, 지연, 오류, wait event의 차이를 확인한다.
2. 문제 SQL의 parameter shape와 실행 계획을 확보한다.
3. 예상 행 수와 실제 행 수, 통계 freshness, scan 범위와 lock wait를 비교한다.
4. 인덱스 추가, 쿼리 변경, 트래픽 제어 중 원인을 직접 줄이는 조치를 선택한다.
5. 변경 뒤 같은 조건에서 지연, 처리량, write 비용과 부작용을 다시 측정한다.

### 대형 변경 전

1. 대상 PostgreSQL 버전과 관리형 서비스의 기능, 권한, lock 동작을 확인한다.
2. 배포 순서가 이전 앱 버전과 호환되는지, transaction block에서 실행할 수 없는 명령이 있는지 확인한다.
3. 예상 I/O, WAL, replica lag, 연결 사용량과 autovacuum 영향을 관측할 수 있게 한다.
4. 중단 기준, rollback 또는 재실행 절차, 데이터 검증과 cutover 완료 기준을 문서화한다.

## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[Index|인덱스]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Connection-Pool|DB 커넥션 풀, 사이징]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경, MySQL 중심]]
- [[Backfill-Resource-Isolation|데이터 백필과 자원 격리 전략]]
- [[DB-Incident-Triage|DB 장애 분석 방법론]]

## 출처

- [PostgreSQL 18 Documentation, Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [PostgreSQL 18 Documentation, Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 Documentation, CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html)
- [PostgreSQL 18 Documentation, ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html)
- [PostgreSQL 18 Documentation, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18 Documentation, Multicolumn Indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html)
- [PostgreSQL 18 Documentation, Indexes and ORDER BY](https://www.postgresql.org/docs/18/indexes-ordering.html)
- [PostgreSQL 18 Documentation, SELECT locking clauses](https://www.postgresql.org/docs/18/sql-select.html)
- [PostgreSQL 18 Documentation, Table Partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)
- [The startup's Postgres survival guide, Hatchet](https://hatchet.run/blog/postgres-survival-guide)
