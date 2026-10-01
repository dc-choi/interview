---
tags: [database, rdbms, mysql, generated-column, functional-index]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Generated Columns", "MySQL 함수 기반 인덱스", "JSON 경로 인덱스", "multi-valued index", "접미사 LIKE 인덱스"]
---

# MySQL 생성 컬럼과 함수 인덱스

생성 컬럼은 다른 컬럼의 표현식으로 값을 계산한다. 함수 인덱스는 그 표현식 결과를 숨은 가상 생성 컬럼으로 구현해 검색 가능하게 한다. 둘 다 쿼리의 반복 식을 스키마 계약으로 올리는 기능이다.

## VIRTUAL과 STORED

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  created_date DATE AS (DATE(created_at)) VIRTUAL,
  total_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2)
    AS (ROUND(total_amount * 0.1, 2)) STORED,
  INDEX ix_orders_created_date (created_date)
);
```

| 종류 | 계산 시점 | base row 저장 | 인덱스 |
|---|---|---|---|
| `VIRTUAL` | 행을 읽을 때 | 저장하지 않음 | InnoDB secondary index 가능, index entry는 저장됨 |
| `STORED` | INSERT, UPDATE 때 | 계산값 저장 | 가능 |

아무것도 쓰지 않으면 `VIRTUAL`이다. 읽기가 잦고 계산이 비싸면 STORED가 유리할 수 있지만 쓰기와 저장 비용이 늘어난다. 인덱스가 목적이면 VIRTUAL도 인덱스 자체의 저장과 유지 비용은 든다.

생성 컬럼에 INSERT나 UPDATE로 직접 지정할 수 있는 값은 `DEFAULT`뿐이다.

## 함수 인덱스

```sql
CREATE INDEX ix_users_lower_email
ON users ((LOWER(email)));
```

표현식 key part를 컬럼 key part와 섞어 복합 인덱스로 만들 수 있고 `UNIQUE`, `ASC`, `DESC`도 지원한다. 표현식은 컬럼명과 구별하도록 괄호로 감싸므로 `INDEX ((expression))`처럼 괄호가 겹친다.

함수 인덱스와 생성 컬럼 인덱스는 표현식의 의미가 비슷하다는 이유만으로 선택되지 않는다.

- 쿼리 식과 정의 식이 동일하고 결과 타입이 같아야 한다. `f1 + 1`과 `1 + f1`은 일치하지 않는다.
- 문자열은 타입뿐 아니라 collation 차이도 인덱스 사용을 막을 수 있다.
- 생성 컬럼 이름을 직접 조건에 쓰면 표현식 재작성 의존도를 낮출 수 있다.
- 적용 여부는 `EXPLAIN ANALYZE`와 `SHOW WARNINGS`의 재작성 결과로 확인한다.
- 긴 값의 등호 검색은 해시 생성 컬럼을 인덱싱할 수 있다. 해시는 충돌할 수 있으므로 조건에 원본 비교도 함께 둔다.

### 자동 치환되는 연산자와 접미사 LIKE

옵티마이저가 쿼리 식을 인덱스된 생성 컬럼으로 바꾸는 비교는 `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN()`뿐이고, JSON 값 비교에는 아직 `BETWEEN`과 `IN()`이 적용되지 않는다. `LIKE`는 치환 대상이 아니다.

`LIKE '%@example.com'`처럼 앞이 와일드카드인 접미사 검색은 B-tree의 시작점을 정할 수 없어 full scan이다. 값을 뒤집은 생성 컬럼을 두고 그 이름으로 접두사 검색을 하면 범위 탐색이 된다.

```sql
ALTER TABLE users
  ADD COLUMN email_rev VARCHAR(255) AS (REVERSE(email)) VIRTUAL,
  ADD INDEX ix_users_email_rev (email_rev);

