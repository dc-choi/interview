---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Async Internals Mechanism", "비동기 내부 메커니즘"]
verified_at: 2026-09-27
---

# 비동기 내부 동작 — 메커니즘

async/await의 내부 메커니즘, Promise 최적화 패턴, 실행 비용.

## async/await는 어떻게 동작하는가
ECMAScript의 네이티브 `async` 함수와 `await` 의미론은 Promise와 async 실행 컨텍스트의 중단, 재개로 정의된다. 제너레이터 변환은 오래된 런타임을 대상으로 하는 Babel 같은 트랜스파일러의 구현 전략이며, 네이티브 엔진이 반드시 제너레이터로 실행한다는 뜻은 아니다.

### await의 내부 동작
`await value`는 개념적으로 다음 과정을 거친다.

1. `PromiseResolve`로 값을 현재 realm의 Promise로 정규화한다.
2. Promise의 이행과 거부 reaction을 등록한다.
3. 현재 async 실행 컨텍스트를 중단하고 호출자에게 제어를 돌려준다.
4. Promise reaction job이 실행될 때 async 컨텍스트를 재개하고 값 또는 예외를 전달한다.

Promise가 이미 fulfilled 상태라도 `await` 이후 코드는 현재 콜 스택에서 동기적으로 이어지지 않고 Promise job, 즉 일반적으로 말하는 microtask를 거쳐 재개된다. 명세는 네이티브 머신 스택이나 명령 포인터를 그대로 저장한다고 규정하지 않으며, 그 표현은 엔진 구현을 과도하게 단정한다.

### 트랜스파일 예시
```javascript
// 원본
async function fetchData() {
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

// Babel의 하위 런타임 대상 트랜스파일 결과 (개념적)
function fetchData() {
    return _asyncToGenerator(function* () {
        const res = yield fetch(url);   // yield에서 일시 정지
        const data = yield res.json();  // yield에서 일시 정지
        return data;
    })();
}
```

Babel v8.0.6의 `_asyncToGenerator` helper는 `yield`된 값을 `Promise.resolve`로 정규화한 뒤 fulfilled면 `next(value)`, rejected면 `throw(reason)`으로 generator를 재개한다. `throw()`는 멈춘 `yield` 위치에 예외를 주입하므로 generator 안의 `try/catch`가 그 rejection을 잡는다. 네이티브 `Await`도 fulfilled 값은 normal completion, rejection 이유는 throw completion으로 async 컨텍스트를 재개한다. 직접 만든 runner가 `then`으로 `next`만 연결하면 generator 안의 `try/catch`는 실행되지 않는다. rejection이 어디로 가는지는 runner 구조가 정한다. `return Promise.resolve(value).then(step)`처럼 `then` 체인을 반환하는 runner는 rejection을 자신이 반환한 Promise로 넘긴다. 위 helper에서 `_throw`만 뺀 형태처럼 `new Promise` executor 안에서 `Promise.resolve(value).then(_next)`만 호출하면 runner의 Promise는 settle되지 않고, `then`이 만든 Promise의 rejection은 처리되지 않은 채 unhandled rejection이 된다. 기본 설정의 Node.js v26.7.0에서는 이때 프로세스가 exit code 1로 종료됐다.

## Promise와 resolver capability

JavaScript `Promise` 인스턴스의 공개 API는 `then`, `catch`, `finally`처럼 결과를 관찰하고 후속 작업을 연결하는 쪽이다. 인스턴스 자체에 공개 `resolve`나 `reject` 메서드가 있는 것이 아니다. `new Promise(executor)`가 executor에 전달하는 resolver 함수나 `Promise.withResolvers()`가 별도로 반환하는 `resolve`와 `reject`가 해당 Promise를 settle할 수 있다.

Scala처럼 쓰기 쪽 `Promise`와 읽기 쪽 `Future` 타입을 분리하는 언어와 달리 JavaScript는 타입 이름을 그렇게 나누지 않지만, Promise 객체와 resolver capability는 개념적으로 구분해야 한다.

## await의 성능 비용
```
각 await는 잠재적인 성능 비용이 있다:
1. await 대상의 Promise 변환과 reaction 등록
2. 현재 async 함수 실행 중단과 상태 보존
3. 재개 작업의 microtask 예약

따라서 불필요한 await를 줄이는 것이 중요하다.
```

## Promise 최적화 패턴

### 1. 병렬 실행 후 await (Parallel-then-await)
```javascript
// ✗ 순차 실행: 총 시간 = A + B + C
const a = await getA();
const b = await getB();
const c = await getC();

// 독립 작업을 먼저 시작하고 하나의 집계 Promise로 결과와 오류를 함께 관찰한다.
// 총 시간은 가장 느린 작업에 가까워질 수 있다.
const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
```

