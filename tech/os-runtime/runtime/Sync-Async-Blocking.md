---
tags: [os, runtime, concurrency, async, blocking, interview]
status: done
verified_at: 2026-08-26
category: "OS&런타임(OS&Runtime)"
aliases: ["Sync Async Blocking", "Blocking Non-Blocking Sync Async", "동기, 비동기, 블로킹, 논블로킹"]
---

# 동기, 비동기, 블로킹, 논블로킹

자주 섞여 쓰이지만 **개별 호출이 기다리는 방식**과 **완료를 전달하는 계약**이라는 서로 다른 층위의 개념이다. I/O API, 커널 대기, 애플리케이션 continuation 중 어느 층을 말하는지 먼저 정해야 이벤트 루프와 스레드 모델을 정확히 설명할 수 있다.

## 두 축의 정의

| 축 | 관점 | 구분 |
|---|---|---|
| **Blocking / Non-Blocking** | 특정 호출이 **대기하는가** | Blocking: I/O가 진행되거나 완료될 때까지 현재 스레드가 기다릴 수 있음 / Non-Blocking: 현재 상태를 즉시 반환, 준비되지 않았으면 `EAGAIN` 등으로 알림 |
| **Synchronous / Asynchronous** | **완료 결과의 전달 계약** | Sync: 반환 경로로 결과를 받음 / Async: 나중에 callback, event, future 같은 완료 알림으로 받음 |

두 축은 독립이다. Non-Blocking 호출 뒤 호출자가 상태를 폴링하면 완료 전달은 여전히 동기적일 수 있다. 반대로 비동기 future의 `get()`은 현재 스레드를 block할 수 있고, `await`는 보통 continuation을 suspend한다. 둘을 같은 blocking으로 부르지 말고 API와 scheduler 층을 구분한다. Sync/Async 자체는 작업의 실행 순서나 완료 순서를 보장하지 않는다. 필요한 순서는 `await`, join, queue, lock 같은 별도 동기화로 만든다.

## 대표 API 조합과 레이어 사례

### 1. Sync + Blocking (가장 직관적)

- 호출자가 멈추고 결과를 직접 받아 이어간다
- 예: `fs.readFileSync()`, JDBC 일반 쿼리, 파이썬 `requests.get()`
- 장점: 코드가 순차적이라 읽기 쉬움
- 단점: 실행 흐름이 I/O 완료까지 멈춘다. 플랫폼 스레드 기반 모델은 대기 동안 스레드를 점유하고, 가상 스레드는 지원되는 I/O에서 carrier를 비울 수 있다. 동시 요청 서버에서는 어느 모델이든 하위 커넥션 풀과 자원 한도를 관리해야 한다

### 2. Sync + Non-Blocking

- 호출은 즉시 반환하지만 결과 확인은 호출자 몫 → **폴링**
- 예: `O_NONBLOCK` 소켓에서 `read()`가 `EAGAIN`을 반환하면 호출자가 재시도
- 장점: 블로킹 없이 다른 일 가능
- 단점: 폴링 간격 튜닝이 어렵고 CPU 낭비. 드물게 사용

### 3. 호출자 관점의 Async 완료와 즉시 반환

- 호출은 즉시 반환, 완료 시 **콜백/Promise/이벤트**로 결과 전달
- 네트워크 readiness를 쓰는 이벤트 루프는 실제 I/O도 non-blocking으로 처리할 수 있다. 반면 Node.js의 일부 파일 I/O와 DNS API는 worker pool의 blocking 호출로 구현되지만 JavaScript 호출자에게는 비동기 완료를 전달한다
- 코루틴의 `suspend`도 호출자 스레드를 점유하지 않는다는 뜻이지, 하위 I/O 구현까지 non-blocking이라는 증거는 아니다
- 장점: readiness 기반 I/O에서는 적은 수의 이벤트 루프 스레드로 많은 연결을 다중화할 수 있음
- 단점: 제어 흐름이 비선형 — 콜백 지옥, 컬러 함수, 디버깅 난도

### 4. 이벤트 루프에서 대기와 알림을 분리하기

