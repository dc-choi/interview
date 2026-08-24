---
tags: [database, rdbms, mysql, sql]
status: done
verified_at: 2026-08-24
category: "Database - RDBMS"
aliases: ["MySQL SQL Mode", "MySQL SQL 모드"]
---

# MySQL SQL Mode

`sql_mode`는 MySQL이 SQL 문법을 어떻게 해석하고 유효하지 않은 데이터를 어떻게 처리할지 결정하는 시스템 변수다. 같은 INSERT가 어떤 서버에서는 오류로 거부되고 다른 서버에서는 경고와 함께 보정된 값으로 저장되는 차이는 대부분 이 변수에서 나온다. 스키마 제약이 잘못된 상태를 막는 선언이라면, sql_mode는 위반을 오류로 강제할지 경고로 넘길지를 정하는 실행 규칙이다.

## 설정과 확인

서버 기동 시에는 커맨드라인 `--sql-mode="modes"` 또는 설정 파일(`my.cnf`)의 `sql-mode="modes"`로 지정한다. 런타임에는 GLOBAL과 SESSION 스코프로 나뉜다.

```sql
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY';  -- 이후 새 연결에 적용
SET SESSION sql_mode = 'TRADITIONAL';                            -- 현재 연결에만 적용

SELECT @@GLOBAL.sql_mode;
SELECT @@SESSION.sql_mode;
```

- GLOBAL 변경에는 `SYSTEM_VARIABLES_ADMIN` 권한(또는 deprecated된 `SUPER`)이 필요하고, 이미 맺어진 연결에는 영향이 없다.
- `SET GLOBAL`은 재시작하면 사라진다. 영구 반영은 설정 파일, `SET PERSIST` 또는 관리형 DB의 parameter group으로 하고, 변경 절차는 [[MySQL-Configuration-Change-Management|MySQL 설정 변경 관리]]를 따른다.
- 모드는 쉼표로 조합하며 `sql_mode = ''`로 전부 비울 수도 있다. 빈 값은 관대한(permissive) 동작을 뜻하지 검증이 좋아지는 것이 아니다.

## MySQL 8.4 기본값

기본 `sql_mode`는 다음 6개 조합이다.

| 모드 | 역할 |
|---|---|
| `STRICT_TRANS_TABLES` | 트랜잭셔널 테이블에서 유효하지 않은 값을 오류로 거부 |
| `ONLY_FULL_GROUP_BY` | GROUP BY에 없고 함수 종속도 아닌 비집계 컬럼 참조를 거부 |
| `NO_ZERO_DATE` | `'0000-00-00'` 저장을 허용하되 경고, strict와 함께면 오류 (deprecated, strict에 통합 예정) |
| `NO_ZERO_IN_DATE` | `'2010-00-01'`처럼 월, 일이 0인 날짜를 `'0000-00-00'`으로 바꿔 저장하고 경고, strict와 함께면 오류 (deprecated) |
| `ERROR_FOR_DIVISION_BY_ZERO` | 데이터 변경문의 0으로 나누기에 NULL을 저장하되 경고, strict와 함께면 오류 (deprecated) |
| `NO_ENGINE_SUBSTITUTION` | 요청한 스토리지 엔진이 없으면 기본 엔진으로 대체하지 않고 오류 |

deprecated 표기된 3개는 단독 모드로는 폐기 예정이며 향후 strict mode에 흡수된다. 기본값을 유지하면 되고, 일부만 빼서 쓰는 조합은 만들지 않는 편이 안전하다.

## Strict Mode 동작

strict mode는 `STRICT_TRANS_TABLES`와 `STRICT_ALL_TABLES` 중 하나라도 켜져 있는 상태다. 범위 초과, 타입 불일치, 다중 행 문장의 NOT NULL 위반 같은 유효하지 않은 값을 경고 후 보정(가장 가까운 값으로 절단, 암묵 기본값 대입)하는 대신 오류로 문장을 중단시킨다. 적용 대상은 INSERT, UPDATE, DELETE, LOAD DATA 등의 변경문과 ALTER TABLE, CREATE TABLE 같은 DDL, 그리고 `SELECT SLEEP()`까지 포함한 정해진 문장 목록이다(strict에서 `SELECT SLEEP(-1)`은 오류). 데이터를 바꾸지 않는 일반 SELECT의 유효하지 않은 값은 strict에서도 경고에 그치고, SELECT의 0으로 나누기는 strict와 무관하게 NULL을 돌려준다(strict에서는 경고가 함께 붙는다).

