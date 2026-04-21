---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Async Internals Mechanism", "비동기 내부 메커니즘"]
---

# 비동기 내부 동작 — 메커니즘

async/await의 내부 메커니즘, Promise 최적화 패턴, 실행 비용.

## async/await는 어떻게 동작하는가
```
async/await는 제너레이터(Generator)와 코루틴(Coroutine)에 기반한 문법적 설탕이다.
Babel은 async/await를 _asyncToGenerator 제너레이터 함수로 트랜스파일한다.
```

### await의 내부 동작
```
await는 CPU를 블로킹하지 않는다. 다음과 같이 동작한다:

1. await를 만나면 현재 함수의 스택과 명령 포인터를 저장
2. 제어권을 이벤트 루프에 반환 (컨텍스트 스위칭)
3. 다른 태스크가 실행됨
4. await한 Promise가 resolve되면 저장된 컨텍스트에서 실행 재개

만약 Promise가 이미 resolve된 상태라면, 컨텍스트 스위칭 없이 바로 이어서 실행된다.
```

### 트랜스파일 예시
```javascript
// 원본
async function fetchData() {
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

// Babel 트랜스파일 결과 (개념적)
function fetchData() {
    return _asyncToGenerator(function* () {
        const res = yield fetch(url);   // yield에서 일시 정지
        const data = yield res.json();  // yield에서 일시 정지
        return data;
    })();
}
```

## Promise vs Future
```
JS의 Promise는 두 가지 개념을 하나로 합친 것이다:

- Promise (쓰기 가능): resolve/reject로 값을 설정하는 컨테이너
- Future (읽기 전용): then/catch로 값을 읽는 객체

다른 언어에서는 분리되어 있지만 (Java: CompletableFuture, Scala: Promise/Future),
JS에서는 하나의 Promise 객체가 두 역할을 모두 수행한다.
```

## await의 성능 비용
```
각 await는 잠재적인 성능 비용이 있다:
1. 임시 Promise 객체 생성
2. 컨텍스트 스위칭 비용 (스택 저장/복원)
3. 마이크로태스크 큐 등록

따라서 불필요한 await를 줄이는 것이 중요하다.
```

## Promise 최적화 패턴

### 1. 병렬 실행 후 await (Parallel-then-await)
```javascript
// ✗ 순차 실행: 총 시간 = A + B + C
const a = await getA();
const b = await getB();
const c = await getC();

// ✓ 병렬 실행: 총 시간 = max(A, B, C)
const promiseA = getA();  // 즉시 시작
const promiseB = getB();  // 즉시 시작
const promiseC = getC();  // 즉시 시작
const a = await promiseA;
const b = await promiseB;
const c = await promiseC;
```

### 2. Promise.all() — 배열 병렬 처리
```javascript
// ✗ 순차 처리
const results = [];
for (const url of urls) {
    results.push(await fetch(url)); // 하나씩 기다림
}

// ✓ 병렬 처리: 단일 await로 N개 동시 실행
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

results.forEach(result => {
    if (result.status === 'fulfilled') {
        console.log('성공:', result.value);
    } else {
        console.log('실패:', result.reason);
    }
});
```

### 4. for await...of — 순차 비동기 이터레이션
```javascript
// for...of와 forEach는 Promise를 제대로 기다리지 않음
// for await...of는 각 Promise를 순차적으로 대기

async function processSequentially(promises) {
    for await (const result of promises) {
        console.log(result);
    }
}
```

## 실행 큐 우선순위 & 실행 순서
[[Event-Loop|이벤트 루프]] 문서의 "실행 순서 분석" 및 "페이즈 간 nextTickQueue & microTaskQueue" 섹션 참조.

## 관련 문서
- [[Async-Internals-Patterns|비동기 내부 동작 — 패턴과 함정]]
- [[Async-Internals|비동기 내부 동작 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택과 힙]]
