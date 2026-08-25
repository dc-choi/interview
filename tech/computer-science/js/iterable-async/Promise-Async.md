---
tags: [cs, javascript, async, promise]
status: done
verified_at: 2026-08-04
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

`Promise.all`은 입력 순서로 성공 값을 반환하고 하나가 reject되면 결과 Promise를 reject한다. 다른 작업을 취소하지는 않는다. `Promise.allSettled`는 각 결과를 모두 수집하지만 실패를 성공으로 바꾸는 것은 아니므로 caller가 정책을 결정해야 한다. 큰 입력에는 [[JavaScript-Async-Iterable-Pipelines|bounded concurrency와 backpressure]]를 적용한다.

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

## 출처

- [ECMAScript Language Specification, Promise objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)
- [ECMAScript Language Specification, async function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-async-function-definitions)
- [ESLint, no-return-await](https://eslint.org/docs/latest/rules/no-return-await)
- Promise 심화: [Promise 구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49499), [resolve/reject](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49519), [then/catch](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49570), [chain](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49615), [all/race](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49769), [오류 흐름](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49862)
- Promise 합성: [callback과 Promise](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16617), [비동기를 값으로](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16618), [Promise 값 활용](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16619), [Promise와 모나드](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16620), [Kleisli composition](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16621), [비동기 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16622), [then 규칙](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16623)
- async/await와 오류: [async/await](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16636), [Array map과 async map](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16637), [await와 pipeline](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16638), [함께 사용하기](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16639), [동기 오류](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16640), [비동기 오류](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16641), [pipeline 오류 경계](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16642), [마무리](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16643)

## 관련 문서

- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[JavaScript-Function-Composition-and-Currying|JavaScript 함수 합성과 커링]]
- [[Event-Loop|Node.js Event Loop]]
- [[Async-Internals|비동기 내부 동작]]
- [[Monads-In-TypeScript|TypeScript 모나드]]
