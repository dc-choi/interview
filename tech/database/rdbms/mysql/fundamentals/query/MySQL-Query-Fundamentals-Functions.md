---
tags: [database, rdbms, mysql, sql, function, type-conversion]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Functions", "MySQL 내장 함수", "MySQL 암묵 변환", "MySQL Type Conversion"]
---

# MySQL 내장 함수와 암묵 변환

[[MySQL-Query-Fundamentals|MySQL 조회 기본기]]에서 함수 절을 분리한 문서다. 함수 이름보다 결과가 오류 없이 달라지는 경계 규칙을 모은다. MySQL 8.4 문서 기준이며 8.4.6 재현 결과를 함께 적었다.

## 문자열과 숫자의 암묵 변환

MySQL은 산술 문맥에서 문자열을 숫자로 바꾼다. JavaScript의 `'1' + 1`은 `'11'`이지만 MySQL에서는 `2`이고, 숫자로 읽히지 않는 문자열은 0이 되어 `'a' + 'b'`는 `0`이다. 문자열 결합은 `+`가 아니라 `CONCAT()`으로 한다. 참과 거짓도 숫자라서 `TRUE`는 1, `FALSE`는 0이다.

비교는 양쪽이 문자열이면 문자열로, 정수끼리면 정수로, DECIMAL과 정수면 DECIMAL로 하고, 문자열과 숫자가 만나면 둘 다 double로 바꿔 비교한다. 이 규칙이 인덱스 사용과 결과를 함께 바꾼다.

| 조건 | 8.4.6 결과 | 이유 |
|---|---|---|
| `WHERE varchar_col = 1` | `ref`를 못 쓰고 전체를 훑는다(재현의 covering 조회는 `type=index`) | `'1'`, `' 1'`, `'1a'`처럼 1로 바뀌는 문자열이 여럿이라 인덱스 순서로 찾지 못한다 |
| `WHERE varchar_col = '1'` | `ref` | 같은 타입끼리 비교한다 |
| `WHERE int_col = '3'` | `ref` | 상수 쪽만 숫자로 바뀐다 |
| `WHERE varchar_col = 0` | `'0'`, `' 0'`, `'00'`, `'abc'`, `'A-01'`이 모두 일치 | 숫자로 읽히지 않는 문자열은 0이 된다 |