- `STRICT_TRANS_TABLES`: InnoDB 같은 트랜잭셔널 테이블에서는 오류를 내고 문장 전체를 롤백한다. 논트랜잭셔널 테이블에서는 첫 행 오류면 중단하고, 이미 일부 행이 들어간 뒤의 오류면 값을 보정하고 경고로 계속한다.
- `STRICT_ALL_TABLES`: 엔진과 무관하게 오류 시점에 중단한다. 논트랜잭셔널 테이블에서는 이미 반영된 행이 되돌려지지 않아 부분 갱신이 남을 수 있다.
- `IGNORE` 키워드는 strict mode보다 우선한다. strict를 켜 두어도 IGNORE를 쓰면 중복 키 같은 무시 가능한(ignorable) 오류가 경고로 강등되고, 무시 불가능한 오류는 그대로 오류로 남는다. IGNORE 자체의 동작과 사용 사례는 [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]에 둔다.

조건마다 기본 처리(오류 또는 경고)가 있고, IGNORE는 오류를 경고로 내리고 strict는 경고를 오류로 올린다.

| 조합 | 기본이 오류인 조건 (중복 키, 단일 행의 명시적 NULL) | 기본이 경고인 조건 (값 절단, 보정) |
|---|---|---|
| 둘 다 없음 | 오류 | 경고 + 값 보정 |
| IGNORE만 | 경고로 강등 | 경고 |
| strict만 | 오류 | 오류로 격상 |
| IGNORE + strict | 경고 (IGNORE 우선) | 경고 |

InnoDB의 `innodb_strict_mode`(8.4 기본 ON)는 별개 변수다. 이는 CREATE TABLE의 ROW_FORMAT 같은 테이블 옵션 검증을 다루며 sql_mode의 데이터 검증과 다른 층이다.

## 주요 개별 모드

검증 계열은 위 기본값에 포함된 것이 핵심이고, 나머지는 대부분 문법 호환 계열이다.

- `ANSI_QUOTES`: 큰따옴표(`"`)를 문자열이 아니라 식별자 인용부호로 해석한다. 표준 SQL 문법과의 호환에 쓰이지만 켜는 순간 `"text"` 문자열 리터럴이 전부 깨지므로 기존 쿼리 자산과 함께 검토해야 한다. 백틱은 계속 식별자로 쓸 수 있다.
- `PIPES_AS_CONCAT`: `||`를 OR가 아니라 표준 SQL의 문자열 연결로 해석한다.
- `IGNORE_SPACE`: 함수명과 괄호 사이 공백을 허용하는 대신 내장 함수명이 예약어가 된다.
- `NO_AUTO_VALUE_ON_ZERO`: AUTO_INCREMENT 컬럼에 0을 넣어도 다음 시퀀스를 생성하지 않고 0을 그대로 저장한다. 0 값이 들어 있던 덤프를 복원할 때 필요하다.
- `NO_UNSIGNED_SUBTRACTION`: 피연산자에 UNSIGNED가 섞인 정수 뺄셈 결과를 signed로 만든다. 기본에서는 결과가 음수가 되면 오류가 난다 (`CAST(0 AS UNSIGNED) - 1`은 이 모드에서 `-1`).
- `TIME_TRUNCATE_FRACTIONAL`: 소수점 초를 반올림 대신 절단한다.
- `ALLOW_INVALID_DATES`: 월 1~12, 일 1~31 범위만 검사하고 `'2004-04-31'` 같은 실재하지 않는 날짜를 허용한다. TIMESTAMP 컬럼에는 적용되지 않는다.
- `PAD_CHAR_TO_FULL_LENGTH` (deprecated): CHAR 값을 조회할 때 후행 공백을 잘라내는 기본 동작 대신 컬럼 정의 길이까지 공백으로 채워 돌려준다. VARCHAR에는 적용되지 않는다.
- `HIGH_NOT_PRECEDENCE`: NOT 연산자 우선순위를 과거 방식으로 높인다.

