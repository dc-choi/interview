---
tags: [database, rdbms, mysql, postgresql, oracle, binlog, wal, replication, pitr, cdc]
status: done
verified_at: 2026-09-29
category: "Data & Storage - RDB"
aliases: ["Transaction Logs, Replication, PITR, CDC", "트랜잭션 로그와 복제, PITR, CDC", "Binlog WAL Archive Log", "Replication Slot WAL Retention"]
---

# 트랜잭션 로그와 복제, PITR, CDC

트랜잭션 로그는 크래시 뒤 커밋된 변경을 되살리려고 만든 기록이다. 같은 로그를 다시 읽으면 다른 서버에 변경을 재현(복제)하고, 백업 이후의 변경을 원하는 시점까지 재실행(PITR)하고, 변경을 이벤트로 흘려보낼(CDC) 수 있다. 용도가 늘수록 로그의 소비자가 늘고, 로그를 언제 지울 수 있는지는 가장 느린 소비자가 정한다.

이 문서는 세 엔진의 로그 구조와 용도별 연결, 보존 정책과 운영 사고를 다룬다. 복제 토폴로지와 지연은 [[Replication|Replication]], 백업 절차는 [[MySQL-Backup|MySQL 백업과 PITR]], Debezium 설정 세부는 [[CDC-Debezium-Setup|CDC Debezium 설정]]과 [[CDC-Debezium-Operations|CDC Debezium 운영]]이 소유한다.

## 엔진별 로그 구조

| 축 | MySQL 8.4 | PostgreSQL 18 | Oracle 19c |
|---|---|---|---|
| 크래시 복구 로그 | InnoDB redo log(엔진 내부) | WAL | online redo log(순환 재사용) |
| 복제와 CDC 원천 | binary log(서버 계층, 엔진과 별도) | 같은 WAL | archive log와 online redo |
| 논리 변경 추출 | binlog 포맷 ROW(8.4 기본값). `binlog_format` 변수 자체는 deprecated | `wal_level = logical`에서 logical decoding | LogMiner. 최소한 minimal supplemental logging이 필요 |
| 변경 전후 행 정보 | `binlog_row_image = full`(기본값)이면 전체 컬럼 | publication과 replica identity 설정에 좌우 | supplemental logging 수준에 좌우 |
| 소비 위치 | 파일명과 위치, 또는 GTID | replication slot의 LSN | SCN |
| 보존 제어 | `binlog_expire_logs_seconds`(기본 30일) | slot이 필요한 WAL을 붙잡음, `max_slot_wal_keep_size`(13부터) | ARCHIVELOG 모드와 archive 보존 정책 |

- MySQL은 로그가 둘이다. redo는 InnoDB의 크래시 복구용이고, binlog는 복제, PITR, CDC용이다. 둘 사이 일관성은 내부 XA 커밋으로 맞춘다([[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB redo와 크래시 복구]]).
- PostgreSQL은 WAL 하나가 크래시 복구, 물리 복제, PITR, logical decoding을 모두 맡는다. 그래서 WAL 보존 문제가 곧 모든 용도의 문제가 된다.
- Oracle은 online redo log를 순환해 쓰고, ARCHIVELOG 모드에서만 채워진 로그를 archive로 보존한다. NOARCHIVELOG 모드에서 매체 장애가 나면 마지막 전체 백업 시점으로만 복원할 수 있다.

## 용도별 연결

