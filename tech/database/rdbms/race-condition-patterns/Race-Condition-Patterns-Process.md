---
tags: [database, concurrency, race-condition, patterns]
status: done
category: "Data & Storage - RDB"
aliases: ["프로세스 내부 Race Condition", "async-mutex 패턴"]
---

# 층위 1: 프로세스 내부 (Node.js 등 Single-Thread)

Node.js는 **단일 스레드**지만 이벤트 루프가 비동기 작업을 교차 실행하면서 race 발생 가능.

## 시나리오
```
handler(req):
  stock = await DB.get(productId)    // ← 여기서 다른 요청 들어옴
  if stock > 0:
    await DB.set(productId, stock - 1)
```

두 요청이 거의 동시에 도착하면:
- 요청 A: stock=5 읽음 → (네트워크 대기) → 4로 쓰기
- 요청 B: stock=5 읽음 (A 쓰기 전) → 4로 쓰기 → 1개만 차감된 것처럼 보임

## 해결
**1. 원자적 DB 연산** (최우선):
```
DB.query("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0")
```
DB 자체 연산으로 race 제거. 가장 간단, 안전.

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

**3. 큐 + 이벤트**: Bull, BullMQ 같은 큐에 작업 넣고 순차 처리. 응답은 이벤트로. 처리량 제한의 대가로 순서 보장.
