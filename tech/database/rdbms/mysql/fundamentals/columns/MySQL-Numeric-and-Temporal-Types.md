---
tags: [database, rdbms, mysql, schema, integer, datetime]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Numeric and Temporal Types", "MySQL 정수 타입 범위", "AUTO_INCREMENT 소진", "TIMESTAMP 2038"]
---

# MySQL 숫자와 날짜 시간 타입

요구별 타입 후보는 [[MySQL-Data-and-Access-Safety#자료형은 도메인 의미로 고른다|자료형 선택표]]에 있고, 이 문서는 숫자와 날짜 시간 타입의 범위가 실제 쓰기 실패로 이어지는 지점을 모은다. 문자열 타입은 [[MySQL-String-Types|MySQL 문자열 타입 선택]]에 둔다. MySQL 8.4 문서 기준이며 8.4.6 재현 결과를 함께 적었다.

## 정수 타입의 범위

데이터 크기에 맞는 타입을 고르면 공간을 아끼지만 상한에 닿으면 쓰기가 실패한다. UNSIGNED는 음수를 버리는 대신 양수 상한이 약 두 배가 된다.

| 타입 | 바이트 | SIGNED 범위 | UNSIGNED 최대 |
|---|---|---|---|
| `TINYINT` | 1 | -128 ~ 127 | 255 |
| `SMALLINT` | 2 | -32,768 ~ 32,767 | 65,535 |
| `MEDIUMINT` | 3 | -8,388,608 ~ 8,388,607 | 16,777,215 |
| `INT` | 4 | -2,147,483,648 ~ 2,147,483,647 | 4,294,967,295 |
| `BIGINT` | 8 | -2^63 ~ 2^63-1 | 2^64-1 |

- `INT(11)`의 괄호 숫자는 표시 폭이지 저장 범위가 아니다. 8.4 문서는 정수 표시 폭과 `ZEROFILL`을 deprecated로 두고 0 채우기에는 `LPAD()`나 문자 컬럼을 권한다. `TINYINT(1)`을 boolean으로 옮길 때의 확인은 [[MySQL-to-PostgreSQL-Migration|이기종 마이그레이션]]에 있다.
- UNSIGNED가 섞인 정수 뺄셈 결과가 음수면 기본 sql_mode에서 오류 1690(`BIGINT UNSIGNED value is out of range`)이다([[MySQL-SQL-Mode|MySQL SQL Mode]]의 `NO_UNSIGNED_SUBTRACTION`). 재고 차감처럼 0 아래로 내려갈 수 있는 계산은 식의 타입까지 확인한다.
- 외래 키의 정수 컬럼은 참조 컬럼과 크기, sign이 같아야 한다([[Foreign-Key-Integrity|외래 키와 참조 무결성]]). PostgreSQL에는 unsigned가 없어 이관 때 한 단계 큰 타입으로 옮긴다.

### AUTO_INCREMENT 상한

매뉴얼은 필요한 최대 순번을 담는 가장 작은 정수 타입을 권하지만, 컬럼이 타입 상한에 닿으면 다음 순번 생성이 실패한다. `TINYINT`는 127, `TINYINT UNSIGNED`는 255가 마지막 순번이다.

- 8.4.6에서 `TINYINT` AUTO_INCREMENT가 127에 닿자 다음 INSERT는 범위 오류가 아니라 `Duplicate entry '127' for key 'ai.PRIMARY'`(1062)로 실패했다. 1062를 일괄 입력 충돌로 번역하면 소진 장애가 중복 요청처럼 보이므로 오류가 난 키 이름을 함께 본다([[MySQL-Error-Handling|MySQL 오류 처리]]).
- 삭제, rollback과 UPSERT도 번호를 소비해 실제 행 수보다 빨리 상한에 다가간다([[DML-Conflict-and-Batch-Patterns#UPSERT와 IGNORE가 소모하는 AUTO_INCREMENT|UPSERT와 IGNORE의 소모]]).
- `sys.schema_auto_increment_columns`는 테이블별 `max_value`, 현재 `auto_increment`와 사용 비율 `auto_increment_ratio`를 비율 내림차순으로 보여 준다. 8.4.6 재현의 소진된 컬럼은 비율이 `1.0000`이었다. 비율 임계값 알림을 둔다.
- 로그, 이벤트, 알림처럼 빠르게 쌓이는 테이블은 `BIGINT`로 시작하는 비용이 나중의 PK 타입 변경보다 작다. PK 타입 변경은 테이블 재구축이고 참조하는 FK 컬럼까지 같은 타입으로 바꿔야 한다. 반대로 PK 폭은 InnoDB secondary index마다 복제되므로 성장 상한과 인덱스 비용을 함께 비교한다([[Primary-Key-Strategy#Auto increment|Auto increment]]).

## DATETIME과 TIMESTAMP

날짜와 시각은 문자열이 아니라 전용 타입에 저장해야 비교와 기간 계산을 DB 함수로 할 수 있다.

| 타입 | 지원 범위 | time zone 처리 |
|---|---|---|
| `DATE` | `'1000-01-01'` ~ `'9999-12-31'` | 없음 |
| `DATETIME` | `'1000-01-01 00:00:00'` ~ `'9999-12-31 23:59:59'` | 입력한 값을 변환 없이 저장 |
| `TIMESTAMP` | `'1970-01-01 00:00:01'` UTC ~ `'2038-01-19 03:14:07'` UTC | 저장 때 세션 time zone에서 UTC로, 조회 때 UTC에서 세션 time zone으로 변환 |

- 2038년 상한은 먼 미래의 문제가 아니다. 만료일, 보증 종료일, 장기 예약과 만기일처럼 미래 시점을 담는 값은 지금도 상한을 넘을 수 있다. 8.4.6에서 `TIMESTAMP` 컬럼에 2040년을 넣으면 strict mode는 오류 1292(`Incorrect datetime value`)로 거부했고, strict를 끈 세션은 경고 1264와 함께 `0000-00-00 00:00:00`을 저장했다. 같은 값은 `DATETIME`에 그대로 들어갔다.
- 가입일, 주문일, 작성일처럼 날짜와 시각이 함께 필요한 값은 `DATETIME`을 기본으로 두고 UTC 저장 규약을 애플리케이션 경계에서 강제한다([[Recurring-Event-Modeling|반복 일정 모델링]]). 생년월일처럼 시각이 필요 없으면 `DATE`를 쓴다. `TIMESTAMP`는 자동 time zone 변환이 꼭 필요하고 값이 범위 안에 머무를 때만 고른다.
- `TIMESTAMP`는 저장한 뒤 세션 time zone을 바꾸면 같은 값이 다르게 조회된다. 연결 풀과 마이그레이션 도구의 time zone 설정을 함께 고정한다.

## 출처

- [MySQL 8.4 Reference Manual, Integer Types](https://dev.mysql.com/doc/refman/8.4/en/integer-types.html)
- [MySQL 8.4 Reference Manual, Numeric Data Type Attributes](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-attributes.html)
- [MySQL 8.4 Reference Manual, Using AUTO_INCREMENT](https://dev.mysql.com/doc/refman/8.4/en/example-auto-increment.html)
- [MySQL 8.4 Reference Manual, The schema_auto_increment_columns View](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-auto-increment-columns.html)
- [MySQL 8.4 Reference Manual, The DATE, DATETIME, and TIMESTAMP Types](https://dev.mysql.com/doc/refman/8.4/en/datetime.html)
- [인프런, 얄팍한 코딩사전, 자료형](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86856)
- [인프런, 얄팍한 코딩사전, 테이블 만들고 데이터 입력하기](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86855)
- [인프런, 김영한, 데이터 타입2 - 날짜와 시간 타입](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347676)
- [인프런, 김영한, 정리(물리적 모델링)](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347679)

## 관련 문서

- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]
- [[MySQL-String-Types|MySQL 문자열 타입 선택]]
- [[Primary-Key-Strategy|PK 생성 전략]]
- [[MySQL-Query-Fundamentals-Functions|MySQL 내장 함수와 암묵 변환]]
- [[Recurring-Event-Modeling|반복 일정 모델링]]
