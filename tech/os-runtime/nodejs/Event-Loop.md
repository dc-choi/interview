---
tags: [runtime, nodejs, event-loop, microtask, macrotask]
status: done
category: "OS & Runtime"
aliases: ["Event Loop", "이벤트 루프"]
---

# 이벤트 루프

비동기 작업(File, Network I/O)과 이벤트 핸들링(CallBack)을 관리하는 매커니즘

**핵심**: 이벤트 루프는 별도의 스레드가 아니라 JS 메인 스레드 내에서 실행된다.

---

## Microtask Queue vs Macrotask Queue

### Microtask Queue
- Promise 콜백 (`.then`, `.catch`, `.finally`), `queueMicrotask()`, `MutationObserver`
- 현재 실행 중인 태스크가 끝나면 **즉시, 전부** 비워질 때까지 실행
- Microtask 안에서 새 microtask를 추가하면 그것도 같은 사이클에서 처리됨 (무한루프 주의)

### Macrotask Queue (= Task Queue)
- `setTimeout`, `setInterval`, `setImmediate`(Node), I/O 콜백, UI 렌더링 이벤트
- 이벤트 루프가 **한 번에 하나씩** 꺼내서 실행

### 실행 순서

| | Microtask | Macrotask |
|---|---|---|
| **우선순위** | 높음 (먼저 실행) | 낮음 |
| **처리 방식** | 큐가 빌 때까지 전부 | 루프당 1개 |
| **대표 API** | Promise, queueMicrotask | setTimeout, I/O |

Microtask는 현재 태스크의 "꼬리"에 붙고, Macrotask는 다음 턴에 실행된다.

### 예시
```js
console.log('1');                          // 동기
setTimeout(() => console.log('2'), 0);     // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');                          // 동기
// 출력: 1 → 4 → 3 → 2
```

### Macrotask 사이에 Microtask가 끼어드는 구조
```js
setTimeout(() => {
  console.log('macro 1');
  Promise.resolve().then(() => console.log('micro 1'));
}, 0);
setTimeout(() => {
  console.log('macro 2');
  Promise.resolve().then(() => console.log('micro 2'));
}, 0);
// 출력: macro 1 → micro 1 → macro 2 → micro 2
```
Macrotask 1개 실행 → 그 안에서 생긴 Microtask 즉시 처리 → 그 다음에야 다음 Macrotask 실행

---

## 브라우저 vs Node.js 이벤트 루프

### 브라우저: 단일 Macrotask Queue (단순화된 모델)
```
Macrotask 1개 → Microtask 전부 → 렌더링 → 반복
```
- 브라우저 스펙에서는 "페이즈" 개념이 없고, Task Queue에서 하나 꺼내서 처리하는 구조
- setTimeout, I/O, UI 이벤트 등이 모두 하나의 큐에 들어감

### Node.js: 페이즈 기반 이벤트 루프 (libuv)
- Macrotask Queue가 **하나가 아니라 페이즈별로 나뉘어** 있음
- 페이즈 = Macrotask Queue를 종류별로 쪼갠 것
```
브라우저:  [ setTimeout, I/O, UI이벤트 ... ] ← 하나의 큐
Node.js:  timers큐 [ setTimeout ]  /  poll큐 [ I/O 콜백 ]  /  check큐 [ setImmediate ]  / ...각각 별도 큐
```

| | 브라우저 | Node.js |
|---|---|---|
| **구조** | 단일 Macrotask Queue | 페이즈별 분리된 큐 |
| **Microtask 처리** | Macrotask 1개마다 비움 | 페이즈 전환 시 비움 (v11+부터는 콜백마다) |
| **setImmediate** | 없음 | check 페이즈 전용 |

---

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

- 주요 단계
1. Timers
    ```
    setTimeout() 및 setInterval()에 의해 예약된 콜백을 실행합니다.

    타이머는 사용자가 원하는 정확한 시간이 아니라 제공된 콜백이 실행될 수 있는 임계값을 지정합니다.

    타이머 콜백은 지정된 시간이 경과한 후 예약 가능한 한 빨리 실행되지만 운영 체제 예약이나 다른 콜백의 실행으로 인해 지연될 수 있습니다.

    내부 구현: 타이머는 min-heap(최소 힙)에 저장된다. O(log N)으로 가장 빠른 타이머를 조회.
    uv__run_timers는 힙에서 최솟값을 꺼내 registeredTime + delay > currentTime인지 확인한다.
    따라서 타이머는 정확한 시점이 아니라 "최소한 이 시간 이후"에 실행됨이 보장된다.
    ```
2. Pending Callbacks
    ```
    이 단계에서는 TCP 오류 유형과 같은 일부 시스템 작업에 대한 콜백을 실행합니다.
    
    예를 들어 연결을 시도할 때 TCP 소켓이 ECONNREFUSED를 수신하면 일부 *nix 시스템은 오류를 보고하기 위해 대기합니다.
    
    pending callbacks 단계에서 실행되도록 대기열에 추가됩니다.
    ```
3. Idle, Prepare
    ```
    내부적으로 Node.js가 사용합니다. libuv의 준비 작업이나 유지 관리를 위한 단계입니다.
    
    일반적으로 사용자가 직접 제어할 일은 없습니다.
    ```
