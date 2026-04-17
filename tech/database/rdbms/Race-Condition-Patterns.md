---
tags: [database, concurrency, race-condition, patterns]
status: done
category: "Data & Storage - RDB"
aliases: ["Race Condition Patterns", "경쟁 조건 패턴"]
---

# Race Condition 패턴과 해결

**여러 주체가 공유 자원에 동시 접근할 때 실행 순서·타이밍에 따라 결과가 달라지는 현상**. 발생 지점·규모에 따라 해결 도구가 다름. 핵심 원칙: **"락이 마지막 수단. 먼저 원자 연산·낙관적 제어·이벤트 큐를 검토"**.

## 3가지 층위

| 층위 | 주체 | 해결 도구 |
|---|---|---|
| **단일 프로세스·스레드 내부** | 같은 프로세스 안 여러 async 흐름 | async-mutex·메모리 락 |
| **단일 DB에 여러 API 서버** | 다른 프로세스·다른 서버 | DB 락 (Pessimistic·Optimistic) |
| **분산 환경** (여러 서버 + 여러 리소스) | 마이크로서비스·여러 DB | 분산 락 (Redis Redlock·Zookeeper) |

문제의 층위를 잘못 잡으면 해결책이 비효율. 단일 서버인데 분산 락 쓰면 과함, 분산 환경에 메모리 락만 쓰면 무효.

## 층위 1: 프로세스 내부 (Node.js 등 Single-Thread)

Node.js는 **단일 스레드**지만 이벤트 루프가 비동기 작업을 교차 실행하면서 race 발생 가능.

### 시나리오
```
handler(req):
  stock = await DB.get(productId)    // ← 여기서 다른 요청 들어옴
  if stock > 0:
    await DB.set(productId, stock - 1)
```

두 요청이 거의 동시에 도착하면:
- 요청 A: stock=5 읽음 → (네트워크 대기) → 4로 쓰기
- 요청 B: stock=5 읽음 (A 쓰기 전) → 4로 쓰기 → 1개만 차감된 것처럼 보임

### 해결
**1. 원자적 DB 연산** (최우선):
```
DB.query("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0")
```
DB 자체 연산으로 race 제거. 가장 간단·안전.

**2. `async-mutex` 라이브러리** (단일 인스턴스 전용):

4가지 사용 패턴 — 상황에 맞게 선택:

```
// ① acquire + release (명시적 해제, finally 필수)
const release = await mutex.acquire();
try { /* critical section */ }
finally { release(); }

// ② runExclusive (콜백 자동 해제, 권장)
await mutex.runExclusive(async () => {
  /* critical section */
});

// ③ tryAcquire (대기 없이 즉시 시도, 실패 시 에러)
try {
  const release = await mutex.tryAcquire();
  /* ... */
} catch (e) { /* 락 점유 중 */ }

// ④ waitForUnlock (락 해제 대기만, 획득 X)
await mutex.waitForUnlock();
// 락이 풀린 것을 알고 나서 다른 전략 수행
```

부가 기능:
- **`Semaphore(N)`**: N개까지 동시 허용 (Mutex = Semaphore(1))
- **`withTimeout(mutex, ms, err)`**: 지정 시간 못 잡으면 에러
- **Priority**: 중요한 작업이 대기열 앞에
- **`cancel()`**: 대기 중인 모든 요청 취소 (E_CANCELED 에러)

실전 패턴:
- **Like/Unlike 연속 클릭**: 첫 요청 완료까지 두 번째 대기 (Mutex)
- **토큰 갱신**: 여러 API 동시 호출 중 한 곳에서 만료 감지 → 나머지 대기 → 갱신 후 재개
- **초당 N개 제한 외부 API**: Semaphore(N) + Rate Limit

**한계**: 앱 레벨 락이므로 **여러 서버로 확장하면 무효** → 분산 락 필요.

**3. 큐 + 이벤트**: Bull·BullMQ 같은 큐에 작업 넣고 순차 처리. 응답은 이벤트로. 처리량 제한의 대가로 순서 보장.

## 층위 2: 단일 DB + 여러 서버

API 서버가 3대, 같은 DB를 씀. 각자 트랜잭션을 열어도 Isolation Level에 따라 race 발생.

