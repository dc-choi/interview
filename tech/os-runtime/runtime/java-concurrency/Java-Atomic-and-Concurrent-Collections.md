---
tags: [java, atomic, cas, concurrent-collections, lock-free]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Atomic and Concurrent Collections", "자바 Atomic과 동시성 컬렉션"]
---

# Java Atomic 연산과 동시성 컬렉션

## Visibility와 atomicity

단일 read나 write가 atomic하더라도 `value++`는 read, calculate, write의 복합 연산이다. `volatile`은 visibility와 ordering을 제공하지만 그 세 단계를 하나로 묶지 않는다. 한 변수의 독립적인 갱신에는 `AtomicInteger`, 여러 field가 함께 만족해야 하는 invariant에는 lock을 선택한다.

## CAS retry loop

Compare-and-set(CAS)는 현재 값이 예상 값과 같을 때만 새 값으로 바꾸는 atomic primitive다.

```java
int increment(AtomicInteger value) {
    while (true) {
        int current = value.get();
        if (value.compareAndSet(current, current + 1)) {
            return current + 1;
        }
    }
}
```

충돌이 적고 critical section이 짧으면 blocking과 context switch를 피할 수 있다. 충돌이 잦으면 retry가 CPU를 소비하고 한 thread가 계속 실패할 수 있다. `updateAndGet`에 전달한 function도 재실행될 수 있으므로 side effect가 없어야 한다.

CAS 하나를 사용했다고 전체 algorithm이 lock-free가 되는 것은 아니다. 특히 CAS로 만든 spin lock은 다른 thread의 lock 해제를 기다리는 mutual-exclusion lock이며, 대기가 길면 CPU를 태운다. 실제 progress guarantee는 algorithm 전체를 기준으로 판단한다.

## 한계와 도구 선택

- ABA: 값이 A에서 B를 거쳐 A로 돌아오면 값 비교만으로 중간 변화를 감지하지 못할 수 있다. version을 함께 비교하는 stamped reference 등을 검토한다.
- 여러 변수의 invariant: 각 atomic 변수가 따로 안전해도 조합은 안전하지 않다. immutable snapshot을 `AtomicReference`로 교체하거나 lock으로 묶는다.
- 높은 contention의 통계 counter: 정확한 순간 합계보다 update throughput이 중요하면 `LongAdder`를 검토한다.
- custom CAS loop보다 JDK atomic class와 concurrent collection의 atomic method를 우선한다.

## 동시성 collection

일반 `ArrayList`, `HashMap`은 concurrent mutation에 안전하지 않다. `Collections.synchronizedList`와 synchronized map은 각 method를 한 lock으로 감싸지만 iteration은 반환된 wrapper에 외부 synchronization이 필요하고, check-then-act 같은 복합 작업도 하나의 critical section으로 묶어야 한다.

`ConcurrentHashMap`은 read와 update의 높은 concurrency를 지원한다. 단일 operation의 thread safety를 여러 호출의 atomicity로 확대 해석하지 않는다.

```java
counts.merge(key, 1L, Long::sum);
cache.computeIfAbsent(key, this::load);
```

`compute`, `merge`, `putIfAbsent` 같은 atomic compound method를 사용한다. Iterator는 concurrent modification을 반영할 수도 있는 weakly consistent view이며 transaction snapshot이 아니다. `CopyOnWriteArrayList`는 read-heavy, small-list workload에 적합하지만 매 write마다 backing array를 복사하므로 write-heavy 경로에는 부적합하다.

## 강의 출처

- CAS와 원자적 연산: [원자적 연산 - 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232395), [원자적 연산 - 시작](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232396), [원자적 연산 - volatile, synchronized](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232397), [원자적 연산 - AtomicInteger](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232398), [원자적 연산 - 성능 테스트](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232399), [CAS 연산1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232400), [CAS 연산2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232401), [CAS 연산3](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232402), [CAS 락 구현1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232403), [CAS 락 구현2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232404), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232405)
- 동시성 컬렉션: [동시성 컬렉션이 필요한 이유1 - 시작](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232407), [동시성 컬렉션이 필요한 이유2 - 동시성 문제](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232408), [동시성 컬렉션이 필요한 이유3 - 동기화](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232409), [동시성 컬렉션이 필요한 이유4 - 프록시 도입](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232410), [자바 동시성 컬렉션1 - synchronized](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232411), [자바 동시성 컬렉션2 - 동시성 컬렉션](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232412), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232413)

## 공식 문서

- [AtomicInteger, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
- [AtomicStampedReference, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/AtomicStampedReference.html)
- [LongAdder, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html)
- [ConcurrentHashMap, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [Collections synchronized wrappers, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Collections.html)
- [CopyOnWriteArrayList, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-Memory-Model-and-Monitors|Java Memory Model과 monitor]]
