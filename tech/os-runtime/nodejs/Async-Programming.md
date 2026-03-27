---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["비동기 프로그래밍"]
---

# 비동기 프로그래밍

이벤트 루프의 내부 동작은 [[Event-Loop]] 참조. 여기서는 비동기 프로그래밍 패턴과 실전 활용에 초점을 맞춘다.

## 콜백 (Callbacks)
```
JavaScript는 기본적으로 동기식이며 단일 스레드이다. 비동기 기능은 환경(브라우저, Node.js)이 제공한다.
콜백은 다른 함수에 값으로 전달되는 함수로, 이벤트가 발생할 때만 실행된다.
```

**에러-우선 콜백 (Error-First Callbacks)**: Node.js가 채택한 전략. 콜백의 첫 번째 파라미터는 오류 객체.
```js
const fs = require('node:fs');
fs.readFile('/file.json', (err, data) => {
  if (err) { console.log(err); return; }  // 오류 시 err 객체, 정상 시 null
  console.log(data);
});
```

**콜백 지옥**
```js
window.addEventListener('load', () => {
  document.getElementById('button').addEventListener('click', () => {
    setTimeout(() => {
      items.forEach(item => { /* 깊은 중첩 */ });
    }, 2000);
  });
});
```

## Promise
```
Promise는 비동기 작업의 최종 완료(또는 실패)와 결과값을 나타내는 특수 객체이다.

상태: Pending(대기) → Fulfilled(이행) 또는 Rejected(거부) → Settled(완료)
```

```js
const myPromise = new Promise((resolve, reject) => {
  if (success) resolve('성공!');
  else reject('실패.');
});

myPromise
  .then(result => console.log(result))   // fulfilled 처리
  .catch(error => console.error(error))  // rejected 처리
  .finally(() => console.log('완료'));    // 성공/실패 무관하게 실행
```

**Promise 체이닝**
```js
promise
  .then(result => { console.log(result); return anotherPromise; })
  .then(result2 => console.log(result2))
  .catch(error => console.error(error));
```

### Promise 정적 메서드

| 메서드 | 설명 |
|--------|------|
| `Promise.all([p1, p2])` | 모든 Promise가 fulfilled될 때까지 대기. 하나라도 rejected되면 즉시 rejected |
| `Promise.allSettled([p1, p2])` | 모든 Promise가 settled될 때까지 대기. 실패해도 단락되지 않음 |
| `Promise.race([p1, p2])` | 첫 번째 settled된 Promise의 결과를 반환 |
| `Promise.any([p1, p2])` | 첫 번째 fulfilled된 Promise의 결과를 반환. 모두 rejected되면 AggregateError |
| `Promise.resolve(value)` | 즉시 resolve되는 Promise 생성 |
| `Promise.reject(reason)` | 즉시 reject되는 Promise 생성 |
| `Promise.try(fn)` | 동기/비동기 함수를 실행하고 Promise로 감쌈 |
| `Promise.withResolvers()` | executor 외부에서 resolve/reject 가능한 Promise 생성 |

```js
// Promise.all
const [data1, data2] = await Promise.all([fetchData1, fetchData2]);

// Promise.allSettled
const results = await Promise.allSettled([promise1, promise2]);
// [{ status: 'fulfilled', value: '...' }, { status: 'rejected', reason: '...' }]

// Promise.withResolvers
const { promise, resolve, reject } = Promise.withResolvers();
setTimeout(() => resolve('완료!'), 1000);
```

## async/await
```js
async function performTasks() {
  try {
    const result1 = await promise1;
    const result2 = await promise2;
    console.log(result1, result2);
  } catch (error) {
    console.error(error);
  }
}
```

**최상위 Await**: ES Modules에서 `async` 함수 없이도 최상위에서 `await` 사용 가능
```js
import { setTimeout as delay } from 'node:timers/promises';
await delay(1000);
```

## 이벤트 루프에서 작업 예약

| 메서드 | 실행 시점 | 용도 |
|--------|---------|------|
| `queueMicrotask()` | 현재 스크립트 직후, I/O/타이머 이전 | Promise 해결처럼 즉각 실행 필요 시 |
| `process.nextTick()` | 현재 단계 직후, 어떤 I/O 이벤트보다 먼저 | 비동기 보장이 필요한 내부 작업 |
| `setImmediate()` | poll 단계 후 check 단계에서 | 대부분의 I/O 콜백 처리 후 실행 |

