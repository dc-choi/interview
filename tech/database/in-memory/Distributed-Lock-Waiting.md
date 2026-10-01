---
tags: [database, redis, concurrency, distributed-lock]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Distributed Lock Waiting", "분산 락 획득 대기", "Lettuce vs Redisson", "Redis Spin Lock vs Pub/Sub Lock"]
---

# 분산 락 획득 대기 방식

[[Distributed-Lock|분산 락]]의 `SET key token NX PX ttl`이 실패했을 때 어떻게 기다리느냐가 Redis 부하, 락을 얻기까지의 지연과 호출자에게 돌려줄 실패 계약을 정한다. 획득 명령, 토큰 비교 해제, failover와 fencing의 한계는 부모 문서를 따르고, 이 문서는 획득에 실패한 뒤의 대기만 다룬다.

## 세 가지 대기 방식

| 방식 | 동작 | 맞는 경우 | 비용과 위험 |
|------|------|-----------|-------------|
| 즉시 포기 | 한 번 시도하고 실패하면 다른 인스턴스가 처리 중이라고 보고 끝낸다 | 중복 실행 방지처럼 기다릴 이유가 없는 락 ([[NestJS-Task-Scheduling|스케줄러 중복 실행]]) | Redis 요청이 가장 적다. 실패를 정상 종료로 볼지 호출자와 약속해야 한다 |
| 폴링 (스핀) | 간격을 두고 `SET ... NX PX`를 반복한다 | 대기자가 적고 구현을 단순하게 두고 싶을 때 | 대기자 수와 시도 빈도에 비례해 Redis 요청이 늘고, 해제된 뒤 다음 시도까지의 간격만큼 늦게 얻는다 |
| 해제 알림 대기 | 대기자가 채널을 구독하고, 보유자가 해제하며 발행한 메시지를 받으면 다시 시도한다 | 같은 락을 여러 요청이 차례로 기다려야 할 때 | 해제 시점에 주로 시도해 반복 요청이 적다. 구독 관리가 필요하고 알림은 유실될 수 있다 |

폴링 간격은 Redis 부하를 줄이는 장치지만 길수록 획득이 늦어지고, 모든 대기자가 같은 간격이면 해제 직후 시도가 한꺼번에 몰린다. 간격에 backoff와 jitter를 두고 전체 대기 시간에 상한을 둔다 ([[Retry-Backoff-Jitter|재시도, 백오프와 지터]]).

해제 알림은 Redis Pub/Sub 위에서 동작한다. Pub/Sub은 at-most-once라 연결이 끊겼거나 처리하지 못한 구독자에게 메시지를 다시 보내지 않는다 ([[Redis-Streams-PubSub|Streams, Pub/Sub]]). 그래서 알림 대기도 알림만 믿지 않고 일정 시간마다 다시 시도하는 폴백을 둔다. 직접 구현한다면 RESP2 연결은 구독 상태에서 구독 관련 명령과 `PING`, `QUIT`, `RESET` 정도만 쓸 수 있으므로 구독용 연결을 따로 둔다. RESP3 연결은 구독 중에도 다른 명령을 쓸 수 있다.

## 대기 시간과 점유 시간

| 값 | 뜻 | 너무 짧으면 | 너무 길면 |
|----|----|-------------|-----------|
| 대기 시간 (wait time) | 락을 얻으려고 기다리는 상한 | 경합 순간의 정상 요청까지 실패한다 | 요청 스레드, 커넥션과 응답 시간이 대기에 묶인다 |
| 점유 시간 (lease time) | 얻은 락이 자동으로 풀리는 시간 | 작업 도중 락이 풀려 두 번째 보유자가 들어온다 | 보유자가 죽었을 때 다른 요청이 오래 기다린다 |

- 대기 시간을 넘긴 요청을 로그만 남기고 반환하면 호출자는 성공과 구분하지 못하고 요청은 조용히 누락된다. 획득 실패를 전용 업무 오류나 결과 코드로 돌려 재시도, 대기열 등록이나 사용자 안내로 이어지게 한다
- 동시성 테스트가 실패할 때 대기 시간만 늘려 통과시키면 경합을 응답 지연으로 옮긴 것일 수 있다. 대기 시간 분포와 획득 실패율을 함께 기록한다
- 획득에 실패한 경로에서는 해제를 호출하지 않는다. 락은 트랜잭션 바깥에서 잡고 commit이 끝난 뒤 푼다 ([[Spring-Transactional|Spring @Transactional]]의 락 해제 순서)

## Java 클라이언트 예: Lettuce와 Redisson

Spring Boot는 Lettuce와 Jedis를 자동 구성하고, `spring-boot-starter-data-redis`의 기본 클라이언트는 Lettuce다 (Spring Boot 4.1 문서 기준). Lettuce는 Redis 명령을 보내는 클라이언트라 락과 대기를 직접 구현하고, Redisson은 재진입 가능한 락 객체 `RLock`을 제공한다.

