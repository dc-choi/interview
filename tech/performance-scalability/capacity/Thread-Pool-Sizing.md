---
tags: [performance, thread-pool, concurrency, sizing, capacity]
status: done
verified_at: 2026-08-31
category: "성능&확장성(Performance&Scalability)"
aliases: ["Thread Pool Sizing", "스레드 풀 사이징", "워커 풀 크기"]
---

# 스레드 풀 사이징

Thread pool size는 단독으로 정하는 숫자가 아니라 애플리케이션이 동시에 진행시키기로 허용한 작업 수의 상한이다. 같은 상한이라도 queue 크기, rejection 정책, timeout을 어떻게 잡느냐에 따라 부하 초과 시의 동작이 완전히 달라지므로 네 값은 한 세트로 결정한다. 공식은 출발점을 주고, 확정은 부하 테스트가 한다.

## 먼저 고정할 입력값

공식을 꺼내기 전에 아래가 숫자로 정해져 있어야 한다. 하나라도 비어 있으면 사이징이 아니라 추측이다.

- **목표 처리량** — 피크 기준 초당 요청 수 또는 작업 수.
- **작업당 서비스 시간** — 스레드가 그 작업에 묶여 있는 전체 시간. 응답 시간과 다르다 (queue 대기는 제외).
- **대기(W)와 계산(C)의 비율** — 서비스 시간 중 블로킹 대기 비중.
- **가용 코어 수** — 컨테이너의 CPU limit 기준이며, 호스트의 물리 코어 수가 아니다.
- **latency SLO** — p99 목표. 이 값이 queue 허용 깊이의 상한을 결정한다.
- **downstream 동시성 예산** — DB, 캐시, 외부 API가 받아 줄 수 있는 동시 요청 수. 스레드 풀보다 이쪽이 먼저 무너지는 경우가 많다.

## Little's Law로 하한 잡기

정상 상태의 평균 동시 작업 수는 `L = λW`로 추정한다. 법칙 자체의 정의와 부하 곡선 해석은 [[Throughput-vs-Latency|처리량과 지연시간]]에 있고, 여기서는 스레드 풀에 대입하는 부분만 본다.

- 초당 800건을 처리해야 하고 작업당 스레드 점유가 평균 60ms라면, 평균 동시 점유는 `800 × 0.06 = 48`이다.
- 이 48은 **최소한 이만큼은 필요하다**는 하한이지 적정값이 아니다. 평균만 반영하므로 tail latency, burst, retry 증폭, GC 정지가 빠져 있다.
- 실제 유입은 평균이 아니라 파형으로 온다. 하한 위에 얼마의 여유를 둘지는 스텝 형태의 부하 테스트로 정한다 — [[Capacity-Planning|캐퍼시티 플래닝]].

## CPU-bound와 I/O-bound 공식

병목이 계산인지 대기인지에 따라 출발점이 갈린다. 구분 신호와 진단법 자체는 [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]로 넘기고, 여기서는 그 결론을 숫자로 바꾸는 부분만 다룬다.

| 성격 | 출발 공식 | 근거 | 늘렸을 때 생기는 일 |
|---|---|---|---|
| CPU-bound | 코어 수, 또는 코어 수 + 1 | 코어를 이미 다 쓰고 있어 스레드를 늘려도 처리할 여력이 없다 | 컨텍스트 스위칭과 캐시 오염만 늘고 처리량은 정체하거나 하락 |
| I/O-bound | `N_cpu × U_cpu × (1 + W/C)` | 대기 중인 스레드는 코어를 쓰지 않으므로 그 비율만큼 더 태울 수 있다 | downstream 동시성이 먼저 포화 |

