---
tags: [javascript, typescript, function, this, coding-style]
status: done
verified_at: 2026-09-12
category: "CS - 코드 품질"
aliases: ["함수 문법 선택의 기술 조건"]
---

# 함수 문법 선택의 기술 조건

사용자는 화살표 함수 선호의 예외를 정하도록 요청했다. 이 문서는 2026-09-12에 확인한 언어와 API 계약이며, 화살표 함수 우선이라는 개인 선호에 적용할 기술 조건을 기록한다. `verified_at`은 이 기술 조건을 공식 자료와 대조한 날짜다.

사용자 선호의 정본은 [tech/AGENTS.md](../../../AGENTS.md#개인-코딩-선호), 확인 사례는 [[Coding-Preferences]]에 있다. 기존 기술 문서는 [[JS-Function-Forms]], [[JavaScript-this-and-Function-Invocation]], [[JavaScript-Class-Semantics]]에 있다.

## 필요한 동작에 따른 선택

| 필요한 동작 | 선택 기준 |
|---|---|
| 호출한 객체를 `this`로 사용 | 객체나 클래스의 메서드 문법을 사용한다. 객체 리터럴의 화살표 함수는 객체 자체를 `this`로 받지 않는다. |
| API가 지정하는 콜백의 `this` 사용 | 일반 함수를 사용한다. 예를 들어 Node.js `EventEmitter`의 일반 리스너는 emitter를 `this`로 받는다. 그 `this`가 필요 없는 리스너는 화살표 함수로 작성할 수 있다. |
| `call`, `apply`, `bind`로 receiver 지정 | 일반 함수나 메서드를 사용한다. 화살표 함수의 lexical `this`는 이 호출들로 교체되지 않는다. |
| `new`로 생성 | 생성 가능한 함수 또는 클래스를 사용한다. 화살표 함수는 생성자가 아니다. 단순히 객체를 반환하는 factory는 화살표 함수로 작성할 수 있다. |
| 본문에서 `yield`로 실행 중단과 재개 | `function*`, `async function*` 또는 generator 메서드를 사용한다. 화살표 generator 문법은 없다. |
| 함수 자신의 `arguments` 사용 | 기존 호출 의미를 유지해야 하면 일반 함수나 메서드를 사용한다. 가변 인자만 필요한 경우에는 rest parameter로 화살표 함수를 사용할 수 있다. |
| 정의가 평가되기 전의 호출 유지 | 함수 선언식을 사용한다. `const`에 담긴 함수 표현식과 화살표 함수는 초기화 전 호출할 수 없다. 실행이 초기화 이후라면 소스에서 이름을 먼저 참조한다는 이유만으로 선언식이 필요한 것은 아니다. |

## 클래스 메서드와 인스턴스 필드

클래스의 `activate() { ... }`는 프로토타입 메서드이고 `activate = () => { ... }`는 인스턴스마다 생성되는 함수 필드다. 후자는 인스턴스의 `this`를 유지하지만, 해당 함수가 프로토타입에 없어서 자식의 `super.activate()`로 호출할 부모 메서드를 제공하지 않는다. 언어상 두 형태가 가능하다는 사실과 별도로, 사용자는 클래스 메서드를 일반적인 메서드 문법으로 통일하기로 했다. 메서드를 콜백으로 전달하면서 인스턴스의 `this`를 유지해야 하면 호출부에서 wrapper arrow 또는 `bind`로 처리한다.

## 실행 확인

Node.js에서 API가 지정한 `this`를 실제로 사용하는 예시는 다음과 같다.

```js
import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
emitter.on("ready", function () {
  this.emit("started");
});
```

Node.js v26.7.0에서 리스너의 `this`, 화살표 함수의 생성자와 generator 제한, 메서드와 인스턴스 필드의 차이, 선언식과 `const` 초기화 시점을 작은 예시로 실행해 확인했다. 프로젝트별 라이브러리, decorator와 실행 순서는 해당 코드에서 별도로 확인한다.

## 출처

- 2026-09-12 사용자와의 코딩 취향 확인 대화. 화살표 함수 선호의 예외를 정하도록 요청했고, 클래스 메서드 문법과 콜백 전달 방식을 확인했다.
- [ECMAScript Language Specification, Arrow Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions)
- [ECMAScript Language Specification, Generator Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions)
- [TypeScript Handbook, Declaring this in a Function](https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function)
- [TypeScript Handbook, Arrow Functions in Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html#arrow-functions)
- [Node.js, Passing arguments and this to listeners](https://nodejs.org/api/events.html#passing-arguments-and-this-to-listeners)

## 관련 문서

- [[코드품질(CodeQuality)|코드 품질]]
- [[Coding-Preferences|개인 코딩 선호의 확인 사례]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-this-and-Function-Invocation|this와 호출 방식]]
- [[JavaScript-Class-Semantics|클래스 메서드와 인스턴스 필드]]
