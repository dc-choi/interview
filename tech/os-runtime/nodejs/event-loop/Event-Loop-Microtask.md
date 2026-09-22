---
tags: [runtime, nodejs, event-loop, microtask, macrotask]
status: done
verified_at: 2026-07-21
category: "OS & Runtime"
aliases: ["Microtask Macrotask", "브라우저 vs Node 이벤트 루프"]
---

# 이벤트 루프 — Microtask/Macrotask & 브라우저 vs Node

Microtask/Macrotask 큐 개념과 브라우저, Node.js의 이벤트 루프 차이.

**핵심**: 이벤트 루프는 별도의 스레드가 아니라 JS 메인 스레드 내에서 실행된다.

---

## Microtask Queue vs Macrotask Queue

### Microtask Queue
- Promise 콜백 (`.then`, `.catch`, `.finally`), `queueMicrotask()`, `MutationObserver`
- 현재 실행 중인 태스크가 끝나면 **즉시, 전부** 비워질 때까지 실행
- Microtask 안에서 새 microtask를 추가하면 그것도 같은 사이클에서 처리됨 (무한루프 주의)

### Task queues, 흔히 말하는 Macrotask
- `setTimeout`, `setInterval`, `setImmediate`(Node), I/O 콜백, UI 렌더링 이벤트
- 브라우저는 여러 task source에 대응하는 하나 이상의 task queue를 둘 수 있다. 이벤트 루프는 실행 가능한 task를 하나 선택해 실행한 뒤 microtask checkpoint를 수행한다.

### 실행 순서

| | Microtask | Macrotask |
|---|---|---|
| **우선순위** | 높음 (먼저 실행) | 낮음 |
| **처리 방식** | checkpoint에서 큐가 빌 때까지 | 한 번에 실행 가능한 task 1개 선택 |
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

### 브라우저: task source와 여러 task queue
```
Macrotask 1개 → Microtask 전부 → 렌더링 → 반복
```
- 브라우저 스펙에는 Node.js의 libuv 페이즈 구조가 없다. 이벤트 루프가 선택한 실행 가능한 task 하나를 처리하고 microtask checkpoint를 거친다.
- 타이머, 네트워크, 사용자 상호작용 등은 서로 다른 task source에서 오며 사용자 에이전트는 task source별 queue를 둘 수 있다. 모든 작업이 하나의 FIFO queue에 들어간다고 일반화하면 안 된다.

### Node.js: 페이즈 기반 이벤트 루프 (libuv)
- Macrotask Queue가 **하나가 아니라 페이즈별로 나뉘어** 있음
- 페이즈 = Macrotask Queue를 종류별로 쪼갠 것
```
브라우저:  task source별 queue들에서 실행 가능한 task 선택
Node.js:  timers큐 [ setTimeout ]  /  poll큐 [ I/O 콜백 ]  /  check큐 [ setImmediate ]  / ...각각 별도 큐
```

| | 브라우저 | Node.js |
|---|---|---|
| **구조** | task source와 하나 이상의 task queue | 페이즈별 분리된 큐 |
| **Microtask 처리** | task 종료 뒤 checkpoint에서 비움 | CommonJS 최상위와 timer/I/O 콜백 경계에서는 nextTick을 먼저 처리. ESM 최상위와 Promise/queueMicrotask 콜백 내부에서는 현재 microtask 대기열을 먼저 비움. 진행 중인 microtask 처리는 새 nextTick이 선점하지 않음 |
| **setImmediate** | 없음 | check 페이즈 전용 |

---

## 흔한 오해 정리
```
1. 이벤트 루프는 별도 스레드다 → ✗ 메인 JS 스레드 내에서 실행된다.
2. Worker Threads = libuv 스레드 풀이다 → ✗ 완전히 다른 개념이다. (Worker-Threads 참조)
3. 타이머는 정확한 시간에 실행된다 → ✗ 최소 지연 시간 이후 "가능한 빨리" 실행된다.
4. 실행 순서는 등록 순서만으로 결정된다 → ✗ 등록 타이밍과 현재 페이즈에 따라 달라진다.
```

추가로 자주 보이는 오해 세 가지:

- **이벤트 루프가 JS 엔진(V8) 안에 있다** → ✗ V8은 JS를 실행만 한다. 이벤트 루프는 Node.js(libuv) 또는 브라우저가 가진 것으로, JS 엔진 외부다.
- **setImmediate는 콜백을 큐 맨 앞에 끼워 넣는다** → ✗ check 페이즈의 별도 큐에 등록 순서대로 들어간다. 타이머 전체까지 하나의 등록순 FIFO라고 일반화하면 안 된다.
- **setTimeout 만료는 OS/커널이 JS 콜백을 큐에 넣어 준다** → ✗ Node.js v26.7.0 기준, JS Timeout은 지연 시간별 연결 리스트에 들어가고 리스트의 만료 순서는 우선순위 큐로 관리한다. libuv가 타이머 처리 함수를 호출하면 JS 측에서 만료된 Timeout의 콜백을 실행한다. libuv 자체의 타이머 핸들 heap과 구분한다.

## 이름 혼동 주의
```
nextTick과 setImmediate의 이름은 사실 서로 뒤바뀌어야 맞다.
- process.nextTick(): 다음 반복을 기다리지 않고 nextTick 처리 경계에서 실행됨 (진행 중인 microtask는 선점하지 않음)
- setImmediate(): poll 이후 check 페이즈에서 실행됨. 어디서 예약했는지에 따라 현재 반복의 check일 수도, 이후 반복일 수도 있음

이는 역사적인 API 설계 실수이며, 호환성 때문에 변경되지 않았다.
— James Snell (Node.js Core Contributor)
```

## 관련 문서
- [[Event-Loop-Phases|이벤트 루프 — 페이즈와 실행 순서]]
- [[Event-Loop|이벤트 루프 (TOC)]]
- [[Async-Internals|비동기 내부 동작]]
- [[libuv]]

## 출처

- [HTML Standard, Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Node.js Event Loop, Timers, and nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js, When to use `queueMicrotask()` vs. `process.nextTick()`](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
- [Node.js v26.7.0 task_queues.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/process/task_queues.js)
- [Node.js v26.7.0 timers.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/timers.js)
