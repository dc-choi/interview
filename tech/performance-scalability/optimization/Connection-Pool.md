---
tags: [performance, database, connection-pool, hikari, scalability]
status: done
verified_at: 2026-09-30
category: "성능&확장성(Performance&Scalability)"
aliases: ["Connection Pool", "Connection Pool Sizing", "DB 커넥션 풀", "HikariCP"]
---

# DB 커넥션 풀, 사이징

Database connection 생성에는 network 연결, TLS, 인증과 session 초기화가 포함될 수 있다. Connection pool은 미리 열어 둔 물리 connection을 재사용해 이 비용을 나누고, application이 동시에 DB에 보낼 작업 수를 제한한다.

Pooling이 모든 query를 빠르게 만드는 것은 아니다. DB가 감당할 수 있는 concurrency보다 pool을 크게 잡으면 CPU, I/O, lock과 memory 경합이 늘어 오히려 latency가 악화될 수 있다.

## `DataSource`와 pool 구분

Java SE의 `DataSource`는 connection을 얻는 표준 factory 계약이다. API는 구현 성격을 basic, connection pooling, distributed transaction 세 범주로 설명한다. 따라서 `DataSource`라고 해서 반드시 pool은 아니다.

| 예시 | `getConnection()` 동작 | 주 용도 |
|---|---|---|
| `DriverManagerDataSource` | 매번 새 물리 connection 생성 | test와 간단한 standalone code |
| `HikariDataSource` | pool에서 논리 connection 대여 | 일반적인 server application |
| JNDI `DataSource` | application server 설정에 위임 | container-managed 환경 |

Pooled `DataSource`가 반환하는 `Connection`은 보통 proxy다. application이 `close()`하면 물리 socket을 바로 닫기보다 pool에 반환한다. 이 동작은 구현 contract에 따르므로 connection을 field에 보관하거나 close를 생략하지 않는다.

## Spring Boot 4.1의 선택

Spring Boot 4.1은 pooling `DataSource`를 자동 구성할 때 classpath에서 HikariCP, Tomcat pool, DBCP2, Oracle UCP 순으로 후보를 선택한다. JDBC와 JPA starter는 HikariCP dependency를 제공하므로 일반적인 starter 구성에서는 HikariCP가 선택된다.

- 공통 설정은 `spring.datasource.*`, Hikari 전용 설정은 `spring.datasource.hikari.*`를 사용한다.
- `spring.datasource.type`으로 구현을 명시하거나 custom `DataSource` bean을 제공할 수 있다.
- custom bean을 제공하면 해당 자동 구성이 물러난다. 현재 실제 bean type과 property binding 결과를 test로 확인한다.
- Boot 4.1의 `spring.datasource.connection-fetch=lazy`는 auto-configured pooled `DataSource`를 `LazyConnectionDataSourceProxy`로 감싸 첫 JDBC statement까지 실제 대여를 늦출 수 있다.

## Pool 시작과 채우기

Connection 생성에는 TCP 연결, 인증과 session 생성이 들어가므로 pool이 다 찰 때까지 기동을 기다리게 하지 않는다. 아래는 HikariCP 7.1 README와 소스 기준이다.