`select`, `poll`, `epoll`, `kqueue`는 파일 디스크립터의 **readiness**를 알려 주는 API다. `select`나 `epoll_wait()` 자체는 이벤트가 생길 때까지 block할 수 있지만, 이는 이벤트 루프가 대기하는 호출이다. 준비된 FD에 실제 I/O를 수행할 때는 보통 non-blocking 모드와 함께 사용한다.

IOCP처럼 완료를 알리는 **completion** 모델은 readiness 모델과 다르다. 따라서 `epoll`이 IOCP로 발전했다거나 둘을 하나의 Async+Non-Blocking 칸으로 묶으면 계층이 섞인다. Node.js 같은 런타임은 OS readiness 또는 completion 알림과 worker pool을 조합해 JavaScript API에는 비동기 완료를 전달한다.

## 흔한 오해 바로잡기

- **"Async면 빠르다"** — 자동으로 그렇지 않다. 주된 이점은 대기 작업을 겹쳐 동시성과 처리량을 높이는 것이며, 한 요청 안의 독립 I/O를 겹치면 지연도 줄 수 있지만 순차 의존 작업은 그대로다
- **"Non-Blocking이면 Async"** — 폴링 기반 Non-Blocking은 여전히 Sync. 두 축 독립
- **"Blocking은 항상 나쁘다"** — 요청당 스레드 모델이나 배치 작업에서는 오히려 단순해서 좋음. 선택의 문제
- **"Callback이면 Async"** — 콜백이 **같은 스택에서 즉시 호출**되면 Sync. 이벤트 루프, 다른 스레드나 완료 큐를 통해 나중에 호출될 때 Async 완료 계약이 된다

## 런타임별 선택

| 런타임 | 기본 모델 | 이유 |
|---|---|---|
| **Node.js** | JavaScript API는 비동기 완료 중심 | 메인 이벤트 루프를 오래 block하지 않고, OS 알림과 worker pool을 사용 |
| **Java(전통)** | 동기식 blocking API와 요청당 스레드 풀이 흔함 | 스레드 수, I/O 대기를 운영에서 관리 |
| **Java 가상 스레드** | 동기식 blocking 코드를 유지 | 지원되는 blocking I/O에서 virtual thread를 unmount해 carrier를 비움. 비동기 API로 바꾸는 것은 아님 |
| **Go** | 동기식처럼 보이는 goroutine 코드 | 런타임 스케줄링을 별도 층으로 봄 |
| **Nginx, Netty** | 이벤트 루프와 readiness 기반 I/O를 주로 사용 | API와 커널 대기 층을 구분해 설명 |

## 면접 체크포인트

- **두 축이 독립**이라는 것과 대표 API 조합 예시
- 호출의 대기 방식과 완료 전달 계약을 서로 다른 층위로 설명할 수 있는가
- Sync/Non-Blocking이 폴링 기반이고 왜 드문지
- Node.js가 Async/Non-Blocking을 기본으로 하는 이유
- Async/Non-Blocking에서 이벤트 루프 블로킹이 일어나는 시나리오(CPU 집약)
- readiness(select/poll/epoll/kqueue)와 completion(IOCP)의 차이, `epoll_wait()`가 block할 수 있다는 점
- 가상 스레드가 동기식 API의 의미를 유지한 채 carrier를 비우는 조건과 한계

## 출처
- [동기 vs 비동기 — YouTube, 코딩하는기술사](https://www.youtube.com/watch?v=SI5CLk-fXFU)
- [jh-7 — Blocking, Non-blocking, Sync, Async의 차이](https://jh-7.tistory.com/25)
- [동기(Synchronous)는 정확히 무엇을 의미하는걸까? — evan-moon](https://evan-moon.github.io/2019/09/19/sync-async-blocking-non-blocking/)
- [Linux man-pages, epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Linux man-pages, epoll_wait(2)](https://man7.org/linux/man-pages/man2/epoll_wait.2.html)
- [Node.js, Don't Block the Event Loop or the Worker Pool](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [OpenJDK, JEP 444: Virtual Threads](https://openjdk.org/jeps/444)

## 관련 문서
- [[Async-IO|Async I/O]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Concurrency-and-Process|동시성과 프로세스]]
