---
tags: [database, rdbms, mysql, schema, string]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL String Types", "MySQL 문자열 타입", "InnoDB row format", "off-page 저장"]
---

# MySQL 문자열 타입 선택

`CHAR`, `VARCHAR`, `TEXT`는 모두 문자열을 담지만 길이 의미, 행 내부 표현, 인덱스 제약과 조회 비용이 다르다. 짧으면 VARCHAR, 길면 TEXT 같은 한 줄 규칙보다 도메인 상한, 실제 길이 분포와 쿼리 경로를 함께 본다.

## CHAR와 VARCHAR

선언한 `n`은 바이트가 아니라 최대 문자 수다. `utf8mb4`에서는 문자 하나가 최대 4바이트이므로 같은 `VARCHAR(100)`도 단일 바이트 문자셋보다 행과 인덱스의 최대 폭이 커진다.

| 항목 | `CHAR(n)` | `VARCHAR(n)` |
|---|---|---|
| 값 | 선언 길이까지 공백으로 채운 값 | 실제 값 길이에 따라 변함 |
| 저장 크기 | latin1 같은 고정 폭 문자셋은 항상 n바이트. utf8mb4는 COMPACT, DYNAMIC에서 최소 n바이트를 예약하고 넘는 값은 실제 바이트만큼(최대 4n), REDUNDANT는 항상 4n | 값 바이트에 1 또는 2바이트 길이 prefix |
| 최대 선언 길이 | 255자 | 65,535 이하로 선언하지만 실제 한도는 행 크기와 문자셋이 정한다. utf8mb4는 16,383자(초과 시 오류 1074) |
| trailing space | 저장 시 오른쪽 padding, 조회 시 보통 제거 | 저장과 조회에서 유지 |

utf8mb4 `CHAR(10)`에 한글 2자(6바이트)를 넣으면 뒤 공백을 4바이트만 남겨 10바이트를 쓰고, 한글 4자(12바이트)는 예약을 넘으므로 공백 없이 12바이트를 쓴다. 가변 폭 문자셋의 CHAR는 최소 예약 공간을 가진 VARCHAR처럼 동작한다. 길이 prefix는 행 크기 한도 계산에서 선언 최대 바이트가 255 이하면 1바이트, 넘으면 2바이트다(utf8mb4 `VARCHAR(63)`은 252바이트라 1바이트, `VARCHAR(64)`부터 2바이트). InnoDB COMPACT, DYNAMIC 레코드 헤더는 최대 길이가 255바이트를 넘어도 실제 값이 127바이트 이하면 길이를 1바이트로 기록한다.

문자열 비교에서 trailing space가 유의미한지는 타입 이름만이 아니라 collation의 `PAD_ATTRIBUTE`에도 달려 있다. UNIQUE 키에서 공백만 다른 값을 구별할 것이라 가정하지 말고 실제 collation을 확인한다.

`CHAR`는 길이 폭이 작고 갱신이 잦은 코드에서 행 길이 변화 가능성을 줄일 수 있다. VARCHAR 값이 UPDATE로 길어져 기존 자리에 들어가지 않으면 InnoDB는 레코드를 페이지의 다른 위치에 다시 쓰고, 여유가 없으면 페이지 재구성이나 분할로 이어져 단편화가 쌓인다. 매뉴얼은 CHAR(n)의 최소 n바이트 예약이 많은 경우 index page 단편화 없이 제자리 갱신을 가능하게 한다고 적는다. 보조 인덱스 레코드는 제자리 갱신되지 않고 키가 바뀌면 delete-mark 후 새로 삽입되므로, 이 이득은 주로 clustered index 레코드에 해당한다. 그래서 고정 길이면 CHAR라는 통념보다 길이 변동 폭이 좁고 자주 바뀌는 짧은 값이 CHAR를 고를 조건이다.

