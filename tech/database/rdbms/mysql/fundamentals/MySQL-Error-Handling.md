---
tags: [database, rdbms, mysql, error-handling, typeorm]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Error Handling", "MySQL 오류 처리"]
---

# MySQL 오류 처리

MySQL 오류에는 숫자 code, symbolic code, 5자리 SQLSTATE와 사람이 읽는 message가 있다. 어느 하나만 모든 상황에서 이식 가능하거나 충분하지 않으므로 오류의 출처와 복구 정책에 맞춰 계층적으로 사용한다.

## 오류 정보의 역할

| 요소 | 강점 | 한계 | 주 용도 |
|---|---|---|---|
| 숫자 error code | MySQL 오류를 세밀하게 구분 | MySQL 전용 | 알려진 서버 오류 분기, 진단 |
| symbolic code | 숫자보다 의도가 잘 보임 | connector가 노출하는 모양 확인 필요 | 애플리케이션 상수와 로깅 |
| SQLSTATE | ANSI SQL/ODBC 기반의 class 표현 | 일부 서버 오류와 모든 client 오류가 `HY000` | 넓은 오류 class 분류 |
| message | 사람에게 상세 맥락 제공 | 버전과 언어에 따라 바뀔 수 있음 | 로그와 운영자 진단 |

서버 오류, client library 오류, 양쪽이 공유하는 global 오류는 출처와 번호 범위가 다르다. 연결 자체가 실패한 client 오류는 유용한 SQLSTATE가 없을 수 있으므로 SQLSTATE 하나로 모든 재시도 정책을 만들면 안 된다.

오류 message를 부분 문자열로 비교해 제어 흐름을 정하지 않는다. 공식 문서도 프로그램 분기에는 code number 또는 symbol을 쓰고 message string을 쓰지 말라고 권고한다.

## 애플리케이션 매핑

1. connector가 준 원본 오류를 `cause`로 보존한다.
2. 숫자 code, symbol, SQLSTATE와 실행 단계로 알려진 오류만 명시적으로 분류한다.
3. domain 또는 HTTP 오류로 번역하되 원본 정보는 내부 관측 경계에 남긴다.
4. 알 수 없는 오류를 일반 conflict나 retryable로 추측하지 않고 상위로 전달한다.

예를 들어 unique 위반은 사용자 입력 충돌로 번역할 수 있지만, deadlock은 해당 SQL 한 줄이 아니라 전체 트랜잭션을 제한된 횟수와 backoff로 재실행해야 한다. 연결 실패, timeout과 lock wait도 같은 재시도 정책으로 뭉치지 않는다. 멱등성과 트랜잭션 경계를 먼저 확인한다.

TypeORM의 추상 예외 이름만 저장하면 MySQL 원인이 사라질 수 있다. driver error의 원본 필드를 보존하고, 지원 중인 mysql2/TypeORM 버전에서 실제 field shape를 회귀 테스트한다.

## 안전한 로깅

다음은 함께 남기되 민감 정보는 제거한다.

- trace 또는 request correlation id
- transaction과 operation 이름
- error code, symbol, SQLSTATE, message
- SQL template이나 digest, 영향을 받은 table과 constraint 이름
- attempt 수, timeout과 connection 상태

바인딩 값, 비밀번호, DSN, token과 개인 데이터가 포함된 완성 SQL을 그대로 남기지 않는다. 운영자에게 전달할 때도 재현 가능한 query shape와 redacted context를 사용한다.

## 점검 질문

- 이 오류는 server, client, network 중 어디서 시작했는가?
- SQLSTATE가 `HY000`일 때 더 구체적인 code나 symbol이 있는가?
- message 문자열 비교에 의존하고 있지 않은가?
- 재시도 단위가 전체 트랜잭션이며 멱등한가?
- 원본 cause는 보존하면서 민감 값은 제거했는가?

## 출처

- [MySQL 8.4 Reference Manual, Error Message Sources and Elements](https://dev.mysql.com/doc/refman/8.4/en/error-message-elements.html)
- [MySQL 8.4 Reference Manual, Error Information Interfaces](https://dev.mysql.com/doc/refman/8.4/en/error-interfaces.html)
- [MySQL 8.4 Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/)
- [인프런, Real MySQL 시즌 1 - Part 1, 에러 핸들링](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226569)

## 관련 문서

- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[NestJS-Exception-Filter|NestJS 예외 필터]]