- `initializationFailTimeout`이 양수(기본 1)면 pool을 시작하는 스레드는 첫 connection을 확보할 때까지 막히고(이 값은 `connectionTimeout` 뒤에 더해진다), 확보하지 못하면 예외로 기동 실패를 알린다. 음수면 첫 확보 시도 없이 바로 시작하고 채우기를 모두 background로 넘긴다.
- 나머지 connection은 pool 이름이 붙은 connection adder 스레드가 비동기로 `minimumIdle`까지 채운다. 다 차기 전에 대여 요청이 오면 connection이 만들어질 때까지 기다린다.
- `HikariDataSource`를 기본 생성자로 만들면 pool은 첫 `getConnection()`에서 시작한다. Spring Boot의 `DataSourceBuilder`가 이 경로로 만들므로, 기동 중 connection을 쓰는 구성 요소가 없으면 첫 요청이 pool 시작 비용을 치른다.
- 새 인스턴스가 막 떴을 때 p99가 튀는 현상([[Blue-Green|Blue-Green 배포]]의 연결 풀 워밍업)이 이 경로다. 트래픽을 넣기 전에 pool을 채우거나 트래픽을 점진적으로 옮긴다.
- 재사용 여부는 로그로 확인한다. 대여마다 proxy 객체는 달라도 감싼 물리 connection 식별자가 같으면 재사용이고, `DriverManagerDataSource`는 호출마다 새 물리 connection을 만든다. pool 상태는 DEBUG 로그의 pool stats(total, idle, active, waiting)나 metric으로 본다.

## 주요 설정 축

| 축 | 판단 기준 |
|---|---|
| maximum pool size | 모든 application instance의 합과 DB connection 예산 |
| minimum idle | idle connection 유지 비용과 burst 준비 시간 |
| connection timeout | 대기 허용 시간과 상위 request deadline |
| idle timeout | 남는 connection을 줄일 시점 |
| max lifetime | DB, proxy, network가 connection을 강제 종료하기 전 교체 |
| keepalive | idle connection의 network 유효성 유지 필요 |

각 timeout은 독립된 숫자가 아니다. HTTP deadline보다 connection acquisition timeout이 길면 호출자가 포기한 뒤에도 server thread가 기다릴 수 있다. 반대로 너무 짧으면 정상적인 짧은 burst도 실패시킨다. 목표 SLO와 부하 test를 기준으로 정한다.

JDBC 4 driver가 `Connection.isValid()`를 제대로 구현하면 HikariCP는 이를 사용할 수 있다. 임의의 validation query는 driver 지원이 없을 때만 검토한다. `maxLifetime`은 database나 network 장비가 정한 connection 제한보다 여유 있게 짧게 두되, 모든 connection이 동시에 교체되지 않도록 pool 구현의 분산 동작을 확인한다.

## 설정값의 실패 경로

설정 축마다 너무 작거나 너무 클 때 실패하는 방식이 다르다.

