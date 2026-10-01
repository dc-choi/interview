---
tags: [database, redis, valkey, lua, scripting, atomic, concurrency]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Redis Lua Script", "Valkey Lua", "EVALSHA", "Redis Functions", "Lua 스크립트"]
---

# Redis Lua 스크립트와 Functions

Lua 스크립트는 읽기, 비교, 쓰기처럼 여러 명령과 조건 분기를 서버 안에서 한 번에 실행하는 수단이다. 단일 원자 명령으로 표현할 수 없고 `WATCH` 재시도가 잦은 키에서 쓴다. 도구 선택 순서는 [[Redis-Atomic-Operations|Redis 원자적 연산]]이 다루고, 이 문서는 스크립트의 실행 경계, 인자와 반환값 계약, 실행 시간 제한, 스크립트 캐시와 Functions를 다룬다.

## 실행 경계

여러 명령을 하나의 스크립트로 묶어 Redis에 넘김. **스크립트 실행 중 다른 명령 차단** → 하나의 실행 경계로 처리.

```
EVAL "
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  if current >= tonumber(ARGV[1]) then
    redis.call('DECRBY', KEYS[1], ARGV[1])
    return 1
  else
    return 0
  end
" 1 stock 10
```

장점:
- **복잡한 조건 로직**까지 원자적으로
- 여러 key 간 관계 있는 업데이트
- 네트워크 왕복 1회로 끝

단점:
- 스크립트 내부 버그는 Redis 디버깅 어려움
- **실행 시간 주의** — 길면 다른 명령 모두 블록

실무에서 **재고 차감, 쿠폰 발급, 분산 락 해제** 같은 조건부 수정에 많이 쓰임. 스크립트 하나가 명령 하나처럼 취급되므로 RDB처럼 무거운 트랜잭션 없이 확인과 차감 사이의 틈을 닫는다. 대신 롤백은 없으므로 쓰기 전에 조건과 입력을 먼저 검사한다.

## 인자와 반환값 계약

- `EVAL <script> <numkeys> <key...> <arg...>`에서 `numkeys` 뒤의 키는 `KEYS`, 나머지는 `ARGV` 배열로 들어간다. 스크립트가 접근하는 키 이름은 모두 `KEYS`로 넘기고 스크립트 안에서 조립하지 않는다. 그래야 standalone과 cluster 모두에서 올바르게 실행되고, cluster에서는 모든 키가 같은 slot이어야 한다
- 없는 키의 `GET`은 Lua에서 `false`가 되고 `ARGV`는 문자열이다. 비교 전에 양쪽을 `tonumber`로 바꾸고 기본값을 둔다. 그렇지 않으면 `attempt to compare number with nil`이나 `attempt to compare string with number` 런타임 오류로 끝난다(Valkey 9.1.2에서 재현)
- 반환값을 계약으로 정한다. 아래 재고 차감은 0 이상이면 차감 후 남은 수량, -1이면 재고 부족이고 재고를 건드리지 않는다. 애플리케이션은 이 값으로 성공과 품절을 나눈다

```lua
-- KEYS[1] = 재고 키, ARGV[1] = 차감 수량
local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
local qty = tonumber(ARGV[1])
if stock < qty then
  return -1
end
return redis.call('DECRBY', KEYS[1], qty)
```

재고 10에서 3, 5, 5를 차례로 요청하면 7, 2를 반환한 뒤 -1을 반환하고 재고는 2로 남는다. 동시 요청 수십 건을 한꺼번에 보내도(TypeScript라면 `Promise.all`) 성공 건수가 재고를 넘지 않는지로 검증한다.

## 실행 시간 제한과 BUSY

- 스크립트가 실행되는 동안 서버는 다른 명령을 처리하지 않는다. `busy-reply-threshold`(옛 이름 `lua-time-limit`, 기본 5초)를 넘기면 다른 클라이언트의 명령을 다시 받기 시작하지만 일반 명령에는 `BUSY` 오류로 답한다
- 이때 허용되는 것은 `SCRIPT KILL`, `FUNCTION KILL`, `SHUTDOWN NOSAVE` 등이다. 읽기만 한 스크립트는 `SCRIPT KILL`로 멈출 수 있지만, 한 번이라도 쓰기를 했으면 원자성을 지키려고 `SHUTDOWN NOSAVE`만 남는다
- Valkey 9.1.2에서 무한 루프 스크립트를 돌리자 다른 연결의 `PING`이 5초 경계까지 응답하지 못하다가 이후 `BUSY Valkey is busy running a script. You can only call SCRIPT KILL or SHUTDOWN NOSAVE.`를 받았고, 쓰기가 없던 스크립트는 `SCRIPT KILL`로 멈췄다. 이 `BUSY`는 장시간 스크립트와 함수에 대한 동작이며 `KEYS` 같은 느린 일반 명령은 오류 없이 뒤 요청을 붙잡는다 ([[Operations|운영 팁]])
- 그래서 스크립트는 조건 확인과 명령 몇 개로 짧게 유지하고 큰 컬렉션 순회나 외부 대기를 넣지 않는다

