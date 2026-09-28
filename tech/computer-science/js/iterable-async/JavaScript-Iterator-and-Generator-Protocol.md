---
tags: [cs, javascript, iterable, iterator, generator]
status: done
verified_at: 2026-09-28
category: "CS - JavaScript"
aliases: ["JavaScript Iterator Generator Protocol", "JavaScript 이터레이터와 제너레이터"]
---

# JavaScript Iterator와 Generator protocol

iterable은 iterator를 만드는 계약이고 iterator는 값을 한 단계씩 꺼내는 stateful cursor다. Generator는 실행을 일시 중단/재개하는 언어 기능으로 iterator 구현을 단순하게 하지만, lazy collection이나 비동기 작업을 자동으로 안전하게 만들지는 않는다.

## iterable과 iterator

```ts
const range = {
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
  },
};
```

- iterable protocol은 `[Symbol.iterator]()` method를 요구한다.
- iterator protocol은 `next()`가 object(IteratorResult)를 반환할 것을 요구한다. `done`과 `value`는 생략할 수 있고, 소비자는 `done`을 boolean으로 변환해 읽으므로 `done`이 없으면 `false`, `value`가 없으면 `undefined`로 본다. `done: true` 이후에도 계속 `done: true`를 반환하는 것은 기대되는 관례이며 언어가 강제하지 않는다.
- iterator가 자기 자신을 반환하는 iterable iterator일 수도 있다.
- reusable iterable은 순회마다 새 iterator를 만들고, iterator object 자체는 보통 한 번 전진하면 되돌릴 수 없다.
- exhausted iterator가 즉시 소멸한다는 보장은 없다. 참조가 남으면 object도 남는다.

Array, String, Map, Set은 iterable이지만 일반 object는 아니다. array-like와 iterable도 별개다. 소비자는 `for...of`, spread, destructuring, `Array.from`처럼 iterator protocol을 공유한다.

`done`이 truthy가 되지 않는 iterator는 끝나지 않는다. `for...of`는 값을 하나씩 당겨 오므로 `break`나 `return`으로 멈출 수 있지만, spread, `Array.from`, 배열 구조 분해의 rest처럼 끝까지 모으는 소비자는 멈출 지점이 없어 정상적으로 반환하지 못한다. 명세상 이 누적에는 실용적인 상한이 없으므로 결과 배열은 engine의 배열 길이 한도나 heap 한도에 닿을 때까지 커지다가 실패한다. Node.js v26.7.0의 기본 heap 한도가 약 4GiB인 환경(메모리 24GiB 장비)에서는 `Array.from`과 rest가 `RangeError: Invalid array length`를 던졌지만, spread는 `try/catch`로 잡을 수 없는 fatal error로 프로세스를 종료했다(exit code 134). 기본 heap 한도는 Node.js가 장비나 컨테이너(cgroup)의 메모리로 정하므로 같은 버전에서도 결과가 달라진다. `--max-old-space-size=1024`로 old space 한도를 1GiB로 줄이면 무한 generator에서는 `Array.from`과 rest도 heap 부족 fatal error로 종료됐고(자기 자신을 반환하는 일반 object iterator에서는 rest가 여전히 `RangeError`를 던졌다), 64로 줄이면 세 소비자 모두 같은 오류로 종료됐다. 동기 순회가 끝나지 않으면 run-to-completion 때문에 event loop도 다음 작업을 처리하지 못한다.

`typeof value?.[Symbol.iterator] === "function"` 검사는 method가 호출 가능한지만 확인하고 나머지 계약 위반은 실제 순회에서 드러난다. method가 object가 아닌 값을 반환하거나, 반환한 iterator의 `next`를 호출할 수 없거나, `next()` 결과가 object가 아니면 소비자가 `TypeError`를 던진다. 문자열도 이 검사를 통과하므로 단일 값과 iterable을 함께 받는 API는 문자열을 먼저 분기해야 문자 단위로 쪼개지지 않는다.

```ts
/** 단일 태그 또는 태그 iterable을 배열로 정규화한다. */
const toTagList = (input: string | Iterable<string>): string[] =>
  typeof input === "string" ? [input] : [...input];

toTagList("node");                 // ["node"]
toTagList(new Set(["a", "b"]));    // ["a", "b"]
```

## Generator의 실행 상태

Generator function을 호출하면 body를 즉시 실행하지 않고 suspended-start 상태의 generator object를 반환한다. `next()`가 실행을 다음 `yield`/`return`/종료까지 진행한다.

```ts
function* counter() {
  const step = yield 0;
  yield step;
  return 2;
}

const it = counter();
it.next();    // { value: 0, done: false }
it.next(1);   // 이전 yield 표현식의 결과가 1
it.next();    // { value: 2, done: true }
```

첫 `next(value)`의 value는 아직 멈춰 있는 `yield`가 없으므로 일반적으로 소비되지 않는다. `for...of`는 `done: true`의 최종 return value를 순회 값으로 내보내지 않는다.

Generator의 local binding과 execution position은 resume 사이에 보존된다. 이것은 thread 병렬 실행이 아니라 같은 agent에서 제어가 협력적으로 오가는 것이다.

## return, throw와 cleanup

`generator.return(value)`는 현재 지점에 return completion을 주입한다. `finally`가 없다면 종료되지만 `finally` 안에 `yield`가 있으면 추가 값을 낸 뒤 나중에 종료할 수도 있으므로 언제나 즉시 끝난다고 단정하지 않는다.

