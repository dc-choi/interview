---
tags: [database, rdbms, sql, tuning, terminology]
status: done
category: "Data & Storage - RDB"
aliases: ["SQL Tuning Terminology", "SQL 튜닝 용어"]
---

# SQL, 튜닝 용어

옵티마이저, 실행 계획, 통계 정보 분야에서 자주 쓰이는 용어를 한 곳에 정리. 면접, 튜닝 미팅에서 같은 용어를 정확히 같은 의미로 쓰기 위한 레퍼런스.

## 옵티마이저, 실행

### 옵티마이저 (Optimizer)
SQL 문을 받아 **여러 실행 계획 중 가장 비용이 낮은 것을 선택**하는 컴포넌트. MySQL, PostgreSQL은 **비용 기반(Cost-Based Optimizer, CBO)**.

### 실행 계획 (Execution Plan)
옵티마이저가 선택한 **단계별 작업 순서**. `EXPLAIN`으로 확인. 어떤 인덱스, 조인 알고리즘, 정렬 방식을 쓸지 명세.

### 통계 정보 (Statistics)
옵티마이저가 비용을 계산할 때 참고하는 **테이블, 인덱스, 컬럼의 메타데이터**. 행 수, 페이지 수, 카디널리티, 히스토그램 등. 데이터 분포가 크게 바뀌면 `ANALYZE TABLE`로 갱신 필요.

### 히스토그램 (Histogram)
컬럼 값의 **분포**를 표현한 통계. 단순 카디널리티만으론 알 수 없는 편향(skew)을 잡아내 옵티마이저가 더 정확한 행 추정.

### 힌트 (Hint)
옵티마이저가 고려할 계획이나 join 순서에 제약을 준다. MySQL은 `JOIN_ORDER`, `USE_INDEX`, `NO_INDEX` 같은 optimizer hint와 index hint를 제공한다. 문법상 허용돼도 충돌하거나 적용할 수 없으면 무시될 수 있으므로 통계와 schema를 먼저 점검하고 실제 계획을 확인한다.

## 접근 방식 (Scan)

### 테이블 풀 스캔 (Table Full Scan)
인덱스 대신 **테이블 전체를 처음부터 끝까지** 읽음. 작은 테이블이나 많은 행을 반환하는 쿼리에서는 인덱스 조회보다 효율적일 수 있다. 보편적인 비율 임계값은 없으며 row 폭, covering 여부, clustering, cache와 I/O 비용에 따라 달라진다.

### 인덱스 풀 스캔 (Index Full Scan)
인덱스 전체를 **처음부터 끝까지** 읽음. 필요한 컬럼을 덮는 secondary index가 clustered row보다 좁다면 테이블 풀 스캔보다 가벼울 수 있다.

### 인덱스 레인지 스캔 (Index Range Scan)
인덱스에서 범위의 시작점을 찾고 종료 조건까지 읽는다. `WHERE x > 100`, `BETWEEN`, prefix `LIKE` 등에 적용될 수 있다. 범위가 넓고 non-covering row lookup이 많으면 full scan보다 비쌀 수 있다.

### 인덱스 고유 스캔 (Index Unique Scan)
유니크 인덱스로 **딱 한 행** 찾기. PK 조회의 가장 빠른 형태.

### 인덱스 루스 스캔 (Index Loose Scan)
인덱스의 **앞부분만 건너뛰며 읽기**. GROUP BY 시 각 그룹의 첫 행만 필요할 때.

### 인덱스 병합 스캔 (Index Merge)
한 table의 여러 index range 결과를 `intersection`, `union`, `sort_union`으로 결합한다. 선택됐다는 이유만으로 나쁜 계획은 아니며, 실제 조건과 정렬을 지원하는 복합 인덱스 대안도 함께 비교한다.

### 시퀀셜 액세스 / 랜덤 액세스
- **시퀀셜 접근**: 다음 page를 예측하며 넓은 범위를 읽는다. full scan은 read-ahead의 이점을 얻을 수 있지만 물리적 연속성과 cache 상태에 영향을 받는다.
- **랜덤 접근**: 떨어진 page를 반복해 찾는다. non-covering secondary scan의 clustered row lookup에서 누적되기 쉽다.

index leaf는 key 순서로 읽을 수 있고 MRR은 base row key를 모아 접근 순서를 개선한다. access 방식과 물리 I/O를 일대일 대응하거나 고정 손익분기점을 두지 않는다.

## 조건 (Condition)

