---
tags: [java, concurrency, structured-concurrency, virtual-thread, scoped-value]
status: done
verified_at: 2026-10-12
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Structured Concurrency", "자바 구조적 동시성", "StructuredTaskScope"]
---

# Java 구조적 동시성과 StructuredTaskScope

구조적 동시성은 작업이 동시 실행 subtask로 나뉘면 그 subtask가 모두 작업의 코드 블록으로 돌아오게 하는 방식이다. Java의 `StructuredTaskScope`는 서로 다른 thread에서 실행되는 관련 작업 묶음을 하나의 작업 단위로 다뤄 오류 처리, 취소와 관측을 단순하게 만든다. 용어는 Martin Sústrik이 만들고 Nathaniel J. Smith가 널리 알렸다.

## 정의와 상태

- 대상: 서로 충분히 독립적인 subtask로 나뉘는 작업이다. database와 원격 서비스를 함께 부르는 fan-out처럼 subtask가 주로 I/O를 기다리는 경우가 대표적이며, 기본 설정은 subtask마다 새 virtual thread를 만든다.
- 상태(2026-10-12 기준): 최신 GA인 JDK 27(2026-09-15)에서 7차 preview(JEP 533)다. JDK 27 API를 변경 없이 정식화하자는 JEP 543은 JDK 28 대상으로 Proposed to Target(검토 종료 2026-10-13) 상태이며 아직 Targeted가 아니다.
- 이력: JDK 19, 20의 incubator(JEP 428, 437)를 거쳐 JDK 21에서 preview가 되며 `fork`가 `Future` 대신 `Subtask`를 반환했다(JEP 453). JDK 22~24는 변경 없이 재preview했고(JEP 462, 480, 499), JDK 25(JEP 505)부터 public 생성자 대신 정적 팩터리 `open`으로 연다.

## 동작 원리

1. `open`: scope를 연 thread가 owner다. `fork`, `join`, `close`는 owner만 호출할 수 있고, 다른 thread가 부르면 `WrongThreadException`이 난다.
2. `fork`: subtask마다 새 thread를 시작하고 `Subtask` 핸들을 돌려준다. `ThreadFactory`를 지정하지 않으면 이름 없는 virtual thread다. 이미 취소된 scope에서는 thread를 만들지 않고 `UNAVAILABLE` 상태로 돌려준다.
3. `join`: fork마다 기다리지 않고 scope 전체를 한 번 기다리며, 결과나 예외는 `Joiner`가 만든다. `join` 뒤에는 fork할 수 없다. fork한 뒤 `join` 없이 블록을 벗어나면 scope가 취소되고, `close`가 subtask 종료를 기다린 뒤 `IllegalStateException`을 던진다.
4. 실패와 형제 취소: 기본 정책에서 subtask 하나가 실패하면 scope가 취소되어 끝나지 않은 subtask thread에 interrupt가 간다. `join`은 나머지의 완료를 기다리지 않고 첫 실패 예외를 cause로 담은 `ExecutionException`을 던진다.
5. `close`: 취소되지 않았으면 scope를 취소한 뒤 모든 thread가 끝날 때까지 기다린다. 기다리는 중 interrupt를 받아도 계속 기다리고 interrupt status를 설정한 채 반환한다. 그래서 `close`를 지나면 scope에서 시작한 thread가 남지 않는다.
6. 중첩: subtask 안에서 다시 scope를 열면 그 subtask thread가 owner인 scope가 생겨 작업 트리가 된다. 안쪽 `join`의 예외가 subtask 밖으로 전파되면 바깥 `join` 예외의 cause가 되어, cause 사슬이 실패 경로를 보여 준다. 같은 owner thread가 바깥 scope 안에서 연 scope를 닫지 않은 채 바깥 scope를 닫으면 안쪽 scope를 생성 역순으로 닫고 `StructureViolationException`을 던진다. 자기가 연 scope를 닫지 않고 끝난 thread의 scope는 thread가 끝날 때 닫힌다.

fork 전 owner의 동작은 subtask의 동작보다 happens-before이고, `join` 결과에 기여한 subtask의 동작은 owner가 `join`에서 반환하는 시점보다 happens-before다. subtask thread는 open 때 캡처한 `ScopedValue` 바인딩을 복사 없이 상속하고, 이 상속은 손자 subtask까지 이어진다. fork 시점의 바인딩이 open 때와 다르면 `fork`가 `StructureViolationException`을 던진다. `ScopedValue`는 JDK 25(JEP 506)에서 정식 API가 됐다.

