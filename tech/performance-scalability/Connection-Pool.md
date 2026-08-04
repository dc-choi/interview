---
tags: [performance, database, connection-pool, hikari, scalability]
status: done
verified_at: 2026-08-04
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

## 출처

- [Java SE 26 API, DataSource](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/javax/sql/DataSource.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Spring Framework, Controlling Database Connections](https://docs.spring.io/spring-framework/reference/data-access/jdbc/connections.html)
- [HikariCP, About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [HikariCP, Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)
- [PgBouncer, Features](https://www.pgbouncer.org/features.html)
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
