---
tags: [database, mysql, innodb, performance-schema, wait-event, aurora, rds, cpu]
status: done
verified_at: 2026-10-13
category: "Database - RDBMS"
aliases: ["MySQL SYNCH Wait Events", "MySQL synch 대기 이벤트", "synch/mutex 대기", "innodb_sync_array_size"]
---

# MySQL SYNCH 대기 이벤트

SYNCH 대기는 세션이 서버 내부의 동기화 객체(mutex, rwlock, sxlock, prlock, condition)를 얻거나 신호를 기다리는 시간이다. 여러 세션이 같은 메모리 구조나 보호 객체에 동시에 접근할 때 늘어난다. 대기 세션 수와 CPU 사용률만 보고 인스턴스 증설로 결론 내리지 않고, 이벤트 이름이 가리키는 보호 대상부터 읽는다.

## 이름 읽는 법

Performance Schema의 동기화 계측 이름은 `wait/synch/<종류>/<모듈>/<객체>` 형태다. Aurora MySQL 대기 이벤트 문서는 같은 명명 규칙을 따르며 `synch/mutex/innodb/trx_sys_mutex`처럼 앞의 `wait/`를 빼고 적는다. 동기화 객체 계측의 대기 시간에는 잠금을 얻으려다 막힌 시간이 포함된다.

| 종류 | 의미 |
|---|---|
| `mutex` | 한 스레드가 자원(코드 구간 등)을 쓰는 동안 다른 스레드의 접근을 막는다 |
| `rwlock` | 읽기 잠금은 여러 스레드가 동시에 얻고, 쓰기 잠금은 한 스레드만 얻는다 |
| `sxlock` | 공용 자원에 쓰기 접근을 주면서 다른 스레드의 일관되지 않은 읽기를 허용하는 rwlock 변형이다. read-write 워크로드의 동시성을 높인다 |
| `prlock` | 우선순위가 있는 rwlock 객체다 |
| `cond` | 한 스레드가 기다리던 일이 일어났음을 다른 스레드에 알린다. 여러 스레드가 기다렸다면 모두 깨어나 자원을 다시 경쟁한다 |

`cond` 대기는 row lock이나 metadata lock처럼 더 높은 수준의 잠금을 기다리는 모습으로도 나타난다. 따라서 SYNCH 대기 전체를 메모리 구조 경합으로 묶지 않는다.

## CPU 사용률과 함께 오르는 이유

InnoDB의 mutex와 rw-lock은 보통 짧게 잡힌다. 그래서 멀티코어 시스템에서는 스레드가 바로 잠들지 않고 일정 시간 동안 잠금을 얻을 수 있는지 반복 확인(spin)하며, 그 사이 잠금이 풀리면 같은 time slice 안에서 바로 이어 간다. 여러 스레드가 같은 객체를 자주 확인하면 서로의 캐시를 무효화하는 cache ping pong이 생기므로, InnoDB는 확인 사이에 무작위 지연(spin-wait loop)을 넣는다.

spin은 CPU 시간을 쓰므로 같은 객체를 기다리는 세션이 많아지면 대기 세션과 CPU 사용률이 함께 오를 수 있다. CPU가 포화되면 잠금을 쥔 스레드의 실행도 늦어져 대기가 더 길어질 수 있다(동작 원리에서 도출한 추론). Aurora MySQL의 `cpu` 대기는 스레드가 CPU에서 실행 중이거나 CPU를 기다리는 상태다. 이 대기가 많다는 사실만으로 성능 문제는 아니며, 실행 준비가 된 활성 연결 수가 vCPU 수보다 계속 많을 때 경합으로 본다. 따라서 SYNCH 대기와 `cpu` 대기의 비중을 함께 본다.

## 대표 이벤트와 보호 대상

Aurora MySQL 문서의 이벤트 설명을 기준으로 정리했다. 계측되는 이벤트는 엔진과 버전에 따라 다르다. 예를 들어 `buf_pool_mutex`와 `aurora_lock_thread_slot_futex`의 설명은 Aurora MySQL 2, `row_lock_wait`와 `temp_pool_manager_mutex`는 Aurora MySQL 3 기준이다. Aurora MySQL 2는 2024-10-31 표준 지원이 끝났다. 실제 이름은 해당 서버의 `performance_schema.setup_instruments`와 Database Insights 화면에서 확인한다.