`generator.throw(error)`는 현재 중단 지점에 예외를 주입한다. generator 내부 `try/catch`가 처리할 수 있고 처리하지 않으면 caller로 전파된다. 반환값은 처리 방식에 따라 다르다. `catch`가 잡은 뒤 다음 `yield`에 도달하면 `{ value, done: false }`, 잡은 뒤 body가 끝나면 return 값과 `done: true`를 반환한다. 잡지 못하고 `finally`도 정상 종료되면 예외가 `throw()` 호출자에게 전파되고 generator는 completed가 된다(`finally`가 `return`, `throw`, `break`, `continue`로 끝나면 일반 함수에서처럼 그 완료가 이 예외를 대체한다). 다만 예외가 지나가는 `finally`에 `yield`가 있으면 `throw()`는 그 값을 `{ value, done: false }`로 먼저 반환하고, 예외는 `next()`로 재개해 `finally`가 끝날 때 전파된다.

첫 `next()` 전의 suspended-start 상태에서는 body에 들어간 적이 없어 body의 `try/catch/finally`가 적용되지 않는다. 이때 `return(value)`는 `finally`를 실행하지 않고 `{ value, done: true }`를 반환하고, `throw(error)`는 generator를 completed로 바꾼 뒤 예외를 바로 호출자에게 던진다.

`for...of`를 `break`, `return` 또는 throw로 빠져나오면 iterator closing이 `return()`을 호출할 수 있다. file/cursor/lock을 가진 custom iterator와 generator는 `finally`에서 정리하되, 중요한 resource는 명시적 disposable/owner 경계도 둔다.

## yield* 위임

`yield* iterable`은 하위 iterator의 값만 복사하는 문법이 아니다. `next`, `throw`, `return` 흐름을 위임하고 하위 iterator의 최종 return value를 표현식 결과로 받을 수 있다.

```ts
function* tree(node: Node): Generator<Node> {
  yield node;
  for (const child of node.children) yield* tree(child);
}
```

재귀 generator도 cycle, maximum depth와 cancellation 정책이 필요하다. untrusted graph를 무한히 순회하지 않는다.

## 동적 GeneratorFunction은 피한다

Generator function도 constructor를 통해 동적으로 만들 수 있지만 global scope에서 문자열 code를 parse한다는 점에서 `Function` constructor와 같은 보안/최적화 문제가 있다. global `GeneratorFunction` binding이 없다는 사실을 생성 불가능하다는 뜻으로 오해하지 않는다. 일반 선언/표현식과 module code를 사용한다.

## backend 적용

- DB cursor/file stream을 iterable로 감쌀 때 조기 종료 cleanup과 timeout을 검증한다.
- sync generator 안에 이미 시작된 Promise를 넣어도 I/O 시작이 lazy해지지 않는다.
- 큰 result를 array로 전부 만들기보다 iterable/async iterable로 streaming하되 backpressure를 연결한다.
- NestJS request가 끝날 때 iterator owner가 resource를 닫도록 interceptor/adapter 경계를 둔다.

## 출처

- [ECMAScript Language Specification, iteration interfaces](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-common-iteration-interfaces)
- [ECMAScript Language Specification, Generator objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generator-objects)
- [ECMAScript Language Specification, generator definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions)
- [ECMAScript Language Specification, operations on iterator objects](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-operations-on-iterator-objects)
- [ECMAScript Language Specification, GeneratorResumeAbrupt](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generatorresumeabrupt)
- [ECMAScript Language Specification, ArrayAccumulation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-runtime-semantics-arrayaccumulation)
- [ECMAScript Language Specification, Array.from](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.from)
- [ECMAScript Language Specification, IteratorBindingInitialization](https://tc39.es/ecma262/multipage/syntax-directed-operations.html#sec-runtime-semantics-iteratorbindinginitialization)
- [ECMAScript Language Specification, IteratorDestructuringAssignmentEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-runtime-semantics-iteratordestructuringassignmentevaluation)
- [Node.js v26.7.0 environment.cc — Node.js](https://github.com/nodejs/node/blob/v26.7.0/src/api/environment.cc)
- [MDN, Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [MDN, Generator.prototype.throw()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/throw)
- [MDN, JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- iteration protocol: [개요](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30734), [iterable](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30735), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30736)
- Generator: [함수/객체](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30791), [GeneratorFunction](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30792), [yield](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30793), [next](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30794), [반복 yield](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30795), [destructuring/for...of](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30796), [return/throw](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30797), [yield*](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30798)
- [모던 자바스크립트 딥다이브 스터디 #7-2 (CH 32 - 33) — FE재남](https://www.youtube.com/watch?v=poVRjQyhkM0)
- [모던 자바스크립트 딥다이브 스터디 #9-1 (CH 34 - 36) — FE재남](https://www.youtube.com/watch?v=JUS-7rQehMw)
- [모던 자바스크립트 딥다이브 스터디 #11-1 (CH 46 제네레이터와 async/await) — FE재남](https://www.youtube.com/watch?v=IyLdUbzyqcs)

## 관련 문서

- [[JavaScript-Iterable-Functional-Pipelines|JavaScript 이터러블 파이프라인]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블]]
- [[JavaScript-Lexical-Scope-and-Modern-Syntax|JavaScript 모던 문법]]
- [[Graceful-Shutdown|Graceful Shutdown]]
