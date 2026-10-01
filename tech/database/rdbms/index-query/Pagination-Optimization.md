---
tags: [database, rdbms, mysql, pagination, performance, cursor]
status: done
verified_at: 2026-09-30
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

OFFSET이 항상 금지되는 것은 아니다. 데이터가 작고 임의 페이지 이동이 필요하거나 깊은 페이지를 거의 요청하지 않는 관리 화면에는 가장 단순한 계약일 수 있다. 실제 p95와 examined rows로 전환 시점을 정한다. 사용자 대부분이 앞 몇 페이지만 보는 서비스라면 OFFSET을 유지하되 최대 페이지를 제한하거나 검색 조건을 좁히도록 유도한다.

## Keyset 또는 cursor 페이징

마지막으로 본 정렬 키 다음부터 범위 탐색한다.

```sql
SELECT id, title, created_at
FROM articles
WHERE category_id = :category_id
  AND (created_at < :last_created_at
       OR (created_at = :last_created_at AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

- `(category_id, created_at DESC, id DESC)` 인덱스로 `EXPLAIN`이 `type=range`이고 `key_len`이 세 컬럼을 덮는지 확인한다. 커서 위치로 바로 내려가 21행을 읽고 멈추므로 응답 시간이 페이지 깊이에 비례하지 않는다.
- MySQL에서는 같은 의미의 row constructor `(created_at, id) < (:last_created_at, :last_id)`를 등호 조건과 섞어 쓰지 않는다. MySQL 8.4 문서는 row constructor가 인덱스 prefix를 덮지 않으면 인덱스를 덜 쓴다며 AND/OR 식과 섞지 말라고 권고한다(PK `(c1, c2, c3)`에서 `c1 = 1 AND (c2, c3) > (1, 1)`은 `ref`, `key_len` 4, 전개형은 `range`, `key_len` 12). 8.4.6 재현에서도 row constructor 형태는 `category_id`만 쓰는 `ref`(`key_len` 8)로 21행을 얻으려고 index entry 4,621개를 읽었고, 전개형은 `range`(`key_len` 21)로 21개만 읽었다. 커서가 깊을수록 OFFSET처럼 비용이 는다.
- PostgreSQL은 반대다. 16 재현에서 row comparison은 `Index Cond`에 들어가 21행만 읽었고, 전개형 OR는 `category_id`만 인덱스 조건으로 쓰고 나머지를 Filter로 걸러 4,600행을 버렸다. DBMS별로 조건 형태를 나눠 쓴다.
- 21번째 행은 다음 페이지 존재 여부만 판단하고 응답에서는 제거한다. 전체 COUNT가 필요 없다.
- `created_at`이 중복될 수 있으므로 고유한 `id`까지 cursor와 정렬에 넣는다. 비고유 컬럼만 쓰면 `<`는 같은 값의 남은 행을 빠뜨리고 `<=`는 중복을 만든다.
- cursor는 정렬 값, 방향과 필터 identity를 서버가 검증할 수 있게 서명하거나 opaque token으로 만든다.

장점은 깊이에 비례한 skip을 피하고 더 보기, 무한 스크롤과 잘 맞는다는 점이다. 임의 페이지로 바로 이동하기 어렵고 정렬 기준이 바뀌면 인덱스 설계와 커서 값이 무효가 되므로, 정렬 조건이 자주 바뀌는 검색에는 cursor 계약이 복잡해진다.

### 조건 형태별 다음 페이지 조건

첫 페이지는 기존 조건에 결정적인 `ORDER BY`와 `LIMIT`만 붙인다. 다음 페이지 조건은 WHERE 조건의 형태와, 범위 컬럼과 식별자의 순서 관계에 따라 달라진다.

- 동등 조건: `user_id = :user_id AND id > :last_id ORDER BY id`. InnoDB에서는 `(user_id)` 인덱스도 뒤에 붙은 PK로 이 순서를 지원할 수 있다([[Covering-Index#Index extension|index extension]]).
- 범위 조건이고 범위 컬럼의 순서가 식별자와 다를 때(결제 완료 시각 `finished_at`): `(finished_at = :last_at AND id > :last_id) OR (finished_at > :last_at AND finished_at < :end_at)`로 전개하고 `ORDER BY finished_at, id`처럼 두 컬럼을 모두 정렬에 명시한다.
- 범위 조건이고 순서가 식별자와 같을 때(`created_at`이 `id`와 함께 증가): `id > :last_id`만 더해도 누락이 없고, 범위 시작을 `created_at >= :last_created_at`로 당겨 이미 읽은 구간을 다시 훑지 않는다. 동시 삽입에서는 AUTO_INCREMENT 할당 순서와 `created_at` 순서가 어긋날 수 있으므로 두 순서가 같다는 보장이 있을 때만 쓰고, 아니면 전개형을 쓴다.

## 동시 변경의 의미

keyset도 자동으로 snapshot을 제공하지 않는다. 페이지 사이에 새 행이 삽입되거나 정렬 값이 바뀌면 사용자가 보는 집합이 달라질 수 있다.

- feed처럼 새 항목 유입을 허용할지, 최초 조회의 상한 시각을 cursor에 고정할지 정한다.
- mutable 정렬 컬럼은 중복과 누락 가능성을 문서화하거나 변경되지 않는 보조 키를 사용한다.
- 전체 탐색을 한 시점으로 고정해야 하는 batch는 짧은 API 트랜잭션을 오래 유지하기보다 PK 범위, watermark나 별도 snapshot을 검토한다.

### 키 탐색과 본문 조회를 나눴을 때

첫 쿼리에서 ID와 정렬 키를 찾고 두 번째 쿼리에서 본문과 관계를 조회하는 배치는 **탐색한 좌표와 반환한 항목을 구분**한다. 두 쿼리 사이의 삭제나 JOIN 대상 변경으로 본문 결과가 비어도, 아직 탐색하지 않은 다음 구간이 남을 수 있다.

- 다음 cursor는 첫 탐색에서 이번 페이지의 처리 대상으로 채택한 마지막 정렬 키를 기준으로 만든다. `page_size + 1`의 추가 행은 다음 페이지 확인용이므로 cursor에 포함하지 않는다. 본문 `items.length === 0`만으로 전체 탐색을 종료하지 않는다.
- `(updated_at, id)`로 탐색했다면 본문을 읽을 때 더 최신으로 바뀐 `updated_at`을 그 페이지의 checkpoint로 쓰지 않는다. 그 사이의 아직 탐색하지 않은 항목을 건너뛸 수 있다.
- 실패 항목의 재처리 보장이 없는 상태에서 성공 checkpoint를 앞으로 옮기지 않는다. 탐색 진행 위치와 처리 성공 범위가 다른 계약이면 별도로 저장한다.
- 다음 cursor가 이전 값보다 진행하지 않으면 오류로 처리한다. 무한 반복을 성공으로 기록하지 않는다.

이는 별도 statement가 서로 다른 상태를 볼 수 있는 경우의 설계다. 예를 들어 PostgreSQL의 Read Committed는 statement마다 snapshot을 얻는다. 같은 snapshot에서 읽는 경우와는 구분하며, 이 규칙만으로 hard delete 감지나 전체 배치의 snapshot 일관성이 해결되지는 않는다.

## 페이지 안의 조건과 불변식

필터, 정렬, 페이지 자르기를 모두 쿼리 안에서 해야 page size, 다음 페이지 판단과 전체 건수가 맞는다.

- 이미지 리뷰만 모아 보는 목록을 리뷰 페이지를 먼저 자른 뒤 애플리케이션에서 거르면, 그 페이지에 이미지 리뷰가 없을 때 0건을 반환하고 다음 페이지의 이미지 리뷰는 보이지 않는다. 빈 결과를 목록의 끝으로 오인하면 탐색도 멈춘다. 조건이 다른 테이블에 있으면 `EXISTS`나 JOIN으로 쿼리에 넣거나 조회용 컬럼과 인덱스를 검토한다. 추천의 Top K 뒤 필터가 만드는 underfill도 같은 구조다([[Recommendation-System-Eligibility-Availability|추천 후보 적격성]]).
- 상품이 여러 카테고리에 속해 매핑 테이블을 두면, 카테고리 목록은 매핑의 활성 행을 offset/limit으로 읽고 그 ID로 상품을 조회할 수 있다. 매핑 행 수가 곧 반환할 상품 수라는 전제이므로, 조회에서 상품 삭제 여부를 따로 보지 않는다면 활성 매핑이 있는 상품은 삭제되지 않는다는 불변식을 쓰기 쪽이 지켜야 한다. 매핑이 남은 상품의 삭제를 막거나 상품 삭제 때 매핑을 같은 트랜잭션에서 함께 지우고, 어느 쪽인지 운영팀과 합의해 문서화한다. 조회 뒤 삭제 상품을 거르면 반환 개수와 `hasNext`가 매핑 기준 페이지와 어긋난다. FK는 행의 존재만 보장하고 활성 상태는 보장하지 않는다([[Soft-Delete-and-Data-Lifecycle|Soft Delete와 데이터 수명주기]]).

## 범위 기반 batch

날짜 또는 PK 범위를 업무 단위로 나눌 수 있으면 페이지 크기 기반 cursor와 별도로 범위 경계를 둔다.

```sql
SELECT id, payload
FROM events
WHERE occurred_at >= :start_at
  AND occurred_at < :end_at
