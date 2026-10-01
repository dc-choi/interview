---
tags: [database, rdbms, mysql, charset, collation, unicode]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Collation", "MySQL 콜레이션", "WEIGHT_STRING", "한글 자모 collation"]
---

# MySQL Collation

Character set은 문자를 어떤 코드로 저장할지 정하고, collation은 같은 character set 안에서 문자열을 비교하고 정렬하는 규칙을 정한다. Collation 선택은 화면 표시만이 아니라 `=`, `LIKE`, `ORDER BY`, `GROUP BY`, `DISTINCT`와 `UNIQUE` 제약의 의미를 바꾼다.

## utf8mb4를 명시한다

MySQL 8.4의 기본 character set과 collation은 `utf8mb4`, `utf8mb4_0900_ai_ci`다. `utf8mb4`는 문자당 1바이트에서 4바이트를 사용해 supplementary character까지 표현한다. 반면 `utf8`은 현재 deprecated된 `utf8mb3`의 별칭이므로 새 스키마에서는 의미가 바뀔 수 있는 `utf8` 대신 `utf8mb4`를 명시한다.

```sql
CREATE TABLE customer (
  id BIGINT PRIMARY KEY,
  display_name VARCHAR(100)
) CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

## 이름에서 비교 규칙 읽기

`utf8mb4_0900_ai_ci`는 다음 정보를 담는다.

| 부분 | 의미 |
|---|---|
| `utf8mb4` | character set |
| `0900` | Unicode Collation Algorithm 9.0 기반 |
| `ai`, `as` | accent-insensitive, accent-sensitive |
| `ci`, `cs` | case-insensitive, case-sensitive |
| `ks` | kana-sensitive |
| `bin` | character code 값 기반 비교 |

`_ci`에서는 대소문자만 다른 값이 같다고 비교될 수 있다. 로그인 ID, 외부 식별자처럼 대소문자 구분이 업무 규칙이면 적합한 case-sensitive 또는 binary 계열 collation을 선택하고 `UNIQUE` 동작까지 테스트한다.

UCA 9.0 이상 collation은 `NO PAD`이므로 문자열 끝 공백도 비교에 참여한다. 이전 UCA 기반 collation은 대체로 `PAD SPACE`다. collation 변경 때는 정렬 순서뿐 아니라 후행 공백 때문에 equality와 unique 충돌이 달라지는지도 확인한다.

### 대소문자를 구분하는 후보

| collation | 비교 기준 | 후행 공백 | 특징 |
|---|---|---|---|
| `utf8mb4_bin` | 문자 코드 값 | `PAD SPACE`, 무시 | `'abc'`와 `'abc '`가 같아 UNIQUE에서 충돌 |
| `utf8mb4_0900_bin` | utf8mb4 인코딩 바이트 | `NO PAD`, 구분 | 정렬 순서는 `utf8mb4_bin`과 같고 매뉴얼상 훨씬 빠름 |
| `utf8mb4_0900_as_cs` | UCA 가중치 3단계 | `NO PAD`, 구분 | 대소문자와 악센트를 구분하는 언어 규칙 정렬 |

후행 공백을 다른 값으로 볼지, 언어 규칙 정렬이 필요한지, 비교 비용이 중요한지로 고른다. UNIQUE의 의미도 함께 바뀐다. `ester`와 `ESTER`는 `_ci`에서 중복이고 세 후보에서는 서로 다른 값이다(8.4.6 확인).

## 가중치로 비교 결과를 확인한다

UCA 기반 collation은 문자 코드가 아니라 가중치(weight)로 비교한다. UCA는 기본 문자(1단계), 악센트(2단계), 대소문자와 변형(3단계) 가중치를 두고, collation 이름의 민감도가 비교할 단계를 정한다. 8.4.6의 `WEIGHT_STRING()`은 `_ai_ci`에서 1단계, `_as_ci`에서 2단계, `_as_cs`에서 3단계까지 가중치를 만들었다. 저장과 비교도 별개다. `가`는 U+AC00이고 utf8mb4에서 `EA B0 80` 3바이트로 저장되지만 비교는 가중치로 한다.

```sql
SELECT HEX(WEIGHT_STRING('가' COLLATE utf8mb4_0900_ai_ci)) AS syllable,
       HEX(WEIGHT_STRING('ㄱㅏ' COLLATE utf8mb4_0900_ai_ci)) AS jamo;
