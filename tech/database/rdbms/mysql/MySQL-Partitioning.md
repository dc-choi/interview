---
tags: [database, mysql, partitioning, partition-pruning]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Partitioning", "Partition Pruning", "RANGE 파티션"]
---

# MySQL Partitioning

Partitioning은 한 table의 row와 index를 같은 MySQL server 안의 여러 partition으로 나누는 기능이다. Query predicate를 partition expression에 매핑할 수 있으면 optimizer가 필요 없는 partition을 pruning한다. 보존 기간 단위의 drop, archive와 일부 범위 query에 유용하지만 자동 성능 향상이나 수평 확장 기능은 아니다.

## Sharding과의 차이

| 축 | Partitioning | Sharding |
|---|---|---|
| 배치 | 한 MySQL server의 한 table | 여러 server 또는 database |
| routing | optimizer가 partition 선택 | application 또는 middleware가 shard 선택 |
| 주된 목적 | pruning, lifecycle 관리 | storage와 traffic의 수평 분산 |
| 한계 | 단일 server 자원 한계 유지 | cross-shard query와 transaction 복잡성 |

## 방식 선택

| 방식 | 기준 | 대표 용도 |
|---|---|---|
| `RANGE` | 연속 값 구간 | 날짜, 순차 범위 |
| `RANGE COLUMNS` | column 값 구간, 다중 column 가능 | `DATE`, 문자열과 복합 범위 |
| `LIST` | 명시한 값 집합 | 고정 지역 또는 category |
| `HASH` | expression 결과를 partition 수에 매핑 | 범위 query보다 key 분산이 중요한 경우 |
| `KEY` | MySQL 내부 hashing | HASH 대안, 다중 column |

시간 기반 lifecycle에는 범위 경계와 보존 단위가 자연스럽게 맞는 `RANGE` 계열을 먼저 검토한다.

HASH가 균등 분포를 자동 보장하지는 않는다. Partition expression과 실제 key 분포, NULL/편향과 partition 수에 따라 hotspot과 크기 차이가 생길 수 있으므로 partition별 row/traffic을 측정한다.

```sql
CREATE TABLE orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  created_at DATE NOT NULL,
  customer_id BIGINT NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p2025 VALUES LESS THAN ('2026-01-01'),
  PARTITION p2026 VALUES LESS THAN ('2027-01-01'),
  PARTITION p_future VALUES LESS THAN (MAXVALUE)
);
```

## Partition pruning

Pruning은 table 크기가 아니라 predicate와 partition expression의 관계로 결정된다. `EXPLAIN`의 `partitions` column에서 실제 후보 partition을 확인한다.

```sql
EXPLAIN
SELECT id, customer_id
FROM orders
WHERE created_at >= '2026-06-01'
  AND created_at < '2026-07-01';
```

- partition key 조건이 없거나 optimizer가 경계를 계산할 수 없으면 여러 partition을 읽는다.
- function이 있다는 이유만으로 pruning이 항상 사라지는 것은 아니다. MySQL은 `YEAR()`, `TO_DAYS()`, `TO_SECONDS()`를 사용한 일부 `DATE`와 `DATETIME` partition expression도 pruning할 수 있다.
- query predicate와 partition expression의 형태가 맞는지 대표 query마다 `EXPLAIN`으로 확인한다.
- pruning 뒤에도 partition 내부 index가 필요하다. Partitioning은 index 설계를 대체하지 않는다.

## 운영 작업

| 목적 | 작업 |
|---|---|
| 미래 범위 준비 | `ADD PARTITION` 또는 `p_future`를 `REORGANIZE PARTITION` |
| 보존 기간 만료 | `DROP PARTITION` |
| 구조는 남기고 비우기 | `TRUNCATE PARTITION` |
| staging/archive table과 교환 | `EXCHANGE PARTITION` |

범위 partition 생성은 application 배포와 분리해 미리 자동화한다. `DROP PARTITION`은 row별 `DELETE`보다 lifecycle 정리에 유리할 수 있지만 데이터가 제거되는 DDL이므로 backup, metadata lock, replica 영향과 복구 절차를 검증한다. `EXCHANGE PARTITION`도 구조 호환성과 validation 비용을 대상 버전에서 확인한다.

## 중요한 제약

- 모든 `PRIMARY KEY`와 `UNIQUE` key는 partition expression에 사용된 모든 column을 포함해야 한다.
- Partitioned InnoDB table은 foreign key를 가지거나 다른 foreign key의 참조 대상이 될 수 없다.
- Index는 partition별로 유지된다. Pruning되지 않는 조건은 여러 local index를 탐색할 수 있다.
- 모든 partition은 같은 storage engine을 사용하며 한 server의 CPU, memory와 I/O를 공유한다.
- Partition key가 업무 identity에 억지로 들어가면 FK와 unique constraint 설계가 나빠질 수 있다.

## 도입 판단

다음 조건을 함께 만족할수록 가치가 크다.

1. 시간 또는 key 범위에 맞춰 대량 데이터를 반복적으로 보존, 삭제하거나 교환한다.
2. 핵심 query가 partition key를 자주 포함해 pruning할 수 있다.
3. composite PK와 unique key 제약, InnoDB FK 제한을 수용할 수 있다.
4. partition 생성, 누락 감지, pruning 회귀와 archive를 자동화할 수 있다.

단지 table이 크다는 이유만으로 도입하지 않는다. 먼저 query 의미, index와 통계를 고치고 대표 workload에서 scanned partitions, rows, latency와 운영 시간을 비교한다. 단일 server 용량을 넘어서는 문제가 목적이면 [[Sharding|sharding]]과 data lifecycle 분리를 검토한다.

## 출처

- [MySQL 8.4 Reference Manual, Partitioning Overview](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html)
- [MySQL 8.4 Reference Manual, Partition Pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- [MySQL 8.4 Reference Manual, Partitioning Keys and Unique Keys](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html)
- [MySQL 8.4 Reference Manual, Storage Engine Limitations](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-storage-engines.html)
- [MySQL 8.4 Reference Manual, RANGE and LIST Partition Management](https://dev.mysql.com/doc/refman/8.4/en/partitioning-management-range-list.html)
- [인프런, Real MySQL 시즌 1 - Part 2, 테이블 파티셔닝](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226587)
- [인프런, Hong, 파티셔닝과 인덱스 설계](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338546)
- [인프런, Hong, Partitioning과 Sharding](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338558)

## 관련 문서

- [[Sharding|샤딩]]
- [[Index|인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[MySQL-Architecture|MySQL 아키텍처]]
