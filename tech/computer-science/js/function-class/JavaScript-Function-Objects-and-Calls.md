---
tags: [cs, javascript, function-object, arguments, hoisting]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Function Objects", "JavaScript 함수 객체와 호출"]
---

# JavaScript Function Object와 호출 준비

JavaScript function은 호출 가능한 object다. source text와 lexical environment, parameter, `this` mode 같은 실행 의미를 가진다. 명세의 internal slot과 engine의 실제 object layout을 일반 property처럼 취급하지 않는다.

## callable과 constructor는 별개다

- ordinary function declaration/expression은 보통 `[[Call]]`과 `[[Construct]]`를 모두 가진다.
- arrow function, concise method, generator와 async function은 callable이지만 constructor가 아니다.
- class constructor는 constructable이지만 `new` 없이 호출할 수 없다.
- bound function은 target이 constructable할 때 constructable할 수 있다.
- built-in function마다 callable/constructable 조합이 다르다.

`typeof value === "function"`은 callable 여부의 실용적 검사지만 constructor 가능 여부까지 보장하지 않는다.

`prototype` property 유무로도 constructor를 판별하지 않는다. 기준은 `[[Construct]]` internal method다. bound function은 `prototype` 없이도 constructor일 수 있고, generator function은 generator object용 `prototype`이 있어도 `new`가 `TypeError`다. ordinary function의 `prototype`을 object가 아닌 값으로 바꿔도 `new`는 동작하며, instance의 `[[Prototype]]`은 그 함수 Realm의 `Object.prototype`이 된다. arrow function과 concise method가 `new`에 실패하는 것도 `prototype`이 없어서가 아니라 `[[Construct]]`가 없어서다.

### new 없는 호출과 new.target

생성자로 쓰려던 일반 함수를 `new` 없이 호출하면 일반 호출의 `this` 규칙을 따른다. sloppy mode에서는 `this`가 global object로 치환돼 `this.radius = radius`가 전역 property를 만들고, strict mode(module code와 class body 포함)에서는 `this`가 `undefined`라 같은 대입이 `TypeError`다.

`new.target`은 현재 호출이 construct인지 알려 주는 meta property다. `new`는 예약어라 property 접근이 아니라 별도 expression 문법이다.

- 일반 함수를 `new`로 호출하면 함수 자신이고, `new` 없이 호출하거나 `call`, `apply`로 호출하면 `undefined`다.
- class constructor에서는 `new`가 적용된 class다. `new Sub()`가 `super()`로 실행한 base constructor 안에서도 `Sub`다.
- `Reflect.construct(target, args, newTarget)`에서는 전달한 `newTarget`이다.

새 생성자는 `new` 없는 호출을 거부하는 class로 작성하고, 일반 함수 생성자를 유지해야 하면 `new.target`으로 검사한다. 예전 scope-safe 생성자의 `this instanceof Circle` 검사는 `Circle.call(existingCircle, 5)`처럼 기존 instance를 `this`로 넘기면 통과해 그 instance를 수정한다.

TypeScript `abstract`는 `new Base()`나 `typeof Base` type으로 받은 class의 생성을 compile error(TS2511)로 막지만 type 검사 단계의 제약이라 `tsc` 출력(6.0.3, 7.0.2에서 확인)에는 일반 class만 남는다. `any`로 받은 class나 `Reflect.construct`처럼 abstract 검사를 거치지 않는 생성 경로와 JavaScript 호출자까지 막으려면 runtime에 `new.target`을 검사한다.

```ts
abstract class PaymentGateway {
  constructor() {
    if (new.target === PaymentGateway) {
      throw new TypeError("PaymentGateway는 하위 class로만 생성한다");
    }
  }
}

class CardGateway extends PaymentGateway {}

new CardGateway(); // 생성된다
Reflect.construct(PaymentGateway, []); // TypeError: PaymentGateway는 하위 class로만 생성한다
```

built-in constructor는 `new` 없이 호출했을 때의 동작이 서로 다르다.

| 호출 | 결과 |
|---|---|
| `Object(v)`, `Array(...)`, `Function(...)`, `Error(...)` | `new`로 호출한 것과 같다 |
| `String(v)`, `Number(v)`, `Boolean(v)` | wrapper object가 아니라 원시값으로 변환한다 |
| `Date(...)` | 인자와 관계없이 현재 시각을 나타내는 문자열을 반환한다 |
| `RegExp(re)` | flags 없이 RegExp 하나만 넘기면 새 object 대신 인자 자체를 반환할 수 있다 |
| `Map()`, `Set()`, `WeakMap()`, `WeakSet()`, `Promise(...)`, class constructor | `TypeError` |
| `new Symbol()`, `new BigInt(v)` | 반대로 `new`와 함께 호출하면 `TypeError` |

`Date()`를 `new Date()`로 착각하면 Date 대신 문자열이 흘러간다. `RegExp(re)`가 같은 object를 돌려주면 `g`나 `y` flag의 `lastIndex` 상태도 공유하므로 복제가 목적이면 `new RegExp(re)`를 쓴다.

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

기명 함수 표현식의 이름은 함수 내부(parameter 목록과 body)에서만 보이는 immutable binding이다. 바깥 scope에는 binding을 만들지 않고, body 안에서 이 이름에 재할당하면 strict mode에서는 `TypeError`, sloppy mode에서는 무시된다. 바깥 변수가 다른 값으로 바뀌어도 자기 자신을 재귀 호출할 수 있다.

