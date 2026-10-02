---
tags: [runtime, nodejs, event-loop, microtask, macrotask]
status: done
verified_at: 2026-09-30
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
- Promise 콜백은 `then` 호출만으로 큐에 들어가지 않고 콜백 등록과 settle이 모두 끝난 시점에 들어간다. 이미 settled된 Promise에 붙인 `then`은 곧바로 reaction job이 예약되지만 현재 실행 중인 코드가 끝난 뒤 실행되고, pending Promise에 붙인 콜백은 reaction 목록에 있다가 Promise가 fulfilled나 rejected로 settled될 때 예약된다. 다른 Promise나 thenable로 resolve하면 그 결과가 settled될 때까지 기다린다.
- 따라서 microtask 우선은 이미 예약된 작업 사이의 순서다. 타이머로 20ms 뒤 settled되는 Promise의 `then`은 같은 시점에 예약한 `setTimeout(fn, 0)` 콜백보다 늦게 실행된다(Node.js v26.7.0에서 확인).

### Task queues, 흔히 말하는 Macrotask
- `setTimeout`, `setInterval`, `setImmediate`(Node), I/O 콜백, UI 렌더링 이벤트
- 브라우저는 여러 task source에 대응하는 하나 이상의 task queue를 둘 수 있다. 이벤트 루프는 실행 가능한 task를 하나 선택해 실행한 뒤 microtask checkpoint를 수행한다.

### 실행 순서

| | Microtask | Macrotask |
|---|---|---|
| **우선순위** | 높음 (먼저 실행) | 낮음 |
| **처리 방식** | checkpoint에서 큐가 빌 때까지 | 한 번에 실행 가능한 task 1개 선택 |
| **대표 API** | Promise, queueMicrotask | setTimeout, I/O |

Microtask는 현재 실행이 끝난 뒤 checkpoint에서 처리된다. 다음 일반 작업을 실행하기 전에 새로 예약된 microtask도 비운다.

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
- Node.js의 페이즈는 libuv가 타이머, I/O polling, check 등을 처리하는 구조다. 브라우저의 task queue를 그대로 쪼갠 사양은 아니다.
- 아래 큐 그림은 실행 순서를 이해하기 위한 추상화다. 타이머의 heap/연결 리스트와 OS polling까지 모두 같은 FIFO 자료구조라는 뜻은 아니다.
```
브라우저:  task source별 queue들에서 실행 가능한 task 선택
Node.js:  timers큐 [ setTimeout ]  /  poll큐 [ I/O 콜백 ]  /  check큐 [ setImmediate ]  / ...각각 별도 큐
```

| | 브라우저 | Node.js |
|---|---|---|
| **구조** | task source와 하나 이상의 task queue | 페이즈별 분리된 큐 |
| **Microtask 처리** | task 종료 뒤 checkpoint에서 비움 | CommonJS 최상위와 timer/I/O 콜백 경계에서는 nextTick을 먼저 처리. ESM 최상위와 Promise/queueMicrotask 콜백 내부에서는 현재 microtask 대기열을 먼저 비움. 진행 중인 microtask 처리는 새 nextTick이 선점하지 않음 |
| **setImmediate** | 없음 | check 페이즈 전용 |

### 타이머 API 차이

`setTimeout`과 `setInterval`은 ECMAScript built-in이 아니라 host가 정의하는 API라서 반환값과 delay 보정 규칙이 환경마다 다르다.

| | 브라우저 (HTML 표준) | Node.js |
|---|---|---|
| **반환값** | 0보다 큰 정수 ID | `Timeout` 객체. `ref()`, `unref()`를 제공하고 `Symbol.toPrimitive`로 숫자 ID를 얻는다 |
| **delay 생략 시** | 0 | 1 |
| **delay 보정** | WebIDL `long` 변환이 NaN과 ±∞를 0으로 바꾸고 소수점 아래를 버리며, long 범위(-2147483648 이상 2147483647 이하)를 벗어나는 값은 32비트로 wrap한다(2^32 - 5000은 음수가 되어 0, 2^32 + 5000과 -2^32 + 5000은 5000). 그 뒤 음수는 0으로, timer nesting level이 5보다 크고 4ms 미만이면 4ms로 올린다 | 1 미만, 2147483647 초과, NaN이면 1로 바꾸고 그 사이의 정수가 아닌 값은 소수점 아래를 버린다([[Event-Loop-Phases-Timers\|타이머 심화]]) |

