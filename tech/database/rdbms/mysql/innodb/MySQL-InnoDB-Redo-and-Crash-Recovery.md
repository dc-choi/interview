---
tags: [database, mysql, innodb, redo, checkpoint, crash-recovery, binlog]
status: done
verified_at: 2026-08-11
category: "Database - RDBMS"
aliases: ["MySQL InnoDB Redo", "InnoDB Crash Recovery"]
---

# MySQL 8.4 InnoDB Redo와 Crash Recovery

Commit은 data page를 즉시 tablespace에 모두 쓰는 작업이 아니다. InnoDB는 redo의 WAL 규칙으로 commit latency와 page flush를 분리하고, binary log를 사용하면 내부 2단계 commit으로 두 기록의 결과를 맞춘다.

## 네 구조의 책임을 분리한다

| 구조 | 남기는 것 | 해결하는 문제 | 해결하지 않는 것 |
|---|---|---|---|
| undo | 변경 전 값을 되돌리거나 복원할 정보 | rollback, MVCC consistent read | commit 내구성, torn page 복구 |
| redo | page 변경을 다시 적용할 log record | crash 뒤 checkpoint 이후 data file에 빠진 page 변경 재적용 | undo에 따른 미완료 transaction rollback, prepared transaction의 binlog outcome 조정, PITR |
| doublewrite (`ON`, `DETECT_AND_RECOVER`) | 최종 data file 쓰기 전의 정상 page copy | 불완전한 page write 감지와 복구 | transaction outcome 판단 |
| binary log | server 수준의 transaction event | replication, PITR, InnoDB와 commit 조정 | InnoDB page 자체의 crash recovery |

Redo와 doublewrite는 서로 대체하지 않는다. redo가 있어도 torn page의 기준 이미지가 손상되면 재적용 출발점이 없을 수 있다. 일반 InnoDB recovery는 redo 적용 뒤 영속화된 transaction state와 undo를 이용해 crash 당시의 미완료 transaction을 rollback한다. Binary log와 맞추는 작업은 internal 2PC에서 prepare된 transaction의 outcome을 별도로 정하는 server-level 과정이다. Redo 자체는 이 조정이나 PITR을 제공하지 않는다.

## DML에서 commit까지

단순화한 흐름은 다음과 같다.

```text
DML
  -> rollback/MVCC용 undo 생성
  -> buffer pool의 data/index page 변경, dirty page가 됨
  -> redo log buffer에 변경 기록, LSN 증가
COMMIT
  -> redo durability 경계 적용
  -> binary log 사용 시 InnoDB prepare와 binlog 기록을 2단계로 조정
  -> commit 완료, lock 해제
background
  -> dirty page flush
  -> checkpoint 전진, 오래된 redo 재사용 가능
```

이 흐름은 책임과 순서를 이해하기 위한 공개 계약 수준의 모델이다. mini-transaction, redo record format과 latch 순서는 버전 고정 소스 코드 주제이며 운영 계약으로 외우지 않는다.

### Binary log와 내부 2단계 commit

Transactional statement의 binary logging은 lock 해제와 storage engine commit보다 먼저 이루어진다. MySQL은 InnoDB transaction과 binary log를 내부 XA의 두 참가자처럼 조정한다.

1. InnoDB가 transaction을 prepare한다.
2. server가 binary log transaction을 write하고 설정에 따라 sync한다.
3. 준비된 transaction을 InnoDB에 commit한다.

Crash 뒤 MySQL은 마지막 binary log에서 유효한 transaction ID를 찾아 prepare 상태의 InnoDB transaction을 commit할지 rollback할지 결정하고 손상된 binlog tail은 잘라 낸다. 이 조정이 있어야 engine data에는 있는데 replication/PITR log에는 없는 transaction을 줄일 수 있다.

Group commit은 여러 transaction의 binlog sync와 engine commit을 묶어 fsync 비용을 나눈다. `binlog_group_commit_sync_delay`를 늘리면 group이 커질 수 있지만 각 commit의 대기 시간이 늘고 높은 경합에서는 처리량도 낮아질 수 있다. 측정 없이 성능 해법으로 고정하지 않는다.

