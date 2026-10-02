---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["비동기 프로그래밍 기초"]
---

# 비동기 프로그래밍 — 기초 (Callback / Promise / async-await)

이벤트 루프의 내부 동작은 [[Event-Loop]] 참조. 여기서는 콜백, Promise, async/await 기초에 초점을 맞춘다.

## 콜백 (Callbacks)
```
한 JavaScript 실행 스레드에서는 현재 호출 스택의 코드가 순서대로 실행된다. Node.js 전체에는 다른 스레드와 워커도 있다.
콜백은 다른 함수에 인자로 넘기는 함수다. Array.map처럼 호출 중 동기로 실행될 수도 있고, fs.readFile처럼 나중에 실행될 수도 있다.
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

상태: Pending(대기) → Fulfilled(이행) 또는 Rejected(거부). Fulfilled와 Rejected를 묶어 Settled라고 부르며 별도의 상태는 아니다.
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
| `Promise.resolve(value)` | 값으로 이행하거나 Promise/thenable의 최종 상태를 따르는 Promise를 반환 |
| `Promise.reject(reason)` | 즉시 reject되는 Promise 생성 |
| `Promise.try(fn)` | 동기/비동기 함수를 실행하고 Promise로 감쌈 |
| `Promise.withResolvers()` | executor 외부에서 resolve/reject 가능한 Promise 생성 |

```js
// Promise.all
const [data1, data2] = await Promise.all([fetchData1(), fetchData2()]);

// Promise.allSettled
const results = await Promise.allSettled([promise1, promise2]);
// [{ status: 'fulfilled', value: '...' }, { status: 'rejected', reason: '...' }]

// Promise.withResolvers
const { promise, resolve, reject } = Promise.withResolvers();
setTimeout(() => resolve('완료!'), 1000);
```

Promise executor는 생성 시 동기로 실행되며 반환값은 무시한다. 다른 Promise로 `resolve()`하면 아직 pending일 수 있다. `.then()` 안에서 다음 Promise를 반환하지 않으면 바깥 체인이 그 작업을 기다리지 않는다.

`all()`의 빠른 실패나 `race()`/`any()`의 결과 확정은 남은 작업을 취소하지 않는다. 지원 API의 `AbortSignal` 등으로 취소와 정리를 별도로 설계한다. `Promise.try(fn)`은 `fn`을 동기로 호출해 결과와 예외를 감싸며, `.then(fn)`은 microtask로 미룬다. `withResolvers()`는 외부 완료 신호를 연결할 뿐 취소나 동시성 제한을 제공하지 않는다.

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

`await`는 해당 async 함수의 후속 실행을 미루며 스레드를 점유한 채 기다리지 않는다. 위 예제의 `promise1`, `promise2`가 이미 생성됐다면 작업도 이미 시작됐을 수 있다. 시작 순서까지 보장하려면 `await task1()` 뒤에 `task2()`를 호출한다. 독립 작업만 함께 시작하고 큰 입력에는 동시성 제한을 둔다.

**최상위 Await**: ES Modules에서 `async` 함수 없이도 최상위에서 `await` 사용 가능
```js
import { setTimeout as delay } from 'node:timers/promises';
await delay(1000);
```

## 콜백 API를 Promise로 바꾸기

앞 단계 결과에 의존하는 콜백을 중첩하면 단계마다 들여쓰기와 오류 분기가 늘어난다. 콜백 API를 Promise 반환 함수로 바꾸면 위의 체이닝이나 `await`로 순서대로 읽힌다. 바꾸는 방법은 다음 순서로 고른다.

1. 모듈이 Promise API를 제공하면 그것을 쓴다. `node:fs/promises`, `node:dns/promises`, `node:readline/promises`, `node:timers/promises`, `node:stream/promises`가 있다.
2. 마지막 인자로 오류 우선 콜백 `(err, value) => ...`을 받는 함수는 `util.promisify`로 감싼다.
3. 이 규약을 따르지 않는 콜백(성공과 실패 콜백이 따로 있는 API 등)은 `new Promise`로 직접 감싼다.

```js
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync('node', ['--version']);

// 성공, 실패 콜백을 따로 받는 API는 직접 감싼다. resolve와 reject는 처음 한 번만 효력이 있다.
const load = (id) => new Promise((resolve, reject) => {
  legacyLoad(id, resolve, reject);
});
```

- `util.promisify`는 원본에 `util.promisify.custom` 속성이 있으면 그 함수를 돌려준다. `child_process.exec`, `execFile`이 이 경우라 `{ stdout, stderr }` 객체로 resolve하고, 종료 코드가 0이 아니면 `stdout`, `stderr`를 덧붙인 오류로 reject하며, 반환된 Promise의 `child` 속성으로 `ChildProcess`에 접근한다. 콜백 값이 여러 개인 다른 API는 결과 모양을 해당 문서에서 확인한다.
- `this`를 쓰는 메서드를 떼어 promisify하면 호출 때 `this`가 사라진다. `promisify(obj.method).bind(obj)`처럼 묶는다. Promise를 이미 반환하는 함수에 promisify를 쓰는 것은 v20.8.0부터 deprecated다.
- executor 안에서 동기로 던진 예외는 reject로 바뀌지만, executor가 넘긴 비동기 콜백 안에서 던진 예외는 Promise와 무관한 uncaught exception이 된다. 콜백 안의 실패는 `reject(err)`로 넘긴다.
- promisify해도 `exec`는 shell을 거치므로 명령 인젝션 주의는 [[Process-Child-Process#보안 — 명령 인젝션|Child Process 보안]]과 같다.
- CommonJS도 `require('node:fs').promises`를 쓸 수 있지만 최상위 `await`가 없어 async 함수로 한 번 더 감싸야 한다.

## 이벤트 루프에서 작업 예약

| 메서드 | 실행 시점 | 용도 |
|--------|---------|------|
| `queueMicrotask()` | 현재 스크립트 직후, I/O/타이머 이전 | Promise 해결처럼 즉각 실행 필요 시 |
| `process.nextTick()` | nextTick 처리 경계에서 실행. 진행 중인 microtask를 선점하지 않음 | 기존 API 호환. 신규 일반 지연 콜백에는 `queueMicrotask()` 우선 검토 |
| `setImmediate()` | poll 단계 후 check 단계에서 | 대부분의 I/O 콜백 처리 후 실행 |

```js
console.log('시작');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve().then(() => console.log('Promise'));
console.log('끝');
// 출력: 시작 → 끝 → Promise → setTimeout
```

## 출처

- [Node.js Learn, JavaScript asynchronous programming and callbacks](https://nodejs.org/en/learn/asynchronous-work/javascript-asynchronous-programming-and-callbacks)
- [Node.js Learn, Discover promises](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs)

- [ECMAScript, Properties of Promise Instances](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-properties-of-promise-instances)
- [Node.js, util.promisify](https://nodejs.org/api/util.html#utilpromisifyoriginal)
- [Node.js, child_process.exec](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback)
- [인프런, 얄팍한 코딩사전, \[부록\] Promise와 async/await](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=279344)
- [인프런, 얄팍한 코딩사전, url, dns, util, os 모듈](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=273476)
- [인프런, 얄팍한 코딩사전, child_process와 cluster 모듈](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=275724)
- [인프런, 얄팍한 코딩사전, 파일 시스템 2](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=270416)

## 관련 문서
- [[Async-Programming-Patterns|비동기 프로그래밍 — 패턴]]
- [[Async-Programming|비동기 프로그래밍 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Async-Internals|비동기 내부 동작]]
- [[Process-Child-Process|Process, Child Process]]
