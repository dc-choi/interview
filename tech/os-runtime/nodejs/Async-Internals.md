---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Async Internals", "비동기 내부 동작"]
---

### 비동기 내부 동작
async/await의 내부 메커니즘과 Promise 최적화 패턴.

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

## CPS (Continuation-Passing Style)

결과를 직접 반환(direct style)하지 않고, 콜백 함수에 전달하는 프로그래밍 방식이다.

동기 CPS는 콜백이 즉시 실행되는 경우이다. 주의할 점은 Array.map의 콜백은 CPS가 아니다. map은 결과를 반환(return)하므로 direct style이다. CPS는 반환값이 없고 결과를 오직 콜백으로만 전달한다.

비동기 CPS는 콜백이 현재 호출이 아닌 이후 이벤트 루프 사이클에서 실행되는 경우이다. fs.readFile이 대표적이다.

Node.js의 콜백 컨벤션은 에러가 첫 번째 인자(error-first callback), 콜백이 마지막 파라미터인 형태이다.

```javascript
// 동기 direct style
function addSync(a, b) {
    return a + b;
}

// 동기 CPS
function addCPS(a, b, callback) {
    callback(a + b);
}

// 비동기 CPS (Node.js 컨벤션)
fs.readFile('file.txt', 'utf8', (err, data) => {
    if (err) return handleError(err);
    console.log(data);
});
```

## Zalgo 문제

동일한 함수가 어떤 조건에서는 동기적으로, 다른 조건에서는 비동기적으로 콜백을 호출하면 예측 불가능한 버그가 발생한다. 이를 "Zalgo를 풀어놓는다(Unleashing Zalgo)"라고 한다.

```javascript
// 위험: 캐시 히트 시 동기, 미스 시 비동기
function inconsistentRead(filename, callback) {
    if (cache[filename]) {
        callback(cache[filename]); // 동기 호출!
    } else {
        fs.readFile(filename, (err, data) => {
            cache[filename] = data;
            callback(data); // 비동기 호출
        });
    }
}
```

해결 원칙은 함수가 항상 동기이거나 항상 비동기로 통일되어야 한다는 것이다. 동기 경로를 비동기로 감싸서 일관성을 확보할 수 있다.

- process.nextTick(): 현재 I/O 사이클 내에서, 다음 이벤트 루프 페이즈 전에 실행. 가장 빠름.
- setImmediate(): 현재 이벤트 루프 사이클의 check 페이즈에서 실행.

Promise는 이 문제를 자동으로 해결한다. then 핸들러는 resolve가 동기적으로 호출되더라도 항상 비동기(마이크로태스크)로 실행되기 때문이다.

## 콜백 지옥 해결

중첩된 콜백이 깊어지면 가독성과 유지보수성이 급격히 저하되는 "콜백 지옥" 문제가 발생한다. async/await 도입 이전에도 다음 기법들로 완화할 수 있었다.

**Early Return**: 실패 조건에서 즉시 반환하여 중첩을 줄인다. if-else 대신 에러 시 return callback(err)를 사용하면 들여쓰기 레벨이 감소한다.

**함수 추출**: 중첩된 콜백을 이름 있는 함수로 분리한다. 재사용성이 높아지고, 스택 트레이스에 함수 이름이 나타나 디버깅이 용이해지며, 코드의 가독성이 크게 향상된다.

## 제한적 동시성 (Limited Concurrency)

비동기 작업의 동시 실행 수를 제한하는 패턴이다. 제한하지 않으면 파일 디스크립터 고갈, 메모리 오버플로우, 외부 서비스에 대한 DoS 등의 문제가 발생할 수 있다.

TaskQueue는 EventEmitter 기반으로 글로벌 동시성을 관리하는 구현이다. 동시 실행 중인 작업 수를 추적하고, 최대치에 도달하면 새 작업을 큐에 넣어두었다가 기존 작업이 완료되면 꺼내서 실행한다. 완료/에러 이벤트를 발생시켜 외부에서 모니터링할 수 있다.

리소스별 권장 동시성은 다음과 같다:
- CPU 바운드 작업: os.cpus().length (코어 수)
- I/O 바운드 작업: 5~10개
- 외부 API 호출: 1~5개 (rate limit 기반으로 조정)

경쟁 조건을 방지하려면 Set으로 현재 처리 중인 리소스를 추적하고, 동일 리소스에 대한 중복 작업을 방지해야 한다.

## return await 규칙

try-catch 블록 내에서 `return promise`와 `return await promise`는 다르게 동작한다. `return promise`는 Promise를 그대로 반환하므로 해당 Promise의 rejection이 catch 블록에 잡히지 않는다. 반드시 `return await promise`를 사용해야 catch 블록이 rejection을 포착할 수 있다.

```javascript
// 잘못된 예: catch가 fetchData의 rejection을 잡지 못함
async function wrong() {
    try {
        return fetchData(); // Promise를 그대로 반환
    } catch (err) {
        console.error(err); // 이 코드에 도달하지 않음!
    }
}

// 올바른 예: catch가 정상 동작
async function correct() {
    try {
        return await fetchData(); // await로 풀어서 반환
    } catch (err) {
        console.error(err); // rejection을 정상적으로 잡음
    }
}
```

try-catch 밖에서는 `return await`가 불필요한 중간 Promise만 생성하므로 생략해도 된다.

ESLint 설정으로 이 규칙을 강제할 수 있다: `"@typescript-eslint/return-await": ["error", "in-try-catch"]`

## 재귀 Promise 체인 메모리 누수

`return somePromise.then(() => recursiveCall())` 패턴은 재귀 호출마다 새로운 Promise가 체인에 연결되어 무한히 길어지는 체인을 생성한다. 이는 GC가 이전 Promise를 해제하지 못하게 하여 메모리를 지속적으로 소비한다.

```javascript
// 문제: 무한 Promise 체인 → 메모리 누수
function poll() {
    return fetchStatus()
        .then((status) => {
            if (status === 'done') return;
            return poll(); // 재귀적 체인 생성
        });
}

// 해결: async 함수 내 while 루프
async function poll() {
    while (true) {
        const status = await fetchStatus();
        if (status === 'done') return;
    }
}
```

async 함수 내에서 while 루프를 사용하면 각 반복마다 이전 Promise가 해제되어 메모리 누수가 발생하지 않는다.

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Node.js]]
