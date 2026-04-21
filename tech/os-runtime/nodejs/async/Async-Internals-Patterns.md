---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Async Internals Patterns", "비동기 패턴과 함정"]
---

# 비동기 내부 동작 — 패턴과 함정

CPS, Zalgo 문제, 콜백 지옥 해결, 제한적 동시성, return await 규칙, 재귀 체인 메모리 누수.

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
- [[Async-Internals-Mechanism|비동기 내부 동작 — 메커니즘]]
- [[Async-Internals|비동기 내부 동작 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Node.js]]
