---
tags: [java, blocking-queue, producer-consumer, backpressure]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java BlockingQueue and Producer Consumer", "자바 BlockingQueue 생산자 소비자"]
---

# Java BlockingQueue와 생산자, 소비자

`BlockingQueue`는 queue 연산, thread safety와 조건 대기를 하나의 검증된 추상화로 묶는다. 직접 `wait`, `notify` protocol을 만들기보다 생산자, 소비자 경계에서 우선 선택한다.

## 실패 방식이 API 계약이다

| 동작 | 예외 | 즉시 특별 값 | 무기한 대기 | 제한 시간 대기 |
|---|---|---|---|---|
| 삽입 | `add(e)` | `offer(e)` | `put(e)` | `offer(e, time, unit)` |
| 제거 | `remove()` | `poll()` | `take()` | `poll(time, unit)` |
| 조회 | `element()` | `peek()` | 해당 없음 | 해당 없음 |

`put`과 `take`는 interruptible하다. 서버 경계에서는 무기한 정지보다 timed `offer`와 `poll`로 deadline과 실패 정책을 드러내는 편이 안전하다. `null`은 실패 sentinel로 쓰이므로 element로 넣을 수 없다.

## Capacity는 overload 정책이다

Bounded queue가 가득 찼다는 것은 생산 속도가 소비 속도를 넘었다는 신호다. 이때 block, timeout, reject, 호출자 실행 중 어느 정책을 택할지 상위 service contract로 정한다. 무제한 queue는 overload를 해결하지 않고 latency와 memory 사용으로 숨긴다.

- `ArrayBlockingQueue`: 생성할 때 고정 capacity를 정하며 선택적 fairness를 제공한다.
- `LinkedBlockingQueue`: capacity를 생략하면 사실상 매우 큰 한도를 사용하므로 명시적 bound를 검토한다.
- `SynchronousQueue`: element를 저장하지 않고 생산자와 소비자를 직접 rendezvous시킨다.

Queue에 object를 넣기 전의 작업은 다른 thread가 그 element를 꺼내 접근한 뒤보다 happens-before 관계에 있다. 다만 queue 밖의 별도 공유 상태까지 자동으로 보호하지는 않는다.

## 종료 protocol

`BlockingQueue` 자체에는 close가 없다. 선택지는 service-level stop flag와 interrupt, 생산자 수를 고려한 poison pill, executor shutdown 등이다. poison pill은 consumer 수만큼 전달해야 하고 정상 data와 충돌하지 않아야 하며, 가득 찬 queue에서 종료 신호도 막힐 수 있다는 점을 설계한다.

관측 항목은 queue depth, offer timeout과 rejection 수, enqueue-to-start latency, processing time이다. Queue가 계속 차오르는 상황에서 consumer 수만 늘리기 전에 downstream capacity와 retry 증폭을 함께 확인한다.

## 강의 출처

- 김영한 강사, [BlockingQueue - 예제6](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232390), [BlockingQueue - 기능 설명](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232391), [BlockingQueue - 기능 확인](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232392), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232393)

## 공식 문서

- [BlockingQueue, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/BlockingQueue.html)
- [ArrayBlockingQueue, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ArrayBlockingQueue.html)
- [LinkedBlockingQueue, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/LinkedBlockingQueue.html)
- [SynchronousQueue, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/SynchronousQueue.html)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Java-Locks-Monitors-and-Conditions|Lock, monitor와 Condition]]
- [[Backpressure|Backpressure]]