```js
console.log('시작');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve().then(() => console.log('Promise'));
console.log('끝');
// 출력: 시작 → 끝 → Promise → setTimeout
```

## 비동기 흐름 제어

### 세 가지 비동기 패턴

**1. 순차 실행 (In Series)**: 작업을 하나씩 순서대로 실행
```js
function serialProcedure(operation) {
  if (!operation) process.exit(0);
  executeFunctionWithArgs(operation, function (result) {
    serialProcedure(operations.shift());
  });
}
serialProcedure(operations.shift());
```

**2. 제한된 순차 실행 (Limited in Series)**: 특정 조건까지만 순차 실행
```js
function serial(recipient) {
  if (!recipient || successCount >= 1000000) return final();
  dispatch(recipient, function (_err) {
    if (!_err) successCount += 1;
    serial(bigList.pop());
  });
}
```

**3. 완전 병렬 실행 (Full Parallel)**: 모든 작업을 동시에 실행, 완료 카운트 추적
```js
recipients.forEach(function (recipient) {
  dispatch(recipient, function (err) {
    if (!err) success += 1;
    else failed.push(recipient.name);
    count += 1;
    if (count === recipients.length) final({ count, success, failed });
  });
});
```

## 타이머

### setTimeout / setInterval
```js
// 지연 실행 (한 번)
const timeout = setTimeout(() => console.log('1초 후'), 1000);
clearTimeout(timeout);  // 취소

// 반복 실행
const interval = setInterval(() => console.log('2초마다'), 2000);
clearInterval(interval);  // 중지
```

### Zero Delay (0ms setTimeout)
```
지연을 0으로 설정하면, 콜백은 현재 함수 실행 완료 후 가능한 한 빨리 실행된다.
CPU 집약적 작업으로 인한 블로킹을 방지하고, 다른 함수가 실행되도록 허용한다.
```

### 재귀적 setTimeout vs setInterval
```
setInterval의 한계: 함수 완료 시간을 고려하지 않고 n밀리초마다 시작. 겹침 발생 가능.
해결책: 재귀적 setTimeout → 이전 함수 완료 후 대기 → 겹치지 않음.
```
```js
const myFunction = () => {
  // 작업 수행
  setTimeout(myFunction, 1000);  // 완료 후 1초 대기
};
setTimeout(myFunction, 1000);
```

## 블로킹 vs 논블로킹
```
블로킹: 비JavaScript 작업이 완료될 때까지 추가 JS 실행이 대기하는 상황.
이벤트 루프가 블로킹 작업 중에 JavaScript를 계속 실행할 수 없기 때문에 발생.
```

```js
// 블로킹 (동기) - 파일을 읽을 때까지 스레드 차단
const data = fs.readFileSync('/file.md');
console.log(data);
moreWork();  // console.log 이후에 실행

// 논블로킹 (비동기) - 파일 읽기를 기다리지 않음
fs.readFile('/file.md', (err, data) => {
  if (err) throw err;
  console.log(data);
});
moreWork();  // console.log 이전에 실행
```

**동시성과 처리량**: 웹 서버에서 각 요청이 50ms 중 45ms가 DB I/O라면, 논블로킹 사용 시 요청당 45ms 절약하여 다른 요청 처리 가능.

**혼용 위험**
```js
// 잘못된 예: 파일이 읽히기 전에 삭제될 수 있음
fs.readFile('/file.md', (err, data) => { console.log(data); });
fs.unlinkSync('/file.md');  // 위험!

// 올바른 예: 콜백 내에서 순서 보장
fs.readFile('/file.md', (err, data) => {
  if (err) throw err;
  console.log(data);
  fs.unlink('/file.md', err => { if (err) throw err; });
});
```

## EventEmitter
```js
const EventEmitter = require('node:events');
const emitter = new EventEmitter();

// 이벤트 리스너 등록
emitter.on('start', (start, end) => {
  console.log(`started from ${start} to ${end}`);
});

// 이벤트 발생 (인자 전달)
emitter.emit('start', 1, 100);
```