ORDER BY occurred_at, id;
```

범위 하나가 너무 크면 같은 `(occurred_at, id)` keyset으로 다시 쪼갠다. ID 값의 크기가 행 개수를 뜻하지 않으므로 숫자 폭만으로 균등한 batch라고 가정하지 않는다. 화면 목록은 페이징으로 나누고, 커서 스트리밍은 한 흐름으로 끝까지 소비하는 배치에 한정한다([[MySQL-Query-Pipeline-and-Sorting#파이프라인과 애플리케이션 소비|파이프라인과 애플리케이션 소비]]).

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

- 깊은 OFFSET은 인덱스 계획을 뒤집는다. TREE 계획의 `Limit/Offset`은 인덱스 스캔 위에서 행을 버리므로, 비커버링 인덱스면 버릴 행까지 clustered index에서 읽어 완성한 뒤 버린다. OFFSET이 깊을수록 이 랜덤 I/O 추정이 커져 옵티마이저는 full scan과 filesort로 돌아간다. 8.4.6 재현(10만 행, 본문을 포함한 비커버링 조회)에서는 OFFSET 100에서 `Backward index scan`이던 계획이 OFFSET 5,000에서 `ALL`과 `Using filesort`로 바뀌었다.
- 강의 실측의 깊은 페이지에서 full scan과 filesort는 약 1.8초, 비커버링 인덱스 강제는 약 0.08초, 지연 조인은 약 0.01초였고 cold cache에서도 안정적이었다. 강의는 옵티마이저가 지연 조인을 스스로 하지 않는 이유로 OFFSET 전에 행을 완성하는 실행 순서와 얕은 OFFSET에서의 조인 손해를 든다.
- `EXPLAIN ANALYZE`에서 안쪽 서브쿼리가 `Covering index scan`(PK lookup 0회)인지, 바깥 PK 조인의 `loops`가 LIMIT 값과 같은지 확인한다.
- 지연 조인도 OFFSET만큼의 index entry는 읽는다. 강의에서 커버링 인덱스로 OFFSET 300만을 건너뛰는 데 약 480ms가 걸렸고 데이터가 늘면 선형으로 는다. 이 비용까지 없애려면 keyset으로 바꾼다.
- 보조 인덱스 엔트리 뒤에는 PK가 붙어 있어 같은 인덱스 스캔 안에서는 동점 행이 PK 순으로 나와 안정적으로 보인다. 계획이 filesort로 바뀌면 이 순서는 보장되지 않으며, MySQL 문서도 ORDER BY 값이 같은 행의 순서는 실행 계획에 따라 달라질 수 있다고 적는다. 개발 환경에서 안정적이었다는 이유로 `id` 같은 유니크 tiebreaker를 빼지 않는다.

## COUNT 비용 줄이기

InnoDB는 MVCC 때문에 모든 트랜잭션에 공통인 정확한 행 수를 저장하지 않는다. `COUNT(*)`는 현재 트랜잭션에 보이는 행을 세며 조건에 맞는 index range를 끝까지 읽어야 할 수 있다.

- 목록 쿼리는 인덱스 순서로 `LIMIT`만큼 채우면 멈출 수 있지만, 결과가 한 행인 `COUNT(*)`는 `LIMIT`이 읽기량을 줄이지 못한다. 조건이 인덱스 컬럼만이면 인덱스만 읽어 셀 수 있지만, 인덱스에 없는 컬럼 조건이 섞이면 후보마다 테이블 레코드를 읽어 `LIMIT` 없는 `SELECT *`와 같은 작업량이 되고 같은 조건의 목록 쿼리보다 무거울 수 있다.
- covering이어도 대상 레코드가 많으면 빠르지 않고, 모든 COUNT를 위해 조건 컬럼을 인덱스에 넣으면 인덱스 비용이 더 클 수 있다.
- `COUNT(DISTINCT)`는 중복 제거용 임시 구조에 값을 확인하고 넣는 일이 더해져 `COUNT(*)`와 비용이 크게 벌어질 수 있다. ORM이 만드는 경우는 [[TypeORM-QueryBuilder-Pagination-and-Count|TypeORM count SQL]]을 본다.

| 화면 요구 | 선택지 |
|---|---|
| 다음 페이지 존재 여부 | `LIMIT page_size + 1`, 페이지 번호 대신 이전/다음 이동 |
| 보여 줄 페이지 번호 범위 | 상한 COUNT. 번호를 10개까지 보이면 `10 × page_size + 1`건까지만 센다 |
| 대략적인 규모 | optimizer 통계, 오차와 갱신 시각 표시 |
| 자주 쓰는 업무별 정확한 수 | 별도 counter 또는 summary, 원자적 갱신과 복구 설계 |
| 즉시 정확한 검색 결과 수 | covering 가능한 COUNT 계획과 비용 수용 |

```sql
-- 페이지 크기 20, 번호 10개: 201건까지만 세고 201이면 200+로 표시
SELECT COUNT(*)
FROM (SELECT 1 FROM articles WHERE category_id = :category_id LIMIT 201) AS capped;
```

WHERE 없는 전체 규모는 `information_schema.TABLES`의 `TABLE_ROWS`, 조건별 규모는 `EXPLAIN`의 `rows`로 가늠할 수 있지만 둘 다 추정치다. InnoDB의 `TABLE_ROWS`는 실제와 40~50%까지 다를 수 있고 캐시된 값이다([[Index-Write-Cost-and-Cleanup#MySQL에서 크기 재기|캐시 갱신 조건]]).

우선순위는 제거, 추정, 인덱스 튜닝 순이다. 조건이 없거나 일치 건수가 많은 COUNT는 먼저 없앨 수 있는지 보고, 어렵다면 상한이나 통계로 대체한다. 정확한 수가 필요하고 대상이 많지 않으며 covering이 가능할 때만 인덱스를 튜닝한다. 필터가 달라졌는데 이전 count를 재사용하거나 client가 보낸 count를 정답으로 신뢰하지 않는다. COUNT 제거는 DB 튜닝이 아니라 제품 계약 변경일 수 있으므로 UI와 함께 결정한다.

## 검증 순서

1. 결정적인 `ORDER BY`와 반환 집합 의미를 고정한다.
2. 첫 페이지, 일반 페이지, 가장 깊은 허용 페이지를 각각 측정한다.
3. `EXPLAIN ANALYZE`의 실제 행 수, loop, sort와 table lookup을 본다.
4. 같은 필터로 OFFSET, keyset, deferred join을 비교한다.
5. 삽입, 삭제, 정렬 값 변경 중 중복과 누락 시나리오를 테스트한다.

## 출처

- [PostgreSQL 18, Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) — Read Committed의 statement별 snapshot. 두 단계 cursor 규칙은 동기화 코드와 회귀 테스트에서 추출한 설계다.
- [MySQL 8.4 Reference Manual, LIMIT Query Optimization](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
- [MySQL 8.4 Reference Manual, Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [MySQL 8.4 Reference Manual, Row Constructor Expression Optimization](https://dev.mysql.com/doc/refman/8.4/en/row-constructor-optimization.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA TABLES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html)
- [인프런, OFFSET 페이징의 함정](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471945)
- [인프런, 커서 기반 페이징](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471946)
- [인프런, 커서 기반 페이징 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471947)
- [인프런, 인덱스를 활용한 정렬 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471943)
- [인프런, 지연 조인 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471944)
- [인프런, Real MySQL 시즌 1 - Part 1, 페이징 쿼리 작성](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226564)
- [인프런, Real MySQL 시즌 1 - Part 1, COUNT(*) & COUNT(DISTINCT) 튜닝](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226563)
- [인프런, Hong, SELECT 고급](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338551)
- [인프런, 제미니, 리뷰 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392783)
- [인프런, 제미니, 상품 목록 - 요구사항 느끼기](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354096)
- [인프런, 제미니, 상품 목록 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354097)

## 관련 문서

- [[Index|인덱스]]
- [[Covering-Index|커버링 인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 파이프라인과 정렬]]
- [[TypeORM-QueryBuilder-Pagination-and-Count|TypeORM take/skip과 count가 만드는 SQL]]
- [[API-Conventions|API 규약]]
