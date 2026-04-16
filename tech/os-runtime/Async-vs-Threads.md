---
tags: [runtime, concurrency, async, threads, virtual-threads, structured-concurrency]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Async vs Threads", "async/await vs 스레드", "가상 스레드", "Function Coloring"]
---

# async/await vs 스레드: 동시성 모델 비교

async/await가 대부분의 언어에서 좋은 동시성 추상화인지에 대한 의문과, 그 대안인 **가상 스레드 + 구조적 동시성 + 채널** 모델 정리. 핵심 명제: **OS 스레드 비용이 과대평가되어 async/await가 기본 동시성으로 채택됐지만, 가상 스레드가 실용적이 된 지금은 다른 선택지가 더 낫다.**

## 왜 async/await가 도입되었는가 (언어별 배경)

같은 키워드를 쓰지만 도입 동기는 다 다르다.

| 언어 | 도입 배경 |
|---|---|
| **JavaScript** | 단일 스레드라 블로킹이 곧 UI 멈춤 → 콜백 지옥 해소가 목적 |
| **Python** | GIL로 진짜 멀티코어 병렬이 어려워 I/O 동시성 대안이 필요 |
| **C#** | UI 스레드 블로킹 방지 → `async`로 작업을 자동으로 디스패치 |
| **Rust** | 런타임을 최소화하려는 설계 원칙 → OS 스레드보다 가벼운 스케줄링 추상화 필요 |

**공통 패턴**: 진짜 OS 스레드를 쓸 수 없거나 비싸기 때문에 만들어진 우회 메커니즘.

## async/await의 4대 문제

### 1. 컬러 함수 (Function Coloring)

**비동기 함수는 비동기 함수에서만 호출할 수 있다.** 어떤 함수를 `async`로 만들면 그것을 호출하는 함수, 그것을 호출하는 함수… 모두 `async`가 된다 (전염). 라이브러리 하나만 비동기로 바뀌어도 호출 트리 전체가 `async`로 물든다. 동기/비동기 두 색깔의 함수는 **서로 자유롭게 섞을 수 없다.**

### 2. 백프레셔 부재

스레드는 작업이 너무 빠르게 들어오면 **자연스럽게 막힌다** (스레드 풀 큐가 차거나, blocking write가 막힘). 반면 async 코드는 한 줄로 수천 개의 Promise/Future를 만들 수 있고, **하부 스트림이 못 따라가도 위에서 막아주지 않는다.** 명시적인 세마포어, 채널, highWaterMark 같은 도구를 직접 끼워 넣어야 한다.

### 3. 정지 문제 (Halt Problem)

스레드는 OS가 강제로 중단할 수 있다 (시그널, kill). **resolve되지 않는 Promise/Future는 영원히 대기한다.** await가 hang되는 순간 호출 트리 전체가 멈추고, 어느 await가 멈춘 건지 외부에서 식별하기 매우 어렵다.

### 4. 콜 스택 손실

스레드는 멈춰도 **완전한 콜 스택**을 가진다 → core dump, gdb, perf로 어디서 멈췄는지 즉시 보임. async/await는 함수가 await 지점에서 잘리고 콜백으로 변환되기 때문에 **실제 멈춰있는 위치의 의미 있는 스택이 없다.** 디버깅·프로파일링 난이도가 급격히 올라간다.

## 그래서 무엇이 대안인가

### 가상 스레드 (Virtual / Green Threads)

OS 스레드가 비싸서 못 만든다는 가정이 잘못됐다는 것. 런타임이 가벼운 사용자 영역 스레드를 다중화해 OS 스레드 위에서 돌리면 된다.
- **Java Project Loom** (가상 스레드, JDK 21+)
- **Go goroutine**
- **Erlang/Elixir 프로세스**
- **Kotlin 코루틴 + Dispatchers**

특징: **블로킹처럼 보이는 코드**를 그대로 쓰되, 런타임이 await 지점을 자동으로 yield 처리. 함수 색깔도 없고 콜 스택도 살아있다.

### 구조적 동시성 (Structured Concurrency)

작업의 수명을 코드 블록 단위로 묶는다. 블록을 벗어나기 전에 안에서 띄운 모든 작업이 끝나거나 취소되도록 보장.
- 부모 스코프 종료 = 모든 자식 작업 종료
- 에러 발생 시 형제 작업 자동 취소
- 누수되는 작업이 원천적으로 사라짐

대표 구현: Python `Trio`, Java `StructuredTaskScope`, Kotlin `coroutineScope`.

### 채널 (Channel) 기반 메시지 전달

공유 메모리 + 락 대신, **불변 메시지를 큐로 주고받는다**. 프로듀서·컨슈머의 자연스러운 백프레셔(채널 capacity)가 따라온다.
- Go의 `chan T`, Erlang 메시지 박스, Rust `mpsc`, Kotlin `Channel`
- "공유 메모리로 통신하지 말고, 통신으로 메모리를 공유하라" (Go 격언)

## Node.js 개발자에게 주는 시사점

Node.js는 단일 스레드 + 이벤트 루프라 **async/await에서 벗어나기 어렵다.** 그러나 위 4대 문제는 그대로 적용된다.

| 문제 | Node.js에서의 완화책 |
|---|---|
| 컬러 함수 | 회피 불가. 단, Top-level await로 진입점만이라도 단순화 |
| 백프레셔 부재 | **Stream API + highWaterMark**, `p-limit`/`p-queue`로 동시성 제한 |
| 정지 문제 | **`AbortSignal` + 타임아웃** 모든 외부 호출에 의무화, `Promise.race`로 deadline |
| 콜 스택 손실 | **`--async-stack-traces`** 활성화 (V8), Sentry/OpenTelemetry로 비동기 컨텍스트 추적 |

CPU 바운드는 **Worker Threads**로, I/O 바운드는 **이벤트 루프**로 명확히 분리하는 것도 같은 맥락.

## 주의: async가 항상 나쁘다는 아님

**단일 스레드 환경(브라우저, Node.js, Python GIL 하)** 에서는 async가 여전히 합리적 선택이다. 비판의 핵심은 두 가지다.

1. 언어 설계자가 **OS 스레드 비용을 과대평가**해서 async/await를 기본 동시성으로 채택했다
2. **가상 스레드가 실용적이 된 지금**, 후속 언어들은 async 키워드 대신 가벼운 스레드를 1급 시민으로 두는 게 낫다

## 면접 체크포인트

- **컬러 함수 문제**를 한 문장으로 설명할 수 있는가
- **가상 스레드(Project Loom, goroutine)와 OS 스레드의 차이**를 말할 수 있는가
- **구조적 동시성**이 해결하는 문제는 무엇인가 (작업 누수, 에러 전파)
- Node.js에서 **백프레셔 누락** 시 어떤 장애가 생기는가 (메모리 폭증, OOM)
- async/await의 **콜 스택 손실**을 디버깅에서 어떻게 완화하는가
- **채널 vs 공유메모리+락**의 트레이드오프를 설명할 수 있는가

## 출처
- [요즘IT — 실전 교훈: 비동기/대기보다 스레드가 유리한 이유 (Armin Ronacher 번역)](https://yozm.wishket.com/magazine/detail/2918/)

## 관련 문서
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Async-Internals|비동기 내부 동작 (async/await 메커니즘)]]
- [[Backpressure|Backpressure (스트림 배압)]]
- [[Async-IO|Async I/O]]
- [[Worker-Threads|워커 스레드]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
