---
tags: [runtime, nodejs, javascript, closure, recursion, iife]
status: done
category: "OS & Runtime"
aliases: ["Closure", "JavaScript Closure", "JavaScript 클로저"]
verified_at: 2026-09-27
---

# JavaScript Closure, 재귀와 IIFE

closure는 function이 자신이 정의된 lexical environment의 binding을 이후 호출에서도 참조할 수 있는 성질이다. 익명 함수나 반환된 함수에만 생기는 별도 object가 아니라 JavaScript function 의미의 일부다.

## binding을 기억한다

```ts
function makeCounter() {
  let count = 0;
  return () => ++count;
}

const next = makeCounter();
next(); // 1
next(); // 2
```

inner function의 `[[Environment]]`가 outer environment와 연결되고 identifier resolution이 `count` binding을 찾는다. 생성 시점의 숫자 snapshot을 복사하는 것이 아니라 같은 mutable binding을 공유하므로 다른 closure가 수정하면 최신 값을 본다.

engine은 관찰 가능한 의미만 유지하면 environment를 최적화할 수 있다. closure가 항상 전체 stack frame을 그대로 heap에 복사한다고 단정하지 않는다.

어떤 closure끼리 binding을 공유하는지는 그 binding을 담은 environment가 언제 만들어졌는지로 정해진다. 한 번의 호출에서 만든 closure들은 그 호출의 environment를 함께 참조하고, factory를 다시 호출하면 새 environment가 생겨 이전 closure와 state가 섞이지 않는다. 같은 state를 다룰 증가, 감소 함수는 한 번의 호출에서 함께 반환한다. factory를 두 번 호출해 따로 받으면 서로 다른 `count`를 바꾼다.

반복문에서 만든 closure도 같은 규칙을 따른다.

```ts
const withVar: Array<() => number> = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);

const withLet: Array<() => number> = [];
for (let j = 0; j < 3; j++) withLet.push(() => j);

withVar.map((read) => read()); // [3, 3, 3]
withLet.map((read) => read()); // [0, 1, 2]
```

- `var i`는 반복 전체가 공유하는 binding 하나라 세 closure가 호출 시점의 마지막 값 3을 읽는다.
- `for` 머리에서 `let`으로 선언하면 첫 조건 평가 전과 매 반복의 증감식 평가 전에 새 declarative environment가 만들어지고 직전 반복의 값으로 초기화된다(명세의 CreatePerIterationEnvironment). 증감식은 새 environment에서 평가되므로 각 closure는 자기 반복의 binding을 유지한다.
- block scope만으로 생기는 효과가 아니다. `let i = 0; for (; i < 3; i++)`처럼 반복문 밖에서 선언하면 binding이 하나뿐이라 결과가 `[3, 3, 3]`이다. `for (let i = 0, getI = () => i; ...)`처럼 초기화 절에서 만든 closure도 첫 binding만 봐서 반복 중의 `i` 변화를 관찰하지 못한다.
- `for...of`와 `for...in`에서 `let`이나 `const`로 선언한 변수도 반복마다 새 environment에 만들어진다.

`let`이 없던 시절에는 IIFE에 현재 값을 인자로 넘겨 반복마다 새 function environment를 만들었다. 지금은 반복 변수를 `for` 머리의 `let`이나 `for...of`의 `const`로 선언한다.

## 캡슐화와 한계

closure는 module-local state, factory와 callback dependency를 감추는 데 유용하다. 그러나 function/reference를 잘못 노출하면 state도 간접 변경될 수 있으므로 security boundary 자체는 아니다. class private field, module boundary와 authorization을 목적에 맞게 쓴다.

감춘 state의 공유 범위도 environment가 몇 번 만들어지는지로 정해진다. class를 IIFE로 감싸고 IIFE 안의 변수를 private field처럼 쓰면 그 environment는 IIFE 호출 한 번에만 생기므로 모든 instance가 한 변수를 공유하는 static 상태가 된다.

```ts
const Person = (() => {
  let age = 0; // IIFE 호출 한 번에 만들어진 binding

  return class {
    constructor(initialAge: number) {
      age = initialAge;
    }

    getAge() {
      return age;
    }
  };
})();

const first = new Person(20);
new Person(30);
first.getAge(); // 30
```

instance마다 다른 값을 감추려면 instance별로 붙는 `#` private field를 쓴다([[JS-Access-Modifiers|JS, TS 접근 제어자]]). constructor의 지역 변수를 참조하는 method를 `this`에 붙여도 instance별로 state가 나뉘지만 생성할 때마다 method 함수를 새로 만든다([[Prototype-Inheritance|this와 prototype 정의]]).

모듈 top level 변수도 같은 구조다. CommonJS 모듈은 `require.cache`를 바꾸지 않는 한 같은 resolved filename에 대해 한 번, ESM은 URL 기준으로 한 번 평가된 뒤 재사용된다. 파일 top level의 `let`을 class method가 참조하면 한 thread(main thread 또는 worker thread 하나) 안에서는 그 class의 모든 instance와 request가 한 값을 공유하므로([[Module-System-CommonJS|CommonJS 모듈 캐싱]]), request별 state는 인자나 [[Thread-vs-Event-Loop|AsyncLocalStorage]] 같은 request context로 전달한다. 반대로 worker thread, cluster worker와 다른 서버 instance는 모듈을 각자 다시 평가하므로 이 값을 thread나 process 사이의 공유 state로 쓸 수 없다.

