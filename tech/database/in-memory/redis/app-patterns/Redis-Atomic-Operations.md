---
tags: [database, redis, atomic, concurrency]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Redis Atomic Operations", "Redis 원자성"]
---

# Redis 원자적 연산

여러 클라이언트가 같은 key에 동시에 접근할 때 **읽기 → 변경 → 쓰기가 끊기지 않아야** 정합성을 유지할 수 있다. 핵심은 네트워크 I/O 스레드 수가 아니라 Redis가 명령과 스크립트에 제공하는 실행 경계다. **한 명령이나 짧은 스크립트가 실행되는 동안 다른 명령이 끼어들지 않는다**. 이 특성을 활용하는 4가지 도구.

## 문제: 멀티 스텝 연산의 race condition

카운터 증가를 각각 GET, ADD, SET으로 하면:
```
Client A: GET counter (value=5)
Client B: GET counter (value=5)  ← A의 쓰기 전
Client A: SET counter 6
Client B: SET counter 6           ← 둘 다 5 기준으로 6 → 하나 잃음
```

원자적 수행이 필요한 이유.

## 도구 1: 원자적 단일 명령

Redis의 많은 명령이 **자체로 원자적**이다.

| 명령 | 효과 | 복잡도 |
|---|---|---|
| `INCR`, `INCRBY` | 정수 증가 | O(1) |
| `DECR`, `DECRBY` | 정수 감소 | O(1) |
| `SET key value NX` | 없을 때만 설정. `SETNX`를 대체 | O(1) |
| `SET key value XX` | 있을 때만 갱신. 실수로 새 키가 생기는 것을 막음 | O(1) |
| `SET key value GET` | 이전 값을 반환하며 새 값 설정. `GETSET`을 대체 | O(1) |
| `SET key new IFEQ old` | 현재 값이 `old`일 때만 교체 (Valkey 8.1+, Redis 8.4+) | O(1) |
| `DELIFEQ key value` (Valkey 9.0+), `DELEX key IFEQ value` (Redis 8.4+) | 값이 같을 때만 삭제. 토큰 락 해제용 | O(1) |
| `HSETNX` | Hash에 없는 필드만 추가 | O(1) |
| `SADD` | Set 추가 | O(1) |

대부분의 카운터, 락, 큐 유스케이스가 이들로 해결됨. **가장 빠르고 권장**.

`SET`의 조건과 만료 옵션은 한 명령 안에서 조합한다(`SET k v EX 60 NX`). 존재 확인과 설정을 두 명령으로 나누면 그 사이에 다른 요청이 끼어들기 때문에 옵션이 명령 안에 있다. `NX`와 `XX`는 함께 쓸 수 없고, `NX`와 `GET`의 조합은 7.0부터 허용된다. `GET`과 함께 쓰면 반환값 해석이 바뀐다(`NX`와 함께면 nil이 설정 성공, `XX`와 함께면 nil이 아닌 값이 설정 성공).

## 도구 2: MULTI / EXEC (트랜잭션)

여러 명령을 **한 덩어리**로 실행. 중간에 다른 클라의 명령이 끼어들지 않음.

```
MULTI
INCR counter
LPUSH queue "job1"
EXPIRE queue 3600
EXEC
```

특징:
- **원자성**: EXEC 시점에 큐에 쌓인 명령이 한꺼번에 실행
- **격리성**: 실행 중 다른 클라 명령 끼어들지 않음
- **롤백 없음**: 중간에 오류 나도 다른 명령은 계속 실행 (RDBMS 트랜잭션과 다름)
- **응답**: EXEC 시점에 모든 결과 배열로 반환
- **오류 시점에 따라 결과가 다름**: 없는 명령이나 잘못된 인자처럼 큐에 넣을 때 오류가 나면 EXEC가 `EXECABORT`로 트랜잭션 전체를 버린다. 큐에는 들어갔지만 실행 중 실패한 명령(다른 타입 키에 대한 연산 등)은 그 명령만 오류이고 나머지는 실행된다
- **DISCARD**: EXEC 전에 쌓인 큐를 실행하지 않고 버린다. 이미 실행된 명령을 되돌리는 기능은 아니다

