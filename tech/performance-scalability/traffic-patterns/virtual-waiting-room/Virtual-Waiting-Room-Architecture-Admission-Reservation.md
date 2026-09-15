---
tags: [performance, scalability, waiting-room, redis, ticketing]
status: done
verified_at: 2026-08-25
category: "성능&확장성(Performance&Scalability)"
aliases: ["가상 대기열 입장 제어", "가상 대기열 예매 처리", "Waiting Room Admission Control"]
---

# 가상 대기열 입장 제어와 예매 처리

## 2. 입장 제어

Admission Controller는 일정 주기로 대기열 앞부분을 Active Token Store로 옮긴다. 한 번에 통과시킬 수는 대기자 수가 아니라 예매 시스템의 **검증된 지속 처리량**을 기준으로 정한다.

예매 시스템이 부하 테스트에서 초당 100건을 안정적으로 처리했다면 그대로 100건을 밀어 넣기보다 장애와 지연 변동을 흡수할 여유를 두고 더 낮은 입장률부터 시작한다. DB 지연, 오류율과 활성 사용자 수를 보며 동적으로 조절할 수 있다.

대기 제거와 활성 등록 사이에 사용자가 유실되거나 중복 입장하지 않도록 Lua 스크립트나 트랜잭션으로 상태 전이를 원자화한다.

```text
WAITING -> ADMITTED -> COMPLETED
                    -> EXPIRED
```

입장 토큰에는 TTL을 둔다. 정해진 시간 안에 예매를 시작하지 않으면 만료시켜 다음 사용자가 들어갈 용량을 돌려준다. TTL 값은 UX가 아니라 좌석 선택 시간, 백엔드 용량과 이탈률을 함께 측정해 정한다.

## 3. 예매 처리

입장한 사용자만 Reservation API에 접근하게 하고, 단일 좌석의 미선점 확인, 소유자 기록과 잔여 수량 차감을 하나의 원자 연산으로 묶는다.

```lua
-- KEYS: remaining, seat hold, hold-expirations (같은 eventId hash tag)
-- ARGV: reservationId, expiresAt, seatId
local remaining = tonumber(redis.call('GET', KEYS[1]) or '0')
local owner = redis.call('GET', KEYS[2])
if owner then
  return owner == ARGV[1] and 1 or 0
end
if remaining < 1 then
  return 0
end
redis.call('SET', KEYS[2], ARGV[1])
redis.call('ZADD', KEYS[3], ARGV[2], ARGV[3])
redis.call('DECR', KEYS[1])
return 1
```

위 Lua는 단일 좌석 선점의 의사 코드다. 같은 `reservationId`가 이미 선점한 좌석이면 수량을 다시 차감하지 않고 성공을 반환한다. `KEYS[2]`는 `{eventId}:seat:{seatId}`처럼 좌석별로 두고 세 키를 같은 Redis Cluster hash slot에 배치한다. Redis 안의 선점만 원자적이며 RDB 저장이나 MQ 발행까지 한 트랜잭션이 되지는 않는다.

RDB에 `reservationId` UNIQUE와 `eventId`/`seatId` 또는 요청 hash를 함께 저장해 `PENDING` 의도를 멱등 기록한다. 같은 키의 재요청은 저장된 payload와 일치할 때만 이어가며, 다른 좌석이나 이벤트면 Redis에 접근하기 전에 `409 Conflict`로 거부한다. 기존 상태가 `HELD` 또는 최종 상태면 Redis를 다시 선점하지 않고 그 결과를 반환한다. 새 `PENDING`은 Redis 선점 뒤 같은 RDB 트랜잭션에서 예약을 `PENDING -> HELD`로 바꾸고 좌석 정본 행도 `AVAILABLE -> HELD(reservationId)`로 조건부 전이한다. 다른 예약이 좌석을 차지해 좌석 CAS가 실패하면 `PENDING -> CANCELLED`와 outbox를 기록한다. DB timeout처럼 결과가 불명확하면 Redis를 해제하지 않고 같은 `reservationId`로 상태를 조회하거나 멱등 재시도해 결과를 먼저 확정하며, 요청 실패나 영향받은 행 0개만으로 Redis를 직접 해제하지 않는다. 확정은 예약이 `HELD AND expires_at > now`이고 좌석 소유자가 같은 `reservationId`일 때 좌석을 판매 완료로 바꾸며, 만료는 예약이 `HELD AND expires_at <= now`이고 좌석 소유자가 같을 때 좌석을 `AVAILABLE`로 돌린다. 두 전이는 상태 변경과 outbox를 같은 RDB 트랜잭션에 기록해 `CONFIRMED` 또는 `EXPIRED` 중 하나만 승리시킨다. outbox 소비자는 멱등하게 Redis projection을 반영한다. `CONFIRMED`면 만료 인덱스만 제거하고 수량은 돌려주지 않는다. `CANCELLED`와 `EXPIRED`는 같은 hash slot의 Lua에서 현재 소유자가 같은 `reservationId`인지 확인하고 좌석 키 삭제, 만료 인덱스 제거와 수량 복원을 한 원자 연산으로 실행하며, 소유자가 다르거나 키가 없으면 no-op한다. Redis 만료 인덱스는 만료 후보를 찾는 용도일 뿐 RDB 전이보다 먼저 재고를 복원하지 않는다. 복구 작업은 `PENDING`/`HELD`, Redis 카운터, RDB 예약과 outbox를 대사한다. 이 경계의 실패 경우는 [[First-Come-Coupon-Patterns#경계 실패 설계|선착순 패턴의 경계 실패 설계]]와 같다.

- 직접 저장은 단순하지만 요청 경로가 DB 지연을 그대로 받고, `HELD` 만료 해제와 재시도를 반드시 둔다.
- MQ를 거치면 쓰기 burst를 완화할 수 있지만 RDB outbox 발행, 멱등 소비, 실패 복구와 사용자에게 보여줄 중간 상태가 필요하다.
- RDB의 `reservationId` UNIQUE는 요청 멱등성을, 좌석 정본 행 CAS 또는 활성 예약의 `(eventId, seatId)` 유일성은 서로 다른 예약의 좌석 중복을 최종 방어한다.

결제처럼 실패 경우의 수와 외부 연동이 많은 단계는 가능한 경우 좌석 선점의 임계 경로와 분리한다. 먼저 제한된 좌석만 선점하면 이후 결제 시스템이 받아야 할 동시 요청 수도 줄어든다.

## 출처

- [수백만 동시 접속을 처리하는 선착순 예매 시스템 아키텍처 설계 — 코딩하는기술사](https://www.youtube.com/watch?v=c-ERjEodn_o)
- [Redis, Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)

## 관련 문서

- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처 폴더 인덱스]]
- [[Virtual-Waiting-Room-Architecture-Queue-Registration|문제 정의와 대기 등록]]
- [[Virtual-Waiting-Room-Architecture-Status-Communication-Operations|대기 상태 통신과 운영]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[Lock|DB Lock]]
- [[Capacity-Planning|캐퍼시티 플래닝]]
