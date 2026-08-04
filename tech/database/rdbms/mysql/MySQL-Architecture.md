---
tags: [database, rdbms, mysql, innodb, architecture]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["MySQL Architecture", "MySQL 엔진 구조"]
---

# MySQL 아키텍처와 InnoDB 저장 경로

MySQL은 연결과 SQL 의미를 다루는 server layer와 page, index, transaction, lock과 recovery를 다루는 storage engine layer를 handler interface로 분리한다. SQL의 모든 조건이 한 계층에서만 처리되는 것은 아니다. optimizer가 만든 access path와 pushdown 가능 여부에 따라 server와 InnoDB가 일을 나눠 가진다.

## 요청 경로

```text
client connection
  -> parser
  -> semantic and privilege checks
  -> optimizer
  -> executor
  -> handler API
  -> InnoDB pages, indexes, locks and logs
```

1. parser가 token과 syntax tree를 만든다.
2. 이름, type, object와 privilege를 검사하고 query block을 정리한다.
3. optimizer가 통계와 cost model로 join order, access method, index, sort와 materialization 후보를 비교한다.
4. executor가 iterator를 실행하며 storage engine의 row/index API를 호출하고 필요한 join, sort, aggregate와 expression을 처리한다.
5. InnoDB가 clustered/secondary index page를 읽고 쓰며 MVCC, row lock과 recovery 정보를 관리한다.

optimizer 계획은 추정치다. 통계가 오래됐거나 column 상관관계와 parameter별 skew가 반영되지 않으면 다른 계획이 더 빠를 수 있다. 곧바로 index hint를 고정하기보다 통계, query와 index를 먼저 점검하고 `EXPLAIN ANALYZE`로 추정과 실제를 비교한다.

## 조건 처리는 access path에 따라 달라진다

- index range condition은 읽을 index 구간 자체를 줄인다.
- Index Condition Pushdown은 secondary index entry에서 조건을 먼저 평가해 base row lookup을 줄일 수 있다.
- storage engine이 반환한 row에 남은 predicate는 server layer에서 평가한다.
- join, filesort와 internal temporary table도 plan에 따라 server iterator가 수행한다.

따라서 `WHERE는 storage engine`, `JOIN은 server`처럼 문법 절만으로 실행 위치를 고정하지 않는다. `EXPLAIN FORMAT=TREE`, `EXPLAIN ANALYZE`의 iterator와 `Extra`를 함께 읽는다.

## InnoDB page와 buffer pool

InnoDB table의 row는 clustered index leaf page에 저장되고 secondary index leaf에는 secondary key와 clustered key가 저장된다. 기본 page size는 16 KiB이며 `innodb_page_size`는 instance 초기화 전에 정한다. page size가 작거나 크다고 자동으로 빠른 것이 아니며 row 폭, I/O와 compression 제약이 달라진다.

Buffer pool은 data와 index page를 cache한다. 새 page가 필요하면 free page를 쓰거나 LRU 계열 정책으로 victim을 고른다. dirty page는 즉시 원래 tablespace에 쓰지 않아도 되고 background flushing과 checkpoint가 나중에 내보낸다. 세부 조정은 [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]에서 다룬다.

`INFORMATION_SCHEMA.INNODB_BUFFER_PAGE`는 page 단위 조사에 유용하지만 큰 buffer pool에서 상당한 overhead를 만들 수 있다. 일반 monitoring query로 반복하지 말고 test instance나 제한된 진단 상황에서 사용한다.

## 쓰기, WAL과 crash recovery

```text
row change
  -> buffer pool page becomes dirty
  -> redo record enters log buffer
  -> commit durability boundary
  -> background page flush and checkpoint
```

Redo log는 page 변경을 tablespace보다 먼저 내구성 경계에 기록하는 WAL이다. commit마다 data page 전체를 쓰지 않아도 crash 뒤 redo를 재적용해 일관된 상태로 전진할 수 있다. 실제 commit 내구성은 `innodb_flush_log_at_trx_commit`, binary log가 있으면 `sync_binlog`, OS와 storage 보장까지 함께 결정한다.

data page를 기록하다 server나 storage가 멈추면 page 일부만 기록된 torn page가 생길 수 있다. doublewrite buffer는 page를 안전한 중간 위치에 먼저 기록하고 최종 tablespace write가 불완전하면 recovery에 사용할 정상 copy를 제공한다. Redo는 변경 기록이고 doublewrite는 완전한 page copy이므로 서로 대체하지 않는다.

## Storage engine 선택

InnoDB는 MySQL 8.4의 기본 storage engine이며 transaction, MVCC, row-level locking, crash recovery와 foreign key를 제공한다. MEMORY, MyISAM, NDB 같은 다른 engine은 transaction, index와 durability 의미가 다르다. 과거에 특정 engine이 빠르다는 일반론으로 선택하지 말고 필요한 보장과 지원 버전을 확인한다.

View, stored routine과 event scheduler는 server object다. View의 갱신 가능성, security context와 materialization 대안은 [[Database-Views-and-Programmability|Database view와 programmability]]에서 다룬다.

## 진단 연결점

| 증상 | 먼저 볼 곳 |
|---|---|
| plan 추정과 실제 불일치 | `EXPLAIN ANALYZE`, optimizer statistics |
| page read와 eviction 증가 | buffer pool reads, working set, access pattern |
| write latency와 checkpoint 압박 | redo utilization, dirty pages, log waits와 I/O |
| lock wait | `performance_schema.data_locks`, `data_lock_waits`, transaction age |
| commit 뒤 replica 지연 | binlog 생성량, receiver/applier 상태와 lag |

## 출처

- [MySQL 8.4 Reference Manual, MySQL Architecture](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html)
- [MySQL 8.4 Reference Manual, InnoDB Architecture](https://dev.mysql.com/doc/refman/8.4/en/innodb-architecture.html)
- [MySQL 8.4 Reference Manual, InnoDB Page Size](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_page_size)
- [MySQL 8.4 Reference Manual, InnoDB Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)
- [MySQL 8.4 Reference Manual, Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 Reference Manual, Doublewrite Buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html)
- [인프런, Hong, 아키텍처와 스토리지 엔진](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338554)
- [인프런, Hong, Doublewrite Buffer](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=374544)

## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Index|Index]]