| 기준 | Lettuce로 직접 구현 | Redisson `RLock` |
|------|--------------------|------------------|
| 대기 | 폴링 루프를 직접 작성 | Pub/Sub 알림으로 대기하고 재시도를 내장 |
| 의존성 | Spring Boot의 `spring-boot-starter-data-redis`가 Lettuce를 포함하므로 추가 없음 (Spring Data Redis만 쓰면 `lettuce-core` 추가) | 별도 라이브러리와 사용법 학습 |
| Redis 부하 | 대기자가 많을수록 반복 요청 증가 | 해제 시점에 주로 시도 |
| 점유 시간 | `PX`를 직접 정하고 연장도 직접 구현 | `tryLock(waitTime, leaseTime, unit)`. leaseTime을 생략하면 watchdog이 보유 인스턴스가 살아 있는 동안 만료를 연장 (기본 30초, `lockWatchdogTimeout`) |
| 해제 | 토큰 비교 해제를 직접 구현 | 보유 스레드만 해제할 수 있고, 아니면 `IllegalMonitorStateException` |

- Redisson의 대기 루프는 알림을 기다리되 현재 락의 남은 TTL과 자기에게 남은 대기 시간 중 짧은 쪽까지만 기다렸다가 다시 시도한다 (master 소스 기준). 알림을 놓쳐도 보유자의 TTL 만료나 자기 대기 상한에서 깨어나지만, 그만큼 늦게 얻을 수 있다
- leaseTime을 지정하면 연장이 없으므로 작업이 leaseTime을 넘기는 순간 다른 요청이 락을 얻을 수 있다. 생략하면 인스턴스가 살아 있는 동안 연장이 이어지므로 보유 스레드가 외부 호출에서 멈춰도 락이 풀리지 않을 수 있어, 작업 자체에 timeout을 둔다. 어느 쪽이든 연장이 끊긴 뒤 돌아온 이전 보유자의 쓰기는 부모 문서의 fencing token으로 막는다
- 짧은 시간에 수천 개 이상의 락을 얻고 풀면 Pub/Sub 사용 때문에 네트워크 처리량 한계나 Redis CPU 과부하에 닿을 수 있어, Redisson은 Pub/Sub 대신 exponential backoff로 기다리는 Spin Lock을 따로 제공한다. 알림 대기가 폴링보다 항상 싼 것은 아니다
- 강의는 실무에서 재시도가 필요 없는 락은 Lettuce로, 재시도가 필요한 락은 Redisson으로 섞어 쓴다고 소개한다. 기준은 라이브러리 이름이 아니라 위의 대기 방식이다
- 직접 구현할 때 TTL 없는 `SETNX`는 보유자가 죽으면 락이 풀리지 않고, 소유자를 확인하지 않는 삭제는 남의 락을 지운다. 부모 문서의 `SET ... NX PX`와 토큰 비교 해제를 그대로 쓴다

MySQL Named Lock(`GET_LOCK`)과 원리는 같다. Named Lock은 DB 세션에 묶여 같은 커넥션으로 해제해야 하고 대기와 보유 동안 커넥션을 점유하는 반면, Redis 락은 키와 토큰으로 해제하므로 세션을 관리할 필요가 없다 ([[Lock|DB Lock의 Named Lock]]).

NestJS에서 ioredis 같은 명령 수준 클라이언트로 옮길 때도 선택지는 같다. 대기자가 적으면 `SET NX PX` 폴링에 backoff, jitter와 대기 상한을 두는 것으로 시작하고, 같은 락에 대기자가 몰리면 구독용 연결과 폴백 재시도를 갖춘 알림 대기를 검토한다.

## 면접 체크포인트

- 폴링(스핀)과 해제 알림 대기의 Redis 부하와 획득 지연 차이
- 대기 시간과 점유 시간이 각각 막는 실패
- 대기 시간 초과를 호출자에게 드러내야 하는 이유
- Pub/Sub 알림이 유실될 수 있는데도 알림 대기가 동작하게 만드는 조건
- Redisson에서 leaseTime을 지정할 때와 생략할 때(watchdog)의 차이

## 출처

- [Redisson Docs, Locks and synchronizers](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [RedissonLock.java — redisson/redisson](https://github.com/redisson/redisson/blob/master/redisson/src/main/java/org/redisson/RedissonLock.java)
- [Spring Boot Reference, Working with NoSQL Technologies](https://docs.spring.io/spring-boot/reference/data/nosql.html#data.nosql.redis)
- [Spring Data Redis Reference, Drivers](https://docs.spring.io/spring-data/redis/reference/redis/drivers.html)
- [Redis Docs, Redis Pub/sub](https://redis.io/docs/latest/develop/pubsub/)
- [인프런, 최상용, Redis 라이브러리 알아보기](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=119710)
- [인프런, 최상용, Lettuce를 작성하여 재고감소 로직 작성하기](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174919)
- [인프런, 최상용, Redisson 을 활용하여 재고로직 작성하기](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174920)
- [인프런, 최상용, 라이브러리 장단점](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=114982)

## 관련 문서

- [[Distributed-Lock|분산 락]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub]]
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]]
- [[Lock|DB Lock]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Race-Condition-Patterns|Race Condition 패턴]]
