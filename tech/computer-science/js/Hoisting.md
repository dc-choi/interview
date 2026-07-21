---
tags: [cs, javascript, hoisting]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["호이스팅", "Hoisting", "TDZ", "Temporal Dead Zone"]
verified_at: 2026-07-21
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

let/const가 **선언은 됐지만 아직 초기화되지 않아 접근할 수 없는 구간**. 스코프 시작부터 선언문 직전까지다. 이 안에서 변수를 읽으면 `ReferenceError: Cannot access '...' before initialization`이 발생한다.

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

## 함수호이스팅

```javascript
// 함수 선언문 → 호이스팅됨 (전체가 올라감)
hello(); // "hello" 정상 동작
function hello() { console.log("hello"); }

// 함수 표현식 → 변수만 호이스팅, 함수는 안 됨
goodbye(); // TypeError: goodbye is not a function
var goodbye = function() { console.log("goodbye"); };
```

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