- HTML 표준에서 4ms 하한은 처음부터 적용되지 않는다. 타이머 task 안에서 다시 타이머를 거는 중첩이 다섯 단계를 넘은 뒤 적용되고, `setInterval`의 반복도 같은 nesting level로 센다. 엔진마다 단계를 세는 방식과 임계값이 다를 수 있으며, WebKit은 `setTimeout` 중첩의 임계값을 10으로 둔다(2026-09-27 WebKit main 소스 기준).
- 브라우저에서 조각 작업을 마친 뒤 다음 `setTimeout(fn, 0)`을 거는 연쇄는 몇 번 재예약한 뒤부터 조각 사이에 최소 4ms가 끼어든다. timeout은 `setTimeout` 호출 시점부터 세므로, 작업 전에 다음 타이머를 먼저 걸면 이 대기가 작업 시간과 겹친다.
- Window의 타이머는 문서가 fully active인 시간만 센다. user agent는 전력 절약을 위해 구현 정의 시간만큼 더 늦출 수 있고, 비활성 탭에는 브라우저마다 기준이 다른 최소 지연이 적용될 수 있다.
- 타이머는 `clearTimeout`, `clearInterval`로 취소한다. Node.js에서는 legacy `timeout.close()`와 `timeout[Symbol.dispose]()`도 취소한다. ID나 `Timeout`을 담은 변수에 `null`을 대입해도 콜백은 계속 실행되고, Node.js에서는 기본(ref) 상태의 활성 타이머가 이벤트 루프를 계속 유지한다. `unref()`한 타이머는 유지하지 않는다.

### 루프를 붙잡는 리소스와 해제

Node.js 프로세스는 참조된(ref) 활성 핸들이나 요청이 남아 있는 동안 끝나지 않는다([[libuv-Handles|libuv 핸들의 참조 카운팅]]). 아래 Node.js 객체는 기본으로 참조된 핸들 위에 있다. CLI 스크립트나 테스트가 끝나지 않고 멈추거나, graceful shutdown에서 서버는 닫았는데 남은 감시자, interval, readline 때문에 종료되지 않는 증상이 여기서 나온다.

| 리소스 | 루프를 유지하는 조건 | 해제 |
|---|---|---|
| `net`, `http` 서버와 소켓 | `listen()` 뒤, 연결이 열려 있는 동안 | `server.close()`, TCP 소켓 `end()`, UDP 소켓 `close()` |
| 타이머 | 기본 ref | `clearTimeout()`, `clearInterval()`, 보조 타이머는 `unref()` |
| `fs.watch`, `fs.watchFile` | `persistent` 기본값 `true` | `close()`, `unwatchFile()`, `unref()` ([[File-System-Watch]]) |
| stdin을 입력으로 쓰는 `readline` | EOF를 받을 때까지 | `rl.close()`, 입력을 기다리지 않으려면 `process.stdin.unref()` |
| `MessagePort`(워커 안 `parentPort` 포함) | `.on('message')` 리스너가 있으면 자동 ref | 리스너 제거, `port.close()`, `port.unref()` |
| `Worker` | 기본 ref | `worker.terminate()`, `worker.unref()` |