- **시작 크기** — max를 처음부터 크게 잡으면 어디서 부족해지는지 관찰하기 어렵다. 작게 시작해 acquisition wait와 DB 지표를 보며 올리고, 경험적 출발점(예: 앱 서버당 20~30)도 아래 사이징 절차로 검증한다.
- **min과 max** — HikariCP는 성능과 spike 대응을 위해 `minimumIdle`을 두지 않은 고정 크기 pool을 권한다. 다만 고정 크기에서는 pool이 min에서 max로 늘어나는 신호가 없어 부족을 예측하기 어려울 수 있으므로, active/max 비율(idle의 바닥 근접)을 조기 경보로, pending과 acquisition wait를 포화 확인 신호로 삼는다.
- **acquisition timeout** — 너무 짧으면 connection 생성이 잠깐 늦어진 것만으로 실패하고, 호출자가 곧바로 다시 요청하면 대기와 생성 시도가 겹치는 악순환이 된다. 오류 응답이나 대체 로직 같은 fallback이 있을 때만 짧게 둔다.
- **query timeout** — timeout 뒤 재실행하지 않는 경로라면 짧게 둘 수 있다. 같은 query를 재시도하는 구조에서 짧게 두면 느린 query가 재시도로 겹쳐 DB 부하를 키운다.
- **idle timeout** — 앱 밖(DB, 중간 네트워크 장비)에서 끊긴 connection을 쓰다 나는 오류를 줄이려고 둔다. 너무 짧으면 connection별 [[Prepared-Statement-Cache|prepared statement cache]]가 connection과 함께 버려지므로 수십 분 단위가 권장되지만, 경로에서 가장 짧은 idle 절단(DB의 `wait_timeout`, NAT, LB, 방화벽)보다 오래 놀리려면 keepalive가 그 전에 connection을 깨워야 한다 — [[MySQL-Connection-Management|MySQL Connection 관리]]. HikariCP의 `idleTimeout`(기본 10분)은 `minimumIdle`이 `maximumPoolSize`보다 작을 때만 적용되므로, 고정 크기 pool에서는 `keepaliveTime`(기본 2분)과 `maxLifetime`(기본 30분)이 이 역할을 맡는다.
- **대여 순서** — 최근 반환된 connection부터 다시 빌려주면(LIFO) 나머지는 오래 놀다가 외부에서 끊기기 쉽다. 모든 connection을 고르게 쓰거나 대여, 반환, 유휴 시점에 검증을 두는 이유다. mysql2 pool은 LIFO로 꺼내며, `maxIdle`을 `connectionLimit`보다 작게 둘 때만 가장 오래 논 connection부터 `idleTimeout`(기본 60초)을 넘기거나 `maxIdle`을 초과한 idle connection을 정리한다. 기본값(`maxIdle` = `connectionLimit`)에서는 idle 정리가 없고 꺼낼 때 검증도 하지 않으므로, `maxIdle`을 낮추고 `idleTimeout`을 경로에서 가장 짧은 idle 절단보다 짧게 두거나 대여 직전에 검증한다. HikariCP는 idle connection을 `keepaliveTime`마다 ping하고, 마지막 사용 뒤 500ms(기본값)가 지난 connection은 대여 직전에 살아 있는지 확인한다.
- **끊긴 connection 재시도** — 중요한 읽기는 재시도하되, 쓰기는 commit 도중 connection이 끊기면 결과를 알 수 없으므로 멱등하게 만들거나 결과를 확인한 뒤 재시도한다. 이런 오류에 빠르게 대처하려면 사용하는 pool 구현의 내부 동작을 알아야 한다.

## 사이징 절차

Pool size는 formula 하나로 확정하지 않고 다음 순서로 검증한다.

1. DB의 connection 한도에서 관리자, migration, batch와 장애 대응용 여유를 뺀다.
2. 남은 예산을 production instance 수와 read/write pool에 배분한다. autoscaling 최대 instance 수도 포함한다.
3. 실제 query mix의 DB 점유 시간을 측정한다.
4. 후보 pool size별 부하 test에서 throughput, acquisition wait, query latency, DB CPU, I/O와 lock wait를 함께 본다.
5. 목표 throughput을 만족하는 가장 작은 안정 구간을 선택하고 alert threshold를 정한다.

Little's Law의 `L = λW`는 초기 추정에 쓸 수 있다. DB를 초당 500회 사용하고 각 작업이 connection을 평균 40ms 점유한다면 평균 동시 점유는 약 20이다. 그러나 tail latency, transaction 길이, burst, retry와 lock wait가 빠져 있으므로 이 값만으로 maximum size를 정하지 않는다.

HikariCP의 pool sizing 문서는 CPU core와 spinning disk 수를 이용한 PostgreSQL의 출발점 공식을 소개하지만 보편적인 정답으로 제시하지 않는다. SSD, remote DB, query 병렬성, 여러 application의 경쟁이 다르므로 측정값으로 조정한다.

## 포화 상태 해석

Pool이 모두 사용 중이면 요청은 acquisition queue에서 기다리거나 timeout된다. 이때 maximum size를 즉시 늘리기 전에 다음을 구분한다.

- query가 느려져 connection 점유 시간이 늘었는가
- 긴 transaction이나 외부 API 호출이 connection을 붙잡는가
- connection leak가 있는가
- DB CPU, I/O 또는 lock이 이미 포화됐는가
- retry가 부하를 증폭하는가
- instance 증가로 전체 connection 수가 예상보다 커졌는가

