---
tags: [database, mysql, innodb, buffer-pool, redo, io, tuning]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL InnoDB Tuning", "Buffer Pool", "innodb_flush_log_at_trx_commit"]
---

# InnoDB 메모리, 로그와 I/O 튜닝

InnoDB tuning은 권장 숫자를 복사하는 일이 아니다. working set, query shape, write burst, storage latency와 durability 요구를 측정하고 한 번에 한 가설만 바꾼다. 설정 변경 절차는 [[MySQL-Configuration-Change-Management|MySQL 설정 변경 관리]]를 따른다.

## Buffer pool 용량

Buffer pool은 InnoDB data와 index page를 cache한다. 크기는 물리 메모리의 고정 비율보다 다음 예산으로 결정한다.

```text
server memory
- OS and filesystem
- connection and thread memory
- sort, join and temporary memory
- performance schema and other processes
= buffer pool 후보 상한
```

`Innodb_buffer_pool_read_requests`와 `Innodb_buffer_pool_reads`로 logical request와 physical read 추세를 볼 수 있지만 hit ratio 하나에 보편적인 합격선은 없다. 큰 sequential scan은 낮은 ratio가 자연스러울 수 있고 99%여도 hot query가 잘못된 index로 많은 page를 읽으면 느릴 수 있다. latency, rows examined, page reads, eviction과 working set을 함께 본다.

MySQL 8.4의 `innodb_buffer_pool_size`는 online resize할 수 있다. 변경 중 내부 작업과 memory pressure를 관찰하고 단계적으로 조정한다. 재시작 warmup이 문제라면 buffer pool dump/load를 검토하되 잘못된 access pattern까지 영구히 데우는 것으로 오해하지 않는다.

## Midpoint insertion LRU

InnoDB는 단순 LRU가 아니라 새 page를 list 중간의 old sublist에 넣어 full scan과 read-ahead가 hot page를 밀어내는 일을 줄인다.

- `innodb_old_blocks_pct`가 old 영역 비율을 조정한다.
- `innodb_old_blocks_time` 안의 첫 재접근은 즉시 young 영역 승격으로 보지 않는다.
- scan 뒤 eviction과 hot page churn이 확인될 때만 대표 workload로 값을 비교한다.

강의나 과거 문서의 고정 비율과 지연 시간을 모든 workload의 정답으로 사용하지 않는다.

## Adaptive Hash Index

Adaptive Hash Index는 자주 접근하는 B-tree page의 일부 search pattern에 hash lookup 경로를 만들 수 있다. 모든 lookup을 상수 시간으로 바꾸는 별도 사용자 index가 아니며 workload에 따라 latch contention과 memory 비용이 생길 수 있다.

MySQL 8.4에서 `innodb_adaptive_hash_index` 기본값은 `OFF`다. 과거 버전의 기본값을 그대로 전제하지 말고 AHI search와 contention을 관찰하며 현실적인 동시성 benchmark로 ON/OFF를 비교한다.

## Change buffer와 read-ahead

Change buffer는 buffer pool에 없는 secondary index page의 DML 변경을 모았다가 page를 읽을 때 merge해 random I/O를 줄일 수 있다. 대신 buffer pool 공간, merge I/O와 recovery 시간을 소비한다. MySQL 8.4에서 `innodb_change_buffering` 기본값은 `none`이며 descending index 관련 제한도 있다. 과거 default와 bulk insert 관행을 그대로 적용하지 않는다.

Read-ahead는 여러 page를 비동기로 미리 읽는다.

- linear read-ahead는 sequential access를 감지해 다음 extent를 읽는다.
- random read-ahead는 별도 설정이며 기본적으로 활성화돼 있다고 가정하지 않는다.
- `Innodb_buffer_pool_read_ahead`, `_evicted`, `_rnd`로 미리 읽은 page가 실제로 쓰였는지 본다.

Prefetch를 늘려도 query가 필요한 row가 줄어드는 것은 아니다. 잘못된 full scan과 index를 먼저 고친다.

## Redo와 commit durability

`innodb_flush_log_at_trx_commit`은 redo write와 flush 시점을 바꾼다.