## Java 예시 (JDK 27 preview)

JDK 27에서는 `javac --release 27 --enable-preview Main.java`로 컴파일하고 `java --enable-preview Main`으로 실행한다. 예시는 필요한 `java.time`, `java.util`, `java.util.concurrent` 타입과 `StructuredTaskScope`의 중첩 타입 `Subtask`, `Joiner`를 import했다고 가정한다.

```java
OrderSummary summary(long id) throws InterruptedException, ExecutionException {
    try (var scope = StructuredTaskScope.open(
            cf -> cf.withName("order-summary").withTimeout(Duration.ofSeconds(2)))) {
        Subtask<Customer> customer = scope.fork(() -> fetchCustomer(id));
        Subtask<Order> order = scope.fork(() -> fetchOrder(id));
        scope.join();   // 하나라도 실패하거나 timeout이면 ExecutionException
        return new OrderSummary(customer.get(), order.get());
    }                   // close: 남은 subtask를 interrupt하고 thread 종료까지 대기
}
```

예외는 try-with-resources에 붙인 `catch (ExecutionException e)`에서 `e.getCause()`로 가른다. cause는 먼저 실패한 subtask의 예외이거나, timeout이면 `RuntimeException` 하위 클래스인 `CancelledByTimeoutException`이다. 특정 예외를 기본값으로 바꾸는 경우라면 owner보다 subtask 안에서 처리하는 편이 적절할 수 있다. `Subtask.get()`은 `join` 전이나 성공하지 않은 subtask에서 `IllegalStateException`을 던진다.

| JDK별 차이 | JDK 25 (JEP 505) | JDK 26 (JEP 525) | JDK 27 (JEP 533) |
|---|---|---|---|
| 타입 매개변수 | `<T, R>` | `<T, R>` | `<T, R, R_X>`, `R_X`는 `join`의 예외 타입 |
| 설정 인자 | `Function<Configuration, Configuration>` | `UnaryOperator<Configuration>` | 같음, `open(UnaryOperator)` 추가 |
| 기본 정책의 실패와 timeout | `FailedException`, `TimeoutException` | 같음 | `ExecutionException`, timeout이면 cause가 `CancelledByTimeoutException` |
| 하나만 성공하면 되는 joiner | `anySuccessfulResultOrThrow()` | `anySuccessfulOrThrow()` | 같음 |
| `allSuccessfulOrThrow()` 결과 | `Stream<Subtask<T>>` | `List<T>` | 같음 |
| 그 밖 | `awaitAll()` 있음 | `Joiner.onTimeout()` 추가 | `awaitAll()` 제거, `onTimeout()` 대신 `timeout()` |

JDK 25와 26의 `FailedException`은 `RuntimeException` 하위 클래스였고 기본 `join()`은 checked 예외로 `InterruptedException`만 선언했다. JDK 27에서 checked `ExecutionException`으로 바뀌었으므로 이전 preview로 작성한 코드는 JDK를 올리면 컴파일되지 않을 수 있다.

## Joiner 정책

`Joiner`는 subtask 완료를 보고 scope 취소 여부와 `join`의 결과를 정한다. JDK 27이 제공하는 팩터리는 다음과 같다.

| 팩터리 | `join` 반환 | subtask 실패 | timeout |
|---|---|---|---|
| `awaitAllSuccessfulOrThrow()` (`open()`의 기본값) | `null`, 결과는 `Subtask.get()` | scope 취소, 첫 실패가 cause인 `ExecutionException` | `ExecutionException`, cause `CancelledByTimeoutException` |
| `allSuccessfulOrThrow()` | fork 순서의 `List<T>` | 같음 | 같음 |
| `anySuccessfulOrThrow()` | 성공한 subtask 하나의 결과, 성공하면 scope 취소 | 모두 실패하면 그중 하나가 cause인 `ExecutionException` | 같음 |
| `allUntil(Predicate)` | fork 순서의 `List<Subtask<T>>`, predicate가 `true`면 scope 취소 | 던지지 않음, `state()`로 확인 | 던지지 않음, 미완료는 `UNAVAILABLE` |

