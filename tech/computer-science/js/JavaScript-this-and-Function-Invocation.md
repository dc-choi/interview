---
tags: [cs, javascript, this, call, apply, bind]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript this Binding", "JavaScript this와 함수 호출"]
---

# JavaScript this와 함수 호출 방식

ordinary function의 `this`는 함수가 정의된 위치보다 호출 expression과 function의 `[[ThisMode]]`에 따라 정해진다. arrow function은 lexical `this`를 사용한다. 바로 앞 object라는 암기법은 optional chaining, extraction, proxy와 callback에서 쉽게 무너지므로 call form으로 판단한다.

## 호출 형태별 this

| 호출 형태 | ordinary function의 this |
|---|---|
| `fn()` | strict면 `undefined`, sloppy면 global object로 치환 가능 |
| `obj.fn()` | reference의 base인 `obj` |
| `fn.call(value, ...)` | 명시한 value, sloppy function은 null/primitive 변환 가능 |
| `fn.apply(value, args)` | call과 같고 argument list를 array-like로 받음 |
| `new Fn()` | 새 instance, constructor 반환 규칙 적용 |
| `bound()` | bind 때 저장한 target/this/선행 argument |
| arrow function | enclosing lexical environment의 this |

```ts
const order = {
  id: 1,
  getId() { return this.id; },
};

order.getId();
const getId = order.getId;
getId(); // receiver를 잃음
```

method를 변수/argument로 넘기면 member reference가 아니라 function value만 전달돼 receiver가 사라진다. bind, wrapper arrow 또는 receiver를 명시적으로 받는 pure function 중 계약에 맞는 방식을 고른다.

## top-level this

- browser classic script top-level `this`는 보통 global object다.
- ESM top-level `this`는 `undefined`다.
- Node.js CommonJS file top-level `this`는 일반적으로 `module.exports`이고 ESM은 `undefined`다.
- `globalThis`는 환경별 global object 접근을 통일하지만 모든 lexical binding을 property로 만들지는 않는다.

event attribute, event listener, timer와 framework callback은 host API가 callback 호출 방식을 정의하므로 각 API contract를 확인한다.

## call과 apply

`call(thisArg, a, b)`과 `apply(thisArg, [a, b])`는 같은 `[[Call]]` 의미로 target function을 호출하며 argument 제공 방식이 다르다. iterable만 있고 array-like가 아니라면 spread call `fn(...iterable)`이 자연스럽다.

strict function은 `thisArg`를 그대로 받는다. non-strict ordinary function은 `null`/`undefined`를 global object로 바꾸고 primitive를 object로 box할 수 있다. class/module code의 strict 직관과 오래된 sloppy script를 섞지 않는다.

## bind의 두 기능

`bind`는 bound function exotic object를 새로 만들고 `this`와 leading argument를 저장한다.

```ts
const loadPage = load.bind(loader, 20); // this=loader, 첫 인자=20
```

- 원본과 다른 function identity이므로 event listener 제거/cache key에 주의한다.
- 다시 bind해도 이미 bound된 `this`를 바꾸지 못하지만 argument는 앞에 더 붙을 수 있다.
- target이 constructor라면 bound function도 `new`로 호출 가능하다. 이 경우 bound `this`는 무시되고 새 instance가 사용되며 선행 argument는 유지된다.
- arrow function에 bind를 호출해도 lexical `this`는 바뀌지 않는다.

## callback과 thisArg

Array의 일부 method는 callback `thisArg`를 받지만 arrow callback은 이를 무시한다. callback이 outer instance를 써야 하면 arrow를, reusable callback이 명시적 receiver를 받아야 하면 ordinary function과 `thisArg`를 쓴다.

DOM `addEventListener`에서 ordinary listener의 `this`는 일반적으로 `currentTarget`과 같지만 arrow는 lexical this다. component teardown에는 등록할 때와 같은 listener identity 또는 `AbortSignal`을 사용한다.

## prototype method와 instance

prototype method를 `instance.method()`로 호출하면 lookup은 prototype에서 해도 receiver는 instance다. `Constructor.prototype.method()`로 직접 호출하면 receiver는 prototype object이므로 instance state를 기대하면 실패한다. `call(instance)`로 명시할 수 있지만 brand/private field와 invariant를 확인한다.

## NestJS 적용

- `service.method`를 queue/event callback으로 직접 넘기지 말고 binding을 검증한다.
- arrow class field는 instance마다 function을 만들고 prototype override/testing identity에 영향을 준다.
- request handler wrapper에서 `this`를 보존하는 것과 AsyncLocalStorage context 전파는 별개다.
- function borrowing보다 명시적 adapter/interface가 domain dependency를 더 잘 드러내는지 비교한다.

## 출처

- [ECMAScript Language Specification, ResolveThisBinding](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-resolvethisbinding)
- [ECMAScript Language Specification, Function.prototype call/apply/bind](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-properties-of-the-function-prototype-object)
- [this/global](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26708), [strict/receiver](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26709), [instance](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26710), [call](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26711), [apply/arguments](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26712), [callback](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26713), [bind/partial argument](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26714), [event binding](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26715)

## 관련 문서

- [[JavaScript-Function-Objects-and-Calls|JavaScript Function Object]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[JavaScript-Class-Semantics|JavaScript Class 의미]]
- [[Event-Bubbling-Capturing|DOM event 전파]]
