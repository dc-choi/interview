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

## 멀티스레드 런타임과의 차이

JavaScript는 한 스레드에서 한 번에 하나의 작업만 실행하고, 시작한 작업은 끝까지 실행된 뒤 다음 작업으로 넘어간다. 그래서 Node.js 메인 스레드의 경쟁은 `await`처럼 제어를 양보하는 지점 사이에서 생긴다(Worker와 공유 메모리를 쓰면 실제 data race도 생긴다). Java처럼 여러 스레드가 힙을 공유하는 런타임에서는 양보 지점이 없어도 명령 사이 어디서든 다른 스레드가 끼어들고, 멀티코어에서는 실제로 동시에 실행된다. `count++` 한 줄도 read, add, write 세 단계라 두 스레드가 같은 값을 읽으면 증가 하나가 사라진다([[Concurrency-and-Process-IPC|원자성, 동기화, IPC]]). 단일 값 갱신은 `AtomicInteger.incrementAndGet()` 같은 원자적 연산으로, 여러 필드에 걸친 불변식은 `synchronized`나 `Lock`으로 한 임계구역에 묶는다([[Java-Atomic-and-Concurrent-Collections|Java Atomic 연산과 동시성 컬렉션]]). 재현과 검증 방법은 [[Race-Condition-Patterns-Toolbox#경쟁 재현 실험|경쟁 재현 실험]]에 있다.

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

// ③ tryAcquire decorator (대기 없이 즉시 시도, 실패 시 E_ALREADY_LOCKED)
import { E_ALREADY_LOCKED, tryAcquire } from 'async-mutex';
try {
  await tryAcquire(mutex).runExclusive(async () => {
    /* critical section */
  });
} catch (e) {
  if (e !== E_ALREADY_LOCKED) throw e;
  /* 락 점유 중일 때의 응답 처리 */
}

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

## 출처

- [async-mutex repository, README](https://github.com/DirtyHairy/async-mutex/blob/master/README.md)
- [ECMAScript 2026 Language Specification, 9.5 Jobs and Host Operations to Enqueue Jobs](https://tc39.es/ecma262/2026/#sec-jobs)
- [Java SE 26 API, AtomicInteger](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
- [YouTube, 쉬운코드, 자바 스레드로 OS에서 배우는 Race condition을 재현하기](https://www.youtube.com/watch?v=mFBcfaPwPeQ)
