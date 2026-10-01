---
tags: [database, rdbms, mysql, query-plan, explain, index, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL EXPLAIN 읽기", "MySQL EXPLAIN", "key_len 계산", "possible_keys와 key"]
verified_at: 2026-09-30
---

# MySQL EXPLAIN 읽기

traditional `EXPLAIN` 표는 query block마다 옵티마이저가 고른 접근 방식과 그 근거인 추정치를 보여 준다. 문장을 실행하지 않으므로 운영에서도 방향을 잡는 첫 단계로 쓸 수 있다. 실제 실행 통계는 [[Execution-Plan-MySQL-EXPLAIN-ANALYZE|MySQL EXPLAIN ANALYZE 숫자 읽기]]에서 다룬다. MySQL 8.4 기준이다.

## 읽는 순서

열두 개 컬럼을 왼쪽부터 읽지 않고 다음 순서로 본다.

1. 구조: `id`, `select_type`
2. 접근 방식: `type`
3. 인덱스: `possible_keys`, `key`, `key_len`, `ref`
4. 추정치: `rows`, `filtered`
5. 추가 작업: `Extra`

같은 `id`는 한 조인 묶음이다. 서브쿼리가 있으면 `id`가 갈라지고 바깥 block은 `PRIMARY`로 표시되지만, 옵티마이저가 서브쿼리를 조인으로 재작성하면 `id`가 같아지고 `SIMPLE`로 바뀔 수 있다. 작성한 SQL이 그대로 실행되지 않으므로 `EXPLAIN` 직후 같은 세션에서 `SHOW WARNINGS`를 실행해 옵티마이저가 이름을 한정하고 재작성한 문장을 본다. 이 확장 정보는 `SELECT`에만 나오고, 내부 표식이 섞여 있어 그대로 실행할 SQL은 아니다.

출력 형식은 세 가지다. 기본 표(`TRADITIONAL`)가 실무 기본값이고, `FORMAT=JSON`은 `cost_info` 같은 비용 상세를 담아 프로그램 처리에 맞고, `FORMAT=TREE`는 iterator 트리로 복잡한 조인의 흐름을 보여 주며 `EXPLAIN ANALYZE`의 바탕이 된다. `FORMAT`을 생략했을 때의 형식은 `explain_format` 시스템 변수가 정한다.

## `select_type`과 `type`

`select_type`은 query block의 관계를 보여 준다. `SIMPLE`은 subquery나 `UNION`이 없는 단순 block, `PRIMARY`는 가장 바깥 block, `SUBQUERY`는 subquery의 첫 SELECT, `DEPENDENT SUBQUERY`는 바깥 row에 의존하는 subquery다. `DERIVED`는 `FROM` 절의 derived table, `DEPENDENT DERIVED`는 선행 table에 의존하는 LATERAL derived table, `MATERIALIZED`는 materialized subquery를 뜻한다. `DEPENDENT DERIVED`가 보이면 선행 table 행의 `Extra`에 `Rematerialize (<derivedN>)`가 붙어 행마다 다시 만들어진다([[MySQL-Lateral-Derived-Tables#실행 계획에서 확인하기|LATERAL 실행 계획]]).

`type`은 table을 찾는 access type이다. 대략 `system`, `const`, `eq_ref`, `ref`, `range`, `index`, `ALL` 순으로 적은 후보를 읽는 경향이 있지만 성능 등급표는 아니다. `ALL`도 작은 table이나 반환 비율이 큰 query에는 합리적이며, index access도 많은 row lookup을 반복하면 비쌀 수 있다. `index_merge`, `ref_or_null` 같은 다른 access type도 있다.

| type | 성립 조건 (8.4 문서) | 읽는 양 |
|---|---|---|
| `const` | PK 또는 `UNIQUE` 인덱스의 모든 컬럼을 상수와 비교 | 최대 1행. 시작할 때 한 번 읽고 나머지 최적화에서 상수로 취급 |
| `eq_ref` | 조인이 PK 또는 `UNIQUE NOT NULL` 인덱스의 모든 컬럼을 사용 | 선행 행 조합마다 정확히 1행 |
| `ref` | leftmost prefix만 쓰거나 PK, `UNIQUE`가 아닌 인덱스로 동등 비교 | 한 키 값에 여러 행 |

`UNIQUE`여도 NULL을 허용하는 인덱스는 조인에서 1행을 보장하지 못하므로 `eq_ref` 조건에 들지 않는다. `ref`는 키 하나에 대응하는 행이 적을 때 좋은 접근이지만, 행이 많고 loop가 반복되면 느려진다.

### `type=index`와 `Using index`는 다른 신호다

`type=index`는 `ALL`과 같되 인덱스 트리를 끝까지 읽는다는 뜻이며 두 경우가 있다.

- covering: 필요한 값이 모두 인덱스에 있어 인덱스만 읽는다. `Extra`에 `Using index`가 붙고, 인덱스가 테이블보다 작아 보통 `ALL`보다 빠르다.
- non-covering: 인덱스 순서대로 행을 찾아가며 테이블 전체를 읽는다. `Using index`가 없고, clustered index를 흩어진 순서로 읽어 `ALL`보다 느릴 수 있다.

`LIMIT`로 중간에 끊기지 않는 한 전체를 훑으므로 `type=index` 자체는 좋은 신호가 아니다. covering을 확정하는 신호는 `Extra`의 `Using index`다. `Using index`와 `Using where`가 함께 나오면 covering이면서 인덱스 안의 컬럼으로 서버가 추가 필터링한다는 뜻이다.

## 인덱스 관련 필드

| 필드 | 해석 |
|---|---|
| `possible_keys` | 이 테이블에서 고를 수 있는 후보 index. 표시된 테이블 순서와 무관하게 계산되어 실제 조인 순서에서는 못 쓰는 후보도 있음 |
| `key` | 실제 선택된 index. `possible_keys`에 없는 covering index일 수 있음 |
| `key_len` | 탐색 범위를 정하는 데 쓴 key part의 바이트 합. 아래 규칙으로 사용 범위를 역산 |
| `ref` | index 탐색에서 비교되는 column, constant 또는 `func` |
| `rows` | 조사할 것으로 추정한 행 수 |
| `filtered` | table condition을 통과할 것으로 추정한 비율 |

`rows * filtered / 100`은 다음 table로 전달할 행 수의 근사치다. 모두 통계 기반 추정이며 정확한 실행 횟수가 아니다. `key_len`도 복합 index의 사용 범위를 추론하는 단서일 뿐 빠른 계획을 보장하지 않는다.

### `possible_keys`와 `key`가 어긋날 때

| 모양 | 뜻 | 확인할 것 |
|---|---|---|
| 후보는 있는데 `key`가 NULL | 조건에 맞는 행 비율이 커서 인덱스 경유 랜덤 I/O보다 full scan이 싸다고 판단 | 반환 비율, 통계, covering 가능성 |
| 후보는 NULL인데 `key`에 인덱스 | WHERE에 쓸 후보는 없지만 SELECT 컬럼을 모두 덮는 인덱스가 있어 테이블 대신 그 인덱스를 전체 스캔(`type=index`, `Using index`) | 전체 스캔 범위가 허용되는지 |
| 기대와 다른 `key` | 통계로 가장 적게 읽을 것 같은 후보를 선택 | 인덱스 정의, 통계 갱신 시점, 실제 rows |

InnoDB 보조 인덱스는 PK 값을 함께 저장하므로 SELECT에 PK가 섞여도 covering이 될 수 있다. 느린 가격 검색에 `price` 인덱스를 급히 추가했는데 `possible_keys`에만 나오고 `key`는 FK 제약이 자동으로 만든 `category_id` 인덱스로 선택되어 개선이 없던 사례처럼, 인덱스 추가의 효과는 `key`와 실측으로 확인한다. 후보에 있다는 이유만으로 `FORCE INDEX`를 붙이지 않는다([[MySQL-Slow-Query-Diagnosis|Slow Query 진단]]).

### `key_len` 계산과 복합 인덱스 사용 범위 역산

`key_len`은 실제 저장된 값 길이가 아니라 컬럼 정의상 최대 바이트로 계산한다. MySQL 8.4 소스의 key part 길이 계산(`KEY_PART_INFO::init_from_field`)과 문서 기준 규칙은 다음과 같다.

- 고정 길이 타입은 타입 크기다. `BIGINT` 8, `INT` 4, `DATE` 3.
- 문자 컬럼은 선언 길이 × 문자셋 최대 바이트다. `utf8mb4`는 실제 저장이 영문 1, 한글 3, 이모지 4바이트로 가변이어도 4를 곱한다.
- `VARCHAR`와 TEXT 계열 prefix는 길이 표시 2바이트를 더한다. 행 저장은 최대 길이가 255바이트 이하면 1바이트를 쓰지만 key 형식은 항상 2바이트다.
- NULL 허용 컬럼은 NULL 표시 1바이트를 더한다.

| 컬럼 정의 (utf8mb4) | key_len |
|---|---|
| `BIGINT NOT NULL` | 8 |
| `VARCHAR(100) NOT NULL` | 100 × 4 + 2 = 402 |
| `VARCHAR(20) NULL` | 20 × 4 + 2 + 1 = 83 |

복합 인덱스 `(category_id BIGINT NOT NULL, product_status VARCHAR(20) NOT NULL, price INT NOT NULL)`에 AND 조건을 하나씩 더하면 `key_len`이 8 → 90 → 94로 는다. 컬럼별 바이트 합과 비교해 몇 번째 key part까지 탐색에 쓰였는지 판단한다.

- `(category_id, product_status, price, created_at)`에서 `price`가 범위 조건이면 `key_len`은 94에서 멈춘다. 범위 조건 뒤 key part는 탐색 범위를 더 줄이지 못한다. 다만 `>=`, `<=`, `BETWEEN` 같은 닫힌 범위 뒤의 등호 key part는 범위의 시작점이나 끝점에 붙어 `key_len`에 잡힐 수 있으므로, 늘어난 `key_len`을 범위가 줄었다는 뜻으로 읽지 않는다([[Index-Composite-Design#key_len만 보고 판단하지 않는다|복합 인덱스 설계]]).
- ORDER BY에만 쓰인 컬럼은 `key_len`에 들어가지 않는다. `(category_id, product_status, created_at)`으로 정렬까지 처리해도 90이다.
- 인덱스 끝에 붙여 ICP 거름망으로만 쓰는 컬럼도 `key_len`을 바꾸지 않는다. `Using index condition`과 TREE 출력으로 확인한다.
- InnoDB index extension이 적용되면 보조 인덱스 뒤에 붙은 PK 부분까지 `key_len`에 잡힐 수 있다([[Covering-Index#Index extension|index extension]]).

운영 쿼리의 `key_len`이 기대보다 짧으면 복합 인덱스 일부만 탐색에 쓰인다는 신호다. 반대로 `key_len`만으로 정렬, ICP, covering 활용 여부는 알 수 없으므로 `Extra`와 TREE를 함께 읽는다. 실습으로 `key_len`을 보려고 만든 임시 인덱스는 바로 지운다. 남겨 두면 뒤 실험의 계획이 바뀐다.

### `ref` 컬럼 읽기

- `const`: 상수와 비교
- `db.table.column`: 선행 테이블의 값과 비교(조인)
- `func`: 함수나 연산 결과와 비교

`func`는 형변환이나 연산이 끼어 인덱스를 기대대로 쓰지 못할 수 있다는 경고로 읽는다. 문서 기준으로 어떤 함수인지(산술 연산자일 수도 있다)는 `EXPLAIN` 뒤 `SHOW WARNINGS`로 확인한다. 변환이 비교 값 쪽인지 인덱스 컬럼 쪽인지 재작성된 문장에서 보고 컬럼 타입과 collation을 맞춘다. 컬럼 쪽 식을 인덱스로 받아야 하면 [[MySQL-Generated-Columns-and-Functional-Indexes|함수 인덱스]]를 검토한다.

## `Extra`를 경고등처럼 읽기

| 표시 | 의미 |
|---|---|
| `Using index` | 필요한 값을 index에서 얻는 covering access |
| `Using index condition` | ICP로 index entry에서 먼저 조건 평가 |
| `Using where` | 읽은 row에 table condition 적용. 그 자체로 설계 결함은 아님 |
| `Using temporary` | internal temporary table 사용 가능성 |
| `Using filesort` | index order 이외의 추가 정렬. disk 정렬이라는 뜻은 아님 |
| `Using MRR` | Multi-Range Read 사용 |

`Using temporary`와 `Using filesort`는 제거 여부를 자동 판정하는 빨간불이 아니다. 입력 rows, memory/disk 사용, 첫 row까지의 시간과 전체 실행 시간을 함께 본다.

## 출처

- [MySQL 8.4 Reference Manual, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 Reference Manual, EXPLAIN Output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4 Reference Manual, Extended EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-extended.html)
- [MySQL 8.4 Reference Manual, Internal Temporary Tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [MySQL 8.4 Reference Manual, Use of Index Extensions](https://dev.mysql.com/doc/refman/8.4/en/index-extensions.html)
- [MySQL 8.4 Reference Manual, The CHAR and VARCHAR Types](https://dev.mysql.com/doc/refman/8.4/en/char.html)
- [KEY_PART_INFO::init_from_field, sql/table.cc — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/sql/table.cc)
- [인프런, EXPLAIN 기본 사용법](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471859)
- [인프런, rows와 filtered](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471864)
- [인프런, 김영한, 실행 계획 필요성](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471858)
- [인프런, 김영한, TYPE - 접근 유형 1](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471860)
- [인프런, 김영한, TYPE - 접근 유형 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471861)
- [인프런, 김영한, 핵심 컬럼 분석1 - possible_keys, key](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471862)
- [인프런, 김영한, 핵심 컬럼 분석2 - key_len, ref](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471863)
- [인프런, 김영한, Extra 컬럼 해석](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471865)
- [인프런, 김영한, 정리 (실행 계획 1 - EXPLAIN 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471866)
- [인프런, 김영한, 실전 진단 - 해결 방안 1 (실전 튜닝 2)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471899)
- [인프런, 김영한, 실전 진단 - 해결 방안 2 (실전 튜닝 2)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471900)
- [인프런, 김영한, ICP 적용 예제 - 실전 튜닝 2에 ICP 적용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471904)

## 관련 문서

- [[Execution-Plan|실행 계획 목차]]
- [[Execution-Plan-MySQL-EXPLAIN-ANALYZE|MySQL EXPLAIN ANALYZE 숫자 읽기]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
