---
tags: [cs, javascript, async, promise]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["Promise와 Async", "JavaScript Promise"]
---

# Promise와 async/await

Promise는 아직 끝나지 않았거나 이미 끝난 계산의 결과를 값으로 전달하는 표준 객체다. callback보다 중요한 차이는 성공/실패와 후속 계산을 반환값으로 합성할 수 있다는 점이다. Promise 자체가 실행 중인 작업을 자동 취소하거나 동시성 부하를 제한하지는 않는다.

## 상태와 fate

| 상태 | 의미 |
|---|---|
| pending | 아직 fulfilled/rejected가 아님 |
| fulfilled | 성공 값으로 settled |
| rejected | 실패 이유로 settled |
| settled | fulfilled 또는 rejected |

`resolve(x)`는 무조건 즉시 fulfilled로 만든다는 뜻이 아니다. `x`가 Promise/thenable이면 그 결과를 따르도록 resolve된 뒤 한동안 pending일 수 있고, 최종적으로 rejected될 수도 있다. 한 번 다른 결과를 따르도록 정해지거나 settled되면 이후 resolve/reject 호출은 상태를 바꾸지 않는다.

```ts
const outer = new Promise((resolve) => {
  resolve(fetchUser());
});
```

`new Promise(executor)`의 executor는 constructor 호출 중 동기적으로 실행된다. Promise를 배열에 넣었다고 작업 시작이 자동으로 지연되는 것은 아니다.

## then은 새 Promise를 만든다

`then(onFulfilled, onRejected)`은 원본을 변경하지 않고 새 Promise를 반환한다.

- handler가 일반 값을 반환하면 새 Promise는 그 값으로 fulfilled된다.
- Promise/thenable을 반환하면 새 Promise가 그 결과를 따른다.
- handler가 throw하면 새 Promise는 rejected된다.
- rejection handler가 정상 값을 반환하면 실패가 복구되어 fulfilled chain으로 돌아온다.

```ts
fetchUser()
  .then(validate)
  .then(save)
  .catch((error) => classify(error));
```

중첩 Promise가 평탄해 보이는 이유는 Promise resolution procedure가 thenable을 동화하기 때문이다. 이것을 일반적인 container의 `map`과 동일하다고 단정하면 Promise의 eager 실행과 rejection channel을 놓친다.

`catch(onRejected)`는 `then(undefined, onRejected)`의 축약이다. 그러나 `then(onFulfilled, onRejected)`의 두 handler는 원본 Promise의 결과에만 반응하므로, 같은 `then`의 `onFulfilled`가 throw해도 옆의 `onRejected`는 호출되지 않는다. 그 오류는 `then`이 반환한 새 Promise를 reject해 다음 단계로 넘어간다.

```ts
loadUser()
  .then(
    (user) => render(user), // 여기서 throw하면
    (error) => showLoadError(error), // 이 handler는 호출되지 않는다
  )
  .catch((error) => report(error)); // render의 오류는 여기서 받는다
```

성공 처리 중의 오류까지 한 경계에서 다루려면 `.then(onFulfilled).catch(onRejected)`로 나눈다. 두 인수 형태는 원본의 실패만 골라 처리하고 성공 handler의 오류는 다음 단계로 넘길 때 쓴다.

`finally(onFinally)`는 fulfilled와 rejected 양쪽에서 실행되지만 `then(onFinally, onFinally)`와 다르다.

- `onFinally`는 인수를 받지 않고, 반환한 일반 값은 무시된다. 결과 Promise는 원본의 값이나 rejection 이유를 이어받으므로 `finally`는 실패를 복구하지 않는다.
- `onFinally`가 Promise를 반환하면 그 Promise가 settled될 때까지 다음 단계가 기다린다.
- `onFinally`가 throw하거나 rejected Promise를 반환하면 결과 Promise는 그 이유로 reject되어 원래 값이나 오류를 덮는다.

원본이 reject된 `.catch().finally().then()`에서 마지막 `then`이 실행되는 것은 `finally` 때문이 아니라 앞선 `catch`가 fulfilled로 복구했기 때문이다. 원본이 fulfilled면 `catch`를 건너뛰고 원래 값이 `then`에 전달된다. `finally`는 로딩 상태 해제, lock 반환처럼 결과와 무관한 정리에 쓰고, 정리 로직의 실패가 원래 오류를 가리지 않게 한다.

