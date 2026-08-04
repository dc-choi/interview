---
tags: [database, rdbms, mysql, schema, string]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL String Types", "MySQL 문자열 타입"]
---

# MySQL 문자열 타입 선택

`CHAR`, `VARCHAR`, `TEXT`는 모두 문자열을 담지만 길이 의미, 행 내부 표현, 인덱스 제약과 조회 비용이 다르다. 짧으면 VARCHAR, 길면 TEXT 같은 한 줄 규칙보다 도메인 상한, 실제 길이 분포와 쿼리 경로를 함께 본다.

## CHAR와 VARCHAR

선언한 `n`은 바이트가 아니라 최대 문자 수다. `utf8mb4`에서는 문자 하나가 최대 4바이트이므로 같은 `VARCHAR(100)`도 단일 바이트 문자셋보다 행과 인덱스의 최대 폭이 커진다.

| 항목 | `CHAR(n)` | `VARCHAR(n)` |
|---|---|---|
| 길이 | 선언 길이로 고정 | 실제 값 길이에 따라 변함 |
| 저장 부가 정보 | 고정 길이 표현 | 값의 바이트 길이를 나타내는 1 또는 2바이트 prefix |
| 최대 선언 길이 | 255자 | 65,535자 이하, 실제 한도는 행 크기와 문자셋의 영향 |
| trailing space | 저장 시 오른쪽 padding, 조회 시 보통 제거 | 저장과 조회에서 유지 |

문자열 비교에서 trailing space가 유의미한지는 타입 이름만이 아니라 collation의 `PAD_ATTRIBUTE`에도 달려 있다. UNIQUE 키에서 공백만 다른 값을 구별할 것이라 가정하지 말고 실제 collation을 확인한다.

`CHAR`는 길이 폭이 작고 갱신이 잦은 코드에서 행 길이 변화 가능성을 줄일 수 있다. 그러나 항상 더 빠르거나 항상 선언 길이만큼 단순하게 저장된다고 일반화하면 안 된다. InnoDB는 매우 큰 고정 길이 필드를 가변 길이처럼 부호화할 수 있고, 성능은 row format, 실제 값 분포, 갱신 패턴과 인덱스로 검증해야 한다.

## VARCHAR와 TEXT

`TEXT`는 최대 약 64KiB의 문자열을 담는 타입이며 더 큰 값에는 `MEDIUMTEXT`, `LONGTEXT`가 있다. `VARCHAR`의 최대치도 65,535바이트 행 한도의 영향을 받으므로 `VARCHAR(65535)`가 모든 스키마와 문자셋에서 가능한 것은 아니다.

- `TEXT` 인덱스에는 prefix 길이가 필요하다. prefix만으로 유일성을 표현해도 되는지와 선택도를 확인한다.
- MySQL 8.4에서 `TEXT` 기본값은 `DEFAULT ('value')`처럼 표현식 형태로만 쓸 수 있다.
- 큰 `VARCHAR`와 `TEXT`는 모두 값의 길이와 InnoDB row format에 따라 overflow page로 나갈 수 있다. TEXT는 항상 행 밖, VARCHAR는 항상 행 안이라는 구분은 틀리다.
- off-page 값을 투영하면 추가 페이지 I/O와 전송 비용이 생긴다. 목록 API에서 본문이 필요 없다면 `SELECT *` 대신 필요한 컬럼만 고른다.
- 선언 가능한 최대 길이는 검증 규칙이자 메모리, 임시 결과와 인덱스 설계의 입력이다. 편의상 모든 짧은 값을 `VARCHAR(255)`로 만들지 않는다.

## 선택 절차

1. 도메인이 허용하는 문자 수와 trailing space 의미를 정한다.
2. 문자셋 기준 최대 바이트 수와 InnoDB 행 크기, 인덱스 폭을 계산한다.
3. 목록, 검색, 정렬, 본문 조회 경로에서 어떤 컬럼을 읽는지 확인한다.
4. 큰 값은 분리 테이블이나 지연 조회가 더 명확한지도 비교한다.
5. `EXPLAIN ANALYZE`, 실제 길이 분포와 갱신 부하로 선택을 검증한다.

타입 변경은 데이터 복사와 긴 metadata lock을 일으킬 수 있다. 운영 변경은 [[Schema-Migration-Large-Table|대용량 스키마 변경]] 절차로 계획한다.

## 출처

- [MySQL 8.4 Reference Manual, The CHAR and VARCHAR Types](https://dev.mysql.com/doc/refman/8.4/en/char.html)
- [MySQL 8.4 Reference Manual, The BLOB and TEXT Types](https://dev.mysql.com/doc/refman/8.4/en/blob.html)
- [MySQL 8.4 Reference Manual, Data Type Default Values](https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html)
- [MySQL 8.4 Reference Manual, InnoDB Row Formats](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)
- [인프런, Real MySQL 시즌 1 - Part 1, CHAR vs VARCHAR](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226561)
- [인프런, Real MySQL 시즌 1 - Part 1, VARCHAR vs TEXT](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226562)

## 관련 문서

- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]
- [[Index|인덱스]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