## lifetime과 memory

closure가 environment binding을 참조하는 동안 관련 value가 reachable할 수 있다. 큰 request/body/cache를 불필요하게 capture하면 수명이 늘어난다.

- 필요한 primitive/작은 value만 local binding으로 capture한다.
- listener/timer/subscription을 해제한다.
- closure가 담긴 queue/cache의 bound와 TTL을 둔다.
- heap snapshot의 retaining path로 실제 reference를 확인한다.

closure가 있다는 사실 자체는 leak이 아니다. 더 이상 필요 없는데 reachable한 reference가 계속 남는 것이 leak이다.

## 재귀 함수

재귀는 자기 자신 또는 cycle을 통해 다시 호출하는 control flow다. base case, progress, maximum depth와 cycle detection이 필요하다. ECMAScript에 proper tail call 의미가 있어도 모든 주요 runtime이 일반 최적화를 제공한다고 가정하지 말고 깊은 입력에는 explicit stack/iteration을 검토한다.

object를 재귀 순회할 때 property를 하나씩 옮긴다고 자동 deep clone이 되지 않는다. descriptor/prototype/symbol/cycle/built-in type 계약은 [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]에서 정한다.

## IIFE의 의미

```ts
(() => {
  const privateValue = 1;
  initialize(privateValue);
})();
```

IIFE는 function expression을 작성한 뒤 call expression `()`로 즉시 호출하는 pattern이다. engine이 IIFE를 발견해 자동 실행하는 별도 mechanism은 아니다. 과거에는 global pollution을 줄이는 module pattern으로 중요했지만 현재는 ESM/block scope가 더 명시적인 기본이다. 일회 초기화/async scope가 정말 필요할 때만 사용한다.

함수를 괄호로 감싸는 이유는 문법이다. expression statement는 `{`, `function`, `async function`, `class`, `let [`로 시작할 수 없어서 문장 맨 앞의 `function`은 함수 선언으로, `{`는 object literal이 아닌 block으로 해석된다.

- `function () {}()`는 이름 없는 함수 선언이 되어 `SyntaxError`다.
- `function init() {}(1)`은 함수 선언과 별개 문장 `(1)`로 해석되어 오류 없이 넘어가고 `init`은 호출되지 않는다.
- `(function () {})()`, `(function () {}())`, `!function () {}()`, `void function () {}()`, 대입 우변처럼 expression만 올 수 있는 위치에서는 함수 표현식이 된다.
- arrow function은 `(() => {})()`처럼 함수 자체를 괄호로 감싸야 호출할 수 있다. `() => {}()`는 `SyntaxError`다.
- 기명 IIFE의 이름은 함수 내부에서만 보이므로 바깥에서 다시 호출할 수 없다.

## NestJS 적용

- singleton provider에서 request-specific closure를 오래 보관하지 않는다.
- retry/callback closure가 stale configuration이나 mutable entity를 붙잡는지 확인한다.
- factory closure로 dependency를 숨기기보다 DI token/interface가 수명과 test boundary를 더 잘 드러내는지 비교한다.
- recursion으로 nested DTO/tree를 처리할 때 depth/size 제한을 둔다.

## 출처

- [ECMAScript Language Specification, ECMAScript Function Objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ecmascript-function-objects)
- [ECMAScript Language Specification, Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records)
- [ECMAScript Language Specification, Expression Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-expression-statement)
- [MDN, Expression statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/Expression_statement)
- [MDN, Arrow function expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [ECMAScript Language Specification, CreatePerIterationEnvironment](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-createperiterationenvironment)
- [ECMAScript Language Specification, ForIn/OfBodyEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset)
- [MDN, for](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for)
- [MDN, Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [MDN, Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [Node.js, CommonJS modules caching](https://nodejs.org/api/modules.html#caching)
- [Node.js, ECMAScript modules URLs](https://nodejs.org/api/esm.html#urls)
- [Node.js, Worker threads](https://nodejs.org/api/worker_threads.html)
- [모던 자바스크립트 딥다이브 스터디 #5-1 (CH 24 클로저) — FE재남](https://www.youtube.com/watch?v=pTVbFD5kpOI)
- [모던 자바스크립트 딥다이브 스터디 #2-2 (CH12 함수) — FE재남](https://www.youtube.com/watch?v=KiyJliK94fs)
- [재귀/참조 공유](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26717), [IIFE](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26718), [closure lookup](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26720), [closure와 익명 함수](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26721)

## 관련 문서

- [[Scope|JavaScript 스코프]]
- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[Call-Stack-Heap|Call Stack과 Heap]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-Function-Objects-and-Calls#함수 정의 형태|기명 함수 표현식과 name 추론]]
- [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]
