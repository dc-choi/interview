---
tags: [runtime, concurrency, async, threads, virtual-threads, structured-concurrency]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Async vs Threads", "async/await vs 스레드", "가상 스레드", "Function Coloring"]
---

# async/await vs 스레드: 동시성 모델 비교

async/await의 비용과 **가상 스레드 + 구조적 동시성 + 채널** 모델을 비교한다. 어느 모델이 더 나은지는 런타임 지원, I/O API, 취소와 백프레셔 요구에 따라 달라진다. 가상 스레드는 일부 서버 워크로드에서 blocking style을 유지하면서 높은 동시성을 얻는 대안이지 async/await의 보편적 대체재는 아니다.

## 왜 async/await가 도입되었는가 (언어별 배경)

같은 키워드를 쓰지만 도입 동기는 다 다르다.

| 언어 | 도입 배경 |
|---|---|
| **JavaScript** | 단일 스레드라 블로킹이 곧 UI 멈춤 → 콜백 지옥 해소가 목적 |
| **Python** | 기본 CPython의 GIL 아래에서는 CPU-bound Python bytecode의 멀티코어 병렬성이 제한됨. async I/O는 많은 대기 작업을 스레드 점유 없이 처리하는 선택지 |
| **C#** | UI 스레드 블로킹 방지 → I/O-bound 비동기 API 대기는 `async`/`await`로 호출자 블로킹을 피하고, CPU 작업은 `Task.Run` 등으로 명시적으로 이관 |
| **Rust** | 런타임을 최소화하려는 설계 원칙 → OS 스레드보다 가벼운 스케줄링 추상화 필요 |

**공통 패턴**: I/O 대기마다 OS 스레드를 계속 점유하지 않고 많은 작업을 함께 진행하기 위한 추상화다. CPU 작업의 병렬 실행에는 여전히 스레드나 프로세스 같은 실행 자원이 필요하다.

## async/await에서 따져볼 4가지 비용

### 1. 컬러 함수 (Function Coloring)

비동기 함수를 호출하는 것 자체는 동기 함수에서도 가능하다. 다만 그 결과를 같은 호출 경로에서 `await`하려면 언어별 `async` 또는 `suspend` 문맥으로 전파되는 경우가 많다. 라이브러리 하나만 비동기로 바뀌어도 호출 트리 일부가 물들 수 있고, 이 제약이 함수 색깔 문제다.

### 2. 백프레셔 부재

용량이 제한된 스레드 풀 큐나 blocking write는 제출자를 막아 백프레셔를 만들 수 있다. 반면 unbounded 큐와 async task 생성은 둘 다 작업을 계속 쌓을 수 있다. 모델과 관계없이 세마포어, bounded channel, `highWaterMark` 같은 용량 제한과 포화 정책을 명시해야 한다.

### 3. 취소와 기한 전파

프로세스는 OS 신호로 종료할 수 있지만, 실행 중인 스레드 하나를 안전하게 강제 종료하는 것은 일반적인 취소 방법이 아니다. 스레드와 async 작업 모두 cooperative cancellation, deadline과 자원 정리가 필요하다. 완료 신호가 오지 않는 Promise/Future도 외부 timeout이나 취소 전파가 없으면 계속 대기할 수 있다.

### 4. 콜 스택 손실

스레드는 현재 물리 콜 스택을 남기므로 core dump, debugger와 profiler가 실행 위치를 추적하기 쉽다. async/await는 대기 지점에서 물리 스택이 풀려 비동기 호출 관계가 끊길 수 있지만, V8의 async stack trace나 런타임의 task introspection이 논리 프레임을 일부 복원한다. 도구가 지원하지 않는 경계와 컨텍스트 전파 누락은 여전히 디버깅과 프로파일링을 어렵게 만든다.

## 그래서 무엇이 대안인가

### 가상 스레드 (Virtual / Green Threads)

런타임이 가벼운 사용자 영역 스레드를 소수의 OS carrier thread에 다중화하면 작업당 스레드 비용을 낮추면서 blocking style을 유지할 수 있다. CPU 병렬성 자체가 늘어나는 것은 아니며, 런타임과 라이브러리가 blocking 지점을 제대로 지원해야 한다.
- **Java Project Loom** (가상 스레드, JDK 21+)
- **Go goroutine**
- **Erlang/Elixir 프로세스**
- **Kotlin 코루틴 + Dispatchers** (`suspend` 함수 색깔은 남는다)

Java 가상 스레드, Go goroutine과 Erlang/Elixir 프로세스는 블로킹처럼 보이는 코드를 그대로 쓰면서 함수 색깔을 만들지 않는다. Kotlin 코루틴은 `suspend` 함수를 다른 suspending 함수에서만 호출할 수 있으므로 함수 색깔이 남는다.

### 구조적 동시성 (Structured Concurrency)