## 도구 3: WATCH (낙관적 락)

MULTI로 묶기 전에 WATCH로 key를 감시. 해당 key가 **다른 클라에 의해 변경되면 EXEC가 실패**.

```
WATCH mykey
val = GET mykey
new = val + 1
MULTI
SET mykey new
EXEC    ← mykey가 변경됐으면 nil 반환, 재시도 필요
```

**CAS(Compare-And-Swap)** 패턴. 경쟁 적은 환경에서 락 없이 정합성 유지. 경쟁 많으면 재시도 오버헤드.

감시한 키가 서버의 만료나 eviction으로 사라져도 변경으로 간주되어 EXEC가 null을 반환하고, EXEC가 끝나면 성공 여부와 관계없이 모든 WATCH가 풀린다. MULTI 안에서는 읽은 값으로 분기할 수 없으므로 재시도 루프는 클라이언트가 직접 짜야 하고, 충돌이 잦은 키에서는 루프가 계속 돌아 애플리케이션 부담이 커진다. 그때는 Lua로 옮긴다.

## 도구 4: Lua Script

여러 명령과 조건 분기를 하나의 스크립트로 묶어 서버에서 실행한다. **스크립트 실행 중 다른 명령 차단** → 읽기, 비교, 쓰기 사이에 끼어들 틈이 없다. 복잡한 조건 로직과 여러 key의 관계 있는 갱신을 왕복 1회로 처리하는 대신, 길면 다른 명령을 모두 막는다. 재고 차감, 쿠폰 발급, 분산 락 해제 같은 조건부 수정에 쓴다.

예제, `KEYS`와 `ARGV` 계약, 실행 시간 제한과 `BUSY`, 스크립트 캐시(`EVALSHA`)와 Functions는 [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]로 나눴다.

## 선택 우선순위

```
1. 단일 원자 명령으로 가능?  → 그걸 써라 (INCR, SETNX 등)
2. 여러 명령을 묶으면 되는데 조건 없음?  → MULTI/EXEC
3. 조건 검사 + 수정 (CAS)?  → WATCH + MULTI/EXEC 또는 Lua
4. 복잡한 로직 (여러 key, 조건 분기)?  → Lua Script
5. 분산 락, 리더 선출 같은 고수준 동시성?  → 검증된 lock 구현 검토
```

## 분산 락은 최후의 수단

단일 카운터, 재고 차감 같은 건 **`INCR`, `DECR`, `Lua`로 이미 원자적**. 분산 락(Redlock)은:
- 여러 key에 걸친 복잡한 트랜잭션
- Redis 외부 리소스까지 보호해야 할 때 (DB + Redis 양쪽)
- 짧지 않은 critical section

분산 락은 **성능 병목**, **교착 위험**, **장애 시 복잡성**을 동반. 가능하면 원자 명령이나 Lua로 먼저 시도.

## 재고 차감 예시 (세 방식 비교)

### 안티패턴 (race condition 있음)
```
stock = GET stock
if stock > 0:
  SET stock (stock - 1)
```

### 단일 원자 명령 (중간 음수 허용 시)
```
# 단순 카운터
DECR stock              ← 음수 허용
```

`DECR` 뒤 별도 `INCR`로 되돌리면 두 명령 사이에 다른 요청이 끼어들 수 있다. 재고가 음수가 되면 안 되는 불변식은 아래처럼 조건 검사와 차감을 Lua로 묶는다.

### Lua Script (안전)
```
EVAL "
  local s = tonumber(redis.call('GET', KEYS[1]) or '0')
  if s > 0 then
    redis.call('DECR', KEYS[1])
    return 1
  else
    return 0
  end
" 1 stock
```

