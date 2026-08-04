---
tags: [database, rdbms, mysql, generated-column, functional-index]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Generated Columns", "MySQL 함수 기반 인덱스"]
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

## 허용 범위와 제한

생성 식에는 literal, 연산자와 허용된 deterministic built-in function을 쓸 수 있다. 다음은 허용되지 않는다.

- 비결정 built-in function
- stored function과 loadable function
- subquery, parameter, system/user/local variable
- 뒤에 정의된 다른 생성 컬럼 참조

함수 key part는 생성 컬럼 제한을 상속한다. 단순 컬럼명만 감싸거나 prefix 길이를 붙일 수 없고, foreign key, primary key, FULLTEXT, SPATIAL key part로도 쓸 수 없다. 함수 key part마다 숨은 가상 컬럼 하나를 사용하므로 테이블 컬럼 수 한도에도 포함된다.

MySQL 8.4 공식 규칙상 trigger에서 `NEW.generated_col`이나 `OLD.generated_col`을 참조할 수 없다. 특정 버전에서 우연히 동작한 관찰보다 배포 대상 버전의 문서와 회귀 테스트를 따른다.

## 운영 변경

생성 컬럼 추가, VIRTUAL/STORED 전환과 인덱스 생성은 각각 지원하는 online DDL 알고리즘이 다르다. 운영 migration에서는 `ALGORITHM`과 `LOCK` 지원 여부, 전체 행 계산, redo와 replica 지연을 사전 검증한다. 표현식이 SQL mode에 따라 달라지면 평가 시점 환경에 따라 값이 달라질 수 있으므로 mode도 고정한다.

## 출처

- [MySQL 8.4 Reference Manual, CREATE TABLE and Generated Columns](https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html)
- [MySQL 8.4 Reference Manual, Optimizer Use of Generated Column Indexes](https://dev.mysql.com/doc/refman/8.4/en/generated-column-index-optimizations.html)
- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [인프런, Real MySQL 시즌 1 - Part 1, Generated 컬럼 및 함수 기반 인덱스](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226568)

## 관련 문서

- [[Index|인덱스]]
- [[Query-Antipatterns|SQL 쿼리 안티패턴]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