- 큰 정수는 double 비교에서 구분되지 않는다. `'9223372036854775807' = 9223372036854775806`은 1이고 `CAST('9223372036854775807' AS UNSIGNED) = 9223372036854775806`은 0이다. 문자열로 저장한 외부 주문번호나 BIGINT ID를 숫자와 비교하는 코드가 대상이다.
- SELECT의 변환 실패는 오류가 아니라 경고 1292(`Truncated incorrect DOUBLE value`)로 끝나며 strict mode에서도 결과를 돌려준다. 8.4.6 strict mode에서 같은 조건의 `UPDATE`와 `INSERT ... SELECT`는 오류 1292로 실패했다. 조회로 확인한 조건을 변경 배치에 옮기면 그때 실패할 수 있다([[MySQL-SQL-Mode|MySQL SQL Mode]]).
- safe-updates 세션은 키 컬럼 조건이라도 타입 변환 때문에 인덱스를 못 쓰면 UPDATE와 DELETE를 1175로 거부한다([[MySQL-Data-and-Access-Safety#safe-updates가 막는 것과 못 막는 것|safe-updates]]).
- `!`, `&&`와 OR 의미의 `||`는 8.4에서 deprecated이고 8.4.6에서 경고 1287을 냈다. 표준 `NOT`, `AND`, `OR`를 쓴다. `||`는 `PIPES_AS_CONCAT`일 때만 문자열 결합이다.

TypeORM에서는 바인딩 값의 타입을 컬럼 타입에 맞춘다. 전화번호, 외부 ID, 상품 코드처럼 VARCHAR인 컬럼은 문자열로, INT와 BIGINT 컬럼은 숫자로 바인딩하고 DTO 변환이 문자열 ID를 숫자로 바꾸는지 확인한다. 문자열로 저장된 숫자를 숫자 순서로 정렬하거나 범위로 비교해야 하면 저장 타입을 고치거나 명시적 `CAST` 뒤 실행 계획을 본다. 조회 조건 전반의 함정은 [[Query-Antipatterns#Full scan을 유발할 수 있는 조건|Full scan을 유발할 수 있는 조건]]에 있다.

## 숫자 함수: 반올림과 절사

`ROUND(x, d)`는 반올림, `CEIL`과 `FLOOR`는 올림과 내림, `TRUNCATE(x, d)`는 d자리 아래를 버린다. d가 음수면 소수점 왼쪽 자리를 0으로 만든다(`TRUNCATE(122, -2)`는 100). 금액 계산에는 근사형 `FLOAT`나 `DOUBLE`보다 정확한 `DECIMAL`을 우선 검토한다.

- `ROUND`는 인자 타입에 따라 규칙이 다르다. 정확한 값(DECIMAL, 정수, `2.5` 같은 소수 리터럴)은 .5를 0에서 먼 쪽으로 올리고, 근사 값(FLOAT, DOUBLE, `25E-1` 같은 지수 표기)은 가장 가까운 짝수로 맞춘다. 8.4.6에서 2.5를 담은 DOUBLE 컬럼의 `ROUND`는 2, DECIMAL 컬럼은 3이었고 -2.5는 각각 -2와 -3이었다. DECIMAL 값도 `1.0E0`을 곱해 double 식이 되면 2가 된다.
- `TRUNCATE`는 0 방향으로 자르고 `FLOOR`는 음의 무한대 방향으로 내린다. `TRUNCATE(-1.5, 0)`은 -1, `FLOOR(-1.5)`는 -2다. 환불 같은 음수 금액의 백 원 미만 절사는 -1,250원이 `TRUNCATE`로 -1,200, `FLOOR`로 -1,300이 되므로 정책으로 고른다.
- 반올림 단위, 방식과 시점은 [[Commerce-Change-Propagation-and-Money-Invariants#Decimal과 반올림 정책은 별개다|Decimal과 반올림 정책]]과 맞추고 DB와 애플리케이션의 규칙이 같은지 확인한다. JavaScript `Math.round`는 .5를 양의 무한대 쪽으로 올려 `Math.round(-2.5)`가 -2이므로 DECIMAL `ROUND(-2.5)`의 -3과 다르다.
- `TRUNCATE`로 자른 평균 같은 표시용 값은 저장값이나 정산 계산에 다시 쓰지 않는다.

`GREATEST`와 `LEAST`는 한 행 안의 여러 인자 중 최대와 최소이고 `MAX`, `MIN`은 여러 행에 걸친 집계다.

- `GREATEST`와 `LEAST`는 인자 하나라도 NULL이면 NULL이고 `MAX`, `MIN`은 NULL을 건너뛴다. `GREATEST(updated_at, deleted_at)`는 삭제되지 않은 행에서 NULL이 되므로 `COALESCE`로 대체값을 먼저 정한다.
- 숫자와 문자열이 섞이면 문자열로 비교한다. 8.4.6에서 `GREATEST(10, '9')`는 `'9'`, `LEAST(10, '9')`는 `'10'`이었다.

## 문자열 함수: 위치, NULL 전파, 길이 절단

- `LENGTH`는 바이트 수, `CHAR_LENGTH`는 문자 수를 반환한다.
- 위치는 1부터 센다. `SUBSTRING`의 pos 0은 오류 없이 빈 문자열을 반환하므로 0부터 세는 습관으로 `SUBSTRING(col, 0, 3)`을 쓰면 결과가 `''`가 된다. 음수 pos는 끝에서부터 센다(`SUBSTRING('Sakila', -3)`은 `'ila'`).
- `INSTR`는 첫 위치를, 없으면 0을 반환한다. 포함 여부는 `INSTR(s, x) > 0`처럼 비교를 명시한다.
- `CONCAT`은 인자 하나라도 NULL이면 NULL이다. `CONCAT_WS`는 구분자 뒤의 NULL 인자를 건너뛰지만 빈 문자열은 건너뛰지 않고(`CONCAT_WS(' ', 'a', '', 'b')`는 공백 두 칸), 구분자가 NULL이면 결과가 NULL이다. 중간 이름이나 상세 주소 같은 선택 입력을 `CONCAT`으로 이으면 결과 전체가 NULL이 된다.
- `LPAD`와 `RPAD`는 원본이 목표 길이보다 길면 잘라서 반환한다. 8.4.6에서 `LPAD(1000000, 6, '0')`은 `'100000'`이라 순번 100000의 코드와 겹쳤다. 순번으로 고정 길이 코드를 만들면 상한을 넘는 순간 오류 없이 중복이 생기므로 코드 컬럼에 UNIQUE 제약을 걸어 충돌을 오류로 드러낸다.

표시 형식 조립은 가능하면 응답 계층에서 한다.

## 날짜와 시간 함수

- `DATE(expr)`는 날짜 부분을 추출한다. 형식 문자열을 해석하려면 `STR_TO_DATE`를 사용한다.
- `NOW()`와 `CURRENT_TIMESTAMP` 결과는 세션 time zone의 영향을 받는다.
- 날짜 시간을 문자열로 포맷한 값은 표시용이다. 정렬과 범위 조건에는 원래 타입을 사용한다.
- 월 단위 덧셈은 결과 월에 없는 날을 그 달 말일로 맞춘다(`DATE_ADD('2024-03-31', INTERVAL 1 MONTH)`는 `'2024-04-30'`). 직전 결과에 한 달씩 더하면 줄어든 말일이 돌아오지 않는다. 8.4.6에서 `2024-01-31`에 한 달을 두 번 더하면 `2024-03-29`, 기준일에 두 달을 더하면 `2024-03-31`이었다. 정기 결제일은 최초 기준일에서 n개월을 더해 구한다([[Recurring-Event-Modeling|반복 일정 모델링]]). INTERVAL 형식의 `ADDDATE`, `SUBDATE`는 `DATE_ADD`, `DATE_SUB`의 동의어다.
- `DATEDIFF`는 날짜 부분만 쓴다. 8.4.6에서 `2024-01-01 23:50`과 `2024-01-02 00:10`의 `DATEDIFF`는 1, `TIMESTAMPDIFF(MINUTE, ...)`는 20이었다. 24시간 경과 같은 판단에는 `TIMESTAMPDIFF`를 쓴다.
- `TIMEDIFF` 결과는 TIME 타입 범위(-838:59:59부터 838:59:59, 약 35일)로 잘린다. 8.4.6에서 두 달 차이는 경고 1292와 함께 `838:59:59`가 됐다. 긴 기간은 `TIMESTAMPDIFF`나 `UNIX_TIMESTAMP` 차이로 계산한다.
- 요일 번호는 함수마다 다르다. `WEEKDAY`는 월요일 0부터 일요일 6, `DAYOFWEEK`는 ODBC 표준대로 일요일 1부터 토요일 7이다. 주말 판정이나 요일별 집계에서 둘을 섞으면 하루씩 밀린다.
- `DATE_FORMAT` 지정자는 대소문자로 뜻이 갈린다. `%m` 월 숫자, `%M` 월 이름, `%i` 분, `%H` 24시간, `%h` 12시간, `%Y` 4자리 연도, `%y` 2자리 연도다. 분을 `%m`으로 쓰는 실수가 흔하다.
- 월과 요일 이름의 언어는 `lc_time_names`가 정한다. 8.4.6에서 `ko_KR`로 바꾸면 `%M`은 `구월`, `%W`는 `일요일`이 됐지만 `%p`는 `AM`, `PM` 그대로였다. 오전과 오후 표기는 응답 계층에서 만든다.
- `LAST_DAY`는 그 달 말일을 반환한다. 월말까지 남은 일수는 `DATEDIFF(LAST_DAY(d), d)`다.

만료와 기간 조건은 컬럼을 그대로 두고 상수 쪽을 계산한다. `WHERE expires_at < NOW()`, `WHERE created_at >= NOW() - INTERVAL 30 DAY`는 인덱스 범위를 쓸 수 있지만 `DATEDIFF(NOW(), created_at) <= 30`은 컬럼을 함수로 감싸 범위를 잃는다([[Query-Antipatterns#인덱스 컬럼을 함수로 감싸기|인덱스 컬럼을 함수로 감싸기]]).

## 출처

- [MySQL 8.4 Reference Manual, Type Conversion in Expression Evaluation](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)
- [MySQL 8.4 Reference Manual, Logical Operators](https://dev.mysql.com/doc/refman/8.4/en/logical-operators.html)
- [MySQL 8.4 Reference Manual, Mathematical Functions](https://dev.mysql.com/doc/refman/8.4/en/mathematical-functions.html)
- [MySQL 8.4 Reference Manual, Comparison Functions and Operators](https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html)
- [MySQL 8.4 Reference Manual, String Functions and Operators](https://dev.mysql.com/doc/refman/8.4/en/string-functions.html)
- [MySQL 8.4 Reference Manual, Date and Time Functions](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html)
- [MySQL 8.4 Reference Manual, The TIME Type](https://dev.mysql.com/doc/refman/8.4/en/time.html)
- [MySQL 8.4 Reference Manual, MySQL Server Locale Support](https://dev.mysql.com/doc/refman/8.4/en/locale-support.html)
- [ECMAScript Language Specification, Math.round](https://tc39.es/ecma262/#sec-math.round)
- [인프런, 얄팍한 코딩사전, 연산자](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86844)
- [인프런, 얄팍한 코딩사전, 숫자와 문자열 함수](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86846)
- [인프런, 얄팍한 코딩사전, 날짜와 조건 함수](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86847)
- [인프런, 얄팍한 코딩사전, GROUP BY](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86848)

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[MySQL-Numeric-and-Temporal-Types|MySQL 숫자와 날짜 시간 타입]]
- [[Query-Antipatterns|SQL 쿼리 안티패턴]]
- [[MySQL-SQL-Mode|MySQL SQL Mode]]
- [[MySQL-Stored-Functions|MySQL 저장 함수]]
