---
tags: [performance, concurrency, redis, kafka, coupon, race-condition, distributed-lock]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["First-Come Coupon Patterns", "선착순 쿠폰 패턴", "선착순 이벤트 설계"]
---

# 선착순 이벤트(쿠폰·재고·티켓) 패턴

"1000명이 몰리는데 100개만 발급하라"는 유형의 요구. 순진하게 **DB의 count → insert** 두 쿼리로 처리하면 반드시 초과 발급된다. 문제는 Race Condition이며, 해법은 **원자적 감소**와 **쓰기 부하 분리** 두 축이다.

## 문제 구조

```
1. SELECT COUNT(*) FROM coupon WHERE event_id = 1  // 읽기
2. if count < LIMIT: INSERT INTO coupon(...)       // 쓰기
```

두 쿼리 사이에 다른 트랜잭션이 끼어들면 여러 요청이 동시에 "아직 100개 미만"으로 판단하고 전부 insert → **초과 발급**. 1000 동시 요청에서 100 제한이 110~150까지 새는 건 흔한 재현 결과.

## 해결 축 1: 원자적 감소(Atomicity)

여러 후보가 있지만 트레이드오프가 다르다.

### 1. DB Pessimistic Lock (`SELECT ... FOR UPDATE`)

- 해당 row에 배타 락 → 정확성 보장
- 커넥션을 쥔 채 대기하므로 **커넥션 풀 고갈**이 병목. TPS 수백을 넘기 어려움

### 2. Optimistic Lock (version 컬럼)

- 충돌 시 재시도. 경쟁이 적으면 빠름
- **피크 경쟁에서는 실패율 급증** — 1000 동시 요청에서는 대부분 재시도 → 오히려 느림

### 3. Redis `INCR`/`DECR`

- Redis는 싱글 스레드 + 논블로킹 I/O(Netty 유사 다중화)로 **원자 연산 보장**
- 초당 10만+ TPS 소화 가능
- 발급 전 `INCR coupon:count`로 1 증가 → 한도 초과면 롤백(`DECR`) 후 거절

```lua
-- KEYS[1] = coupon:count, ARGV[1] = limit
local n = redis.call('INCR', KEYS[1])
if tonumber(n) > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
```

Lua 스크립트로 실행하면 `INCR`·한도 비교·`DECR`이 **단일 원자 블록**으로 묶인다.

### 4. Redis 기반 분산 락(Redlock)

- 더 복잡한 비즈니스 로직(한도 + 중복 참여 금지 등)이 필요할 때
- 단순 카운팅에는 과함. `INCR`이 이미 원자적이므로 락 불필요

## 해결 축 2: 쓰기 부하 분리

`INCR`로 정합성은 해결됐지만, 발급 성공 100건을 **곧바로 DB에 쓰면** 피크 트래픽이 DB 커넥션을 질식시킨다.

### Kafka(또는 SQS) 비동기 저장

```
Client → API → Redis INCR 성공 → Kafka produce(이벤트)
                                 ↓
                             Consumer → DB insert
```

- API는 **Kafka produce로 요청 종료** → 사용자 응답 지연 최소
- Consumer가 자신의 속도로 DB에 적재 → 커넥션 풀 보호
- 이벤트 로그가 남아 감사·재처리 가능

### 트레이드오프

- **일관성 지연**: 사용자는 "성공"을 받았지만 DB에 기록되기까지 수백 ms~수 초 차이
- **멱등성 필수**: 같은 사용자의 재시도로 동일 이벤트가 두 번 들어갈 수 있음. `user_id + event_id`를 고유키로
- **실패 복구**: Consumer가 죽으면 메시지가 쌓였다가 재개. 장시간 실패는 DLQ로
- **순서 보장**: 필요하면 파티션 키를 `event_id`로 고정 — 같은 이벤트의 이벤트들은 단일 파티션에서 순서대로

## 전체 흐름(모범 조합)

```
1. 클라이언트가 쿠폰 발급 요청
2. API에서 Redis Lua 스크립트 실행
   - 중복 발급 체크(SISMEMBER participants:{event})
   - INCR coupon:count + 한도 비교
   - 성공 시 SADD participants
3. 성공 결과를 Kafka에 produce (user_id, event_id, timestamp)
4. Consumer가 DB insert (user_id, event_id) UNIQUE
   - 유니크 충돌 시 이미 처리된 이벤트 → 무시(멱등)
5. 실패 시 Fail-Over 토픽 또는 DLQ에 저장, 스케줄러로 재시도
```

## 실전 고려사항

- **Redis 장애 대비** — Redis 싱글 인스턴스 장애 = 이벤트 전체 정지. Replica + Sentinel/Cluster 필수. 혹은 단기 장애는 허용하고 이벤트 재오픈으로 복구
- **스로틀링** — 응답이 성공이라도 클라이언트 재시도 폭주 방지 차원에서 Rate Limit과 조합
- **대기열 방식 대안** — 정확성보다 **공정성**이 중요하면 Redis Sorted Set으로 입장 티켓을 발급해 순번 대로 처리(예: 트래픽 많은 티켓 예매 사이트)
- **정합성 모니터링** — "Redis 카운터 vs DB insert 수" 일치 여부를 주기 점검. 차이가 누적되면 유실·중복 의심
- **DB 스키마** — `(user_id, event_id)` UNIQUE 인덱스. Kafka 지연 상황에서도 중복 insert 차단

## 선택 가이드

| 규모·요구 | 추천 조합 |
|---|---|
| 수백 TPS, 단순 | DB Pessimistic Lock |
| 수천~수만 TPS | Redis INCR + DB 직접 insert |
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
- Redis가 원자성을 보장하는 이유(싱글 스레드·Lua)
- Pessimistic/Optimistic Lock과 Redis `INCR`의 트레이드오프
- Kafka 도입으로 얻는 이득과 비용(지연·멱등·DLQ)
- 선착순 vs 대기열 공정성의 설계 선택

## 출처
- [golf-dev — 선착순 쿠폰 서비스 데이터 정합성](https://golf-dev.tistory.com/76)
- [golf-dev — 선착순 쿠폰 서비스 부하 감소](https://golf-dev.tistory.com/77)

## 관련 문서
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
- [[Concurrency-vs-Parallelism|동시성 · 병렬성]]
