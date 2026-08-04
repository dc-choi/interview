---
tags: [java, concurrency, memory-model, thread, synchronization]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Concurrency Primitives", "자바 동시성 프리미티브"]
---

# Java 동시성 프리미티브

스레드 안전성은 CPU 캐시를 직접 통제하는 문제가 아니라, 공유 상태에 올바른 **happens-before 관계**를 만드는 문제다. 먼저 `java.util.concurrent`의 검증된 도구를 선택하고, 저수준 `wait`, CAS와 스핀은 동작 원리를 이해할 때 사용한다.

## Java Memory Model

여러 스레드가 같은 변수에 접근하고 하나 이상이 쓰는데 동기화 순서가 없다면 data race다. 컴파일러, JIT와 CPU는 단일 스레드 의미를 유지하는 범위에서 연산을 재배치할 수 있으므로, 소스 코드 순서만으로 다른 스레드의 관찰 결과를 추론하면 안 된다.

대표적인 happens-before 경계는 다음과 같다.

- 같은 모니터의 unlock은 이후 lock보다 먼저 보인다.
- `volatile` 필드 쓰기는 이후 그 필드 읽기보다 먼저 보인다.
- `Thread.start()` 이전 작업은 시작된 스레드의 작업보다 먼저 보인다.
- 스레드 종료는 성공한 `join()` 이후 작업보다 먼저 보인다.
- 작업 제출 이전 작업, 작업 실행, `Future.get()` 이후 작업 사이에도 순서가 성립한다.

### `volatile`의 정확한 범위

`volatile`은 해당 필드의 읽기와 쓰기에 가시성과 순서 규칙을 제공한다. 메인 메모리를 매번 직접 읽어 CPU 캐시를 우회한다는 구현 설명은 정확하지 않다. 또한 `count++`처럼 읽기, 계산, 쓰기로 구성된 복합 연산을 원자적으로 만들지 않는다.

```java
private volatile boolean stopping; // 정지 신호에는 적합
private final AtomicInteger count = new AtomicInteger();

void increment() {
    count.incrementAndGet();        // 복합 증가에는 atomic 연산 사용
}
```

`Thread.sleep()`과 `Thread.yield()`에는 동기화 의미가 없다. 잠들었다 깨어났으니 최신 값이 보일 것이라고 기대하지 않는다.

## 조건 대기와 Guarded Suspension

조건이 아직 성립하지 않았으면 모니터를 놓고 기다리고, 상태를 바꾼 쪽이 깨운다. `wait()`는 구현상 임의로 깨어날 수 있고 알림을 받은 뒤에도 다른 스레드가 조건을 먼저 소비할 수 있으므로 반드시 `while`로 조건을 다시 검사한다.

```java
final class JobBuffer {
    private final Queue<Runnable> jobs = new ArrayDeque<>();

    synchronized void put(Runnable job) {
        jobs.add(job);
        notifyAll();
    }

    synchronized Runnable take() throws InterruptedException {
        while (jobs.isEmpty()) {
            wait();
        }
        return jobs.remove();
    }
}
```

직접 모니터를 구현하기보다 생산자, 소비자에는 `BlockingQueue`, 여러 조건이 필요하면 `Lock`과 `Condition`을 우선한다. 반대로 Balking은 조건이 맞을 때까지 기다리지 않고 현재 요청을 거절하거나 건너뛰는 선택이다.

## 협력적 취소와 종료

`Thread.interrupt()`는 강제 종료가 아니라 취소 요청이다. `wait`, `sleep`, `join`이나 `BlockingQueue.take()` 같은 중단 가능한 대기는 `InterruptedException`으로 반응하고 interrupt 상태를 지운다. 현재 계층에서 취소를 끝내지 않는다면 상태를 복원해 상위 계층에 전달한다.

```java
public void run() {
    try {
        while (!Thread.currentThread().isInterrupted()) {
            process(queue.take());
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    } finally {
        closeResources();
    }
}
```

안전한 서비스 종료 순서는 새 작업 거절, 대기열과 실행 중 작업의 제한 시간 내 완료, 남은 작업 취소 요청, 자원 정리다. `shutdownNow()`도 보통 interrupt로 시도할 뿐 작업 종료를 보장하지 않으므로, 작업 코드가 interrupt에 응답해야 한다.

## 작업, 워커와 결과 분리

작업마다 플랫폼 스레드를 직접 만드는 대신 제출과 실행 정책을 분리한다.

- `ExecutorService`: 작업 수명, 큐와 워커를 관리한다.
- `Future`: 완료 확인, 결과 대기와 취소를 표현한다.
- `BlockingQueue`: 비었을 때 소비자를, bounded queue가 찼을 때 생산자를 대기시키거나 거절한다.
- virtual thread per task: 블로킹 I/O 작업을 스레드 단위로 표현하되 CPU 병렬성이나 외부 자원 한도를 늘려주지는 않는다.

```java
var pool = new ThreadPoolExecutor(
    8, 8, 0L, TimeUnit.MILLISECONDS,
    new ArrayBlockingQueue<>(1_000),
    new ThreadPoolExecutor.AbortPolicy()
);
Future<Result> future = pool.submit(this::calculate);
```

큐 용량과 거절 정책은 과부하 계약이다. 무제한 큐는 순간 부하를 지연과 메모리 사용으로 숨긴다. `Future.get()`은 필요할 때만 기다리고, timeout과 취소 정책을 함께 둔다.