## Fuzzy checkpoint와 redo 용량

각 redo record에는 증가하는 log sequence number, LSN이 있다. Checkpoint LSN은 그 이전 변경을 data file에서 복구할 수 있는 경계를 뜻한다. InnoDB는 dirty page를 작은 batch로 flush하는 fuzzy checkpoint를 사용하므로 transaction 처리 중에도 checkpoint가 전진한다.

- redo가 생성되는 속도가 checkpoint보다 계속 빠르면 사용 가능한 redo 공간이 줄어 aggressive flush와 foreground wait가 생길 수 있다.
- `innodb_redo_log_capacity`를 크게 하면 burst 흡수 여지는 커지지만 disk 예산과 최악 복구 작업량도 같이 검토해야 한다.
- checkpoint가 전진했다고 모든 최신 dirty page가 flush됐다는 뜻은 아니다. recovery는 최신 checkpoint부터 남은 redo를 재적용한다.

파라미터 선택은 [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]이 소유한다.

## Doublewrite와 torn page

`innodb_doublewrite=ON` 또는 `DETECT_AND_RECOVER`이면 InnoDB는 page를 data file의 최종 위치에 쓰기 전에 doublewrite 영역에 기록한다. 재시작 때 최종 page write가 불완전하면 정상 copy를 이용해 복구한 뒤 redo를 적용할 수 있다. `DETECT_ONLY`는 metadata만 기록하므로 불완전 write를 탐지할 수 있지만 복구할 page 내용이 없고, `OFF`는 doublewrite를 비활성화한다.

## Crash recovery 단계

정상 shutdown이 아니면 InnoDB는 대체로 다음 작업을 수행한다.

1. tablespace를 찾고 최신 checkpoint 이후 기록된 page 변경을 redo한다. 나중에 rollback할 미완료 transaction의 변경도 이 단계에는 포함될 수 있다.
2. redo 적용이 끝나면 client connection을 받을 수 있다.
3. 일반 미완료 transaction의 효과를 영속화된 transaction state와 undo로 rollback한다. prepared transaction은 이 일반 rollback 경로와 구분한다. 큰 rollback은 background에서 계속되며 recovery 중인 lock과 새 요청이 충돌할 수 있다.
4. change buffer merge와 purge 같은 background 작업을 이어 간다.

Binary log가 켜진 server restart에서는 server가 마지막 binary log의 유효한 transaction ID와 internal 2PC에서 prepare된 InnoDB transaction을 맞춰 outcome을 정한다. 이는 redo의 기능이 아니다. 명시적 XA의 `PREPARED` transaction도 일반 incomplete rollback 대상이 아니며 coordinator가 `XA COMMIT` 또는 `XA ROLLBACK`으로 끝낸다. 이를 위 background 작업의 고정된 앞뒤 순서로 외우지 않는다.

접속 가능 상태를 recovery 완료와 같다고 보면 안 된다. 재시작 직후 latency, rollback 중인 transaction, lock wait, purge와 replica 상태를 함께 확인한다.

## Durability 설정의 실제 경계

| 설정 | 값 | commit 때의 의미 |
|---|---:|---|
| `innodb_flush_log_at_trx_commit` | `1` | redo를 write하고 storage에 flush |
|  | `2` | redo를 매 commit OS에 write하고 flush는 주기 작업에 맡김 |
|  | `0` | redo write와 flush를 모두 주기 작업에 맡김 |
| `sync_binlog` | `1` | binary log를 commit group마다 sync하는 가장 안전한 설정 |
|  | `0` | OS가 binary log sync 시점을 결정 |
|  | `N > 1` | N개 binary log commit group마다 sync |

Binary log를 durability와 replication에 사용한다면 매뉴얼은 `innodb_flush_log_at_trx_commit=1`, `sync_binlog=1`을 가장 안전한 조합으로 제시한다. `0`과 `2`의 주기 작업은 scheduling 때문에 정확히 1초를 보장하지 않는다. 어떤 설정도 OS, filesystem, controller와 storage가 flush 요청을 정직하게 보존하지 않는 문제까지 해결하지 못한다.

