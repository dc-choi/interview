---
tags: [database, rdbms, mysql, sql, lateral, subquery]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Lateral Derived Tables", "MySQL LATERAL 파생 테이블"]
---

# MySQL LATERAL 파생 테이블

일반 파생 테이블은 같은 `FROM` 절에서 앞에 나온 테이블의 컬럼을 참조할 수 없다. `LATERAL`은 이 의존성을 허용해 각 선행 행을 입력으로 여러 컬럼이나 여러 행을 계산하게 한다.

## 그룹별 Top-N

```sql
SELECT c.id, top_article.id, top_article.view_count
FROM categories AS c
LEFT JOIN LATERAL (
  SELECT a.id, a.view_count
  FROM articles AS a
  WHERE a.category_id = c.id
  ORDER BY a.view_count DESC, a.id DESC
  LIMIT 3
) AS top_article ON TRUE;
```

파생 테이블이 왼쪽의 `c.id`를 참조하고, 카테고리마다 최대 3행을 반환한다. `(category_id, view_count DESC, id DESC)`처럼 조건과 정렬을 지원하는 인덱스가 있으면 전체 행에 순위를 매기는 방식보다 적게 읽을 수 있다.

`LEFT JOIN ... ON TRUE`는 결과가 없는 카테고리도 남긴다. 결과가 있는 카테고리만 필요하면 `INNER JOIN`이나 `CROSS JOIN`을 검토한다.

## 쓰임새

- 스칼라 상관 서브쿼리로는 반환할 수 없는 여러 컬럼을 한 번에 반환한다.
- 같은 외부 행에 대한 계산을 파생 테이블에서 이름 붙여 뒤의 식이 재사용하게 한다.
- 분석 대상 행마다 작은 집계나 존재 조건을 계산한다.
- 그룹별 Top-N을 해당 그룹의 인덱스 범위와 `LIMIT`으로 읽는다.

LATERAL이 항상 JOIN, window function이나 상관 서브쿼리보다 빠른 것은 아니다. 의존하는 선행 행마다 파생 테이블이 갱신되므로 왼쪽 행 수가 크거나 내부 조건에 인덱스가 없으면 반복 비용이 커진다. `EXPLAIN ANALYZE`로 외부 반복 수, 내부 실제 행 수와 정렬 여부를 비교한다.

## 문법 제약

- LATERAL 파생 테이블은 `FROM` 절에만 올 수 있다.
- 오른쪽 LATERAL이 왼쪽을 참조하면 `INNER`, `CROSS`, `LEFT JOIN`을 사용한다. 반대 방향 참조에는 대응하는 `RIGHT JOIN` 제약이 적용된다.
- LATERAL이 참조하는 aggregate는 그 LATERAL을 소유한 같은 `FROM` query block의 집계일 수 없다.
- `JSON_TABLE()` 같은 table function은 표준에 따라 암묵적으로 lateral이다. 그 앞에 `LATERAL`을 명시하면 안 된다.
- 결과 순서를 보장해야 하는 Top-N은 동률을 깨는 고유 정렬 키까지 둔다.

## 선택 기준

1. 외부 행을 참조하면서 여러 컬럼 또는 행을 반환해야 하는가?
2. 외부 행 수를 먼저 충분히 줄일 수 있는가?
3. 내부 조건과 정렬을 한 인덱스가 지원하는가?
4. window function, 사전 집계 CTE와 비교한 실제 계획이 더 단순한가?

쿼리 작성 편의와 실행 비용을 분리해서 판단한다.

## 출처

- [MySQL 8.4 Reference Manual, Lateral Derived Tables](https://dev.mysql.com/doc/refman/8.4/en/lateral-derived-tables.html)
- [인프런, Real MySQL 시즌 1 - Part 1, Lateral Derived Table](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226566)

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[SQL-Joins|SQL 조인]]
- [[Execution-Plan|실행 계획]]
- [[Index|인덱스]]
