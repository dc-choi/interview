---
tags: [database, rdbms, mysql, json, json-table, sql]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL JSON Functions", "MySQL JSON 함수", "JSON_VALUE", "JSON_TABLE", "JSON_CONTAINS"]
---

# MySQL JSON 함수

JSON 컬럼은 유효한 JSON만 저장하고 binary 형식으로 경로 접근을 지원한다. 함수 이름보다 반환 타입, 비교 규칙, 키가 없을 때의 동작이 결과를 바꾸므로 이 셋을 먼저 정한다. 언제 JSON 컬럼을 쓸지는 [[JSON-vs-Text-Column|JSON vs TEXT 컬럼]]과 [[Flexible-Attribute-Modeling|가변 속성 모델링]], 경로 인덱스는 [[MySQL-Generated-Columns-and-Functional-Indexes#JSON 경로 인덱싱|생성 컬럼과 함수 인덱스]]에 둔다. MySQL 8.4 기준이며 8.4.6 재현으로 확인한 동작을 표시했다.

## 경로와 값 추출

경로는 `$`에서 시작해 키를 점으로 잇고(`$.maker.country`), 배열은 0부터 세는 인덱스(`$.ports[0]`)나 `[*]`로 접근한다. ECMAScript 식별자가 아닌 키는 경로 안에서 큰따옴표로 감싼다(`'$."a fish"'`, `'$."5g"'`). 8.4.6에서 `'$.5g'`와 백틱 표기는 경로 오류 3143이었다. 영문자로 시작하고 영문자, 숫자와 밑줄만 쓰는 키 이름을 규칙으로 두면 인용이 필요 없다.

| 형태 | 반환 | 쓰임 |
|---|---|---|
| `JSON_EXTRACT(col, path)`, `col->path` | JSON 값. 문자열은 큰따옴표가 붙은 채 | JSON 값 그대로 다룰 때 |
| `col->>path` | `JSON_UNQUOTE(JSON_EXTRACT(...))`, collation `utf8mb4_bin`인 문자열 | 표시와 단순 문자열 조회 |
| `JSON_VALUE(col, path RETURNING type)` | 지정한 SQL 타입 | 숫자, 날짜 비교와 연산 |

- `->`와 `->>`는 왼쪽에 컬럼 식별자가 와야 한다. 변수나 식에는 `JSON_EXTRACT`를 쓴다.
- `JSON_VALUE`는 RETURNING이 없으면 `VARCHAR(512)`, utf8mb4의 binary collation(대소문자 구분)을 돌려준다. 8.4.6에서는 `utf8mb4_0900_bin`이었다. RETURNING에는 FLOAT, DOUBLE, DECIMAL, SIGNED, UNSIGNED, DATE, TIME, DATETIME, YEAR, CHAR, JSON을 쓸 수 있다.
- 키가 없을 때와 변환에 실패했을 때는 `ON EMPTY`, `ON ERROR`로 NULL, ERROR, `DEFAULT 값` 중에서 고르고 기본은 둘 다 NULL이다. 8.4.6에서 `"12GB"`, `"abc"`, 배열을 `RETURNING UNSIGNED`로 읽으면 기본 설정에서는 NULL이었고 `ERROR ON ERROR`면 오류였다. 매뉴얼은 변환 오류에 warning이 남는다고 적지만 이 재현에서는 `SHOW WARNINGS`가 비어 있었으므로 warning으로 잘못된 값을 잡는다고 가정하지 않는다. 잘못된 값을 NULL로 흘릴지 막을지를 쓰임마다 정한다.

### 숫자 비교는 타입을 고정한다

JSON 값과 SQL 값을 비교하면 SQL 값을 JSON으로 바꿔 JSON 비교 규칙을 따른다. JSON 타입이 서로 다르면 값과 무관하게 타입 우선순위만으로 결과가 정해지고, STRING은 INTEGER, DOUBLE보다 높다.

| 식 (8.4.6) | 결과 | 이유 |
|---|---|---|
| `JSON_EXTRACT('{"ram":"1"}', '$.ram') > 8` | 1 | JSON 문자열이 숫자보다 우선순위가 높음 |
| `JSON_UNQUOTE(JSON_EXTRACT('{"ram":"1"}', '$.ram')) > 8` | 0 | SQL 문자열을 숫자로 변환해 비교 |
| `JSON_UNQUOTE(JSON_EXTRACT('{"ram":"12GB"}', '$.ram')) > 8` | 1 | 앞 숫자만 해석, warning 1292 |
| `JSON_VALUE('{"ram":"1"}', '$.ram' RETURNING UNSIGNED) > 8` | 0 | 타입을 명시 |

숫자는 JSON number로 저장하고, 비교와 연산은 `JSON_VALUE ... RETURNING`으로 타입을 고정한다. `->>` 결과의 암묵 변환에 기대지 않는다. EAV처럼 모든 값을 문자열로 두는 방식과 달리 JSON은 숫자, 문자열, 불리언을 원래 타입으로 저장하므로 이 장점을 저장 단계에서 지킨다.

## 포함과 존재 검색

| 함수 | 의미 |
|---|---|
| `JSON_CONTAINS(target, candidate[, path])` | candidate가 target에 포함되는지. 배열 candidate는 모든 원소가 있어야 참(AND) |
| `JSON_OVERLAPS(doc1, doc2)` | 공통 원소나 키와 값 쌍이 하나라도 있으면 참(OR) |
| `value MEMBER OF(json_array)` | 값 하나가 배열 원소인지 |
| `JSON_CONTAINS_PATH(doc, 'one' 또는 'all', path, ...)` | 값과 무관하게 경로가 있는지. `one`은 하나라도, `all`은 모두 |

- `JSON_CONTAINS`의 candidate는 유효한 JSON이어야 한다. `'black'`은 오류 3141이고 `'"black"'`이나 `JSON_QUOTE('black')`로 넘긴다.
- `JSON_OVERLAPS`와 `MEMBER OF`는 타입 변환을 하지 않아 숫자 6과 문자열 `"6"`은 다르다.
- 세 검색 함수는 multi-valued index를 쓸 수 있지만 인덱스 식과 같은 경로 식을 인자로 써야 한다.

## 수정 함수의 키 존재 의미

| 함수 | 키가 있을 때 | 키가 없을 때 |
|---|---|---|
| `JSON_SET` | 교체 | 추가 |
| `JSON_INSERT` | 그대로 둠 | 추가 |
| `JSON_REPLACE` | 교체 | 무시 |
| `JSON_REMOVE` | 삭제 | 오류 없이 무시 |

- 8.4.6에서 `{"a":1}`에 `$.a`를 2, `$.b`를 3으로 주면 `JSON_SET`은 `{"a": 2, "b": 3}`, `JSON_INSERT`는 `{"a": 1, "b": 3}`, `JSON_REPLACE`는 `{"a": 2}`였다.
- 기존 키 갱신이 의도인 코드에서 `JSON_SET`을 쓰면 경로 오타가 새 키로 조용히 추가된다. 갱신만이면 `JSON_REPLACE`, 기본값 채우기면 `JSON_INSERT`가 의도를 드러낸다.
- `JSON_ARRAY_APPEND`는 경로의 배열 끝에 추가하며, 경로가 scalar나 객체면 배열로 감싼 뒤 추가한다.
- 저장 공간을 제자리에서 일부만 고치는 물리적 partial update는 `JSON_SET`, `JSON_REPLACE`, `JSON_REMOVE`가 기존 값을 교체하거나 지울 때만 해당하고 새 멤버 추가는 제외된다([[JSON-vs-Text-Column#MySQL의 물리적 partial update 경계|partial update 경계]]).

확인용 함수로 `JSON_TYPE`(저장 타입), `JSON_KEYS`(최상위 키 목록), `JSON_LENGTH`(원소 수), `JSON_VALID`(문자열의 JSON 유효성), `JSON_PRETTY`(들여쓰기 출력)가 있다.

## JSON_TABLE로 배열을 행으로 펼친다

`JSON_TABLE(expr, path COLUMNS (...)) AS alias`는 배열 원소를 행으로, 키를 컬럼으로 바꾼 가상 테이블을 만든다. 앞 테이블의 컬럼을 참조하는 암묵적 lateral이라 앞에 `LATERAL`을 붙이면 문법 오류이고, alias가 없으면 오류 3667이다([[MySQL-Lateral-Derived-Tables|LATERAL 파생 테이블]]).

```sql
SELECT p.id, opt.rn, opt.sku, opt.color, opt.stock
FROM product AS p
LEFT JOIN JSON_TABLE(p.options, '$[*]' COLUMNS (
  rn FOR ORDINALITY,
  sku VARCHAR(50) PATH '$.sku',
  color VARCHAR(20) PATH '$.color',
  stock INT PATH '$.stock' ERROR ON ERROR,
  has_images INT EXISTS PATH '$.images',
  NESTED PATH '$.images[*]' COLUMNS (image VARCHAR(100) PATH '$')
)) AS opt ON TRUE;
```

- `FOR ORDINALITY`는 1부터 증가하는 순번, `EXISTS PATH`는 값이 있으면 1, `NESTED PATH`는 중첩 배열을 펼치며 일치가 없으면 NULL로 채운다. 형제 NESTED PATH는 곱이 아니라 합만큼 행을 만든다.
- 콤마 조인이나 INNER JOIN은 옵션이 없는 상품 행을 빼고, `LEFT JOIN ... ON TRUE`는 NULL 행으로 남긴다.
- 컬럼의 `ON ERROR` 기본이 NULL이라 8.4.6에서 `"stock": "x"`는 경고 없이 NULL이 됐고, 색상별 `SUM(stock)`은 그 행을 조용히 빠뜨렸다. 집계와 검증에 쓰는 컬럼은 `ERROR ON ERROR`로 잘못된 값을 드러낸다. 기본값은 `DEFAULT '"FREE"' ON EMPTY`처럼 JSON 문자열로 준다.
- 펼친 행에는 인덱스가 없다. 8.4.6 EXPLAIN은 `Table function: json_table; Using temporary`였고, 조건은 도달한 문서를 모두 펼친 뒤 적용된다. 배열 원소로 상품을 찾는 조회는 multi-valued index를 먼저 검토한다.

옵션과 재고를 JSON 배열에 두고 `JSON_TABLE`로 조회, 집계하는 방식은 리포트와 표시에는 편하다. 주문으로 차감되는 재고라면 옵션별 `CHECK (stock >= 0)`, 주문 항목에서 SKU로의 FK와 옵션 단위 잠금을 줄 수 없고, 한 옵션만 바꿔도 상품 행 전체를 갱신한다. 차감되는 재고는 SKU 또는 옵션 테이블에 두고, 공통 속성은 일반 컬럼, 카테고리별 속성은 JSON에 두는 hybrid를 기본으로 한다([[Polyglot-Persistence#재고와 결제|재고와 결제]]).

## 출처

- [MySQL 8.4 Reference Manual, The JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html)
- [MySQL 8.4 Reference Manual, Functions That Search JSON Values](https://dev.mysql.com/doc/refman/8.4/en/json-search-functions.html)
- [MySQL 8.4 Reference Manual, Functions That Modify JSON Values](https://dev.mysql.com/doc/refman/8.4/en/json-modification-functions.html)
- [MySQL 8.4 Reference Manual, JSON Table Functions](https://dev.mysql.com/doc/refman/8.4/en/json-table-functions.html)
- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [인프런, 김영한, EAV의 한계와 JSON의 필요성](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402018)
- [인프런, 김영한, MySQL에서 JSON 사용하기 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402020)
- [인프런, 김영한, MySQL에서 JSON 사용하기 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402021)
- [인프런, 김영한, JSON 활용 - 다양한 실무 사례 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402022)
- [인프런, 김영한, JSON 활용 - 다양한 실무 사례 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402023)
- [인프런, 김영한, 정리 (JSON 설계)](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402029)

## 관련 문서

- [[JSON-vs-Text-Column|JSON vs TEXT 컬럼]]
- [[Flexible-Attribute-Modeling|가변 속성 모델링]]
- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]
- [[MySQL-Lateral-Derived-Tables|MySQL LATERAL 파생 테이블]]
- [[Polyglot-Persistence|Polyglot Persistence]]
