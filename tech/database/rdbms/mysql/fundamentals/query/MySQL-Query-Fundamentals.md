---
tags: [database, rdbms, mysql, sql, query]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Query Fundamentals", "MySQL 조회 기본기"]
---

# MySQL 조회 기본기

SQL은 원하는 결과를 선언하고 MySQL 옵티마이저가 실제 실행 계획을 고르는 언어다. 문법상 같은 결과를 내는 쿼리도 데이터 분포, 인덱스와 버전에 따라 실행 방식이 달라지므로 결과 의미와 실행 계획을 분리해서 본다.

## SELECT를 읽는 순서

다음 순서는 쿼리의 결과를 추론하기 위한 논리 모델이다. 실제 물리 실행 순서는 옵티마이저가 바꿀 수 있다.

1. `FROM`과 `JOIN`으로 입력 행 집합을 만든다.
2. `WHERE`로 집계 전 행을 거른다.
3. `GROUP BY`로 그룹을 만들고 집계한다.
4. `HAVING`으로 집계 결과를 거른다.
5. `SELECT`로 반환할 식과 별칭을 정한다.
6. `DISTINCT` 또는 집합 연산으로 중복을 처리한다.
7. `ORDER BY`로 결과 순서를 정하고 `LIMIT`으로 범위를 자른다.

`ORDER BY`가 없으면 반환 순서는 보장되지 않는다. 페이지네이션에는 중복되지 않는 마지막 정렬 키까지 넣는다.

```sql
SELECT business_id, name, floor
FROM businesses
WHERE section_id = :section_id
ORDER BY name ASC, business_id ASC
LIMIT 20;
```

- 운영 API에서는 필요한 컬럼만 투영한다. `SELECT *`는 스키마 변경에 응답 모양과 전송량이 끌려간다.
- 큰 `OFFSET`은 앞의 행을 읽고 버리는 비용이 커진다. 깊은 페이지는 [[Pagination-Optimization|커서 페이지네이션]]을 검토한다.
- 별칭은 결과 표현일 뿐 원본 컬럼을 바꾸지 않는다.

## 값, NULL과 비교 규칙

SQL 조건은 `TRUE`, `FALSE`, `UNKNOWN`의 3값 논리다. `NULL`은 값이 없거나 알려지지 않았음을 나타내며 `= NULL`이 아니라 `IS NULL`로 검사한다. `COUNT(column)`은 NULL을 제외하고 `COUNT(*)`는 행을 센다.

```sql
SELECT id
FROM businesses
WHERE closed_at IS NULL;
```

`NOT IN`의 하위 결과에 NULL이 섞이면 비교가 `UNKNOWN`이 되어 예상과 달리 아무 행도 반환하지 않을 수 있다. nullable 컬럼의 차집합은 상관 조건을 명시한 `NOT EXISTS`가 의도를 드러내기 쉽다.