Pool metric은 active, idle, pending, timeout을 함께 본다. Application metric의 transaction duration, DB의 active session, slow query와 lock wait를 같은 시간축으로 연결해야 원인을 찾을 수 있다.

## 분리와 proxy

- 긴 batch와 latency-sensitive OLTP가 서로 pool을 점유한다면 별도 concurrency budget을 검토한다.
- Read replica pool은 connection과 부하를 분리하지만 replication lag와 read-after-write 정책이 필요하다.
- PgBouncer나 RDS Proxy 같은 외부 proxy는 여러 process의 물리 connection을 다중화할 수 있다. Transaction pooling에서는 session 변수, temporary table, prepared statement 같은 session state 제약을 확인한다.
- Serverless scale-out은 instance마다 pool을 만들 수 있으므로 최대 동시 instance까지 계산하거나 managed proxy를 검토한다.

## 흔한 실수

- `DataSource`와 pooled implementation을 같은 개념으로 취급한다.
- pool을 크게 하면 throughput도 비례해 증가한다고 가정한다.
- 한 process의 설정만 보고 전체 instance의 connection 합을 계산하지 않는다.
- transaction 안에서 원격 API를 기다려 connection을 오래 점유한다.
- `Connection.close()`를 생략해 반환 누락을 만든다.
- acquisition timeout만 늘려 DB 포화 신호를 숨긴다.
- test 환경의 H2 결과로 운영 DB의 connection과 lock 특성을 단정한다.

## 면접 체크포인트

- `DataSource` 계약과 pooling 구현을 구분한다.
- pooled connection의 `close()`가 일반적으로 무엇을 의미하는지 설명한다.
- pool size가 너무 클 때 DB가 느려질 수 있는 이유를 말한다.
- process별 pool을 전체 DB connection budget으로 환산한다.
- acquisition wait와 slow query를 metric으로 구분한다.
- 고정 크기 pool에서 부족 신호를 무엇으로 보는지, 짧은 acquisition timeout이 악순환이 되는 경로를 설명한다.
- 새 인스턴스의 첫 요청이 느린 이유를 pool 시작과 비동기 채우기로 설명한다.

## 출처

- [Java SE 26 API, DataSource](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/javax/sql/DataSource.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Spring Framework, Controlling Database Connections](https://docs.spring.io/spring-framework/reference/data-access/jdbc/connections.html)
- [HikariCP, About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [HikariCP, Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)
- [PgBouncer, Features](https://www.pgbouncer.org/features.html)
- [HikariCP, HikariDataSource](https://github.com/brettwooldridge/HikariCP/blob/dev/src/main/java/com/zaxxer/hikari/HikariDataSource.java)
- [HikariCP, HikariPool](https://github.com/brettwooldridge/HikariCP/blob/dev/src/main/java/com/zaxxer/hikari/pool/HikariPool.java)
- [Spring Boot, DataSourceBuilder](https://github.com/spring-projects/spring-boot/blob/main/module/spring-boot-jdbc/src/main/java/org/springframework/boot/jdbc/DataSourceBuilder.java)
- [MySQL2, Documentation](https://sidorares.github.io/node-mysql2/docs)
- [MySQL2, Pool](https://github.com/sidorares/node-mysql2/blob/master/lib/base/pool.js)
- 백은빈 강사, [Ep.22 커넥션 관리](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226586)
- 김영한 강사, [커넥션 풀 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110070)
- 김영한 강사, [DataSource 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110071)
- 김영한 강사, [DataSource 예제 1, DriverManager](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110072)
- 김영한 강사, [DataSource 예제 2, 커넥션 풀](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110073)
- 김영한 강사, [DataSource 적용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110074)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110075)

## 관련 문서

- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
- [[RDS-Connection-Credentials|RDS 앱 연결과 자격증명]]
- [[MySQL-Connection-Management|MySQL Connection 관리]]
- [[Prepared-Statement-Cache|Prepared Statement Cache]]
- [[Blue-Green|Blue-Green 배포]]
