---
tags: [database, rdbms, mysql, stored-function, optimizer]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Stored Functions", "MySQL 저장 함수"]
---

# MySQL 저장 함수

저장 함수는 서버에 정의하고 SQL 표현식에서 호출해 값을 반환하는 stored routine이다. 중복 계산을 한곳에 둘 수 있지만, 행마다 실행되는 비용, 옵티마이저 정보, 복제 안전성과 권한 경계를 함께 책임져야 한다.

## 결정성은 계약이다

```sql
CREATE FUNCTION normalize_score(score DECIMAL(5, 2))
RETURNS DECIMAL(5, 2)
DETERMINISTIC
NO SQL
SQL SECURITY INVOKER
RETURN LEAST(100, GREATEST(0, score));
```

같은 입력에 항상 같은 결과를 내면 `DETERMINISTIC`, 시점, 세션이나 변경 가능한 데이터에 따라 달라질 수 있으면 `NOT DETERMINISTIC`이다. 아무것도 쓰지 않으면 기본값은 `NOT DETERMINISTIC`이다.

이 선언은 MySQL이 함수 본문을 증명한 결과가 아니다. 작성자의 계약이며 서버는 진실성을 검사하지 않는다.

- 실제 비결정 함수를 `DETERMINISTIC`으로 거짓 선언하면 옵티마이저가 잘못된 계획이나 결과를 만들 수 있다.
- 실제 결정 함수를 `NOT DETERMINISTIC`으로 두면 상수화 같은 사용 가능한 최적화를 놓칠 수 있다.
- 함수가 테이블을 읽는다면 인자만 같다고 결정적인 것이 아니다. 참조 데이터가 바뀌는지도 계약에 포함한다.
- binary logging이 켜진 환경에서는 결정성 선언이 함수 생성 허용과 복제 안전성에도 영향을 준다.

따라서 성능을 위해 모든 함수에 `DETERMINISTIC`을 붙이지 않는다. 의미가 참일 때만 선언하고, 대표 쿼리의 `EXPLAIN ANALYZE`와 호출 횟수를 확인한다.

## NOW와 SYSDATE

`NOW()`는 한 SQL 문장이 시작한 시각을 문장 안에서 일정하게 반환한다. `SYSDATE()`는 실제 호출 시각을 반환하므로 한 문장 안에서도 값이 달라질 수 있고, 이를 참조하는 표현식 평가에는 인덱스를 사용할 수 없다. `--sysdate-is-now`는 `SYSDATE()`를 `NOW()`의 별칭으로 만들지만 source와 replica에 일관되게 적용해야 한다.

저장 함수가 `NOW()`를 포함하면 문장 안에서 값이 일정하더라도 함수 자체는 비결정적이다. 문장 단위 안정성과 함수의 장기 결정성을 같은 개념으로 취급하지 않는다.

## 성능과 운영 경계

- `WHERE indexed_col = stored_function(?)`에서 함수가 상수처럼 평가될지는 결정성, 인자와 계획에 달려 있다. 선언만 보고 인덱스 사용을 보장하지 않는다.
- 컬럼마다 함수를 호출하는 조건은 대량 행에서 비싸다. 가능한 경우 범위 조건, 조인, 생성 컬럼이나 함수 인덱스와 비교한다.
- `SQL SECURITY DEFINER`가 기본이다. definer 권한으로 실행할 필요가 없다면 `INVOKER`를 검토하고 definer 계정의 수명과 권한을 관리한다.
- 함수가 의존하는 SQL mode는 생성 또는 변경 시점 값으로 저장된다. 마이그레이션에서 정의와 환경을 함께 버전 관리한다.
- 도메인 규칙을 DB 함수에 둘지 애플리케이션 코드에 둘지는 다중 소비자, 원자성, 배포 결합과 관측 가능성으로 결정한다.

## 출처

- [MySQL 8.4 Reference Manual, CREATE PROCEDURE and CREATE FUNCTION](https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html)
- [MySQL 8.4 Reference Manual, Date and Time Functions](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html)
- [MySQL 8.4 Reference Manual, Stored Program Binary Logging](https://dev.mysql.com/doc/refman/8.4/en/stored-programs-logging.html)
- [인프런, Real MySQL 시즌 1 - Part 1, Stored Function](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226565)

## 관련 문서

- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