### 액세스 조건 (Access Condition)
인덱스를 활용해 **데이터를 검색하는 조건**. 인덱스 트리에서 직접 처리.
예: `WHERE id = 100` (인덱스 키)

### 필터 조건 (Filter Condition)
검색된 데이터에서 **추가로 불필요한 행을 제거**하는 조건. 인덱스로 좁힌 뒤 후처리.
예: 인덱스로 `id = 100` 찾은 뒤 `WHERE memo LIKE '%foo%'`

EXPLAIN에서 **`Using where`**가 필터 조건이 적용됐다는 신호. 액세스 조건 비율이 높을수록 효율적.

### 선택도 (Selectivity)
조건으로 걸러지는 행의 비율. `선택도 = 선택된 건수 / 전체 건수`.
- **낮음 (선택도 0.001)** = 적은 행 반환 → 인덱스 효과 큼
- **높음 (선택도 0.5)** = 많은 행 반환 → non-covering index의 이점이 줄 수 있음

균등 분포를 가정한 equality 추정에는 distinct count가 쓰일 수 있지만 실제 optimizer는 index statistics, index dive, histogram과 조건별 규칙도 사용한다. `1 / DISTINCT`를 모든 predicate의 공식으로 적용하지 않는다.

### 필터 비율 (filtered)
EXPLAIN의 **`filtered`** 컬럼. 해당 table에서 추정한 rows 중 table condition을 통과할 비율이다. `rows * filtered / 100`으로 다음 table에 전달할 행을 근사한다. 낮다는 사실만으로 비효율이라고 단정하지 말고 실제 읽은 rows, 조건 평가 비용과 다음 join의 loops를 본다.

### 카디널리티 (Cardinality)
문맥에 따라 **예상 결과 행 수** 또는 **컬럼의 distinct 값 수**를 뜻한다. distinct 값이 많아도 분포가 치우치거나 query가 넓은 범위를 읽으면 인덱스 효율을 보장하지 않는다.

### 동등 조건 vs 범위 조건
- **동등 (`=`, `IN`, `IS NULL`)**: 연속된 key part의 범위를 좁히는 데 유리한 경우가 많다.
- **범위 (`<`, `>`, `BETWEEN`, prefix `LIKE`)**: range interval을 만든 뒤 뒤 key part가 interval을 더 줄이지 못할 수 있다.

복합 인덱스 `(A, B, C)`에서 `A = 1 AND B > 10 AND C = 5`라면 보통 `A, B`가 scan interval을 정한다. `C`도 ICP로 index entry에서 평가하거나 covering에 쓰일 수 있으므로 "인덱스에서 전혀 사용하지 않는다"고 단정하지 않는다.

## 조인

조인 종류와 알고리즘은 [[SQL-Joins|SQL Joins]] 문서 참고. 핵심 키워드:
- **종류**: INNER, LEFT/RIGHT/FULL OUTER, CROSS, NATURAL, USING
- **드라이빙 vs 드리븐**: 먼저 접근하는 vs 그 결과로 검색하는 테이블
- **알고리즘**: Nested Loop, Block Nested Loop, Batch Key Access, Hash, Sort-Merge
- 물리 알고리즘과 지원 범위는 DBMS/version별로 다르므로 [[MySQL-Join-Optimization|MySQL 조인 최적화]]처럼 대상 문서를 확인

## 서브쿼리

### 위치별 분류
- **스칼라 서브쿼리** — SELECT 절. **1행 1열** 단일 값 반환. 집계함수 자주 사용
- **인라인 뷰** — FROM 절. 임시 테이블 역할 (메모리 또는 디스크)
- **중첩 서브쿼리** — WHERE 절. `IN`, `EXISTS`, 비교 연산자와 결합

### 메인쿼리 관계성
- **비상관 (Non-correlated)** — 외부 쿼리 컬럼을 참조하지 않는다. 물리적으로 한 번만 실행된다고 보장되지는 않으며 optimizer가 materialization, merge나 semijoin을 선택할 수 있다.
- **상관 (Correlated)** — 외부 쿼리 컬럼을 참조한다. 논리적으로 외부 행에 의존하지만 optimizer가 decorrelation이나 semijoin으로 바꿀 수 있으므로 행마다 독립 실행된다고 단정하지 않는다.

### 반환 결과별 분류
- **단일행** — 결과 1건. `WHERE col = (SELECT MAX(...) ...)`
- **다중행** — 여러 건. `WHERE col IN (SELECT ... GROUP BY ...)` — `IN`, `ANY`, `ALL` 필요
- **다중열** — 여러 컬럼. `WHERE (a, b) IN (SELECT a, b ...)` — 튜플 비교