- **복제**: 로그를 받아 같은 순서로 재실행한다. MySQL GTID는 파일명과 위치 대신 트랜잭션 식별자로 위치를 추적해 failover 뒤 재연결을 단순하게 한다.
- **PITR**: 전체 백업을 복원하고 그 뒤의 로그를 사고 직전까지 재실행한다. 로그가 중간에 끊기면 복구 가능 시점도 거기서 끝난다([[Backup-Restore|백업과 복원]]).
- **역방향 복구**: ROW binlog의 변경 전 이미지로 잘못 실행된 DML을 되돌리는 SQL을 만들 수 있다. 전체 행을 되살리려면 `binlog_row_image = full`이어야 한다. Oracle은 LogMiner 결과의 `SQL_UNDO` 컬럼이 같은 역할을 하지만 DDL에는 제공되지 않는다.
- **CDC**: 로그 기반 CDC는 테이블을 주기적으로 조회하는 배치 추출보다 지연이 짧고, 원본 DB에 조회 부하를 덜 주며, 삭제를 자연스럽게 잡는다. Debezium은 MySQL에서는 복제 클라이언트로 binlog를 받고, PostgreSQL에서는 logical replication slot을, Oracle에서는 LogMiner를 사용한다.
- **Outbox**: 업무 테이블 변경과 outbox 행 삽입을 한 트랜잭션으로 커밋하고, CDC가 outbox를 읽어 브로커로 발행한다. 데이터 변경과 이벤트 발행의 불일치를 로그 한 곳으로 모은다([[Transactional-Outbox|Transactional Outbox]]).

## 보존 기간 원칙

CDC를 붙인 뒤 로그 보존 기간은 다음 셋 중 가장 긴 값 이상이어야 한다.

- 가장 느린 복제본의 최대 지연
- PITR로 되돌아가야 하는 요구 기간(마지막 전체 백업 이후 전 구간)
- CDC 커넥터가 멈췄을 때 발견하고 복구하는 데 걸리는 시간

커넥터가 멈춘 사이 필요한 로그가 지워지면 이어서 읽을 수 없고 전체 스냅샷부터 다시 시작해야 한다. 큰 테이블에서는 이 재시작이 몇 시간 이상 걸릴 수 있으므로, CDC 도입은 로그 보존과 디스크 용량에 새 이해관계자와 SLA를 더하는 일이다.

## 운영 사고: slot이 WAL을 붙잡는다

PostgreSQL replication slot은 소비자가 확인한 위치 이전의 WAL을 지우지 않는다. 소비자가 사라지거나 멈춘 slot은 WAL을 계속 쌓아 디스크를 채운다. logical slot은 카탈로그 정리도 막아, 극단적인 경우 XID wraparound 방지를 위한 중단까지 이어질 수 있다.

1. **지연 감시**: slot별로 붙잡은 WAL 양을 주기적으로 본다.

   ```sql
   SELECT slot_name, active, wal_status,
          pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
   FROM pg_replication_slots;
   ```

2. **미사용 slot 제거**: 소비자를 폐기할 때 `pg_drop_replication_slot()`으로 slot도 함께 지운다. slot 생성과 삭제를 커넥터 배포 절차에 묶는다.
3. **상한 설정**: `max_slot_wal_keep_size`를 두면 디스크 고갈 대신 해당 slot이 무효화된다. 18부터는 `idle_replication_slot_timeout`으로 오래 쉬는 slot을 무효화할 수 있다. 어느 쪽이든 무효화된 소비자는 스냅샷부터 다시 시작해야 하므로, 디스크 보호와 재동기화 비용 중 무엇을 택할지 미리 정한다.

MySQL도 같은 문제가 다른 모습으로 나타난다. binlog 보존 기간이 너무 짧으면 멈춘 커넥터와 복제본이 이어 읽지 못하고, 너무 길면 디스크가 찬다.

## Failover와 logical slot

logical slot이 대기 서버로 따라가는지는 PostgreSQL 버전과 설정에 달려 있다.

