---
tags: [database, rdbms, mysql, index, optimizer, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Advanced Index Access", "MySQL 고급 인덱스 접근"]
verified_at: 2026-08-04
---

# MySQL 고급 인덱스 접근

MySQL 8.4는 단일 B-tree range scan 외에도 조건을 index 단계에서 거르거나 여러 탐색 결과를 결합하는 접근을 비용 기반으로 선택한다. 각 기능은 후보 계획일 뿐이며 `EXPLAIN`과 실제 실행 통계로 선택 여부와 효과를 확인한다.

## 접근 방식 한눈에 보기

| 방식 | 해결하려는 비용 | 대표 `EXPLAIN` 신호 |
|---|---|---|
| ICP | base row를 읽기 전 index entry에서 조건 평가 | `Using index condition` |
| skip scan | 복합 인덱스의 선행 key가 조건에 없을 때 distinct prefix별 range 탐색 | `Using index for skip scan` |
| Index Merge | 한 테이블의 여러 range scan 결과를 교집합 또는 합집합으로 결합 | `type=index_merge` |
| MRR | secondary index가 찾은 row key를 모아 base row 읽기의 지역성 개선 | `Using MRR` |
| covering | base row lookup 자체를 생략 | `Using index` |

## Index Condition Pushdown (ICP)

ICP가 없으면 storage engine이 index range의 base row를 읽은 뒤 server가 남은 `WHERE` 조건을 검사한다. ICP는 index column만으로 평가 가능한 조건을 storage engine으로 내려 보내, 조건에 실패한 entry의 base row 조회를 피한다.

- `range`, `ref`, `eq_ref`, `ref_or_null` 접근에서 후보가 된다.
- InnoDB에서는 secondary index에만 적용된다. clustered index에는 이미 전체 row가 있어 I/O 감소 효과가 없기 때문이다.
- subquery, stored function처럼 storage engine이 평가할 수 없는 조건은 내려보내지 못한다.
- covering index와 다르다. ICP 뒤에도 통과한 행의 base row가 필요할 수 있다.

## Skip Scan

인덱스 `(role, height)`에서 `height >= 180`만 검색할 때 옵티마이저가 `role`의 distinct 값을 순회하며 각 prefix에 대한 range scan을 수행할 수 있다. 선행 컬럼의 distinct 수가 작고 비용이 유리할 때만 선택된다.

MySQL 8.4의 skip scan은 single-table query, covering index, 지원되는 key-part 조건 등 제약이 있다. `GROUP BY`나 `DISTINCT`가 있는 쿼리에는 적용되지 않는다. 선행 컬럼을 생략해도 항상 인덱스를 탄다는 일반 규칙으로 사용하지 않는다.

## Index Merge

Index Merge는 한 테이블의 여러 index range 결과를 결합한다.

- `intersection`: 여러 조건을 모두 만족하는 row key
- `union`: 여러 조건 중 하나를 만족하는 row key
- `sort_union`: 먼저 row key를 모아 정렬한 뒤 합집합

복잡한 `AND`와 `OR`에서는 식의 형태가 후보 계획에 영향을 준다. 여러 단일 인덱스를 기대하기보다 실제 복합 인덱스가 필터, 정렬과 covering을 더 잘 지원하는지도 비교한다.

## Multi-Range Read (MRR)

non-covering secondary scan은 index 순서와 clustered row 순서가 달라 흩어진 base page를 반복해 읽을 수 있다. MRR은 row key를 buffer에 모으고 primary-key 순서로 처리해 무작위 접근을 줄인다.

- covering query에는 base row 조회가 없어 MRR의 이점도 없다.
- 기본 optimizer switch는 `mrr=on`, `mrr_cost_based=on`이며 비용상 유리할 때만 선택된다.
- join에서 Batched Key Access와 함께 쓸 수 있지만 BKA는 MySQL 8.4 기본 활성 기능이 아니다.

## 운영용 index 기능

### Invisible index

invisible index는 기본적으로 optimizer 후보에서 제외되지만 계속 갱신되고 uniqueness도 검사된다. 명시적 또는 암묵적 primary key는 invisible로 만들 수 없다. 제거 전 read-plan 영향을 되돌릴 수 있게 시험하는 수단이지 쓰기 비용 제거 수단은 아니다.

### Descending index

MySQL 8.4는 key part별 `ASC`와 `DESC`를 저장해 혼합 방향 정렬을 지원한다. 동일 방향 정렬은 기존 ascending index의 forward/backward scan으로도 처리할 수 있지만, `(a DESC, b ASC)` 같은 순서에는 방향이 맞는 인덱스가 필요할 수 있다. `Backward index scan`과 TREE 형식의 reverse scan 표시를 확인한다.

### Optimizer hint

index와 join-order hint는 최후의 통제 수단이다. 문법상 허용되어도 서로 충돌하거나 적용할 수 없으면 무시될 수 있다. 통계, query shape, schema를 먼저 고치고 version과 데이터 분포가 바뀔 때마다 강제 계획을 재검증한다.

## 출처

- [MySQL 8.4, Index Condition Pushdown](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)
- [MySQL 8.4, Range Optimization](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4, Index Merge Optimization](https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html)
- [MySQL 8.4, Multi-Range Read Optimization](https://dev.mysql.com/doc/refman/8.4/en/mrr-optimization.html)
- [MySQL 8.4, Invisible Indexes](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html)
- [MySQL 8.4, Descending Indexes](https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html)
- [MySQL 8.4, Optimizer Hints](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html)
- [인프런, ICP 소개](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471902)
- [인프런, 인덱스 머지](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471911)
- [인프런, MRR](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471913)
- [인프런, 인덱스 숨기기](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471915)

## 관련 문서

- [[Index|인덱스]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
