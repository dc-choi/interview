---
tags: [database, rdbms, mysql, charset, collation, unicode]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Collation", "MySQL 콜레이션"]
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
- [인프런, Real MySQL 시즌 1 - Part 2, 콜레이션](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226573)

## 관련 문서

- [[MySQL-Charset-Migration|utf8mb4 마이그레이션]]
- [[MySQL-String-Types|MySQL 문자열 타입 선택]]
- [[Index|인덱스]]
- [[Execution-Plan|실행 계획]]
