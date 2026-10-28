---
tags: [postgresql, storage, nvme, ebs, performance, durability, lock, partitioning]
status: done
verified_at: 2026-10-26
category: "데이터&저장소(Data&Storage)"
aliases: ["PostgreSQL Storage Bottlenecks", "PostgreSQL 스토리지 병목"]
---

# PostgreSQL 스토리지 병목과 내구성

작업 데이터가 `shared_buffers`와 운영체제 캐시보다 커지면 무작위 페이지 읽기와 WAL 기록이 처리량을 제한할 수 있다. 이때 CPU가 덜 바쁘다는 사실은 계산 여유의 증거인 동시에 I/O를 기다리는 신호일 수 있다. CPU와 디스크가 함께 한가한데 처리량이 막히면 여러 세션이 잠금 하나를 차례로 기다리는 직렬화일 수도 있으므로, 원인을 정하기 전에 wait event로 나눈다.

## 부하가 경쟁하는 위치

애플리케이션 쿼리, VACUUM, 체크포인트와 복제는 같은 스토리지 경로를 사용할 수 있다. 쿼리 하나의 실행 계획 외에 장치 지연, IOPS 한도와 대기열, `pg_stat_activity`의 wait event를 함께 본다. CPU 프로파일의 함수별 비율과 전체 wall time도 구분한다.

## CPU가 남는데 처리량이 막히면 잠금 직렬화도 본다

CPU와 디스크 지연에 여유가 있는데 동시 세션을 늘려도 처리량이 오르지 않으면 여러 세션이 잠금 하나를 차례로 기다리는 직렬화 지점일 수 있다. 장비를 늘리기 전에 같은 구간의 `pg_stat_activity`에서 `wait_event_type`과 `wait_event`를 여러 번 모아 분포를 본다. 이 뷰는 조회 순간 기다리는 이벤트만 보여 주고, 한 트랜잭션 안에서는 첫 조회 때 모은 정보가 트랜잭션이 끝날 때까지 그대로 보인다. 그래서 표본은 조회마다 별도 트랜잭션(autocommit)으로 모으고, 같은 트랜잭션 안에서 모아야 하면 표본을 읽기 전마다 `pg_stat_clear_snapshot()`을 부른다.

- `wait_event_type`의 `Lock`은 heavyweight lock 대기다. 이 잠금은 주로 테이블 같은 SQL 객체를 보호하지만 relation 확장 같은 내부 작업의 상호 배제에도 쓰인다. `wait_event`가 `extend`이면 relation을 늘리려고 기다리는 중이다.
- relation을 확장할 권리는 `pg_locks`에서 `locktype = 'extend'`인 별도 잠금 객체로 표현된다. 상호 배제이므로 같은 relation에 새 페이지를 붙이려는 backend는 이 잠금을 한 번에 하나씩만 얻는다. 파일 확장 I/O를 기다리는 `IO` 유형의 `DataFileExtend`와 구분한다.
- `log_lock_waits`를 켜면 `deadlock_timeout`(기본 1초)보다 오래 기다린 잠금 대기가 로그에 남는다. PostgreSQL 18 기준 기본값은 `off`이고 superuser나 해당 `SET` 권한이 있어야 바꿀 수 있다. 2026-10-15 RC1이 나온 19의 릴리스 노트는 이 기본값을 `on`으로 바꾼다고 적으므로(2026-10-26 확인, 19 정식 출시 전), 운영 중인 버전의 문서로 다시 확인한다.
- 확장 경합은 9.6에서 완화됐다. 9.6은 확장 잠금에 경합이 있으면 relation을 여러 블록씩 늘리도록 바뀌었고, 16 릴리스 노트는 heap과 index 페이지 추가를 더 효율적으로 만들었다고 적는다. 아래 사례는 그 뒤 버전인 18에서도 이 잠금이 처리량 상한이 된 경우다.

### 파티셔닝은 잠금을 나눌 뿐이다

선언적 파티셔닝에서 부모 테이블은 자기 저장 공간이 없고 각 파티션이 일반 테이블처럼 저장 공간을 갖는다. 그래서 쓰기가 여러 파티션에 퍼지면 확장 대기도 파티션별 잠금으로 나뉜다. 잠금이 사라지지는 않으므로 쓰기를 한 파티션에 모으는 키를 고르면 병목이 더 작은 테이블에서 되살아난다. 해시 분할은 키의 해시값을 modulus로 나눈 나머지로 행을 배치하므로 특정 키 값에 쓰기가 몰리지 않으면 파티션에 고르게 퍼진다. 반면 range 키를 잘못 고르면 쓰기가 한 파티션에 모인다. 새 행이 최신 구간에 몰리는 시간 기준 키가 그런 예다(이 문서의 예).

PostgreSQL 18 문서 기준 비용과 제약도 함께 본다.