## SQL로 볼 수 있는 증거

```sql
SELECT @@GLOBAL.log_bin AS log_bin,
       @@SESSION.sql_log_bin AS session_sql_log_bin,
       @@GLOBAL.sync_binlog AS sync_binlog,
       @@GLOBAL.innodb_flush_log_at_trx_commit AS innodb_flush_log_at_trx_commit,
       @@GLOBAL.innodb_doublewrite AS innodb_doublewrite,
       @@GLOBAL.innodb_redo_log_capacity AS innodb_redo_log_capacity;

SHOW GLOBAL STATUS
WHERE Variable_name IN (
  'Innodb_redo_log_current_lsn',
  'Innodb_redo_log_flushed_to_disk_lsn',
  'Innodb_redo_log_checkpoint_lsn',
  'Innodb_redo_log_logical_size',
  'Innodb_redo_log_physical_size'
);

SELECT *
FROM performance_schema.innodb_redo_log_files
ORDER BY FILE_ID;
```

Write 전후 current LSN과 checkpoint LSN의 차이를 비교하면 redo 생성과 checkpoint 진행을 볼 수 있다. 이 query는 storage가 실제로 flush를 보존했거나 crash recovery가 성공한다는 증명은 아니다.

Crash 실험 전에는 위 첫 SELECT 결과를 기록한다. `log_bin=OFF`라면 InnoDB 단독 recovery만 확인할 수 있고 internal 2PC의 binlog participant, replica와 PITR 경로는 검증할 수 없다. 일반적인 crash 실험이 성공해도 torn-page repair를 증명하지는 않는다. 그 보장은 불완전한 page write를 만드는 page-write fault injection으로 별도 검증해야 한다.

Crash 실험은 disposable instance에서만 수행한다. commit된 marker와 미커밋 transaction을 만든 뒤 process crash, host/power failure를 각각 모사하고 재시작 후 row, error log, binlog와 replica/PITR 결과를 확인한다. shared 개발 DB나 운영 DB에서 durability 설정 변경, redo 비활성화와 강제 crash를 실행하지 않는다.

## 통과 기준

- undo, redo, doublewrite와 binary log 중 어떤 구조가 어떤 실패를 복구하는지 구분할 수 있다.
- data page flush 없이도 commit할 수 있는 이유와 checkpoint가 redo 재사용 경계를 만드는 과정을 설명할 수 있다.
- process crash와 OS/power crash에서 `innodb_flush_log_at_trx_commit=2`의 결과가 다른 이유를 설명할 수 있다.
- 재시작 후 접속이 되는데도 lock wait와 높은 latency가 남을 수 있는 이유를 설명할 수 있다.
- group commit이 fsync를 줄이는 이득과 지연을 추가하는 비용을 함께 측정 항목으로 제시할 수 있다.

## 출처

- [MySQL 8.4 Reference Manual, Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 Reference Manual, Checkpoints](https://dev.mysql.com/doc/refman/8.4/en/innodb-checkpoints.html)
- [MySQL 8.4 Reference Manual, Doublewrite Buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html)
- [MySQL 8.4 Reference Manual, InnoDB Recovery](https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html)
- [MySQL 8.4 Reference Manual, Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)
- [MySQL 8.4 Reference Manual, Restrictions on XA Transactions](https://dev.mysql.com/doc/refman/8.4/en/xa-restrictions.html)
- [MySQL 8.4 Reference Manual, Binary Logging Options](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html)
- [MySQL 8.4 Reference Manual, The innodb_redo_log_files Table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-innodb-redo-log-files-table.html)
- [MySQL 8.4 Reference Manual, InnoDB System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit)

## 관련 문서

- [[MySQL-Architecture|MySQL 아키텍처와 InnoDB 저장 경로]]
- [[MySQL-InnoDB-Tuning|InnoDB 메모리, 로그와 I/O 튜닝]]
- [[MySQL-Backup|MySQL 백업, 복원과 PITR]]
- [[Replication|Replication]]
