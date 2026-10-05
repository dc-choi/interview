---
tags: [os, runtime, concurrency, async, blocking, interview]
status: done
verified_at: 2026-10-05
category: "OS&런타임(OS&Runtime)"
aliases: ["Sync Async Blocking", "Blocking Non-Blocking Sync Async", "동기, 비동기, 블로킹, 논블로킹", "Non-blocking I/O", "논블로킹 I/O", "비동기 프로그래밍"]
---

# 동기, 비동기, 블로킹, 논블로킹

자주 섞여 쓰이지만 **개별 호출이 기다리는 방식**과 **완료를 전달하는 계약**이라는 서로 다른 층위의 개념이다. I/O API, 커널 대기, 애플리케이션 continuation 중 어느 층을 말하는지 먼저 정해야 이벤트 루프와 스레드 모델을 정확히 설명할 수 있다.

## 두 축의 정의

| 축 | 관점 | 구분 |
|---|---|---|
| **Blocking / Non-Blocking** | 특정 호출이 **대기하는가** | Blocking: I/O가 진행되거나 완료될 때까지 현재 스레드가 기다릴 수 있음 / Non-Blocking: 현재 상태를 즉시 반환, 준비되지 않았으면 `EAGAIN` 등으로 알림 |
| **Synchronous / Asynchronous** | **완료 결과의 전달 계약** | Sync: 반환 경로로 결과를 받음 / Async: 나중에 callback, event, future 같은 완료 알림으로 받음 |

두 축은 독립이다. Non-Blocking 호출 뒤 호출자가 상태를 폴링하면 완료 전달은 여전히 동기적일 수 있다. 반대로 비동기 future의 `get()`은 현재 스레드를 block할 수 있고, `await`는 보통 continuation을 suspend한다. 둘을 같은 blocking으로 부르지 말고 API와 scheduler 층을 구분한다. Sync/Async 자체는 작업의 실행 순서나 완료 순서를 보장하지 않는다. 필요한 순서는 `await`, join, queue, lock 같은 별도 동기화로 만든다.

## OS 수준에서 본 블로킹과 논블로킹 I/O