그러나 항상 더 빠르거나 항상 선언 길이만큼 단순하게 저장된다고 일반화하면 안 된다. InnoDB는 매우 큰 고정 길이 필드(768바이트 이상, 예: 최대 1,020바이트인 utf8mb4 `CHAR(255)`)를 가변 길이처럼 부호화해 off-page에 둘 수 있고, 성능은 row format, 실제 값 분포, 갱신 패턴과 인덱스로 검증해야 한다.

## VARCHAR와 TEXT

`TEXT`는 최대 약 64KiB의 문자열을 담는 타입이며 더 큰 값에는 `MEDIUMTEXT`, `LONGTEXT`가 있다. `VARCHAR`의 최대치도 65,535바이트 행 한도의 영향을 받으므로 `VARCHAR(65535)`가 모든 스키마와 문자셋에서 가능한 것은 아니다.

행 크기 한도 65,535바이트는 TEXT와 BLOB을 제외한 컬럼이 나눠 쓰고, TEXT와 BLOB은 내용이 따로 저장되어 9~12바이트만 기여한다. 8.4.6에서 utf8mb4 `VARCHAR(1000)`(한도 계산상 4,002바이트) 16개는 만들어졌고 17개째에서 오류 1118(Row size too large)이 났으며, 16개에 TEXT 3개를 더해도 만들어졌다. 문자열 컬럼이 많은 테이블에서 TEXT는 이 한도를 피하는 수단이다.

메모리 할당 방식도 다르다. 매뉴얼은 BLOB과 TEXT 값을 값마다 따로 할당한 객체로 다루고, 다른 타입은 테이블을 열 때 컬럼별로 한 번 할당한다고 적는다. 자주 읽는 짧은 문자열을 TEXT로 두면 값마다 할당과 해제가 반복된다. 반대로 선언 길이가 곧 내부 임시 테이블 메모리라는 설명은 엔진 조건부다. 8.4 기본 `internal_tmp_mem_storage_engine=TempTable`은 VARCHAR 값을 padding 없이 연속 저장하고, `MEMORY`로 바꾸면 VARCHAR를 최대 길이까지 padding해 CHAR처럼 저장한다. BLOB 절의 TEXT가 있으면 임시 테이블이 디스크로 간다는 설명도 MEMORY 엔진 기준이며, TempTable은 BLOB, TEXT를 메모리에서 지원한다.

- `TEXT` 인덱스에는 prefix 길이가 필요하다. prefix만으로 유일성을 표현해도 되는지와 선택도를 확인한다.
- MySQL 8.4에서 `TEXT` 기본값은 `DEFAULT ('value')`처럼 표현식 형태로만 쓸 수 있다.
- 큰 `VARCHAR`와 `TEXT`는 모두 값의 길이와 InnoDB row format에 따라 overflow page로 나갈 수 있다. TEXT는 항상 행 밖, VARCHAR는 항상 행 안이라는 구분은 틀리다. 아래 row format 절처럼 off-page 여부는 타입이 아니라 페이지 크기와 행 전체 크기가 정한다.
- off-page 값을 투영하면 추가 페이지 I/O와 전송 비용이 생긴다. 목록 API에서 본문이 필요 없다면 `SELECT *` 대신 필요한 컬럼만 고른다. 8.4.6에서 12KB TEXT 5,000행 테이블은 clustered index leaf가 2페이지뿐이었고, TEXT를 뺀 전체 스캔은 0.5ms, 포함한 스캔은 5.6ms였다(버퍼 풀 적재 상태).
- 선언 가능한 최대 길이는 검증 규칙이자 행 크기 한도, 인덱스 키 폭과 MEMORY 엔진 경로 비용의 입력이다. 편의상 모든 짧은 값을 `VARCHAR(255)`로 만들지 않는다. 반대로 너무 짧게 잡으면 strict mode에서 잘림이 아니라 오류로 쓰기가 실패한다([[MySQL-SQL-Mode|MySQL SQL Mode]]).

