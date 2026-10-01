---
tags: [database, rdbms, mysql, index, optimizer, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Advanced Index Access", "MySQL 고급 인덱스 접근"]
verified_at: 2026-09-30
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

문서는 역방향 스캔에는 성능 비용이 따르고 descending index를 정방향으로 스캔하는 편이 더 효율적이라고 설명한다. 자주 쓰는 DESC 정렬이 인덱스 방향과 반대라면 방향을 맞춘 인덱스를 검토한다([[Index-Composite-Design|복합 인덱스 설계]]). descending index는 InnoDB의 B-tree 인덱스에서만 쓸 수 있고, `GROUP BY` 없는 `MIN()`/`MAX()` 최적화에는 쓰이지 않는다.

### Optimizer hint

index와 join-order hint는 최후의 통제 수단이다. 문법상 허용되어도 서로 충돌하거나 적용할 수 없으면 무시될 수 있다. 통계, query shape, schema를 먼저 고치고 version과 데이터 분포가 바뀔 때마다 강제 계획을 재검증한다.

## ICP가 줄이는 범위

ICP는 선택된 secondary index의 entry를 읽은 뒤 조건을 검사하므로 index 탐색 구간 자체는 줄이지 않는다. 다른 index의 컬럼을 끌어와 검사하지도 못한다. virtual generated column의 secondary index 등 pushdown 제약을 확인한다. `Using index condition` 표시는 효과의 크기가 아니라 적용 신호이며 covering으로 base lookup을 제거한 계획과 비교한다.

## OR를 재작성할 때의 중복

Index Merge의 union은 row ID 순서가 맞는 입력을 병합하지만 sort_union은 ID들을 먼저 모아 정렬하므로 첫 행 반환도 지연될 수 있다. OR를 UNION으로 나누면 각 분기가 자기 접근 경로를 쓸 수 있지만 projection의 같은 값이 별개 행인지와 중복 제거 비용을 확인한다. AND에서 여러 단일 index를 교차하는 계획은 query에 맞는 복합 index와 비교하고, index 제거 전 OR의 병합 사용처도 조사한다.

## Skip 위치와 값 종류

Skip 대상은 맨 앞 컬럼만이 아니다. 상수 equality prefix 뒤의 빠진 key part를 distinct 값별로 순회하고 그 다음 range를 탐색할 수도 있다. 자료형보다 실제 distinct 수가 중요하며 시각이 날짜 단위로만 저장된 DATETIME과 초 단위로 퍼진 DATETIME은 비용이 다르다. SELECT에 index 밖 컬럼을 더하면 MySQL 8.4의 covering 요구를 벗어나 다른 계획으로 회귀할 수 있다.

## Hint를 바꿀 때

`USE INDEX`는 table scan을 허용하며 `INDEX` optimizer hint는 `FORCE INDEX`에 대응한다. 두 문법을 기계적으로 교체하지 않는다. 잘못 선택되는 한 index만 `NO_INDEX`로 제외하면 다른 경로의 비용 비교를 남길 수 있다. 자세한 강도 비교는 [[MySQL-Slow-Query-Diagnosis#Index hint의 강도]]를 따른다.

## MRR 스위치 오해

`mrr_cost_based=off`는 MRR 비활성화가 아니라 적용 가능하면 비용 비교 없이 사용하도록 하는 설정이다. 끄려면 `mrr=off`로 구분한다. row key 수집과 정렬에도 CPU, memory가 들므로 warm cache에서는 이득이 작거나 회귀할 수 있다. MySQL의 관련 buffer 기준은 `read_rnd_buffer_size`이며 실험 뒤 session 설정을 원복한다.

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
- [MySQL 8.4 Reference Manual, index hints](https://dev.mysql.com/doc/refman/8.4/en/index-hints.html)
- [인프런, ICP 2 - 도입](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471903)
- [인프런, ICP 적용 예제 - 실전 튜닝 2에 ICP 적용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471904)
- [인프런, 대용량 성능 실측](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471906)
- [인프런, 드라이빙 테이블은 누가 정하는가](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471934)
- [인프런, 옵티마이저 힌트](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471917)
- [인프런, 인덱스 머지 2 - 사용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471912)
- [인프런, 인덱스 스킵 스캔 - 소개](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471907)
- [인프런, 인덱스 스킵 스캔 - 적용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471908)
- [인프런, 인덱스를 만들었는데 왜 안 탈까](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471922)
- [인프런, 정리](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471909)
- [인프런, 정리](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471920)


## 관련 문서

- [[Index|인덱스]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
- [[Index-Composite-Design|복합 인덱스 설계]]
