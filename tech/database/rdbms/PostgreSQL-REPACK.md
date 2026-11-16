---
tags: [database, rdbms, postgresql, operations, vacuum, bloat]
status: done
verified_at: 2026-11-17
category: "Data & Storage - RDB"
aliases: ["PostgreSQL REPACK", "REPACK CONCURRENTLY", "테이블 재작성으로 공간 회수"]
---

# PostgreSQL REPACK: 테이블 재작성으로 디스크 공간 회수

`REPACK`은 PostgreSQL 19에 추가된 명령으로, 테이블 전체를 새 파일로 다시 써서 dead tuple이 차지하던 공간을 운영체제에 돌려준다. 이전의 `VACUUM FULL`과 `CLUSTER`가 하던 일을 한 명령으로 합쳤고, `CONCURRENTLY` 옵션을 주면 재작성 대부분의 시간 동안 다른 트랜잭션이 테이블을 계속 읽고 쓸 수 있다.

버전 기준: PostgreSQL 19rc2 문서 기준이다. 2026-11-17 확인 시점에 19는 RC 단계이며 공식 로드맵의 출시 예정일은 2026-11-19다. 정식 출시 뒤 동작과 제한을 다시 확인한다.

## 왜 필요한가

- PostgreSQL은 `UPDATE`와 `DELETE` 때 이전 행 버전을 dead tuple로 남긴다. standard `VACUUM`은 그 공간을 이후 쓰기에 재사용할 수 있게 표시할 뿐, 보통 파일 크기를 줄이지 않는다. 대량 삭제 뒤에도 디스크 사용량이 그대로인 이유다.
- 파일을 실제로 줄이려면 살아 있는 행만 새 파일로 옮겨 쓰는 재작성이 필요하다. 18까지의 내장 수단인 `VACUUM FULL`은 작업 내내 `ACCESS EXCLUSIVE` 잠금을 잡아 그동안 조회도 막는다.
- 18 이하에는 `ACCESS EXCLUSIVE`를 작업 내내 잡지 않는 내장 재작성 수단이 없어 `pg_repack` 같은 외부 확장을 썼다. 19는 `REPACK (CONCURRENTLY)`로 이 잠금 없이 대부분의 재작성을 하는 방법을 본체에 넣었다.

## 명령 형태와 기존 명령의 관계

```sql
REPACK [ ( option [, ...] ) ] [ table_name [ ( column_name [, ...] ) ] [ USING INDEX [ index_name ] ] ]
REPACK [ ( option [, ...] ) ] USING INDEX
-- option: VERBOSE, ANALYZE, CONCURRENTLY
-- 각 옵션 뒤의 boolean 값은 생략하면 true. 옵션을 쓰지 않으면 해당 동작을 하지 않는다(옵션별 설명에서 읽히는 기본 동작)
-- column_name 목록은 ANALYZE를 함께 줄 때만 쓸 수 있다

REPACK (CONCURRENTLY) orders;                 -- 행 순서 유지 없이 공간 회수
REPACK (CONCURRENTLY) employees USING INDEX;  -- 클러스터링 인덱스 순서로 재배치
```

| 기존 명령 | 19의 대응 |
| --- | --- |
| `VACUUM FULL` | `USING INDEX` 없는 `REPACK`. `VACUUM`의 `FULL` 옵션은 deprecated로 표시됐다 |
| `CLUSTER` | `USING INDEX`를 준 `REPACK`. 호환을 위해 남아 있다 |

- 테이블 이름 없이 실행하면 현재 데이터베이스에서 현재 사용자가 `MAINTAIN` 권한을 가진 모든 테이블과 materialized view를 처리한다. 이 형태는 트랜잭션 블록 안에서 실행할 수 없고 `CONCURRENTLY`와 함께 쓸 수 없다. 테이블 이름 없이 `USING INDEX`만 주면 클러스터링 인덱스가 정의되고 권한이 있는 테이블만 처리한다.
- `ANALYZE` 옵션은 재작성 뒤 통계를 갱신한다. 현재는 partitioned table이 아닌 단일 테이블을 지정했을 때만 지원하고, 트랜잭션 블록, 함수, 프로시저와 `DO` 블록 안에서는 쓸 수 없다.
- 진행 상황은 `pg_stat_progress_repack`에서 본다. invalid index가 있는 테이블은 처리하지 않는다.

