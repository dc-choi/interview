---
tags: [database, rdbms, mysql, connection, pool, performance, overload]
status: done
verified_at: 2026-10-05
category: "Database - RDBMS"
aliases: ["MySQL Connection Management", "MySQL 커넥션 관리"]
---

# MySQL Connection 관리

Connection은 단순한 socket 수가 아니다. MySQL 8.4의 기본 `one-thread-per-connection` 모델에서는 각 client connection에 인증과 요청 처리를 담당하는 thread가 연결되고 session 상태와 실행 중 작업에 필요한 server, kernel resource를 소비한다. 실제 memory 비용은 query와 workload에 따라 달라지므로 connection 하나당 고정 수치로 계산하지 않는다.

## Server connection과 application pool

Application connection pool은 연결 생성 비용을 줄이고 동시에 DB로 들어가는 query 수를 제한한다. MySQL의 `thread_cache_size`는 종료된 connection의 thread를 server에서 재사용하는 장치이며 application pool과 역할이 다르다.

MySQL Enterprise Edition에는 많은 connection의 statement execution thread를 관리하는 별도 thread pool plugin이 있다. Community Server 기본 동작으로 가정하지 않고 사용 edition과 `thread_handling`을 확인한다.

## 용량 예산

`max_connections`는 허용 상한이지 목표 동시성이 아니다. 모든 application process와 worker의 pool 최대치를 합산한다.

```text
총 잠재 연결 수
= app instance 수 x instance별 pool max
+ batch/worker pool
+ migration/monitoring 연결
+ 운영 여유
```

합계가 server 한도를 넘지 않는지만 보면 부족하다. CPU, memory, file descriptor, transaction lock과 목표 응답 시간을 감당할 수 있는 동시 실행량이어야 한다. MySQL은 `max_connections` 외에 `CONNECTION_ADMIN` 권한 계정용 연결 하나를 허용하지만, 이를 평상시 application 여유분으로 쓰지 않는다.

MySQL 8.4의 `max_connections` 기본값은 151이고, 실효 상한은 이 값과 `open_files_limit - 810` 중 작은 값이다. 고정 크기 pool은 요청이 없어도 connection을 쥐고 있으므로, 기존 instance들의 pool 합이 이미 상한에 닿아 있으면 부하를 나누려고 투입한 새 instance는 pool을 채우지 못하고 오류 1040(`ER_CON_COUNT_ERROR`, `Too many connections`)을 받는다. 증설 계획은 지금 instance 수가 아니라 투입할 수 있는 최대 instance 수의 pool 합으로 검증한다.

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

### wait_timeout이 닫는 connection

`wait_timeout`(MySQL 8.4 기본 28800초)은 noninteractive connection에 활동이 없을 때 server가 기다리는 시간이고, 요청이 올 때마다 처음부터 다시 센다. Client host가 갑자기 꺼지거나 중간 network가 끊겨 연결 종료 신호가 오지 않으면 server는 연결이 살아 있다고 보고 계속 요청을 기다리므로, 이 timeout이 그런 connection을 닫아 thread와 session 자원을 회수한다. Pool의 수명 설정은 이 server 측 절단보다 먼저 connection을 교체해야 한다.

- 경계 경합: pool의 max lifetime과 `wait_timeout`이 같으면, 한계 직전에 빌린 connection의 query가 server가 연결을 닫은 직후 도착해 실패할 수 있다. HikariCP 문서는 `maxLifetime`을 DB나 인프라가 정한 connection 시간 제한보다 몇 초 짧게 두라고 권한다. lifetime은 생성 시점부터, `wait_timeout`은 마지막 활동부터 세므로 lifetime이 더 짧으면 pool에서 쉬는 connection은 유휴 시간이 `wait_timeout`에 닿기 전에 교체된다.
- 반환 누락: HikariCP는 사용 중인 connection을 lifetime이 지나도 회수하지 않고 반환될 때 제거한다. 코드가 빌린 connection을 반환하지 않고 쥐고만 있으면 lifetime이 동작하지 않고, `wait_timeout`이 지나 server가 닫은 뒤 그 connection을 다시 쓰는 순간 통신 오류가 난다. 이런 오류가 간헐적으로 보이면 connection 누수를 의심하고 `leakDetectionThreshold`(기본 0은 꺼짐, 켤 때 최소 2000ms)로 pool 밖에 오래 머문 connection을 기록한다.
- 유휴 유지: idle connection을 오래 두려면 `keepaliveTime`(기본 2분, `maxLifetime`보다 짧아야 함)이 idle connection을 ping해 server의 유휴 시간을 다시 세게 한다. HikariCP 설정 축 전체는 [[Connection-Pool|DB 커넥션 풀, 사이징]]에 있다.

## 진단 지표

- `Threads_connected`: 현재 열린 connection 수
- `Threads_running`: sleep이 아닌 thread 수
- `Max_used_connections`: 시작 이후 동시 connection 고점
- `Connections`: connection 시도 누계
- `Threads_created`, `Threads_cached`: server thread cache 효과
- `Connection_errors_max_connections`: 상한 때문에 거절된 connection 수
- application pool의 active, idle, pending과 acquisition latency

