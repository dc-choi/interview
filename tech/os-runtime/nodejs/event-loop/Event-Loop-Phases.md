---
tags: [runtime, nodejs, event-loop, libuv, phases]
status: done
verified_at: 2026-07-21
category: "OS & Runtime"
aliases: ["Event Loop Phases", "이벤트 루프 페이즈"]
---

# 이벤트 루프 — 페이즈와 실행 순서

libuv 소스 기반 페이즈 구조, nextTick, microtask 삽입 지점, 실행 순서 심화, 타이머 심화.

## libuv `uv_run` 소스코드
이벤트 루프의 실제 구현체. 각 페이즈를 순회하며 등록된 콜백을 처리한다.
Node.js 20(libuv 1.45.0) 이후 일반 반복의 타이머 처리는 poll 뒤에 실행된다. `UV_RUN_DEFAULT`로 처음 진입할 때는 기존 동작 호환을 위해 루프 앞에서 타이머를 한 번 처리할 수 있다. 아래 코드는 현재 libuv v1.x의 핵심 순서를 축약한 것으로, 세부 조건과 pending callback 반복 횟수는 원본 소스를 봐야 한다.
```c
if (mode == UV_RUN_DEFAULT && loop_alive) {
    uv__update_time(loop);
    uv__run_timers(loop);           // 최초 진입 호환 처리
}

while (r != 0 && loop->stop_flag == 0) {
    uv__run_pending(loop);          // Pending Callbacks 페이즈
    uv__run_idle(loop);             // Idle 페이즈
    uv__run_prepare(loop);          // Prepare 페이즈
    uv__io_poll(loop, timeout);     // Poll 페이즈
    uv__run_pending(loop);          // poll 뒤 pending callback 제한 처리
    uv__run_check(loop);            // Check 페이즈
    uv__run_closing_handles(loop);  // Close Callbacks 페이즈
    uv__update_time(loop);          // 현재 시간 갱신
    uv__run_timers(loop);           // Timer 페이즈
}
```
루프는 활성 핸들과 요청이 없어졌거나 실행 모드 조건을 충족했거나 `uv_stop()`으로 중단 요청을 받으면 종료된다.

---

## 페이즈 간 nextTickQueue & microTaskQueue
```
Node.js는 JS 콜백 하나가 끝나는 경계마다 nextTickQueue와 microTaskQueue를 비운다. 그래서 같은 페이즈 안에서도 콜백 사이에 microtask가 끼어들 수 있다.

[callback] → nextTick → microtask → [next callback] → nextTick → microtask → ...

이것이 process.nextTick()이 어떤 페이즈에서든 "즉시" 실행되는 이유이다.
nextTick은 현재 작업 완료 직후 콜 스택에 주입되며, Promise microtask보다 우선순위가 높다.
```

---

## 주요 단계

1. **Timers**
    ```
    setTimeout() 및 setInterval()에 의해 예약된 콜백을 실행합니다.
    타이머는 사용자가 원하는 정확한 시간이 아니라 제공된 콜백이 실행될 수 있는 임계값입니다.
    내부 구현: 타이머는 min-heap에 저장. 루트 최솟값 조회는 O(1), 삽입과 제거는 O(log N).
    uv__run_timers는 `heap_min()`으로 가장 이른 타이머의 미리 계산된 `timeout`을 보고 `loop->time`과 비교한 뒤 만료된 핸들을 힙에서 제거해 콜백을 실행.
    ```
2. **Pending Callbacks**
    ```
    TCP 오류 유형과 같은 일부 시스템 작업에 대한 콜백을 실행합니다.
    예: TCP 소켓이 ECONNREFUSED를 수신하면 일부 *nix 시스템이 대기했다가 이 단계에서 처리.
    ```
3. **Idle, Prepare**: Node.js 내부용. 일반적으로 사용자가 제어할 일 없음.
4. **Poll** (가장 복잡한 페이즈)
    ```
    1. I/O를 차단하고 폴링해야 하는 기간을 계산
    2. 대기열에서 이벤트를 처리

    내부: uv__io_poll 호출, OS별 API(Linux: epoll, macOS: kqueue, Windows: IOCP) 사용.
    timeout 동작:
    - timeout = 0: 즉시 반환 (논블로킹)
    - timeout > 0: I/O 이벤트 또는 타임아웃까지 블로킹
    - timeout < 0: 다음 이벤트까지 제한 없이 대기하도록 poll API에 요청

    poll 대기열이 비어 있고 setImmediate가 있으면 check 단계로 진행.
    그렇지 않으면 콜백이 큐에 추가될 때까지 대기.
    대기열이 비었으나 timers 임계값 도달 시 timers 단계로 래핑.
    ```
