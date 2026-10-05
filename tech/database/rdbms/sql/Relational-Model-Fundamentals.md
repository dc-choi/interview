---
tags: [database, rdbms, relational-model, schema, sql]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Relational Model Fundamentals", "관계형 모델 기본 개념", "Three-Schema Architecture", "3단계 스키마 구조"]
---

# 데이터베이스와 관계형 모델 기본 개념

관계형 데이터베이스의 용어는 같은 단어가 다른 층위를 가리키는 경우가 많다. database가 데이터 자체인지 시스템 전체인지, relation이 구조인지 특정 시점의 행 집합인지 구분해야 설계와 SQL 동작을 정확히 설명할 수 있다.

## 데이터베이스, DBMS와 데이터베이스 시스템

| 용어 | 의미 | 예 |
|---|---|---|
| 데이터베이스 | 같은 서비스나 목적에서 생기는 관련 데이터를 조직화해 전자적으로 저장하고 사용하는 집합 | 회원, 게시글, 댓글 데이터 |
| DBMS | 사용자가 데이터베이스를 정의, 생성, 관리하도록 기능을 제공하는 소프트웨어 | MySQL, PostgreSQL, Oracle, SQL Server |
| 메타데이터 | 데이터베이스를 정의하거나 기술하는 데이터. 저장 위치를 카탈로그라고도 부른다 | 테이블 구조, 타입, 제약, 인덱스, 사용자와 권한 |
| 데이터베이스 시스템 | 데이터베이스, DBMS와 이를 사용하는 애플리케이션 전체 | 서비스 백엔드와 MySQL |

조직화는 검색을 빠르게 할 뿐 아니라 같은 사실의 중복 저장과 불일치를 줄인다. 문서에서 database가 데이터베이스 시스템 전체를 뜻하기도 하므로 문맥으로 구분한다.

애플리케이션이 쿼리를 보내면 DBMS는 요청을 해석하고, 카탈로그의 메타데이터로 대상 데이터의 구조를 확인한 뒤 데이터를 읽거나 바꿔 결과를 돌려준다. 메타데이터도 DBMS가 저장하고 관리하며 MySQL은 `information_schema`, Oracle은 데이터 딕셔너리 뷰로 조회한다([[Data-Dictionary|데이터 딕셔너리]]). MySQL의 처리 단계는 [[MySQL-Architecture|MySQL 아키텍처]]에 있다.

## 데이터 모델의 세 범주

데이터 모델은 데이터베이스 구조(데이터 타입, 관계, 제약)를 기술하는 개념의 집합이며 읽기와 쓰기의 기본 연산도 포함한다. 구조를 얼마나 추상화하는지에 따라 세 범주로 나눈다.

| 범주 | 추상화 수준 | 대표 모델 | 쓰임 |
|---|---|---|---|
| 개념적(high-level) | 가장 높음. 비개발자도 이해하는 개념 | Entity-Relationship 모델 | 비즈니스 요구사항을 entity, attribute, relationship으로 기술 |
| 논리적(representational) | 실제 저장 구조와 크게 다르지 않으면서 특정 DBMS나 저장 장치에 종속되지 않음 | 관계형, 객체, 객체 관계형 모델 | 데이터베이스 설계와 구축의 기준 |
| 물리적(low-level) | 저장 장치에 가장 가까움 | 파일 형식, 레코드 순서, 접근 경로 | 데이터 형식, 정렬, 인덱스 같은 access path 기술 |

백엔드 개발자가 주로 쓰는 논리 모델은 관계형 모델이다. MySQL, Oracle, SQL Server, PostgreSQL 모두 관계형 모델을 기반으로 하며, PostgreSQL처럼 스스로를 객체 관계형 DBMS(ORDBMS)로 소개하는 제품도 관계형 모델을 포함한다. 같은 개념, 논리, 물리라는 이름을 쓰는 모델링 절차의 산출물과 검증 방법은 [[Data-Modeling-Workflow|데이터 모델링 절차]]가 소유한다.

## 스키마와 상태

- 스키마는 데이터 모델로 기술한 데이터베이스의 구조다. 설계 때 정해지고 상대적으로 드물게 바뀐다. 관계형 모델에서는 테이블, 컬럼, 타입과 제약의 정의가 스키마다.
- 상태(state) 또는 스냅샷은 특정 시점에 데이터베이스에 들어 있는 데이터다. 현재 인스턴스의 집합이라고도 부르며 삽입, 수정, 삭제로 계속 바뀐다. 두 시점의 상태는 같을 수도 다를 수도 있다.

운영에서는 두 변경의 경로를 분리한다. 스키마는 버전 관리되는 migration으로 바꾸고([[Schema-Versioning|스키마 버전 관리]]), 상태는 DML과 업무 트랜잭션으로 바꾼다.

## 3단계 스키마 구조와 데이터 독립성

ANSI/SPARC 3단계 스키마 구조(three-schema architecture)는 사용자 애플리케이션을 물리적 데이터베이스로부터 분리하려는 구조다. 각 단계에 스키마가 있고 단계 사이를 mapping으로 잇는다.