Connection 수만 높고 `Threads_running`이 낮다면 idle pool이 과한지 본다. 둘 다 높고 latency가 오르면 slow query, lock wait와 CPU saturation을 먼저 진단한다. `max_connections`를 올리는 것만으로 원인을 가리지 않는다.

## 부하 테스트로 연결 상한을 정한다

Pool 크기와 `max_connections`는 공식 하나로 정하지 않고, 부하를 단계적으로 올리며 처음 포화되는 자원을 찾아 정한다.

1. 테스트 전에 app server와 DB의 CPU, memory, 요청 처리 thread pool의 active 수, connection pool의 active, idle, pending과 DB의 `Threads_running`을 같은 시간축에서 볼 수 있게 한다.
2. 요청량을 계단식으로 올리며 처리량(RPS)이 더 늘지 않는 지점과 응답 시간이 오르기 시작하는 지점을 찾는다.
3. 그 지점에서 원인을 차례로 가른다. app server 자원이 먼저 포화되면 instance를 늘린다. DB 자원이 먼저 포화되면 query와 index를 고치고, 읽기 부하면 replica나 cache, 쓰기 부하면 sharding까지 검토한다. 둘 다 여유인데 요청 thread가 모두 active면 thread pool이, thread는 남는데 connection pool의 active가 최대치에 붙어 있으면 pool 크기가 병목이다.
4. Pool 크기를 올려 다시 측정한다. Instance별 pool 합이 `max_connections`에 닿았는데 DB 지표에 여유가 있으면 `max_connections`도 올려 반복하고, DB의 latency나 lock wait가 나빠지기 시작하기 직전 값을 상한으로 삼는다.
5. 상한에서 batch와 운영 연결 몫을 뺀 예산을 instance 수로 나누되 장애나 급증 때 투입할 예비 instance 몫을 남긴다. 상한이 60이고 운영 몫으로 10을 남겨 예산이 50이라면, instance 3대에 12씩 36으로 운영하면 예비 1대를 더해도 48로 예산 안에 든다.

운영 DB에 직접 부하를 주면 실제 사용자가 영향을 받으므로 별도 환경이나 트래픽이 적은 시간대를 쓴다. Pool 쪽 사이징 절차와 Little's Law 추정은 [[Connection-Pool#사이징 절차|사이징 절차]]에, 요청 thread pool 판단은 [[Thread-Pool-Sizing|스레드 풀 사이징]]에 있다.

## 운영 체크리스트

1. instance, replica와 worker가 늘어날 때 총 pool 예산이 자동으로 재계산되는가?
2. transaction이 끝나면 connection이 `finally`에서 반환되는가?
3. long query와 long transaction을 connection 부족으로 오인하지 않았는가?
4. connect, acquire, query timeout을 서로 다른 failure로 관찰하는가?
5. 배포와 장애 복구 때 reconnect storm을 jitter와 점진적 ramp-up으로 제한하는가?
6. 관리자 접속 경로와 최소 권한 계정을 application과 분리했는가?

## 전역 메모리와 연산별 메모리

버퍼 풀과 로그 버퍼는 서버 공유 영역이다. thread stack, 네트워크 buffer와 query의 sort/join/read buffer는 연결 또는 필요한 연산별로 소비된다. 복잡한 join에는 여러 buffer가 필요할 수 있어 `max_connections × buffer 하나`만으로 상한을 계산하지 않는다.

전역 사용량에 동시 활성 query들의 연산별 소비와 운영 여유를 더한다. `sort_buffer_size`나 `join_buffer_size`의 global 값을 크게 올리기 전에 특정 session 변경과 Performance Schema memory instrumentation으로 실제 peak를 비교한다. TempTable 전역 예산도 별도로 구분한다.

## 출처

- [MySQL 8.4 Reference Manual, Connection Interfaces](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html)
- [MySQL 8.4 Reference Manual, Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 Reference Manual, Server Status Variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL 8.4 Reference Manual, MySQL Enterprise Thread Pool](https://dev.mysql.com/doc/refman/8.4/en/thread-pool.html)
- [인프런, Real MySQL 시즌 1 - Part 2, 커넥션 관리](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226586)
- [MySQL 8.4 Reference Manual, memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html)
- [인프런, MySQL의 핵심!! 메모리와 트랜잭션 및 락 메커니즘](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338555)
- [MySQL 8.4 Reference Manual, Too many connections](https://dev.mysql.com/doc/refman/8.4/en/too-many-connections.html)
- [MySQL 8.4 Error Message Reference, Server Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [HikariCP, Configuration](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby)
- [YouTube, 쉬운코드, DBCP 개념과 설정, HikariCP와 MySQL](https://www.youtube.com/watch?v=zowzVqx3MQ4)


## 관련 문서

- [[Connection-Pool|Connection Pool]]
- [[Thread-Pool-Sizing|스레드 풀 사이징]]
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[Transactions|트랜잭션]]