SELECT id FROM users
WHERE email_rev LIKE CONCAT(REVERSE('@example.com'), '%');
```

- 8.4.6(약 2만 행)에서 이름을 쓴 조건은 `range`였다. `REVERSE(email) LIKE ...`로 쓰면 이 인덱스나 함수 인덱스 `((REVERSE(email)))`가 있어도 `ALL`이었고, 함수 인덱스는 `=` 조건에서만 `ref`로 쓰였다.
- 일치 비율이 높으면(2만 행 중 4천 행) 옵티마이저는 인덱스 대신 full scan을 골랐다. 선택도를 함께 본다.
- 사용자 입력의 `%`, `_`는 escape한다. 도메인 단위로만 찾는다면 도메인 생성 컬럼과 등호 검색이 더 단순하다. `%term%` 부분 문자열 검색은 이 방식으로 풀리지 않으므로 FULLTEXT ngram parser나 검색 엔진을 검토한다.

`UPPER(name) = 'ALICE'`처럼 컬럼을 함수로 감싸면 일반 인덱스를 쓰지 못한다(8.4.6 `ALL`). 기본 collation `utf8mb4_0900_ai_ci`에서는 `name = 'alice'`가 이미 대소문자를 무시하며 인덱스를 쓰므로(`ref`) `UPPER` 래핑도 그 함수 인덱스도 필요 없다. 함수 인덱스나 입력 정규화가 필요한 경우는 `_bin`, `_cs` 같은 대소문자 구분 collation 컬럼이다. 조회 값만 소문자로 바꾸는 방식은 저장 값이 같은 규칙으로 정규화돼 있을 때만 정확하므로, 저장 정규화와 조회 정규화를 한 규칙으로 묶고 UNIQUE도 정규화 값에 건다([[MySQL-Collation|MySQL Collation]]).

## JSON 경로 인덱싱

JSON 컬럼 전체나 내부 키는 일반 인덱스로 직접 인덱싱할 수 없어 경로 조건만으로는 full scan이다. 자주 찾는 scalar 경로는 생성 컬럼이나 함수 인덱스로 꺼낸다. 함수와 연산자의 의미는 [[MySQL-JSON-Functions|MySQL JSON 함수]]에 둔다.

- 기본은 VIRTUAL이다. 행에는 저장하지 않고 인덱스 엔트리만 저장되므로 원본과 어긋나지 않고 공간도 덜 쓴다. STORED는 추출 계산이 매우 비싸거나 그 값을 PK로 써야 할 때로 한정한다. 8.4.6에서 STORED 생성 컬럼은 PK가 됐고, VIRTUAL은 오류 3106, 함수 key part는 오류 3756으로 거부됐다.
- 그 값을 SELECT에서도 자주 쓰면 이름 있는 생성 컬럼, WHERE 조건으로만 쓰면 함수 인덱스로 스키마를 단순하게 둔다. 함수 인덱스도 숨은 가상 컬럼이라 둘의 인덱스 동작은 같다.
- 문자열 비교용 생성 컬럼은 `JSON_UNQUOTE(JSON_EXTRACT(...))` 또는 `->>`로 정의한다. 그래야 `JSON_EXTRACT(doc, path) = 'x'`와 `->>` 비교가 모두 인덱스에 매칭된다.
- 함수 인덱스는 collation까지 맞춘다. `->>`는 `utf8mb4_bin`을, COLLATE 없는 `CAST(... AS CHAR(n))`는 기본 collation을 돌려준다. 8.4.6에서 `((CAST(attributes->>'$.brand' AS CHAR(40))))` 인덱스는 `attributes->>'$.brand' = 'b7'`에 쓰이지 않았고(`ALL`), 식 끝에 `COLLATE utf8mb4_bin`을 붙이자 `ref`가 됐다. `utf8mb4_bin`은 대소문자를 구분하므로(`'B7'`은 0건) 검색 의미도 함께 정한다.
- 숫자 경로는 `((JSON_VALUE(attributes, '$.storage' RETURNING UNSIGNED)))` 함수 인덱스로 타입을 고정할 수 있다. 8.4.6에서 같은 식의 `=`는 `ref`, `BETWEEN`은 `range`였고 `attributes->'$.storage' = 128`은 인덱스를 쓰지 않았다.

### 배열 원소는 multi-valued index

일반 B-tree는 한 행에 키 하나를 두지만 multi-valued index는 배열 원소마다 키를 만든다. `CAST(... AS type ARRAY)`로 원소 타입을 정한다.

```sql
CREATE INDEX ix_tags ON product ((CAST(attributes->'$.tags' AS CHAR(20) ARRAY)));

