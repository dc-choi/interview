---
tags: [database, redis, atomic, concurrency]
status: done
category: "Data & Storage - Redis"
aliases: ["Redis Atomic Operations", "Redis 원자성"]
---

# Redis 원자적 연산

여러 클라이언트가 같은 key에 동시에 접근할 때 **"읽기 → 변경 → 쓰기"가 끊기지 않아야** 정합성 유지. Redis는 단일 스레드로 명령을 순차 처리하므로, **한 명령의 실행 중엔 다른 명령이 끼어들지 않는다**. 이 특성을 활용하는 4가지 도구.

## 문제: 멀티 스텝 연산의 race condition

카운터 증가를 각각 GET·ADD·SET으로 하면:
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
| `SETNX` | 없을 때만 설정 | O(1) |
| `GETSET` | 읽으며 동시에 쓰기 | O(1) |
| `HSETNX` | Hash에 없는 필드만 추가 | O(1) |
| `SADD` | Set 추가 | O(1) |

대부분의 카운터·락·큐 유스케이스가 이들로 해결됨. **가장 빠르고 권장**.

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

## 도구 4: Lua Script

여러 명령을 하나의 스크립트로 묶어 Redis에 넘김. **스크립트 실행 중 다른 명령 차단** → 완전한 원자성.

```
EVAL "
  local current = redis.call('GET', KEYS[1])
  if tonumber(current) >= tonumber(ARGV[1]) then
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

실무에서 **재고 차감·쿠폰 발급·분산 락 해제** 같은 "조건부 수정"에 많이 쓰임.

## 선택 우선순위

```
1. 단일 원자 명령으로 가능?  → 그걸 써라 (INCR·SETNX 등)
2. 여러 명령을 묶으면 되는데 조건 없음?  → MULTI/EXEC
3. 조건 검사 + 수정 (CAS)?  → WATCH + MULTI/EXEC 또는 Lua
4. 복잡한 로직 (여러 key · 조건 분기)?  → Lua Script
5. 분산 락·리더 선출 같은 고수준 동시성?  → Redlock·Redisson
```

## 분산 락은 최후의 수단

단일 카운터·재고 차감 같은 건 **`INCR`·`DECR`·`Lua`로 이미 원자적**. 분산 락(Redlock)은:
- 여러 key에 걸친 복잡한 트랜잭션
- Redis 외부 리소스까지 보호해야 할 때 (DB + Redis 양쪽)
- 짧지 않은 critical section

분산 락은 **성능 병목**·**교착 위험**·**장애 시 복잡성**을 동반. 가능하면 원자 명령이나 Lua로 먼저 시도.

## 재고 차감 예시 (세 방식 비교)

### 안티패턴 (race condition 있음)
```
stock = GET stock
if stock > 0:
  SET stock (stock - 1)
```

### 원자 명령 (권장)
```
# 단순 카운터
DECR stock              ← 음수 허용
# 음수 방지 필요하면
if DECR stock < 0:
  INCR stock  ← 롤백
```

### Lua Script (안전)
```
EVAL "
  local s = tonumber(redis.call('GET', KEYS[1]))
  if s > 0 then
    redis.call('DECR', KEYS[1])
    return 1
  else
    return 0
  end
" 1 stock
```

**Lua가 가장 깔끔**. 성공/실패 반환도 명확.

## Pipeline vs MULTI 차이

- **Pipeline**: 네트워크 왕복만 줄임. 원자성 없음. 순서 보장.
- **MULTI/EXEC**: 원자성 + 순서. Pipeline보다 약간 느림.

Pipeline은 "여러 명령을 빠르게 보내고 싶음"에, MULTI는 "중간에 끼어들면 안 됨"에.

## 흔한 실수

- **`GET → 조건 → SET` 패턴** → race condition. 항상 원자 명령 or Lua
- **Lua에서 외부 호출·무거운 루프** → 다른 모든 명령 블록 → Redis 성능 폭락
- **WATCH를 락으로 오해** → WATCH는 CAS지, 락이 아님. 경쟁 많으면 재시도 폭증
- **INCR을 float에 사용** → INCR은 정수. float는 INCRBYFLOAT

## 면접 체크포인트

- Redis가 원자성을 기본 제공하는 이유 (단일 스레드 명령 처리)
- INCR가 GET+ADD+SET 조합보다 안전한 이유
- MULTI/EXEC와 RDBMS 트랜잭션의 차이 (롤백 없음)
- WATCH의 CAS 패턴과 락의 차이
- Lua Script가 필요한 상황 (조건부 수정 원자화)
- "락을 쓰지 않을 수 있으면 쓰지 말라"는 원칙

## 출처
- [F-Lab — 대규모 처리 시 Redis 연산의 Atomic을 보장하기](https://f-lab.kr/blog/redis-command-for-atomic-operation)

## 관련 문서
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Distributed-Lock|분산 락]]
- [[Cache-Stampede|Cache Stampede (Lock 포함)]]