- `process.getActiveResourcesInfo()`는 루프를 붙잡은 리소스의 타입 이름(예: `TCPServerWrap`, `FSEventWrap`, `Timeout`, `MessagePort`, `PipeWrap`)을 돌려준다. 실제 객체는 주지 않고 DEP0161은 비공개 API `process._getActiveHandles()`, `_getActiveRequests()` 대신 이것을 쓰라고 안내한다. Node.js 26.7에서 실행 중인 `Worker`는 이 목록에 나오지 않았으므로 빈 목록이어도 워커를 따로 확인한다.
- 필요한 핸들을 `unref()`하면 작업이 끝나기 전에 프로세스가 끝날 수 있다. `process.exit()`로 강제 종료하면 정리 콜백을 건너뛰므로([[Process-Child-Process]]) 원인이 된 핸들을 찾아 닫는 쪽을 우선한다.

---

## 흔한 오해 정리
```
1. 이벤트 루프는 별도 스레드다 → ✗ 메인 JS 스레드 내에서 실행된다.
2. Worker Threads = libuv 스레드 풀이다 → ✗ 완전히 다른 개념이다. (Worker-Threads 참조)
3. 타이머는 정확한 시간에 실행된다 → ✗ delay는 실행 가능해지는 임계값이다. Node.js는 libuv 루프 시각의 밀리초 정수로 판정해 실제 경과 시간이 요청보다 짧거나 길 수 있다.
4. 실행 순서는 등록 순서만으로 결정된다 → ✗ 등록 타이밍과 현재 페이즈에 따라 달라진다.
```

타이머 판정 단위는 [[Sleep-and-Timing#Node.js 타이머|Sleep과 타이밍]]을 참고한다.

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
- [[libuv-Handles|libuv 핸들과 참조 카운팅]]
- [[File-System-Watch|파일 변경 감시]]

## 출처

- [HTML Standard, Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [HTML Standard, The WindowOrWorkerGlobalScope mixin](https://html.spec.whatwg.org/multipage/webappapis.html#windoworworkerglobalscope-mixin)
- [Web IDL Standard, ConvertToInt](https://webidl.spec.whatwg.org/#abstract-opdef-converttoint)
- [ECMAScript Language Specification, CreateResolvingFunctions](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-createresolvingfunctions)
- [ECMAScript Language Specification, PerformPromiseThen](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromisethen)
- [MDN, Window: setTimeout() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [Node.js, Timers](https://nodejs.org/api/timers.html)
- [Node.js, process.getActiveResourcesInfo()](https://nodejs.org/api/process.html#processgetactiveresourcesinfo)
- [Node.js, DEP0161](https://nodejs.org/api/deprecations.html#DEP0161)
- [Node.js, Readline](https://nodejs.org/api/readline.html)
- [Node.js, Worker threads, port.unref()](https://nodejs.org/api/worker_threads.html#portunref)
- [Node.js, fs.watch](https://nodejs.org/api/fs.html#fswatchfilename-options-listener)
- [Node.js Event Loop, Timers, and nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js, When to use `queueMicrotask()` vs. `process.nextTick()`](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
- [Node.js v26.7.0 task_queues.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/process/task_queues.js)
- [Node.js v26.7.0 timers.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/timers.js)
- [WebKit DOMTimer.cpp (main 73aa6c8) — WebKit](https://github.com/WebKit/WebKit/blob/73aa6c89e2cb77c46184a81aec944e4ab99d114d/Source/WebCore/page/DOMTimer.cpp)
- [모던 자바스크립트 딥다이브 스터디 #9-2 (CH 37, 42) — FE재남](https://www.youtube.com/watch?v=DnsAOh_sw5o)
- [모던 자바스크립트 딥다이브 스터디 #10-2 (CH 41 , 43) — FE재남](https://www.youtube.com/watch?v=8_2kse0fgMk)
- [모던 자바스크립트 딥다이브 스터디 #10-3 (CH 45 프로미스) — FE재남](https://www.youtube.com/watch?v=VEux0lApQ4c)
- [인프런, 얄팍한 코딩사전, TCP & UDP](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=271249)
- [인프런, 얄팍한 코딩사전, worker_threads](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=276231)
- [인프런, 얄팍한 코딩사전, 파일 시스템 이벤트 (+ 사용자 입력 받기)](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270913)
