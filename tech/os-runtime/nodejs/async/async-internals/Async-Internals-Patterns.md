---
tags: [runtime, nodejs]
status: done
verified_at: 2026-07-21
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
- setImmediate(): poll 이후 check 페이즈에서 실행. 예약 위치에 따라 현재 반복의 check 또는 이후 반복에서 실행된다.

Promise는 이 문제를 자동으로 해결한다. then 핸들러는 resolve가 동기적으로 호출되더라도 항상 비동기(마이크로태스크)로 실행되기 때문이다.

## 콜백 지옥 해결

중첩된 콜백이 깊어지면 가독성과 유지보수성이 급격히 저하되는 "콜백 지옥" 문제가 발생한다. async/await 도입 이전에도 다음 기법들로 완화할 수 있었다.

**Early Return**: 실패 조건에서 즉시 반환하여 중첩을 줄인다. if-else 대신 에러 시 return callback(err)를 사용하면 들여쓰기 레벨이 감소한다.

**함수 추출**: 중첩된 콜백을 이름 있는 함수로 분리한다. 재사용성이 높아지고, 스택 트레이스에 함수 이름이 나타나 디버깅이 용이해지며, 코드의 가독성이 크게 향상된다.

## 제한적 동시성 (Limited Concurrency)

비동기 작업의 동시 실행 수를 제한하는 패턴이다. 제한하지 않으면 파일 디스크립터 고갈, 메모리 오버플로우, 외부 서비스에 대한 DoS 등의 문제가 발생할 수 있다.

TaskQueue는 EventEmitter 기반으로 글로벌 동시성을 관리하는 구현이다. 동시 실행 중인 작업 수를 추적하고, 최대치에 도달하면 새 작업을 큐에 넣어두었다가 기존 작업이 완료되면 꺼내서 실행한다. 완료/에러 이벤트를 발생시켜 외부에서 모니터링할 수 있다.

동시성에 보편적인 숫자는 없다. CPU 작업은 worker 수를 정할 때 `os.availableParallelism()`과 실제 CPU quota를 출발점으로 삼을 수 있다. I/O와 외부 API는 지연 분포, 파일 디스크립터와 소켓, 커넥션 풀, 메모리, 하위 시스템의 rate limit를 반영하고 부하 테스트로 조정한다.

현재 처리 중인 key를 `Set`으로 추적하면 한 프로세스 안에서 동일 key의 중복 시작을 막을 수 있다. 하지만 다중 프로세스나 분산 환경, check-then-act, 만료와 재시도 경쟁까지 해결하지는 않는다. 요구되는 일관성에 따라 뮤텍스, 원자적 조건부 쓰기, fencing token, 데이터베이스 제약을 사용한다.

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

try-catch 밖에서는 `return promise`와 `return await promise` 모두 올바르다. 최신 ECMAScript 동작에서 `return await`는 추가 마이크로태스크를 만들지 않으며, 오히려 에러 스택에 현재 async 함수 프레임을 남겨 디버깅에 유리할 수 있다. 일반 문맥에서는 팀의 일관성 기준으로 선택하고, 에러 처리 문맥에서는 제어 흐름의 정확성을 위해 `return await`를 사용한다.

TypeScript ESLint에서 에러 처리의 정확성만 강제하려면 `"@typescript-eslint/return-await": ["error", "error-handling-correctness-only"]`를 사용한다. 모든 반환 Promise를 await하는 팀은 `always`도 선택할 수 있다. ESLint 코어의 `no-return-await` 규칙은 폐기되었으므로 성능 최적화 근거로 사용하지 않는다.

## 재귀 Promise 체인 메모리 누수

종료되지 않는 재귀 Promise 체인은 각 단계가 다음 Promise를 반환하며 미완료 체인을 계속 연결할 수 있다. 런타임과 콜백이 무엇을 캡처하는지에 따라 이전 reaction이 오래 유지될 수 있으므로 장기 폴링은 반복문과 명시적 취소, 지연, 종료 조건으로 표현하는 편이 관찰과 제어에 유리하다.

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

`while` 루프는 재귀적으로 늘어나는 반환 체인을 만들지 않는다. 그렇다고 모든 메모리 누수를 자동으로 막는 것은 아니며, 각 반복에서 참조를 보관하지 않는지와 취소, backoff, 오류 처리를 별도로 확인해야 한다.

## 출처

- [no-return-await — ESLint 공식 문서](https://eslint.org/docs/latest/rules/no-return-await)
- [return-await — typescript-eslint 공식 문서](https://typescript-eslint.io/rules/return-await/)
- [ECMAScript Language Specification — TC39](https://tc39.es/ecma262/)
- [Node.js os.availableParallelism](https://nodejs.org/api/os.html#osavailableparallelism)

## 관련 문서
- [[Async-Internals-Mechanism|비동기 내부 동작 — 메커니즘]]
- [[Async-Internals|비동기 내부 동작 (TOC)]]
- [[Event-Loop|이벤트 루프]]
- [[Node.js]]
