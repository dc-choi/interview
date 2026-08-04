---
tags: [runtime, nodejs, javascript, scope, lexical-environment]
status: done
category: "OS & Runtime"
aliases: ["Scope", "JavaScript Scope", "JavaScript 스코프"]
verified_at: 2026-08-04
---

# JavaScript Scope와 identifier resolution

scope는 identifier가 어느 binding을 가리키는지 정하는 lexical boundary다. 이름이 보이는 범위와 object property를 찾는 prototype chain은 서로 다른 lookup mechanism이다.

## lexical scope

JavaScript function은 호출한 위치가 아니라 정의된 source 위치의 outer environment를 연결한다.

```ts
const value = "outer";

function print() {
  console.log(value);
}

function run() {
  const value = "caller";
  print(); // outer
}
```

engine은 현재 Environment Record에서 binding을 찾고 없으면 outer reference를 따라간다. 끝까지 찾지 못한 identifier read는 `ReferenceError`다. 이 동작을 scope chain이라 부르기도 하지만 현재 명세는 Environment Record/outer environment 용어로 표현한다.

## function/block/module scope

- `var`와 function declaration의 범위는 code 종류와 declaration instantiation 규칙을 따른다. function code의 `var`는 block을 무시하고 function 범위다.
- `let`/`const`/class는 block-scoped lexical binding이다.
- catch parameter와 `for`문의 lexical declaration도 별도 environment를 만들 수 있다.
- ESM의 top-level declaration은 module scope이고 import/export binding과 연결된다.

block이 있다고 항상 새 scope가 생기는 것은 아니고 그 block에 lexical declaration이 있는지와 명세 algorithm을 본다.

## global scope는 global object와 같지 않다

Global Environment Record는 Object Environment Record와 Declarative Environment Record를 함께 포함한다. browser classic script의 top-level `var`/function은 global object property와 연결될 수 있지만 `let`/`const`/class는 global lexical binding이며 `window.name`처럼 읽을 수 없다.

Node.js CommonJS/ESM의 file top level도 browser classic global과 다르다. `globalThis`가 있다고 file 선언이 모두 global property가 되는 것은 아니다.

## dynamic lookup을 만드는 기능

JavaScript의 기본은 lexical scope지만 direct `eval`과 `with`는 identifier resolution/optimization/security를 복잡하게 만든다. strict mode에서는 `with`가 금지되고 strict eval의 declaration은 caller scope로 새지 않는다. dynamic code가 필요하다는 이유로 문자열을 `eval`/`Function`에 넣지 말고 parser/interpreter 또는 data-driven dispatch를 사용한다.

## binding과 value 변경을 구분한다

scope가 lexical하게 고정돼도 binding이 가리키는 value와 object property는 실행 중 바뀔 수 있다. closure가 같은 binding을 공유하면 최신 value를 관찰한다. scope가 동적으로 바뀐다는 표현으로 mutation을 설명하지 않는다.

## 설계 지침

- global mutable binding을 줄이고 ESM export로 dependency를 명시한다.
- shadowing이 의미 있는 작은 scope를 제외하면 같은 이름 재사용을 피한다.
- NestJS에서는 module/provider injection을 lexical global singleton처럼 숨기지 않는다.
- AsyncLocalStorage 같은 request context는 lexical scope가 아니라 runtime async context propagation이므로 구분한다.

## 출처

- [ECMAScript Language Specification, Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records)
- [ECMAScript Language Specification, global Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-global-environment-records)
- [scope 목적/설정](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26685), [global object](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26686), [global scope](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26687), [lexical/dynamic binding](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26688)

## 관련 문서

- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[Closure|JavaScript 클로저]]
- [[Variable-Declarations|var, let, const]]
- [[JavaScript-ES-Modules|ES Modules]]
- [[Thread-vs-Event-Loop|AsyncLocalStorage와 async context]]
