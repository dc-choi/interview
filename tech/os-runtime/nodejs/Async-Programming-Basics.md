---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["비동기 프로그래밍 기초"]
---

# 비동기 프로그래밍 — 기초 (Callback / Promise / async-await)

이벤트 루프의 내부 동작은 [[Event-Loop]] 참조. 여기서는 콜백, Promise, async/await 기초에 초점을 맞춘다.

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

## 관련 문서
- [[Async-Programming-Patterns|비동기 프로그래밍 — 패턴]]
- [[Async-Programming|비동기 프로그래밍 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Async-Internals|비동기 내부 동작]]
