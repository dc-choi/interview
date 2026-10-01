---
tags: [database, rdbms, mysql, index, composite-index, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["Composite Index Design", "복합 인덱스 설계", "복합 인덱스 컬럼 순서", "인덱스 추가 판단"]
verified_at: 2026-09-30
---

# 복합 인덱스 설계

두 개 이상의 컬럼을 묶은 인덱스에서는 컬럼 순서가 곧 정렬 구조다. 어떤 조건과 정렬을 인덱스로 풀 수 있는지가 이 구조에서 정해지므로, 인덱스가 있는데도 쓰이지 않는 사고의 흔한 원인이 컬럼 순서다. 아래 규칙은 MySQL 8.4 InnoDB B-tree 인덱스 기준의 휴리스틱이며 실제 선택은 실행 계획과 측정으로 확인한다. 새 인덱스를 만들기 전에 제약이 이미 만든 인덱스와 과잉 최적화를 따지는 기준도 함께 다룬다.

B-tree 구조, 카디널리티와 선택도 정의는 [[Index|Index]]에, 필요한 컬럼까지 담아 테이블 접근을 없애는 설계는 [[Covering-Index|커버링 인덱스]]에 있다.

## 정렬 구조: 그룹 안에서만 정렬된다

```sql
CREATE INDEX idx_items_category_price ON items (category, price);
```

- 이 인덱스는 category로 먼저 정렬하고, 같은 category 안에서만 price로 정렬한다. 성으로 정렬하고 같은 성 안에서 이름으로 정렬한 전화번호부와 같다.
- price는 category 그룹 안에서만 정렬되어 있고 인덱스 전체로 보면 흩어져 있다. 아래 세 규칙은 모두 이 구조에서 나온다.
- InnoDB 보조 인덱스 뒤에는 PK가 붙어 같은 키 안에서는 PK 순으로 정렬된다([[Covering-Index#Index extension|index extension]]).

## 규칙 1: 왼쪽 컬럼부터 쓴다

- `(A, B, C)` 인덱스는 `A`, `A, B`, `A, B, C` 조건에서 정렬 구조를 그대로 탐색에 쓴다(최좌선 접두사).
- 선두 컬럼을 건너뛴 `WHERE price = 20000`은 price 값이 모든 category에 흩어져 있어 범위를 좁힐 수 없다. SELECT가 인덱스 밖 컬럼을 읽으면 `possible_keys`가 NULL인 풀 테이블 스캔이 된다. 성을 모르고 이름만으로 전화번호부를 찾는 셈이다.
- 그렇다고 `B`나 `C`만 있는 쿼리가 인덱스를 절대 쓰지 못하는 것은 아니다. 쿼리가 인덱스 컬럼만 읽으면 skip scan이 선두 컬럼의 값마다 range를 만들 수 있고(`Using index for skip scan`), index full scan과 ICP도 후보가 된다. skip scan은 단일 테이블, `GROUP BY`와 `DISTINCT` 없음, 인덱스 컬럼만 참조 같은 조건이 붙으므로 일반 규칙으로 기대하지 않는다([[MySQL-Advanced-Index-Access#Skip Scan|Skip Scan]]).

## 규칙 2: 등호는 앞에, 범위는 뒤에

- `WHERE category >= '패션' AND price = 20000`의 category 범위는 패션과 헬스뷰티 두 그룹을 고른다. 두 그룹의 price 정렬을 이어 붙이면 전체로는 정렬되어 있지 않으므로 B-tree가 price로 탐색 범위를 반씩 줄일 수 없다. 인덱스는 category 범위를 찾는 데 쓰이고 price는 찾은 항목을 거르는 조건으로 남는다. 인덱스를 타더라도 `EXPLAIN`의 `filtered`는 100% 미만으로 보인다.
- 반대로 `category = '패션'`처럼 등호로 그룹 하나가 고정되면 그 안의 price는 정렬이 보장되므로 뒤 컬럼의 범위 조건까지 탐색에 쓸 수 있다.
- MySQL 8.4 range optimizer는 비교 연산자가 `=`, `<=>`, `IS NULL`인 동안 다음 key part를 interval 구성에 더한다. `>`, `<`, `>=`, `<=`, `!=`, `<>`, `BETWEEN`, `LIKE`를 만나면 그 조건까지는 쓰지만 이후 key part는 고려하지 않는다. 문서 예시 `key_part1 = 'foo' AND key_part2 >= 10 AND key_part3 > 10`에서 key_part3은 interval을 만드는 데 쓰이지 않는다.
- 그래서 등호로 쓰일 컬럼을 범위 조건 컬럼보다 앞에 두고, 범위 조건은 마지막 key part에 한 번만 둔다. `order_status`처럼 값 종류가 적은 컬럼도 등호 조건이면 범위 조건인 `ordered_at`보다 앞에 둔다.
- 범위 뒤 key part의 조건이 버려지는 것은 아니다. ICP가 index entry 단계에서 평가해 base row 조회를 줄일 수 있지만(`Using index condition`), 읽는 index entry의 범위는 줄지 않는다([[SQL-Tuning-Terminology#동등 조건 vs 범위 조건|동등 조건과 범위 조건]]).

### key_len만 보고 판단하지 않는다

`key_len`은 탐색에 쓴 key part를 역산하는 단서다([[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]). 그러나 `>=`, `<=`, `BETWEEN` 같은 닫힌 범위 뒤의 등호 key part는 범위의 시작점이나 끝점에 붙어 `key_len`에 잡힌다. 이 key part는 경계 그룹 안에서만 범위를 줄일 뿐, 그 사이 그룹의 항목은 모두 읽게 한다.

MySQL 8.4.6 재현(20만 행, category 5종 균등)에서 `category >= 'fashion' AND price = 20000`에 인덱스를 강제하면 `key_len`은 두 컬럼 합인 86이었지만 TREE 출력의 범위는 `('fashion' <= category AND 20000 <= price)`로 끝이 열려 있었다. ICP를 끄고 센 index entry 읽기(`Handler_read_next`)는 111,922건이었고, 같은 결과를 내는 IN 목록은 1,248건을 읽었다. 열린 범위인 `category > 'books'`는 `key_len`이 category 몫인 82에서 멈췄다. 기본 설정의 옵티마이저는 이 범위 쿼리에 인덱스 대신 풀 스캔을 골랐다. 뒤 key part가 범위를 실제로 줄였는지는 TREE 형식의 range 표현과 `EXPLAIN ANALYZE`의 실제 행 수로 확인한다.

## 규칙 3: 정렬도 인덱스 순서를 따른다

- `WHERE category = '전자기기' AND price > 100000 ORDER BY price`는 category가 고정된 구간을 인덱스 순서로 읽으면 이미 price 순이므로 추가 정렬이 없다. `Extra`에 `Using filesort`가 나오지 않는다.
- ORDER BY 컬럼이 인덱스에 없거나, 인덱스의 연속되지 않은 부분이거나, 행을 찾는 인덱스와 정렬에 필요한 인덱스가 다르면 `Using filesort`가 붙는다. MySQL 8.4 문서가 인덱스 정렬을 쓰지 못하는 예로 드는 경우들이다.
- 방향은 key part끼리 같은 방향이면 역방향 스캔으로 풀 수 있고, `ORDER BY a DESC, b ASC`처럼 섞이면 같은 조합의 방향을 가진 인덱스가 필요하다([[MySQL-Advanced-Index-Access#Descending index|Descending index]]).
- WHERE와 ORDER BY에 전혀 다른 컬럼을 쓰는 조회가 대량 데이터에서 느리면 정렬 컬럼을 복합 인덱스 뒤쪽에 넣어 설계한다. filesort 제거는 복합 인덱스를 두는 핵심 이유 중 하나이고, `LIMIT`과 만나면 조기 종료까지 얻는다([[MySQL-Query-Pipeline-and-Sorting|MySQL 쿼리 파이프라인과 정렬]]).

## WHERE 절의 조건 순서는 무관하다

`category = ? AND price = ?`와 `price = ? AND category = ?`는 같은 계획을 낸다. 옵티마이저가 조건을 인덱스 key part에 맞춰 매칭하기 때문이다. 결과를 바꾸는 것은 인덱스 정의의 컬럼 순서와 각 조건이 등호인지 범위인지다.

## 범위 조건을 IN 목록으로 바꾸기

`(category, price)` 인덱스가 있는데 `category >= '패션' AND price = 20000`이 느리다면 규칙 2 위반으로 price가 거름 조건으로만 쓰이는 상황이다.

```sql
-- 변경 전: category 범위 뒤라 price가 탐색 범위를 줄이지 못한다
SELECT item_id, name FROM items
WHERE category >= '패션' AND price = 20000;

-- 변경 후: category 값마다 등호 범위를 만든다
SELECT item_id, name FROM items
WHERE category IN ('패션', '헬스뷰티') AND price = 20000;
```

- MySQL은 `col IN (v1, ..., vN)`을 `col = v1 OR ... OR col = vN`과 같은 N개의 등호 범위로 다룬다. category 값마다 price 정렬을 다시 쓸 수 있어 기존 인덱스의 두 컬럼이 모두 탐색에 쓰이고 `filtered`가 100%가 된다.
- 상품 상태, 유형 코드처럼 값 집합이 작고 안정된 컬럼에서 범위 조건 대신 쓸 만하다.
- 의미가 같은지 먼저 확인한다. IN 목록은 작성 시점의 값 집합이라 이후 새 category가 추가되면 범위 조건과 결과가 달라진다. 값 목록을 코드 상수나 참조 테이블 한 곳에서 관리하고 새 값 추가를 이 쿼리의 변경 조건으로 둔다.
- 값이 많아지면 추정과 메모리 비용이 커진다. 등호 범위가 `eq_range_index_dive_limit`(8.4 기본 200)개 이상이면 옵티마이저는 index dive 대신 덜 정확한 index statistics로 행 수를 추정한다. range 분석에 필요한 메모리가 `range_optimizer_max_mem_size`(기본 8,388,608바이트)를 넘을 것 같으면 range 접근을 포기하고 풀 테이블 스캔을 포함한 다른 방법을 고르며 Warning 3170을 남긴다. 목록 크기를 바꿀 때마다 실행 계획을 다시 본다.
- IN 목록이 두 값 이상이면 뒤 컬럼은 값별 구간 안에서만 정렬되어 있다. 같은 쿼리에 `ORDER BY price`를 붙이면 filesort가 다시 필요할 수 있다(8.4.6 재현에서 `category IN (...) AND price > ? ORDER BY price`는 filesort를 썼다).

### 장애 대응 순서

- 느린 쿼리가 장애로 번졌다면 먼저 서비스를 살리고, 불을 끈 직후 근본 원인을 찾는다.
- 응급 조치로 등호 컬럼을 앞에 둔 임시 인덱스 `(price, category)`를 추가하면 `price = 20000` 구간 안에서 category 범위를 탐색할 수 있다. 운영 중 추가의 잠금과 복제 지연 위험은 [[Index#인덱스 추가의 운영 리스크|인덱스 추가의 운영 리스크]]를 따른다.
- 인덱스를 계속 더하면 용량, 관리 비용과 쓰기 비용이 쌓인다. 기존 인덱스를 먼저 살리는 원칙에 따라 IN 목록 같은 쿼리 수정으로 근본 원인을 고친 뒤, 임시 인덱스는 invisible 전환으로 영향을 확인하고 걷어 낸다([[Index-Write-Cost-and-Cleanup#안전하게 제거하는 절차|안전하게 제거하는 절차]]).

## 여러 느린 쿼리를 최소 인덱스로 묶기

쇼핑몰 items 테이블이 커지면서 다음 세 조회가 모두 풀 테이블 스캔으로 느려졌다.

```sql
SELECT ... FROM items WHERE category = ? AND is_active = TRUE;
SELECT ... FROM items WHERE category = ? AND is_active = TRUE ORDER BY stock_quantity DESC;
SELECT ... FROM items WHERE category = ? AND is_active = TRUE AND stock_quantity >= ?;
```

쿼리마다 인덱스를 만들지 않고 여러 쿼리를 종합해 인덱스 하나로 풀 수 있는지 먼저 본다.

```sql
CREATE INDEX idx_items_category_active_stock
    ON items (category, is_active, stock_quantity DESC);
```

- 모든 쿼리가 공유하는 등호 조건 category와 is_active를 앞에 둔다.
- 범위 조건과 정렬에 함께 쓰이는 stock_quantity를 마지막에 두고 ORDER BY 방향까지 맞춘다. 역방향 스캔으로도 DESC 정렬을 풀 수 있지만, MySQL 8.4 문서는 descending index를 정방향으로 스캔하는 편이 더 효율적이라고 설명한다.
- 세 쿼리 모두 풀 스캔이 사라지고, 정렬 쿼리는 filesort 없이 인덱스 순서로 읽는다.
- is_active는 값이 둘뿐인 낮은 카디널리티 컬럼이라 단독 인덱스로는 약하지만, 복합 인덱스 안에서는 뒤 컬럼의 정렬과 범위를 살려 주는 등호 key part로 제 역할을 한다. 카디널리티만으로 순서를 정하지 않는 이유다([[Index#카디널리티 (Cardinality)|카디널리티]]).
- 검증 전에는 `SHOW INDEX FROM items;`로 기존 인덱스를 확인하고 앞선 실험의 인덱스를 지운다. 다른 인덱스가 실행 계획을 가린다.

## 추가 전 판단

새 인덱스는 느린 쿼리를 없애는 가장 쉬운 수단이라 쉽게 쌓인다. 핵심 조회 시나리오를 나열하고, 제약이 이미 만든 인덱스를 확인한 뒤 빠진 것만 더한다. MySQL은 PK와 UNIQUE 제약을 인덱스로 구현하고, FK 컬럼을 같은 순서의 선두로 둔 인덱스가 없으면 자동으로 만든다.

| 시나리오 | 조건 | 인덱스 출처 | 확인할 것 |
|---|---|---|---|
| 로그인, 아이디와 이메일 중복 확인 | `login_id = ?`, `email = ?` | UNIQUE 제약 | 행이 늘어도 1행 탐색. UNIQUE가 없으면 직접 추가 |
| 회원의 주문 목록 | `member_id = ?` | FK 제약이 만든 인덱스 | FK를 쓰지 않으면 직접 추가. 최신순 정렬의 filesort가 커지면 정렬 컬럼을 붙인 복합 인덱스 검토 |
| 상품명 검색 | `product_name LIKE ?` | 일반 인덱스 추가 | `'노트북%'`만 range 후보. `'%노트북%'`은 FULLTEXT나 검색 엔진 검토([[OpenSearch-vs-RDB-Search|RDB 검색의 한계]]) |
| 관리자의 기간별 취소 주문 | `order_status = ? AND ordered_at BETWEEN ? AND ?` | 복합 `(order_status, ordered_at)` | 값 종류가 적어도 등호인 `order_status`를 앞에(규칙 2) |
| 회원의 최근 3개월 배송 완료 주문 | `member_id = ? AND order_status = ? AND ordered_at >= ?` | 기존 `member_id` 인덱스 | 아래 과잉 최적화 판단 |

`order_status`와 `ordered_at`에 단일 인덱스가 따로 있으면 옵티마이저는 보통 더 적게 읽을 하나만 고른다. 보조 인덱스의 Index Merge intersection은 각 인덱스의 모든 key part가 등호일 때 후보가 되므로 이 범위 조건에는 쓰이지 않는다.

마지막 시나리오에는 `(member_id, order_status, ordered_at)`을 떠올리기 쉽다. 그러나 `member_id`만으로 회원 한 명의 주문 수백 건 이하로 좁혀진다면 옵티마이저는 기존 인덱스를 고를 가능성이 높고, 새 인덱스의 저장 공간과 쓰기 비용이 작은 조회 이득보다 클 수 있다.

- 데이터 분포: 선행 조건으로 거른 뒤 남는 행이 수백 건 이하면 기존 인덱스로 충분할 수 있다. 수천 건 이상이거나 B2B처럼 한 사용자가 대량 주문을 만들면 복합 인덱스가 효과적일 수 있고, 작은 지연에도 민감한 대규모 서비스는 캐시도 함께 검토한다.
- 쓰기 빈도: 주문처럼 삽입과 갱신이 잦은 테이블은 읽기 개선이 쓰기 손실보다 확실할 때만 추가한다.
- 측정: 운영 중이면 slow query log로 병목을 찾고 `EXPLAIN`으로 확인한다([[MySQL-Slow-Query-Diagnosis|Slow Query 진단]]). 오픈 전 기능은 개발 환경에 대표 데이터와 인덱스를 넣어 비교하고, 확실히 예상되는 경우가 아니면 짐작으로 미리 만들지 않는다.
- 순서: 실행 빈도, 기존 인덱스의 좌측 접두사로 해결되는지, 쓰기 비용을 감수할 가치가 있는지 차례로 본다. 운영 중 무작정 더하면 인덱스가 10개, 15개로 늘어 쓰기가 무너진다.

모든 조회에 인덱스를 거는 것이 아니라 병목을 만드는 느린 쿼리를 중심으로 설계하고, 사용자가 느리다고 말하기 전에 slow query log, 요청 지연 모니터링과 자동 경보로 먼저 발견한다. 운영 중 추가의 잠금, 복제 지연과 체크리스트는 [[Index#인덱스 추가의 운영 리스크|인덱스 추가의 운영 리스크]]를 따른다.

## 설계 절차

1. 느린 쿼리를 모아 공통 등호 조건을 찾고, 기존 인덱스의 좌측 접두사로 해결되는지 먼저 본다.
2. 등호 컬럼을 앞, 범위 컬럼을 뒤에 두고 정렬 컬럼과 방향을 인덱스 순서에 맞춘다.
3. 반환 컬럼까지 넣는 covering은 호출이 잦은 쿼리에 한정한다. 컬럼을 과하게 더하면 인덱스 크기와 쓰기 비용이 커진다([[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리]]).
4. `EXPLAIN`의 `type`, `key`, `key_len`, `filtered`, `Extra`와 `EXPLAIN ANALYZE`의 실제 행 수로 확인한다.

세 규칙은 출발점이지 절대 규칙이 아니다. skip scan, covering, 데이터 분포와 쓰기 비용에 따라 실제 선택은 달라진다.

## 출처

- [MySQL 8.4 Reference Manual, Range Optimization](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4 Reference Manual, ORDER BY Optimization](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)
- [MySQL 8.4 Reference Manual, Descending Indexes](https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html)
- [MySQL 8.4 Reference Manual, Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 Reference Manual, Index Merge Optimization](https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html)
- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [인프런, 김영한, 복합 인덱스1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328800)
- [인프런, 김영한, 복합 인덱스2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328801)
- [인프런, 김영한, 복합 인덱스3](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328802)
- [인프런, 김영한, 복합 인덱스 정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328803)
- [인프런, 김영한, 인덱스 설계 가이드라인](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328804)
- [인프런, 김영한, 문제와 풀이 (인덱스2 섹션)](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328806)
- [인프런, 김영한, 정리 (인덱스2 섹션)](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328807)
- [인프런, 김영한, 인덱스 설계 - 실습](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347682)
- [인프런, 김영한, 쇼핑몰 기능 확인1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347687)
- [인프런, 김영한, 정리 (물리적 모델링 실습)](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347689)

## 관련 문서

- [[Index|Index]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]
- [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]
- [[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 쿼리 파이프라인과 정렬]]