-- 8.4.6: 둘 다 3BF53C73
```

`WEIGHT_STRING()`은 매뉴얼상 내부용 디버깅 함수라 버전마다 출력이 바뀔 수 있다. 두 값이 왜 같게 비교되는지 확인하는 데만 쓰고 저장하거나 로직에 쓰지 않는다.

기본 collation의 한글 함정이 대표 사례다. 완성형 음절은 초성, 중성, 종성 자모로 분해되어 가중치가 계산되고, 호환 자모(U+3131 계열)는 대응하는 자모와 3단계에서만 다르다. 8.4.6 결과는 다음과 같다.

- 받침 없는 음절과 그 초성, 중성 호환 자모열(`가`와 `ㄱㅏ`, `하`와 `ㅎㅏ`, `과`와 `ㄱㅘ`)은 `utf8mb4_0900_ai_ci`와 `utf8mb4_0900_as_ci`에서 같다.
- 받침이 있는 `한`과 `ㅎㅏㄴ`, `각`과 `ㄱㅏㄱ`은 같지 않다. 호환 자모 `ㄴ`, `ㄱ`이 받침이 아니라 초성 자모로 대응되기 때문이다.
- `utf8mb4_0900_as_cs`, `utf8mb4_0900_bin`, `utf8mb4_bin`과 이전 세대의 `utf8mb4_unicode_ci`(UCA 4.0.0), `utf8mb4_general_ci`에서는 `가`와 `ㄱㅏ`가 다르다.
- 조합형 자모(U+1100 계열)로 쓴 `가`는 완성형과 정준 등가라 `utf8mb4_0900_as_cs`에서도 같다. 두 자모 계열이 정규화에서 접히는 문제는 [[OpenSearch-Query-Understanding|OpenSearch 질의 이해]]에도 있다.

그래서 기본 collation에서 `WHERE nickname = '가'`는 `ㄱㅏ` 행도 찾고, 닉네임이나 로그인 ID의 UNIQUE는 두 값을 중복으로 거부하며(오류 1062), `GROUP BY`와 `DISTINCT`는 둘을 한 값으로 합친다. 구분이 업무 규칙이면 그 컬럼의 collation을 `utf8mb4_0900_as_cs`나 binary 계열로 두고, 일시적으로 구분해야 하는 조회는 인덱스를 타는 원래 조건에 구분 조건을 더한다(아래 인덱스 절). 후보 collation마다 실제 입력 예시로 `WEIGHT_STRING` 결과와 UNIQUE 충돌을 테스트한 뒤 정한다.

## 적용 범위와 우선순위

Character set과 collation은 server, database, table, column 단위 기본값을 상속한다. 상위 기본값을 바꿔도 이미 만들어진 column 정의가 자동 변환되는 것은 아니므로 실제 정의를 확인한다.

```sql
SHOW CREATE TABLE customer;

