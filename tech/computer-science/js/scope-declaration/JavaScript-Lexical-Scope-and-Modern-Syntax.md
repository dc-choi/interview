---
tags: [cs, javascript, scope, arrow-function, destructuring, spread]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Modern Syntax", "JavaScript 렉시컬 스코프와 모던 문법"]
---

# JavaScript 렉시컬 스코프와 모던 문법

`let`/`const`, arrow function, spread/rest와 destructuring은 단순 축약 문법이 아니다. binding 범위, `this`, 순회 protocol과 property 복사 규칙을 바꾸므로 실행 의미를 기준으로 선택한다. ES6+는 ES2015 이후 기능을 묶어 부르는 관용 표현이며 현재 ECMAScript는 매년 갱신되는 living specification으로 확인한다.

## 실행 환경과 strict mode

ECMAScript는 언어를 정의하고 browser/Node.js 같은 host가 global object, module loading, timer와 I/O를 제공한다. 같은 문법도 classic script, ESM과 CommonJS wrapper에서 top-level binding이 다르다.

- ESM과 class body는 자동으로 strict mode다.
- 일반 classic script가 ES2015 문법을 쓴다고 자동으로 strict mode가 되지는 않는다.
- classic browser script의 top-level `var`는 global object property가 될 수 있지만 top-level `let`/`const`는 global lexical binding이다.
- 여러 classic script는 global environment를 공유한다. 격리가 필요하면 ESM을 사용한다.
- Node.js CommonJS의 top level은 module wrapper 안이고 ESM은 별도 module scope다.

`"use strict"`는 script나 함수 본문 첫머리의 directive prologue, 즉 맨 앞에 연속으로 놓인 문자열 리터럴 문장 묶음 안에 있을 때만 효력이 있다. 다른 문장 뒤에 쓰면 효과 없는 문자열 expression이 되고, `{}` block 단위로는 켤 수 없다.

- 함수 본문에 두면 그 함수의 parameter 목록, 본문과 중첩 함수가 strict code가 된다. default, rest, destructuring parameter를 쓰는 함수에 두면 `SyntaxError`이므로 바깥 script나 module 단위로 적용한다.
- classic script 여러 개를 한 파일로 이어 붙이면 합친 결과의 첫머리가 전체 mode를 정한다. strict 파일이 앞이면 뒤의 sloppy 코드도 strict로 해석돼 동작이 바뀌고, 뒤 코드에 `with` 같은 sloppy 전용 문법이 있으면 `SyntaxError`로 합친 script 전체가 실행되지 않는다. sloppy 파일이 앞이면 뒤 파일의 지시어는 무시된다. 파일 경계를 지키려면 파일마다 함수로 감싸고 strict 파일의 `"use strict"`만 그 함수 본문 첫머리에 둔다. 감싸면 최상위 `var`와 함수 선언이 전역이 아니게 되고 `(function () { ... })()`로 호출한 strict 파일의 최상위 `this`는 global object가 아니라 `undefined`가 되므로, 다른 파일이 쓰는 이름은 `globalThis`에 명시적으로 붙인다. ESM으로 바꾸면 파일은 따로 parse되지만 모든 module이 strict mode라 `with`처럼 sloppy mode에 기대는 코드는 먼저 strict에서 동작하게 고친다.
- CommonJS는 파일마다 module wrapper 함수 안에서 실행되므로 파일 첫머리의 `"use strict"`는 그 파일에만 적용된다.
- 같은 이름의 parameter는 sloppy mode의 simple parameter list에서만 허용되고 마지막 parameter가 앞의 것을 가린다. strict code, arrow function, method와 non-simple parameter list에서는 `SyntaxError`다.

`object`, `instance`, `property`, `function`, `method`를 혼용하지 않는다. 특히 callable value가 property에 들어 있다는 사실과 method definition 문법/내부 의미가 항상 같지는 않다.

## let, const와 TDZ

`let`과 `const`는 block-scoped lexical declaration이다. `if`, loop, `switch`, `try/catch`의 block마다 같은 이름을 별도 binding으로 가질 수 있다.

```ts
for (let index = 0; index < 3; index++) {
  queueMicrotask(() => console.log(index));
}
```