### 시나리오: 같은 시간대 예약
```
User A: SELECT ... WHERE time = 10AM → 빈 자리
User B: SELECT ... WHERE time = 10AM → 빈 자리 (A 아직 INSERT 안 함)
User A: INSERT reservation
User B: INSERT reservation → 이중 예약
```

Read Committed·Repeatable Read로도 막지 못함 — **Phantom Read**.

### 해결
**1. Pessimistic Lock** (`SELECT ... FOR UPDATE`):
```
BEGIN;
SELECT * FROM reservations WHERE time = 10AM FOR UPDATE;
INSERT ...;
COMMIT;
```
대기 시간 발생, 하지만 확실.

**2. Unique Constraint**:
```
CREATE UNIQUE INDEX ON reservations(time, resource_id);
```
DB가 중복을 거부. 애플리케이션은 예외 핸들링.

**3. Optimistic Lock (version 컬럼)**:
```
UPDATE products SET stock = ?, version = version + 1
WHERE id = ? AND version = ?
```
version 불일치면 rowsAffected=0 → 재시도. 경쟁 적을 때 효율적.

**4. Gap Lock·Next-Key Lock** (MySQL InnoDB):
범위 조건 조회 시 빈 공간까지 잠금. Phantom 방지. ([[MySQL-Gap-Lock]] 참고)

## 층위 3: 분산 환경

여러 서버 + 여러 DB + Redis·메시지큐. 트랜잭션이 한 경계를 넘는 경우.

### 시나리오
- Redis에 재고 캐시, DB에 영속 상태 → 둘을 동기화하는 지점
- 서비스 A가 B를 호출하는 중간에 B의 상태 변경
- 여러 마이크로서비스가 같은 엔티티 수정

### 해결
**1. 분산 락 (Redis Redlock·Redisson)**:
- `SETNX lock-key value EX 30` (30초 만료)
- critical section 수행
- `DEL lock-key` (fencing token으로 안전 해제)

주의:
- **TTL보다 오래 걸리는 작업이면 위험** — TTL 만료 후 다른 서버가 락 획득
- **fencing token** 없으면 "TTL 만료한 줄 모르고 쓰기" 발생
- **RedLock 자체의 안전성 논쟁** (Martin Kleppmann 비판) — 진짜 강한 보장이 필요하면 ZooKeeper·etcd

**2. Saga + Compensating Transaction**:
분산 트랜잭션 대신 각 단계가 성공·실패 이벤트 발행, 실패 시 보상 동작. [[External-API-Integration-Patterns]] 참고.

**3. 이벤트 소싱 + 단일 Writer**:
특정 엔티티는 **한 서비스만 쓰기**, 다른 서비스는 이벤트 구독. race 자체를 설계로 제거.

**4. 상태 키 + 분산 락 (실전 조합)**:
우아한형제들 WMS 사례처럼 **상태 key로 유효 전이만 허용** + 분산 락으로 전이 순간 보호 → 병렬성과 정합성 양립.

## 안티패턴 실제 사례 (카카오 메시징 사고)

**상황**: 메시지 전송 후 리포트 생성. 리포트 생성이 메시지 상태와 race → 일부 리포트 누락.

**안티패턴**:
- 이벤트 발행 + 상태 업데이트를 **별개 트랜잭션**
- 이벤트 수신 측이 상태를 역조회해 처리

**수정**:
- **Transactional Outbox** 패턴: 메시지 상태 업데이트 + 이벤트 발행을 한 트랜잭션
- Outbox 테이블에서 이벤트를 별도 워커가 읽어 발행
- 상태와 이벤트의 정합성 자동 보장

상세: [[Transactional-Outbox]]

## 도구 선택 플로차트

```
동시성 문제 발견
  ↓
이 작업이 DB UPDATE 한 줄로 원자화 가능?
  ├─ YES → UPDATE ... WHERE condition 활용 (끝)
  └─ NO
      ↓
    한 프로세스 안의 async?
      ├─ YES → async-mutex 또는 큐
      └─ NO (여러 서버)
          ↓
        같은 DB에서 처리?
          ├─ YES → DB 락 (Pessimistic·Optimistic·Unique Index)
          └─ NO (여러 리소스)
              ↓
            분산 락 + Saga + 상태 키 조합
```

## 흔한 실수