## async/await의 의미

- async function은 호출 결과를 Promise로 반환한다.
- `return value`는 fulfilled 결과가 되고, uncaught throw는 rejected 결과가 된다.
- `await value`는 `Promise.resolve(value)`와 연결된 결과가 settled될 때까지 현재 async function만 일시 중단한다.
- thread나 event loop 전체가 멈추는 것은 아니다.

```ts
async function load(): Promise<User> {
  const response = await fetch("/users/1");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

`await`는 제어 흐름을 문장형으로 표현하고 pipeline은 계산 단계를 합성한다. 둘은 경쟁 관계가 아니며, imperative workflow 안에서 순수 transform pipeline을 호출하는 식으로 함께 쓸 수 있다.

## 순차와 동시 실행

```ts
// 의존성이 있거나 의도적으로 순차 실행
const user = await loadUser();
const orders = await loadOrders(user.id);

// 서로 독립이고 동시 시작이 안전
const userPromise = loadUser();
const policyPromise = loadPolicy();
const [user2, policy] = await Promise.all([userPromise, policyPromise]);
```

`Promise.all`은 입력 순서로 성공 값을 반환하고 하나가 reject되면 결과 Promise를 reject한다. 다른 작업을 취소하지는 않는다. 먼저 시작한 Promise는 `Promise.all`에 곧바로 넘겨 모든 입력에 handler를 붙인다. 하나씩 `await`하면 앞의 대기 중에 reject된 뒤쪽 Promise가 unhandled rejection이 되어 Node.js 기본 설정에서 프로세스가 종료될 수 있다([[Async-Internals-Mechanism#Promise 최적화 패턴|Promise 최적화 패턴]]). `Promise.allSettled`는 각 결과를 모두 수집하지만 실패를 성공으로 바꾸는 것은 아니므로 caller가 정책을 결정해야 한다. 큰 입력에는 [[JavaScript-Async-Iterable-Pipelines|bounded concurrency와 backpressure]]를 적용한다.

## 오류 경계

동기 throw는 호출 stack의 `try/catch`가 잡는다. Promise rejection은 해당 chain의 rejection handler 또는 그 Promise를 `await`하는 `try/catch`가 잡는다. 생성만 하고 await/return하지 않은 Promise의 실패는 주변 `try/catch`가 잡지 못한다.

```ts
async function run() {
  try {
    await mayReject();
  } catch (error) {
    // 이 await의 rejection 처리
  }
}
```

- 예상 가능한 부재/skip은 무차별 rejection보다 `Option`/tagged result를 검토한다.
- `catch(() => undefined)`는 실제 장애까지 숨길 수 있다.
- fire-and-forget 작업도 owner, timeout, rejection handler와 shutdown policy가 필요하다.
- pipeline 마지막에서만 잡을지 단계별로 복구할지 domain 의미로 정한다.

## return await 판단

`try/catch`가 반환 Promise의 rejection을 처리해야 한다면 `return await`가 필요하다.

```ts
async function saveWithContext() {
  try {
    return await save();
  } catch (error) {
    throw enrich(error);
  }
}
```

그 밖에도 `return await`는 async stack trace를 더 읽기 쉽게 만들 수 있다. 과거의 추가 microtask 성능 조언은 현재 엔진에 그대로 적용되지 않으므로 측정과 오류 가독성으로 판단한다.

## Promise와 모나드 표현의 한계

Promise는 `.then`으로 비동기 계산을 합성할 수 있어 모나드와 비슷한 실무 직관을 준다. 그러나 thenable assimilation으로 `Promise<Promise<T>>`를 그대로 관찰할 수 없고 실행 시점/오류 의미까지 포함하면 엄밀한 law 논의가 필요하다. `map`이라는 단어만으로 안전한 합성이 보장된다고 말하지 않는다. 자세한 구분은 [[Monads-In-TypeScript|TypeScript 모나드]] 참고.

## 정적 생성과 연결된 pipeline

Promise.resolve는 같은 constructor의 native Promise면 그 object를 그대로 반환하고 thenable이면 그 결과를 따른다. Promise.reject는 reason이 Promise여도 동화하지 않고 reason 자체를 담은 새 rejected Promise를 만든다. resolve/reject에 여러 인자를 넘겨도 첫 값만 쓰므로 여러 결과는 object로 묶는다.

동기/비동기 겸용 helper는 일반 값이면 즉시 변환하고 Promise이면 then으로 이어 T 또는 Promise<T>를 반환할 수 있다. 결과 type과 오류 시점이 둘로 갈리므로 application 경계에서 항상 Promise로 통일할지 판단한다. instanceof Promise만으로 다른 realm과 thenable 전체를 판별하지 않는다. reduce를 겸용으로 만들 때도 accumulator가 Promise가 되는 순간 이후 결과를 연결해 누락된 await/return이 없게 한다.

미리 시작한 작업을 순서대로 나중에 소비할 필요가 있으면 생성 직후 각 원본 Promise에 rejection 관찰을 붙인다. 원본에 `p.catch(() => {})`를 붙이고 원본 p를 보관하면 이후 rejection은 그대로 관찰할 수 있지만 catch가 반환한 Promise는 undefined로 복구된다. 서로 바꾸면 오류가 사라진다. 이는 관찰 시점 조정일 뿐 작업 실패/취소 정책이 아니며, 일반 집합에는 Promise.all/allSettled가 더 단순하다.

Promise executor의 동기 throw도 constructor 밖으로 던지지 않고 rejection이 된다. Array map/filter/slice가 그 Promise를 값으로 다루면 predicate는 Promise를 truthy나 NaN으로 판단하고 실패는 연결되지 않는다. callback 결과를 합성한 최종 Promise를 try 안에서 await해야 각 단계 rejection이 같은 catch에 도달한다. lazy 소비는 아직 평가하지 않은 원소의 오류를 미룰 뿐 전체 원천이 성공했다는 증거가 아니다.

## 합성의 빈 입력과 정리 결과

`Promise.all([])`과 `allSettled([])`는 빈 배열로 fulfilled된다. `Promise.any([])`는 `AggregateError`로 rejected되고 `Promise.race([])`는 계속 pending이다. 반응 callback의 실행은 Promise의 이미 결정된 상태와 별개로 비동기다. `finally`는 원래 값을 인자로 받지 않고 정상 반환하면 앞 결과를 통과시키지만, 예외나 rejected Promise를 반환하면 그 실패로 결과를 바꾼다. 어느 합성 API도 남은 작업을 자동 취소하지 않는다.

## 출처

- [Promise combinators — V8](https://v8.dev/features/promise-combinators)
- [Promise.prototype.finally — V8](https://v8.dev/features/promise-finally)

- 인프런 보충 강의: [지연 평가 + Promise - L.map, map, take](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16625), [reduce에서 nop 지원](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16627), [지연된 함수열을 병렬적으로 평가하기 - C.reduce, C.take (1)](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16629), [지연된 함수열을 병렬적으로 평가하기 - C.reduce, C.take (2)](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16630)

- [ECMAScript Language Specification, Promise objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)
- [ECMAScript Language Specification, async function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-async-function-definitions)
- [ESLint, no-return-await](https://eslint.org/docs/latest/rules/no-return-await)
- [MDN, Promise.prototype.catch()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch)
- [MDN, Promise.prototype.finally()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally)
- [모던 자바스크립트 딥다이브 스터디 #10-3 (CH 45 프로미스) — FE재남](https://www.youtube.com/watch?v=VEux0lApQ4c)
- Promise 심화: [Promise 구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49499), [인스턴스 생성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49519), [then/catch](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49570), [resolve/thenable/reject](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49615), [all/race](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49769), [Promise 메커니즘](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49862)
- Promise 합성: [callback과 Promise](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16617), [비동기를 값으로](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16618), [Promise 값 활용](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16619), [Promise와 모나드](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16620), [Kleisli composition](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16621), [비동기 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16622), [then 규칙](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16623)
- async/await와 오류: [async/await](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16636), [Array map과 async map](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16637), [await와 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16638), [함께 사용하기](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16639), [동기 오류](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16640), [비동기 오류](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16641), [pipeline 오류 경계](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16642), [마무리](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16643)

## 관련 문서

- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[JavaScript-Function-Composition-and-Currying|JavaScript 함수 합성과 커링]]
- [[Event-Loop|Node.js Event Loop]]
- [[Async-Internals|비동기 내부 동작]]
- [[Monads-In-TypeScript|TypeScript 모나드]]
