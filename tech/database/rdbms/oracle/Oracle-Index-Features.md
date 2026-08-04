---
tags: [database, oracle, index, btree, bitmap, function-based-index]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle Index Features", "Oracle 인덱스 기능"]
---

# Oracle index 기능과 운영

인덱스는 schema object로 key와 row 위치 정보를 이용해 접근 경로를 제공한다. 생성 자체가 성능을 보장하지 않으며, 실제 predicate, 정렬, data 분포, DML 비용과 optimizer plan으로 판단한다.

## B-tree와 integrity

Oracle의 기본 normal index는 B-tree다. Heap table의 leaf entry는 일반적으로 key와 `ROWID`를 이용해 row를 찾지만 partitioned table, index-organized table 등에서는 세부 형태가 달라질 수 있다.

- Nonunique index는 중복 key를 허용한다.
- Unique index는 non-null key 조합의 중복을 막지만 business integrity는 `UNIQUE` 또는 `PRIMARY KEY` constraint로 표현한다.
- Constraint를 만들 때 Oracle이 unique/nonunique index를 생성하거나 기존 index를 사용할 수 있으므로 index와 constraint를 같은 개념으로 취급하지 않는다.
- Full table scan도 작은 table, 넓은 범위와 batch workload에는 올바른 plan일 수 있다.

## Composite index의 column 순서

`(customer_id, created_at)` index는 leading column과 정렬 순서에 따라 접근 가능한 query가 달라진다. 다음을 함께 본다.

1. Equality/range predicate 조합과 실제 query 비율
2. 선택도뿐 아니라 column 간 상관관계와 clustering factor
3. 필요한 `ORDER BY`, join과 covering 가능성
4. Oracle index skip scan이 non-leading column에 쓰일 가능성과 실제 비용

`WHERE` 절에 먼저 적은 column이 index 선두여야 한다는 규칙은 없다. SQL text 순서가 아니라 access predicate와 실행 계획이 기준이다.

## Function-based와 descending index

Function-based index는 column expression의 결과를 저장한다.

```sql
CREATE INDEX employees_email_ci_idx
ON employees (LOWER(email));
```

- Query expression과 optimizer가 사용할 수 있는 형태가 맞아야 한다.
- User-defined function은 `DETERMINISTIC`이어야 하며 반복 가능한 값을 반환해야 한다. 선언만으로 실제 결정성이 검증되는 것은 아니다.
- 생성 뒤 table과 index statistics를 수집해 optimizer가 비용을 비교할 수 있게 한다.

Oracle은 ascending index를 역방향으로도 scan할 수 있다. Descending index는 복합 정렬에서 방향이 섞이는 등 실제 plan이 이점을 보일 때 선택한다. Oracle은 descending index를 function-based index처럼 취급하므로 statistics도 필요하다.

## Bitmap index

Bitmap index는 distinct key별 rowid 집합을 bitmap으로 표현하고 bitmap 연산을 지원한다. 값 종류가 적다는 조건만으로 선택하지 않는다.

- 낮은 concurrent transaction과 큰 집계가 중심인 data warehouse에 적합하다.
- OLTP의 잦은 INSERT/UPDATE/DELETE에서는 넓은 locking과 동시성 비용이 커질 수 있다.
- DML이 있을 때 bitmap을 매번 전체 재생성한다는 설명은 정확하지 않다. Oracle이 index를 유지하지만 그 유지와 locking 비용이 문제다.

## 결과 순서와 최소/최대

Index range scan 결과가 우연히 정렬되어 보여도 SQL 결과 순서는 `ORDER BY` 없이는 보장되지 않는다. 최소/최대나 top-N query도 정렬 contract를 명시하고 execution plan으로 index 최적화 여부를 확인한다.

```sql
SELECT employee_id, salary
FROM employees
ORDER BY salary DESC, employee_id
FETCH FIRST 1 ROW ONLY;
```

Tie를 모두 반환해야 하는지 한 row만 필요한지를 먼저 정한다. 임의의 predicate와 `ROWNUM`으로 index 순서를 강제하지 않는다.

## Invisible index로 영향 시험

Invisible index는 DML로 계속 유지되지만 기본적으로 optimizer가 query plan에 사용하지 않는다. Session/system의 `OPTIMIZER_USE_INVISIBLE_INDEXES=TRUE`에서는 사용할 수 있다.

1. 제거 후보의 owner, constraint 관계와 consumer를 확인한다.
2. Index를 invisible로 만들고 representative workload의 plan, latency와 DB load를 관측한다.
3. Regression이 있으면 빠르게 visible로 되돌린다.
4. 충분한 관측 기간 뒤에만 drop을 검토한다.

Invisible은 저장/DML 비용을 없애지 않으므로 장기 방치 상태가 아니다.

## Rebuild는 정기 처방이 아니다

DML이 있었다는 사실만으로 index를 주기적으로 rebuild하지 않는다. Rebuild는 새 tree를 만들고 추가 공간, redo/undo, CPU와 I/O를 소비할 수 있다.

- `UNUSABLE` 복구, tablespace 이동, 명확한 space/structure 문제처럼 목적을 먼저 정의한다.
- `DBA_INDEXES`, `DBA_IND_COLUMNS`, `DBA_IND_EXPRESSIONS`, optimizer statistics와 plan을 확인한다.
- Usage 판단에는 version에 맞는 `DBA_INDEX_USAGE` 또는 monitoring view를 쓰되 observation window와 workload 대표성을 기록한다.
- Rebuild와 coalesce의 공간, availability와 online operation 제약을 비교한다.

강의의 `USER_INDEX`, `USER_COLUMNS`, `INDEX_STATE` 표기는 일반적인 현재 dictionary 이름이 아니다. Index metadata는 `USER_INDEXES`, `USER_IND_COLUMNS`, `USER_IND_EXPRESSIONS`를 확인하고, `INDEX_STATS`는 마지막 `ANALYZE INDEX ... VALIDATE STRUCTURE` 결과라는 범위를 이해한다.

## 출처

- [Oracle AI Database 26ai, CREATE INDEX](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CREATE-INDEX.html)
- [Oracle AI Database 26ai, Managing Indexes](https://docs.oracle.com/en/database/oracle/oracle-database/26/admin/managing-indexes.html)
- [Oracle AI Database 26ai, ALTER INDEX](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/ALTER-INDEX.html)
- 강의: [Index 이해](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5068), [종류와 주의사항](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5069), [활용 예](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5070)

## 관련 문서

- [[Index|Index design]]
- [[Execution-Plan|Execution plan]]
- [[Covering-Index|Covering index]]
- [[SQL-Tuning-Terminology|SQL tuning 용어]]