- 파티션 테이블의 PK와 `UNIQUE` 제약은 파티션 키 컬럼을 모두 포함해야 하며 파티션 키에 식이나 함수 호출이 없어야 한다. 각 인덱스는 자기 파티션 안의 유일성만 직접 보장하기 때문이다.
- 파티션 키에 대한 조건(`WHERE`와, 실행 중에 값이 정해지는 `PREPARE` 파라미터, 서브쿼리 값이나 nested loop join의 내부 값 포함)으로 pruning하지 못하면 모든 파티션을 스캔한다. pruning 뒤에도 남는 파티션이 많을수록 계획 시간과 메모리 사용이 늘고, 세션은 건드린 파티션마다 메타데이터를 자기 메모리에 올린다.
- 일반 테이블을 파티션 테이블로 바로 바꿀 수 없다. 새 파티션 테이블로 옮기거나 기존 테이블을 파티션으로 붙인다. `ATTACH PARTITION`은 부모에 `SHARE UPDATE EXCLUSIVE`를, 붙일 테이블과 DEFAULT 파티션(있으면)에 `ACCESS EXCLUSIVE`를 잡고 제약을 검사하려고 스캔한다. 문서는 각각에 맞는 `CHECK` 제약을 먼저 만들어 이 스캔을 피하고 붙인 뒤 중복된 `CHECK`는 지우라고 권하지만, 파티션 키에 식이 있고 파티션이 NULL을 받지 않으면 이 방법으로 스캔을 건너뛸 수 없다. batch 이동, write capture, cutover와 rollback 기준은 [[PostgreSQL-Production-Operations|PostgreSQL 운영]]의 대용량 데이터 이동 절을 함께 본다.

### 사례: PostgreSQL 18 동시 삽입의 확장 잠금

EDB가 2026-10-16 공개한 사례에서는 커뮤니티 PostgreSQL 18에 HammerDB TPROC-C 부하(창고 50개, 설정 기준 가상 사용자 64개)를 걸었다. 파티셔닝하지 않은 스키마는 vCPU 35%, 디스크 지연 1ms 미만인데도 3,400 TPS에 머물렀다. 가상 사용자를 64에서 128로 늘리자 NOPM은 약 40만에서 약 5만 2천으로 오히려 급감했고, 128에서는 75개가 넘는 backend가 확장 잠금 하나를 기다렸으며 가장 긴 대기는 6.7초였다. vCPU를 늘리고 더 빠른 NVMe로 다시 돌린 처리량 변화는 0%였다.

삽입이 가장 몰리는 테이블(원문은 hottest table)을 해시 파티션 10개로 나눈 비교에서 `Lock:extend` 대기는 98% 줄고 CPU 사용률은 35%에서 85%로 올랐으며, 같은 하드웨어의 128 VU 처리량은 7.2배였다. 장비 사양, 대상 테이블 이름과 파티셔닝 뒤의 절대 처리량은 공개되지 않았다. 3,400 TPS 문장에는 가상 사용자 수가 따로 없고, 설정의 64개로 읽으면 분당 약 20만 4천 건이라 신규 주문만 세는 64 VU의 NOPM 약 40만보다 작아 서로 맞지 않는다(계산). 그래서 원문의 TPS와 NOPM은 환산해 비교하지 않는다. 단일 벤치마크이므로 자기 워크로드에서 다시 시험하고, 조회가 쿼리와 파티션 키에 따라 느려질 수 있는지도 함께 잰다. 이 배율을 다른 스키마나 하드웨어의 기대 개선폭으로 쓰지 않는다.

2026-10-26 PostgreSQL 18 문서, 9.6, 16과 19(RC1 시점) 릴리스 노트, EDB 글로 이 절을 대조했다. 벤치마크는 재현하지 않았다.

## I/O 횟수, 대기 시간과 물리 읽기를 구분한다

PostgreSQL 18의 `pg_stat_io`는 `backend_type`, `object`, `context` 조합별 클러스터 통계다. 운영에서는 같은 구간의 증가량과 `stats_reset`을 함께 비교한다. `extends`는 relation 확장 연산 횟수이고 지연 시간은 `extend_time`이다. Relation I/O 시간은 `track_io_timing`이 꺼져 있으면 0이므로, 0을 대기 없음으로 해석하지 않는다. 확장 횟수 증가만으로 스토리지 병목을 확정하지 말고 앞 절의 확장 잠금과 I/O 대기를 구분한다.

PostgreSQL의 I/O 통계는 운영체제 페이지 캐시에서 받은 데이터와 실제 장치에서 읽은 데이터를 구분하지 못한다. `EXPLAIN (ANALYZE, BUFFERS)`의 `shared read`도 물리 디스크 읽기 횟수로 곧바로 환산하지 않는다. `ANALYZE`는 쿼리를 실제 실행하므로 쓰기 쿼리는 격리된 시험 환경에서 확인한다.

