---
tags: [database, rdbms, mysql, replication, binlog, consistency]
status: done
verified_at: 2026-10-14
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
- applier는 relay log transaction을 적용한다. MySQL 8.4의 `replica_parallel_workers` 기본값은 4라서 coordinator가 독립 transaction을 여러 worker에 나눠 병렬로 적용한다. 1이면 coordinator와 worker 하나로 순서대로 적용하고, 0은 deprecated다.
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

Lag는 receiver가 source의 binlog를 받아 오는 구간과 applier가 relay log를 적용하는 구간 중 어디서 생겼는지부터 가른다. 두 구간은 원인과 대응이 다르다.

| 밀린 쪽 | 주요 원인 | 대응 예 |
|---|---|---|
| receiver | network 대역폭과 거리, source의 CPU와 binlog I/O(연결된 replica마다 dump thread가 하나씩 생긴다), BLOB/TEXT가 큰 row event | source 이상의 replica 사양과 network 용량, `binlog_transaction_compression`(양쪽 CPU 사용 증가), 연결 replica 수 조정 |
| applier | 한 transaction에 몰린 대량 변경, 키 없는 테이블, 병렬 적용을 막는 dependency, DDL, replica의 CPU와 I/O 부족, replica 조회와의 자원 경쟁 | 작은 transaction으로 분할, PK 추가, 병렬 적용 설정 확인, online schema change, 분석 조회 전용 replica 분리 |

`SHOW REPLICA STATUS`, Performance Schema replication tables와 GTID set으로 receiver/applier 상태, last error와 queue를 본다. `Seconds_Behind_Source`는 applier가 처리 중인 event가 source에 기록된 시각과 replica 현재 시각의 차이라서, 사실상 applier가 receiver보다 얼마나 늦었는지를 잰다. network가 느리면 receiver가 source보다 크게 뒤처져도 0으로 보일 수 있다. applier가 멈추면 NULL이 되고 NTP 같은 clock 변화에도 흔들리므로 relay log space, transaction queue, heartbeat와 end-to-end freshness를 함께 본다.

### 밀린 쪽을 binlog 좌표로 가린다

| 지점 | 확인 | 의미 |
|---|---|---|
| source가 쓰는 위치 | source의 `SHOW BINARY LOG STATUS`(8.2 이상)의 `File`, `Position`. 8.0 계열 source는 `SHOW MASTER STATUS`를 쓴다 | `SHOW MASTER STATUS`는 8.2에서 deprecated되고 8.4에서 제거됐다 |
| receiver가 읽은 위치 | replica의 `Source_Log_File`, `Read_Source_Log_Pos` | relay log로 받아 둔 source binlog 위치 |
| applier가 실행한 위치 | replica의 `Relay_Source_Log_File`, `Exec_Source_Log_Pos` | 적용을 마친 source binlog 위치. 실행 순서에 빈틈이 있으면 그 앞의 transaction만 commit이 보장되는 하한값이 된다 |

source와 receiver의 차이가 크면 receiver, receiver와 applier의 차이가 크면 applier가 병목이다. 둘 다 멀면 receiver부터 본다. replica만 볼 수 있으면 1~2분 간격으로 `SHOW REPLICA STATUS`를 두 번 실행한다. `Read_Source_Log_Pos`는 늘었는데 `Exec_Source_Log_Pos`가 멈췄거나 훨씬 느리게 늘면 applier 병목이다. 둘 다 멈춘 채 lag 값만 커지면 AWS 가이드는 receiver를 의심하라고 한다. 다만 source 쓰기가 멈춘 상태에서 applier가 큰 transaction, lock이나 PK 없는 테이블 탐색에 묶여도 같은 모습이 나오므로, 설정을 바꾸기 전에 source 좌표와 비교해 확인한다.

ROW format에서 source가 오래 실행했지만 실제로 바꾼 행은 적은 DML은 lag 값을 잠깐 크게 띄웠다가 곧 0 근처로 돌린다. 이런 spike를 지속적인 적용 부족과 구분한다. source에서 lock을 기다리거나 열린 채 쉬는 transaction은 commit 전까지 binlog에 기록되지 않으므로 그 자체로는 lag를 만들지 않는다. lag를 만드는 것은 commit된 쓰기량이다. 다만 replica는 lag를 source의 transaction 시작 시각 기준으로 계산하므로, 이런 transaction이 commit된 뒤 적용될 때 lag 값이 잠깐 튈 수 있다. 이것도 앞의 spike와 같이 해석한다.

