---
tags: [os, thread, concurrency, event-loop, nodejs]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Thread vs Event Loop", "멀티스레드 패턴"]
---

# Thread vs Event Loop

스레드와 이벤트 루프는 동시에 여러 작업을 진전시키는 서로 다른 실행 모델이다. 어느 쪽이 더 빠른지가 아니라, 작업의 대기 형태와 공유 상태, 실패 격리, 운영 한도에 맞는 모델을 고른다.

## 프로세스와 스레드

- 같은 프로세스의 스레드는 주소 공간을 공유하므로 통신 비용이 낮지만 data race와 deadlock을 관리해야 한다.
- 프로세스는 기본 주소 공간이 분리되어 실패 격리가 강하다. pipe, socket, shared memory와 `mmap` 같은 IPC로 통신하거나 메모리를 명시적으로 공유할 수 있다.
- 스레드 수를 늘린다고 처리량이 계속 늘지 않는다. 생성 비용, stack 메모리, 스케줄링과 context switching, 공유 자원 경합이 증가한다.

## Node.js 실행 모델

기본 Node.js 프로세스는 한 JavaScript 스레드의 이벤트 루프가 callback을 실행한다. 비동기 I/O는 가능한 경우 OS 커널에 맡기고, 일부 파일 시스템, DNS, crypto 작업은 libuv thread pool을 이용한다.

`async` 함수와 `await`는 이 완료 흐름을 Promise로 표현한다. `await`는 현재 async 함수의 나머지를 나중에 재개하도록 양보할 뿐, 별도 스레드를 만들거나 CPU 작업을 병렬화하지 않는다.

CPU 집약 JavaScript는 callback 하나가 이벤트 루프를 오래 점유하므로 Worker Threads나 별도 프로세스로 격리한다. Worker는 생성 비용이 있으므로 요청마다 만들기보다 pool을 재사용한다.

| 작업 | 기본 선택 | 이유 |
|---|---|---|
| 네트워크, DB I/O | 비동기 API와 이벤트 루프 | 대기 동안 다른 callback 진행 |
| CPU 집약 JS | Worker Threads pool | JavaScript를 실제 병렬 실행 |
| 강한 실패 격리, 독립 배포 | 프로세스나 서비스 분리 | 주소 공간과 수명 분리 |
| 작은 공유 상태의 병렬 계산 | Worker와 메시지 전달 우선 | 공유 메모리 동기화 복잡성 축소 |

## Blocking, Non-Blocking과 완료 통지

Blocking은 호출자가 결과를 기다리며 진행하지 못하는 성질이고, Non-Blocking은 즉시 제어권을 돌려주는 성질이다. 완료를 확인하는 방법은 polling, callback/event, Promise/Future가 있다.

Polling은 확인 주기만큼 지연과 부하가 생긴다. event 기반 통지는 불필요한 확인을 줄이지만, queue 폭증과 handler 실패를 따로 다뤄야 한다. `async/await`도 backpressure, timeout과 취소를 자동으로 제공하지 않는다.

## 동시성 정확성의 세 축

| 축 | 질문 | 대표 도구 |
|---|---|---|
| Visibility | 다른 실행 주체의 변경을 언제 볼 수 있는가 | Java `volatile`, lock, Node `Atomics` |
| Ordering | 두 작업 사이 순서가 어떻게 보장되는가 | happens-before, message passing |
| Atomicity | 복합 갱신이 중간 상태 없이 실행되는가 | lock, atomic read-modify-write |

`volatile`을 CPU 캐시 우회로 이해하면 안 된다. 언어 메모리 모델의 가시성과 순서 규칙이며 `count++` 같은 복합 연산을 원자적으로 만들지 않는다. context switch, `sleep()`과 `yield()`도 동기화 경계가 아니다.

Node.js의 `Atomics`는 일반 객체가 아니라 Worker 사이에 공유한 `SharedArrayBuffer`의 typed array에서 사용한다. 이벤트 루프 callback이 직렬 실행되어도 여러 `await` 사이에 다른 요청이 끼어들 수 있으므로 DB나 외부 상태에는 논리적 race condition이 남는다.

## 동시성 패턴을 실행 모델에 매핑하기

| 패턴 | 핵심 | Java | Node.js, NestJS |
|---|---|---|---|
| Guarded Suspension | 조건이 참일 때까지 효율적으로 대기 | `wait` 반복 검사, `Condition` | Promise, event, Worker `Atomics.wait` |
| Balking | 조건이 아니면 기다리지 않고 거절 | 상태 검사 후 즉시 반환 | 중복 실행 거절, try-lock, admission control |
| Producer-Consumer | 생산과 소비 속도 분리 | bounded `BlockingQueue` | Stream, 제한된 MQ/Worker queue |
| Read-Write Lock | 읽기 병렬, 쓰기 배타 | `ReentrantReadWriteLock` | 공유 메모리가 아니면 DB/분산 동시성 제어 |
| Thread Per Message | 작업마다 실행 단위 생성 | virtual thread per task 등 | 요청마다 Worker 생성은 피하고 pool 사용 |
| Worker Thread | 고정 워커가 queue 소비 | `ExecutorService` | Worker pool, BullMQ/Kafka worker |
| Future | 미래 결과와 완료 상태 | `Future`, `CompletableFuture` | Promise |
| Thread-Specific Storage | 실행 문맥별 상태 격리 | `ThreadLocal` | `AsyncLocalStorage` |

