---
tags: [database, rdbms, sql, tuning, terminology]
status: done
category: "Data & Storage - RDB"
aliases: ["SQL Tuning Terminology", "SQL 튜닝 용어"]
---

# SQL · 튜닝 용어

옵티마이저·실행 계획·통계 정보 분야에서 자주 쓰이는 용어를 한 곳에 정리. 면접·튜닝 미팅에서 같은 용어를 정확히 같은 의미로 쓰기 위한 레퍼런스.

## 옵티마이저 · 실행

### 옵티마이저 (Optimizer)
SQL 문을 받아 **여러 실행 계획 중 가장 비용이 낮은 것을 선택**하는 컴포넌트. MySQL·PostgreSQL은 **비용 기반(Cost-Based Optimizer, CBO)**.

### 실행 계획 (Execution Plan)
옵티마이저가 선택한 **단계별 작업 순서**. `EXPLAIN`으로 확인. 어떤 인덱스·조인 알고리즘·정렬 방식을 쓸지 명세.

### 통계 정보 (Statistics)
옵티마이저가 비용을 계산할 때 참고하는 **테이블·인덱스·컬럼의 메타데이터**. 행 수, 페이지 수, 카디널리티, 히스토그램 등. 데이터 분포가 크게 바뀌면 `ANALYZE TABLE`로 갱신 필요.

### 히스토그램 (Histogram)
컬럼 값의 **분포**를 표현한 통계. 단순 카디널리티만으론 알 수 없는 편향(skew)을 잡아내 옵티마이저가 더 정확한 행 추정.

### 힌트 (Hint)
옵티마이저의 자동 선택을 **수동으로 강제**. MySQL: `STRAIGHT_JOIN`, `USE INDEX`, `FORCE INDEX`, `IGNORE INDEX`. 옵티마이저가 잘못된 계획을 선택할 때 임시 처방.

## 접근 방식 (Scan)

### 테이블 풀 스캔 (Table Full Scan)
인덱스 없이 **테이블 전체를 처음부터 끝까지** 읽음. 작은 테이블이거나 결과가 전체의 25% 이상이면 오히려 효율적.

### 인덱스 풀 스캔 (Index Full Scan)
인덱스 전체를 **처음부터 끝까지** 읽음. 테이블 풀 스캔보다 가벼움 (인덱스가 더 작으니).

### 인덱스 레인지 스캔 (Index Range Scan)
인덱스의 **시작점만 찾고 그 뒤로 순차 읽기**. `WHERE x > 100`, `BETWEEN`, `LIKE 'foo%'` 등에 적용. 가장 흔한 효율적 패턴.

### 인덱스 고유 스캔 (Index Unique Scan)
유니크 인덱스로 **딱 한 행** 찾기. PK 조회의 가장 빠른 형태.

### 인덱스 루스 스캔 (Index Loose Scan)
인덱스의 **앞부분만 건너뛰며 읽기**. GROUP BY 시 각 그룹의 첫 행만 필요할 때.

### 인덱스 병합 스캔 (Index Merge)
**여러 인덱스를 동시에 사용**해 결과를 합치거나 교집합. 단일 복합 인덱스보다 비효율적인 경우가 많아 주의.

### 시퀀셜 액세스 / 랜덤 액세스
- **시퀀셜**: 물리적으로 인접한 페이지를 차례대로 읽음. 디스크 헤드 이동 최소화. **multi-page read**로 한 번에 여러 페이지를 읽어 throughput 최대화. 풀 스캔에서 활용
- **랜덤**: 임의 페이지에 점프해 접근. 디스크 헤드 이동·캐시 미스 비용. 한 번에 한 페이지만 처리 → 다중 페이지 효율 낮음

인덱스 레인지 스캔 후 실제 데이터를 읽으러 가는 것은 **랜덤 액세스** → 데이터가 많으면 풀스캔보다 느려질 수 있음 (그래서 25% 룰).

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
- **높음 (선택도 0.5)** = 절반 반환 → 인덱스 무용

매번 조건절의 결과 건수를 미리 계산할 수 없어서 옵티마이저는 **변형된 선택도 = 1 / DISTINCT(컬럼)**를 사용한다. 즉 컬럼의 **고유 값 수의 역수**로 추정. 데이터 분포가 균등하다는 가정.

### 필터 비율 (filtered)
EXPLAIN의 **`filtered`** 컬럼. 액세스 조건으로 가져온 데이터 중 필터 조건 통과 비율(%). 100에 가까울수록 효율적, 1~10이면 **불필요한 행을 너무 많이 읽고 있다**는 신호 → 필터 조건을 액세스 조건으로 옮길 수 있는지 검토.