5. **Check**
    ```
    setImmediate() 콜백을 실행. poll 단계가 유휴 상태가 되면 check 단계로 진행.
    ```
6. **Close Callbacks**
    ```
    socket.destroy() 등으로 핸들이 갑자기 닫히면 'close' 이벤트가 이 단계에서 발생.
    그렇지 않으면 process.nextTick()을 통해 발생.
    ```

---

## 실행 흐름
```
1. Node.js 프로그램 실행: JS 파일 평가, setTimeout/비동기 I/O 등록.
2. 백그라운드 처리: 파일 I/O, 일부 DNS, crypto, zlib 같은 작업은 libuv 스레드 풀로 가고, TCP/UDP 네트워크 I/O는 보통 OS readiness 알림을 통해 완료 콜백이 큐에 등록된다.
3. 이벤트 루프 처리: 각 단계에서 적합한 큐에 등록된 작업을 하나씩 처리.
4. 작업 완료: 처리할 작업이 없으면 프로그램 종료.
```

## 전체 흐름 (Node.js)
```
Call Stack 비움
    ↓
nextTickQueue 전부 비움 (process.nextTick)
    ↓
MicrotaskQueue 전부 비움 (Promise 콜백)
    ↓
=== 이하 Macrotask (페이즈별 처리) ===
[Pending Callbacks] → nextTick/microtask 비움
[Poll] → nextTick/microtask 비움
[poll 뒤 Pending Callbacks] → nextTick/microtask 비움
[Check] → nextTick/microtask 비움
[Close Callbacks] → nextTick/microtask 비움
[Timers] → nextTick/microtask 비움
    ↓
다시 Timer로 (루프)
```

**핵심**: 최초 스크립트 실행 이후 이벤트 루프는 페이즈별 큐를 순회한다. Node.js는 콜백 실행이 끝나는 지점마다 nextTick → microtask 순으로 큐를 비우므로, 단순히 페이즈 사이에서만 실행된다고 외우면 틀린다.

## process.nextTick() vs setImmediate()

| 비교 | process.nextTick() | setImmediate() |
|------|-------|-------|
| 실행 시점 | 현재 작업 완료 후, 이벤트 루프가 다음 페이즈로 가기 전 | poll 이후 check 페이즈. 예약 문맥에 따라 현재 반복 또는 이후 반복 |
| 기술적 | 이벤트 루프의 일부가 아님. 현재 단계에서 nextTickQueue 처리 | poll 단계 완료 후 실행되는 특수 타이머 |
| 선택 기준 | 호출 스택이 풀린 직후, 다음 페이즈 전에 실행해야 할 때. 재귀 사용 주의 | poll 뒤 check 페이즈에서 다음 실행 기회를 원할 때 |

- `process.nextTick()`을 재귀적으로 호출하면 poll 단계에 도달하지 못해 I/O "고갈" 가능
- 같은 I/O 콜백 안에서 둘을 함께 예약하면 현재 콜백 직후 `process.nextTick()`이 먼저 실행되고, 이후 check 페이즈에서 `setImmediate()`가 실행된다.

### James Snell의 네이밍 비판
James Snell(Node.js Core Contributor)은 **"`nextTick`과 `Immediate`의 이름은 서로 바뀌어야 한다"** 고 지적한다. 이름과 실제 동작이 반대이기 때문이다.

- `process.nextTick()` → 이름은 "다음 틱"이지만, **실제로는 콜 스택이 비워진 직후 즉시** 실행된다 (이벤트 루프의 다음 반복을 기다리지 않음).
- `setImmediate()` → 이름은 "즉시"지만 **poll 이후 check 단계**에서 실행된다. 예약 위치에 따라 같은 반복의 check에 도달할 수도 있으므로 무조건 다음 반복이라고 외우지 않는다.

면접에서 "왜 둘 다 있는데 이름이 헷갈리는가?"라는 질문이 나오면, **"`nextTick`이 더 빠르다"** 는 한 줄 요약과 함께 이 네이밍 비판을 덧붙이면 이해도를 어필할 수 있다.

