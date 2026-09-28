---
tags: [cs, javascript, variable, scope]
status: done
verified_at: 2026-09-25
category: "CS - JavaScript"
aliases: ["Variable Declarations", "var let const", "변수 선언 키워드", "const 불변성", "암묵적 전역"]
---

# var, let, const 변수 선언

ES6에서 `let`과 `const`가 추가된 건 `var`의 느슨한 재선언과 함수 스코프가 만든 버그를 줄이기 위해서다. 선언 키워드 없는 대입은 `var`의 기능이 아니라 strict/sloppy mode와 unresolvable reference의 문제다.

## 재선언 (중복 선언)

- **var**: 같은 이름을 다시 선언해도 에러 없이 통과하고, 초기화식이 있으면 그 자리에서 기존 값을 덮어쓴다. 선언부가 수백 줄 떨어져 있으면 한쪽을 잊고 값을 깨뜨리기 쉽다.
- **let, const**: 같은 스코프에서 재선언하면 `SyntaxError: Identifier '...' has already been declared`로 즉시 막는다.

실수로 같은 변수를 두 번 선언해 값이 바뀌는 사고를 컴파일 시점에 잡아 준다.

`var` binding은 코드 실행 전에 한 번 만들어지므로 초기화식 없는 `var score;`는 실행 시점에 아무 일도 하지 않고 기존 값을 `undefined`로 되돌리지 않는다. strict mode와 ES module에서도 `var` 재선언은 에러가 아니고 결과도 같다.

```javascript
score = 80;         // 호이스팅된 var score binding에 할당
var score;          // 초기화식이 없어 실행 시점에 아무 일도 하지 않는다
console.log(score); // 80

var score = 50;     // score = 50 할당과 같다
console.log(score); // 50
```

같은 이유로 루프 본문의 `var flag;`는 반복마다 `undefined`로 돌아가지 않고 앞 반복의 값을 그대로 들고 있다. 반복마다 새 변수가 필요하면 `let`으로 선언한다.

## 스코프 — 함수 레벨 vs 블록 레벨

- **var**: 함수 레벨 스코프. `if`, `for` 같은 블록 안에서 선언해도 함수 전체에서 보인다. `for (var i ...)`의 `i`가 루프 밖에서도 살아 있는 게 대표적이다.
- **let, const**: 블록 레벨 스코프. `{}` 안에서 선언하면 그 블록 밖에서는 참조할 수 없다.

스코프 검색 규칙, 렉시컬 스코프, 스코프 체인은 [[Scope|스코프]]. 호이스팅이 블록 단위로 일어나며 생기는 블록 내 TDZ는 [[Hoisting|호이스팅]].

## 키워드 생략 — 암묵적 전역

sloppy classic script에서 선언되지 않은 이름에 값을 대입하면 전역 객체에 property가 생길 수 있다. 이는 `var` 선언이 아니며 host/실행 형태에 따라 달라진다. 변수명을 오타 내면 전역 state가 조용히 생길 수 있다.

```javascript
function f() {
  count = 1; // var/let/const 없이 대입 → 전역 count 생성
}
```