| 메서드 | 설명 |
|--------|------|
| `on(event, fn)` | 이벤트 리스너 등록 |
| `once(event, fn)` | 일회용 리스너 (한 번만 실행) |
| `emit(event, ...args)` | 이벤트 발생 및 인자 전달 |
| `removeListener(event, fn)` / `off()` | 리스너 제거 |
| `removeAllListeners(event)` | 특정 이벤트의 모든 리스너 제거 |

## process.nextTick() vs setImmediate()

| 구분 | `process.nextTick()` | `setImmediate()` |
|------|----------------------|-----------------|
| 실행 시기 | 현재 단계 직후 즉시 | 다음 반복의 check 단계 |
| 속도 | 더 빠름 | 더 느림 |
| I/O 영향 | 재귀 호출 시 I/O를 "starve"할 수 있음 | I/O를 차단하지 않음 |
| 사용 권장 | 제한적 사용 | 일반적으로 권장 |

```
I/O 사이클 내에서: setImmediate()가 항상 setTimeout(0)보다 먼저 실행.
메인 모듈에서: 둘의 순서는 비결정적 (프로세스 성능에 따라 다름).
```

**process.nextTick() 활용 예시: 비동기 보장**
```js
let bar = null;
function someAsyncApiCall(callback) {
  process.nextTick(callback);  // 동기 호출 대신 nextTick으로 비동기 보장
}
someAsyncApiCall(() => { console.log('bar', bar); });  // bar 1
bar = 1;
```

**EventEmitter에서의 활용**
```js
class MyEmitter extends EventEmitter {
  constructor() {
    super();
    process.nextTick(() => this.emit('event'));  // 생성자 완료 후 이벤트 발생
  }
}
const myEmitter = new MyEmitter();
myEmitter.on('event', () => console.log('이벤트 발생!'));
```

**실행 순서 (macrotask queue)**
```js
const start = () => {
  console.log('start');
  setImmediate(() => console.log('baz'));
  new Promise(resolve => resolve('bar')).then(resolve => {
    console.log(resolve);
    process.nextTick(() => console.log('zoo'));
  });
  process.nextTick(() => console.log('foo'));
};
start();
// CJS: start → foo → bar → zoo → baz
// ESM: start → bar → foo → zoo → baz (ES Module 로딩이 비동기 래핑)
```

## 이벤트 루프 차단 방지
```
Node.js는 이벤트 루프에서 JS 콜백을 실행하고, 비싼 작업은 워커 풀(Worker Pool)로 처리한다.
적은 수의 스레드로 많은 클라이언트를 처리하는 것이 확장성의 비결이다.
기본 원칙: 각 클라이언트와 관련된 작업이 "작을" 때 Node.js는 빠르다.
```

### 워커 풀에서 실행되는 작업
- **I/O 집약적**: `dns.lookup()`, 대부분의 `fs` API
- **CPU 집약적**: `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`, 대부분의 `zlib` API

### 주의해야 할 패턴

**1. ReDoS (정규표현식 서비스 거부)**
```
취약 규칙: 중첩 수량자 (a+)*, 겹치는 OR절 (a|a)*, 역참조 (a.*) \1
간단한 문자열 매칭은 indexOf를 사용하라.
```

**2. JSON DoS**: `JSON.parse()`와 `JSON.stringify()`는 O(n). 큰 n에 대해 상당히 오래 걸릴 수 있다.

**3. 동기 API 피하기**: 서버에서 `*Sync()` 함수 사용 금지

### 복잡한 계산 해결 방법

**분할(Partitioning)**: 작업을 작은 단위로 분할하여 이벤트 루프에 양보
```js
function asyncAvg(n, avgCB) {
  let sum = 0;
  function help(i, cb) {
    sum += i;
    if (i == n) { cb(sum); return; }
    setImmediate(help.bind(null, i + 1, cb));  // 이벤트 루프에 양보
  }
  help(1, function (sum) { avgCB(sum / n); });
}
```

**오프로드(Offloading)**: [[Worker-Threads]], Child Process, C++ 애드온으로 워커 풀에 위임
