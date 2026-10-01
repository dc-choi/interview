---
tags: [performance, concurrency, redis, kafka, coupon, race-condition, distributed-lock]
status: done
verified_at: 2026-09-30
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

### 3. 조건부 원자적 UPDATE (affected rows 판정)

```sql
UPDATE course
SET current_count = current_count + 1
WHERE id = :courseId AND current_count < capacity;
```

- 한도 검증과 증가를 한 문장으로 묶어 조회와 쓰기 사이의 check-then-act 틈 자체를 없앤다. 변경 행 수가 1이면 성공, 0이면 마감이다.
- 잠금 읽기(`FOR UPDATE`) 선행이 없어 왕복하는 문장 수가 줄고, 대기하던 UPDATE는 선행 커밋 이후의 현재 값으로 조건을 재평가한다. 같은 행의 X 락 직렬화 자체는 남는다.
- 별도 인프라 없이 단일 DB로 닫히므로, 정원과 재고처럼 불변식을 WHERE 하나로 표현할 수 있으면 첫 후보다. 중복 신청 방지는 신청 테이블의 `(user_id, course_id)` UNIQUE와 짝으로 걸고, 카운터 증가와 신청 insert는 한 트랜잭션으로 묶는다.
- 패턴 상세는 [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 패턴]]과 [[Lock|DB Lock]] 참고.

### 4. Redis `INCR`/`DECR`

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

### 5. Redis 기반 분산 락(Redlock)

- 더 복잡한 비즈니스 로직(한도 + 중복 참여 금지 등)이 필요할 때
- 단순 카운팅에는 과함. `INCR`이 이미 원자적이므로 락 불필요

### 1인 1회 판정: 요청 경로의 원자 게이트

- **쿠폰 타입 기준 DB 유니크 키** — 가장 간단하지만 한 사용자가 같은 타입 쿠폰을 여러 장 가질 수 있어야 하는 일반 도메인과 충돌한다. 이 문서의 `(user_id, event_id)` UNIQUE는 범위를 발급 이벤트로 좁혀 이 충돌을 피한다.
- **락 + 발급 이력 조회** — API가 판정 뒤 발행만 하고 쿠폰 행은 consumer가 나중에 만드는 구조에서는 막지 못한다. 락이 풀린 뒤 consumer가 쓰기 전에 같은 사용자의 요청이 오면 조회 결과가 비어 있어 통과한다. 쿠폰 생성까지 락 범위에 넣으면 다른 요청의 대기가 길어져 처리량이 떨어진다.
- **원리** — 권위 있는 쓰기가 비동기로 일어나면 그 저장소를 조회하는 중복 판정은 아직 반영되지 않은 상태를 읽는다([[CAP-Theorem|CAP 정리]]의 read-your-writes). 판정과 기록을 한 명령으로 끝내는 게이트, 즉 `SADD`의 반환값(새로 추가된 원소 수, 이미 있으면 0)으로 판정한다.
- **순서와 역할 분담** — 1인 1회를 DB UNIQUE에만 맡기면 중복 요청이 API에서 `INCR` 슬롯을 먼저 소비한 뒤 consumer에서 거절돼, 서로 다른 당첨자 수가 한도보다 적어진다. 그래서 위 Lua처럼 `SADD`로 먼저 거르고 `INCR`은 그다음에 두며, DB UNIQUE는 재전달에 대한 멱등성 방어선으로 남긴다. Set 키는 `participants:{eventId}`처럼 이벤트별로 둔다.

## 해결 축 2: 쓰기 부하 분리

`INCR`로 입장 판정은 원자화했어도 승인된 요청마다 같은 요청 안에서 DB insert가 일어나면, DB 부하는 요청 수가 아니라 승인 수에 비례해 남는다. 발급 수량이 크거나 여러 이벤트가 겹치면 이것이 피크 쓰기 부하가 된다. 브로커는 총 작업량을 없애는 장치가 아니라 DB가 감당할 속도로 평탄화하는 버퍼다.

### 승인된 쓰기가 공유 DB를 포화시키는 경로

- **단순화한 계산** — DB가 분당 insert 100건만 처리한다고 가정하면, 쿠폰 요청 1만 건 뒤에 들어온 주문과 회원 가입은 100분 뒤에야 처리되고 대부분 timeout으로 실패한다. 실제 DB는 동시에 처리하지만 포화되면 connection pool 대기와 CPU, I/O 경합으로 모든 query의 지연이 함께 늘어 같은 결론에 이른다.
- **폭발 반경** — 쿠폰 전용이 아닌 공유 DB라면 이벤트와 무관한 페이지까지 느려지거나 실패한다. 정확한 수량 발급, 이벤트 페이지 접속 불가와 함께 선착순 이벤트의 대표 실패로 꼽히는 경로다. 무관한 요청이 connection 획득 단계에서 막히는 모습은 [[Lock-Wait-Convoy|락 대기 convoy]]와 닮았고, 자원 격리는 [[External-Service-Resilience|Bulkhead]]를 따른다.
- **consumer 속도는 예산이다** — 브로커를 둬도 총 insert 수는 그대로다. 공유 DB라면 consumer 동시성과 처리 속도를 다른 서비스가 쓸 여유를 남기는 값으로 정하고, 부하 도구로 단기간 트래픽을 재현해 DB CPU와 오류율을 함께 본다 — [[Load-Test-K6|성능 테스트 도구]].

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