체크포인트 통계는 PostgreSQL 17에서 `pg_stat_bgwriter`의 관련 열이 새 `pg_stat_checkpointer`로 옮겨졌다. 18에서는 `num_timed`, `num_requested`와 `num_done`을 구분한다. 앞의 두 값은 건너뛴 체크포인트도 세지만 `num_done`은 수행한 것만 센다. 다른 버전의 진단 SQL을 그대로 쓰지 않는다.

진단 순서는 설계 제안이다. 같은 시간 구간의 wait event, I/O 통계 증가량, 실행 계획과 장치 지표를 대조한다. 읽기 요구량을 줄일 여지가 있는지 확인한 뒤 장치 성능 변경을 비교한다. I/O 대기 비율 하나로 쿼리 개선이 불필요하다고 판단하지 않는다.

2026-10-28 PostgreSQL 18 통계와 EXPLAIN 문서, 17 릴리스 노트로 이 절을 대조했다. 실제 DB 부하와 스토리지 성능은 측정하지 않았다.

## 비교 사례의 조건

2026-10-13 GeekNews 입력의 9.24배는 2026-10-16 확인한 ClickHouse 벤치마크 수치와 연결된다.

- PostgreSQL 18.3, `m6id.4xlarge`, 16 vCPU와 64GiB RAM, `shared_buffers=16GB`.
- 33억 행, heap 482GiB, 무작위 단일 행 UPDATE, client 64개와 thread 16개, 5분.
- 로컬 instance-store NVMe와 기본 3,000 IOPS gp3 EBS 비교.
- 중앙 처리량 16,030 TPS와 1,734 TPS로 약 9.24배다. 게시문은 9.2배로 반올림한다.

이는 해당 워크로드와 스토리지 구성의 측정이다. EBS 전체 제품군의 한계나 모든 PostgreSQL 쿼리의 개선 배율로 확대하지 않는다. gp3 IOPS와 처리량을 높인 구성, 캐시에 들어가는 데이터나 다른 병렬도에서는 다시 비교해야 한다.

## 성능과 데이터 보존은 별도 계약

로컬 instance store는 노드 수명에 묶인다. 교체 뒤 볼륨을 다시 붙일 수 있는 영속 블록 저장소와 다르다. 로컬 NVMe를 정본 저장에 쓰려면 복제, 장애 전환, WAL 아카이브와 백업 복원을 함께 설계한다.

동기 복제 설정 하나만으로 모든 장애에서 무손실을 단정하지 않는다. 승인 응답의 조건, failover 대상과 fencing, 복수 노드 손실을 따로 검증한다. 빠른 디스크는 행 저장을 열 저장으로 바꾸지 않으므로 대규모 분석 스캔의 별도 설계 필요성도 남는다.

## 운영 점검

1. 같은 쿼리, 데이터, 캐시 상태와 내구성 옵션으로 비교한다.
2. 평균뿐 아니라 p95/p99와 오류율, 유지보수의 진행률을 본다.
3. 노드 제거와 복원 시간을 포함해 비용을 계산한다.
4. CPU와 I/O에 여유가 있는데 처리량이 오르지 않으면 장비를 늘리기 전에 wait event 분포를 비교한다.

공개 벤치마크와 조건만 대조했으며 직접 재현하거나 복구 시험을 하지 않았다.

## 출처

- [Postgres on NVMe: performance and the convergence of transactions and analytics — ClickHouse](https://clickhouse.com/blog/postgres-on-nvme)
- [Finding (and Fixing) a Silent Throughput Ceiling in PostgreSQL — EDB, Vishal Sawale](https://www.enterprisedb.com/blog/finding-and-fixing-silent-throughput-ceiling-postgresql)
- [PostgreSQL 18 Documentation, The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 Documentation, Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [Release 17 — PostgreSQL](https://www.postgresql.org/docs/17/release-17.html)
- [PostgreSQL 18 Documentation, pg_locks](https://www.postgresql.org/docs/18/view-pg-locks.html)
- [PostgreSQL 18 Documentation, Error Reporting and Logging](https://www.postgresql.org/docs/18/runtime-config-logging.html)
- [PostgreSQL 18 Documentation, Lock Management](https://www.postgresql.org/docs/18/runtime-config-locks.html)
- [PostgreSQL 18 Documentation, Table Partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)
- [PostgreSQL 18 Documentation, ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html)
- [Release 9.6 — PostgreSQL](https://www.postgresql.org/docs/release/9.6.0/)
- [Release 16 — PostgreSQL](https://www.postgresql.org/docs/release/16.0/)
- [Release 19 — PostgreSQL](https://www.postgresql.org/docs/19/release-19.html) — 2026-10-26 확인, RC1 시점의 릴리스 노트로 발표일 미정

## 관련 문서

- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[RDS-PostgreSQL-Performance-Triage|RDS와 Aurora PostgreSQL 성능 진단]]
- [[Lock|DB Lock]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
- [[Backup-Restore|백업과 복구]]