- `U_cpu`는 목표 CPU 사용률이다. 여유 없이 1.0을 넣으면 GC와 스파이크를 흡수할 헤드룸이 사라진다.
- 예시: 8코어, `U_cpu = 0.8`, W가 90ms이고 C가 10ms면 `8 × 0.8 × (1 + 9) = 64`.
- **W와 C는 추측하지 않고 측정한다.** APM의 span 분해로 외부 호출과 DB 구간을 떼어내면 W가 나오고, 나머지가 C다. 프로파일러의 on-CPU와 off-CPU 시간 분리도 같은 값을 준다 — [[Application-Performance-Monitoring|APM]].
- 두 공식 모두 균질한 작업을 가정한다. 요청 종류마다 W/C가 크게 다르면 하나의 평균값으로 묶지 말고 풀을 나눈다.

## Pool과 queue는 한 세트

`ThreadPoolExecutor`는 core 스레드가 찬 뒤 큐에 넣고, 큐가 가득 찼을 때만 max까지 늘린 다음 거절한다. 이 admission 순서와 API 계약은 [[Java-Executors-Futures-and-Thread-Pools|Java Executor와 thread pool]]에 정리돼 있다.

- 큐가 무한하면 max 경로에 도달할 일이 없어 `maximumPoolSize`가 사실상 무시된다. `Executors.newFixedThreadPool`이 공유 무제한 큐를 쓰는 이유이자 함정이다 (Java SE 25 API 문서 기준).
- 큐를 키워도 병목의 처리율은 그대로다. **늘어나는 것은 처리량이 아니라 체류 시간뿐이며**, 호출자가 이미 포기한 요청을 뒤늦게 처리하는 낭비가 커진다.
- Java SE 25 API 문서는 큐와 풀의 상충을 이렇게 정리한다. 큰 큐와 작은 풀은 컨텍스트 스위칭을 줄이지만 처리량이 떨어질 수 있고, 작은 큐와 큰 풀은 CPU를 더 바쁘게 쓰지만 스케줄링 오버헤드가 커진다.
- 따라서 **bounded queue를 전제로 시작**하고, 넘치는 부하는 거절해 상류로 되돌린다. 거절 이후의 흐름 제어는 [[Backpressure|배압]]으로 이어진다.

## 과대 풀의 대가

스레드를 늘리는 것은 공짜가 아니다. 커넥션 풀을 키우면 DB가 느려지는 것과 같은 축이다 — [[Connection-Pool|커넥션 풀 사이징]]의 과대 풀 역설.

- **컨텍스트 스위칭과 캐시 지역성** — 실행 가능한 스레드가 코어보다 많아질수록 스위칭 비용과 캐시 미스가 늘어난다.
- **메모리** — 플랫폼 스레드마다 스택이 잡히므로 수천 개 수준에서는 힙 외 메모리와 GC 압박이 문제로 올라온다.
- **downstream 부하 증폭** — 내 풀을 키우면 그만큼 더 많은 요청이 DB와 외부 API로 동시에 나간다. 내 서버는 안 죽고 남이 죽는다.
- **tail latency 악화** — 모두가 조금씩 느려지므로 평균은 버텨도 p99가 먼저 무너진다.
- **인스턴스 배수** — 인스턴스 20대 × 풀 200이면 downstream 입장에서는 4000 동시성이다. 오토스케일 최대 대수까지 곱해서 계산한다.

## 런타임별 사이징 knob 지도

| 런타임 | knob | 제한 대상 | 정본 |
|---|---|---|---|
| Tomcat | `maxThreads` (기본 200), `minSpareThreads` (10), `acceptCount` (100), `maxConnections` (8192) | 동시 처리 요청 수, 유휴 최소, OS accept 큐, 수용 커넥션 수 (Tomcat 11.0 문서 기준) | [[Spring-MVC-Essentials|Spring MVC]] |
| Spring Boot | `server.tomcat.threads.max`, `threads.min-spare`, `accept-count`, `max-connections` | 위 Tomcat 값을 property로 노출 | Spring Boot 공통 property 문서 |
| Java | `corePoolSize`, `maximumPoolSize`, work queue, `RejectedExecutionHandler` | admission 순서 전체 | [[Java-Executors-Futures-and-Thread-Pools|Executor와 thread pool]] |
| Node.js | `UV_THREADPOOL_SIZE` (libuv 1.x 기준 기본 4, 최대 1024) | 파일 시스템, DNS 조회, 일부 crypto의 위임 작업 | [[libuv-Threading|libuv 스레딩]] |
| Node.js | Worker Threads 풀 (직접 구현) | CPU 작업의 병렬 실행 수 | [[Worker-Threads|Worker Threads]] |
| OpenSearch | 노드별 fixed pool과 queue 크기 | search, write 등 작업 종류별 동시성 | [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단]] |

