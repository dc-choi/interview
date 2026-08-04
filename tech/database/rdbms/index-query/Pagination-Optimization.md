---
tags: [database, rdbms, mysql, pagination, performance, cursor]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["Pagination Optimization", "페이징 성능 개선", "No Offset", "Cursor Pagination"]
---

# 페이징 성능 최적화

페이징은 결과를 작게 전송하는 문제이자 다음 시작점을 찾는 문제다. `LIMIT`만 붙인다고 읽기 비용까지 작아지지 않는다. 사용자 경험, 정렬 안정성, 동시 변경 의미와 정확한 전체 건수의 필요성을 먼저 정한다.

## OFFSET 비용

```sql
SELECT id, title, created_at
FROM articles
WHERE category_id = :category_id
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 100000;
```

MySQL은 반환할 20행만 보내더라도 앞의 후보를 찾아 정렬하고 100,000행을 건너뛰어야 할 수 있다. 정렬과 필터를 지원하는 인덱스가 있으면 filesort를 줄일 수 있지만 깊은 OFFSET에서 앞 행을 버리는 비용 자체는 남는다.

OFFSET이 항상 금지되는 것은 아니다. 데이터가 작고 임의 페이지 이동이 필요하거나 깊은 페이지를 거의 요청하지 않는 관리 화면에는 가장 단순한 계약일 수 있다. 실제 p95와 examined rows로 전환 시점을 정한다.

## Keyset 또는 cursor 페이징

마지막으로 본 정렬 키 다음부터 범위 탐색한다.

```sql
SELECT id, title, created_at
FROM articles
WHERE category_id = :category_id
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

- `(category_id, created_at DESC, id DESC)` 인덱스가 조건과 순서를 함께 지원한다.
- 21번째 행은 다음 페이지 존재 여부만 판단하고 응답에서는 제거한다. 전체 COUNT가 필요 없다.
- `created_at`이 중복될 수 있으므로 고유한 `id`까지 cursor와 정렬에 넣는다.
- cursor는 정렬 값, 방향과 필터 identity를 서버가 검증할 수 있게 서명하거나 opaque token으로 만든다.

장점은 깊이에 비례한 skip을 피하고 더 보기, 무한 스크롤과 잘 맞는다는 점이다. 임의 페이지로 바로 이동하기 어렵고 정렬 조건이 자주 바뀌는 검색에는 cursor 계약이 복잡해진다.

## 동시 변경의 의미

keyset도 자동으로 snapshot을 제공하지 않는다. 페이지 사이에 새 행이 삽입되거나 정렬 값이 바뀌면 사용자가 보는 집합이 달라질 수 있다.

- feed처럼 새 항목 유입을 허용할지, 최초 조회의 상한 시각을 cursor에 고정할지 정한다.
- mutable 정렬 컬럼은 중복과 누락 가능성을 문서화하거나 변경되지 않는 보조 키를 사용한다.
- 전체 탐색을 한 시점으로 고정해야 하는 batch는 짧은 API 트랜잭션을 오래 유지하기보다 PK 범위, watermark나 별도 snapshot을 검토한다.

## 범위 기반 batch

날짜 또는 PK 범위를 업무 단위로 나눌 수 있으면 페이지 크기 기반 cursor와 별도로 범위 경계를 둔다.

```sql
SELECT id, payload
FROM events
WHERE occurred_at >= :start_at
  AND occurred_at < :end_at
ORDER BY occurred_at, id;
```

범위 하나가 너무 크면 같은 `(occurred_at, id)` keyset으로 다시 쪼갠다. ID 값의 크기가 행 개수를 뜻하지 않으므로 숫자 폭만으로 균등한 batch라고 가정하지 않는다.

## OFFSET을 유지할 때

넓은 행을 깊게 건너뛰어야 하면 먼저 좁은 covering index에서 PK만 찾은 뒤 실제 반환 행만 table lookup하는 deferred join을 검토한다.

```sql
SELECT a.id, a.title, a.created_at
FROM articles AS a
JOIN (
  SELECT id
  FROM articles
  WHERE category_id = :category_id
  ORDER BY created_at DESC, id DESC
  LIMIT 20 OFFSET 100000
) AS page_ids ON page_ids.id = a.id
ORDER BY a.created_at DESC, a.id DESC;
```

이 방법도 OFFSET 탐색을 없애지는 않는다. 큰 본문을 매번 읽는 비용을 줄이는 최적화이며, 인덱스 폭과 table lookup 비용을 계획으로 검증한다.

## COUNT 비용 줄이기

InnoDB는 MVCC 때문에 모든 트랜잭션에 공통인 정확한 행 수를 저장하지 않는다. `COUNT(*)`는 현재 트랜잭션에 보이는 행을 세며 조건에 맞는 index range를 끝까지 읽어야 할 수 있다.

| 화면 요구 | 선택지 |
|---|---|
| 다음 페이지 존재 여부 | `LIMIT page_size + 1` |
| 대략적인 규모 | optimizer 통계, 오차와 갱신 시각 표시 |
| 자주 쓰는 업무별 정확한 수 | 별도 counter 또는 summary, 원자적 갱신과 복구 설계 |
| 즉시 정확한 검색 결과 수 | covering 가능한 COUNT 계획과 비용 수용 |

필터가 달라졌는데 이전 count를 재사용하거나 client가 보낸 count를 정답으로 신뢰하지 않는다. COUNT 제거는 DB 튜닝이 아니라 제품 계약 변경일 수 있으므로 UI와 함께 결정한다.

## 검증 순서

1. 결정적인 `ORDER BY`와 반환 집합 의미를 고정한다.
2. 첫 페이지, 일반 페이지, 가장 깊은 허용 페이지를 각각 측정한다.
3. `EXPLAIN ANALYZE`의 실제 행 수, loop, sort와 table lookup을 본다.
4. 같은 필터로 OFFSET, keyset, deferred join을 비교한다.
5. 삽입, 삭제, 정렬 값 변경 중 중복과 누락 시나리오를 테스트한다.

## 출처

- [MySQL 8.4 Reference Manual, LIMIT Query Optimization](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
- [MySQL 8.4 Reference Manual, Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [인프런, OFFSET 페이징의 함정](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471945)
- [인프런, 커서 기반 페이징](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471946)
- [인프런, 지연 조인 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471944)
- [인프런, Real MySQL 시즌 1 - Part 1, 페이징 쿼리 작성](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226564)
- [인프런, Hong, SELECT 고급](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338551)

## 관련 문서

- [[Index|인덱스]]
- [[Covering-Index|커버링 인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 파이프라인과 정렬]]
- [[API-Conventions|API 규약]]