| 대기 이벤트 | 보호 대상과 흔한 원인 | 먼저 할 일 |
|---|---|---|
| `synch/sxlock/innodb/hash_table_locks` | buffer pool에 없는 page를 읽거나 LRU 목록에서 page를 넣고 뺄 때 buffer pool 접근용 hash table의 SX-lock을 기다린다. buffer pool이 작거나 eviction과 재적재가 잦으면 늘어난다 | 영향받는 쿼리의 실행 계획과 full scan 확인, buffer pool 크기 검토, error log의 page 손상 메시지 확인 |
| `synch/mutex/innodb/buf_pool_mutex`(Aurora MySQL 2) | buffer pool의 제어 구조를 보호하는 단일 mutex. working set이 buffer pool보다 크거나 특정 테이블의 page에 접근이 몰린다 | `Innodb_buffer_pool_wait_free`가 계속 늘면 buffer pool 크기를 검토하고 Top SQL의 실행 계획을 확인한다 |
| `synch/mutex/sql/LOCK_table_cache`, `synch/mutex/sql/LOCK_open` | 세션이 여는 테이블 수가 table definition cache나 table open cache 크기를 넘는다 | 두 cache의 크기 검토 |
| `synch/mutex/sql/MYSQL_BIN_LOG::LOCK_log`, `synch/cond/sql/MYSQL_BIN_LOG::COND_done` | binary log를 켠 상태에서 commit 처리량이 높거나 커밋하는 트랜잭션이 많거나 replica가 binlog를 읽는다 | multi-row 문이나 한 트랜잭션으로 묶어 커밋 수를 줄인다. Aurora에서는 binlog 복제 대신 global database나 `aurora_binlog_*` 파라미터를 검토한다 |
| `synch/sxlock/innodb/dict_sys_lock`, `synch/sxlock/innodb/dict_operation_lock` | InnoDB 데이터 딕셔너리. DDL 안에서 실행되는 DCL이 동시에 많이 발생한다 | 평상시 애플리케이션 동작에서 DDL 의존을 줄인다 |
| `synch/sxlock/innodb/index_tree_rw_lock` | 비슷한 DML이 같은 데이터베이스 객체에 동시에 몰린다 | multi-row 문을 쓰고 partitioning 등으로 작업을 여러 객체에 나눈다 |
| `synch/cond/innodb/row_lock_wait`(Aurora MySQL 3), `synch/mutex/innodb/aurora_lock_thread_slot_futex`(Aurora MySQL 2) | 여러 DML이 같은 row를 동시에 갱신한다 | row lock의 blocker와 잠금 순서를 확인한다([[Lock|DB Lock]]) |
| `synch/cond/sql/MDL_context::COND_wait_status` | table metadata lock을 기다린다 | metadata lock을 쥔 세션과 대기 중인 DDL을 확인한다([[MySQL-InnoDB-Locking-and-Deadlocks-Hierarchy|MySQL 잠금 계층]]) |
| `synch/mutex/innodb/temp_pool_manager_mutex` | Aurora MySQL 3에서 세션 임시 tablespace pool을 관리하는 mutex. cluster volume에 임시 테이블을 만드는 세션이 많거나 `INFORMATION_SCHEMA` 조회가 동시에 몰린다 | `EXPLAIN`으로 임시 테이블 생성 원인 확인, 가능하면 `PERFORMANCE_SCHEMA` 사용, connection pooling으로 활성 임시 tablespace 수 제한 |

