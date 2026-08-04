---
tags: [database, mysql, configuration, operations]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Configuration Change Management", "MySQL 설정 변경 관리"]
---

# MySQL 설정 변경 관리

MySQL 변수는 이름만 보고 바로 바꾸지 않는다. scope, 동적 변경 가능 여부, 재시작 뒤 지속 여부와 메모리 및 연결 예산을 확인하고 작은 범위에서 검증한 뒤 적용한다.

## 현재 값과 성격을 구분한다

```sql
SHOW GLOBAL VARIABLES LIKE 'max_connections';
SHOW SESSION VARIABLES LIKE 'time_zone';

SELECT VARIABLE_NAME, VARIABLE_SOURCE, VARIABLE_PATH
FROM performance_schema.variables_info
WHERE VARIABLE_NAME IN ('max_connections', 'innodb_buffer_pool_size');
```

- `GLOBAL` 값은 server 기본 동작을 정하지만 session 변수는 이미 열린 연결에 즉시 복사되지 않을 수 있다.
- `SESSION` 변경은 현재 연결에만 적용된다. connection pool의 기존 연결과 새 연결이 서로 다른 값을 가질 수 있다.
- `Dynamic=Yes`인 변수만 실행 중 변경할 수 있다. read-only 변수는 다음 재시작 설정으로만 바뀔 수 있다.
- 같은 이름의 변수라도 scope와 권한 조건이 다르므로 MySQL 8.4 변수 표를 확인한다.

## 실행 중 값과 재시작 뒤 값을 나눈다

```sql
SET GLOBAL long_query_time = 1.0;
SET PERSIST long_query_time = 1.0;
SET PERSIST_ONLY some_read_only_variable = 'value';
```

`SET GLOBAL`은 실행 중 instance의 global 값을 바꾸지만 그 자체로 재시작 뒤 지속되지는 않는다. `SET PERSIST`는 실행 중 값을 바꾸고 `mysqld-auto.cnf`에도 기록한다. `SET PERSIST_ONLY`는 실행 중 값을 건드리지 않고 다음 시작 값을 기록하며 read-only 변수에도 사용할 수 있다. 관리형 DB에서는 parameter group이나 공급자 설정이 정본일 수 있으므로 직접 설정과 섞지 않는다.

## 변경 절차

1. 해결하려는 증상과 성공 지표를 적는다. 변수 변경은 원인 가설이지 해결책 자체가 아니다.
2. 현재 값, source, scope, dynamic 여부와 필요한 권한을 확인한다.
3. 총 메모리, file descriptor, connection과 I/O 예산을 계산한다.
4. session 또는 canary instance에서 대표 workload로 검증한다.
5. 실행 중 값과 영속 설정을 의도대로 함께 적용하고 변경 기록을 남긴다.
6. latency, error, memory, swap, lock wait, replica lag를 관찰한다.
7. 악화 기준에 도달하면 미리 적은 이전 값으로 되돌린다.

## 자주 다루는 변수의 함정

| 영역 | 확인할 점 |
|---|---|
| `max_connections` | 숫자를 키우기 전에 application pool 합계, thread와 per-connection memory, file descriptor를 계산한다. |
| `innodb_buffer_pool_size` | 단일 고정 비율이 정답은 아니다. working set과 server의 다른 메모리 소비를 측정한다. MySQL 8.4에서는 online resize가 가능하다. |
| `time_zone` | 저장 타입과 client 직렬화 정책을 함께 맞춘다. session별 차이를 방치하지 않는다. |
| charset, collation | global 기본값 변경은 기존 schema와 column을 자동 변환하지 않는다. migration을 별도로 설계한다. |
| slow query log | `long_query_time`은 SLO와 수집 비용으로 정한다. 파일 경로, rotation, 민감값 노출도 확인한다. |

고정된 connection 수, buffer pool 크기와 slow query 임계값을 다른 환경에 그대로 복사하지 않는다. workload, instance shape와 실패 비용이 다르면 적정값도 달라진다.

## 출처

- [MySQL 8.4 Reference Manual, Using System Variables](https://dev.mysql.com/doc/refman/8.4/en/using-system-variables.html)
- [MySQL 8.4 Reference Manual, Persisted System Variables](https://dev.mysql.com/doc/refman/8.4/en/persisted-system-variables.html)
- [MySQL 8.4 Reference Manual, System Variable Privileges](https://dev.mysql.com/doc/refman/8.4/en/system-variable-privileges.html)
- [MySQL 8.4 Reference Manual, Configuring InnoDB Buffer Pool Size](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html)
- [인프런, Hong, MySQL 글로벌 환경설정](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338540)

## 관련 문서

- [[MySQL-Connection-Management|MySQL connection 관리]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]
- [[MySQL-Slow-Query-Diagnosis|Slow query 진단]]
- [[MySQL-Collation|MySQL collation]]
