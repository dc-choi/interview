---
tags: [database, rdbms, mysql, innodb, architecture]
status: done
verified_at: 2026-09-30
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

### Page, extent와 segment

page는 InnoDB의 기본 I/O 단위라 한 행만 읽어도 그 page 전체를 buffer pool에 올린다. page header에는 page 번호와 타입, 같은 level의 이전과 다음 page 번호, 마지막 변경 LSN이 있다. B-tree의 같은 level page는 이 포인터로 정렬 순서의 이중 연결 리스트를 이루고, LSN은 crash recovery에서 redo 재적용 여부를 가른다([[MySQL-InnoDB-Redo-and-Crash-Recovery#Page를 쓰기 전의 WAL 규칙|WAL 규칙]]). 필드의 바이트 배치는 소스 수준의 구현이라 외우지 않는다.

- extent는 연속한 page 묶음이다. page가 16KB 이하면 1MB(16KB page 64개, 8KB page 128개, 4KB page 256개), 32KB면 2MB, 64KB면 4MB다.
- 인덱스마다 segment를 두 개 둔다. 하나는 non-leaf, 하나는 실제 데이터가 있는 leaf용이라 leaf를 디스크에 연속으로 모아 순차 I/O를 돕는다. segment가 커질 때 처음 32 page는 한 page씩, 그 뒤로는 extent 단위로 할당하고 큰 segment에는 한 번에 최대 4 extent를 붙인다.
- 삭제한 행은 rollback과 consistent read에 더는 필요 없을 때 purge가 물리적으로 지운다. 비워진 공간은 page/extent 상태와 tablespace에 따라 재사용된다. DELETE만으로 filesystem에 공간이 반환된다고 보장하지 않는다. file-per-table의 DROP/TRUNCATE와 공유 tablespace의 내부 재사용을 구분한다.
- 행 삭제만으로는 파일 크기가 줄지 않는다. file-per-table tablespace는 `TRUNCATE`나 `DROP` 때 OS에 공간을 돌려주고, 대량 삭제 뒤 파일을 줄이려면 `ALTER TABLE ... FORCE`로 매핑되는 `OPTIMIZE TABLE`로 재구성한다. system tablespace 같은 공유 tablespace 파일은 `TRUNCATE`나 `DROP` 뒤에도 줄지 않는다. 무작위 PK 삽입이 leaf 연속성을 깨는 과정은 [[B-Tree-Index-Depth#페이지 분할과 병합|페이지 분할과 병합]]에 있다.

## 쓰기, WAL과 crash recovery

```text
row change
  -> buffer pool page becomes dirty
  -> redo record enters log buffer
  -> commit durability boundary
  -> background page flush and checkpoint
```

Redo log는 page 변경을 tablespace보다 먼저 내구성 경계에 기록하는 WAL이다. 일반 InnoDB crash recovery는 redo로 page를 전진시킨 뒤 영속화된 transaction state와 undo로 미완료 transaction을 rollback한다. Binary log가 켜진 경우 prepare된 transaction의 outcome은 server가 internal 2PC로 별도 조정하며, redo 자체는 binlog 조정이나 PITR을 제공하지 않는다. 실제 commit 내구성은 `innodb_flush_log_at_trx_commit`, binary log가 있으면 `sync_binlog`, OS와 storage 보장까지 함께 결정한다.

data page를 기록하다 server나 storage가 멈추면 page 일부만 기록된 torn page가 생길 수 있다. `innodb_doublewrite=ON` 또는 `DETECT_AND_RECOVER`이면 doublewrite buffer가 page를 안전한 중간 위치에 먼저 기록하고 최종 tablespace write가 불완전할 때 recovery에 사용할 정상 copy를 제공한다. `DETECT_ONLY`는 torn page를 탐지하지만 복구할 page copy는 보관하지 않고, `OFF`는 doublewrite를 비활성화한다. Redo는 변경 기록이고 doublewrite는 완전한 page copy이므로 서로 대체하지 않는다.

Undo, redo, checkpoint, doublewrite와 binary log 2단계 commit의 정확한 책임 경계는 [[MySQL-InnoDB-MVCC-and-Undo|InnoDB MVCC와 Undo]], [[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB Redo와 Crash Recovery]]에서 이어서 다룬다.

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

## Tablespace까지 이어지는 저장 계층

Page와 extent, 인덱스의 두 segment는 tablespace 안에 배치된다. 기본 file-per-table 환경은 테이블별 `.ibd`에 데이터와 인덱스를 담지만 system/general tablespace에는 여러 객체가 공간을 공유할 수 있다. extent가 연속 page를 할당하는 단위라는 사실은 전체 테이블의 물리적 연속 배치를 보장하지 않는다. PK 단건 조회도 B-tree의 root와 중간, leaf page를 탐색하며 버퍼 풀에 있는 page는 디스크 읽기를 생략한다.

## 출처

- [MySQL 8.4 Reference Manual, MySQL Architecture](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html)
- [MySQL 8.4 Reference Manual, InnoDB Architecture](https://dev.mysql.com/doc/refman/8.4/en/innodb-architecture.html)
- [MySQL 8.4 Reference Manual, InnoDB Page Size](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_page_size)
- [MySQL 8.4 Reference Manual, InnoDB Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)
- [MySQL 8.4 Reference Manual, File Space Management](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-space.html)
- [MySQL 8.4 Reference Manual, File-Per-Table Tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html)
- [MySQL 8.4 Reference Manual, OPTIMIZE TABLE](https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html)
- [MySQL 8.4 Reference Manual, Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)
- [MySQL 8.4 Reference Manual, Doublewrite Buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html)
- [MySQL 8.4 Reference Manual, InnoDB Recovery](https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html)
- [MySQL 8.4 Reference Manual, Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)
- [인프런, Hong, 아키텍처와 스토리지 엔진](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338554)
- [인프런, Hong, Doublewrite Buffer](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=374544)
- [인프런, Hong, MySQL Storage Architecture InnoDB Page](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373904)
- [인프런, InnoDB 아키텍처](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471853)
- [인프런, 데이터 저장 구조](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471854)
- [인프런, 정리 (데이터베이스 성능과 MySQL 아키텍처 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471856)
- [인프런, 쿼리 실행 흐름](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471855)


## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]
- [[MySQL-InnoDB-Internals|MySQL 8.4 InnoDB 내부 구조]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Index|Index]]