4. Poll (가장 복잡한 페이즈)
    ```
    이 단계에서는 중요한 두가지 기능이 있습니다.
    1. I/O를 차단하고 폴링해야 하는 기간을 계산
    2. 대기열에서 이벤트를 처리

    내부적으로 uv__io_poll을 호출하며, OS별 API(Linux: epoll, macOS: kqueue, Windows: IOCP)를 사용한다.
    timeout 동작:
    - timeout = 0: 즉시 반환 (논블로킹)
    - timeout > 0: I/O 이벤트 발생 또는 타임아웃까지 블로킹
    - timeout < 0: I/O 이벤트 발생까지 무한 블로킹 (최대 ~30분)

    이벤트 루프가 poll 단계에 들어가고 예약된 timers가 없는 경우 다음 두 가지 중 하나가 발생합니다.
    poll 대기열이 비어 있지 않으면 이벤트 루프는 대기열이 모두 소진되거나 시스템에 따른 하드 제한에 도달할 때까지 콜백 대기열을 반복하여 동기적으로 콜백을 실행합니다.

    poll 대기열이 비어 있으면 다음 두 가지 중 하나가 추가로 발생합니다.
    1. 스크립트가 setImmediate()에 의해 예약된 경우 이벤트 루프는 poll 단계를 종료하고 예약된 스크립트를 실행하기 위해 check 단계로 계속 진행합니다.
    2. 스크립트가 setImmediate()로 예약되지 않은 경우 이벤트 루프는 콜백이 큐에 추가될 때까지 기다린 다음 즉시 실행합니다.

    poll 대기열이 비어 있으면 이벤트 루프가 시간 임계값에 도달한 timers를 확인합니다.
    하나 이상의 timers가 준비되면 이벤트 루프가 timers 단계로 다시 래핑되어 해당 timers의 콜백을 실행합니다.
    ```
5. Check
    ```
    setImmediate()로 콜백이 예약되어 있고 poll 단계가 유휴 상태가 되면 poll 이벤트를 기다리지 않고 종료하고 check 단계로 계속 진행합니다.
    ```
6. Close Callbacks
    ```
    소켓이나 핸들이 갑자기 닫히면(예: socket.destroy()), 이 단계에서 'close' 이벤트가 발생하게 됩니다.
    
    그렇지 않으면 process.nextTick()을 통해 발생합니다.
    ```

---

- 실행 흐름
```
1. Node.js 프로그램 실행
JS 파일이 실행되면, Node.js는 처음으로 스크립트를 평가(evaluate)합니다.
여기서 setTimeout이나 비동기 I/O 작업이 등록됩니다.

2. 백그라운드 처리
비동기 I/O 작업은 libuv의 스레드 풀로 전달됩니다.
완료되면 콜백이 이벤트 큐에 등록됩니다.

3. 이벤트 루프 처리
이벤트 루프는 각 단계에서 적합한 큐에 등록된 작업을 하나씩 처리합니다.

4. 작업 완료
이벤트 루프가 처리할 작업이 없을 때 프로그램이 종료됩니다.
```

---

- 실행 순서 분석

### 전체 흐름 (Node.js)
```
Call Stack 비움
    ↓
nextTickQueue 전부 비움 (process.nextTick)
    ↓
MicrotaskQueue 전부 비움 (Promise 콜백)
    ↓
=== 이하 Macrotask (페이즈별 처리) ===
    ↓
[Timer] → nextTick/microtask 비움
    ↓
[Pending Callbacks] → nextTick/microtask 비움
    ↓
[Poll] → nextTick/microtask 비움
    ↓
[Check] → nextTick/microtask 비움
    ↓
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
| 권장 | 호출 스택 풀린 후 이벤트 루프 전에 콜백 실행이 필요할 때 | 일반적으로 모든 경우에 권장 (추론이 쉬움) |

- process.nextTick()을 재귀적으로 호출하면 poll 단계에 도달하지 못해 I/O를 "고갈"시킬 수 있음
- I/O 사이클 내에서는 항상 setImmediate() 콜백이 setTimeout보다 먼저 실행

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
- setTimeout(() => {}, 0)과 동일한 효과
- Node.js 이벤트 루프의 check 단계에서 실행

## 이름 혼동 주의
```
nextTick과 setImmediate의 이름은 사실 서로 뒤바뀌어야 맞다.
- process.nextTick(): 실제로는 "즉시(immediate)" 실행됨 (현재 스택 클리어 직후)
- setImmediate(): 실제로는 "다음 틱(next tick)" 에 실행됨 (다음 루프 반복의 check 페이즈)

이는 역사적인 API 설계 실수이며, 호환성 때문에 변경되지 않았다.
— James Snell (Node.js Core Contributor)
```

## 흔한 오해 정리
```
1. 이벤트 루프는 별도 스레드다 → ✗ 메인 JS 스레드 내에서 실행된다.
2. Worker Threads = libuv 스레드 풀이다 → ✗ 완전히 다른 개념이다. (Worker-Threads 참조)
3. 타이머는 정확한 시간에 실행된다 → ✗ 최소 지연 시간 이후 "가능한 빨리" 실행된다.
4. 실행 순서는 등록 순서만으로 결정된다 → ✗ 등록 타이밍과 현재 페이즈에 따라 달라진다.
```

## 관련 문서
- [[Call-Stack-Heap|Call Stack Heap]]
- [[Execution-Context|Execution Context]]
- [[Async-Internals|비동기 내부 동작]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
- [[Stream|스트림]]
- [[libuv]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
