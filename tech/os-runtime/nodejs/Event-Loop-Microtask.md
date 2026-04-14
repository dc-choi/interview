---
tags: [runtime, nodejs, event-loop, microtask, macrotask]
status: done
category: "OS & Runtime"
aliases: ["Microtask Macrotask", "브라우저 vs Node 이벤트 루프"]
---

# 이벤트 루프 — Microtask/Macrotask & 브라우저 vs Node

Microtask/Macrotask 큐 개념과 브라우저·Node.js의 이벤트 루프 차이.

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

## 흔한 오해 정리
```
1. 이벤트 루프는 별도 스레드다 → ✗ 메인 JS 스레드 내에서 실행된다.
2. Worker Threads = libuv 스레드 풀이다 → ✗ 완전히 다른 개념이다. (Worker-Threads 참조)
3. 타이머는 정확한 시간에 실행된다 → ✗ 최소 지연 시간 이후 "가능한 빨리" 실행된다.
4. 실행 순서는 등록 순서만으로 결정된다 → ✗ 등록 타이밍과 현재 페이즈에 따라 달라진다.
```

## 이름 혼동 주의
```
nextTick과 setImmediate의 이름은 사실 서로 뒤바뀌어야 맞다.
- process.nextTick(): 실제로는 "즉시(immediate)" 실행됨 (현재 스택 클리어 직후)
- setImmediate(): 실제로는 "다음 틱(next tick)" 에 실행됨 (다음 루프 반복의 check 페이즈)

이는 역사적인 API 설계 실수이며, 호환성 때문에 변경되지 않았다.
— James Snell (Node.js Core Contributor)
```

## 관련 문서
- [[Event-Loop-Phases|이벤트 루프 — 페이즈와 실행 순서]]
- [[Event-Loop|이벤트 루프 (TOC)]]
- [[Async-Internals|비동기 내부 동작]]
- [[libuv]]
