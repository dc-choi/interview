---
tags: [java, executor, future, thread-pool, virtual-thread]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Executors Futures and Thread Pools", "자바 Executor Future 스레드 풀"]
---

# Java Executor, Future와 thread pool

`ExecutorService`는 무엇을 실행할지와 어디서, 언제, 몇 개까지 실행할지를 분리한다. 직접 thread를 만들 때 생기는 생성 비용, 결과 전달, 예외, 종료와 overload 제어를 하나의 lifecycle로 묶는다.

## Task, result와 memory boundary

- `Runnable`: 반환 값이 없고 `run()` signature에서 checked exception을 던질 수 없다.
- `Callable<V>`: 결과를 반환하고 checked exception을 전달할 수 있다.
- `Future<V>`: 완료, blocking result retrieval, cancellation과 실패 전달을 나타낸다.

`submit()`은 accepted task의 완료를 기다리지 않고 `Future`를 반환하는 것이 기본이지만, rejection policy가 `CallerRunsPolicy`라면 호출 thread가 task를 직접 실행해 반환이 늦어질 수 있다. `get()`은 완료될 때까지 호출 thread를 block하고, task 실패는 `ExecutionException`으로 감싼다. timed `get()`에는 `TimeoutException`, 취소된 task에는 `CancellationException`이 발생한다.

Task 제출 이전의 작업은 task 본문보다 먼저 보이고, task 본문은 성공적인 `Future.get()` 이후보다 먼저 보인다. 이 memory-consistency boundary 덕분에 별도 `volatile` 없이도 올바르게 publish된 입력과 결과를 전달할 수 있다.

`cancel(true)`는 실행 중인 worker에 interrupt를 요청할 수 있을 뿐 종료를 보장하지 않는다. Task가 interruptible wait를 사용하거나 status를 검사하고, 자원 정리를 `finally`에 두어야 취소가 실제로 완료된다.

## Bulk operation

- `invokeAll`: 모든 task가 끝난 뒤 입력 순서의 `Future` list를 반환한다. timed variant는 미완료 task를 취소한다.
- `invokeAny`: 정상 완료한 결과 하나를 반환하고 나머지를 취소한다. 모든 task가 실패하면 `ExecutionException`이 발생한다.

독립적인 작업을 먼저 모두 제출한 뒤 결과를 모아야 parallelism이 생긴다. 제출 직후 하나씩 `get()`하면 의도치 않게 직렬화될 수 있다.

## `ThreadPoolExecutor` admission 순서

1. 실행 thread가 `corePoolSize`보다 적으면 새 worker를 만든다.
2. 아니면 queue에 넣는다.
3. Queue가 가득 차고 worker가 `maximumPoolSize`보다 적으면 새 worker를 만든다.
4. 둘 다 불가능하면 `RejectedExecutionHandler`를 호출한다.

따라서 queue가 unbounded이면 보통 `maximumPoolSize`까지 늘어나는 경로에 도달하지 않는다. `Executors.newFixedThreadPool`은 shared unbounded queue를 사용해 memory와 latency가 누적될 수 있고, `newCachedThreadPool`은 `SynchronousQueue`와 사실상 매우 큰 maximum으로 요청 폭증 때 thread가 과도하게 늘 수 있다.

운영 service는 측정한 concurrency 한도, bounded queue와 명시적 rejection policy를 가진 `ThreadPoolExecutor`를 검토한다.

```java
var pool = new ThreadPoolExecutor(
    8, 32, 30, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(1_000),
    new ThreadPoolExecutor.CallerRunsPolicy()
);
```

`AbortPolicy`는 예외, `DiscardPolicy`는 현재 task 폐기, `DiscardOldestPolicy`는 queue head 폐기 후 재시도, `CallerRunsPolicy`는 submitter가 실행해 생산 속도를 늦춘다. 어떤 정책도 보편적이지 않다. Task 유실 허용 여부, caller latency와 retry contract를 기준으로 선택하고 rejection을 계측한다.

## 종료

`shutdown()`은 새 task를 거절하고 제출된 task를 처리한다. `shutdownNow()`는 대기 task를 반환하고 실행 task에는 interrupt를 시도한다. 제한 시간이 있는 service shutdown은 orderly shutdown, bounded await, interrupt 요청, 재대기 순으로 수행하고 호출 thread가 interrupt되면 status를 복원한다.

Java 19부터 `ExecutorService`는 `AutoCloseable`이며 `close()`는 orderly shutdown 후 종료까지 기다린다. `try`-with-resources는 lexical lifetime에는 편하지만 deadline 없이 오래 기다릴 수 있으므로, 운영 종료 deadline이 있으면 명시적인 two-phase shutdown을 유지한다.

## Java 21 이후 virtual thread

`Executors.newVirtualThreadPerTaskExecutor()`는 task마다 새 virtual thread를 시작한다. Virtual thread는 blocking I/O code를 단순한 동기식 흐름으로 표현하는 데 적합하며 재사용을 위한 pool이 필요하지 않다. CPU parallelism이나 DB connection, downstream rate limit을 늘리지는 않으므로 scarce resource는 semaphore, connection pool과 bounded admission으로 따로 제한한다.

관측 항목은 active worker, queue depth, rejection, enqueue delay, execution time, cancellation response와 shutdown duration이다.

## 강의 출처

- Executor 프레임워크1: [스레드를 직접 사용할 때의 문제점](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232415), [Executor 프레임워크 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232416), [ExecutorService 코드로 시작하기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232417), [Runnable의 불편함](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232418), [Future1 - 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232419), [Future2 - 분석](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232420), [Future3 - 활용](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232421), [Future4 - 이유](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232422), [Future5 - 정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232423), [Future6 - 취소](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232424), [Future7 - 예외](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232425), [ExecutorService - 작업 컬렉션 처리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232426), [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232427), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232428)
- Executor 프레임워크2: [ExecutorService 우아한 종료 - 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232430), [ExecutorService 우아한 종료 - 구현](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232431), [Executor 스레드 풀 관리 - 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232432), [Executor 스레드 풀 관리 - 분석](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232433), [Executor 전략 - 고정 풀 전략](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232434), [Executor 전략 - 캐시 풀 전략](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232435), [Executor 전략 - 사용자 정의 풀 전략](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232436), [Executor 예외 정책](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232437), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232438)

## 공식 문서

- [ExecutorService, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [Executors, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/Executors.html)
- [ThreadPoolExecutor, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [Future, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/Future.html)
- [JEP 444, Virtual Threads](https://openjdk.org/jeps/444)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue와 생산자, 소비자]]
- [[Connection-Pool|Connection Pool]]