## 결과 정렬, 중복

### Using filesort
EXPLAIN의 `Extra`. index 순서만으로 결과를 만들지 못해 **추가 정렬 작업**이 발생한다. memory buffer를 사용하고 필요하면 disk temporary file을 쓰지만, 표시 자체가 disk sort나 느린 query를 뜻하지 않는다.

### Using temporary
중간 결과를 **internal temporary table**에 저장. GROUP BY, DISTINCT, UNION 등에서 흔하다. memory 한도를 넘으면 disk table로 전환될 수 있으므로 실제 입력 크기와 spill을 확인한다.

`Using temporary`와 `Using filesort`가 함께 보이면 중간 결과 크기와 실제 시간을 확인할 신호다. 작은 결과에서는 정상일 수 있으므로 표식만으로 튜닝 우선순위를 정하지 않는다.

## Collation, 캐릭터셋

### 캐릭터셋 vs 콜레이션
- **캐릭터셋(Character Set)**: 데이터를 **어떻게 저장할지** 결정. UTF-8, EUC-KR, ASCII 등
- **콜레이션(Collation)**: 같은 캐릭터셋의 값을 **어떻게 비교, 정렬할지** 결정. 대소문자 구분, 악센트 구분, 한국어 사전순 등

### MySQL 콜레이션 예시
| 콜레이션 | 비교 규칙 | 정렬 결과 |
|---|---|---|
| `utf8mb4_bin` | 바이트 단위 비교 (대소문자 구분) | A → B → a → b |
| `utf8mb4_general_ci` | case-insensitive | A = a → B = b |
| `utf8mb4_0900_ai_ci` | 8.0+ 기본, accent-insensitive + case-insensitive | é = e → á = a |

`_ci` = case-insensitive, `_cs` = case-sensitive, `_bin` = binary.

### 적용 범위 (계층)
콜레이션은 **DB → 테이블 → 컬럼** 순으로 우선 적용된다.

```sql
ALTER DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE products MODIFY name VARCHAR(100) COLLATE utf8mb4_bin;
```

테이블이 `utf8mb4_general_ci`라도 컬럼 단위로 `utf8mb4_bin`을 명시하면 그 컬럼만 바이너리 비교.

### 흔한 함정
- **JOIN 시 콜레이션 불일치** → 인덱스 무력화 + 풀스캔. 두 테이블의 같은 컬럼 콜레이션은 반드시 일치
- **대소문자 검색이 안 됨** — `WHERE name = 'Apple'`이 `'apple'`도 매칭 → CI 콜레이션 때문. 정확 매칭 필요하면 컬럼/쿼리 단위로 `_bin` 또는 `BINARY` 키워드 사용
- **이모지 깨짐** — `utf8`(MySQL의 3바이트 UTF-8)은 4바이트 문자(이모지 등) 미지원. **`utf8mb4`** 사용 필수

## 면접 체크포인트

- 카디널리티와 선택도의 정확한 정의, 차이
- 액세스 조건 vs 필터 조건의 차이가 성능에 미치는 영향
- 인덱스와 풀 스캔의 손익분기점이 고정 비율이 아닌 이유
- `Using filesort`, `Using temporary`가 보일 때 어떻게 튜닝할지
- 옵티마이저가 **선택도를 어떻게 추정**하는가 (`1/DISTINCT`)
- 상관 서브쿼리의 논리적 의존성과 optimizer의 decorrelation 가능성
- 캐릭터셋과 콜레이션의 차이, JOIN 시 콜레이션 불일치가 일으키는 문제
- `utf8` vs `utf8mb4` 차이 (이모지 지원)

## 출처
- [yoonseon — 논리적인 SQL 개념 용어](https://yoonseon.tistory.com/143)
- [yoonseon — 개념적인 튜닝 용어](https://yoonseon.tistory.com/144)
- [MySQL 8.4 Reference Manual, Optimizing Subqueries](https://dev.mysql.com/doc/refman/8.4/en/subquery-optimization.html)
- [MySQL 8.4 Reference Manual, Semijoin and Antijoin Transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html)
- [MySQL 8.4 Reference Manual, EXPLAIN Output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4 Reference Manual, Range Optimization](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4 Reference Manual, Optimizer Statistics](https://dev.mysql.com/doc/refman/8.4/en/optimizer-statistics.html)

## 관련 문서
- [[Index|Index]]
- [[Execution-Plan|Execution Plan]]
- [[Covering-Index|Covering Index]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 파이프라인과 정렬]]
- [[SQL|SQL 기초]]
