---
tags: [performance, concurrency, redis, kafka, coupon, race-condition, distributed-lock]
status: done
verified_at: 2026-08-04
category: "성능&확장성(Performance&Scalability)"
aliases: ["First-Come Coupon Patterns", "선착순 쿠폰 패턴", "선착순 이벤트 설계"]
---

# 선착순 이벤트(쿠폰, 재고, 티켓) 패턴

1000명이 몰리는데 100개만 발급해야 하는 유형의 요구다. 순진하게 **DB의 count → insert** 두 쿼리로 처리하면 초과 발급될 수 있다. 문제는 Race Condition이며, 해법은 **원자적 감소**와 **쓰기 부하 분리** 두 축이다.

## 문제 구조

```
1. SELECT COUNT(*) FROM coupon WHERE event_id = 1  // 읽기
2. if count < LIMIT: INSERT INTO coupon(...)       // 쓰기
```

두 쿼리 사이에 다른 트랜잭션이 끼어들면 여러 요청이 동시에 아직 100개 미만이라고 판단하고 모두 insert하여 제한을 넘길 수 있다.

## 해결 축 1: 원자적 감소(Atomicity)

여러 후보가 있지만 트레이드오프가 다르다.

### 1. DB Pessimistic Lock (`SELECT ... FOR UPDATE`)

- 해당 row에 배타 락 → 정확성 보장
- 커넥션을 쥔 채 대기하므로 경합이 커지면 **락 대기와 커넥션 풀 압박**이 병목이 된다.

### 2. Optimistic Lock (version 컬럼)

- 충돌 시 재시도. 경쟁이 적으면 빠름
- 경쟁이 커질수록 충돌과 재시도가 늘어 실제 처리량이 떨어질 수 있다.

### 3. Redis `INCR`/`DECR`

- Redis는 명령 하나를 다른 명령이 끼어들지 않는 실행 경계로 처리한다. 네트워크 I/O 스레딩 여부와 명령의 원자성은 구분해야 한다.
- `INCR`의 반환값으로 요청마다 서로 다른 순번을 얻을 수 있다.
- 중복 참여 금지와 수량 제한을 함께 지켜야 하면 `SADD`, `INCR`, 초과 시 보상을 하나의 짧은 Lua 스크립트로 묶는다.

```lua
-- KEYS[1] = participants, KEYS[2] = count
-- ARGV[1] = user_id, ARGV[2] = limit
if redis.call('SADD', KEYS[1], ARGV[1]) == 0 then
  return -1 -- 이미 참여한 사용자
end
local n = redis.call('INCR', KEYS[2])
if tonumber(n) > tonumber(ARGV[2]) then
  redis.call('SREM', KEYS[1], ARGV[1])
  redis.call('DECR', KEYS[2])
  return 0
end
return 1
```

Lua 스크립트는 실행 중 다른 명령이 끼어들지 않지만 RDBMS처럼 오류 전 상태로 자동 롤백하지는 않으므로, 키 타입과 입력을 사전에 검증하고 스크립트를 짧게 유지한다.

Redis Cluster에서는 한 Lua 스크립트가 접근하는 key들이 같은 hash slot에 있어야 한다. `participants:{eventId}`와 `count:{eventId}`처럼 같은 hash tag를 사용한다.

### 4. Redis 기반 분산 락(Redlock)

- 더 복잡한 비즈니스 로직(한도 + 중복 참여 금지 등)이 필요할 때
- 단순 카운팅에는 과함. `INCR`이 이미 원자적이므로 락 불필요

## 해결 축 2: 쓰기 부하 분리

`INCR`로 입장 판정은 원자화했어도 여러 이벤트의 승인 요청이 한꺼번에 DB로 내려가면 피크 쓰기 부하는 남는다. 브로커는 총 작업량을 없애는 장치가 아니라 DB가 감당할 속도로 평탄화하는 버퍼다.

### Kafka(또는 SQS) 비동기 저장

```
Client → API → Redis INCR 성공 → Kafka produce(이벤트)
                                 ↓
                             Consumer → DB insert
```

- API는 브로커가 발행을 확인한 시점을 기준으로 접수 응답을 반환한다. 클라이언트 버퍼에 넣기만 하고 성공으로 응답하면 뒤늦은 발행 실패를 놓칠 수 있다.
- Consumer가 자신의 속도로 DB에 적재 → 커넥션 풀 보호
- 보존 기간 안의 이벤트를 다시 소비할 수 있어 장애 복구와 재처리에 활용할 수 있다.

### 트레이드오프

- **일관성 지연**: 사용자는 접수 성공을 받았지만 DB에 기록되기까지 시간 차이가 생김
- **멱등성 필수**: 같은 사용자의 재시도로 같은 이벤트가 두 번 들어갈 수 있음. `user_id + event_id`를 고유키로
- **실패 복구**: Consumer가 죽으면 메시지가 쌓였다가 재개. 장시간 실패는 DLQ로
- **순서 경계**: Kafka의 레코드 순서는 partition 단위다. 순서가 필요한 레코드는 `event_id` 같은 key로 같은 partition에 배치하고, partition 수 변경 시 key 매핑이 달라질 수 있음을 고려한다.

접수 성공과 발급 완료는 다른 상태다. API 응답과 조회 모델에서도 `ACCEPTED`, `ISSUED`, `FAILED`처럼 구분해야 비동기 지연을 장애로 오해하지 않는다.

## 전체 흐름(모범 조합)

