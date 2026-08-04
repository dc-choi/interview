---
tags: [database, rdbms, mysql, innodb, transaction, batch, undo, purge]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Long Transaction", "MySQL 장기 트랜잭션과 배치"]
---

# MySQL 장기 트랜잭션과 배치

큰 작업을 한 트랜잭션에 넣으면 원자성은 넓어지지만 lock 보유 시간, undo와 redo, 실패 시 rollback 비용도 함께 커진다. 배치는 무조건 크게 묶는 작업이 아니라 재시작 가능한 작은 단위로 나누고 데이터베이스 상태에 맞춰 속도를 조절하는 작업이다.

## 오래 열린 트랜잭션이 만드는 비용

InnoDB는 변경 전 row version을 undo log에 남겨 MVCC consistent read를 제공한다. 어떤 read view가 과거 version을 필요로 하면 purge는 해당 undo를 제거할 수 없다. 따라서 오래 열린 트랜잭션은 직접 쓰기를 거의 하지 않아도 다음 비용을 만들 수 있다.

- history list와 undo tablespace가 커진다.
- secondary index에서 delete-marked record를 오래 따라가 읽기 비용이 늘 수 있다.
- 오래 보유한 row lock 때문에 lock wait와 deadlock 가능성이 커진다.
- 장애나 명시적 rollback 때 되돌릴 작업이 커진다.

`autocommit=0` 상태에서 consistent read를 실행한 뒤 `COMMIT`이나 `ROLLBACK`을 잊는 경우도 위험하다. 세션이 idle인지보다 필요한 read view와 transaction이 열려 있는지를 확인한다.

## 관찰 지점

```sql
SELECT trx_id, trx_state, trx_started,
       trx_mysql_thread_id, trx_rows_locked, trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;

SHOW ENGINE INNODB STATUS;
```

- `INNODB_TRX`에서 시작 시각, 상태, lock 수와 실행 중 query를 본다.
- InnoDB status의 `History list length` 추세로 purge lag를 본다.
- lock wait, undo/redo 양, buffer pool miss, replica lag와 batch latency를 함께 본다.
- 오래된 transaction을 종료하기 전에는 소유 요청과 rollback 영향을 확인한다.

## 재시작 가능한 keyset batch

`OFFSET`을 계속 늘리는 대신 안정적인 key로 다음 구간을 선택한다.

```sql
SELECT id
FROM audit_log
WHERE id > :last_id
  AND created_at < :cutoff
ORDER BY id
LIMIT :batch_size;
```

선택한 ID 집합만 짧은 transaction에서 변경하고 commit한다. 성공한 마지막 key와 영향 행 수를 durable checkpoint로 남기면 중단 뒤 이어서 실행할 수 있다. 대상 조건이 바뀔 수 있다면 작업 snapshot, 상태 column 또는 별도 작업 table로 처리 대상을 고정한다.

Batch 크기는 고정된 정답이 없다. 다음 신호를 기준으로 조정한다.

- lock wait와 요청 경로의 tail latency가 오르면 줄인다.
- redo, binlog와 replica lag가 누적되면 속도를 제한한다.
- 처리량이 낮고 여유가 충분하면 점진적으로 늘린다.
- deadlock과 transient failure는 같은 checkpoint에서 횟수 제한과 backoff를 두고 재시도한다.

## 안전한 실행 규칙

1. 검색 조건과 `ORDER BY`를 지원하는 index를 준비한다.
2. batch마다 commit하고 transaction 안에서는 외부 API나 파일 I/O를 기다리지 않는다.
3. job을 여러 worker로 나누면 key range ownership 또는 `SKIP LOCKED` 같은 claim 규칙을 명시한다.
4. `SKIP LOCKED` 결과는 일관된 snapshot이 아니므로 누락을 최종 재검사한다.
5. DDL, 대량 delete와 archive는 partition 교체나 drop 같은 구조적 대안도 비교한다.
6. 종료 조건, 최대 실행 시간, pause 조건과 rollback 계획을 운영 문서에 둔다.

TypeORM에서는 transaction callback의 manager 또는 하나의 `QueryRunner`만 사용하고 batch 사이에는 transaction을 끝낸다. job 전체를 하나의 callback으로 감싸면 chunk를 나눈 의미가 사라진다.

## 성능 검증용 데이터 생성

작은 fixture로 얻은 plan과 lock 경합은 운영 분포를 대표하지 않을 수 있다. 성능 검증 데이터는 production PII를 복사하지 않고 synthetic하게 생성하되 row 수뿐 아니라 key 분포, NULL 비율, 관계 cardinality, row 폭과 hot key를 재현한다.

- seed와 generator version을 남겨 실패를 재현하고 변경 전후 같은 dataset을 비교한다.
- row-by-row stored procedure loop, multi-row insert, `LOAD DATA`를 후보로 두고 생성 시간과 source 부하를 측정한다.
- 고정 건수마다 commit하는 값을 관행으로 복사하지 않는다. redo, binlog, lock 시간과 재시도 비용으로 chunk를 정한다.
- generator의 password나 token 값은 테스트 placeholder다. production 인증 구현으로 복사하지 않는다.
- 생성 전 예상 용량, 최대 실행 시간과 중단 조건을 두고 전용 schema, 명시적 cleanup과 backup 제외 정책을 사용한다.

## 출처

- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual, Purge Configuration](https://dev.mysql.com/doc/refman/8.4/en/innodb-purge-configuration.html)
- [MySQL 8.4 Reference Manual, INFORMATION_SCHEMA INNODB_TRX](https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-trx-table.html)
- [인프런, Real MySQL 시즌 1 - Part 2, DBMS 활용과 배치 처리 주의사항](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226588)
- [인프런, Hong, Mock 데이터 생성 프로시저 1](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338638)
- [인프런, Hong, Mock 데이터 생성 프로시저 2](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338639)

## 관련 문서

- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[MySQL-Partitioning|MySQL Partitioning]]
