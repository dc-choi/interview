---
tags: [database, oracle, data-types]
status: done
verified_at: 2026-10-01
category: "Data & Storage - RDB"
aliases: ["Oracle Data Types", "Oracle 데이터 타입"]
---

# Oracle 데이터 타입

Oracle 26ai SQL의 타입과 PL/SQL 변수 한도는 같은 이름이어도 적용 범위를 구분한다.

## 문자 저장과 비교

CHAR는 선언 길이까지 blank padding하며 VARCHAR2는 가변 길이를 저장한다. CHAR/문자 literal 비교의 blank-padded 의미와 VARCHAR2가 포함된 nonpadded 비교를 구분한다. VARCHAR2의 BYTE/CHAR 선언과 실제 byte 상한, MAX_STRING_SIZE 설정을 확인하고 NCHAR/NVARCHAR2는 national character set을 사용한다. LONG은 호환성용 legacy 타입이므로 새 대형 문자 데이터는 CLOB 등 요구에 맞는 타입을 선택한다.

## 숫자 정밀도와 scale

NUMBER(p,s)는 전체 유효 자릿수와 소수 scale을 지정한다. scale보다 긴 소수는 반올림되고 precision 한도를 넘으면 오류가 날 수 있다. 음수 scale은 정수부 자리의 반올림을 의미한다. `NUMBER(7,2)`와 무제한 선언 NUMBER를 같은 고정 크기 저장으로 해석하지 않는다.

BINARY_FLOAT와 BINARY_DOUBLE은 각각 32비트와 64비트의 이진 부동소수점이다. 정확한 십진 금액에는 필요한 precision/scale의 NUMBER를 검토하고 binary float의 오차, NaN과 infinity 의미를 따로 다룬다.

## 출처
- [Oracle AI Database 26ai, Data Type Comparison Rules](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Data-Type-Comparison-Rules.html)
- [Oracle AI Database 26ai, Data Types](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Data-Types.html)
- [인프런, PL/SQL 변수 선언 및 데이터 타입](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4671)
- [인프런, create, alter, drop, truncate문을 이용한 테이블 관리](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4663)
- [인프런, group by 절, having 절](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4660)
- [인프런, 오라클 기본함수: 집계함수, 숫자함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4657)


## 관련 문서

- [[Oracle-SQL-Dialect]]
- [[Oracle-SQL-and-PL-SQL]]
