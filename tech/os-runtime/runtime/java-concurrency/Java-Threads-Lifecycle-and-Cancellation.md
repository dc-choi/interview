---
tags: [java, thread, lifecycle, interrupt, cancellation]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Java Threads Lifecycle and Cancellation", "자바 스레드 생명 주기와 취소"]
---

# Java 스레드 생성, 생명 주기와 협력적 취소

## Process, thread와 scheduling

Process는 주소 공간과 자원의 격리 단위이고, thread는 그 process 안에서 코드를 실행하는 scheduling 단위다. 같은 process의 thread는 heap을 공유하지만 각자 stack과 program counter를 가진다. 한 core가 여러 thread를 번갈아 실행하면 concurrency, 여러 core가 실제로 동시에 실행하면 parallelism이 생긴다.

Context switch에는 register와 scheduling 상태 교체, cache locality 손실 같은 비용이 있다. 그래서 thread 수는 많을수록 좋은 값이 아니다. CPU-bound 작업은 가용 core 수를 출발점으로, I/O-bound 작업은 대기 비율과 외부 자원 한도를 반영한 뒤 부하 시험으로 조정한다.

## `start()`와 작업 분리

`Thread.start()`는 새 실행 흐름을 scheduling하고 최대 한 번만 호출할 수 있다. `run()`을 직접 호출하면 일반 method call일 뿐 새 platform thread가 생기지 않는다. `Runnable`은 작업을 실행 기구와 분리하지만, 실무의 장기 실행 서비스는 [[Java-Executors-Futures-and-Thread-Pools|Executor]]에 작업을 제출하는 편이 수명과 과부하를 통제하기 쉽다.

여러 thread의 시작 순서와 완료 순서는 보장되지 않는다. 이름과 uncaught-exception handler는 진단 계약으로 정하고, 결과의 정확성을 log 출력 순서에 의존시키지 않는다.

## 상태 모델

| `Thread.State` | 의미 |
|---|---|
| `NEW` | 아직 시작하지 않음 |
| `RUNNABLE` | JVM에서 실행 가능하며, OS 관점의 실행 중과 준비 상태를 함께 포함 |
| `BLOCKED` | `synchronized` monitor 획득을 기다림 |
| `WAITING` | 기한 없이 다른 동작을 기다림 |
| `TIMED_WAITING` | 제한 시간이 있는 대기 |
| `TERMINATED` | `run()`이 정상 또는 예외로 끝남 |

상태 조회는 순간 snapshot이다. 정확한 제어 신호로 쓰기보다 thread dump와 장애 진단에 사용한다.

## `sleep()`, `join()`과 daemon

- `sleep()`은 현재 thread만 쉬게 하며 이미 보유한 monitor를 놓지 않는다. 시간 정확성이나 메모리 가시성도 보장하지 않는다.
- `join()`의 성공적인 반환은 대상 thread의 모든 작업과 호출자 후속 작업 사이에 happens-before를 만든다. 제한 시간 `join` 뒤에는 실제 종료 여부를 다시 확인한다.
- platform daemon thread는 JVM 생존을 붙잡지 않는다. 모든 non-daemon thread가 끝나면 daemon의 `finally`나 파일 flush가 완료되기 전에 종료될 수 있으므로 중요한 정리에 사용하지 않는다.
- virtual thread는 항상 daemon이며 priority가 고정되어 있다. platform thread의 priority와 `yield()`도 portable한 실행 순서 계약이 아니라 scheduler hint다.

## Interrupt는 요청이다

`interrupt()`는 다른 thread를 강제로 죽이지 않고 interrupt status를 설정한다. `sleep`, `wait`, `join` 같은 interruptible wait는 보통 `InterruptedException`을 던지며 그 전에 status를 지운다. 현재 계층이 취소를 완전히 처리하지 않는다면 예외를 다시 던지거나 status를 복원한다.

```java
try {
    while (!Thread.currentThread().isInterrupted()) {
        process(queue.take());
    }
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
} finally {
    closeOwnedResources();
}
```

`isInterrupted()`는 status를 보존하고, static `Thread.interrupted()`는 현재 thread의 status를 읽고 지운다. 직접 지워야 하는 저수준 구현은 드물다. Java SE 26의 `Thread` API에는 과거의 unsafe `stop`, `suspend`, `resume`가 없으므로 협력적 취소와 자원 소유권 규칙으로 종료를 설계한다.

## 강의 출처

- 프로세스와 스레드 소개: [멀티태스킹과 멀티프로세싱](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232313), [프로세스와 스레드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232314), [스레드와 스케줄링](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232315), [컨텍스트 스위칭](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232316)
- 스레드 생성과 실행: [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232318), [스레드 시작1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232319), [스레드 시작2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232320), [데몬 스레드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232321), [스레드 생성 - Runnable](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232322), [로거 만들기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232323), [여러 스레드 만들기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232324), [Runnable을 만드는 다양한 방법](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232325), [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232326), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232327)
- 스레드 제어와 생명 주기1: [스레드 기본 정보](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232329), [스레드의 생명 주기 - 설명](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232330), [스레드의 생명 주기 - 코드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232331), [체크 예외 재정의](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232332), [join - 시작](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232333), [join - 필요한 상황](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232334), [join - sleep 사용](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232335), [join - join 사용](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232336), [join - 특정 시간 만큼만 대기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232337), [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232338)
- 스레드 제어와 생명 주기2: [인터럽트 - 시작1](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232340), [인터럽트 - 시작2](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232341), [인터럽트 - 시작3](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232342), [인터럽트 - 시작4](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232343), [프린터 예제1 - 시작](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232344), [프린터 예제2 - 인터럽트 도입](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232345), [프린터 예제3 - 인터럽트 코드 개선](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232346), [yield - 양보하기](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232347), [프린터 예제4 - yield 도입](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232348), [정리](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232349)

## 공식 문서

- [Thread, Java SE 26](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.html)
- [JLS 17.3, Sleep and Yield](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.3)
- [JLS 17.4.5, Happens-before Order](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.4.5)

## 관련 문서

- [[Java-Concurrency|Java 멀티스레드와 동시성]]
- [[Context-Switching|Context Switching]]
- [[Java-Executors-Futures-and-Thread-Pools|Executor, Future와 thread pool]]