`UV_THREADPOOL_SIZE`는 이벤트 루프 자체의 동시성이 아니라 블로킹 작업의 위임 슬롯 수라는 점을 혼동하지 않는다 — [[Async-vs-Threads|비동기와 스레드]].

## Virtual thread 이후

Java 21 이후 virtual thread 모델에서는 스레드가 희소 자원이 아니므로 **풀 크기가 곧 동시성 제어라는 등식이 깨진다.**

- Oracle의 virtual thread 가이드는 virtual thread를 풀링하지 말고 작업마다 하나씩 만들라고 명시한다. `Executors.newVirtualThreadPerTaskExecutor()`가 만드는 스레드 수는 상한이 없다.
- 동시 10건만 받는 외부 서비스처럼 제한이 필요한 자원은 풀 대신 `Semaphore`로 막는다. 문서의 표현대로 블로킹된 스레드와 큐에 쌓인 작업은 사실상 같은 것이므로 효과는 동일하고 의미만 정확해진다.
- 다만 **CPU 병렬성 상한과 downstream 예산은 여전히 별도로 잡아야 한다.** 스레드가 싸졌다고 DB 커넥션이나 외부 API 쿼터가 늘어난 것은 아니다.

## 후보값 검증 절차

1. 위 공식으로 후보값 3개 내외를 만든다 (하한, 중간, 과대).
2. 스텝과 램프업 부하 시나리오를 각각 돌린다 — 시나리오 설계는 [[Capacity-Planning|캐퍼시티 플래닝]], 실행은 [[Load-Test-K6|k6]].
3. 매 후보에서 throughput, p99, queue depth, rejection 수, CPU 사용률, downstream 포화 지표를 같은 시간축으로 함께 본다.
4. SLO를 만족하는 **가장 작은 안정 구간**을 고른다. 처리량이 더 안 오르는데 p99만 오르는 지점 직전이 그 경계다.
5. 선택한 값 기준으로 queue depth와 rejection의 alert threshold를 정하고, 배포마다 재계측한다.

## 포화 진단

풀이 다 찼을 때 크기부터 올리지 않고 원인을 먼저 가른다. 지표는 active, queue depth, rejected, enqueue delay를 함께 본다. `ThreadPoolExecutor`의 active는 실행 중이라고 보는 thread 수의 근사치이며, task 내부에서 I/O나 lock을 기다리는 thread도 active에 포함될 수 있다. CPU 사용률과 thread dump를 같이 봐야 한다.

| 관측 | 유력한 원인 | 조치 방향 |
|---|---|---|
| active 만석, 작업당 시간 증가 | downstream 지연 또는 쿼리 저하 | 풀이 아니라 느려진 구간을 고친다 |
| active 만석, 작업당 시간 일정 | 유입 증가 | 용량 증설 또는 상류 제한 |
| queue depth만 계단식 증가 | 큐가 포화를 감추는 중 | 큐를 줄이고 거절을 노출 |
| active와 queue가 모두 낮은데 처리 정체 | 풀 포화가 아닌 caller, submission 또는 관측 경로의 병목 | 유입량, executor 제출 지점과 downstream 지표를 함께 확인 |
| 시간이 지날수록 active 우상향 | 반환 누락, 누수 | 타임아웃과 자원 해제 경로 점검 |

## 격리와 분리

성격이 다른 작업을 한 풀에 태우면 느린 쪽이 빠른 쪽의 슬롯을 먹는다. Bulkhead 패턴의 구현과 timeout 계층은 [[External-Service-Resilience|외부 서비스 장애 대응]]에 있고, 분리 여부의 판단 기준만 적으면 이렇다.