### Applier가 밀리는 대표 원인

- **큰 transaction**: 병렬 적용은 독립 transaction 사이에서만 일어나고 한 transaction을 나누지 못한다. 대량 UPDATE나 DELETE는 worker 하나가 처리하므로 작은 transaction으로 나눠야 replica가 병렬로 따라온다.
- **키 없는 테이블**: ROW format의 UPDATE와 DELETE를 적용하려면 replica가 대상 행을 찾아야 한다. MySQL 8.4는 PK나 모든 column이 NOT NULL인 unique index가 있으면 그 index로 행마다 찾는다. 없으면 row event의 행을 hash table에 담고 대상 테이블의 모든 record를 순회하며, 쓸 수 있는 index가 하나도 없으면 이 순회가 full table scan이다. 큰 테이블에서는 worker 하나가 오래 묶이고, writeset으로 dependency를 계산하지 못해 병렬 적용도 제한된다. 8.4에서는 이 검색 방식을 설정으로 바꿀 수 없으므로 복제 대상 테이블에 PK를 둔다.
- **dependency 정보**: MySQL 8.4 source는 multithreaded replica가 있으면 항상 writeset으로 dependency를 기록한다. 8.0에서 `binlog_transaction_dependency_tracking=COMMIT_ORDER`를 쓰면 동시 commit이 적은 workload의 transaction 대부분이 순서대로 적용될 수 있다. worker를 늘리기 전에 worker별 처리 분포와 coordinator 대기 통계로 dependency 문제인지 worker 부족인지 가른다.

## 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례: 쓰기 중심 워크로드에서 조회를 replica로 분리

쓰기와 조회가 같은 인스턴스의 CPU와 I/O를 경쟁해 지연이 커진 서비스에서 Read Replica로 조회를 분리하는 가설을 검증했다.

- 옮긴 대상은 stale read를 허용할 수 있는 조회로 한정했다. 동시성이 중요한 로직의 읽기는 primary에 남겼다.
- ReplicaLag는 CloudWatch와 Grafana 대시보드로 상시 관찰했다. ORM 레벨에서 lag를 감지해 라우팅을 되돌리는 방식은 제어 범위가 좁아, lag가 커지면 인스턴스 스케일업 같은 인프라 차원으로 대응하도록 정리했다.

주요 조회의 지연과 primary 부하는 개선됐지만, 앱이 lag를 자동으로 흡수하지 못하는 한계도 남았다. 어떤 조회가 replica로 가는지와 허용 가능한 지연을 위의 read consistency 계약으로 함께 남겨야 한다. 실제 효과는 쓰기, 읽기 분포와 replica 상태에 따라 달라져 계속 관찰해야 한다.

## Failover와 복구 원칙

1. promotion 전에 candidate가 필요한 GTID까지 적용했는지 확인한다.
2. old source를 fencing한 뒤 write endpoint를 전환한다.
3. client retry가 중복 transaction을 만들 수 있으므로 business idempotency를 둔다.
4. 다른 replica를 새 source에 재연결하고 data consistency를 검사한다.
5. replica는 source의 실수와 logical delete도 복제하므로 backup을 대체하지 않는다.

Replication 도입은 read scale만의 선택이 아니다. RPO/RTO, failover ownership, lag SLO, DDL과 backup 운영까지 함께 준비한다.

## Format과 격리 수준

MySQL 8.4의 binlog_format 기본값은 ROW다. statement 기록은 비결정성뿐 아니라 READ COMMITTED/READ UNCOMMITTED와의 지원 조건도 확인한다. InnoDB에서 이 수준들은 row-based logging을 요구한다. MIXED가 보편 기본이라는 과거 설명을 현재 서버에 적용하지 않는다. 설정은 실제 global/session 값과 CDC 요구를 함께 확인한다.

## 오래 멈춘 replica를 복구할 때

