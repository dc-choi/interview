---
tags: [cs, javascript, hoisting]
status: done
category: "CS - JavaScript"
aliases: ["호이스팅", "Hoisting", "TDZ", "Temporal Dead Zone"]
verified_at: 2026-09-25
---

# 호이스팅(Hoisting)

## 호이스팅이란
- 변수와 함수 **선언**이 코드 실행 전에 해당 스코프의 최상단으로 끌어올려지는 것처럼 동작하는 현상
- 실제로 코드가 이동하는 것이 아니라, JS 엔진이 실행 전 **선언을 먼저 메모리에 등록**하기 때문

## 선언문 이전 접근이 달라지는 이유

JavaScript는 코드 평가 전에 Environment Record에 선언별 binding을 만든다:

1. **선언 인스턴스화**: 변수와 함수 binding을 해당 스코프에 생성
2. **평가**: 선언 종류에 따라 binding을 초기화하고 문장을 실행

다른 언어도 이름 해석과 초기화 규칙을 따로 가지므로 JavaScript에만 가능한 현상이라고 비교하지 않는다. JavaScript에서는 `var`, lexical declaration과 function declaration의 binding 생성, 초기화 시점 차이가 선언문 이전 접근 결과를 결정한다.

## 변수 생성 3단계 — 호이스팅 vs TDZ의 갈림

엔진 내부에서 변수는 세 단계를 거쳐 만들어진다.

1. **binding 생성**: Environment Record에 식별자를 등록한다.
2. **초기화(Initialization)**: binding에 초기값을 연결해 접근 가능한 상태로 만든다.
3. **할당(Assignment)**: 코드 실행이 선언문에 도달하면 실제 값을 넣는다.

키워드 차이는 **1단계와 2단계의 간격**에서 나온다.

- **var**: 선언과 초기화가 **동시에** 일어난다. 호이스팅 직후 곧장 `undefined`로 초기화되므로, 선언문 이전에 접근해도 에러 없이 `undefined`가 나온다.
- **let, const**: binding은 먼저 만들어지지만 **초기화는 선언문 평가까지 보류**된다. 메모리가 없어서가 아니라 uninitialized binding에 접근하기 때문에 `ReferenceError`가 난다. 이 구간이 TDZ다.

세 선언 모두 실행 전 binding 생성과 관련되지만 초기화 시점과 스코프 규칙이 다르다. 특정 V8 내부 flag 이름을 ECMAScript 의미처럼 고정하지 않고 Environment Record의 binding 생성, 초기화 규칙으로 설명한다.

## var/let/const 차이

| 키워드 | 호이스팅 | 초기화 | TDZ |
|--------|---------|--------|-----|
| var | O | 선언과 동시에 undefined | 없음 |
| let | O | 선언만 등록, 선언문 도달 시 초기화 | **있음** |
| const | O | 선언만 등록, 선언문 도달 시 초기화 | **있음** |

키워드별 재선언, 스코프, 불변성 등 시맨틱 전반은 [[Variable-Declarations|var, let, const 변수 선언]].

## TDZ (Temporal Dead Zone)

let/const가 **선언은 됐지만 아직 초기화되지 않아 접근할 수 없는 구간**. 스코프 시작부터 실행이 선언문에 도달해 초기화될 때까지이며, 코드 위치가 아니라 실행 순서로 정해진다. 이 안에서 변수를 읽으면 `ReferenceError: Cannot access '...' before initialization`이 발생한다.

```javascript
console.log(a); // undefined (var 호이스팅)
console.log(b); // ReferenceError (TDZ)

var a = 1;
let b = 2;
```

에러 메시지가 갈리는 점이 핵심이다. 선언조차 안 된 식별자는 `... is not defined`(존재 자체가 없음)이고, TDZ 변수는 `Cannot access ... before initialization`(선언은 됐으나 초기화 전)이다. 후자가 나온다는 건 호이스팅이 됐다는 증거다.

TDZ는 **블록 단위**로도 적용된다. let/const는 블록 스코프라 호이스팅도 블록 최상단까지만 일어나므로, 블록 안에서 같은 이름을 다시 선언하면 바깥 변수가 아니라 블록의 TDZ에 걸린다.

```javascript
let name = 'outer';
if (true) {
  console.log(name); // ReferenceError — 바깥 name이 아니라 블록 내 name의 TDZ
  let name = 'inner';
}
```

선언문보다 위에 작성한 함수라도 선언문이 평가된 뒤에 호출하면 값을 정상적으로 읽는다.