```
1. 클라이언트가 쿠폰 발급 요청
2. API에서 Redis Lua 스크립트 실행
   - SADD participants:{eventId}로 중복 참여 판정
   - INCR count:{eventId} + 한도 비교
   - 초과 시 SREM + DECR로 같은 스크립트 안에서 보상
3. 성공 결과를 Kafka에 produce (user_id, event_id, timestamp)
4. Consumer가 DB insert (user_id, event_id) UNIQUE
   - 유니크 충돌 시 이미 처리된 이벤트 → 무시(멱등)
5. 실패 시 Fail-Over 토픽 또는 DLQ에 저장, 스케줄러로 재시도
```

## 경계 실패 설계

- Redis 승인 뒤 Kafka 발행 전 프로세스가 죽으면 수량만 예약되고 이벤트는 사라질 수 있다. `request_id`와 승인 상태를 남기고, 발행 재시도와 주기적 대사를 설계한다.
- Kafka 소비 결과 저장과 offset 커밋 사이에 장애가 나면 같은 메시지를 다시 받을 수 있다. `(event_id, user_id)` 고유 제약 또는 처리한 `event_id` 기록으로 소비자를 멱등하게 만든다.
- 실패 이벤트 테이블만 추가한다고 복구가 자동 보장되지는 않는다. 실패 기록 자체의 저장 실패, 무한 재시도, 독성 메시지를 고려해 재시도 횟수와 DLQ, 운영자 재처리 절차를 함께 둔다.
- 비동기 통합 테스트는 고정 `sleep`으로 완료를 추측하지 않는다. 최종 조건을 제한 시간 안에서 폴링하고, 제한 시간 초과 시 consumer lag와 실패 원인을 출력한다.

## NestJS, TypeORM 적용 관점

- NestJS API는 Redis 스크립트 결과와 Kafka 발행 확인을 조합해 접수 상태를 반환하고, 실제 쿠폰 행 생성은 consumer 책임으로 둔다.
- TypeORM consumer는 전달받은 transactional entity manager 하나로 쿠폰 저장과 처리 이력 저장을 묶는다. 고유 제약 위반은 이미 처리된 이벤트로 분류한다.
- Redis, Kafka, MySQL을 하나의 TypeORM 트랜잭션으로 묶을 수는 없다. 각 경계에 식별자, 멱등성, 대사 작업을 배치하는 것이 핵심이다.

## 실전 고려사항

- **Redis 장애 대비** — 단일 인스턴스 장애 시 접수를 계속할지 중단할지 정하고, 필요한 가용성 수준에 맞춰 복제와 장애 조치 구성을 선택
- **스로틀링** — 응답이 성공이라도 클라이언트 재시도 폭주 방지 차원에서 Rate Limit과 조합
- **대기열 방식 대안** — 정확성보다 **공정성**이 중요하면 Redis Sorted Set으로 입장 티켓을 발급해 순번 대로 처리(예: 트래픽 많은 티켓 예매 사이트)
- **정합성 모니터링** — Redis 카운터와 DB insert 수의 일치 여부를 주기 점검. 차이가 누적되면 유실, 중복 의심
- **DB 스키마** — `(user_id, event_id)` UNIQUE 인덱스. Kafka 지연 상황에서도 중복 insert 차단

## 선택 가이드

| 규모, 요구 | 추천 조합 |
|---|---|
| 단일 DB, 경합이 감당 가능한 단순 흐름 | DB Pessimistic Lock |
| 짧은 원자 판정과 빠른 거절이 중요 | Redis INCR + DB 직접 insert |
| 피크에 커넥션 풀 압박 | Redis INCR + Kafka + Consumer |
| 공정 순번 필수 | Redis Sorted Set 대기열 |
| 중복 참여 금지 | Redis Set + Lua 스크립트 |

## 흔한 실수

- `SELECT COUNT + INSERT` 순차 실행 → 초과 발급
- Redis `INCR`은 했지만 실패 시 `DECR` 안 함 → 카운터가 실제보다 커짐
- Kafka에 produce만 하고 retry 정책 없음 → 네트워크 실패 시 유실
- Consumer가 동기 DB 쓰기만 하고 멱등 처리 없음 → 재실행 시 중복 발급
- Redis 한 노드에 의존 → SPOF

## 면접 체크포인트

- Race condition 없이 한도 제한을 어떻게 구현하는가
- Redis 명령 실행 경계와 Lua 원자성, 네트워크 I/O 스레딩을 구분하는가
- Pessimistic/Optimistic Lock과 Redis `INCR`의 트레이드오프
- Kafka 도입으로 얻는 이득과 비용(지연, 멱등, DLQ)
- 선착순 vs 대기열 공정성의 설계 선택

## 출처
- [Redis Docs - SADD](https://redis.io/docs/latest/commands/sadd/)
- [Redis Docs - Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Redis Docs - Multi-key operations](https://redis.io/docs/latest/develop/using-commands/multi-key-operations/)
- [Apache Kafka 4.3.1 - KafkaProducer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3.1 - KafkaConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 - Design](https://kafka.apache.org/43/design/design/)
- [TypeORM - Transactions](https://typeorm.io/docs/transactions/)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=153928)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 해결하기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=155153)
- [실습으로 배우는 선착순 이벤트 시스템, Consumer 사용하기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=158584)
- [실습으로 배우는 선착순 이벤트 시스템, 발급가능한 쿠폰개수를 1인당 1개로 제한하기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=159888)
- [실습으로 배우는 선착순 이벤트 시스템, 쿠폰을 발급하다가 에러가 발생하면 어떻게 하나요? - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=163908)

## 관련 문서
- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]]
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Concurrency-vs-Parallelism|동시성, 병렬성]]
