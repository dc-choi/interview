---
tags: [database, rdbms, sql, join]
status: done
category: "Data & Storage - RDB"
aliases: ["SQL Joins", "조인"]
---

# SQL 조인 (Joins)

조인은 **여러 테이블에서 관련된 행을 결합**해 단일 결과셋을 만든다. 조인 종류(syntax)와 조인 알고리즘(execution)은 다른 층위. 종류는 "어떤 결과를 원하는가"를, 알고리즘은 "옵티마이저가 어떻게 처리하는가"를 결정.

## 조인 종류

### INNER JOIN (내부 조인)
양쪽 테이블 모두에 매칭이 있는 행만 반환. **교집합**.

명시적:
```sql
SELECT 학생.학번, 학생.이름, 지도교수.교수명
  FROM 학생
  JOIN 지도교수 ON 학생.학번 = 지도교수.학번;
```

암시적 (구식, 비권장):
```sql
SELECT 학생.학번, 학생.이름, 지도교수.교수명
  FROM 학생, 지도교수
 WHERE 학생.학번 = 지도교수.학번;
```

암시적 조인은 WHERE 절에 **조인 조건과 필터 조건이 섞여서** 가독성, 유지보수성 떨어짐. 명시적 JOIN ... ON 사용.

### LEFT OUTER JOIN
왼쪽 테이블의 모든 행 + 오른쪽 테이블의 매칭 행. 매칭 없으면 오른쪽 컬럼은 NULL.

```sql
SELECT 학생.학번, 지도교수.교수명
  FROM 학생
  LEFT OUTER JOIN 지도교수 ON 학생.학번 = 지도교수.학번;
```

용도: "지도교수가 배정 안 된 학생까지 모두 보고 싶다."

### RIGHT OUTER JOIN
오른쪽 테이블 기준. LEFT의 좌우 반전. **테이블 순서를 바꾸면 LEFT로 표현 가능**하므로 실무에선 LEFT만 쓰는 컨벤션이 많다.

### FULL OUTER JOIN
양쪽 모두의 모든 행. 매칭 없는 쪽은 NULL. **MySQL은 미지원** → `LEFT JOIN UNION RIGHT JOIN`으로 우회. PostgreSQL은 지원.

### CROSS JOIN (교차 조인)
**데카르트 곱**. 양쪽의 모든 조합. 100행 × 1000행 = 10만행.

```sql
SELECT 학생.학번, 지도교수.교수명
  FROM 학생
 CROSS JOIN 지도교수;
```

용도: 의도적인 모든 조합 (날짜 × 카테고리 매트릭스 생성 등). 실수로 발동되면 폭발적 결과.

### NATURAL JOIN
양쪽 테이블에서 **같은 이름의 컬럼**을 자동으로 조인 키로 사용.

```sql
SELECT 학생.*, 지도교수.*
  FROM 학생
NATURAL JOIN 지도교수;
```

위험성:
- 컬럼명이 우연히 같으면 의도치 않은 조인
- **공통 컬럼이 하나도 없으면 CROSS JOIN으로 동작** → 결과 폭발
- 테이블 스키마 변경(컬럼 추가)으로 동작이 바뀜

**실무에선 거의 쓰지 않음**. 명시적 ON 절을 항상 사용.

### USING (, )
공통 컬럼명을 명시. NATURAL의 안전한 대안.

```sql
SELECT 학생.학번, 지도교수.교수명
  FROM 학생
  JOIN 지도교수 USING (학번);
```

ON과 비슷하지만 USING은 **결과셋에 조인 컬럼이 한 번만** 등장.

## 드라이빙 vs 드리븐 테이블

Nested-loop 계열 계획에는 먼저 row를 공급하는 outer 또는 driving input과, 그 row로 반복 탐색하는 inner 또는 driven input이 있다.

- **드라이빙 테이블 (Outer Table)**: 먼저 접근하는 쪽
- **드리븐 테이블 (Inner Table)**: 드라이빙 결과로 검색하는 쪽

작은 table을 항상 먼저 읽는 것은 아니다. predicate 적용 뒤의 예상 rows, inner access 비용, join dependency, 정렬과 결과 보존 조건을 함께 비교한다. inner join key의 selective index는 반복 탐색을 줄이지만 모든 join에 필수인 보편 규칙은 아니다. hash join처럼 다른 알고리즘이 유리할 수도 있다.

## 조인 알고리즘

### Nested Loop Join (NL)
outer row마다 inner input에서 matching row를 찾는다. 비용은 대략 `outer rows * inner lookup cost`로 누적된다. inner index가 있어도 outer가 크고 조회가 non-covering이면 clustered row lookup이 비쌀 수 있다. `EXPLAIN ANALYZE`의 actual rows와 loops로 실제 반복량을 본다.

### Batch Key Access Join (BKA)
BKA는 outer의 lookup key를 join buffer에 모으고 MRR로 inner base row 접근의 지역성을 개선하는 nested-loop 계열 방식이다. MySQL 8.4에서는 기본으로 켜져 있지 않으며 `mrr`, `mrr_cost_based`, `batched_key_access` 설정과 비용을 검증해야 한다.

### Hash Join
build input으로 hash table을 만들고 probe input을 대조한다. MySQL 8.4는 applicable join index가 없는 equi-join뿐 아니라 non-equi 조건, outer join, semijoin과 antijoin도 지원 범위가 있다. non-equi 조건은 hash Cartesian product 뒤 filter가 될 수 있고, memory를 넘으면 disk를 사용할 수 있으므로 항상 NL보다 빠르다고 단정하지 않는다.

### Sort-Merge Join
양쪽 input을 join key로 정렬한 뒤 함께 순회한다. PostgreSQL은 후보로 사용할 수 있지만 MySQL 8.4의 일반적인 물리 join 알고리즘 목록으로 가정하지 않는다.

## 조인 알고리즘 선택

| 상황 | 우선 확인할 후보 |
|---|---|
| 적은 outer rows, selective inner index | nested loop |
| applicable join index가 없는 큰 equi-join | hash join |
| 반복되는 non-covering inner lookup | covering index, BKA와 MRR 검토 |
| 예상과 실제 rows가 크게 다름 | 통계, histogram, data skew 점검 |

hint로 join 순서를 강제하기 전에 통계, predicate와 index를 고친다. outer join에서는 predicate 위치를 바꾸면 결과 집합 자체가 달라질 수 있으므로 semantic regression test가 필요하다.

## 면접 체크포인트

- INNER vs LEFT OUTER 차이
- 암시적 조인 vs 명시적 조인 (가독성, 유지보수)
- NATURAL JOIN을 권장하지 않는 이유
- join 종류와 물리 실행 알고리즘의 차이
- NL Join에서 `actual rows * loops`를 보는 이유
- Hash Join의 build/probe와 memory spill
- BKA와 MRR이 반복 row lookup을 줄이는 방식

## 출처
- [yoonseon — 논리적인 SQL 개념 용어](https://yoonseon.tistory.com/143)
- [MySQL 8.4, Nested-Loop Join Algorithms](https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html)
- [MySQL 8.4, Hash Join Optimization](https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html)
- [MySQL 8.4, Batched Key Access Joins](https://dev.mysql.com/doc/refman/8.4/en/bnl-bka-optimization.html)

## 관련 문서
- [[SQL-Tuning-Terminology|SQL 튜닝 용어]]
- [[Index|Index]]
- [[Execution-Plan|Execution Plan]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
- [[SQL|SQL 기초]]