`const a = b = 0`처럼 연쇄 할당하면 `a`만 선언되고 `b`에는 할당만 일어나므로 같은 방식으로 전역이 생길 수 있다([[JavaScript-Expressions-Control-Flow-and-Coercion#expression과 연산 순서|연쇄 할당과 initializer]]).

strict mode에서는 이런 unresolvable assignment가 `ReferenceError`로 막힌다. ESM은 자동 strict mode이고 classic script는 그렇지 않을 수 있으므로 module boundary와 lint rule을 함께 사용한다.

## const의 불변성

`const`는 **바인딩(변수가 가리키는 대상)의 재할당**을 금지한다. 재할당을 시도하면 `TypeError: Assignment to constant variable`이 난다.

```javascript
const max = 30;
max = 40; // TypeError
```

주의할 점은 **값 자체의 불변(immutable)이 아니라는 것**이다. 참조 타입을 `const`로 선언해도 그 객체나 배열의 내부는 바꿀 수 있다. `const`가 묶는 건 변수가 어떤 주소를 가리킬지일 뿐, 그 주소에 있는 객체의 내용이 아니다.

```javascript
const obj = { name: 'a' };
obj.name = 'b';   // OK — 내부 프로퍼티 변경
obj = {};         // TypeError — 재할당

const arr = [1];
arr.push(2);      // OK — 내부 원소 변경
```

이 구분은 참조 타입에서 변수가 들고 있는 값이 객체 자체가 아니라 그 주소이기 때문이다([[JS-Value-vs-Reference|원시 vs 참조, Call by Value]]). 객체 내부까지 얼리려면 `Object.freeze`나 불변 패턴이 따로 필요하다([[Object-Property-Descriptor|불변성]]).

## const는 선언과 동시에 초기화 필수

`let`은 값 없이 선언만 하면 `undefined`로 초기화된다. `const`는 재할당이 불가능하므로 선언 시점에 값을 주지 않으면 영영 값을 넣을 수 없어, 선언과 동시에 초기화하지 않으면 `SyntaxError: Missing initializer in const declaration`이 난다.

```javascript
let a;       // OK — undefined
const b;     // SyntaxError
```

## 호이스팅과 TDZ

세 키워드 모두 호이스팅되지만 `var`는 선언 즉시 `undefined`로 초기화되는 반면 `let`/`const`는 초기화가 선언문까지 보류되어 그 사이 구간(TDZ)에서 접근이 막힌다. 메커니즘은 [[Hoisting|호이스팅]].

## 사용 가이드

- `var`는 쓰지 않는다(레거시 ES5 환경 제외).
- 기본은 `const`. 재할당이 필요 없는 변수가 대부분이고, `const`는 의도치 않은 재할당을 에러로 막아 준다.
- 재할당이 꼭 필요할 때만 `let`을, 그것도 전역이 아니라 **가능한 한 좁은 블록 스코프 안**에서 쓴다.

## 면접 체크포인트

- `var`의 세 가지 함정 — 재선언 허용, 함수 레벨 스코프, 호이스팅 후 undefined
- `let`/`const`가 막는 것 — 같은 스코프 재선언(SyntaxError), 블록 밖 노출, 선언 전 접근(TDZ)
- 암묵적 전역은 `var`의 함정이 아니라 sloppy mode에서 선언되지 않은 이름에 대입할 때 생긴다. `let`/`const`도 이를 막지 못해 `const a = b = 0`의 `b`가 전역이 될 수 있고, strict mode(ESM 포함)에서만 `ReferenceError`다
- `const`는 바인딩 재할당만 막고 객체 내부 변경은 허용 — 불변(immutable)과 다름
- `const`가 선언과 동시 초기화를 강제하는 이유
- 기본 `const`, 필요 시 좁은 스코프 `let`, `var` 지양

## 출처

- [JavaScript의 let과 const, 그리고 TDZ — evan-moon](https://evan-moon.github.io/2019/06/18/javascript-let-const/)
- [모던 자바스크립트 딥다이브 스터디 #1-1 (CH4, 5) — FE재남](https://www.youtube.com/watch?v=3ZP3VPlrr0U)
- [모던 자바스크립트 딥다이브 스터디 #3-2 (CH14, 15) — FE재남](https://www.youtube.com/watch?v=JheRt5mIZH8)
- [MDN, var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [MDN, Assignment (=)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment)
- [ECMAScript Language Specification, Variable Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-variable-statement)

## 관련 문서

- [[Hoisting|호이스팅, TDZ (변수 생성 3단계)]]
- [[Scope|스코프 (함수 vs 블록)]]
- [[JS-Value-vs-Reference|원시 vs 참조, Call by Value (const 내부 변경)]]
- [[Object-Property-Descriptor|프로퍼티 디스크립터, Object 불변성]]
- [[JavaScript-Lexical-Scope-and-Modern-Syntax|렉시컬 스코프와 모던 문법]]
- [[자바스크립트(JS)|JavaScript 인덱스]]