## 공유 상태 도구 선택

| 문제 | 우선 도구 | 주의점 |
|---|---|---|
| 단일 카운터, 참조 갱신 | `AtomicInteger`, `AtomicReference` | 여러 필드의 불변식까지 자동 보호하지 않음 |
| 읽기 우세 공유 자료구조 | `ReentrantReadWriteLock` | 임계 구역 비용이 작으면 일반 lock보다 느릴 수 있음 |
| 스레드별 요청 문맥 | `ThreadLocal` | 풀 스레드는 재사용되므로 `finally`에서 `remove()` |
| 생산자, 소비자 | bounded `BlockingQueue` | 종료 신호와 거절, timeout 정책 필요 |
| 여러 공유 필드의 불변식 | `synchronized`, `Lock` | lock 순서 통일, 임계 구역 최소화 |

읽기 lock을 쓰기 lock으로 바로 승격하려 하지 않는다. 읽기 lock을 놓고 쓰기 lock을 얻은 뒤 조건을 다시 확인한다. 쓰기에서 읽기로 내리는 downgrade는 읽기 lock을 먼저 얻고 쓰기 lock을 놓는 순서로 가능하다.

```java
requestContext.set(context);
try {
    handle();
} finally {
    requestContext.remove();
}
```

## 스핀, Lock-Free와 Wait-Free

- **스핀**은 잠금 획득을 반복 확인하며 CPU를 소비한다. 대기 시간이 극히 짧다는 측정 근거가 없으면 일반 애플리케이션에서 피한다.
- **Lock-Free**는 전체 시스템에서 적어도 한 작업이 계속 진전하는 알고리즘 수준의 보장이다. CAS 한 번을 썼다고 전체 알고리즘이 lock-free가 되지는 않는다.
- **Wait-Free**는 각 작업이 유한 단계 안에 끝나는 더 강한 보장이다.
- Java atomic 클래스는 단일 변수의 atomic 갱신과 volatile 계열 메모리 효과를 제공한다. 여러 변수의 정합성, ABA와 재시도 기아는 별도로 설계해야 한다.

스핀락은 lock API를 호출하지 않더라도 상호 배제를 위한 busy-wait 잠금이므로 lock-free 알고리즘으로 분류하지 않는다.

## Java에서 Node.js, NestJS로 옮겨 보기

| Java 개념 | Node.js, NestJS 대응 | 중요한 차이 |
|---|---|---|
| `ThreadLocal` | `AsyncLocalStorage`, NestJS ALS recipe | 스레드가 아니라 비동기 호출 체인에 문맥을 묶음 |
| interrupt | `AbortSignal` | signal을 지원하거나 직접 확인하는 작업만 협력적으로 중단 |
| `ExecutorService` | Worker Threads pool | CPU 집약 JS에 사용, I/O는 기본 비동기 API가 보통 효율적 |
| `Future` | `Promise` | Promise 생성이 별도 스레드 실행을 뜻하지 않음 |
| `wait/notifyAll` | Promise, 이벤트, `Atomics.wait/notify` | Atomics 대기는 Worker와 공유 메모리 조정에 사용 |
| bounded queue | Stream backpressure, 제한된 작업 큐 | 동시성 제한만으로 backlog 무한 증가가 막히지는 않음 |

NestJS 요청 문맥은 `AsyncLocalStorage.run()`으로 요청 수명 전체를 감싸고, 저장소를 거대한 암시적 객체로 만들지 않는다. Worker 풀에서 작업과 진단 문맥을 잇는 경우 Node 공식 문서는 `AsyncResource` 사용을 권장한다.

## 운영 체크포인트

- 공유 필드마다 가시성, 원자성, 복합 불변식 중 무엇이 필요한지 구분했는가
- 모든 대기와 외부 호출에 종료 신호나 timeout 경로가 있는가
- 큐 깊이, 거절 수, 실행 시간과 취소 실패를 관측하는가
- lock 획득 순서가 일정하고 lock 내부에서 I/O를 하지 않는가
- `ThreadLocal`과 비동기 문맥이 요청 종료 후 남지 않는가

## 출처

- [Java Language Specification 17, Threads and Locks, Oracle](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html)
- [Thread, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.html)
- [Object wait/notify, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [java.util.concurrent, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/package-summary.html)
- [ExecutorService, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [BlockingQueue, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/BlockingQueue.html)
- [ThreadLocal, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/ThreadLocal.html)
- [java.util.concurrent.atomic, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)
- [AsyncLocalStorage — Node.js API](https://nodejs.org/api/async_context.html)
- [Worker Threads — Node.js API](https://nodejs.org/api/worker_threads.html)
- [AbortController — Node.js API](https://nodejs.org/api/globals.html#class-abortcontroller)
- [Async Local Storage — NestJS](https://docs.nestjs.com/recipes/async-local-storage)
- [Thread 우아하게 종료하기 — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178838)
- [Guarded Suspension — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178840)
- [Balking — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178841)
- [Worker Thread — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178854)
- [Thread-Specific Storage — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178856)
- [Dead Lock — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178857)
- [Spin Lock — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178858)
- [Lock Free — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178862)

## 관련 문서

- [[java-concurrency/Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Concurrency-and-Process-IPC|동시성과 프로세스 IPC]]
- [[Backpressure|Backpressure]]
- [[Worker-Threads-Core|Worker Threads 핵심]]
- [[Injection-Scopes|NestJS Injection Scopes]]
