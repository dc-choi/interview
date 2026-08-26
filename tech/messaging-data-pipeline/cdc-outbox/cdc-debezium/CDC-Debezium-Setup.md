---
tags: [cdc, debezium, kafka, mysql, postgresql, binlog, wal]
status: done
verified_at: 2026-08-26
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC DB 설정", "Debezium 활성화 전제와 스냅샷 모드"]
---

# CDC, Debezium — DB별 전제와 동작 모드

Debezium 설정명은 배포 버전에 따라 달라진다. 이 문서에서 수정한 snapshot mode 설명은 Debezium 3.6 기준이며, 실제 connector 버전의 공식 문서를 함께 확인한다.

## MySQL CDC의 전제

표준 MySQL에서 Debezium이 동작하려면 다음 서버 설정이 필요하다.

- `binlog_format = ROW` — STATEMENT/MIXED은 행 단위 변경 정보를 잃어 CDC 불가
- `binlog_row_image = FULL` — UPDATE 시 변경 전후 전체 행 정보
- binary log를 활성화하고 고유한 `server_id`를 부여한다. `binlog_expire_logs_seconds`는 connector의 최대 중단과 복구 시간을 넘도록 정하고 저장 공간을 감시한다. 오래된 MySQL의 `expire_logs_days`는 최신 버전에서 deprecated 됐다
- Debezium 전용 계정 + `REPLICATION SLAVE`, `REPLICATION CLIENT`, `SELECT`, `RELOAD`, `SHOW DATABASES` 권한. RDS/Aurora처럼 global read lock을 허용하지 않아 table-level snapshot을 쓰는 환경은 `LOCK TABLES`도 필요

### Aurora MySQL 특수사항

- Aurora가 `server_id`와 binary log 파일을 관리하므로 표준 MySQL의 `server_id`, `log_bin`, `binlog_expire_logs_seconds` 절차를 그대로 적용하지 않는다
- 활성화 절차: 클러스터 파라미터 그룹에서 `binlog_format = ROW` 적용 → Writer 재부팅 또는 계획된 failover로 반영
- 보관 기간은 `CALL mysql.rds_set_configuration('binlog retention hours', N)`으로 설정하고 `CALL mysql.rds_show_configuration;`으로 확인한다. `N`은 connector의 최대 지연, snapshot과 복구 시간을 포함해 정하고 저장 공간을 감시한다
- 배포할 Aurora MySQL 엔진이 Debezium 3.6 지원 범위에 들어가는지 확인하고, binlog 활성화의 CPU와 I/O 영향은 실제 workload로 측정

## PostgreSQL CDC의 전제

PostgreSQL은 binlog 대신 **WAL(Write-Ahead Log)** 을 사용. Debezium의 PostgreSQL Connector는 **논리적 복제(logical replication)** 슬롯을 통해 WAL을 읽는다.

- `wal_level = logical` — 기본값 `replica`로는 변경 페이로드를 잃음. 행 단위 디코딩에 `logical` 필요
- `max_replication_slots ≥ 1`, `max_wal_senders ≥ 1` — 슬롯, 송신 워커 확보
- **Output plugin** — PostgreSQL 10+에 내장된 `pgoutput`을 사용한다. Debezium은 2.0부터 `wal2json` 지원을 제거했다
- **Publication** — `CREATE PUBLICATION dbz_pub FOR TABLE ...`로 캡처 대상 테이블 명시(또는 `FOR ALL TABLES`)
- **Replication slot** — Debezium이 자체 생성. 기본 `max_slot_wal_keep_size = -1`이면 멈춘 슬롯이 WAL을 제한 없이 보존할 수 있다. 값을 제한하면 디스크 고갈 위험은 줄지만 필요한 WAL이 제거되어 slot이 더 이상 이어받지 못하고 새 snapshot이 필요할 수 있음
- 전용 계정 권한: `REPLICATION` 속성 + 대상 테이블 `SELECT`

### RDS/Aurora PostgreSQL 특수사항
- 파라미터 그룹에서 `rds.logical_replication = 1` → **재부팅 필요**
- Aurora PostgreSQL에서 replication connection에 IAM 인증을 쓰려면 클러스터 IAM DB 인증을 켜고 `rds.iam_auth_for_replication = 1`을 설정한다. replication user에는 `GRANT rds_iam`과 `ALTER USER ... WITH REPLICATION`을 적용한다. 이 IAM 전용 파라미터는 동적이지만 `rds.logical_replication` 활성화에는 재부팅이 필요하다
- Debezium 3.6에서는 `plugin.name=pgoutput`, `database.connection.factory.class=io.debezium.connector.postgresql.connection.PostgresAwsIamConnectionFactory`를 설정하고 AWS Advanced JDBC Wrapper를 connector classpath에 추가한다
- IAM 인증 token은 기본 15분 뒤 만료된다. 정적 token을 connector 설정에 저장하지 말고 credential provider가 연결과 재연결 때 새 token을 발급하는지 확인하며 강제 재연결을 시험한다
- Aurora는 Reader 인스턴스에서는 논리적 복제 불가 — Writer에 연결