Replica가 필요한 transaction의 binlog가 source에 남아 있는지 GTID set과 purge 상태를 먼저 확인한다. 남아 있으면 catch-up의 적용 시간과 snapshot 복사/복원 시간을 비교한다. 필요한 로그가 없어 정상 재생을 못 하면 일관된 snapshot과 정확한 GTID/position으로 재시드한다. 기다린 날짜만으로 선택하지 말고 적체 bytes, apply 처리량과 RTO를 기준으로 정한다.

## 역할 이름과 복제가 나누는 부하

쓰기를 받는 서버는 primary, master, leader, source로, 사본을 유지하는 서버는 secondary, slave, replica, follower로 부른다. MySQL은 source와 replica로 용어를 바꿨고 8.4에서 `CHANGE MASTER TO`, `START SLAVE`, `SHOW SLAVE STATUS` 같은 옛 문법을 제거했다. 각각 `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`를 쓰므로 8.4로 올리기 전에 운영 스크립트와 모니터링 쿼리의 옛 문법을 바꾼다.

복제는 읽기를 나누고 장애 때 승격할 후보를 남기지만 쓰기를 나누지는 않는다. 모든 replica가 source의 쓰기를 그대로 다시 적용하므로 쓰기 처리량의 한계는 source 한 대에 남는다. 쓰기 확장이 목적이면 [[Sharding|sharding]]을 검토한다.

## 복제 구조의 경계

이 문서의 MySQL source-replica는 leader-follower 구조다. Leaderless 저장소는 quorum, 충돌 해소와 read repair 같은 별도 일관성 계약을 가진다. 읽기/쓰기 node가 여러 개라는 사실만으로 자동 failover나 강한 일관성을 얻지 않는다. shard별 replica가 있어도 shard routing과 leader fencing은 별도 책임이다.

## 출처

- [MySQL 8.4 Reference Manual, Replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [MySQL 8.4 Reference Manual, Replication Threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)
- [MySQL 8.4 Reference Manual, Replication Formats](https://dev.mysql.com/doc/refman/8.4/en/replication-formats.html)
- [MySQL 8.4 Reference Manual, GTID Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids.html)
- [MySQL 8.4 Reference Manual, Semisynchronous Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html)
- [인프런, Hong, Replication과 Distribution](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338557)
- [MySQL 8.4 Reference Manual, innodb transaction isolation levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, replication gtids auto positioning](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html)
- [인프런, DB 핵심 개념 (확장성/일관성/가용성)](https://www.inflearn.com/courses/lecture?courseId=335130&unitId=278149)
- [인프런, MySQL Transaction Deep Dive [ LifeCycle, Autocommit, Statement vs Row based ]](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373900)
- [인프런, MySql 파헤치기 - 어려운 부분만 부분 쉽게 설명해 줄게요](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178850)
- [MySQL 8.4 Reference Manual, What Is New in MySQL 8.4 since MySQL 8.0](https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html)
- [YouTube, 쉬운코드, DB 파티셔닝, 샤딩, 레플리케이션](https://www.youtube.com/watch?v=P7LqaEO-nGU)
- [YouTube, 쉬운코드, NoSQL과 RDB의 차이, MongoDB와 Redis 예제](https://www.youtube.com/watch?v=sqVByJ5tbNA)
- [MySQL 8.4 Reference Manual, SHOW REPLICA STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [MySQL 8.4 Reference Manual, SHOW BINARY LOG STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html)
- [Changes in MySQL 8.2.0 — MySQL Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.2/en/news-8-2-0.html)
- [MySQL 8.4 Reference Manual, Replication and Row Searches](https://dev.mysql.com/doc/refman/8.4/en/replication-features-row-searches.html)
- [MySQL 8.4 Reference Manual, Replica Server Options and Variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [Amazon Aurora User Guide, Troubleshooting binary log replication lag for Aurora MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-troubleshooting-replication-lag.html)
- [How do I troubleshoot high replica lag with Amazon RDS for MySQL? — Amazon Web Services (YouTube)](https://www.youtube.com/watch?v=XG4UYKS611k)


## 관련 문서

- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[RDS-Monitoring-Metrics|RDS 지표와 알람 (ReplicaLag 해석)]]
- [[MySQL-Backup|MySQL 백업과 복구]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Sharding|Sharding]]