이미 시작한 Promise를 변수에 담아 `await promiseA; await promiseB;`처럼 하나씩 기다리면 뒤쪽 Promise의 rejection 관찰이 늦어진다. `promiseA`를 기다리는 동안 `promiseB`가 reject되면 그 시점의 `promiseB`에는 rejection handler가 없다. Node.js는 handler 없이 reject된 Promise를 기록해 두고, 현재 콜백이 끝난 뒤 nextTick과 microtask 대기열을 비운 직후(v26.7.0 `processTicksAndRejections`)에도 handler가 없으면 `unhandledRejection`으로 처리한다. `process.nextTick`이나 microtask 안에서 붙인 handler는 이 확인 전에 붙으므로 unhandled로 처리되지 않지만, `setImmediate`나 `setTimeout` 콜백에서 붙인 handler는 같은 이벤트 루프 반복 안에서 실행되더라도 늦다(Node.js v26.7.0에서 확인). v15부터 기본값인 `--unhandled-rejections=throw` 모드에서는 listener가 없으면 이를 uncaught exception으로 올린다. 그래서 뒤의 `await`에 도달해 `catch`가 실행되기 전에 프로세스가 exit code 1로 종료된다. `uncaughtException` handler도 없는 기본 설정의 동작이다([[Error-Handling-Paths#Promise 에러|Promise 에러 경로]]).

Node.js v26.7.0에서 100ms 뒤 fulfilled되는 A와 10ms 뒤 reject되는 B를 이 형태로 `try/catch` 안에서 기다리자 `catch`에 도달하지 못하고 exit code 1로 종료됐다. A가 먼저 reject되어 `catch`로 빠져나간 경우에도 나중에 reject된 B가 관찰되지 않아 같은 방식으로 종료됐다. `Promise.all`은 입력마다 `then`으로 handler를 등록하므로 뒤따르는 rejection도 unhandled로 남지 않는다. 실패한 결과까지 따로 다뤄야 하면 `Promise.allSettled`로 묶는다(아래 3번 예시).

### 2. Promise.all() — 배열 병렬 처리
```javascript
// ✗ 순차 처리
const results = [];
for (const url of urls) {
    results.push(await fetch(url)); // 하나씩 기다림
}

// 모든 작업을 시작하고 하나의 집계 Promise에서 결과와 오류를 관찰
const results = await Promise.all(urls.map(url => fetch(url)));
```

### 3. Promise.allSettled() — 실패해도 계속
```javascript
// Promise.all(): 하나라도 reject되면 전체 실패
// Promise.allSettled(): 모두 완료될 때까지 대기

const results = await Promise.allSettled([
    fetch('/api/a'),
    fetch('/api/b'),
    fetch('/api/c'),
]);

for (const result of results) {
    if (result.status === 'fulfilled') {
        console.log('성공:', result.value);
    } else {
        console.log('실패:', result.reason);
    }
}
```

### 4. for await...of — 비동기 이터레이션
```javascript
// for await...of는 AsyncIterable 또는 동기 Iterable의 값을 순서대로 소비

async function processSequentially(promises) {
    for await (const result of promises) {
        console.log(result);
    }
}
```

배열에 이미 생성된 Promise를 넣으면 작업 자체는 앞서 시작됐을 수 있고 `for await...of`는 결과를 배열 순서대로 소비한다. 작업을 진짜 순차적으로 시작하려면 반복문 안에서 다음 작업을 생성하고 `await`해야 한다. 단순 `for...of`도 본문에서 `await`하면 기다릴 수 있지만 `Array.prototype.forEach`는 콜백이 반환한 Promise를 집계하거나 기다리지 않는다.

## 출처

- [ECMAScript, Await 추상 연산](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#await)
- [ECMAScript, PerformPromiseAll](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromiseall)
- [Babel transform-async-to-generator](https://babeljs.io/docs/babel-plugin-transform-async-to-generator)
- [Babel v8.0.6 asyncToGenerator helper — Babel](https://github.com/babel/babel/blob/v8.0.6/packages/babel-helpers/src/helpers/asyncToGenerator.ts)
- [MDN, Generator.prototype.throw()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/throw)
- [Node.js, --unhandled-rejections=mode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode)
- [Node.js, Event: 'unhandledRejection'](https://nodejs.org/api/process.html#event-unhandledrejection)
- [Node.js, Event: 'uncaughtException'](https://nodejs.org/api/process.html#event-uncaughtexception)
- [Node.js v26.7.0 task_queues.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/process/task_queues.js)
- [Node.js v26.7.0 promises.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/process/promises.js)
- [모던 자바스크립트 딥다이브 스터디 #11-1 (CH 46 제네레이터와 async/await) — FE재남](https://www.youtube.com/watch?v=IyLdUbzyqcs)
- [모던 자바스크립트 딥다이브 스터디 #10-3 (CH 45 프로미스) — FE재남](https://www.youtube.com/watch?v=VEux0lApQ4c)

## 실행 큐 우선순위 & 실행 순서
[[Event-Loop-Microtask#실행 순서|실행 순서]]와 [[Event-Loop-Phases#페이즈 간 nextTickQueue & microTaskQueue|페이즈 간 nextTickQueue와 microTaskQueue]] 참조.

## 관련 문서
- [[Async-Internals-Patterns|비동기 내부 동작 — 패턴과 함정]]
- [[Async-Internals|비동기 내부 동작 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택과 힙]]