## 경계 실패, 복구와 검증

Redis 승인 뒤 발행 전 장애와 소비 중복, 승인 뒤 consumer 실패로 생기는 수량 미달과 재발급, NestJS와 TypeORM 적용 경계, 총량과 1인 1회를 나눠 증명하는 검증 시나리오는 [[First-Come-Coupon-Patterns-Failure-and-Verification|선착순 이벤트 경계 실패, 복구와 검증]]에서 다룬다.

## 실전 고려사항

- **Redis 장애 대비** — 단일 인스턴스 장애 시 접수를 계속할지 중단할지 정하고, 필요한 가용성 수준에 맞춰 복제와 장애 조치 구성을 선택
- **스로틀링** — 응답이 성공이라도 클라이언트 재시도 폭주 방지 차원에서 Rate Limit과 조합
- **대기열 방식 대안** — 정확성보다 **공정성**이 중요하면 Redis Sorted Set으로 입장 티켓을 발급해 순번 대로 처리(예: 트래픽 많은 티켓 예매 사이트)
- **정합성 모니터링** — Redis 카운터와 DB insert 수의 일치 여부를 주기 점검. 차이가 누적되면 유실, 중복 의심. 카운터가 더 크면 승인 뒤 적재 실패로 인한 수량 미달 신호
- **DB 스키마** — `(user_id, event_id)` UNIQUE 인덱스. Kafka 지연 상황에서도 중복 insert 차단

## 선택 가이드

| 규모, 요구 | 추천 조합 |
|---|---|
| 한도 불변식을 WHERE 하나로 표현 가능 | 조건부 원자적 UPDATE + UNIQUE 중복 방지 |
| 단일 DB, 읽고 판단할 상태가 여러 개인 흐름 | DB Pessimistic Lock |
| 짧은 원자 판정과 빠른 거절이 중요 | Redis INCR + DB 직접 insert |
| 피크에 커넥션 풀 압박 | Redis INCR + Kafka + Consumer |
| 공정 순번 필수 | Redis Sorted Set 대기열 |
| 중복 참여 금지 | Redis Set + Lua 스크립트 |

## 흔한 실수

- `SELECT COUNT + INSERT` 순차 실행 → 초과 발급
- `@Transactional`만 붙이면 동시 접근이 막힌다는 오해 — 원자성은 all-or-nothing이지 격리가 아니다 ([[Lock|DB Lock]])
- 발행 실패가 확인된 접수 응답 전 실패에 `DECR`과 `SREM`으로 반납하지 않음 → 카운터가 실제보다 커짐. 발행 결과가 불확실(timeout 등)하면 즉시 반납하지 않고 `request_id` 대사로 확정한다. 반대로 접수 응답 뒤 consumer 실패에 `DECR`하면 접수 성공을 받은 사용자가 쿠폰을 잃는다 (실패 시점별 처리는 경계 실패 문서)
- Kafka에 produce만 하고 retry 정책 없음 → 네트워크 실패 시 유실
- Consumer가 동기 DB 쓰기만 하고 멱등 처리 없음 → 재실행 시 중복 발급
- Redis 한 노드에 의존 → SPOF

## 면접 체크포인트

- Race condition 없이 한도 제한을 어떻게 구현하는가
- Redis 명령 실행 경계와 Lua 원자성, 네트워크 I/O 스레딩을 구분하는가
- Pessimistic/Optimistic Lock과 Redis `INCR`의 트레이드오프
- Kafka 도입으로 얻는 이득과 비용(지연, 멱등, DLQ)
- 1인 1회를 DB 유니크 키나 락이 아니라 `SADD` 게이트로 판정하는 이유
- 선착순 vs 대기열 공정성의 설계 선택

## 출처
- [Redis Docs — SADD](https://redis.io/docs/latest/commands/sadd/)
- [Redis Docs — Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Redis Docs — Multi-key operations](https://redis.io/docs/latest/develop/using-commands/multi-key-operations/)
- [Apache Kafka 4.3.1 — KafkaProducer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3.1 — KafkaConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 — Design](https://kafka.apache.org/43/design/design/)
- [실습으로 배우는 선착순 이벤트 시스템, 강의소개 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=152660)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=153928)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 해결하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=155153)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 (Redis를 활용하여 문제 해결하기) — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=156125)
- [실습으로 배우는 선착순 이벤트 시스템, Consumer 사용하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=158584)
- [실습으로 배우는 선착순 이벤트 시스템, 발급가능한 쿠폰개수를 1인당 1개로 제한하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=159888)
- [실습으로 배우는 선착순 이벤트 시스템, 쿠폰을 발급하다가 에러가 발생하면 어떻게 하나요? — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=163908)
- [선착순 수강신청 동시성 이슈 — Nextree 기술블로그](https://www.nextree.io/seoncagsun-sugang-sinceong-dongsiseong-isyu/)

## 관련 문서
- [[First-Come-Coupon-Patterns-Failure-and-Verification|선착순 이벤트 경계 실패, 복구와 검증]]
- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]]
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Concurrency-vs-Parallelism|동시성, 병렬성]]