## 핵심 원리: JS 실행 중에도 백그라운드 작업은 동시에 진행된다

James Snell의 또 다른 핵심 발언:
> **"자바스크립트가 실행될 때마다 다른 모든 작업도 동시에 일어나고 있습니다."**

이 말은 **이벤트 루프의 본질**을 한 줄로 요약한다. 메인 스레드가 JS 함수를 실행하는 그 순간에도, libuv 워커 스레드는 파일 I/O를 읽고 있고, OS 커널은 epoll/kqueue/IOCP로 네트워크 이벤트를 감지하고 있다. 메인 스레드의 JS 실행과 백그라운드 I/O는 **진짜로 병행**된다.

**면접 답변에 녹이는 방법:**
> "Node.js에서 JS 실행은 한 스레드에서 일어나지만, 그 동안에도 libuv 스레드 풀과 OS 커널은 백그라운드에서 I/O를 처리하고 있습니다. 이벤트 루프는 JS 실행이 끝날 때마다 이 백그라운드 작업의 완료 결과를 큐에서 꺼내 콜백을 실행하는 구조입니다. 그래서 JS 레벨은 단일 스레드 동시성이고, 런타임과 커널 수준에서는 병렬 작업이 함께 진행됩니다."

**실무 함의:** 메인 스레드의 **JS 함수를 작게 유지**하는 것이 성능의 핵심이다. 큰 함수는 이벤트 루프를 블로킹하여, 완료된 I/O 콜백이 실행 기회를 얻지 못하게 만든다.

### 실행 우선순위 (CommonJS)
1. process.nextTick 대기열
2. promises microtask queue (Promise.then())
3. macrotask queue (setTimeout, setImmediate)

### ESM에서의 차이
- ES 모듈은 비동기 작업으로 래핑되어 전체 스크립트가 이미 microtask queue에 있음
- 따라서 Promise가 즉시 해결되면 해당 콜백이 microtask queue에 추가되어 먼저 실행됨
- CommonJS와 실행 순서가 달라질 수 있음

## 타이머 심화

### setTimeout 타임아웃 0
- 콜백은 현재 함수 실행 후 가능한 한 빨리 실행
- 실행을 뒤로 미룰 수는 있지만 무거운 계산 자체가 이벤트 루프를 막는 문제는 해결하지 못함. 계산 분할이나 Worker Threads 검토
- **실제 지연은 0이 아니라 1ms**: 딜레이가 1 미만이거나 2147483647(약 24.8일) 초과면 1로 클램프된다. `setTimeout(fn, 0)`은 내부적으로 `setTimeout(fn, 1)`이다.

### setImmediate와 setTimeout(0) 선택
둘의 상대 순서는 예약한 문맥과 이벤트 루프 상태에 달려 있어 일반적인 속도 순위를 만들 수 없다. I/O 콜백 안에서 다음 실행 기회로 미룰 때는 poll 뒤 check에 놓이는 `setImmediate()`의 순서가 예측 가능하다. 타이머 임계값 이후 실행이라는 의미가 필요하면 `setTimeout()`을 쓴다.

### setInterval의 한계
- 간격은 정확한 실행 시각이 아니라 실행 가능해지는 임계값이다.
- 같은 JavaScript 이벤트 루프 스레드에서는 콜백 실행이 서로 겹치지 않는다. 긴 콜백 때문에 후속 실행이 지연되고 기대한 주기가 깨질 수 있다.
- 완료 시점부터 일정 간격을 두려면 **재귀적 setTimeout**으로 콜백 완료 후 다음 실행을 예약한다.

### setImmediate()
- `setTimeout(() => {}, 0)`과 유사하지만 Node.js 이벤트 루프의 check 단계에서 실행

## 출처
- [The Node.js Event Loop — Node.js 공식 문서](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [로우 레벨로 살펴보는 Node.js 이벤트 루프 — evan-moon](https://evan-moon.github.io/2019/08/01/nodejs-event-loop-workflow/)

## 관련 문서
- [[Event-Loop-Microtask|이벤트 루프 — Microtask/Macrotask & 브라우저 vs Node]]
- [[Event-Loop|이벤트 루프 (TOC)]]
- [[libuv-Threading|libuv 스레드 풀 (기본 4, fs/dns.lookup 위임)]]
- [[libuv]]
- [[Async-Internals|비동기 내부 동작]]