`for` 머리의 `let`은 반복마다 새 binding을 만들어 각 callback이 0, 1, 2를 출력한다. `for` 머리의 `var`나 반복문 밖에서 선언한 `let`과 결과가 달라지는 이유는 [[Closure#binding을 기억한다|closure와 반복문 binding]]에서 다룬다.

lexical declaration도 scope 시작부터 binding은 존재하지만 선언 평가 전까지 초기화되지 않은 TDZ에 있다. 따라서 호이스팅되지 않는다고 외우기보다 선언 전 접근이 `ReferenceError`라는 의미를 기억한다.

`const`는 binding 재할당을 막을 뿐 object 내부를 freeze하지 않는다. 기본은 `const`, 의도적인 재할당만 `let`을 사용하고 immutable value가 필요하면 별도 data design을 적용한다.

## arrow function의 lexical binding

arrow function은 자체 `this`, `arguments`, `super`, `new.target` binding을 만들지 않고 바깥 lexical environment에서 해석한다.

```ts
class Counter {
  value = 0;
  incrementLater() {
    queueMicrotask(() => this.value++);
  }
}
```

- `call`, `apply`, `bind`로 arrow function의 `this`를 바꿀 수 없다.
- constructor가 아니므로 `new`와 함께 쓸 수 없고 ordinary function처럼 `prototype` property를 갖지 않는다.
- 자체 `arguments`는 없지만 enclosing non-arrow function의 `arguments`가 있으면 lexical lookup으로 읽을 수 있다. 항상 `ReferenceError`라고 단정하지 않는다. Node.js CommonJS 파일은 module wrapper 함수 안에서 실행되므로 top level arrow가 읽는 `arguments`는 wrapper가 받은 인자 5개(`exports`, `require`, `module`, `__filename`, `__dirname`)이고, 같은 코드를 ESM으로 옮기면 enclosing function이 없어 `ReferenceError`다(Node.js 26.7 확인).
- 인자 목록이 필요하면 실제 Array인 rest parameter를 사용한다.
- concise body에서 object literal을 반환할 때는 `() => ({ id: 1 })`처럼 괄호로 감싼다.

object method처럼 dynamic receiver가 필요한 곳에는 method syntax를, callback에서 바깥 context를 유지할 때는 arrow function을 우선한다.

## spread와 rest

같은 `...`라도 문맥별 protocol이 다르다.

| 문맥 | 입력/결과 |
|---|---|
| array/call spread | iterable을 개별 값으로 소비 |
| object spread | enumerable own string/symbol property를 얕게 복사 |
| rest parameter | 남은 argument를 새 Array로 수집 |
| destructuring rest | 남은 element/property를 새 container로 수집 |

array-like는 `length`와 index property를 가진 구조이고 iterable은 `[Symbol.iterator]`를 제공하는 구조다. 둘은 겹칠 수 있지만 동의어가 아니다. object spread는 iterator를 쓰지 않으며 descriptor와 prototype을 보존하지 않는다.

## destructuring과 default

```ts
function connect({ host, port = 5432 }: Options) {
  // ...
}
```

- default initializer는 값이 `undefined`일 때만 실행된다. `null`, `0`, `false`는 보존된다.
- 선언 없이 기존 변수에 object destructuring으로 할당할 때는 `({ a, b } = obj);`처럼 괄호로 감싼다. 문장 첫머리의 `{`는 block으로 해석되기 때문이다([[JavaScript-Expressions-Control-Flow-and-Coercion#statement와 ASI|statement 시작 규칙]]).
- object pattern은 오른쪽 값이 `null`이나 `undefined`이면 빈 pattern `{}`이어도 `TypeError`이고, array pattern은 iterator를 얻지 못해 `TypeError`다. `findOne`, `String.prototype.match`, `RegExp.prototype.exec`처럼 `null`을 반환할 수 있는 결과는 `null`인지 먼저 확인한 뒤 구조 분해한다. primitive는 wrapper object를 거쳐 읽으므로 `const { length } = "hello"`는 `5`다.
- parameter를 구조 분해하는 함수는 `({ page = 1 } = {}) => page`처럼 parameter 전체에도 default를 둬야 인자 없이 호출해도 `TypeError`가 나지 않는다.
- computed key, rename과 nested pattern은 가능하지만 실패 위치가 숨으면 단계별 validation이 낫다. nested pattern `{ address: { city } }`의 `address`는 property key일 뿐 변수가 되지 않으므로 부모 값도 필요하면 `{ address, address: { city } }`처럼 같은 key를 한 번 더 쓴다.
- parameter destructuring 전에 외부 입력 schema를 검증한다.
- object shorthand/computed property는 key 생성 문법이며 duplicate key는 뒤 정의가 앞 값을 덮을 수 있다.

## for...of와 for...in

`for...of`는 iterable의 값을 소비하고 조기 종료 때 iterator cleanup을 수행할 수 있다. `for...in`은 object의 enumerable string property name을 inherited property까지 대상으로 삼는다. 일반 record의 own key가 필요하면 `Object.keys`, `values`, `entries` 또는 `Reflect.ownKeys` 중 key/descriptor 요구에 맞게 고른다.

trailing comma는 diff를 안정화하지만 rest element 뒤에는 둘 수 없다. exponentiation은 우결합이고 unary expression을 왼쪽 피연산자로 바로 두는 문법 제약이 있다. optional catch binding은 error를 정말 사용하지 않을 때만 생략한다.

## getter와 setter

accessor는 property 문법으로 계산과 validation을 연결한다. I/O나 큰 계산을 getter에 숨기면 caller가 비용/실패를 알기 어렵다. setter만으로 domain invariant를 흩뜨리기보다 명시적 command method나 immutable update가 더 적합한지 비교한다.

## TypeScript/NestJS 적용

- DTO destructuring 전에 pipe/schema validation을 통과시킨다.
- provider method를 callback으로 넘길 때 `this`를 잃는지 확인한다.
- object spread로 entity를 복제하면 prototype, private state와 descriptor가 사라질 수 있으므로 mapper를 둔다.
- `const`를 domain immutability와 동일시하지 말고 readonly type, constructor invariant와 persistence update 정책을 함께 쓴다.

## block과 initializer의 실제 경계

switch의 case/default는 따로 scope를 만들지 않고 switch 전체가 하나의 lexical block이다. case마다 let 이름을 쓰려면 각각 {}로 묶는다. try와 catch는 형제 block이며 catch는 try 안의 let을 읽지 못한다. 여러 classic script의 global lexical binding은 서로 보이지만 window property가 아니며 같은 이름 let/const를 다시 선언하면 뒤 script 평가가 SyntaxError로 실패한다. ESM은 별도 module scope다.

default initializer는 필요할 때마다 왼쪽에서 오른쪽으로 평가한다. 앞 binding은 뒤 default에서 읽을 수 있지만 뒤 binding을 앞 default에서 읽으면 TDZ다. null에는 적용되지 않는다. 배열 pattern의 쉼표는 iterator를 진행해 값을 버리고 rest는 남은 iterator 전체를 배열로 수집한다. object pattern의 name은 property lookup이며 같은 key를 여러 번 읽을 수도 있다.

modern object literal은 strict에서도 같은 key의 뒤 정의가 앞 값을 덮는다. computed key도 충돌할 수 있으므로 dispatch key는 외부 문자열을 그대로 사용하지 말고 allowlist로 검증한다. array-like 소비는 length 기준으로 0부터 읽고 없는 index는 undefined로 보므로 index 수와 length가 맞는지, 터무니없이 큰 length가 allocation을 유발하는지 확인한다. iterable method가 있으면 Array.from은 iterable 경로를 먼저 사용한다.

## 출처

- 인프런 보충 강의: [1. from(), of()](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30776)

- [ECMAScript Language Specification, declarations and variables](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html)
- [ECMAScript Language Specification, arrow function definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions)
- [ECMAScript Language Specification, destructuring assignment](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-destructuring-assignment)
- [ECMAScript Language Specification, expression statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-expression-statement)
- [ECMAScript Language Specification, directive prologue와 use strict](https://tc39.es/ecma262/multipage/ecmascript-language-source-code.html#sec-directive-prologues-and-the-use-strict-directive)
- [ECMAScript Language Specification, strict mode code](https://tc39.es/ecma262/multipage/ecmascript-language-source-code.html#sec-strict-mode-code)
- [ECMAScript Language Specification, with statement early errors](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-with-statement-static-semantics-early-errors)
- [ECMAScript Language Specification, function definitions early errors](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions-static-semantics-early-errors)
- [ECMAScript Language Specification, parameter lists early errors](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-parameter-lists-static-semantics-early-errors)
- [MDN, Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
- [Node.js, CommonJS module wrapper](https://nodejs.org/api/modules.html#the-module-wrapper)
- [ECMAScript Language Specification, BindingInitialization](https://tc39.es/ecma262/multipage/syntax-directed-operations.html#sec-runtime-semantics-bindinginitialization)
- [MDN, Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)
- [MDN, String.prototype.match()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match)
- [MDN, RegExp.prototype.exec()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)
- [모던 자바스크립트 딥다이브 스터디 #4-3 (CH 20~22) — FE재남](https://www.youtube.com/watch?v=V73Nvyd5gK0)
- [모던 자바스크립트 딥다이브 스터디 #6-1 (CH 26 함수의 추가기능) — FE재남](https://www.youtube.com/watch?v=eeDbljgvCxg)
- [모던 자바스크립트 딥다이브 스터디 #9-1 (CH 34 - 36) — FE재남](https://www.youtube.com/watch?v=JUS-7rQehMw)
- 과정/용어: [범위](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30717), [ECMAScript spec](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30718), [용어](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=35015)
- lexical declaration: [global/strict](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30720), [block 종류](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30722), [let scope](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30721), [let/var](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30723), [global this](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30724), [여러 script](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30725), [TDZ](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30726), [const](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30727)
- arrow function: [문법](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30729), [arguments/constructor](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30730), [lexical this](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30731), [instance/bind](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30732)
- modern syntax: [spread](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30738), [rest](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30739), [array destructuring](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30741), [object/parameter destructuring](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30742), [computed property](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30743), [default](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30745), [for...of](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30747), [기타 문법](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30749), [getter/setter](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30751)

## 관련 문서

- [[Variable-Declarations|var, let, const]]
- [[Hoisting|호이스팅과 TDZ]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-ES-Modules|ES Modules]]
- [[Object-Property-Descriptor|property descriptor]]
