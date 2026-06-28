---
tags: [os, runtime, concurrency, async, blocking, interview]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Sync Async Blocking", "Blocking Non-Blocking Sync Async", "동기, 비동기, 블로킹, 논블로킹"]
---

# 동기, 비동기, 블로킹, 논블로킹

자주 섞여 쓰이지만 **제어권 반환 시점**과 **결과 처리 주체**라는 서로 다른 축을 가진 독립 개념이다. 네 가지 조합(2×2)을 명확히 구분해야 이벤트 루프, 스레드 모델, I/O 설계를 오해 없이 설명할 수 있다.

## 두 축의 정의

| 축 | 관점 | 구분 |
|---|---|---|
| **Blocking / Non-Blocking** | 호출 시 **제어권이 언제 돌아오는가** | Blocking: 작업 끝날 때까지 호출자 멈춤 / Non-Blocking: 즉시 반환 |
| **Synchronous / Asynchronous** | **결과를 누가 처리하고 이어서 실행하는가** | Sync: 호출자가 결과를 직접 받아 이어서 처리 / Async: 호출된 쪽(또는 이벤트 루프)이 완료 시점에 콜백, 알림으로 처리 |

두 축은 독립이다. "Non-Blocking ≠ Async" — 제어권은 바로 돌아왔지만 호출자가 폴링으로 상태를 계속 확인하면 그건 여전히 Sync다.

Sync/Async는 **작업 수행 순서 보장** 축으로 보면 더 분명하다. Sync는 현재 작업의 완료(응답)와 다음 작업의 시작(요청) 타이밍을 맞춰 순서를 보장하고, 호출자가 하위 작업의 종료 시점을 계속 추적한다. Async는 그 타이밍을 풀어 완료 순서를 보장하지 않으며, 호출자는 종료 시점을 추적하지 않고 콜백, 알림에 위임한다. Blocking/Non-Blocking은 그 사이 호출자가 유휴 상태인지(다른 일을 할 수 있는지)의 축이라 서로 직교한다.

## 2×2 조합

### 1. Sync + Blocking (가장 직관적)

- 호출자가 멈추고 결과를 직접 받아 이어간다
- 예: `fs.readFileSync()`, JDBC 일반 쿼리, 파이썬 `requests.get()`
- 장점: 코드가 순차적이라 읽기 쉬움
- 단점: I/O 대기 동안 스레드가 유휴. 요청당 스레드 모델에서만 실용적

### 2. Sync + Non-Blocking

- 호출은 즉시 반환하지만 결과 확인은 호출자 몫 → **폴링**
- 예: `O_NONBLOCK` 소켓에서 `read()`가 `EAGAIN`을 반환하면 호출자가 재시도
- 장점: 블로킹 없이 다른 일 가능
- 단점: 폴링 간격 튜닝이 어렵고 CPU 낭비. 드물게 사용

### 3. Async + Non-Blocking (현대 서버의 기본)

- 호출은 즉시 반환, 완료 시 **콜백/Promise/이벤트**로 결과 전달
- 예: Node.js의 논블로킹 I/O(libuv + epoll, kqueue, IOCP), Netty, Kotlin 코루틴
- 장점: 소수의 스레드로 수만 커넥션 유지 가능
- 단점: 제어 흐름이 비선형 — 콜백 지옥, 컬러 함수, 디버깅 난도

### 4. Async + Blocking

두 얼굴이 있다.

- **의도적 — I/O 다중화(I/O multiplexing)**: 저수준 OS 모델의 정통 사례다. 호출자를 일부러 블로킹해 두고, 그 블로킹 한 번으로 **여러 FD의 완료를 한꺼번에 비순차로 감시**한다. POSIX `select`/`poll`이 대표인데, 감시할 FD 집합과 타임아웃을 넘기면 그동안 프로세스를 멈춘 채 읽기, 쓰기, 예외 이벤트를 지켜보다가, 이벤트가 난 FD 개수를 돌려주며 블로킹이 풀린다. 동기 블로킹 I/O의 직관적 흐름을 유지하면서도 다중 I/O를 한 스레드로 처리하려는 절충이다. 다만 깨어날 때마다 전체 FD 집합을 훑어야 해(O(n)) 성능은 낮고, 그래서 `epoll`/`kqueue`/IOCP 기반 Async+Non-Blocking(3번)으로 발전했다.
- **비의도적 — 설계 실수**: 논블로킹을 기대하고 Async API를 썼지만 제어권이 돌아오지 않는 경우. 예로 이벤트 루프 스레드에서 `await` 사이에 CPU 집약 연산을 끼워 넣어 실제로는 루프가 멈춘다.

핵심은 비동기(완료를 비순차로 수신)와 블로킹(그동안 호출자는 멈춤)이 독립 축이라 공존할 수 있다는 점이다.

## 흔한 오해 바로잡기

- **"Async면 빠르다"** — 아니다. 싱글 요청 지연은 Sync가 더 짧을 수도 있다. Async의 이득은 **동시성(처리량)** 이지 개별 응답 시간이 아님
- **"Non-Blocking이면 Async"** — 폴링 기반 Non-Blocking은 여전히 Sync. 두 축 독립
- **"Blocking은 항상 나쁘다"** — 요청당 스레드 모델이나 배치 작업에서는 오히려 단순해서 좋음. 선택의 문제
- **"Callback이면 Async"** — 콜백이 **같은 스택에서 즉시 호출**되면 Sync. 이벤트 루프를 거쳐 나중에 호출될 때만 Async

## 런타임별 선택

| 런타임 | 기본 모델 | 이유 |
|---|---|---|
| **Node.js** | Async + Non-Blocking | 싱글 스레드 → 블로킹 시 전체 정지 |
| **Java(전통)** | Sync + Blocking (요청당 스레드) | OS 스레드가 충분히 저렴하다고 가정 |
| **Java(Loom)** | Sync 코드가 실제로는 Async | 가상 스레드가 yield 지점 자동 관리 |
| **Go** | Sync 코드 + goroutine + 런타임 스케줄링 | 사용자 코드는 블로킹처럼 보이게 |
| **Nginx, Netty** | Async + Non-Blocking | 이벤트 드리븐 리액터 |

## 면접 체크포인트

- **두 축이 독립**이라는 것과 4가지 조합 예시
- Sync 축을 작업 순서 보장과 종료 시점 추적 주체로 설명할 수 있는가
- Sync/Non-Blocking이 폴링 기반이고 왜 드문지
- Node.js가 Async/Non-Blocking을 기본으로 하는 이유
- Async/Non-Blocking에서 이벤트 루프 블로킹이 일어나는 시나리오(CPU 집약)
- Async+Blocking의 정통 사례가 I/O 다중화(select/poll)이고, epoll/kqueue로 발전한 이유
- 가상 스레드(Loom, goroutine)가 이 모델을 어떻게 바꾸는가

## 출처
- [jh-7 — Blocking, Non-blocking, Sync, Async의 차이](https://jh-7.tistory.com/25)
- [동기(Synchronous)는 정확히 무엇을 의미하는걸까? — evan-moon](https://evan-moon.github.io/2019/09/19/sync-async-blocking-non-blocking/)

## 관련 문서
- [[Async-IO|Async I/O]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Concurrency-and-Process|동시성과 프로세스]]