Adaptive Hash Index를 쓰는 서버에서는 `SHOW ENGINE INNODB STATUS`의 `SEMAPHORES` 절에서 `btr0sea.c`에서 만든 rw-latch를 기다리는 스레드가 많은지 본다. 많으면 AHI partition 수(`innodb_adaptive_hash_index_parts`, 기본 8, 최대 512)를 늘리거나 AHI를 끄는 방안을 검토한다. `innodb_adaptive_hash_index_parts`는 정적 변수라 바꾸면 재시작이 필요하다. Aurora MySQL은 reader 인스턴스에서 AHI를 지원하지 않고, 버전 3에서는 AHI 사용 여부를 DB cluster 수준에서만 바꿀 수 있다. AHI의 기본값과 비교 방법은 [[MySQL-InnoDB-Tuning#Adaptive Hash Index|InnoDB 튜닝]]을 따른다.

## 진단 순서

1. **부하 분해:** Database Insights에서 DB Load를 대기 이벤트별로 나누고 같은 시간대의 Top SQL을 본다. DB Load와 vCPU 선의 해석은 [[RDS-Monitoring-Metrics#Database Insights와 Performance Insights 전환|Database Insights 전환]]과 [[DB-Incident-Triage|DB 장애 분류]]를 따른다.
2. **Performance Schema 상태 확인:** RDS for MySQL에서 Performance Schema가 꺼져 있으면 Database Insights는 대기 이벤트와 SQL별 지표를 수집하지 않고 활성 세션도 1초가 아니라 5초마다 수집한다. Performance Schema를 켜고 끄려면 재부팅이 필요하다. Database Insights가 Performance Schema를 자동 관리하면 실행 중인 인스턴스의 값만 바뀌고 파라미터 그룹 값은 그대로이므로 `SHOW GLOBAL VARIABLES`로 확인한다. 자동 관리는 t4g.medium 인스턴스 클래스에서 지원되지 않으며, Aurora MySQL 문서도 같은 수집 차이를 설명한다.
3. **짧은 CPU 피크 확인:** RDS는 기본적으로 CloudWatch에 1분 단위 지표를 보내고, CloudWatch의 CPU 사용률은 하이퍼바이저에서 수집한다. 1분 평균은 수 초짜리 피크를 낮춰 보이게 할 수 있다. Enhanced Monitoring은 인스턴스 안의 agent가 1, 5, 10, 15, 30, 60초 중 고른 간격으로 OS 지표를 수집한다. 콘솔의 갱신 간격은 가장 짧아도 5초이므로 1초 값은 CloudWatch Logs의 `RDSOSMetrics` 로그 그룹에서 본다([[RDS-Monitoring-Metrics#Enhanced Monitoring|Enhanced Monitoring]]).
4. **엔진 안에서 대상 좁히기:** `SHOW ENGINE INNODB STATUS`의 `SEMAPHORES` 절과 Performance Schema 요약 테이블로 어떤 객체를 기다리는지 좁힌다.

```sql
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT / 1000000000 AS SUM_TIMER_WAIT_MS
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE SUM_TIMER_WAIT > 0 AND EVENT_NAME LIKE 'wait/synch/%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

대기 시간은 기본적으로 피코초 단위라 1,000,000,000으로 나눠 밀리초로 읽는다. 값은 서버 시작이나 마지막 `TRUNCATE` 이후의 누계이므로 그사이 초기화가 없었는지 확인하고 두 시점의 차이로 비교한다. 시작 과정의 대기를 빼려면 시작 직후 요약 테이블을 `TRUNCATE`할 수 있다. 조회 전에 대상 계측이 `setup_instruments`에서 켜져 있고(`ENABLED`) 시간을 재는지(`TIMED`) 확인한다. MySQL 8.4에서 InnoDB mutex 대기 계측은 기본으로 꺼져 있고, 서버 시작 때 만들어지는 일부 mutex는 그 계측도 시작 시점에 켜져 있어야 잡힌다. 직접 운영하는 서버라면 장애 중에 계측을 켜서 바로 원인을 찾을 수 있다고 가정하지 않는다. RDS와 Aurora에서도 Performance Schema 관리 방식에 따라 켜진 계측이 다를 수 있다.

## 대응

- **CPU 여유 확보:** 대기 세션이 vCPU 수를 계속 넘고 CPU가 포화되면 vCPU가 더 많은 인스턴스 클래스로 바꿔 시간을 번다. RDS에서 인스턴스 클래스 변경은 다운타임이 생기는 변경이므로 Multi-AZ 구성과 적용 시점을 함께 정한다. 증설은 경합 원인을 없애지 않으므로 아래 원인 제거와 함께 진행한다.
- **`innodb_sync_array_size`:** mutex와 lock 대기 배열의 크기다. 기본 1, 범위 1~1024이고 서버 시작 때만 정할 수 있는 정적 변수다. 값을 늘리면 스레드 조정용 내부 구조가 나뉘어 대기 스레드가 많을 때 동시성이 높아진다. MySQL 매뉴얼은 대기 스레드가 자주 많이 생기는 워크로드(보통 768개 초과)에서 늘리기를 권한다. Aurora 문서는 `temp_pool_manager_mutex` 대기의 조치로, 기본값 1은 일반 워크로드에 맞지만 대기 스레드가 계속 늘면 vCPU 수 이상으로 두라고 권한다. 두 기준을 기계적으로 고르지 않고 관측한 대기 스레드 수로 판단한다. Aurora MySQL에서는 이 파라미터가 cluster 수준이라 사용자 DB cluster 파라미터 그룹에서 바꾸고, RDS for MySQL은 사용자 DB 파라미터 그룹에서 수정 가능 여부를 확인한 뒤 바꾼다. 기본 파라미터 그룹은 고칠 수 없고, 정적 파라미터는 재부팅 뒤에 적용된다. 재부팅 전에는 Configuration 탭의 파라미터 그룹 상태가 `pending-reboot`으로 보인다.
- **동시성 줄이기:** 같은 작업을 동시에 실행하는 세션 수를 줄이고 작업을 시간에 분산한다. 커밋 처리량이 병목인 binlog 대기에서는 단건 문을 multi-row 문이나 한 트랜잭션으로 묶어 커밋 횟수를 줄이되, 묶는 크기는 lock wait와 지연을 보며 제한한다. 행 잠금은 트랜잭션이 끝날 때까지 유지되므로 hot row나 metadata lock 대기에서는 오히려 트랜잭션을 짧게 유지한다([[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]). 애플리케이션의 connection pool 크기와 worker 수는 그 애플리케이션이 만드는 동시 세션의 상한이므로 함께 조정한다(설계 해석, [[MySQL-Connection-Management|MySQL Connection 관리]]).
- **보호 대상별 원인 제거:** 위 표의 조치(buffer pool과 접근 경로, table cache, 커밋 수, DDL 빈도, hot row)를 적용하고, 같은 부하 조건에서 SYNCH 대기 비중과 지연을 다시 비교한다.

## 체크포인트

- 대기 이벤트 이름의 보호 대상을 읽고 대응을 골랐는가
- 인스턴스 증설과 `innodb_sync_array_size` 조정을 원인 제거와 구분했는가
- 1분 CloudWatch CPU만 보고 짧은 피크를 놓치지 않았는가
- Performance Schema가 켜져 있고 Database Insights가 대기 이벤트를 수집하는 상태인지 먼저 확인했는가

## 출처

- [MySQL 8.4 Reference Manual, Performance Schema Instrument Naming Conventions](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-instrument-naming.html)
- [MySQL 8.4 Reference Manual, Configuring Spin Lock Polling](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-spin_lock_polling.html)
- [MySQL 8.4 Reference Manual, InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html)
- [MySQL 8.4 Reference Manual, Adaptive Hash Index](https://dev.mysql.com/doc/refman/8.4/en/innodb-adaptive-hash.html)
- [MySQL 8.4 Reference Manual, Monitoring InnoDB Mutex Waits Using Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/monitor-innodb-mutex-waits-performance-schema.html)
- [Amazon Aurora User Guide, Aurora MySQL wait events](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.Waitevents.html)
- [Amazon Aurora User Guide, Tuning Aurora MySQL with wait events](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Tuning.wait-events.html)
- [Amazon Aurora User Guide, cpu](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.cpu.html)
- [Amazon Aurora User Guide, Aurora MySQL configuration parameters](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ParameterGroups.html)
- [Amazon Aurora User Guide, Preparing for Amazon Aurora MySQL-Compatible Edition version 2 end of standard support](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.MySQL57.EOL.html)
- [Amazon Aurora User Guide, Overview of the Performance Schema for Database Insights on Aurora MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.EnableMySQL.html)
- [Amazon Aurora User Guide, synch/sxlock/innodb/hash_table_locks](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.sx-lock-hash-table-locks.html)
- [Amazon Aurora User Guide, synch/mutex/innodb/buf_pool_mutex](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.bufpoolmutex.html)
- [Amazon Aurora User Guide, synch/mutex/innodb/temp_pool_manager_mutex](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams-waits.io-temppoolmanager.html)
- [Amazon RDS User Guide, Overview of the Performance Schema for Database Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.EnableMySQL.html)
- [Amazon RDS User Guide, Monitoring Amazon RDS metrics with Amazon CloudWatch](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-cloudwatch.html)
- [Amazon RDS User Guide, Monitoring OS metrics with Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html)
- [Amazon RDS User Guide, Setting up and enabling Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [Amazon RDS User Guide, Modifying parameters in a DB parameter group](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.Modifying.html)
- [Amazon RDS User Guide, Settings for DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html)
- [Why are a high number of active sessions waiting for SYNCH wait events on my MySQL DB instance? — Amazon Web Services](https://www.youtube.com/watch?v=xSG6rN39j1M)

## 관련 문서

- [[MySQL-Diagnosis|MySQL 진단]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]] — buffer pool, Adaptive Hash Index
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]] — 원인 쿼리와 잠금 대기 특정
- [[RDS-Monitoring-Metrics|RDS 지표와 알람 기준]] — DB Load, Enhanced Monitoring
- [[DB-Incident-Triage|DB 장애 분류]] — AAS와 vCPU 선 해석
- [[MySQL-Connection-Management|MySQL Connection 관리]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]] — 트랜잭션 크기와 lock 보유 시간
- [[Race-Condition-Patterns-OS-Sync|OS 수준 동기화 기초]] — mutex, semaphore, spinlock