- latency-sensitive 요청과 batch성 작업이 같은 풀을 쓴다면 분리한다 — [[Backfill-Resource-Isolation|백필 자원 격리]].
- 외부 의존성별로 장애 확률이 독립적이면 의존성 단위로 분리한다. 한쪽 지연이 다른 쪽 슬롯을 잠식하지 않는다.
- 분리한 풀의 합이 코어 수와 downstream 예산을 넘지 않는지 다시 확인한다. 격리는 총량을 늘리는 수단이 아니다.

## 흔한 실수

- 공식 결과를 측정 없이 그대로 운영에 반영한다.
- 무제한 큐를 써서 `maximumPoolSize` 경로를 무력화해 놓고 max 값을 튜닝한다.
- 인스턴스별 풀 크기를 downstream 동시성 예산으로 환산하지 않는다.
- 외부 API가 느리다고 스레드를 늘린다. 대기 시간은 그대로이고 동시 대기자만 늘어난다.
- 429와 rejection이 보인다고 큐와 타임아웃을 늘려 과부하 신호 자체를 숨긴다.
- 컨테이너 CPU limit이 1인데 호스트 코어 수를 기준으로 계산한다.

## 면접 체크포인트

- CPU-bound와 I/O-bound에서 출발 공식이 갈리는 이유를 대기 시간의 코어 점유 여부로 설명한다.
- Little's Law로 초기값을 잡되 상한 결정 근거로는 쓰지 않는 이유를 말한다 (평균만 반영).
- 풀을 키웠을 때 downstream이 대신 포화되는 메커니즘을 인스턴스 배수까지 포함해 설명한다.
- 큐를 키우는 것과 풀을 키우는 것의 차이를 처리량과 체류 시간으로 구분한다.
- virtual thread 환경에서 사이징의 의미가 어떻게 바뀌는지, 그래도 무엇은 여전히 제한해야 하는지 답한다.

## 출처

- [Java SE 25 API, ThreadPoolExecutor](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [Java SE 25 API, Executors](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/Executors.html)
- [Java SE 25 Core Libraries, Virtual Threads](https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html)
- [Apache Tomcat 11.0, The HTTP Connector](https://tomcat.apache.org/tomcat-11.0-doc/config/http.html)
- [Spring Boot, Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)
- [libuv 1.x, Thread pool work scheduling](https://docs.libuv.org/en/v1.x/threadpool.html)
- [How to set an ideal thread pool size — Zalando Engineering Blog](https://engineering.zalando.com/posts/2019/04/how-to-set-an-ideal-thread-pool-size.html)

## 관련 문서

- [[Throughput-vs-Latency|처리량과 지연시간]] — Little's Law의 정의와 부하 곡선
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]] — 공식 분기의 전제가 되는 병목 구분
- [[Java-Executors-Futures-and-Thread-Pools|Java Executor, Future와 thread pool]] — admission 순서와 rejection 핸들러
- [[Connection-Pool|DB 커넥션 풀, 사이징]] — 스레드 풀과 별도로 잡는 커넥션 예산
- [[External-Service-Resilience|외부 서비스 장애 대응]] — Bulkhead와 타임아웃 계층
- [[Backpressure|배압]] — 거절 이후의 흐름 제어
- [[Capacity-Planning|캐퍼시티 플래닝]] — 스텝과 램프업 시나리오 설계
- [[Load-Test-K6|성능 테스트 도구 (k6, JMeter)]] — 후보값 검증 실행
- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 진단]] — thread pool 429 대응
- [[libuv-Threading|libuv 스레딩]] — Node.js의 위임 스레드 풀
- [[Worker-Threads|Worker Threads]] — Node.js의 CPU 작업 병렬화
- [[Async-vs-Threads|비동기와 스레드]] — 동시성 모델 차이
- [[Latency-Optimization|레이턴시 최적화]] — 서비스 시간 자체를 줄이는 축
- [[Application-Performance-Monitoring|APM]] — W와 C 측정
- [[Backfill-Resource-Isolation|백필 자원 격리]] — batch와 온라인 요청의 분리