- **블로킹 `read()`**: 시스템 콜로 커널에 들어간 스레드는 데이터가 준비될 때까지 대기 상태가 되고, 커널이 데이터를 사용자 버퍼로 복사한 뒤에야 돌아온다. 그동안 CPU는 다른 스레드를 실행한다 ([[Process-Lifecycle#상태 전이를 일으키는 시스템 콜과 인터럽트|상태 전이 흐름]]).
- **소켓 버퍼**: 소켓마다 커널에 수신 버퍼와 송신 버퍼가 있다. 블로킹 소켓의 `read()`는 수신 버퍼에 데이터가 들어올 때까지, `write()`는 송신 버퍼에 쓸 공간이 생길 때까지 기다린다.
- **논블로킹 모드(`O_NONBLOCK`)**: 기다려야 할 상황이면 `-1`을 반환하고 `errno`를 `EAGAIN` 또는 `EWOULDBLOCK`으로 설정한다. 소켓에서는 POSIX가 둘 중 어느 쪽이든 허용하므로 두 값을 모두 처리한다. `write()`는 요청보다 적게 쓰고도 성공할 수 있어 남은 바이트를 이어서 써야 한다.
- **정규 파일**: Linux에서 `O_NONBLOCK`은 정규 파일과 블록 장치에 효과가 없어, 디스크 접근이 필요하면 잠시 블로킹된다. 파일 I/O를 이벤트 루프 밖으로 빼려면 스레드 풀이나 `io_uring` 같은 별도 경로가 필요하다 ([[Epoll-Kqueue|epoll, kqueue]]).

## 논블로킹 I/O의 완료를 확인하는 방법

논블로킹 호출은 바로 돌아오므로 작업이 언제 끝났는지 알아낼 방법이 따로 필요하다.

| 방식 | 동작 | 비용과 한계 |
|---|---|---|
| 반복 확인(폴링) | 논블로킹 `read()`를 주기적으로 다시 호출 | 준비된 시점과 확인 시점 사이의 지연, 연결마다 반복되는 확인으로 CPU 낭비 |
| I/O 멀티플렉싱 | `select`, `poll`, `epoll`, `kqueue`에 여러 fd를 등록하고 준비된 fd만 통지받아 읽음 | 대기 호출 자체는 블로킹일 수 있고, 실제 읽기와 쓰기는 애플리케이션이 직접 한다(readiness) |
| 시그널, 콜백 | POSIX AIO(`aio_read` 등)가 완료를 시그널이나 새 스레드의 함수 호출로 알림 | Linux의 POSIX AIO는 glibc가 사용자 공간 스레드로 구현해 확장성이 낮다 |
| 완료 큐 | Linux `io_uring`(5.1 이상)의 제출, 완료 큐나 Windows IOCP가 끝난 작업을 알림 | readiness가 아니라 completion 모델이다 |

블로킹 모드로 소켓 하나를 읽으며 기다리는 스레드는 다른 소켓에 이미 도착한 요청을 처리하지 못한다. 그래서 연결이 많은 서버는 멀티플렉싱으로 준비된 소켓만 골라 읽고, 무거운 처리는 스레드 풀에 넘기기도 한다. 어느 방식이든 핵심은 I/O가 끝나기 전에도 스레드가 다른 일을 하게 해서 CPU와 I/O를 겹치는 것이다. 멀티플렉싱 API별 비용 차이(`select`, `poll`의 매 호출 fd 집합 복사와 전체 스캔, `epoll`의 커널 상주 등록)는 [[Epoll-Kqueue|epoll, kqueue]]에서 다룬다.

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

## 2×2 표에서 멀티플렉싱의 자리

2006년 IBM developerWorks 글 Boost application performance using asynchronous I/O는 Linux I/O 모델을 동기, 비동기와 블로킹, 논블로킹의 2×2 행렬로 정리했다. 이 행렬에서 결과를 호출자가 반복 확인하는 논블로킹 read는 동기 논블로킹, 완료를 시그널이나 콜백으로 받는 AIO는 비동기 논블로킹이고, I/O를 논블로킹으로 설정한 뒤 블로킹되는 `select`로 알림을 기다리는 모델은 비동기 블로킹으로 분류된다.

이 칸은 기준에 따라 다르게 읽힌다.

- 완료 전달 계약을 기준으로 보면 멀티플렉싱은 준비 여부만 알려 주고 데이터 읽기와 결과 처리는 호출자가 직접 하므로 동기에 가깝다.
- 블로킹 여부도 대기 호출의 timeout과 사용 방식에 따라 달라지고, 준비된 fd에 대한 실제 `read()`는 보통 논블로킹 fd로 수행해 기다리지 않는다.
- POSIX는 요청한 스레드를 I/O 완료까지 붙잡는 연산을 동기 I/O, 그 자체로는 붙잡지 않아 스레드와 I/O가 함께 진행될 수 있는 연산을 비동기 I/O로 정의하고, 비동기 I/O 인터페이스로 `aio_*`를 둔다. 이 정의에서는 동기, 비동기가 블로킹 여부와 같은 축에 놓인다.

표의 칸을 외우기보다 자신이 쓰는 기준(대기 방식인지 완료 전달 계약인지, 어느 계층의 호출인지)을 먼저 밝히고 분류한다.

## 흔한 오해 바로잡기

- **"Async면 빠르다"** — 자동으로 그렇지 않다. 주된 이점은 대기 작업을 겹쳐 동시성과 처리량을 높이는 것이며, 한 요청 안의 독립 I/O를 겹치면 지연도 줄 수 있지만 순차 의존 작업은 그대로다
- **"Non-Blocking이면 Async"** — 폴링 기반 Non-Blocking은 여전히 Sync. 두 축 독립
- **"Blocking은 항상 나쁘다"** — 요청당 스레드 모델이나 배치 작업에서는 오히려 단순해서 좋음. 선택의 문제
- **"Callback이면 Async"** — 콜백이 **같은 스택에서 즉시 호출**되면 Sync. 이벤트 루프, 다른 스레드나 완료 큐를 통해 나중에 호출될 때 Async 완료 계약이 된다

## 비동기라는 말의 세 층위

| 층위 | 동기 | 비동기 |
|---|---|---|
| 프로그래밍 | 작업을 하나씩 순서대로 실행 | 서로 독립적인 작업을 겹쳐 실행 |
| I/O | 호출자가 완료까지 기다리거나 결과를 직접 챙김 | 완료를 통지나 콜백으로 받음. 블로킹 I/O를 다른 스레드에 맡겨 호출 스레드가 계속 진행하는 경우도 비동기 I/O라 부르기도 한다(위 Node.js 파일 I/O) |
| 서비스 간 통신 | 요청을 보내고 응답을 기다림(HTTP, RPC) | 메시지 큐에 넣고 바로 다음 일을 함 |

- **비동기 프로그래밍과 멀티스레딩은 다르다.** 비동기 프로그래밍은 독립적인 작업을 겹쳐 실행하도록 구성하는 방법이고, 실현 수단은 크게 둘이다. 여러 스레드가 작업을 나눠 맡는 멀티스레딩은 멀티코어를 쓰지만 스레드가 많아질수록 전환 비용과 경쟁 조건 관리 부담이 커진다. 논블로킹 I/O는 스레드 하나가 I/O를 걸어 두고 기다리는 동안 다른 CPU 작업을 진행해 적은 스레드로 많은 대기를 겹친다. 서버는 보통 둘을 조합해 적은 스레드로 처리량을 높인다.
- **예**: 요청 하나를 처리하며 DB 조회와 외부 API 호출이 서로 독립적이면, 스레드 하나가 두 I/O를 모두 걸어 두고 응답을 기다리는 동안 다른 계산을 한 뒤 두 결과를 합친다. 스레드를 늘리지 않아도 두 대기 시간이 겹친다.
- **서비스 간 비동기 통신**: 동기 호출 사슬에서는 가장 아래 서비스가 응답하지 못하면 기다리던 호출자가 차례로 묶여 장애가 위로 번질 수 있다. 메시지 큐를 사이에 두면 발행자는 응답을 기다리지 않으므로 소비자 장애가 발행자로 곧바로 번지지 않는다. 대신 즉시 결과가 필요한 조회에는 동기 API가 맞고, 큐 방식은 전달 보장, 중복 처리, 순서와 지연을 따로 설계해야 한다 ([[Messaging-Patterns|메시징 패턴]], [[External-Service-Resilience|외부 서비스 장애 대응]]).

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
- 소켓의 송신, 수신 버퍼 상태에 따라 블로킹이 일어나는 조건과 `EAGAIN`/`EWOULDBLOCK`, 부분 쓰기 처리
- 논블로킹 I/O의 완료 확인 방식(폴링, 멀티플렉싱, 시그널과 콜백, 완료 큐)과 각각의 비용
- 2×2 표에서 멀티플렉싱의 자리가 분류 기준에 따라 달라지는 이유
- 비동기 프로그래밍과 멀티스레딩의 차이, 서비스 간 비동기 통신의 이점과 대가

## 출처
- [동기 vs 비동기 — YouTube, 코딩하는기술사](https://www.youtube.com/watch?v=SI5CLk-fXFU)
- [jh-7 — Blocking, Non-blocking, Sync, Async의 차이](https://jh-7.tistory.com/25)
- [동기(Synchronous)는 정확히 무엇을 의미하는걸까? — evan-moon](https://evan-moon.github.io/2019/09/19/sync-async-blocking-non-blocking/)
- [Linux man-pages, epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Linux man-pages, epoll_wait(2)](https://man7.org/linux/man-pages/man2/epoll_wait.2.html)
- [Node.js, Don't Block the Event Loop or the Worker Pool](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [OpenJDK, JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Boost application performance using asynchronous I/O — IBM Developer, M. Tim Jones](https://developer.ibm.com/articles/l-async/)
- [Linux man-pages, read(2)](https://man7.org/linux/man-pages/man2/read.2.html)
- [Linux man-pages, write(2)](https://man7.org/linux/man-pages/man2/write.2.html)
- [Linux man-pages, open(2)](https://man7.org/linux/man-pages/man2/open.2.html)
- [Linux man-pages, socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)
- [Linux man-pages, aio(7)](https://man7.org/linux/man-pages/man7/aio.7.html)
- [Linux man-pages, io_uring(7)](https://man7.org/linux/man-pages/man7/io_uring.7.html)
- [Linux man-pages, syscalls(2)](https://man7.org/linux/man-pages/man2/syscalls.2.html)
- [POSIX.1-2024, Base Definitions: Definitions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html)
- [YouTube, 쉬운코드, block I/O vs non-block I/O와 I/O multiplexing](https://www.youtube.com/watch?v=mb-QHxVfmcs)
- [YouTube, 쉬운코드, 비동기 프로그래밍, 비동기 I/O, 비동기 커뮤니케이션](https://www.youtube.com/watch?v=EJNBLD3X2yg)

## 관련 문서
- [[Async-IO|Async I/O]]
- [[Epoll-Kqueue|epoll, kqueue (I/O 멀티플렉싱)]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Single-vs-Multi-Thread|Node.js 싱글 vs 멀티 스레드]]
- [[Concurrency-and-Process|동시성과 프로세스]]