- **16 이하**: primary의 logical slot을 대기 서버로 동기화하는 기능이 없다. 대기 서버가 승격되면 slot을 새로 만들어야 하고, 소비자는 새 slot의 시작 위치와 마지막으로 처리한 위치 사이의 공백이나 중복을 직접 처리해야 한다. 재생성 자동화, LSN 정합성 확인과 멱등한 소비자 설계가 대응책이다.
- **17 이상**: slot을 `failover` 옵션으로 만들고 대기 서버에서 `sync_replication_slots`를 켜면 slot을 대기 서버로 동기화할 수 있다. 이를 위해 대기 서버는 primary와 물리 replication slot(`primary_slot_name`)을 쓰고 `hot_standby_feedback`을 켜야 하며, `primary_conninfo`에 유효한 `dbname`이 있어야 한다. primary의 `synchronized_standby_slots`에 그 물리 slot을 넣어 logical 소비자가 대기 서버보다 앞서 나가지 않게 하는 것이 권장된다. 대신 logical 전송에 약간의 지연이 더해진다.

관리형 서비스는 이 설정을 노출하는 범위가 제공자마다 다르므로 실제 failover 훈련으로 확인한다. 어떤 방식이든 소비자는 같은 변경을 두 번 받을 수 있다고 보고 멱등하게 처리한다.

## 적용 점검

- 로그의 소비자(복제본, 백업, CDC, 감사)를 모두 적고, 각각의 최대 지연과 복구 시간을 알고 있는가
- 보존 기간이 위 원칙의 최댓값을 넘고, 그만큼의 디스크 여유가 있는가
- slot과 커넥터의 생성, 삭제가 배포 절차에 묶여 있어 고아 slot이 생기지 않는가
- CDC가 요구하는 로그 설정(ROW 포맷과 full row image, `wal_level = logical`, supplemental logging)이 켜져 있는가
- failover 뒤 소비자가 어디서부터 다시 읽는지 훈련으로 확인했는가

## 면접 체크포인트

- MySQL이 redo log와 binlog를 따로 두는 이유와 PostgreSQL WAL과의 차이
- CDC에 ROW 포맷과 변경 전 이미지가 필요한 이유
- 비활성 replication slot이 디스크를 채우는 원리와 세 가지 대응
- PostgreSQL 17 전후로 failover 시 logical slot 처리가 어떻게 다른가
- CDC 도입 뒤 로그 보존 기간을 정하는 기준

## 출처

- [MySQL 8.4 Reference Manual, Binary Logging Options and Variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html)
- [MySQL 8.4 Reference Manual, Replication Formats](https://dev.mysql.com/doc/refman/8.4/en/replication-formats.html)
- [PostgreSQL 18 Documentation, Logical Decoding Concepts](https://www.postgresql.org/docs/18/logicaldecoding-explanation.html)
- [PostgreSQL 18 Documentation, Replication](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18 Documentation, Write Ahead Log](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [PostgreSQL 13 Release Notes](https://www.postgresql.org/docs/release/13.0/)
- [PostgreSQL 17 Release Notes](https://www.postgresql.org/docs/release/17.0/)
- [PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/release/18.0/)
- [Oracle Database 19c Administrator's Guide, Managing Archived Redo Log Files](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-archived-redo-log-files.html)
- [Oracle Database 19c Utilities, Using LogMiner to Analyze Redo Log Files](https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-logminer-utility.html)
- [Debezium Documentation, Debezium Connector for Oracle](https://debezium.io/documentation/reference/stable/connectors/oracle.html)
- [트랜잭션 로그의 세계: Binlog, WAL, Archive Log — Threads, bear_dba](https://www.threads.com/@bear_dba/post/DaMpzH1mO7E)
- [PostgreSQL 논리 복제 슬롯 누수와 fail-over 대응 — Threads, dev.dailyq](https://www.threads.com/@dev.dailyq/post/DYUAg39msEl)

## 관련 문서

- [[Replication|Replication]]
- [[MySQL-Backup|MySQL 백업과 PITR]]
- [[Backup-Restore|백업과 복원]]
- [[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB redo와 크래시 복구]]
- [[CDC-Debezium-Setup|CDC Debezium 설정]]
- [[CDC-Debezium-Operations|CDC Debezium 운영]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
