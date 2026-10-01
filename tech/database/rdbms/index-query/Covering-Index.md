---
tags: [database, rdbms, mysql, index, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["Covering Index", "커버링 인덱스"]
verified_at: 2026-09-30
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

## Index extension

InnoDB는 모든 보조 인덱스 뒤에 PK 컬럼을 자동으로 덧붙인다. 그래서 같은 인덱스 키를 가진 엔트리는 PK 순으로 정렬되어 있고, `(category_id)` 인덱스는 사실상 `(category_id, product_id)` 순서다. `optimizer_switch`의 `use_index_extensions`(기본 on)가 켜져 있으면 옵티마이저가 이 PK 부분을 `ref`, `range`, `index_merge` 접근, Loose Index Scan, 조인과 정렬 최적화, `MIN()`/`MAX()` 최적화에 쓴다. key part 16개, key 길이 3,072바이트라는 일반 한도는 그대로 적용된다.

8.4 문서의 예: `PRIMARY KEY (i1, i2)`, `INDEX k_d (d)`인 테이블에서 `SELECT COUNT(*) FROM t1 WHERE i1 = 3 AND d = '2000-01-01'`은 확장을 쓰지 않으면 `key_len` 4, `ref` const, rows 5, `Using where; Using index`이지만, 확장을 쓰면 `key_len` 8, `ref` const,const, rows 1, `Using index`가 된다. `k_d`가 내부적으로 `(d, i1, i2)`로 다뤄지기 때문이다.

- `WHERE category_id = ? ORDER BY product_id LIMIT 20`처럼 동등 조건 뒤 PK 순으로 정렬하면 `(category_id)` 인덱스만으로 filesort 없이 처리되고, 필요한 컬럼이 키와 PK뿐이면 covering도 된다. 등록 순서 목록의 정렬 비용이 사라진다.
- keyset 조건 `WHERE status = ? AND id < :last_id ORDER BY id DESC`도 `(status)` 인덱스의 확장 부분으로 range 접근이 된다.
- 따라서 PK가 `id`일 때 `(status, id)`를 따로 만들면 `(status)`와 사실상 같은 순서라 중복 인덱스일 수 있다. 인덱스를 추가하거나 정리할 때 반영한다([[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리]]).
- PK를 UUID로 바꾸는 식의 변경은 이 암묵 정렬과 `key_len`을 바꿔 기존 계획을 흔든다. `EXPLAIN`의 `key_len`과 `ref`가 PK 부분까지 쓰는지로 적용 여부를 확인한다([[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]).

같은 이유로 PK 폭은 모든 보조 인덱스에 복제된다. 1억 건, 보조 인덱스 5개라면 `BIGINT` PK는 PK 값만 약 4GB를 더한다. `CHAR(36)` utf8mb4 UUID를 문자셋 최대 바이트(144바이트)로 곱하면 약 72GB가 나오지만, InnoDB COMPACT 계열은 가변 길이 문자셋의 `CHAR(N)`을 뒤 공백을 잘라 N바이트에 맞추려 하므로 ASCII UUID는 약 36바이트, 합계 약 18GB에 가깝다. `BINARY(16)`이면 약 8GB다. 레코드 헤더는 빼고 계산한 값이며, 짧고 순차적인 PK가 필요한 이유는 [[Primary-Key-Strategy|Primary Key 전략]]에서 이어진다.

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

InnoDB의 ICP는 clustered index에는 적용되지 않으며, covering query는 이미 전체 행 조회가 필요 없으므로 ICP와 같은 의미가 아니다. `Using index condition`과 `Using index`를 구분한다. 8.4 문서는 ICP를 전체 행에 접근해야 할 때 쓰는 최적화로 정의한다. ICP가 빨랐던 이유는 스토리지 엔진에서 평가해서가 아니라 테이블 점프 전에 거르기 때문이므로, covering으로 점프가 0이 되면 남는 이득은 서버로 올리는 행의 메모리 복사 정도다. 그래서 covering 계획에서는 `Using index condition`이 사라지고, 인덱스 컬럼으로 거를 조건이 남으면 `Using where; Using index`로 나오며, TREE 출력에는 `Covering index` 접근 노드가 보인다.

## 단계별 실측이 보여 주는 것

강의 실측은 테이블 점프(clustered index 재탐색) 횟수가 실행 시간을 지배한다는 점을 보여 준다. 수치는 특정 실습 환경의 값이므로 비율과 방향으로 읽는다.

| 실험 | 점프 횟수 | 시간 |
|---|---|---|
| 보조 인덱스로 약 20만 건 조회, 인덱스에 없는 `price` 조회 | 약 20만 | 약 233ms |
| 같은 조건, 인덱스 키와 PK만 조회(covering) | 0 | 약 43ms |
| LIMIT 없는 대용량 조회, ICP off, 비커버링 | 약 17만 | 약 700ms |
| 같은 조회, ICP on, 비커버링 | 약 9만 | 약 400ms |
| 같은 조회, covering | 0 | 약 58ms |

`LIMIT 20` 상품 검색에서는 단일 인덱스(약 287ms)를 정렬 순서까지 담은 복합 인덱스로 바꿔 조기 종료가 되자 1ms 미만이 되었고, 이후 끝에 필터 컬럼을 붙인 ICP, 모든 컬럼을 담은 covering으로 점프가 45회, 20회, 0회로 줄었다. 결과가 작고 데이터가 캐시에 있으면 이런 차이는 체감하기 어려울 만큼 작아지므로 효과는 규모를 키우고 cold와 warm cache를 나눠 잰다.

covering은 ICP보다 한 단계 나아간 최적화지만 무조건 적용하지 않는다. 먼저 필요한 컬럼만 조회하는 습관을 들이고 인덱스 컬럼 추가의 쓰기 비용을 따진다. TEXT, BLOB 같은 큰 컬럼이 필요한 쿼리는 현실적으로 covering이 어렵다. 게시판 목록처럼 호출이 잦고 반환 컬럼이 제한된 쿼리에 한정해 도입한다.

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
- [MySQL 8.4 Reference Manual, Use of Index Extensions](https://dev.mysql.com/doc/refman/8.4/en/index-extensions.html)
- [MySQL 8.4 Reference Manual, InnoDB Row Formats](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)
- [인프런, Hong, MySQL B-Tree Index (Clustered, Secandary, Page, Format)](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373903)
- [인프런, 김영한, 세컨더리 인덱스 3 - 실무 활용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471892)
- [인프런, 김영한, 정리 (인덱스 내부 구조 2 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471896)
- [인프런, 김영한, 대용량 성능 실측](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471906)

## 관련 문서

- [[Index|인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]
- [[Pagination-Optimization|페이징 성능 최적화]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]
