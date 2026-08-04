---
tags: [java, lock, monitor, condition, producer-consumer]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Locks Monitors and Conditions", "자바 Lock 모니터 Condition"]
---

# Java Lock, monitor와 Condition

## 기다림의 진화

Bounded buffer에서 생산 속도와 소비 속도가 다르면 네 가지 단계를 구분해야 한다.

1. 가득 찼거나 비었는데 즉시 실패하면 data를 버리거나 잘못된 값을 돌려줄 수 있다.
2. lock을 가진 채 `sleep()`하면 상태를 바꿀 상대가 lock을 얻지 못해 progress가 멈춘다.
3. `wait()`는 monitor를 놓고 기다리므로 상대가 상태를 바꿀 수 있다.
4. 하나의 wait set에서 불필요한 thread까지 깨우는 문제는 여러 `Condition` 또는 [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue]]로 해결한다.

## `wait`, `notify`의 계약

`wait`, `notify`, `notifyAll`은 대상 object의 monitor를 현재 thread가 보유한 동안만 호출할 수 있다. `wait()`는 monitor의 재진입 횟수만큼 lock을 모두 놓고 wait set에 들어갔다가, 깨어난 뒤 같은 monitor를 다시 획득해야 반환한다.

```java
synchronized (monitor) {
    while (queue.isEmpty()) {
        monitor.wait();
    }
    return queue.remove();
}
```

조건은 반드시 `while`에서 다시 검사한다. spurious wakeup이 허용되고, 알림 뒤 monitor를 다시 잡는 사이 다른 thread가 조건을 소비할 수 있기 때문이다. `notify()`가 선택할 thread에는 보장이 없다. 서로 다른 조건의 thread가 한 wait set에 섞이면 starvation이 생길 수 있고, `notifyAll()`은 안전성을 높이는 대신 불필요한 wakeup과 lock 경쟁을 만든다.

## `LockSupport`는 기반 primitive다

`park()`와 `unpark(thread)`는 thread마다 최대 하나의 permit을 사용한다. `unpark`가 먼저 와도 다음 `park`가 즉시 반환하지만 permit은 누적되지 않는다. `park`는 interrupt, timeout 또는 이유 없는 반환으로도 끝날 수 있으므로 volatile이나 atomic 상태를 검사하는 loop 안에서 사용한다.

`park`는 `InterruptedException`을 던지거나 interrupt status를 지우지 않는다. 보통 애플리케이션에서 직접 protocol을 만들기보다 `ReentrantLock`, synchronizer와 concurrent collection 같은 상위 API를 쓴다.

## `ReentrantLock` 선택 기준

`ReentrantLock`은 `synchronized`와 같은 기본 mutual-exclusion semantics에 다음 선택지를 더한다.

- `lockInterruptibly()`: lock 대기 중 interrupt에 반응한다.
- `tryLock()`: 즉시 실패하거나 제한 시간 안에서만 기다린다.
- fairness mode: 오래 기다린 thread를 선호하지만 throughput이 낮아질 수 있다. OS scheduling까지 공정해지는 것은 아니며, 인자 없는 `tryLock()`은 fairness를 따르지 않는다.
- 여러 `Condition`: 생산자용 `notFull`, 소비자용 `notEmpty`처럼 wait set을 분리한다.

```java
lock.lock();
try {
    while (queue.isEmpty()) notEmpty.await();
    E item = queue.remove();
    notFull.signal();
    return item;
} finally {
    lock.unlock();
}
```

`await()`도 loop에서 predicate를 재검사한다. `signal()`은 실행권이나 lock을 즉시 넘기는 명령이 아니라 대기 thread 하나를 lock 재획득 경쟁에 참여시킨다. 여러 lock을 잡는다면 전역 획득 순서를 정해 deadlock을 피하고, lock을 보유한 채 외부 I/O를 하지 않는다.

## 강의 출처

- 고급 동기화: [LockSupport1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232366), [LockSupport2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232367), [ReentrantLock - 이론](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232368), [ReentrantLock - 활용](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232369), [ReentrantLock - 대기 중단](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232370), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232371)
- 생산자 소비자 문제1: [생산자 소비자 문제 - 소개](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232373), [생산자 소비자 문제 - 예제1 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232374), [생산자 소비자 문제 - 예제1 분석 - 생산자 우선](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232375), [생산자 소비자 문제 - 예제1 분석 - 소비자 우선](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232376), [생산자 소비자 문제 - 예제2 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232377), [생산자 소비자 문제 - 예제2 분석](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232378), [Object - wait, notify - 예제3 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232379), [Object - wait, notify - 예제3 분석 - 생산자 우선](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232380), [Object - wait, notify - 예제3 분석 - 소비자 우선](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232381), [Object - wait, notify - 한계](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232382), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232383)
- 생산자 소비자 문제2: [Lock Condition - 예제4](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232385), [생산자 소비자 대기 공간 분리 - 예제5 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232386), [생산자 소비자 대기 공간 분리 - 예제5 분석](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232387), [스레드의 대기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232388), [중간 정리 - 생산자 소비자 문제](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232389)

## 공식 문서

- [Object, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [LockSupport, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/locks/LockSupport.html)
- [ReentrantLock, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Condition, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/locks/Condition.html)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-Memory-Model-and-Monitors|Java Memory Model과 monitor]]