패턴 이름을 구현으로 외우지 않는다. 기다릴지 거절할지, queue를 어디서 제한할지, 결과와 취소를 누가 소유할지를 결정하는 도구로 쓴다.

## Lock, Spin과 Lock-Free

- 일반 lock은 획득하지 못한 실행 주체를 대기시킨다. 임계 구역은 짧게 유지하고 I/O를 넣지 않는다.
- spin lock은 잠금이 풀릴 때까지 CPU로 반복 확인한다. 짧은 대기가 측정으로 확인된 저수준 코드가 아니라면 CPU 낭비가 크다.
- lock-free는 CAS 같은 atomic 연산을 사용해 전체 시스템 차원의 진행을 보장하는 알고리즘 속성이다. CAS 사용 자체가 올바른 lock-free 설계를 보장하지 않는다.
- wait-free는 각 작업이 유한 단계 안에 끝나는 더 강한 보장이다. spin lock은 busy-wait 잠금이므로 lock-free로 분류하지 않는다.

애플리케이션에서는 검증된 concurrent collection, queue와 lock을 우선한다. 직접 구현하면 ABA, 기아, 재시도 폭증과 메모리 순서까지 함께 증명해야 한다.

## 요청 문맥과 Thread-Specific Storage

Java `ThreadLocal`은 물리 스레드에 값을 묶는다. 풀 스레드를 재사용하므로 요청 종료 시 `remove()`가 필요하다.

Node `AsyncLocalStorage`는 스레드가 아니라 callback과 Promise 체인을 따라 store를 전파한다. NestJS에서는 middleware에서 `run(store, next)`로 요청 수명을 감싸 REQUEST scope의 대안으로 쓸 수 있다. 암시적 문맥이 커질수록 의존성이 숨으므로 request ID, tenant ID, transaction handle처럼 범위를 좁힌다.

## 협력적 취소와 Graceful Shutdown

1. 새 요청과 새 작업을 받지 않는다.
2. queue와 진행 중 작업이 제한 시간 안에 끝나도록 기다린다.
3. 남은 작업에 취소 신호를 보낸다.
4. 연결, 파일과 lock을 `finally`에서 정리한다.

Java interrupt와 Node `AbortSignal` 모두 협력적 취소다. 신호를 확인하거나 해당 signal을 지원하는 작업만 중단된다. Node의 `AbortController`는 선택된 Promise 기반 API에 취소를 알리며 임의의 Promise를 강제로 종료하지 않는다.

## Deadlock과 운영 안전장치

이벤트 루프 자체에는 전통적 스레드 lock deadlock이 드물지만 Worker 공유 메모리, DB transaction과 분산 lock에서는 발생한다.

- 여러 lock을 얻는 순서를 하나로 고정한다.
- lock 획득과 외부 호출에 timeout을 둔다.
- 작업 실패와 취소 경로에서도 `finally`로 lock을 해제한다.
- queue depth, 거절 수, event loop lag, Worker 사용률과 lock wait를 함께 관측한다.
- timeout은 원자적 rollback이 아니다. 일부 성공이 가능한 작업에는 transaction이나 보상 동작이 필요하다.

## 출처

- [The Node.js Event Loop — Node.js](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Worker Threads — Node.js API](https://nodejs.org/api/worker_threads.html)
- [AsyncLocalStorage — Node.js API](https://nodejs.org/api/async_context.html)
- [AbortController — Node.js API](https://nodejs.org/api/globals.html#class-abortcontroller)
- [Async Local Storage — NestJS](https://docs.nestjs.com/recipes/async-local-storage)
- [Java Language Specification 17, Threads and Locks — Oracle](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html)
- [Process와 Thread는 무엇일까? — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178836)
- [Thread 흐름을 어떻게 컨트롤 하지? — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178837)
- [Producer-Consumer — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178842)
- [Read-Write Lock — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178843)
- [Thread Per Message — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178844)
- [Worker Thread — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178854)
- [Future — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178855)
- [Thread-Specific Storage — 모영철 강사](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178856)

## 관련 문서

- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Concurrency-and-Process|동시성과 프로세스]]
- [[Event-Loop|Node.js Event Loop]]
- [[Worker-Threads-Core|Worker Threads 핵심]]
- [[Backpressure|Backpressure]]
- [[Injection-Scopes|NestJS Injection Scopes]]