- `...OrThrow` 팩터리 셋에는 `Function<Throwable, R_X>`를 받는 overload가 있다. `CompletionException::new`처럼 unchecked 예외를 지정하면 `join`의 checked 예외는 `InterruptedException`만 남는다.
- `anySuccessfulOrThrow()`는 중복 서비스나 캐시와 database 중 빠른 쪽을 고를 때, `allUntil`과 timeout의 조합은 기한 안에 끝난 결과만 모을 때 맞는다.
- 직접 구현하면 `result()`와 `timeout()`을 구현하고, `onFork`나 `onComplete`가 `true`를 반환해 scope를 취소한다. `onComplete`와 `allUntil`의 predicate는 subtask thread에서 동시에 호출될 수 있으므로 thread-safe해야 한다. Joiner는 scope마다 새로 만들고, 업무 규칙은 Joiner 밖 호출부에 둔다.

```java
List<Result> searchWithin(List<String> regions, String query) throws InterruptedException {
    try (var scope = StructuredTaskScope.open(Joiner.<Result>allUntil(s -> false),
            cf -> cf.withTimeout(Duration.ofMillis(500)))) {
        for (var region : regions) scope.fork(() -> search(region, query));
        return scope.join().stream()   // 모두 끝나거나 500ms가 지나면 반환, 실패나 timeout에도 예외 없음
                .filter(s -> s.state() == Subtask.State.SUCCESS)
                .map(Subtask::get)
                .toList();
    }
}
```

## timeout과 취소

- `withTimeout(Duration)`의 시계는 첫 fork가 아니라 scope를 연 순간 시작해 `join`까지를 묶는다. 만료되면 scope가 취소되어 미완료 subtask에 interrupt가 가고, `join`의 결과는 위 표처럼 Joiner가 정한다. 기한이 `Instant`라면 `Duration.between(Instant.now(), deadline)`으로 넘긴다.
- 취소는 thread interrupt 위에 만들어졌다. subtask는 interrupt를 받으면 빨리 끝나도록 작성하고, `InterruptedException`을 삼키지 않는 규칙은 [[Java-Threads-Lifecycle-and-Cancellation|협력적 취소]]를 따른다.
- interrupt로 깨지 않는 대기(예: monitor 획득)에 묶인 subtask가 있으면 timeout이 지나도 `close`가 그 thread를 계속 기다려 블록을 벗어나지 못할 수 있다. 외부 호출에는 호출 자체의 timeout도 둔다.

## 관측: thread dump와 이름

- `jcmd <pid> Thread.print`는 platform thread와 carrier에 올라간(mounted) virtual thread만 출력한다. carrier에서 내려와 기다리는 subtask virtual thread까지 보려면 `jcmd <pid> Thread.dump_to_file -format=json <file>`을 쓰며, 같은 형식은 `HotSpotDiagnosticMXBean`으로도 만든다.
- JSON의 `threadDump.threadContainers` 첫 원소는 `<root>`이고, 각 container는 `container`(고유 이름), `parent`, `owner`(소유 thread ID), `threads`(stack trace 포함), `threadCount`를 가진다. scope마다 parent를 가리키는 container가 생겨 작업 트리를 다시 그릴 수 있고, owner는 보통 `join`에서 막혀 있다. 덤프에 빠진 virtual thread가 있으면 선택 필드인 `threadCount`가 `threads` 원소 수보다 클 수 있다.
- JDK 27 가이드 예시에서 `withName`으로 준 이름은 container 값 앞부분(`이름/jdk.internal.misc.ThreadFlock$ThreadContainerImpl@...`)에 나온다. subtask thread 이름은 `withThreadFactory(Thread.ofVirtual().name("order-", 0).factory())`처럼 정한다.

## ExecutorService와 비교

| 관점 | `ExecutorService` + `Future` | `StructuredTaskScope` |
|---|---|---|
| 작업 관계 | 강제하거나 추적하지 않음 | owner 블록 안의 fork, join, close |
| 한 작업 실패 | 다른 작업이 계속 실행되어 thread가 샐 수 있고, 앞선 `get()`이 늦은 작업을 기다림 | 기본 정책은 나머지 subtask를 취소하고 `join`이 첫 실패 예외를 cause로 담아 바로 깨어남, 다른 Joiner는 위 표의 정책을 따름 |
| owner interrupt | subtask로 전파되지 않음 | `join`은 `InterruptedException`, 이어지는 `close`가 subtask를 취소하고 종료를 기다림 |
| `close()` | 제출한 작업이 모두 끝날 때까지 대기(Java 19+) | 취소한 뒤 thread 종료까지 대기 |
| thread dump | 서로 무관한 thread로 보임 | JSON dump에 scope 트리 |
| 사용 범위 | 제출과 결과 소비 위치가 자유로운 정식 API | owner 블록 한정, JDK 27 preview |