문자열의 대소문자와 악센트 비교 규칙은 연산자 자체가 아니라 컬럼과 식의 collation이 정한다. 필요한 비교 규칙을 스키마에 선언하고, 국소적으로 바꿔야 할 때만 `COLLATE`를 사용한다. 숫자와 문자열의 암묵 변환에 기대지 말고 `CAST`와 입력 검증으로 타입을 명시한다. 변환 규칙과 인덱스를 잃는 방향은 [[MySQL-Query-Fundamentals-Functions#문자열과 숫자의 암묵 변환|문자열과 숫자의 암묵 변환]]에 둔다.

`AND`는 `OR`보다 먼저 평가되지만 복합 조건은 독자가 우선순위를 외우게 하지 않는다. 의도한 논리 그룹을 괄호로 묶고 경계값, NULL 조합을 테스트한다.

## 함수와 날짜 시간

내장 함수의 경계 규칙은 [[MySQL-Query-Fundamentals-Functions|MySQL 내장 함수와 암묵 변환]]으로 분리했다. 반올림과 절사, 1부터 세는 문자열 위치와 NULL 전파, 월말 보정과 날짜 차이, 세션 time zone을 따르는 `NOW()`를 다룬다. 함수를 인덱스 컬럼에 씌운 조건은 일반 인덱스 탐색을 방해할 수 있으므로 컬럼은 그대로 두고 상수 쪽을 계산하며, 실행 계획을 보고 범위 조건이나 함수 기반 대안을 선택한다.

## 집계와 그룹

```sql
SELECT section_id, COUNT(*) AS business_count
FROM businesses
WHERE status = 'OPEN'
GROUP BY section_id
HAVING COUNT(*) >= 3;
```

- `WHERE`는 집계 입력을 줄이고 `HAVING`은 만들어진 그룹을 거른다.
- 단순 중복 제거가 목적이면 `DISTINCT`, 그룹별 계산이 목적이면 `GROUP BY`를 사용한다. `DISTINCT`는 함수가 아니라 SELECT modifier이므로 `DISTINCT column`으로 쓰며, 어느 쪽이 더 빠르다고 단정하지 않고 실행 계획을 확인한다.
- `GROUP BY`가 결과를 정렬한다는 전제를 두지 않는다.
- 기본 `ONLY_FULL_GROUP_BY`에서는 비집계 컬럼이 그룹 키에 없고 함수 종속성도 인정되지 않으면 쿼리를 거부한다. 대응 방법은 [[MySQL-SQL-Mode|MySQL SQL Mode]]에 둔다.
- `WITH ROLLUP`은 소계와 총계 행을 추가하므로 NULL이 원본 값인지 집계 표식인지 구분해야 한다.

## COUNT 비용과 결과 계약

InnoDB는 동시 트랜잭션마다 보이는 행이 다를 수 있어 테이블의 정확한 전역 행 수를 저장하지 않는다. 조건 없는 `COUNT(*)`도 현재 트랜잭션에 보이는 index record를 세며, 작은 secondary index가 있으면 이를 순회한다. `COUNT(*)`와 `COUNT(1)`은 InnoDB에서 같은 방식으로 처리되므로 행 수라는 의도가 선명한 `COUNT(*)`를 쓴다.

### COUNT(column)의 성능 함정

`COUNT(column)`은 NULL이 아닌 값만 세므로 결과도 비용도 `COUNT(*)`와 다를 수 있다. NOT NULL 컬럼이면 결과가 같고 nullable이면 NULL 건수만큼 적다. 8.4.6(100만 행, 버퍼 풀 적재 상태) 재현 결과는 다음과 같다.

- `COUNT(*)`, `COUNT(1)`, `COUNT(NOT NULL 컬럼)`은 `EXPLAIN FORMAT=TREE`가 모두 `Count rows in <table>`이었고, nullable 컬럼의 `COUNT(col)`만 `Aggregate: count(col)` 아래 table scan으로 행마다 값을 꺼냈다(약 54ms 대 130ms). 전통 `EXPLAIN` 표는 `COUNT(NOT NULL 컬럼)`과 `COUNT(nullable 컬럼)`을 똑같이 `ALL`로 보여 이 차이를 드러내지 못하므로 `FORMAT=TREE`로 본다.
- 보조 인덱스가 없는 테이블의 조건 없는 `COUNT(*)`는 clustered index 병렬 읽기의 영향을 받았다. 세션 변수 `innodb_parallel_read_threads`(8.4 기본은 논리 CPU 수의 1/8, 최소 4)를 4에서 1로 낮추자 약 15ms에서 83ms가 됐다. 보조 인덱스가 있으면 매뉴얼대로 보조 인덱스를 순회하는 경로였고(`Handler_read_next` 100만) 이 설정의 영향이 없었다.
- 조건이 있으면 covering 여부가 갈린다. `WHERE ix1 >= 900`(10만 행)의 `COUNT(*)`는 `ix1` covering range scan으로 약 12ms였고, 인덱스에 없는 nullable 컬럼을 센 `COUNT(fd2)`는 NULL 확인을 위해 행을 찾아가 약 82ms였다.
- 특별한 의도가 없으면 `COUNT(*)`를 쓴다. NULL이 아닌 건수가 의도라면 `COUNT(*) ... WHERE col IS NOT NULL`로 조건을 드러내거나 주석을 단다.

`COUNT(DISTINCT expr)`는 NULL을 제외한 서로 다른 값을 세며 조인으로 늘어난 행의 중복 제거가 필요할 수 있다. ORM의 count API가 JOIN과 `COUNT(DISTINCT pk)`를 생성했다면 문법을 추측하지 말고 실제 SQL, temporary work와 `EXPLAIN ANALYZE`를 확인한다.

정확한 전체 건수가 제품 요구가 아니라면 다음 페이지 존재 여부는 `LIMIT page_size + 1`, 규모 표시는 오차를 밝힌 통계값으로 대체할 수 있다. 정확한 count가 필요하면 조건을 지원하는 covering index를 검토하되, count 하나를 위해 과도하게 넓은 인덱스를 만들지 않는다. 자세한 선택은 [[Pagination-Optimization|페이징 성능 최적화]]에 둔다.

## 서브쿼리와 집합 연산

서브쿼리는 상관 여부라는 논리적 의존성과 실제 평가 횟수를 구분한다. WHERE의 `IN`, `EXISTS`는 semijoin으로 바뀔 수 있지만 SELECT 절 상관 스칼라 서브쿼리는 기본 설정에서 바깥 행마다 평가된다. 변환 조건, `DEPENDENT SUBQUERY` 확인법과 JOIN 재작성은 [[MySQL-Query-Fundamentals-Subqueries|MySQL 서브쿼리 실행과 재작성]]에 둔다.

집합 연산은 각 분기의 컬럼 수와 대응 타입을 맞춘다.

- `UNION ALL`은 중복을 유지한다. 중복 제거가 필요 없으면 기본 선택이다.
- `UNION`은 `UNION DISTINCT`와 같다. 키워드를 생략해도 중복 제거 비용을 감수하고 집합을 만든다.
- `UNION ALL`도 주변 query 조건에 따라 materialize될 수 있다. MySQL이 union temporary table을 완전히 만들지 않고 결과를 바로 보낼 수 있는 대표 조건은 전체 `ORDER BY`가 없고, `INSERT` 또는 `REPLACE ... SELECT`의 최상위 query block이 아닌 경우다.
- MySQL은 8.0.31부터 `INTERSECT`와 `EXCEPT`를 지원한다. 지원 버전이 불명확하면 배포 대상에서 확인한다.
- 최종 순서가 필요하면 전체 집합 연산 뒤에 `ORDER BY`를 둔다.

### UNION DISTINCT가 비싼 이유

`UNION DISTINCT`는 모든 분기의 결과를 내부 임시 테이블에 모으면서 중복을 버린다. 중복 판단 기준은 원본의 PK나 UNIQUE가 아니라 SELECT한 모든 컬럼 값이라 컬럼이 많고 넓을수록 임시 테이블과 비교 비용이 커진다. 8.4.6 재현(40만 행, 두 분기 20만 행씩)에서 `EXPLAIN FORMAT=TREE`는 `UNION ALL`을 `Append` 아래 `Stream results`로, `UNION`을 `Union materialize with deduplication` 뒤 `<union temporary>` 스캔으로 보였다. `EXPLAIN ANALYZE`의 첫 행과 완료 시각은 다음과 같다.

| 투영 | `UNION ALL` 첫 행, 완료 | `UNION DISTINCT` 첫 행, 완료 |
|---|---|---|
| 6개 컬럼(약 320자 본문 포함) | 0.14ms, 439ms | 1,036ms, 1,165ms |
| `id`, `title` 2개 | 0.12ms, 273ms | 536ms, 571ms |

- `UNION ALL`은 첫 분기에서 찾은 행부터 클라이언트로 보내지만 `UNION DISTINCT`는 모든 분기를 읽고 중복 제거를 마쳐야 첫 행을 보낸다. 결과를 받으며 처리하는 클라이언트일수록 이 지연이 크게 보인다.
- 배수는 데이터와 환경에 따라 다르다. 강의 측정은 키워드만 다른 두 쿼리가 2.62초 대 14.76초였고, 위 재현은 컬럼을 줄이자 격차도 줄었다.
- 업무 규칙상 중복이 없으면 `UNION ALL`을 명시한다. 중복 제거가 필요해도 필요한 컬럼만 투영하고, 오래 걸리면 `UNION ALL` 뒤 애플리케이션에서 키 기준으로 합치는 방법을 비교한다. 수평 확장이 쉬운 애플리케이션 서버로 DB 작업을 옮기는 대신 중복 행만큼 전송량이 는다.

## 문자열 탐색과 FULLTEXT

`LIKE 'prefix%'`는 collation과 index 조건이 맞으면 B-tree 범위 탐색 후보지만 선행 wildcard인 `LIKE '%term'`은 일반 B-tree의 왼쪽 정렬과 맞지 않는다. 접미사 검색은 값을 뒤집은 생성 컬럼으로 받을 수 있다([[MySQL-Generated-Columns-and-Functional-Indexes#자동 치환되는 연산자와 접미사 LIKE|접미사 LIKE]]). 검색 요구가 단어 기반이면 InnoDB `FULLTEXT`를 검토한다.

InnoDB FULLTEXT도 단어에서 문서 목록을 찾는 inverted index를 사용한다. MySQL과 OpenSearch의 차이를 inverted index 유무로 설명하지 않는다. tokenizer/parser, stopword와 최소 token 길이, 언어 분석, relevance, phrase/fuzzy query, indexing lag와 운영 요구로 선택한다. 짧은 code나 CJK 검색에는 ngram parser 같은 분석 설정을 대상 데이터로 검증한다.

## NestJS와 TypeORM에서 동적 조회

값은 파라미터로 바인딩하고, 컬럼명과 정렬 방향 같은 SQL 구조는 서버가 가진 허용 목록에서 고른다. 사용자 입력을 SQL 문자열에 이어 붙이지 않는다.

```typescript
const sortColumn = input.sort === 'name'
  ? 'business.name'
  : 'business.id';

const businesses = await businessRepository
  .createQueryBuilder('business')
  .select(['business.id', 'business.name', 'business.floor'])
  .where('business.sectionId = :sectionId', {
    sectionId: input.sectionId,
  })
  .orderBy(sortColumn, 'ASC')
  .take(20)
  .getMany();
```

`WHERE TRUE` 뒤에 입력 문자열을 조립하는 방식은 편의 문법일 뿐 안전 장치가 아니다. QueryBuilder 파라미터와 명시적 분기 조합을 사용한다.

## 점검 질문

- NULL이 포함된 조건은 `UNKNOWN`까지 고려했는가?
- GROUP BY의 비집계 컬럼이 함수 종속적인가?
- LIMIT 결과에 결정적인 ORDER BY가 있는가?
- 동적 값은 바인딩하고 동적 식별자는 허용 목록으로 제한했는가?
- 쿼리 모양이 아니라 실제 실행 계획과 행 수를 확인했는가?

## 관련 문서

- [[MySQL-Query-Fundamentals-Subqueries|MySQL 서브쿼리 실행과 재작성]]
- [[MySQL-Query-Fundamentals-Functions|MySQL 내장 함수와 암묵 변환]]
- [[SQL-Joins|SQL 조인]]
- [[MySQL-SQL-Mode|MySQL SQL Mode]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어]]
- [[Query-Antipatterns|SQL 쿼리 안티패턴]]
- [[Index|인덱스]]
- [[Prepared-Statement-Cache|Prepared Statement 캐시]]

## 출처

- [MySQL 8.4 Reference Manual, SELECT Statement](https://dev.mysql.com/doc/refman/8.4/en/select.html)
- [MySQL 8.4 Reference Manual, Logical Operators](https://dev.mysql.com/doc/refman/8.4/en/logical-operators.html)
- [MySQL 8.4 Reference Manual, Working with NULL Values](https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html)
- [MySQL 8.4 Reference Manual, MySQL Handling of GROUP BY](https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html)
- [MySQL 8.4 Reference Manual, Set Operations](https://dev.mysql.com/doc/refman/8.4/en/set-operations.html)
- [MySQL 8.4 Reference Manual, Semijoin and Antijoin Transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html)
- [MySQL 8.4 Reference Manual, InnoDB Full-Text Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html)
- [인프런, Hong, SELECT 최적화](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338550)
- [MySQL 8.4 Reference Manual, EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 Reference Manual, Using COLLATE](https://dev.mysql.com/doc/refman/8.4/en/charset-collate.html)
- [MySQL 8.4 Reference Manual, Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [MySQL 8.4 Reference Manual, Internal Temporary Table Use](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [MySQL 8.4 Reference Manual, Configuring Parallel Threads for Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/online-ddl-parallel-thread-configuration.html)
- [TypeORM, Select using Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
- [인프런, 얄팍한 코딩사전, 데이터베이스와 MySQL](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86841)
- [인프런, 얄팍한 코딩사전, SELECT](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86843)
- [인프런, 얄팍한 코딩사전, 연산자](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86844)
- [인프런, 얄팍한 코딩사전, GROUP BY](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86848)
- [인프런, 얄팍한 코딩사전, JOIN](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86851)
- [인프런, 얄팍한 코딩사전, UNION](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86852)
- [인프런, Real MySQL 시즌 1 - Part 1, COUNT 튜닝](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226563)
- [인프런, Real MySQL 시즌 1 - Part 1, SQL 문장의 가독성 향상](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226572)
- [인프런, Real MySQL 시즌 1 - Part 2, COUNT(*)와 COUNT(column)](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226577)
- [인프런, Real MySQL 시즌 1 - Part 2, UNION과 UNION ALL](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226579)