```js
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
};

factorial.name; // "fact"
typeof fact; // "undefined"
```

익명 함수 표현식과 arrow function의 `name`은 변수 선언, 식별자 대입, object literal property, destructuring과 parameter의 default 값, class field, `export default`(이름 `"default"`) 같은 문맥에서만 추론된다. `obj.handler = function () {}`처럼 member에 대입한 함수, 인자로 바로 넘긴 함수, 다른 함수가 반환한 익명 함수의 `name`은 빈 문자열이다. Node.js 26.7의 V8 stack trace는 `name`이 비어 있어도 frame 이름을 붙일 수 있다. member 대입 위치를 보고 `at obj.handler`로 표시하고, 호출 receiver의 type과 method 이름을 써서 `setTimeout` callback은 `at Timeout._onTimeout`, EventEmitter listener는 emitter의 type을 써서 `at EventEmitter.<anonymous>`(`http.Server`면 `at Server.<anonymous>`)로 표시한다. 인자로 받아 직접 호출하거나 `map`, `then`, `process.nextTick`에 넘긴 익명 함수는 위치만 남는다. stack trace의 이름은 `name` property와 다를 수 있으므로 로그나 metric에서 `fn.name`으로 식별해야 하면 member 대입이나 인자 위치에 익명 함수를 바로 두지 말고 `const handler = () => {}`처럼 이름이 추론되는 위치에서 먼저 선언하거나 기명 함수 표현식을 쓴다.

`name`은 debugging과 오류 메시지용 값이며 언어 의미에는 영향을 주지 않는다. `bind` 결과는 `bound foo`, getter와 setter는 `get foo`, `set foo`, description이 있는 Symbol key method는 `[description]`, `Function` constructor로 만든 함수는 `anonymous`가 된다. `name`과 `length`는 writable이 false라 대입이 sloppy mode에서는 무시되고 strict mode에서는 `TypeError`이며, 바꿔야 하면 `Object.defineProperty`를 쓴다. class의 static `name` member는 built-in 값을 덮어쓰고 minifier나 obfuscator도 build 시 이름을 바꿀 수 있으므로, `Cat.name`처럼 `name`을 등록 key나 분기 조건에 쓰는 코드는 build 결과에서 이름이 보존되는지 확인한다.

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

mapped와 unmapped `arguments` object, `arguments.callee`와 `fn.caller`, rest parameter 문법 제약과 argument 개수 한계는 [[JavaScript-Function-Objects-and-Calls-Parameters|parameter와 arguments]]에서 다룬다.

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
- [ECMAScript Language Specification, GetPrototypeFromConstructor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-getprototypefromconstructor)
- [ECMAScript Language Specification, Function Instances prototype](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function-instances-prototype)
- [MDN, Function: name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name)
- [V8, Stack trace API](https://v8.dev/docs/stack-trace-api)
- [MDN, Function.prototype.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [ECMAScript Language Specification, SetFunctionName](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-setfunctionname)
- [ECMAScript Language Specification, Object ( value )](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object-value)
- [ECMAScript Language Specification, Array constructor](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array-constructor)
- [ECMAScript Language Specification, Function constructor](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function-constructor)
- [ECMAScript Language Specification, Error constructor](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-error-constructor)
- [ECMAScript Language Specification, String constructor](https://tc39.es/ecma262/multipage/text-processing.html#sec-string-constructor)
- [ECMAScript Language Specification, Date constructor](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-constructor)
- [ECMAScript Language Specification, RegExp constructor](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexp-constructor)
- [ECMAScript Language Specification, Map constructor](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-constructor)
- [ECMAScript Language Specification, Promise ( executor )](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-executor)
- [ECMAScript Language Specification, Symbol ( description )](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-description)
- [ECMAScript Language Specification, BigInt ( value )](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-constructor-number-value)
- [ECMAScript Language Specification, AsyncFunction Instances](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-async-function-instances)
- [MDN, new.target](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes-and-members)
- [모던 자바스크립트 딥다이브 스터디 #2-1 (CH10, 11) — FE재남](https://www.youtube.com/watch?v=5b5km0pHoIs)
- [모던 자바스크립트 딥다이브 스터디 #2-2 (CH12 함수) — FE재남](https://www.youtube.com/watch?v=KiyJliK94fs)
- [모던 자바스크립트 딥다이브 스터디 #3-3 (CH 16, 17) — FE재남](https://www.youtube.com/watch?v=SQAhFwxqlJY)
- [모던 자바스크립트 딥다이브 스터디 #4-1 (CH 18 함수와 일급객체) — FE재남](https://www.youtube.com/watch?v=gAZX8ThQkUc)
- function object: [형태/생성](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26673), [구조](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26674), [실행 환경](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26675), [internal slot](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26676), [정의 형태](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26677), [해석 순서](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26678), [declaration instantiation](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26679), [hoisting](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26680), [overload](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26681)
- 함수 기초: [구성/이름](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24619), [호출/return](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24620), [주석과 시나리오](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24621)
- Function object: [API/new Function](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24657), [종류/length](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24658), [선언/표현식](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24659), [call/apply/toString](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24660), [arguments](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24661)

## 관련 문서

- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[Hoisting|호이스팅과 TDZ]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 호출 방식]]
- [[TS-Function-Overloading|TypeScript 함수 오버로딩]]
- [[Closure#IIFE의 의미|IIFE 문법과 기명 IIFE]]
