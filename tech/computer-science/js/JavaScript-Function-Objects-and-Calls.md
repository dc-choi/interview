---
tags: [cs, javascript, function-object, arguments, hoisting]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Function Objects", "JavaScript 함수 객체와 호출"]
---

# JavaScript Function Object와 호출 준비

JavaScript function은 호출 가능한 object다. source text와 lexical environment, parameter, `this` mode 같은 실행 의미를 가진다. 명세의 internal slot과 engine의 실제 object layout을 일반 property처럼 취급하지 않는다.

## callable과 constructor는 별개다

- ordinary function declaration/expression은 보통 `[[Call]]`과 `[[Construct]]`를 모두 가진다.
- arrow function과 concise method는 callable이지만 constructor가 아니다.
- class constructor는 constructable이지만 `new` 없이 호출할 수 없다.
- bound function은 target이 constructable할 때 constructable할 수 있다.
- built-in function마다 callable/constructable 조합이 다르다.

`typeof value === "function"`은 callable 여부의 실용적 검사지만 constructor 가능 여부까지 보장하지 않는다.

## internal slot은 specification 장치다

ECMAScript function object는 종류에 따라 `[[Environment]]`, `[[PrivateEnvironment]]`, `[[FormalParameters]]`, `[[ECMAScriptCode]]`, `[[ThisMode]]`, `[[Strict]]`, `[[HomeObject]]` 같은 internal slot을 가질 수 있다. `[[...]]` 표기는 application code가 property access로 읽는 field가 아니다.

engine이 function object 생성 시 scope chain을 통째로 일반 property에 저장한다고 단정하지 않는다. engine은 closure semantics를 지키면서 representation과 optimization을 바꿀 수 있다.

## 함수 정의 형태

```ts
function declared() {}
const expressed = function namedForStack() {};
const arrow = () => {};
```

function declaration/expression, method, arrow, generator/async function은 서로 다른 grammar와 semantics를 가진다. `Function` constructor로 문자열 code를 만드는 방식도 가능하지만 현재 lexical scope를 capture하지 않고 global environment에서 parse되며 injection/CSP/최적화 문제가 있어 피한다.

`new function`을 함수 정의의 한 종류로 분류하지 않는다. `new Function(...)` constructor와 `new (function Constructor(){})()` instance 생성을 구분한다.

## declaration instantiation과 hoisting

함수 선언이 선언 전 호출 가능한 이유는 해당 script/function/module의 declaration instantiation 중 binding이 function object로 초기화되기 때문이다. 하지만 모든 code가 함수 선언, 변수 선언, 실행의 동일한 3단계를 갖는 것은 아니다.

- lexical declaration은 TDZ를 가진다.
- duplicate declaration/Annex B behavior는 strict mode와 code 종류에 따라 다르다.
- block 안 function declaration 의미를 오래된 sloppy browser 직관으로 일반화하지 않는다.
- function expression은 할당 expression이 실행돼야 binding에 function value가 들어간다.

## runtime overload는 없다

JavaScript runtime은 같은 scope/name의 function을 parameter type/count signature별로 dispatch하는 전통적 overload를 제공하지 않는다. 뒤 declaration/assignment가 binding을 대체할 수 있고 function body가 argument를 검사해 직접 분기한다.

TypeScript overload signature는 compile-time call type을 제공하지만 JavaScript output에는 단일 implementation만 남는다. domain command를 argument shape 하나로 과적재하기보다 이름/DTO를 분리한다.

## parameter와 arguments

`arguments`는 Array가 아닌 arguments exotic object다. modern runtime에서는 iterable일 수 있어도 Array method 전체를 갖는 것은 아니다.

- strict mode 또는 non-simple parameter list에서는 parameter와 `arguments[index]` aliasing을 기대하지 않는다.
- non-strict simple parameter list에는 mapped arguments semantics가 남아 있다.
- arrow function은 자체 `arguments` binding을 만들지 않는다.
- rest parameter는 실제 Array이고 필요한 인자만 명시하므로 기본 선택이다.
- default/rest/destructuring은 function `length`와 parameter environment 의미에도 영향을 준다.

## interface로서의 함수

함수 이름은 구현 절차보다 행위를 드러내는 동사와 domain 용어를 사용한다. 주석으로 문법을 반복하기보다 입력 전제, side effect, 오류와 반환 contract를 남긴다. 먼저 시나리오를 적고 구현하는 습관은 유용하지만 오래된 주석을 진실의 원천으로 두지 않고 type/test와 함께 유지한다.

- `return expression`은 값을 호출 지점으로 돌려주고 함수 실행을 끝낸다. `return`이 없거나 expression이 없으면 `undefined`다.
- `return` 바로 뒤 줄바꿈에는 ASI가 적용될 수 있으므로 반환 expression을 다음 줄에 홀로 두지 않는다.
- function object의 `length`는 첫 default parameter 전까지의 formal parameter 수를 나타내며 rest parameter는 세지 않는다. 실제로 받은 argument 수나 overload 수가 아니다.
- `Function.prototype.toString()`은 명세가 정한 source representation을 반환하지만 code serialization, signature 검증이나 보안 경계로 사용하지 않는다.
- `call`은 argument를 개별 전달하고 `apply`는 array-like list로 전달한다. 둘 다 target의 `this`와 호출을 제어할 뿐 별도 함수 종류는 아니다.

## NestJS/TypeScript 적용

- decorator가 function metadata를 읽는 것과 runtime overload dispatch를 혼동하지 않는다.
- controller/service API는 여러 positional argument보다 typed command object를 사용한다.
- method reference를 callback으로 분리할 때 `this`와 DI instance context를 잃지 않는다.
- dynamic Function/eval 대신 strategy map, parser 또는 sandboxed DSL을 사용한다.

## 출처

- [ECMAScript Language Specification, ECMAScript Function Objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ecmascript-function-objects)
- [ECMAScript Language Specification, Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html)
- [ECMAScript Language Specification, arguments exotic objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arguments-exotic-objects)
- function object: [형태/생성](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26673), [구조](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26674), [실행 환경](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26675), [internal slot](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26676), [정의 형태](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26677), [해석 순서](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26678), [declaration instantiation](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26679), [hoisting](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26680), [overload](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26681)
- [arguments/parameter](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26683)
- 함수 기초: [구성/이름](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24619), [호출/return](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24620), [주석과 시나리오](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24621)
- Function object: [API/new Function](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24657), [종류/length](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24658), [선언/표현식](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24659), [call/apply/toString](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24660), [arguments](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24661)

## 관련 문서

- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[Hoisting|호이스팅과 TDZ]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 호출 방식]]
- [[TS-Function-Overloading|TypeScript 함수 오버로딩]]