- **모든 문제에 분산 락** → 불필요한 성능 저하·복잡도
- **낙관적 락만 쓰고 경쟁 심한 리소스** → 재시도 폭증
- **DB 락 TTL 없음** → 커넥션 풀 고갈 위험
- **Redlock TTL 만료 감지 안 함** → 이중 작업 수행
- **단일 스레드 Node.js니까 race 없다고 착각** → 이벤트 루프 interleaving으로 충분히 발생

## 면접 체크포인트

- 3가지 층위(프로세스·DB·분산)의 구분과 적합한 도구
- 원자적 DB 연산이 왜 첫 번째 선택지인가
- Pessimistic vs Optimistic Lock 트레이드오프
- Redlock의 한계 (TTL·fencing token)
- Transactional Outbox가 해결하는 race condition
- async-mutex `runExclusive` vs `acquire/release` 선택 기준
- Semaphore(N)가 Mutex와 다른 쓰임새 (동시 허용 개수 제어)

## OS 수준 동기화 (정의 정리)

분산/앱 레벨 도구를 이해하려면 **OS 수준 개념**이 기초. 세 가지 전형적 동시성 문제와 해결 도구:

### 3대 동시성 문제
- **Mutual Exclusion (상호 배제)**: 공유 자원에 동시 접근 막기 — 해결 필요
- **Deadlock (교착)**: 여러 프로세스가 서로의 자원을 기다리며 무한 대기
- **Starvation (기아)**: 특정 프로세스가 영원히 자원 못 받음

### Mutex (뮤텍스)
- 공유 자원에 **한 스레드만** 접근 허용
- **locking ↔ unlocking** 원자적 연산
- 소유자만 해제 가능 (ownership)

### Semaphore (세마포어)
- **카운터**로 자원 상태 관리
- N개 스레드까지 **동시 접근** 허용 (N = 자원 수)
- 소유 개념 없음 (누구나 해제 가능)
- Mutex는 **Binary Semaphore (N=1)** 의 특수 케이스로 볼 수 있지만, 엄밀히는 ownership 여부로 구분

### 스핀락 (Spinlock)
- 락 획득 실패 시 **busy waiting** (루프 돌며 재시도)
- 컨텍스트 스위치 비용 < 락 예상 보유 시간일 때 유용 (짧은 critical section)
- OS 커널·저수준 동시성 제어에서 사용

### 비교표

| 도구 | 허용 스레드 | Ownership | 대기 방식 | 적합 상황 |
|---|---|---|---|---|
| Mutex | 1 | O | block | 일반 critical section |
| Semaphore(N) | N | X | block | 리소스 풀·연결 수 제한 |
| Binary Semaphore | 1 | X | block | 신호 (이벤트) |
| Spinlock | 1 | O/X | busy loop | 매우 짧은 구간·커널 |

앱 레벨 라이브러리(async-mutex·Redisson·분산락)는 이 OS 개념을 **애플리케이션 추상화 레벨**로 끌어올린 것. 근본 원리는 동일.

## 출처
- [nodejsdesignpatterns — Node.js Race Conditions](https://www.nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [iredays — Race Condition과 예방 방법 (Mutex·Semaphore)](https://iredays.tistory.com/125)
- [varunkukade (Medium) — JavaScript: Synchronize async calls with async-mutex](https://medium.com/@varunkukade999/javascript-synchronize-async-calls-with-async-mutex-0cd1f8d2562c)
- [GitHub — DirtyHairy/async-mutex](https://github.com/DirtyHairy/async-mutex)
- [velog @imkkuk — Redis로 동시성 문제 해결하기](https://velog.io/@imkkuk/Redis%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1-%EB%AC%B8%EC%A0%9C-%ED%95%B4%EA%B2%B0%ED%95%98%EA%B8%B0)
- [towardsdev — Mutex Implementation in NestJS](https://towardsdev.com/mutex-implementation-in-nestjs-905ae890586a)
- [tech.kakao — 잃어버린 리포트를 찾아서 (경쟁 조건·안티 패턴)](https://tech.kakao.com/posts/810)
- [4sii — Redis 분산 락](https://4sii.tistory.com/456)

## 관련 문서
- [[Lock|DB Lock (Shared·Exclusive·Gap·Next-Key)]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Distributed-Lock|분산 락 (Redlock·fencing token)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산]]
- [[Isolation-Level|Isolation Level]]
- [[Transactional-Outbox|Transactional Outbox]]
