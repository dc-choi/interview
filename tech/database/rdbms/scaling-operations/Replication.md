---
tags: [database, rdbms, mysql, replication, binlog, consistency]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Replication", "MySQL Replication"]
---

# MySQL Replication

MySQL replication은 source가 binary log에 기록한 transaction event를 replica가 받아 relay log에 저장하고 적용하는 구조다. 기본은 asynchronous이므로 source의 commit 성공이 replica 적용이나 수신을 보장하지 않는다.

## Event 전달과 적용

```text
source transaction
  -> binary log
  -> binlog dump thread
  -> replica receiver thread
  -> relay log
  -> coordinator and applier worker threads
  -> replica InnoDB
```

- source의 dump thread는 연결된 replica에 binlog 내용을 보낸다.
- replica receiver thread는 source에 연결해 event를 받아 relay log에 쓴다. 주기적 table polling이 아니다.
- applier는 relay log transaction을 적용한다. `replica_parallel_workers`가 1 이상이면 coordinator와 worker가 병렬 적용할 수 있다.
- GTID는 각 transaction에 전역 식별자를 부여해 position 추적, failover와 중복 실행 판정을 단순화한다.

Receiver가 따라잡았어도 applier가 밀릴 수 있다. Network lag와 apply lag를 분리해 본다.

## Binary log format

| format | 기록 단위 | 주요 trade-off |
|---|---|---|
| `ROW` | 변경된 row event | 결정적 적용에 유리하지만 변경 row가 많으면 log가 커질 수 있음 |
| `STATEMENT` | 실행한 SQL statement | log가 작을 수 있지만 일부 비결정적 statement는 unsafe |
| `MIXED` | 상황에 따라 statement와 row 선택 | 동작 추론과 운영 검증이 더 복잡할 수 있음 |

Binary log는 SQL 문자열만 모은 파일이라고 단정하지 않는다. format에 따라 event 내용이 달라진다. CDC, point-in-time recovery와 replica compatibility 요구까지 포함해 선택한다.

## Async와 semisync

Asynchronous replication에서는 source가 replica의 수신이나 적용을 기다리지 않는다. Source 장애 시 commit됐지만 어떤 replica에도 전달되지 않은 transaction이 있을 수 있다.

Semisynchronous replication은 source가 configured 수의 semisync replica로부터 transaction event를 받았다는 acknowledgment를 기다린다. 이는 replica가 transaction을 적용했다는 확인이 아니다. TCP round trip과 replica relay-log 경로만큼 commit latency가 늘고 timeout 뒤 asynchronous mode로 돌아갈 수 있으므로 timeout, wait point와 fallback alarm을 명시한다.

Semisync는 잠재적인 data-loss window를 줄이지만 consensus나 자동 failover를 제공하지 않는다. 적용 지연, promotion 후보의 GTID와 split-brain fencing을 별도로 설계한다.

## Read consistency를 계약한다

Replica read는 source보다 오래된 상태를 반환할 수 있다. 모든 `SELECT`를 자동으로 replica에 보내지 않고 freshness 요구로 분류한다.

- write 직후 사용자 확인은 primary에 고정한다.
- session stickiness로 최근 write가 있는 session을 일정 정책 동안 primary에 보낼 수 있다.
- 정확한 position이 필요하면 commit GTID/token을 전달하고 replica가 해당 position까지 적용했는지 확인한다.
- feed, 검색과 집계처럼 stale read를 허용하면 최대 lag와 UX를 계약한다.
- 한 logical transaction에서 primary와 replica를 섞어 동일 snapshot과 atomicity를 기대하지 않는다.

자세한 application routing은 [[Read-Replica-Routing|Read Replica 라우팅]]에서 다룬다. Cache를 write path에서 동시에 갱신하면 별도의 dual-write 실패가 생긴다. Outbox/CDC, invalidation과 rebuild 경로 없이 replication lag를 cache로 덮지 않는다.

## Lag 원인과 관찰

- long transaction과 큰 row event가 한 worker 또는 commit 순서를 오래 점유
- source write burst, network throughput과 relay log I/O 부족
- replica의 CPU, storage, lock contention과 DDL
- worker 병렬성을 활용할 수 없는 transaction dependency
- replica query가 apply와 자원을 경쟁

`SHOW REPLICA STATUS`, Performance Schema replication tables와 GTID set으로 receiver/applier 상태, last error와 queue를 본다. `Seconds_Behind_Source` 하나는 NULL, clock과 workload에 영향을 받으므로 relay log space, transaction queue, heartbeat와 end-to-end freshness를 함께 본다.

## Failover와 복구 원칙

1. promotion 전에 candidate가 필요한 GTID까지 적용했는지 확인한다.
2. old source를 fencing한 뒤 write endpoint를 전환한다.
3. client retry가 중복 transaction을 만들 수 있으므로 business idempotency를 둔다.
4. 다른 replica를 새 source에 재연결하고 data consistency를 검사한다.
5. replica는 source의 실수와 logical delete도 복제하므로 backup을 대체하지 않는다.

Replication 도입은 read scale만의 선택이 아니다. RPO/RTO, failover ownership, lag SLO, DDL과 backup 운영까지 함께 준비한다.

## 출처

- [MySQL 8.4 Reference Manual, Replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [MySQL 8.4 Reference Manual, Replication Threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)
- [MySQL 8.4 Reference Manual, Replication Formats](https://dev.mysql.com/doc/refman/8.4/en/replication-formats.html)
- [MySQL 8.4 Reference Manual, GTID Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids.html)
- [MySQL 8.4 Reference Manual, Semisynchronous Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html)
- [인프런, Hong, Replication과 Distribution](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338557)

## 관련 문서

- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[MySQL-Backup|MySQL 백업과 복구]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Sharding|Sharding]]
