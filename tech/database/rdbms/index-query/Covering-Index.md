---
tags: [database, rdbms, mysql, index, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["Covering Index", "커버링 인덱스"]
verified_at: 2026-08-04
---

# 커버링 인덱스 (Covering Index)

쿼리에 필요한 컬럼을 한 인덱스에서 모두 얻어 추가 base-row 조회를 피하는 접근이다. MySQL `EXPLAIN`의 `Extra`에 `Using index`가 표시되는 index-only access가 대표적이다.

커버링은 인덱스 페이지를 읽지 않는다는 뜻이 아니다. InnoDB secondary index로 조건을 찾은 뒤 clustered index를 다시 탐색하는 단계를 생략해 페이지 접근과 행 materialization을 줄이는 것이다.

## InnoDB에서 효과가 생기는 이유

InnoDB의 secondary index leaf에는 secondary key와 해당 행의 primary key가 들어 있다.

```text
일반 secondary lookup
secondary index 탐색 -> PK 획득 -> clustered index에서 전체 행 조회

covering lookup
secondary index 탐색 -> 필요한 값을 index leaf에서 반환
```

따라서 PK도 쿼리가 요구하는 컬럼으로 활용할 수 있다. 다만 prefix index는 잘린 값만 저장하므로 일반적으로 해당 컬럼 전체를 덮을 수 없다.

## 설계 예

```sql
CREATE INDEX idx_orders_status_created_user
    ON orders(status, created_at DESC, user_id);

SELECT user_id, created_at
FROM orders
WHERE status = 'PAID'
ORDER BY created_at DESC
LIMIT 100;
```

이 인덱스는 `status` 동등 조건 뒤의 `created_at` 순서를 활용하고, 반환할 `user_id`도 포함한다. 조건, 정렬, projection을 함께 만족하면 clustered row lookup과 추가 정렬을 모두 피할 수 있다.

컬럼을 단순히 `WHERE -> ORDER BY -> SELECT` 순서로 붙이는 공식은 없다. 다음을 함께 본다.

- 동등 조건과 범위 조건의 위치
- 실제 `ORDER BY` 방향과 leftmost prefix
- 반환할 컬럼과 예상 행 수
- 인덱스 폭, 변경 빈도와 쓰기 비용
- 기존 인덱스와의 중복 여부

## 커버링과 다른 최적화의 관계

| 최적화 | base row 조회 | 핵심 목적 |
|---|---|---|
| covering index | 피함 | 필요한 값을 index만으로 반환 |
| ICP | 필요할 수 있음 | secondary index에서 먼저 조건을 평가해 base row 조회를 줄임 |
| MRR | 수행함 | 여러 base row를 더 지역성 있게 읽도록 key를 모아 처리 |

InnoDB의 ICP는 clustered index에는 적용되지 않으며, covering query는 이미 전체 행 조회가 필요 없으므로 ICP와 같은 의미가 아니다. `Using index condition`과 `Using index`를 구분한다.

## 트레이드오프

- 넓은 인덱스는 buffer pool에 들어가는 leaf entry 수를 줄이고 저장 공간을 늘린다.
- INSERT, DELETE와 indexed column UPDATE마다 유지 비용이 추가된다.
- 긴 primary key는 모든 secondary index entry에 포함되어 비용을 증폭한다.
- 한 화면을 위해 만든 covering index가 다른 주요 쿼리의 정렬이나 필터에는 맞지 않을 수 있다.
- `Using index`만으로 빠르다고 단정할 수 없다. 넓은 범위를 끝까지 읽으면 여전히 비쌀 수 있다.

컬럼 개수에 보편적인 상한은 없다. 후보 인덱스별 크기와 쓰기 비용, `EXPLAIN ANALYZE`의 실제 rows, loops, 시간을 비교해 결정한다. 운영에서는 invisible index로 기존 인덱스 제거 영향을 시험할 수 있지만, invisible 상태에서도 인덱스 유지 비용과 uniqueness 검사는 남는다.

## 검증 체크리스트

1. 기존 인덱스로 조건과 정렬을 충족할 수 있는지 확인한다.
2. `EXPLAIN`에서 선택된 `key`, `key_len`, `rows`, `Extra`를 본다.
3. `EXPLAIN ANALYZE`로 예상 행과 실제 행, 반복 횟수를 비교한다.
4. cold/warm cache와 대표적인 데이터 분포에서 응답 시간과 rows examined를 측정한다.
5. 읽기 이득과 인덱스 크기, 쓰기 지연, 배포 비용을 함께 회귀 테스트한다.

## 출처

- [MySQL 8.4 Reference Manual, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL 8.4 Reference Manual, EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4 Reference Manual, Index Condition Pushdown](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)
- [인프런, 인덱스 심화, 커버링 인덱스](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471905)
- [인프런, 세컨더리 인덱스, 커버링 인덱스](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471891)

## 관련 문서

- [[Index|인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]
- [[Pagination-Optimization|페이징 성능 최적화]]