| 단계 | 스키마 | 기술하는 내용 | 표현 수단 |
|---|---|---|---|
| 외부(external) | 외부 스키마, 사용자 뷰 | 특정 사용자 그룹에 필요한 데이터만 보이고 나머지는 숨김 | 논리 모델 |
| 개념(conceptual) | 개념 스키마 | 전체 데이터베이스의 entity, 타입, 관계, 사용자 연산과 제약. 물리 저장 구조는 숨김 | 논리 모델 |
| 내부(internal) | 내부 스키마 | 저장 장치의 레코드 구조, 자료 구조, 인덱스 같은 접근 경로 | 물리 모델 |

외부와 내부 단계만 두면 사용자별 요구에 맞춘 내부 표현이 늘면서 같은 데이터가 중복되고 관리 부담과 불일치가 커지기 쉽다. 개념 단계는 전체 구조를 한 번 추상화해 여러 외부 스키마가 같은 정의를 공유하게 한다. 실제 데이터는 내부 단계에만 있고 나머지 단계는 구조의 기술이다.

- 물리적 데이터 독립성: 내부 스키마가 바뀌어도 개념 스키마는 그대로 두고 개념과 내부 사이의 mapping만 바꾼다. 인덱스를 추가하거나 행 저장 형식을 바꿔도 SQL 문장은 그대로인 경우다.
- 논리적 데이터 독립성: 개념 스키마가 바뀌어도 외부 스키마를 유지한다. 컬럼 이름 변경이나 테이블 분리는 애플리케이션 쿼리에 바로 드러나기 쉬워 물리적 독립성보다 달성하기 어렵다. 호환 뷰와 단계적 전환은 [[Backward-Compatibility|하위 호환]]에 둔다.

오늘날 DBMS는 세 단계를 명시적으로 완전히 나누지 않지만 대응 관계는 남아 있다. SQL DBMS에서 뷰와 권한은 외부 스키마([[Database-Views-and-Programmability|View와 DB 저장 프로그램]]), 테이블, 타입과 제약은 개념 스키마, 스토리지 엔진, 행 형식과 인덱스는 내부 스키마에 가깝다.

## 데이터베이스 언어

| 언어 | 정의 대상 | 오늘날의 형태 |
|---|---|---|
| DDL(Data Definition Language) | 개념 스키마. 경우에 따라 내부 스키마 일부 | SQL의 `CREATE`, `ALTER`, `DROP` |
| SDL(Storage Definition Language) | 내부 스키마 | 관계형 DBMS에서는 별도 언어 대신 테이블 옵션과 서버 파라미터. MySQL은 `ROW_FORMAT` 테이블 옵션과 기본값을 정하는 `innodb_default_row_format`(기본 `DYNAMIC`)으로 행 저장 형식을 정한다 |
| VDL(View Definition Language) | 외부 스키마 | 대부분 DDL이 겸한다. SQL의 `CREATE VIEW` |
| DML(Data Manipulation Language) | 데이터의 삽입, 삭제, 수정, 검색 | SQL의 `INSERT`, `UPDATE`, `DELETE`, `SELECT` |

