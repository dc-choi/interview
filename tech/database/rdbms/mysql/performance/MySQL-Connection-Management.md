---
tags: [database, rdbms, mysql, connection, pool, performance, overload]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Connection Management", "MySQL 커넥션 관리"]
---

# MySQL Connection 관리

Connection은 단순한 socket 수가 아니다. MySQL 8.4의 기본 `one-thread-per-connection` 모델에서는 각 client connection에 인증과 요청 처리를 담당하는 thread가 연결되고 session 상태와 실행 중 작업에 필요한 server, kernel resource를 소비한다. 실제 memory 비용은 query와 workload에 따라 달라지므로 connection 하나당 고정 수치로 계산하지 않는다.

## Server connection과 application pool

Application connection pool은 연결 생성 비용을 줄이고 동시에 DB로 들어가는 query 수를 제한한다. MySQL의 `thread_cache_size`는 종료된 connection의 thread를 server에서 재사용하는 장치이며 application pool과 역할이 다르다.

MySQL Enterprise Edition에는 많은 connection의 statement execution thread를 관리하는 별도 thread pool plugin이 있다. Community Server 기본 동작으로 가정하지 않고 사용 edition과 `thread_handling`을 확인한다.

## 용량 예산

`max_connections`는 허용 상한이지 목표 동시성이다. 모든 application process와 worker의 pool 최대치를 합산한다.

```text
총 잠재 연결 수
= app instance 수 x instance별 pool max
+ batch/worker pool
+ migration/monitoring 연결
+ 운영 여유
```

합계가 server 한도를 넘지 않는지만 보면 부족하다. CPU, memory, file descriptor, transaction lock과 목표 응답 시간을 감당할 수 있는 동시 실행량이어야 한다. MySQL은 `max_connections` 외에 `CONNECTION_ADMIN` 권한 계정용 연결 하나를 허용하지만, 이를 평상시 application 여유분으로 쓰지 않는다.

Pool을 크게 잡으면 대기열이 application에서 DB 내부로 이동할 뿐 처리량이 늘지 않을 수 있다. pool queue에 길이와 acquisition timeout을 두고 overload 때 무한 대기 대신 명시적으로 거절하거나 degrade한다.

## Timeout을 분리한다

| 경계 | 의미 |
|---|---|
| connect timeout | TCP, TLS와 인증을 포함한 새 연결 시도 제한 |
| acquisition timeout | pool에서 connection을 빌리는 대기 제한 |
| query timeout | statement 또는 요청 전체 실행 제한 |
| idle timeout | pool의 유휴 connection 회수 기준 |
| max lifetime | 오래된 connection을 교체하는 기준 |
| MySQL `wait_timeout` | noninteractive connection이 활동 없이 유지되는 server-side 시간 |

`wait_timeout`보다 pool idle/lifetime이 길면 application이 server에서 이미 닫힌 connection을 빌릴 수 있다. 반대로 너무 짧으면 재연결이 급증한다. `interactive_timeout`은 `CLIENT_INTERACTIVE`로 접속한 session의 초기 timeout에 관여하므로 일반 application driver에 자동 적용된다고 가정하지 않는다.

## 진단 지표

- `Threads_connected`: 현재 열린 connection 수
- `Threads_running`: sleep이 아닌 thread 수
- `Max_used_connections`: 시작 이후 동시 connection 고점
- `Connections`: connection 시도 누계
- `Threads_created`, `Threads_cached`: server thread cache 효과
- `Connection_errors_max_connections`: 상한 때문에 거절된 connection 수
- application pool의 active, idle, pending과 acquisition latency

Connection 수만 높고 `Threads_running`이 낮다면 idle pool이 과한지 본다. 둘 다 높고 latency가 오르면 slow query, lock wait와 CPU saturation을 먼저 진단한다. `max_connections`를 올리는 것만으로 원인을 가리지 않는다.

## 운영 체크리스트

1. instance, replica와 worker가 늘어날 때 총 pool 예산이 자동으로 재계산되는가?
2. transaction이 끝나면 connection이 `finally`에서 반환되는가?
3. long query와 long transaction을 connection 부족으로 오인하지 않았는가?
4. connect, acquire, query timeout을 서로 다른 failure로 관찰하는가?
5. 배포와 장애 복구 때 reconnect storm을 jitter와 점진적 ramp-up으로 제한하는가?
6. 관리자 접속 경로와 최소 권한 계정을 application과 분리했는가?

## 출처

- [MySQL 8.4 Reference Manual, Connection Interfaces](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html)
- [MySQL 8.4 Reference Manual, Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 Reference Manual, Server Status Variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL 8.4 Reference Manual, MySQL Enterprise Thread Pool](https://dev.mysql.com/doc/refman/8.4/en/thread-pool.html)
- [인프런, Real MySQL 시즌 1 - Part 2, 커넥션 관리](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226586)

## 관련 문서

- [[Connection-Pool|Connection Pool]]
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[Transactions|트랜잭션]]