구조적 동시성은 실패 전파, 형제 취소, 누수 없는 수명과 관측 가능한 구조를 코드 모양으로 강제하고 그만큼 자유도를 줄인다. JDK 25~27 사이 예외 타입과 메서드 이름이 바뀌었으므로 preview 단계에서 도입하면 JDK를 올릴 때 코드 수정이 필요할 수 있다. virtual thread가 database connection이나 하류 rate limit을 늘리지는 않으므로 큰 fan-out에는 semaphore나 pool 한도를 따로 둔다([[Thread-Pool-Sizing|스레드 풀 사이징]]).

## 쓰지 않을 곳

- 요청보다 오래 사는 백그라운드 작업처럼 실행이 owner 블록을 넘어 이어져야 하는 작업: scope는 owner가 연 블록 안에서 끝나야 하므로 `ExecutorService`나 `CompletableFuture`가 맞다.
- 계속 들어오는 작업을 받는 장기 worker나 생산자, 소비자 파이프라인: `join` 뒤에는 fork할 수 없고 thread 간 데이터 stream 공유는 JEP의 비목표다. bounded `BlockingQueue`와 executor를 쓴다.
- 작은 연산을 잘게 나누는 CPU 작업: JEP는 `ForkJoinPool`을 I/O보다 연산 집약 작업용 API로 설명한다.
- 앞 단계 결과가 다음 단계 입력인 흐름: 순차 코드로 두고 서로 독립적인 구간만 scope로 묶는다.

## 체크포인트

- 실패했을 때 `join`과 `close`가 각각 무엇을 기다리는지, 그래서 `close` 뒤에 무엇이 보장되는지 설명할 수 있는가
- 기본 정책에서 subtask 하나가 실패하면 나머지 subtask와 `join` 예외의 cause는 어떻게 되는가
- timeout은 언제 시작하고, 만료 시 `allSuccessfulOrThrow()`와 `allUntil`의 결과는 어떻게 다른가
- interrupt에 반응하지 않는 subtask가 있으면 timeout이 있어도 블록이 끝나지 않을 수 있는 이유는 무엇인가
- JSON thread dump에서 멈춘 scope의 owner와 subtask thread를 어떻게 찾는가

## 출처

- [Structured Concurrency Looms — Devoxx Belgium 2026, Alan Bateman, Viktor Klang](https://www.youtube.com/watch?v=oS01pSRWKmg)
- [OpenJDK, JEP 533: Structured Concurrency (Seventh Preview)](https://openjdk.org/jeps/533)
- [OpenJDK, JEP 543: Structured Concurrency](https://openjdk.org/jeps/543)
- [OpenJDK, JEP 525: Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525)
- [OpenJDK, JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)
- [OpenJDK, JEP 506: Scoped Values](https://openjdk.org/jeps/506)
- [OpenJDK, JDK 27](https://openjdk.org/projects/jdk/27/)
- [OpenJDK, JDK 28](https://openjdk.org/projects/jdk/28/)
- [Oracle Java SE 27, StructuredTaskScope](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)
- [Oracle Java SE 27, StructuredTaskScope.Joiner](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.Joiner.html)
- [Oracle Java SE 27, StructuredTaskScope.Configuration](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.Configuration.html)
- [Oracle Java SE 27, StructuredTaskScope.CancelledByTimeoutException](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.CancelledByTimeoutException.html)
- [Oracle Java SE 27, StructuredTaskScope.Subtask](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.Subtask.html)
- [Oracle Java SE 27, Structured Concurrency](https://docs.oracle.com/en/java/javase/27/core/structured-concurrency.html)
- [Oracle Java SE 27, ExecutorService](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [Oracle JDK 27, jcmd](https://docs.oracle.com/en/java/javase/27/docs/specs/man/jcmd.html)
- [Oracle Java SE 27, JSON Thread Dump Format](https://docs.oracle.com/en/java/javase/27/docs/api/jdk.management/com/sun/management/doc-files/threadDump.html)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-Threads-Lifecycle-and-Cancellation|스레드 생명 주기, 협력적 취소와 thread dump]]
- [[Java-Executors-Futures-and-Thread-Pools|Executor, Future와 thread pool]]
- [[Java-ThreadLocal-and-Request-Context|ThreadLocal, ScopedValue와 request context]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue와 생산자, 소비자]]