## CONCURRENTLY의 동작

1. 대부분의 작업은 `SHARE UPDATE EXCLUSIVE` 잠금으로 진행한다. 이 잠금은 일반 `SELECT`, `INSERT`, `UPDATE`, `DELETE`와 충돌하지 않는다.
2. 복사하는 동안 들어온 변경은 logical decoding으로 수집하고 `ACCESS EXCLUSIVE`를 요청하기 전에 적용한다.
3. `ACCESS EXCLUSIVE`를 얻으면 남은 변경을 마지막으로 반영하고 테이블과 인덱스 파일을 교체한다. 잠금 보유 시간은 보통 짧고, 잠금을 기다리는 동안 쌓인 변경량에 따라 달라진다.

`CONCURRENTLY` 없이 실행하면 처음부터 끝까지 `ACCESS EXCLUSIVE`를 잡는다.

## 운영 시 주의

- **마지막 교체 단계의 잠금 대기**: 교체에 필요한 `ACCESS EXCLUSIVE` 요청은 그 테이블을 쓰는 실행 중 트랜잭션이 잠금을 놓을 때까지 기다린다. 대기 중인 이 요청 뒤로 같은 테이블의 새 조회도 줄을 설 수 있다. 오래 걸리는 리포트나 배치가 그 테이블을 읽는 시간대를 피하고, 대기 관계는 [[PostgreSQL-Production-Operations#DDL 대기열과 시간 제한|DDL 대기열과 시간 제한]]과 같은 방식으로 관측한다.
- **`CONCURRENTLY`는 MVCC-safe가 아니다**: 재작성 트랜잭션이 커밋되기 전에 잡은 snapshot을 쓰고 재작성 시작 전에 그 테이블에 접근하지 않은 동시 트랜잭션에는 커밋 뒤 테이블이 비어 보인다(REPACK 페이지는 snapshot 조건을 재작성 시작 전으로, Concurrency Control Caveats는 명령 커밋 전으로 적어 넓은 쪽을 따랐다). 같은 성격의 예외는 `TRUNCATE`와 테이블을 다시 쓰는 `ALTER TABLE`에도 있다. `REPEATABLE READ`나 `SERIALIZABLE`로 오래 도는 작업과 겹치지 않게 한다.
- **디스크 여유**: 테이블과 모든 인덱스의 임시 사본을 만들므로 최소한 테이블과 인덱스 크기의 합만큼 여유가 필요하다. `USING INDEX`에서 seq scan과 정렬 계획이 선택되면 최대 테이블 크기만큼의 정렬 파일이 더 필요하다(`enable_sort`를 세션에서 잠시 끄면 피하지만 보통 더 느린 인덱스 스캔으로 바뀌고, 재배치가 필요 없으면 `USING INDEX`를 뺀다). `CONCURRENTLY`는 동시 변경의 행 데이터를 별도로 디스크에 저장한다.
- **장기 트랜잭션 효과**: 재작성은 하나의 긴 트랜잭션이라 그동안 다른 테이블의 `VACUUM` 정리를 늦춘다. `pg_stat_activity.backend_xid`를 관측한다.
- **wraparound 대책이 아니다**: `relfrozenxid`와 `relminmxid`를 전진시키기는 하지만 XID와 MultiXact wraparound 방지에는 `VACUUM`을 쓴다.
- **실패 조건**: 실행 중 다른 트랜잭션이 그 테이블에 DDL을 하면 끝나지 못할 수 있고, 동시에 약 1억 400만 행 넘게 갱신이나 삭제되면 실패한다.

## CONCURRENTLY를 쓸 수 없는 경우

- 테이블이 아닌 relation(materialized view 등), `UNLOGGED` 테이블, partitioned table
- primary key도, 인덱스 기반 replica identity도 없는 테이블
- system catalog, TOAST 테이블, `user_catalog_table`로 선언한 테이블, heap이 아닌 access method
- 트랜잭션 블록 안의 실행
- `max_repack_replication_slots`가 추가 replication slot 생성을 허용하지 않을 때. 기본값은 5이고 서버 시작 때만 바꿀 수 있어, 한도에 걸리면 재시작 없이는 늘릴 수 없다

`CONCURRENTLY`와 `USING INDEX`를 함께 쓰면 재작성이 시작된 뒤 들어온 행은 인덱스 순서로 정렬하지 않는다.

## pg_repack과 비교

| 항목 | `REPACK (CONCURRENTLY)` | `pg_repack` 1.5.3 |
| --- | --- | --- |
| 설치 | 본체 명령(19 이상) | 데이터베이스마다 확장 설치, 클라이언트와 확장 버전 일치 필요 |
| 변경 수집 | logical decoding | 로그 테이블과 trigger |
| `ACCESS EXCLUSIVE` | 마지막 교체 단계 | 시작 시 trigger 설치와 마지막 교체 단계 |
| 키 요구 | primary key 또는 인덱스 기반 replica identity | primary key 또는 NOT NULL 컬럼의 unique index |
| 지원 버전 | 19 이상 | 9.5부터 18까지 |

18 이하에서 온라인 재작성이 필요하면 `pg_repack`의 잠금 대기 시간 제한과 충돌 쿼리 취소 옵션(`--wait-timeout`, `--no-kill-backend`)을 확인한다. 기본 동작은 시간 제한 뒤 충돌 쿼리를 취소하고 더 지나면 backend를 종료하는 방식이다.

## 판단 기준

- 공간을 다시 채울 쓰기가 곧 들어올 테이블이면 재작성보다 autovacuum 튜닝으로 dead tuple 재사용을 늘리는 쪽이 싸다. 재작성은 대량 삭제나 보존 정책 변경 뒤 공간이 장기간 비어 있을 때 고려한다.
- 오래된 데이터를 주기적으로 지우는 테이블은 partition을 `DROP`하는 설계가 재작성 자체를 줄인다.
- 실행 전 디스크 여유, 실행 시간대의 장기 쿼리, replication slot 여유와 `lock_timeout` 정책을 확인한다.

## 출처

- [PostgreSQL 19 Documentation, REPACK](https://www.postgresql.org/docs/19/sql-repack.html)
- [PostgreSQL 19 Documentation, VACUUM](https://www.postgresql.org/docs/19/sql-vacuum.html)
- [PostgreSQL 19 Documentation, CLUSTER](https://www.postgresql.org/docs/19/sql-cluster.html)
- [PostgreSQL 19 Documentation, Concurrency Control Caveats](https://www.postgresql.org/docs/19/mvcc-caveats.html)
- [PostgreSQL 19 Documentation, Explicit Locking](https://www.postgresql.org/docs/19/explicit-locking.html)
- [PostgreSQL 19 Documentation, System Information Functions and Operators](https://www.postgresql.org/docs/19/functions-info.html)
- [PostgreSQL 19 Documentation, Replication](https://www.postgresql.org/docs/19/runtime-config-replication.html)
- [Release 19 — PostgreSQL](https://www.postgresql.org/docs/19/release-19.html)
- [Roadmap — PostgreSQL](https://www.postgresql.org/developer/roadmap/)
- [pg_repack 1.5.3 — reorg](https://reorg.github.io/pg_repack/)
- [Postgres 19 Can Shrink Your Tables While They're Still Being Used (REPACK) — Better Stack](https://www.youtube.com/watch?v=Q0L4w1IAQjM)

## 관련 문서

- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Soft-Delete-and-Data-Lifecycle|Soft Delete와 데이터 수명주기]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