```javascript
const read = () => value; // 정의 시점에는 value를 읽지 않는다
// 여기서 read()를 호출하면 ReferenceError (아직 TDZ)
let value = 1;
console.log(read()); // 1 (선언 평가 뒤 호출)
```

TDZ 오류는 선언 위치보다 실제 실행 순서를 따라가 확인한다. 순환 import에서 평가가 끝나지 않은 module의 export를 읽을 때 나는 초기화 전 접근 오류도 같은 원리다([[JavaScript-ES-Modules|ES Modules]]).

## 함수호이스팅

```javascript
// 함수 선언문 → 호이스팅됨 (전체가 올라감)
hello(); // "hello" 정상 동작
function hello() { console.log("hello"); }

// 함수 표현식 → 변수만 호이스팅, 함수는 안 됨
goodbye(); // TypeError: goodbye is not a function
var goodbye = function() { console.log("goodbye"); };
```

같은 이름의 함수 선언이 겹치면 선언이 놓인 스코프에 따라 결과가 갈린다.

- classic script와 함수 본문 최상위에서는 함수 선언이 `var`처럼 재선언을 허용하고, 선언 인스턴스화 단계에서 마지막 선언이 binding을 차지한다. 그래서 두 번째 선언보다 앞선 줄의 호출도 마지막 본문을 실행한다. CommonJS 파일은 module wrapper 함수의 본문이므로 `'use strict'`가 있어도 이 규칙을 따른다.
- ESM 최상위와 strict mode block 안에서는 함수 선언이 `let`처럼 재선언을 막는다. `SyntaxError: Identifier '...' has already been declared`로 파싱 단계에서 멈추므로 module 코드는 한 줄도 실행되지 않는다.
- classic script와 함수 본문 최상위에서 같은 이름의 `var`에 초기화식이 있으면 위치와 관계없이 그 초기화식이 실행되는 순간 함수 값을 덮어쓴다. ESM 최상위와 block 안에서는 같은 이름의 `var`와 함수 선언을 함께 두면 `SyntaxError`다.

```javascript
// CommonJS 파일. 같은 코드를 .mjs로 실행하면 첫 줄 전에 SyntaxError
console.log(add(1, 2)); // 12 (뒤 선언의 문자열 연결 본문이 실행된다)
function add(a, b) { return a + b; }
function add(a, b) { return `${a}${b}`; }
```

같은 파일 최상위에서 함수가 조용히 바뀌는 문제는 ESM으로 옮기면 파싱 오류로 드러나고, 파일마다 module scope가 생기므로 이어 붙이던 script 사이의 이름 충돌도 사라진다. 함수 본문 최상위의 중복 함수 선언은 ESM에서도 허용되지만, ESM 코드는 전체가 strict mode라서 함수 안이라도 block 안의 중복 선언은 `SyntaxError`다.

## 면접포인트
- "호이스팅이란?" → 선언이 스코프 최상단으로 끌어올려지는 현상
- "왜 선언문 전에 결과가 다른가?" → 선언별 binding 생성과 초기화 시점이 다르기 때문
- "let/const는 호이스팅 안 되나?" → 된다. 단 초기화가 선언문까지 보류돼 그 사이가 TDZ
- "var vs let?" → var는 선언+초기화 동시(undefined), let은 초기화 보류로 TDZ 접근 차단
- 두 에러 구분 — `is not defined`(선언 없음) vs `Cannot access before initialization`(TDZ, 호이스팅의 증거)

## 관련 문서
- [[Variable-Declarations|var, let, const 변수 선언 (재선언, 스코프, const 불변성)]]
- [[Scope|스코프 (함수 vs 블록)]]
- [[Execution-Context|실행 컨텍스트]]
- [[자바스크립트(JS)|JavaScript 인덱스]]

## 출처

- [ECMAScript Language Specification — Environment Records](https://tc39.es/ecma262/#sec-environment-records)
- [ECMAScript Language Specification — GlobalDeclarationInstantiation](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-globaldeclarationinstantiation)
- [ECMAScript Language Specification — Module Early Errors](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-module-semantics-static-semantics-early-errors)
- [MDN — let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN — function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)
- [Node.js — CommonJS module wrapper](https://nodejs.org/api/modules.html#the-module-wrapper)
- [모던 자바스크립트 딥다이브 스터디 #3-2 (CH14, 15) — FE재남](https://www.youtube.com/watch?v=JheRt5mIZH8)