SELECT column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'customer';
```

서로 다른 collation의 식을 비교한다고 항상 오류가 나는 것은 아니다. MySQL은 coercibility가 낮은 식의 collation을 우선한다. 명시적 `COLLATE`는 0, column은 2, literal은 4이며 더 낮은 값이 우선한다. 같은 우선순위의 호환되지 않는 collation끼리는 오류가 날 수 있고, Unicode와 non-Unicode 조합은 한쪽을 자동 변환할 수 있다.

```sql
SELECT display_name
FROM customer
WHERE display_name = _utf8mb4'kim' COLLATE utf8mb4_0900_as_cs;
```

자동 변환 결과에 기대기보다 join key와 비교 대상의 character set, collation을 스키마에서 맞추는 편이 안전하다. 임시 `COLLATE`는 예외적인 조회 규칙을 드러낼 때 사용한다.

## 인덱스와 마이그레이션

문자열 인덱스는 column collation의 정렬 가중치를 사용한다. column에 다른 `COLLATE`를 적용해 indexed ordering과 다른 비교 의미를 요구하면 direct index lookup이 어려워질 수 있지만, `COLLATE`가 있다는 이유만으로 인덱스를 항상 못 쓴다고 단정할 수는 없다. literal 쪽 변환 여부와 실제 access type을 `EXPLAIN ANALYZE`로 확인한다.

8.4.6에서 `utf8mb4_0900_ai_ci` 컬럼 `login_id`(일반 인덱스, 약 2만 행)를 조회한 결과는 다음과 같다.

| 조건 | access type |
|---|---|
| `login_id COLLATE utf8mb4_0900_as_cs = 'ester'` | `ALL` |
| `login_id = 'ester' COLLATE utf8mb4_0900_as_cs` | `ALL` |
| `login_id = 'ester' COLLATE utf8mb4_0900_ai_ci` | `ref` |
| `login_id = 'ester' AND login_id COLLATE utf8mb4_0900_as_cs = 'ester'` | `ref`, 구분 조건은 필터 |

- 명시적 `COLLATE`는 coercibility 0으로 가장 우선하므로 어느 쪽에 붙든 비교 전체의 collation이 된다. 컬럼과 다른 collation이면 리터럴 쪽에 붙여도 인덱스 순서와 맞지 않아 full scan이 됐다.
- 가끔 필요한 구분 조회는 컬럼 collation 조건으로 후보를 좁히고 구분 조건을 필터로 더한다.
- 그 비교 규칙이 상시 접근 경로라면 컬럼 collation을 바꾸거나 같은 식으로 함수 인덱스 `INDEX ((login_id COLLATE utf8mb4_0900_as_cs))`를 만든다. 8.4.6에서 이 인덱스는 컬럼 쪽 `COLLATE` 조건에만 `ref`로 쓰였고 리터럴 쪽 형태에는 쓰이지 않았다. 쿼리 식이 인덱스 식과 같아야 하므로 `EXPLAIN`으로 확인한다([[MySQL-Generated-Columns-and-Functional-Indexes|함수 인덱스]]).

Collation 변경 전에는 다음을 점검한다.

1. 새 equality 규칙에서 합쳐지는 PK 또는 UNIQUE 값이 있는가?
2. join column 양쪽의 character set과 collation이 같은가?
3. 후행 공백, 대소문자와 accent 구분이 업무 규칙과 맞는가?
4. index key 길이와 rebuild 비용을 감당할 수 있는가?
5. 애플리케이션 connection character set도 `utf8mb4`로 맞췄는가?

변경은 테스트 데이터로 중복과 정렬 결과를 검증한 뒤 online DDL 가능 여부, metadata lock과 replica lag를 관찰하며 수행한다.

## 출처

- [MySQL 8.4 Reference Manual, Character Sets and Collations in General](https://dev.mysql.com/doc/refman/8.4/en/charset-general.html)
- [MySQL 8.4 Reference Manual, Collation Naming Conventions](https://dev.mysql.com/doc/refman/8.4/en/charset-collation-names.html)
- [MySQL 8.4 Reference Manual, Collation Coercibility in Expressions](https://dev.mysql.com/doc/refman/8.4/en/charset-collation-coercibility.html)
- [MySQL 8.4 Reference Manual, Unicode Character Sets](https://dev.mysql.com/doc/refman/8.4/en/charset-unicode-sets.html)
- [MySQL 8.4 Reference Manual, String Functions and Operators (WEIGHT_STRING)](https://dev.mysql.com/doc/refman/8.4/en/string-functions.html#function_weight-string)
- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [Unicode Technical Standard #10, Unicode Collation Algorithm](https://www.unicode.org/reports/tr10/)
- [인프런, Real MySQL 시즌 1 - Part 2, 콜레이션](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226573)

## 관련 문서

- [[MySQL-Charset-Migration|utf8mb4 마이그레이션]]
- [[MySQL-String-Types|MySQL 문자열 타입 선택]]
- [[Index|인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]