### 카디널리티 (Cardinality)
**예상되는 결과 행 수**. 통계상 선택도 × 전체 건수.
혹은 **컬럼의 고유 값 수**. 두 의미를 문맥으로 구분.

높은 카디널리티 = 다양한 값 = 인덱스 효율 좋음.

### 동등 조건 vs 범위 조건
- **동등 (`=`, `IN`, `IS NULL`)**: 인덱스 활용 효율 최대
- **범위 (`<`, `>`, `BETWEEN`, `LIKE 'foo%'`)**: 인덱스 활용 가능하지만 범위 이후 컬럼은 인덱스 사용 불가

복합 인덱스 `(A, B, C)`에서 `WHERE A = 1 AND B > 10 AND C = 5`라면 C는 인덱스 활용 안 됨 (B가 범위라서).

## 조인

조인 종류와 알고리즘은 [[SQL-Joins|SQL Joins]] 문서 참고. 핵심 키워드:
- **종류**: INNER, LEFT/RIGHT/FULL OUTER, CROSS, NATURAL, USING
- **드라이빙 vs 드리븐**: 먼저 접근하는 vs 그 결과로 검색하는 테이블
- **알고리즘**: Nested Loop, Block Nested Loop, Batch Key Access, Hash, Sort-Merge

## 서브쿼리

### 위치별 분류
- **스칼라 서브쿼리** — SELECT 절. **1행 1열** 단일 값 반환. 집계함수 자주 사용
- **인라인 뷰** — FROM 절. 임시 테이블 역할 (메모리 또는 디스크)
- **중첩 서브쿼리** — WHERE 절. `IN`, `EXISTS`, 비교 연산자와 결합

### 메인쿼리 관계성
- **비상관 (Non-correlated)** — 서브쿼리가 **독립적으로 1회 실행** 후 결과를 메인쿼리에 전달. 옵티마이저가 뷰 병합으로 단일 쿼리로 재작성 가능
- **상관 (Correlated)** — 서브쿼리가 **메인쿼리 행마다 재실행** (메인쿼리의 컬럼 참조). N번 실행되므로 비쌈

### 반환 결과별 분류
- **단일행** — 결과 1건. `WHERE col = (SELECT MAX(...) ...)`
- **다중행** — 여러 건. `WHERE col IN (SELECT ... GROUP BY ...)` — `IN`, `ANY`, `ALL` 필요
- **다중열** — 여러 컬럼. `WHERE (a, b) IN (SELECT a, b ...)` — 튜플 비교

## 결과 정렬·중복

### Using filesort
EXPLAIN의 `Extra`. 인덱스로 정렬을 해결 못 해 **추가 정렬 작업** 발생. 메모리 또는 디스크에서 sort_buffer로 처리. 결과셋이 크면 디스크 정렬 → 매우 느림.

### Using temporary
중간 결과를 **임시 테이블**에 저장. GROUP BY·DISTINCT·UNION 등에서 흔함. 메모리 임시 테이블이 부족하면 디스크 임시 테이블로 강등 → 성능 급락.

`Using temporary` + `Using filesort`가 EXPLAIN에 함께 나오면 튜닝 우선순위 1순위.

## Collation · 캐릭터셋

### 캐릭터셋 vs 콜레이션
- **캐릭터셋(Character Set)**: 데이터를 **어떻게 저장할지** 결정. UTF-8, EUC-KR, ASCII 등
- **콜레이션(Collation)**: 같은 캐릭터셋의 값을 **어떻게 비교·정렬할지** 결정. 대소문자 구분, 악센트 구분, 한국어 사전순 등

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

- 카디널리티와 선택도의 정확한 정의·차이
- 액세스 조건 vs 필터 조건의 차이가 성능에 미치는 영향
- 인덱스 레인지 스캔이 25% 이상이면 풀스캔이 더 빠른 이유 (랜덤 I/O)
- `Using filesort`·`Using temporary`가 보일 때 어떻게 튜닝할지
- 옵티마이저가 **선택도를 어떻게 추정**하는가 (`1/DISTINCT`)
- 상관 서브쿼리가 비싼 이유 (메인쿼리 행마다 재실행)
- 캐릭터셋과 콜레이션의 차이, JOIN 시 콜레이션 불일치가 일으키는 문제
- `utf8` vs `utf8mb4` 차이 (이모지 지원)

## 출처
- [yoonseon — 논리적인 SQL 개념 용어](https://yoonseon.tistory.com/143)
- [yoonseon — 개념적인 튜닝 용어](https://yoonseon.tistory.com/144)

## 관련 문서
- [[Index|Index]]
- [[Execution-Plan|Execution Plan]]
- [[Covering-Index|Covering Index]]
- [[SQL|SQL 기초]]