작업의 수명을 코드 블록 단위로 묶는다. 구조적 스코프가 추적하는 자식은 스코프 완료 전에 join 또는 cancel되고, 실패 전파와 형제 취소 방식은 구현과 선택한 정책을 따른다.
- 부모 스코프는 추적 중인 자식 작업이 정리될 때까지 완료되지 않음
- 일부 정책은 자식 실패 시 형제 작업을 취소하고 실패를 부모로 전파
- detached task나 스코프 밖 자원은 자동 관리 대상이 아니므로 작업 누수 가능성을 줄이지만 없애지는 않음

대표 구현: Python `Trio`, Java 26의 preview API인 `StructuredTaskScope`, Kotlin `coroutineScope`. 구체적인 실패와 취소 정책, Java API 상태는 사용하는 버전에서 확인한다.

### 채널 (Channel) 기반 메시지 전달

공유 메모리 + 락 대신, **불변 메시지를 큐로 주고받는다**. 프로듀서, 컨슈머의 자연스러운 백프레셔(채널 capacity)가 따라온다.
- Go의 `chan T`, Erlang 메시지 박스, Rust `mpsc`, Kotlin `Channel`
- "공유 메모리로 통신하지 말고, 통신으로 메모리를 공유하라" (Go 격언)

## Node.js 개발자에게 주는 시사점

Node.js는 단일 스레드 + 이벤트 루프라 **async/await에서 벗어나기 어렵다.** 그러나 위 4대 문제는 그대로 적용된다.

| 문제 | Node.js에서의 완화책 |
|---|---|
| 컬러 함수 | 회피 불가. 단, Top-level await로 진입점만이라도 단순화 |
| 백프레셔 부재 | **Stream API + highWaterMark**, `p-limit`/`p-queue`로 동시성 제한 |
| 취소와 기한 전파 | 지원하는 API에는 **`AbortSignal` + 타임아웃** 적용. `Promise.race`는 기다리는 시간만 제한하므로 원래 작업의 취소와 정리를 별도로 연결 |
| 콜 스택 손실 | V8은 지원하는 `await` 지점의 async stack frame을 복원한다. 실제 범위는 Node.js와 V8 버전에 따라 확인하고, `Error.stackTraceLimit`, `AsyncLocalStorage`/`AsyncResource`와 Sentry/OpenTelemetry로 경계 간 컨텍스트를 보완 |

CPU 바운드는 **Worker Threads**로, I/O 바운드는 **이벤트 루프**로 명확히 분리하는 것도 같은 맥락.

## 주의: async가 항상 나쁘다는 아님

**브라우저와 Node.js의 JavaScript 메인 스레드**, 그리고 Python처럼 I/O 대기를 coroutine으로 다루는 환경에서는 async가 여전히 합리적 선택이다. CPython의 GIL이 Python bytecode의 동시 실행을 제한하더라도 Python 자체가 단일 스레드 환경이라는 뜻은 아니다. 비판의 핵심은 두 가지다.

1. async/await를 택하면 취소, 백프레셔와 관측 가능성을 런타임과 애플리케이션이 어디까지 제공하는지 확인한다
2. 가상 스레드를 지원하는 런타임에서는 blocking style과 async style을 실제 처리량, 지연과 디버깅 비용으로 비교한다

## 면접 체크포인트

- **컬러 함수 문제**를 한 문장으로 설명할 수 있는가
- **가상 스레드(Project Loom, goroutine)와 OS 스레드의 차이**를 말할 수 있는가
- **구조적 동시성**이 해결하는 문제는 무엇인가 (작업 누수, 에러 전파)
- Node.js에서 **백프레셔 누락** 시 어떤 장애가 생기는가 (메모리 폭증, OOM)
- async/await의 **콜 스택 손실**을 디버깅에서 어떻게 완화하는가
- **채널 vs 공유메모리+락**의 트레이드오프를 설명할 수 있는가

## 출처
- [요즘IT — 실전 교훈: 비동기/대기보다 스레드가 유리한 이유 (Armin Ronacher 번역)](https://yozm.wishket.com/magazine/detail/2918/)
- [Microsoft Learn, Asynchronous programming scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [Microsoft Learn, Common async/await bugs](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/common-async-bugs)
- [Python Documentation, Global interpreter lock](https://docs.python.org/3/glossary.html#term-global-interpreter-lock)
- [OpenJDK, JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Oracle Java SE 26, Structured Concurrency](https://docs.oracle.com/en/java/javase/26/core/structured-concurrency.html)
- [Kotlin Language Specification, Suspending functions](https://kotlinlang.org/spec/asynchronous-programming-with-coroutines.html#suspending-functions)
- [Zero-cost async stack traces — V8](https://v8.dev/blog/fast-async)

## 관련 문서
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Async-Internals|비동기 내부 동작 (async/await 메커니즘)]]
- [[Backpressure|Backpressure (스트림 배압)]]
- [[Async-IO|Async I/O]]
- [[Worker-Threads|워커 스레드]]
- [[Promise-Async|Promise와 Async]]