이 구분은 따로 존재하는 언어보다 역할의 구분에 가깝다. SQL은 관계형 데이터베이스에서 DDL, VDL, DML 역할을 통합해 제공한다. 권한과 트랜잭션 문장까지 포함한 실무 분류는 [[SQL-Fundamentals#명령 분류|SQL 명령 분류]]에 있다.

## 관계형 모델의 구성 요소

수학에서 집합 A와 B의 Cartesian product A × B는 두 집합에서 원소를 하나씩 골라 만든 모든 쌍이고, binary relation은 그 부분 집합이다. n개 집합으로 넓히면 n-ary relation은 X1 × X2 × ... × Xn의 부분 집합, 즉 n-tuple의 집합이다. 관계형 모델은 이 개념을 데이터에 적용한다.

| 개념 | 의미 |
|---|---|
| domain | 더 이상 나눌 수 없는 원자 값의 집합. 이름을 붙일 수 있다(학번 집합, 전화번호 집합, 1~4 학년 집합) |
| attribute | domain이 relation 안에서 맡는 역할의 이름. 같은 전화번호 domain을 `phone_number`와 `emergency_phone_number` 두 역할로 쓸 수 있다 |
| tuple | 각 attribute 값으로 이루어진 리스트. 일부 값은 NULL일 수 있다 |
| relation | tuple의 집합(set of tuples). 이름을 붙인다 |
| relation schema | relation 이름과 attribute 목록. `STUDENT(id, name, grade, major, phone_number, emergency_phone_number)`처럼 쓰며 attribute에 관련된 제약도 포함한다 |
| degree | relation schema의 attribute 수. 위 예는 6이다 |
| relation state | 특정 시점의 tuple 집합. relation이라는 말이 이 의미로도 쓰이며 그 tuple 수를 cardinality라고 한다 |

튜닝 문맥의 카디널리티(컬럼의 distinct 값 수나 예상 행 수)와는 다른 쓰임이다([[SQL-Tuning-Terminology#카디널리티 (Cardinality)|카디널리티]]). relation은 표로 그리기 쉬워 테이블이라고 부르는 경우가 많다. 관계형 데이터베이스는 관계형 모델로 구조화한 데이터베이스이며 여러 relation으로 구성된다. 관계형 데이터베이스 스키마는 relation schema의 집합과 relation 사이의 무결성 제약 집합이다. 키와 제약은 [[Primary-Key-Strategy#Key 용어|Key 용어]]와 [[Data-Integrity-Constraints#관계형 모델의 제약 분류|관계형 모델의 제약 분류]]로 이어진다.

## relation의 성질

- 중복된 tuple을 가질 수 없다. relation이 집합이기 때문이며 tuple을 식별하려고 attribute의 부분 집합을 키로 정한다.
- tuple의 순서는 의미가 없다. 학번 순, 이름 순처럼 표시 순서는 여러 가지가 가능하다.
- 한 relation 안에서 attribute 이름은 중복될 수 없다.
- tuple을 attribute와 값의 쌍으로 보면 attribute의 순서도 의미가 없다.
- attribute 값은 원자적이어야 한다. `서울특별시 강남구 청담동`처럼 나눌 수 있는 composite attribute와 복수 전공처럼 여러 값을 가지는 multivalued attribute는 분리한다. 이 원자성은 트랜잭션의 Atomicity가 아니라 제1정규형의 의미다([[Normalization|정규화]]).
- NULL은 값이 없거나, 있지만 모르거나, 해당 사항이 없음을 뜻한다. 한 표식이 여러 의미를 가지므로 남용하지 않는다. SQL의 비교 규칙은 [[SQL-Fundamentals-NULL|SQL NULL과 3값 논리]]에 있다.

## SQL 테이블은 relation과 다르다

| 관계형 모델 | SQL |
|---|---|
| relation | table |
| attribute | column |
| tuple | row |
| domain | domain, data type |

용어가 대응해도 의미가 같지는 않다.

- SQL 테이블은 행의 multiset이다(SQL-92 4.9). PRIMARY KEY나 UNIQUE가 없으면 완전히 같은 행이 여러 개 들어갈 수 있다. 조회 결과도 중복을 보존하므로 중복 제거가 업무 요구일 때만 `DISTINCT`나 `UNION`을 쓰고, 모든 테이블에 PK를 선언해 tuple 식별 성질을 되살린다.
- 행 순서는 보장되지 않는다. 순서가 필요한 결과는 `ORDER BY`로 요구한다.
- 컬럼에는 순서가 있다. 테이블 정의의 순서가 `SELECT *`의 결과 모양과 컬럼 목록 없는 `INSERT ... VALUES`의 값 대응을 정하므로 애플리케이션 계약에서는 컬럼을 명시한다.
- SQL은 NULL과 3값 논리를 가진다. 같은 NULL이라도 비교, 그룹화와 제약에서 다르게 다뤄진다.
- 표준 SQL을 구현하는 제품마다 문법과 타입이 다르다. 공통 개념과 제품 방언은 [[SQL-Fundamentals|SQL 기본기]]에서 구분한다.

## 면접 체크포인트

- 데이터베이스, DBMS, 데이터베이스 시스템을 구분해 설명할 수 있는가?
- 스키마와 상태(스냅샷)는 무엇이 다르고 각각 어떤 경로로 바뀌는가?
- 3단계 스키마 구조의 목적과, 논리적 데이터 독립성이 물리적 독립성보다 어려운 이유는?
- domain과 attribute, degree와 cardinality를 구분하는가?
- relation과 SQL 테이블의 차이(집합과 multiset, 행 순서, 컬럼 순서, NULL)를 설명할 수 있는가?
- 원자 값 조건이 composite attribute와 multivalued attribute에 무엇을 요구하는가?

## 출처

- [ISO/IEC 9075:1992 draft, Database Language SQL](https://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt)
- [PostgreSQL 18 Documentation, Table Basics](https://www.postgresql.org/docs/18/ddl-basics.html)
- [PostgreSQL 18 Documentation, What Is PostgreSQL?](https://www.postgresql.org/docs/18/intro-whatis.html)
- [MySQL 8.4 Reference Manual, InnoDB Row Formats](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)
- [MySQL 8.4 Reference Manual, INSERT Statement](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [YouTube, 쉬운코드, 데이터베이스 기본 개념](https://www.youtube.com/watch?v=aL0XXc1yGPs)
- [YouTube, 쉬운코드, 관계형 데이터베이스, relation, 키와 제약](https://www.youtube.com/watch?v=gjcbqZjlXjM)
- [YouTube, 쉬운코드, SQL의 개념과 데이터베이스 정의](https://www.youtube.com/watch?v=c8WNbcxkRhY)

## 관련 문서

- [[Data-Modeling-Workflow|데이터 모델링 절차]]
- [[Normalization|정규화]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Data-Integrity-Constraints|데이터 무결성과 제약 조건]]
- [[SQL-Fundamentals|SQL 기본기]]
- [[SQL-Fundamentals-NULL|SQL NULL과 3값 논리]]
- [[Data-Dictionary|데이터 딕셔너리]]
