---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["비동기 프로그래밍 패턴"]
---

# 비동기 프로그래밍 — 패턴 (흐름 제어 / 타이머 / EventEmitter)

흐름 제어, 타이머, EventEmitter, 이벤트 루프 차단 방지 전략.

## 비동기 흐름 제어

### 세 가지 비동기 패턴

**1. 순차 실행 (In Series)**: 작업을 하나씩 순서대로 실행
```js
function serialProcedure(op) {
  if (!op) process.exit(0);
  executeFunctionWithArgs(op, () => serialProcedure(operations.shift()));
}
serialProcedure(operations.shift());
```

**2. 제한된 순차 실행 (Limited in Series)**: 특정 조건까지만 순차 실행
```js
function serial(recipient) {
  if (!recipient || successCount >= 1000000) return final();
  dispatch(recipient, (err) => { if (!err) successCount++; serial(bigList.pop()); });
}
```

**3. 완전 병렬 실행 (Full Parallel)**: 모든 작업을 동시에 실행, 완료 카운트 추적
```js
recipients.forEach(r => dispatch(r, (err) => {
  if (!err) success++; else failed.push(r.name);
  if (++count === recipients.length) final({ count, success, failed });
}));
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

### Zero Delay & 재귀적 setTimeout
```
지연 0: 현재 함수 실행 완료 후 가능한 한 빨리 실행. CPU 블로킹 방지.
setInterval 한계: 함수 완료 시간 무시. 겹침 발생 가능.
해결: 재귀적 setTimeout → 이전 함수 완료 후 대기.
```
```js
const myFunction = () => {
  // 작업 수행
  setTimeout(myFunction, 1000);
};
setTimeout(myFunction, 1000);
```

## 블로킹 vs 논블로킹
```js
// 블로킹 (동기)
const data = fs.readFileSync('/file.md');
console.log(data);
moreWork();  // console.log 이후 실행

// 논블로킹 (비동기)
fs.readFile('/file.md', (err, data) => {
  if (err) throw err;
  console.log(data);
});
moreWork();  // console.log 이전 실행
```

**동시성과 처리량**: 웹 서버에서 각 요청이 50ms 중 45ms가 DB I/O라면, 논블로킹 사용 시 요청당 45ms 절약.

**혼용 위험**: 읽기 전에 삭제될 수 있음 → 콜백 내에서 순서 보장.

## EventEmitter
```js
const EventEmitter = require('node:events');
const emitter = new EventEmitter();
emitter.on('start', (start, end) => console.log(`from ${start} to ${end}`));
emitter.emit('start', 1, 100);
```

주요 메서드: `on(event, fn)`(리스너 등록), `once(event, fn)`(일회용), `emit(event, ...args)`(발생), `removeListener`/`off`(제거), `removeAllListeners(event)`(특정 이벤트 전체 제거).

## process.nextTick() vs setImmediate()

| 구분 | `process.nextTick()` | `setImmediate()` |
|------|----------------------|-----------------|
| 시기 | 현재 단계 직후 즉시 | 다음 반복 check 단계 |
| 속도/권장 | 빠르나 재귀 시 I/O starve | 느리나 I/O 차단 없음, 권장 |

I/O 사이클 내에서는 `setImmediate() > setTimeout(0)`이지만, 메인 모듈에서는 비결정적이다.

**nextTick 활용: 비동기 보장**
```js
let bar = null;
function someAsyncApiCall(cb) { process.nextTick(cb); }  // 동기 호출 대신 nextTick
someAsyncApiCall(() => { console.log('bar', bar); });    // bar 1
bar = 1;
```

**EventEmitter에서의 활용**
```js
class MyEmitter extends EventEmitter {
  constructor() { super(); process.nextTick(() => this.emit('event')); }
}
new MyEmitter().on('event', () => console.log('이벤트 발생!'));
```

**실행 순서 예**
```js
const start = () => {
  console.log('start');
  setImmediate(() => console.log('baz'));
  Promise.resolve('bar').then(v => {
    console.log(v);
    process.nextTick(() => console.log('zoo'));
  });
  process.nextTick(() => console.log('foo'));
};
start();
// CJS: start → foo → bar → zoo → baz
// ESM: start → bar → foo → zoo → baz
```

## 이벤트 루프 차단 방지
```
Node.js는 JS 콜백을 이벤트 루프에서, 비싼 작업을 워커 풀에서 처리한다.
적은 스레드로 많은 클라이언트를 처리하는 것이 확장성의 비결이다.
```

### 워커 풀에서 실행되는 작업
- **I/O 집약적**: `dns.lookup()`, 대부분의 `fs` API
- **CPU 집약적**: `crypto.pbkdf2()`, `crypto.scrypt()`, `zlib` 대부분

### 주의해야 할 패턴
- **ReDoS**: 중첩 수량자 `(a+)*`, 겹치는 OR절 `(a|a)*` 회피. 간단한 매칭은 `indexOf`.
- **JSON DoS**: `JSON.parse/stringify`는 O(n). 큰 입력 주의.
- **동기 API 피하기**: 서버에서 `*Sync()` 금지.

### 복잡한 계산 해결 방법

**분할(Partitioning)**: 작은 단위로 분할, 이벤트 루프에 양보
```js
function asyncAvg(n, avgCB) {
  let sum = 0;
  function help(i, cb) {
    sum += i;
    if (i == n) { cb(sum); return; }
    setImmediate(help.bind(null, i + 1, cb));
  }
  help(1, function (sum) { avgCB(sum / n); });
}
```

**오프로드(Offloading)**: [[Worker-Threads]], Child Process, C++ 애드온으로 워커 풀에 위임

## 관련 문서
- [[Async-Programming-Basics|비동기 프로그래밍 — 기초]]
- [[Async-Programming|비동기 프로그래밍 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Worker-Threads|워커 스레드]]
