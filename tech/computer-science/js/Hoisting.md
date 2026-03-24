---
tags: [cs, javascript, hoisting]
status: study
category: "CS&프로그래밍(CS&Programming)"
aliases: ["호이스팅"]
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

## var/let/const차이

| 키워드 | 호이스팅 | 초기화 | TDZ |
|--------|---------|--------|-----|
| var | O (undefined로 초기화) | 선언과 동시에 undefined | 없음 |
| let | O (초기화 안 됨) | 선언만 등록, 값 할당 전 접근 불가 | **있음** |
| const | O (초기화 안 됨) | 선언만 등록, 값 할당 전 접근 불가 | **있음** |

### TDZ(TemporalDeadZone)
- let/const는 호이스팅되지만, 선언문에 도달하기 전까지 접근하면 **ReferenceError** 발생
- 이 접근 불가 구간을 TDZ라고 함

```javascript
console.log(a); // undefined (var 호이스팅)
console.log(b); // ReferenceError (TDZ)

var a = 1;
let b = 2;
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
- "var vs let?" → var는 undefined로 초기화, let은 TDZ로 접근 차단
