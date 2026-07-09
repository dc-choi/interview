---
tags: [cdc, debezium, kafka, mysql, postgresql, binlog, wal]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC DB 설정", "Debezium 활성화 전제와 스냅샷 모드"]
---

# CDC, Debezium — DB별 전제와 동작 모드

## MySQL CDC의 전제

MySQL(또는 Aurora MySQL)에서 Debezium이 동작하려면 서버 설정이 필요.

- `binlog_format = ROW` — STATEMENT/MIXED은 행 단위 변경 정보를 잃어 CDC 불가
- `binlog_row_image = FULL` — UPDATE 시 변경 전후 전체 행 정보
- `server_id`, `log_bin`, `binlog_expire_logs_seconds` 설정. 오래된 MySQL의 `expire_logs_days`는 최신 버전에서 deprecated
- Debezium 전용 계정 + `REPLICATION SLAVE`, `REPLICATION CLIENT`, `SELECT`, `RELOAD` 권한

### Aurora MySQL 특수사항

- binlog 기본 OFF — 공유 스토리지 아키텍처상 더티 페이지 개념이 다름
- 활성화 절차: 클러스터 파라미터 그룹에서 `binlog_format = ROW` 적용 → Writer 재부팅 또는 계획된 failover로 반영
- Aurora 2.11.2 이상 권장 (특정 버전에 CPU 급증 이슈)
- 버전 **2.10.x 이상의 "binlog I/O 캐시"** 덕에 과거 대비 성능 페널티가 크게 줄었음

## PostgreSQL CDC의 전제

PostgreSQL은 binlog 대신 **WAL(Write-Ahead Log)** 을 사용. Debezium의 PostgreSQL Connector는 **논리적 복제(logical replication)** 슬롯을 통해 WAL을 읽는다.

- `wal_level = logical` — 기본값 `replica`로는 변경 페이로드를 잃음. 행 단위 디코딩에 `logical` 필요
- `max_replication_slots ≥ 1`, `max_wal_senders ≥ 1` — 슬롯, 송신 워커 확보
- **Output plugin** — `pgoutput`(PostgreSQL 10+ 내장, 권장) 또는 `wal2json`. `pgoutput`이 표준
- **Publication** — `CREATE PUBLICATION dbz_pub FOR TABLE ...`로 캡처 대상 테이블 명시(또는 `FOR ALL TABLES`)
- **Replication slot** — Debezium이 자체 생성. 컨슈머가 멈추면 WAL이 디스크에 무한 누적되므로 슬롯 관리 필수
- 전용 계정 권한: `REPLICATION` 속성 + 대상 테이블 `SELECT`

### RDS/Aurora PostgreSQL 특수사항
- 파라미터 그룹에서 `rds.logical_replication = 1` → **재부팅 필요**
- IAM 인증 사용 시 `rds_replication` role 부여
- Aurora는 Reader 인스턴스에서는 논리적 복제 불가 — Writer에 연결

### 미회수 슬롯 주의
- 컨슈머가 죽었는데 슬롯이 살아있으면 WAL이 회수되지 않아 **디스크 풀** 장애 → Connector 모니터링은 필수
- `pg_replication_slots` 뷰의 `confirmed_flush_lsn`을 알람화

## 동작 모드: Snapshot → Streaming

Debezium 커넥터는 두 단계로 진행.

### 1. Initial Snapshot

- 전역 읽기 잠금 확보 → 트랜잭션 시작 → **binlog 현재 위치, 스키마 기록** → 스냅샷 행을 읽기 이벤트로 발행. Debezium envelope에서는 기본적으로 `op: r`로 표시된다.
- 스냅샷 중에도 락이 짧게 끝나도록 설계되어 있지만 대용량 테이블에서는 장시간 실행 가능
- 옵션: `snapshot.mode = initial`(기본), `when_needed`, `no_data`(구 `schema_only`), `never`

### 2. Streaming (Change Events)

- 스냅샷 이후 기록한 binlog 위치부터 **실시간 이벤트 캡처**
- 커넥터가 자신이 처리한 binlog offset을 Kafka 내부 토픽에 저장 → 재기동 시 이어서

### 초기 스냅샷이 부담되는 경우

- 수억 건 테이블은 3시간+ 걸림 → **ETL 배치로 초기 데이터 적재 + 커넥터는 `no_data`로 스키마만 기록하고 스트리밍만** 하는 하이브리드가 효율적
- 스냅샷 도중 재시작은 처음부터 다시 → **체크포인팅이 제한적**이라는 점 인지

## 출처
- [m0rph2us — MySQL CDC with Debezium #1](https://m0rph2us.github.io/mysql/cdc/debezium/2020/05/23/mysql-cdc-with-debezium-1.html)
- [rastalion.dev — Aurora for MySQL에서 CDC를 준비하는 과정](https://rastalion.dev/aurora-for-mysql%EC%97%90%EC%84%9C-cdc%EB%A5%BC-%EC%A4%80%EB%B9%84%ED%95%98%EB%8A%94-%EA%B3%BC%EC%A0%95/)
- [mongsil-jeong — Debezium MySQL CDC Kafka Connect](https://mongsil-jeong.tistory.com/38)

## 관련 문서
- [[CDC-Debezium|CDC, Debezium (목차)]]
- [[CDC-Debezium-Concept|개념과 아키텍처]]
- [[CDC-Debezium-Operations|운영과 장애 대응]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