`ONLY_FULL_GROUP_BY`는 비집계 컬럼이 그룹 키의 함수 종속(예: PK로 그룹하면 같은 테이블의 다른 컬럼)임이 인정되면 허용한다. 임의의 한 행 값을 의도적으로 고르는 자리에는 모드를 끄는 대신 `ANY_VALUE()`로 의도를 표시한다.

## 조합 모드

- `ANSI` = `REAL_AS_FLOAT`, `PIPES_AS_CONCAT`, `ANSI_QUOTES`, `IGNORE_SPACE`, `ONLY_FULL_GROUP_BY`. 표준 SQL에 가까운 문법 해석 묶음이다.
- `TRADITIONAL` = `STRICT_TRANS_TABLES`, `STRICT_ALL_TABLES`, `NO_ZERO_IN_DATE`, `NO_ZERO_DATE`, `ERROR_FOR_DIVISION_BY_ZERO`, `NO_ENGINE_SUBSTITUTION`. 경고 대신 오류를 내는 전통적 SQL 서버처럼 동작한다. 단, `STRICT_ALL_TABLES`가 포함되므로 논트랜잭셔널 테이블에서는 다중 행 문장이 중간에 끊겨 부분 반영이 남을 수 있다.

## 운영 체크포인트

- **replica에서 sql_mode를 로컬로 덮어쓰지 않는다.** sql_mode는 `NO_DIR_IN_CREATE`를 제외하면 복제 대상이라 보통은 양단이 같지만, replica 로컬 설정으로 갈라 두면 특히 파티션 테이블 복제에서 양단이 다른 데이터를 만들 수 있다.
- **파티션 테이블에 데이터가 들어간 뒤에는 서버 sql_mode를 바꾸지 않는다.** 파티셔닝 함수의 결과가 달라져 데이터 손상이나 유실로 이어질 수 있다.
- **애플리케이션 프레임워크가 세션 모드를 바꾸는지 확인한다.** 서버 기본값과 커넥션 풀의 세션 설정이 다르면 콘솔에서 재현되지 않는 동작 차이가 난다. 진단 시 `@@GLOBAL`과 `@@SESSION`을 모두 본다.
- **`ONLY_FULL_GROUP_BY`나 strict를 끄는 것으로 오류를 해결하지 않는다.** 오류는 쿼리나 데이터의 문제를 드러낸 것이고, 모드를 끄면 문제가 비결정적 결과나 조용한 값 보정으로 바뀔 뿐이다.
- **legacy 데이터 이관 시 모드 차이를 명시적으로 다룬다.** zero date나 잘린 값이 들어 있는 구버전 덤프는 기본 모드에서 복원이 실패할 수 있다. 임시로 세션 모드를 낮추더라도 범위와 기간을 정해 두고 되돌린다.

## 점검 질문

- `STRICT_TRANS_TABLES`와 `STRICT_ALL_TABLES`의 차이를 논트랜잭셔널 테이블의 부분 갱신 관점에서 설명할 수 있는가.
- `INSERT IGNORE`가 strict mode를 무력화하는 이유와, 그런데도 IGNORE를 쓰는 대표 사례를 말할 수 있는가.
- 복제 환경에서 sql_mode 불일치가 왜 데이터 드리프트로 이어지는지 설명할 수 있는가.
- `ONLY_FULL_GROUP_BY` 오류를 만났을 때 모드를 끄지 않고 해결하는 두 가지 방법(그룹 키 보강, `ANY_VALUE()`)을 말할 수 있는가.

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]
- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[MySQL-Configuration-Change-Management|MySQL 설정 변경 관리]]
- [[MySQL-Error-Handling|MySQL 오류 처리]]
- [[MySQL-Partitioning|MySQL Partitioning]]

## 출처

- [MySQL 8.4 Reference Manual, Server SQL Modes](https://dev.mysql.com/doc/refman/8.4/en/sql-mode.html)
- [MySQL 8.4 Reference Manual, MySQL Handling of GROUP BY](https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html)
- [MySQL 8.4 Reference Manual, Replication and Variables](https://dev.mysql.com/doc/refman/8.4/en/replication-features-variables.html)
- [MySQL 8.4 Reference Manual, InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_strict_mode)
- [MySQL 8.4 Reference Manual, Persisted System Variables](https://dev.mysql.com/doc/refman/8.4/en/persisted-system-variables.html)
