---
tags: [runtime, nodejs, event-loop, libuv, phases]
status: done
category: "OS & Runtime"
aliases: ["Event Loop Phases", "이벤트 루프 페이즈"]
---

# 이벤트 루프 — 페이즈와 실행 순서

libuv 소스 기반 페이즈 구조, nextTick·microtask 삽입 지점, 실행 순서 심화, 타이머 심화.

## libuv `uv_run` 소스코드
이벤트 루프의 실제 구현체. 각 페이즈를 순회하며 등록된 콜백을 처리한다.
```c
while (r != 0 && loop->stop_flag == 0) {
    uv__update_time(loop);          // 현재 시간 갱신
    uv__run_timers(loop);           // Timer 페이즈
    uv__run_pending(loop);          // Pending Callbacks 페이즈
    uv__run_idle(loop);             // Idle 페이즈
    uv__run_prepare(loop);          // Prepare 페이즈
    uv__io_poll(loop, timeout);     // Poll 페이즈
    uv__run_check(loop);            // Check 페이즈
    uv__run_closing_handles(loop);  // Close Callbacks 페이즈
}
```
루프는 처리할 작업(활성 핸들/요청)이 없고 `stop_flag`가 설정되면 종료된다.

---

## 페이즈 간 nextTickQueue & microTaskQueue
```
각 페이즈가 전환될 때마다, 현재 페이즈와 관계없이 nextTickQueue와 microTaskQueue가 먼저 비워진다.

[Timer] → nextTick → microtask → [Pending] → nextTick → microtask → [Poll] → ...

이것이 process.nextTick()이 어떤 페이즈에서든 "즉시" 실행되는 이유이다.
nextTick은 현재 작업 완료 직후 콜 스택에 주입되며, Promise microtask보다 우선순위가 높다.
```

---

## 주요 단계

1. **Timers**
    ```
    setTimeout() 및 setInterval()에 의해 예약된 콜백을 실행합니다.
    타이머는 사용자가 원하는 정확한 시간이 아니라 제공된 콜백이 실행될 수 있는 임계값입니다.
    내부 구현: 타이머는 min-heap에 저장. O(log N)으로 최솟값 조회.
    uv__run_timers는 힙에서 최솟값을 꺼내 registeredTime + delay > currentTime인지 확인.
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
    - timeout < 0: 무한 블로킹 (최대 ~30분)

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
2. 백그라운드 처리: 비동기 I/O는 libuv 스레드 풀로 전달, 완료되면 콜백이 이벤트 큐에 등록.
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
[Timer] → nextTick/microtask 비움
[Pending Callbacks] → nextTick/microtask 비움
[Poll] → nextTick/microtask 비움
[Check] → nextTick/microtask 비움
[Close Callbacks] → nextTick/microtask 비움
    ↓
다시 Timer로 (루프)
```

**핵심**: 최초 스크립트 실행 자체가 첫 번째 Macrotask이고, 그 이후 각 페이즈(= 분류된 Macrotask Queue)를 순회하며, 페이즈 사이마다 nextTick → microtask 순으로 전부 비운다.

## process.nextTick() vs setImmediate()

| 비교 | process.nextTick() | setImmediate() |
|------|-------|-------|
| 실행 시점 | 동일 단계에서 즉시 (현재 작업 완료 후) | 이벤트 루프의 다음 반복 (check 단계) |
| 기술적 | 이벤트 루프의 일부가 아님. 현재 단계에서 nextTickQueue 처리 | poll 단계 완료 후 실행되는 특수 타이머 |
| 권장 | 호출 스택 풀린 후 이벤트 루프 전에 콜백 실행이 필요할 때 | 일반적으로 모든 경우에 권장 |

- `process.nextTick()`을 재귀적으로 호출하면 poll 단계에 도달하지 못해 I/O "고갈" 가능
- I/O 사이클 내에서는 항상 `setImmediate()` 콜백이 `setTimeout`보다 먼저 실행

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
- CPU 차단 없이 무거운 계산 중 다른 함수를 실행하는 데 유용

### setInterval의 한계
- 함수 실행 시간을 고려하지 않고 n밀리초마다 실행
- 네트워크 조건에 따라 실행 시간이 달라지면 하나의 긴 실행이 다음 실행과 겹칠 수 있음
- **재귀적 setTimeout**으로 대체 → 콜백 완료 후 다음 실행을 예약

### setImmediate()
- `setTimeout(() => {}, 0)`과 유사하지만 Node.js 이벤트 루프의 check 단계에서 실행

## 관련 문서
- [[Event-Loop-Microtask|이벤트 루프 — Microtask/Macrotask & 브라우저 vs Node]]
- [[Event-Loop|이벤트 루프 (TOC)]]
- [[libuv]]
- [[Async-Internals|비동기 내부 동작]]