## InnoDB row format과 off-page 저장

| row format | 긴 가변 길이 값 | 인덱스 key prefix 한도 |
|---|---|---|
| `REDUNDANT` | 앞 768바이트를 레코드에 두고 나머지를 overflow page로 | 767바이트 |
| `COMPACT` | REDUNDANT와 같음. 행 저장 공간을 약 20% 줄임 | 767바이트 |
| `DYNAMIC` (8.4 기본) | 전부 overflow page로 보내고 레코드에 20바이트 포인터만 둠 | 3072바이트 |
| `COMPRESSED` | DYNAMIC에 페이지 압축 추가 | 3072바이트 |

- DYNAMIC은 행이 B-tree 페이지에 들어가지 않으면 가장 긴 컬럼부터 off-page로 보내 clustered 레코드가 페이지에 들어갈 때까지 반복한다. 40바이트 이하 TEXT, BLOB은 행 안에 둔다. 기본 16KB 페이지의 최대 행 크기는 8KB보다 조금 작다.
- COMPACT 계열 레코드 헤더는 nullable 컬럼마다 1비트의 NULL 비트맵을 두므로 NULL 값은 그 비트 외의 공간을 차지하지 않는다.
- DYNAMIC은 768바이트 인라인 prefix가 없어 긴 값이 많은 테이블의 clustered leaf 밀도가 높다([[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]). utf8mb4 `VARCHAR(255)` 전체 인덱스(최대 1,020바이트)가 오래된 포맷에서 실패하던 이유가 767바이트 한도다([[MySQL-Charset-Migration|utf8mb4 마이그레이션]]).

## 선택 절차

1. 도메인이 허용하는 문자 수와 trailing space 의미를 정한다.
2. 문자셋 기준 최대 바이트 수와 InnoDB 행 크기, 인덱스 폭을 계산한다. 문자열 컬럼이 많아 65,535바이트 한도에 가까우면 큰 컬럼을 TEXT로 옮긴다.
3. 목록, 검색, 정렬, 본문 조회 경로에서 어떤 컬럼을 읽는지 확인한다. 자주 읽는 짧은 값은 VARCHAR, 크고 드물게 읽는 값은 TEXT나 분리 테이블을 우선한다.
4. 큰 값은 분리 테이블이나 지연 조회가 더 명확한지도 비교한다.
5. `EXPLAIN ANALYZE`, 실제 길이 분포와 갱신 부하로 선택을 검증한다.

타입 변경은 데이터 복사와 긴 metadata lock을 일으킬 수 있다. 운영 변경은 [[Schema-Migration-Large-Table|대용량 스키마 변경]] 절차로 계획한다.

## 출처

- [MySQL 8.4 Reference Manual, The CHAR and VARCHAR Types](https://dev.mysql.com/doc/refman/8.4/en/char.html)
- [MySQL 8.4 Reference Manual, The BLOB and TEXT Types](https://dev.mysql.com/doc/refman/8.4/en/blob.html)
- [MySQL 8.4 Reference Manual, Data Type Default Values](https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html)
- [MySQL 8.4 Reference Manual, InnoDB Row Formats](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)
- [MySQL 8.4 Reference Manual, Limits on Table Column Count and Row Size](https://dev.mysql.com/doc/refman/8.4/en/column-count-limit.html)
- [MySQL 8.4 Reference Manual, Internal Temporary Table Use in MySQL](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [인프런, Real MySQL 시즌 1 - Part 1, CHAR vs VARCHAR](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226561)
- [인프런, Real MySQL 시즌 1 - Part 1, VARCHAR vs TEXT](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226562)
- [인프런, 김영한, 데이터 타입1 - 문자, 숫자, PK 타입](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347675)
- [인프런, Hong, MySQL B-Tree Index (Clustered, Secandary, Page, Format)](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373903)

## 관련 문서

- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]
- [[Index|인덱스]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[MySQL-Collation|MySQL Collation]]