SELECT id FROM product WHERE 't7' MEMBER OF (attributes->'$.tags');
SELECT id FROM product WHERE JSON_OVERLAPS(attributes->'$.tags', '["t7", "t8"]');
```

- WHERE의 `MEMBER OF()`, `JSON_CONTAINS()`, `JSON_OVERLAPS()`에 쓰인다. 8.4.6에서 인덱스 식과 같은 `attributes->'$.tags'`를 인자로 쓴 셋은 `ref` 또는 `range`였고, 경로를 세 번째 인자로 넘긴 `JSON_CONTAINS(attributes, '"t7"', '$.tags')`는 `ALL`이었다.
- 문자열 원소는 binary나 `utf8mb4_0900_as_cs`만 지원해 대소문자를 구분한다(`'T7' MEMBER OF ...`는 0건).
- 빈 배열 행은 인덱스 엔트리가 없어 인덱스로 찾지 못한다.
- 인덱스당 multi-valued key part는 하나다. 정렬이 없어 PK와 `ASC`, `DESC`에 쓸 수 없고, FK, prefix와 `BINARY` cast도 쓸 수 없다. 한 행의 키 값 합계는 undo log page 하나(65,221바이트)를 넘지 못한다.
- 매뉴얼은 같은 행의 키가 인덱스 곳곳에 흩어져 있어 covering, range scan과 index-only scan을 지원하지 않는다고 적는다. 8.4.6 `EXPLAIN`의 `range`는 `FORMAT=TREE`로 보면 `('t8' MEMBER OF ...) OR ('t7' MEMBER OF ...)`처럼 키 값별 조회를 묶은 것이고, 원래 조건은 Filter로 다시 확인됐다.
- 매뉴얼은 온라인 생성을 지원하지 않아 `ALGORITHM=COPY`를 쓴다고 적는다. 8.4.6에서는 `ALGORITHM=INPLACE`가 받아들여졌지만 `LOCK=NONE`은 거부됐으므로 어느 쪽이든 생성 중 쓰기가 막힌다고 보고 [[Schema-Migration-Large-Table|대용량 스키마 변경]] 절차로 계획한다.
- 8.4.6 aarch64 Docker 재현에서 빈 배열 행이 앞쪽에 있는 테이블에 기본 `CREATE INDEX`로 만들자 서버가 비정상 종료(signal 11)했다. 같은 데이터에 `ALGORITHM=COPY`를 명시하거나 8.0.42에서 만들면 성공했다. 공개 버그 기록은 찾지 못했으므로(2026-09-30) 대상 버전과 운영 데이터 사본으로 먼저 리허설한다.

## 허용 범위와 제한

생성 식에는 literal, 연산자와 허용된 deterministic built-in function을 쓸 수 있다. 다음은 허용되지 않는다.

- 비결정 built-in function
- stored function과 loadable function
- subquery, parameter, system/user/local variable
- 뒤에 정의된 다른 생성 컬럼 참조

함수 key part는 생성 컬럼 제한을 상속한다. 단순 컬럼명만 감싸거나 prefix 길이를 붙일 수 없고, foreign key, primary key, FULLTEXT, SPATIAL key part로도 쓸 수 없다. 함수 key part마다 숨은 가상 컬럼 하나를 사용하므로 테이블 컬럼 수 한도에도 포함된다.

MySQL 8.4 공식 규칙상 trigger에서 `NEW.generated_col`이나 `OLD.generated_col`을 참조할 수 없다. 특정 버전에서 우연히 동작한 관찰보다 배포 대상 버전의 문서와 회귀 테스트를 따른다.

## 운영 변경

생성 컬럼 추가, 정의 변경과 인덱스 생성은 각각 지원하는 online DDL 알고리즘이 다르다. 운영 migration에서는 `ALGORITHM`과 `LOCK` 지원 여부, 전체 행 계산, redo와 replica 지연을 사전 검증한다. 표현식이 SQL mode에 따라 달라지면 평가 시점 환경에 따라 값이 달라질 수 있으므로 mode도 고정한다.

| 작업 (8.4 매뉴얼) | 방식 |
|---|---|
| VIRTUAL 컬럼 추가, 삭제 | 비파티션 테이블은 INSTANT 또는 INPLACE, 재작성 없음 |
| STORED 컬럼 추가 | COPY, 테이블 재작성, 동시 DML 불가 |
| STORED 컬럼 삭제 | INPLACE, 테이블 재작성 |
| 생성 컬럼 순서 변경 | COPY |

VIRTUAL과 STORED 사이 전환은 하나의 ALTER로 되지 않는다. 8.4.6에서 확인한 규칙은 다음과 같다.

- 일반 컬럼에서 STORED로, STORED에서 일반 컬럼으로는 바꿀 수 있다. 후자는 저장된 계산값이 일반 컬럼 값이 된다.
- 일반 컬럼에서 VIRTUAL로, VIRTUAL에서 일반 컬럼으로, VIRTUAL과 STORED 사이는 오류 3106이다. 새 정의의 컬럼을 추가하고 기존 컬럼을 지운다. 매뉴얼 예시는 DROP 뒤 ADD이며, 이름이 잠시 사라지는 시간과 조회 코드의 영향을 보고 순서를 고른다. 두 단계의 online DDL 특성(STORED 추가는 재작성)으로 계획한다.
- 다른 컬럼이 참조하지 않으면 이름 변경과 삭제는 가능하다.

VIRTUAL 컬럼을 추가하거나 바꿀 때는 검증 여부를 의식적으로 고른다. 기본값 `WITHOUT VALIDATION`은 가능하면 in-place로 빨리 끝나지만 기존 데이터의 계산값이 타입 범위를 넘는지 검사하지 않는다. 8.4.6에서 c1이 127인 행이 있는 테이블에 `TINYINT AS (c1 + 1)`을 추가하자 ALTER는 성공했고, 조회는 경고 없이 127을 돌려줬으며, 그 컬럼의 인덱스 생성은 오류 1264로 실패했다. `WITH VALIDATION`은 테이블을 복사하며 같은 데이터에서 ALTER 자체가 1264로 실패했다. 두 절은 ADD, CHANGE, MODIFY COLUMN에만 쓸 수 있고 다른 작업과 쓰면 오류 1221(`ER_WRONG_USAGE`)이다.

조건 값의 타입을 표현식 결과 타입과 맞추려면 결과 타입부터 확인한다. mysql 클라이언트를 `--column-type-info`와 표 출력(`-t` 또는 대화형)으로 실행하면 `SELECT <표현식>`의 타입이 나온다. 메타데이터의 collation은 결과 전송용 문자셋 기준이므로 collation은 `SELECT COLLATION(<표현식>)`으로 따로 본다.

## 출처

- [MySQL 8.4 Reference Manual, CREATE TABLE and Generated Columns](https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html)
- [MySQL 8.4 Reference Manual, Optimizer Use of Generated Column Indexes](https://dev.mysql.com/doc/refman/8.4/en/generated-column-index-optimizations.html)
- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [MySQL 8.4 Reference Manual, Multi-Valued Indexes](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-multi-valued)
- [MySQL 8.4 Reference Manual, ALTER TABLE and Generated Columns](https://dev.mysql.com/doc/refman/8.4/en/alter-table-generated-columns.html)
- [MySQL 8.4 Reference Manual, Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [MySQL 8.4 Reference Manual, JSON Search Functions](https://dev.mysql.com/doc/refman/8.4/en/json-search-functions.html)
- [인프런, Real MySQL 시즌 1 - Part 1, Generated 컬럼 및 함수 기반 인덱스](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226568)
- [인프런, Hong, SELECT 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367626)
- [인프런, Hong, 인덱스 컬럼과 함수](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367633)
- [인프런, Hong, DELETE 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367628)
- [인프런, JSON 인덱스와 성능 최적화 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402024)
- [인프런, JSON 인덱스와 성능 최적화 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402025)
- [인프런, JSON 설계 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402029)

## 관련 문서

- [[Index|인덱스]]
- [[Query-Antipatterns|SQL 쿼리 안티패턴]]
- [[MySQL-Stored-Functions|MySQL 저장 함수]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[MySQL-JSON-Functions|MySQL JSON 함수]]
- [[MySQL-Collation|MySQL Collation]]