## 스크립트 캐시와 EVALSHA

- 매번 본문을 보내는 대신 `SCRIPT LOAD`로 올려 받은 SHA1 digest로 `EVALSHA`를 호출하면 전송량이 준다
- 스크립트 캐시는 항상 휘발성이다. 데이터베이스의 일부로 저장되지 않아 재시작, replica가 primary로 승격되는 failover, `SCRIPT FLUSH` 때 비워질 수 있다. 캐시에 없으면 `NOSCRIPT` 오류가 나므로 클라이언트가 `EVAL`로 되돌아가야 한다
- ioredis와 iovalkey의 `defineCommand`는 가능한 한 `EVALSHA`를 쓰고 이 전환을 대신 처리한다. 직접 `evalsha`를 부르는 코드는 `NOSCRIPT` 폴백을 테스트한다

## Functions

Redis 7.0부터 제공되고 Valkey도 이어받은 Functions는 `FUNCTION LOAD`로 등록하고 `FCALL`로 호출한다. 함수는 데이터베이스의 산출물로 AOF에 기록되고 replica로 복제되므로 애플리케이션이 스크립트를 다시 올릴 책임이 사라진다. 대신 cluster에서는 모든 primary에 함수를 적재해야 한다.

## Valkey에서 달라진 점

- Valkey의 Lua 전역 객체는 첫 GA인 7.2.5부터 `server`이고 `redis`는 호환 별칭으로 유지된다. 새 스크립트에는 `server`가 권장되지만 Redis와 Valkey에서 같은 스크립트를 쓰려면 `redis.call`이 공통 분모다
- 토큰을 비교해 락을 지우는 스크립트는 Valkey 9.0+의 `DELIFEQ key token` 한 명령으로 대체된다. Redis는 8.4부터 `DELEX key IFEQ token`이 같은 일을 한다 ([[Distributed-Lock|분산 락]])
- 값이 기대와 같을 때만 바꾸는 조건부 교체는 Valkey 8.1+와 Redis 8.4+의 `SET key new IFEQ old`로 스크립트 없이 처리한다

## 흔한 실수

- **키 이름을 `ARGV`로 넘기거나 스크립트 안에서 조립** → cluster의 slot 검사와 라우팅이 깨진다
- **`EVALSHA`만 쓰고 `NOSCRIPT` 폴백이 없음** → 재시작이나 failover 뒤 해당 호출이 모두 실패한다
- **없는 키와 문자열 인자를 그대로 비교** → 부하가 몰린 순간 런타임 오류로 주문이 실패한다
- **쓰기 뒤에 오래 도는 루프** → `SCRIPT KILL`도 못 쓰고 `SHUTDOWN NOSAVE`만 남는다

## 면접 체크포인트

- 스크립트가 원자적인 이유와 그 대가 (실행 중 서버 전체 대기)
- `busy-reply-threshold` 이후 `BUSY`, `SCRIPT KILL`과 `SHUTDOWN NOSAVE`의 차이
- `EVALSHA` 스크립트 캐시가 휘발성인 이유와 폴백, Functions와의 차이
- Valkey의 `server`와 `redis` API 이름, `DELIFEQ`와 `IFEQ`로 줄어드는 스크립트

## 출처

- [Valkey Documentation, Scripting with Lua](https://valkey.io/topics/eval-intro/)
- [Valkey Documentation, Lua API reference](https://valkey.io/topics/lua-api/)
- [Valkey Documentation, Programmability](https://valkey.io/topics/programmability/)
- [Valkey Documentation, Functions](https://valkey.io/topics/functions-intro/)
- [Valkey Documentation, DELIFEQ](https://valkey.io/commands/delifeq/)
- [Valkey Documentation, SET](https://valkey.io/commands/set/)
- [Redis Documentation, Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Redis Documentation, DELEX](https://redis.io/docs/latest/commands/delex/)
- [Redis Documentation, SET](https://redis.io/docs/latest/commands/set/)
- [ioredis README, Lua Scripting — redis/ioredis](https://github.com/redis/ioredis#lua-scripting)
- [인프런, Hong, 간단한 Valkey 설치부터 단일 스레드의 특징 직접 손으로 확인하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481440)
- [인프런, Hong, 다중 명령에 대한 원자성을 보장하는 Lua Script 그리고 Lock은 완전 무결할까?](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481451)
- [인프런, Hong, 우리가 앞서 배웠던 기능들에 대한 프로그래밍 정적 구현하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481455)

## 관련 문서

- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Distributed-Lock|분산 락]]
- [[Operations|운영 팁 (싱글 스레드 주의사항)]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로]]