| 값 | commit 경계 | 주의점 |
|---|---|---|
| `1` | commit마다 redo write와 flush | 가장 강한 기본값이지만 storage가 flush를 정직하게 보장해야 한다. |
| `2` | commit마다 OS에 write, 주기적으로 flush | OS 또는 전원 장애에서 최근 transaction 손실 가능성이 커진다. |
| `0` | write와 flush를 background 주기에 맡김 | mysqld crash에서도 최근 transaction 손실 가능성이 있다. |

주기 작업은 scheduling 때문에 정확히 1초를 보장하지 않는다. Binary log를 durability/failover에 사용하면 `sync_binlog`와 group commit도 함께 본다. 결제라는 label만으로 설정을 고정하기보다 승인된 RPO와 storage 보장으로 선택한다.

MySQL 8.4에서는 redo 용량을 `innodb_redo_log_capacity`로 관리한다. 너무 작으면 aggressive checkpoint와 write stall, 너무 크면 recovery와 disk 예산에 영향을 줄 수 있다. `Innodb_redo_log_capacity_resized`, checkpoint age, log waits와 recovery rehearsal로 정한다.

## Flush와 I/O capacity

`innodb_io_capacity`와 `_max`는 background flushing이 가정하는 IOPS 수준이다. HDD, SSD, NVMe라는 제품명만으로 숫자를 정하지 말고 실제 storage의 지속 IOPS와 latency, 다른 workload가 쓸 여유를 측정한다.

- dirty page 비율과 checkpoint age가 계속 오르는가
- `Innodb_buffer_pool_wait_free`와 `Innodb_log_waits`가 증가하는가
- flush가 foreground latency와 replica lag를 악화시키는가
- OS swap, filesystem와 cloud volume throttle이 있는가

`O_DIRECT` 같은 flush method도 OS, filesystem와 deployment 방식에 따라 효과가 다르다. 설정이 지원되고 실제 double caching과 memory pressure가 문제인지 확인한다.

## 압축과 page 관찰

`ROW_FORMAT=COMPRESSED`, page compression과 binary log compression은 서로 다른 기능이다. Disk 절감률을 가정하지 말고 CPU, buffer pool, page split/reorganization과 write latency를 함께 benchmark한다. 자세한 도입 및 archive 절차는 [[MySQL-Compression-and-Archiving|MySQL 압축과 아카이빙]]에 둔다.

`INFORMATION_SCHEMA.INNODB_BUFFER_PAGE`는 큰 buffer pool을 scan해 상당한 overhead를 만들 수 있다. 상시 dashboard query 대신 status counters, Performance Schema와 `SHOW ENGINE INNODB STATUS`를 먼저 사용한다.

## 검증 순서

1. SLO 위반 query와 workload phase를 특정한다.
2. query plan, logical/physical reads, locks, redo와 storage latency를 같은 시간축으로 수집한다.
3. query/index 수정과 memory/I/O 설정 변경을 분리한다.
4. canary에서 throughput뿐 아니라 P95/P99, error, recovery와 replica lag를 비교한다.
5. 한 번에 한 변경을 적용하고 원복 조건과 이전 값을 기록한다.

## 출처

- [MySQL 8.4 Reference Manual, Configuring Buffer Pool Size](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html)
- [MySQL 8.4 Reference Manual, Midpoint Insertion Strategy](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-midpoint_insertion.html)
- [MySQL 8.4 Reference Manual, Adaptive Hash Index](https://dev.mysql.com/doc/refman/8.4/en/innodb-adaptive-hash.html)
- [MySQL 8.4 Reference Manual, Change Buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-change-buffer.html)
- [MySQL 8.4 Reference Manual, Read-Ahead](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-read_ahead.html)
- [MySQL 8.4 Reference Manual, InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html)
- [인프런, Hong, 메모리, 트랜잭션, 락](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338555)

## 관련 문서

- [[MySQL-Architecture|MySQL 아키텍처]]
- [[MySQL-Slow-Query-Diagnosis|Slow query 진단]]
- [[MySQL-Configuration-Change-Management|MySQL 설정 변경 관리]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