### 미회수 슬롯 주의
- 컨슈머가 죽은 슬롯은 WAL 보존 정책에 따라 `pg_wal`을 압박하거나, 보존 한도를 넘으면 필요한 WAL을 잃어 재동기화가 필요할 수 있음. 어느 쪽을 택해도 slot lag와 복구 절차를 운영 계약으로 둔다
- `pg_replication_slots`의 `restart_lsn`, `confirmed_flush_lsn`, `wal_status`를 감시한다. PostgreSQL 버전이 제공하면 `safe_wal_size`와 invalidation 상태도 함께 확인한다

## 동작 모드: Snapshot → Streaming

Debezium 커넥터는 두 단계로 진행.

### 1. Initial Snapshot

- 기본 `initial` snapshot은 일관된 기준점과 스키마를 기록한 뒤 행을 읽기 이벤트로 발행한다. lock 방식은 `snapshot.mode`, `snapshot.locking.mode`, 권한과 DB 설정에 따라 전역 읽기 잠금 또는 테이블 잠금이 될 수 있다. 전역 읽기 잠금 경로에서는 binlog 위치와 스키마를 읽은 뒤 잠금을 풀고, REPEATABLE READ transaction으로 행을 스캔한다. Debezium envelope에서는 기본적으로 `op: r`로 표시된다.
- 대용량 테이블에서는 잠금 획득과 장시간 transaction의 영향을 사전 측정한다. 전역 잠금이 불가한 환경에서는 table-level lock 경로와 필요한 권한을 확인한다.
- 자주 쓰는 모드는 `initial`(기본), `when_needed`, `no_data`(구 `schema_only`)다. MySQL/MariaDB connector의 `never`는 3.0에서 deprecated 되었고 3.6에서 제거됐으므로, 현재 버전에서는 쓰지 않는다.

### 2. Streaming (Change Events)

- 스냅샷 이후 기록한 binlog 위치부터 **실시간 이벤트 캡처**
- 커넥터가 자신이 처리한 binlog offset을 Kafka 내부 토픽에 저장 → 재기동 시 이어서

### 초기 스냅샷이 부담되는 경우

- 일관된 기준 데이터가 필요하면 먼저 Debezium의 initial snapshot을 검토한다. 전체 스캔 부담이 크면 지원되는 incremental snapshot을 작은 chunk로 실행하고 운영 부하를 측정한다.
- 외부 bulk load와 `no_data`를 결합하는 가장 단순한 안전 절차는 쓰기를 멈춘 상태에서 기준점을 기록하고 일관된 export를 만든 뒤, connector가 그 이후 변경을 받게 하고 쓰기를 재개하는 것이다. 초기 데이터 적용이 끝날 때까지 변경 이벤트를 버퍼링한 뒤 순서대로 반영한다. 온라인 방식은 같은 기준점의 일관된 snapshot과 version guard까지 별도로 증명해야 하므로, 이 cutover 계약이 없으면 사용하지 않는다.
- 중단 후 재개 동작은 snapshot 종류와 connector 버전에 따라 다르다. initial snapshot과 incremental snapshot의 재시작 동작을 현재 connector 문서로 확인한다.

## 출처
- [Debezium 공식 문서, MySQL connector 3.6](https://debezium.io/documentation/reference/3.6/connectors/mysql.html)
- [Debezium 공식 문서, PostgreSQL connector 3.6](https://debezium.io/documentation/reference/3.6/connectors/postgresql.html)
- [Debezium 3.6 Release Summary — Debezium](https://debezium.io/blog/2026/07/01/debezium-3-6-final-release/)
- [Amazon Aurora, Setting and showing binary log configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/mysql-stored-proc-configuring.html)
- [Amazon Aurora, IAM authentication for logical replication connections](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Replication.Logical.IAM-auth.html)
- [PostgreSQL 17 공식 문서, Replication settings](https://www.postgresql.org/docs/17/runtime-config-replication.html)
- [PostgreSQL 17 공식 문서, pg_replication_slots](https://www.postgresql.org/docs/17/view-pg-replication-slots.html)
- [m0rph2us — MySQL CDC with Debezium #1](https://m0rph2us.github.io/mysql/cdc/debezium/2020/05/23/mysql-cdc-with-debezium-1.html)
- [rastalion.dev — Aurora for MySQL에서 CDC를 준비하는 과정](https://rastalion.dev/aurora-for-mysql%EC%97%90%EC%84%9C-cdc%EB%A5%BC-%EC%A4%80%EB%B9%84%ED%95%98%EB%8A%94-%EA%B3%BC%EC%A0%95/)
- [mongsil-jeong — Debezium MySQL CDC Kafka Connect](https://mongsil-jeong.tistory.com/38)

## 관련 문서
- [[CDC-Debezium|CDC, Debezium (목차)]]
- [[CDC-Debezium-Concept|개념과 아키텍처]]
- [[CDC-Debezium-Operations|운영과 장애 대응]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
