---
tags: [cs, javascript, hoisting]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["호이스팅", "Hoisting", "TDZ", "Temporal Dead Zone"]
---

# 호이스팅(Hoisting)

## 호이스팅이란
- 변수와 함수 **선언**이 코드 실행 전에 해당 스코프의 최상단으로 끌어올려지는 것처럼 동작하는 현상
- 실제로 코드가 이동하는 것이 아니라, JS 엔진이 실행 전 **선언을 먼저 메모리에 등록**하기 때문

## JS에서만호이스팅이되는이유

JS 엔진은 코드를 실행하기 전에 **실행 컨텍스트(Execution Context)** 를 생성한다:

1. **생성 단계(Creation Phase)**: 변수/함수 선언을 스코프에 등록 (메모리 할당)
2. **실행 단계(Execution Phase)**: 코드를 한 줄씩 실행하며 값을 할당

다른 언어(Java, Python 등)는 선언과 실행이 동시에 이루어지지만, JS는 이 두 단계가 분리되어 있어 호이스팅이 발생한다.

## 변수 생성 3단계 — 호이스팅 vs TDZ의 갈림

엔진 내부에서 변수는 세 단계를 거쳐 만들어진다.

1. **선언(Declaration)**: 스코프에 변수 식별자를 등록한다. 스코프가 변수 객체를 참조하게 된다.
2. **초기화(Initialization)**: 그 변수가 가질 값을 담을 메모리 공간을 확보하고 `undefined`로 채운다.
3. **할당(Assignment)**: 코드 실행이 선언문에 도달하면 실제 값을 넣는다.

키워드 차이는 **1단계와 2단계의 간격**에서 나온다.

- **var**: 선언과 초기화가 **동시에** 일어난다. 호이스팅 직후 곧장 `undefined`로 초기화되므로, 선언문 이전에 접근해도 에러 없이 `undefined`가 나온다.
- **let, const**: 선언만 먼저 되고 **초기화는 선언문에 도달할 때까지 보류**된다. 그 사이 변수는 메모리 공간이 아직 없는 상태라 접근하면 에러가 난다. 이 보류 구간이 TDZ다.

호이스팅 자체는 셋 다 똑같이 일어난다. V8 내부에서도 변수 객체를 만들 때 호이스팅 플래그(`should_hoist`)는 키워드를 가리지 않고 항상 true로 설정된다. 차이는 초기화 시점에 갈리는데, `var`는 생성 즉시 초기화됨(kCreatedInitialized) 상태로, `let`/`const`는 초기화가 필요함(kNeedsInitialization) 상태로 표시되어 메모리 할당이 선언문 위치까지 미뤄진다.

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
- "왜 JS에서만?" → 실행 컨텍스트의 생성 단계에서 선언을 먼저 등록
- "let/const는 호이스팅 안 되나?" → 된다. 단 초기화가 선언문까지 보류돼 그 사이가 TDZ
- "var vs let?" → var는 선언+초기화 동시(undefined), let은 초기화 보류로 TDZ 접근 차단
- 두 에러 구분 — `is not defined`(선언 없음) vs `Cannot access before initialization`(TDZ, 호이스팅의 증거)

## 관련 문서
- [[Variable-Declarations|var, let, const 변수 선언 (재선언, 스코프, const 불변성)]]
- [[Scope|스코프 (함수 vs 블록)]]
- [[Execution-Context|실행 컨텍스트]]
- [[자바스크립트(JS)|JavaScript 인덱스]]
