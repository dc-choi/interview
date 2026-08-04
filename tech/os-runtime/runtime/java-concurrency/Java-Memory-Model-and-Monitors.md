---
tags: [java, jmm, volatile, synchronized, monitor]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Memory Model and Monitors", "자바 메모리 모델과 모니터"]
---

# Java Memory Model과 monitor

Java Memory Model(JMM)은 특정 CPU cache의 구현도가 아니라, 여러 thread의 read가 어떤 write를 관찰할 수 있는지 정의하는 언어 규칙이다. 올바른 동시성 설계는 공유 상태 사이에 필요한 **happens-before** 관계를 만드는 일이다.

## 가시성만으로는 충분하지 않다

한 thread가 공유 변수를 바꿔도 동기화 관계가 없다면 다른 thread가 그 변경을 관찰할 시점과 값은 보장되지 않는다. 이를 각 thread가 자기 cache만 읽는 현상으로만 이해하면 JIT 최적화와 instruction reorder를 놓친다.

`volatile` write는 이후 같은 변수의 `volatile` read보다 먼저 보인다. 따라서 단일 stop flag의 publish에는 적합하지만, `count++` 같은 read-modify-write 전체를 atomic하게 만들지는 않는다.

```java
private volatile boolean stopping;
private final AtomicInteger count = new AtomicInteger();

void increment() {
    count.incrementAndGet();
}
```

`volatile`을 CPU cache를 우회해 항상 main memory를 직접 읽는 구현으로 규정하지 않는다. 사양이 보장하는 것은 visibility와 ordering이다. `sleep()`과 `yield()`에는 synchronization semantics가 없으므로 최신 값을 보게 만드는 장치로 사용할 수 없다.

## 핵심 happens-before 경계

- 같은 monitor의 unlock은 이후 lock보다 먼저 보인다.
- `volatile` write는 이후 같은 변수의 read보다 먼저 보인다.
- `Thread.start()` 이전 작업은 시작된 thread의 작업보다 먼저 보인다.
- thread의 모든 작업은 다른 thread가 성공적으로 `join()`한 뒤보다 먼저 보인다.
- 잘 동기화되어 data race가 없는 프로그램은 sequential consistency처럼 추론할 수 있다. 그래도 여러 연산을 하나의 불변식으로 묶지 않으면 논리적 race는 남는다.

## `synchronized`와 monitor identity

모든 Java object에는 monitor가 있고 `synchronized`는 한 monitor에 대한 mutual exclusion과 memory ordering을 함께 제공한다. instance synchronized method는 `this`, static synchronized method는 해당 `Class` object를 잠근다. 서로 다른 object를 잠그면 같은 데이터를 보호하지 못한다.

```java
final class Account {
    private final Object lock = new Object();
    private long balance;

    boolean withdraw(long amount) {
        synchronized (lock) {
            if (balance < amount) return false;
            balance -= amount;
            return true;
        }
    }
}
```

검사와 변경을 같은 critical section에 넣어 전체 불변식을 보호한다. 외부 코드가 잡을 수 있는 `this`, interned `String`, 공개 object보다 private final lock을 쓰면 뜻밖의 lock 결합을 줄일 수 있다. monitor는 reentrant이므로 같은 thread가 같은 monitor를 중첩 획득할 수 있다.

## 공유 여부를 정확히 판단하기

지역 variable 자체는 thread stack에 있지만, 그 variable이 가리키는 object는 다른 thread와 공유될 수 있다. `final` reference도 재할당만 막으며 대상 object를 immutable하게 만들지 않는다. Local이나 final이라는 표면적 표기보다 실제 object의 escape와 mutation 경로를 추적한다.

`synchronized` monitor 대기는 timeout이나 fairness를 선택할 수 없다. interruptible acquisition, timeout이나 여러 condition queue가 필요하면 [[Java-Locks-Monitors-and-Conditions|Lock과 Condition]]을 검토한다.

## 강의 출처

- 메모리 가시성: [volatile, 메모리 가시성1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232351), [volatile, 메모리 가시성2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232352), [volatile, 메모리 가시성3](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232353), [volatile, 메모리 가시성4](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232354), [자바 메모리 모델(Java Memory Model)](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232355), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232356)
- 동기화: [출금 예제 - 시작](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232358), [동시성 문제](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232359), [임계 영역](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232360), [synchronized 메서드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232361), [synchronized 코드 블럭](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232362), [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232363), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232364)

## 공식 문서

- [JLS 17, Threads and Locks, Java SE 26](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html)
- [JLS 17.4.5, Happens-before Order](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.4.5)
- [JLS 14.19, The synchronized Statement](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.19)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-Atomic-and-Concurrent-Collections|Atomic 연산과 동시성 컬렉션]]