**Lua가 가장 깔끔**. 성공/실패 반환도 명확. 없는 키의 `GET`은 Lua에서 `false`라 기본값 없이 `tonumber`를 비교하면 런타임 오류가 난다.

## Pipeline vs MULTI 차이

- **Pipeline**: 네트워크 왕복만 줄임. 원자성 없음. 순서 보장.
- **MULTI/EXEC**: 원자성 + 순서. Pipeline보다 약간 느림.

Pipeline은 여러 명령의 네트워크 왕복을 줄일 때, MULTI는 실행 중 다른 명령이 끼어들면 안 될 때 사용한다.

## 흔한 실수

- **`GET → 조건 → SET` 패턴** → race condition. 원자 명령이나 Lua로 변경
- **Lua에서 외부 호출, 무거운 루프** → 다른 모든 명령 블록 → Redis 성능 폭락
- **WATCH를 락으로 오해** → WATCH는 CAS지, 락이 아님. 경쟁 많으면 재시도 폭증
- **INCR을 float에 사용** → INCR은 정수. float는 INCRBYFLOAT
- **동시성 버그를 단건 테스트와 요청 로그로 검증** → 모든 요청 로그가 정상 처리로 남아도 최종 값이 틀린다. 재고 50에 동시 구매 50건처럼 부하 순간을 재현하고(셸 스크립트나 TypeScript의 `Promise.all`) 최종 재고, 성공과 거절 건수를 검증한다. 강의 재현에서 GET 후 SET 방식은 실행할 때마다 재고가 48, 49처럼 다르게 남았다. 차감 경로뿐 아니라 반품 같은 증가 경로도 같은 방식으로 점검한다

## 면접 체크포인트

- Redis가 원자성을 기본 제공하는 이유 (단일 스레드 명령 처리)
- INCR가 GET+ADD+SET 조합보다 안전한 이유
- MULTI/EXEC와 RDBMS 트랜잭션의 차이 (롤백 없음, `EXECABORT`와 실행 중 오류의 차이)
- WATCH의 CAS 패턴과 락의 차이
- `SET` 옵션을 한 명령에 담는 이유 (확인과 설정 사이의 틈)
- Lua Script가 필요한 상황 (조건부 수정 원자화)
- 락보다 원자 명령과 조건부 갱신을 먼저 검토하는 원칙

## 출처
- [Redis Docs — Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Redis Docs — Transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)
- [Redis Docs — SET](https://redis.io/docs/latest/commands/set/)
- [Redis Docs — SETNX](https://redis.io/docs/latest/commands/setnx/)
- [Redis Docs — DELEX](https://redis.io/docs/latest/commands/delex/)
- [실습으로 배우는 선착순 이벤트 시스템, 문제점 해결하기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=329894&unitId=155153)
- [재고시스템으로 알아보는 동시성이슈 해결방법, Redis 라이브러리 알아보기 — 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=119710)
- [Valkey Docs — Transactions](https://valkey.io/topics/transactions/)
- [Valkey Docs — SET](https://valkey.io/commands/set/)
- [Valkey Docs — DELIFEQ](https://valkey.io/commands/delifeq/)
- [초당 1,000,000++ RPS를 처리하는 네이버 개발자의 Valkey, 캐시는 왜 필요할까?? 그리고 SET 명령어 옵션으로 다루는 TTL — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481441)
- [초당 1,000,000++ RPS를 처리하는 네이버 개발자의 Valkey, 데이터가 사라질 수 있는가?? 싱글 스레드의 원자적인 연산 손으로 확인하기 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481449)
- [초당 1,000,000++ RPS를 처리하는 네이버 개발자의 Valkey, MySQL에만 트랜잭션이 존재하나?? Valkey에서의 트랜잭션과 분산 락 실습하기 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481450)

## 관련 문서
- [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Distributed-Lock|분산 락]]
- [[Cache-Stampede|Cache Stampede (Lock 포함)]]
