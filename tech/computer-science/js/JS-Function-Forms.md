---
tags: [cs, javascript, function, closure, first-class]
status: done
category: "CS - JavaScript"
aliases: ["JS Function Forms", "함수 선언식 표현식 화살표"]
---

# JS 함수 형태와 특성

함수 선언식·표현식·화살표 세 형태는 **호이스팅·`this` 바인딩·문법** 모두 다르다. JS에서 함수는 **일급 객체**라는 점이 고차 함수·클로저·비동기 콜백의 기반.

## 함수의 3가지 형태

### 1. 함수 선언식 (Function Declaration)
```
function add(a, b) {
  return a + b;
}
```
- **전체 호이스팅** — 선언 전 호출 가능
- `name` 자동 부여
- 클래식한 JS 스타일

### 2. 함수 표현식 (Function Expression)
```
const add = function(a, b) {
  return a + b;
};
```
- **변수 호이스팅만** — 선언 후에만 호출 가능
- 익명 또는 이름 붙일 수 있음 (`function named(){}`)
- 변수처럼 재할당·전달 가능

### 3. 화살표 함수 (Arrow Function)
```
const add = (a, b) => a + b;
```
- 간결한 문법
- **자체 `this` 없음** — 감싸는 스코프의 `this` 상속 (lexical this)
- `arguments` 없음 (rest parameter 사용)
- `new`로 생성 불가
- `prototype` 없음

## 호이스팅 비교

```
sayHi();          // ✅ "hi" — 전체 호이스팅
function sayHi() { console.log('hi'); }

sayBye();         // ❌ TypeError — 변수만 호이스팅, undefined 상태
const sayBye = function() { console.log('bye'); };

sayHello();       // ❌ ReferenceError — const는 TDZ
const sayHello = () => console.log('hello');
```

## `this` 바인딩 차이

```
const obj = {
  name: 'dc',
  regular: function() { return this.name; },       // this = obj
  arrow:   () => this.name,                         // this = 상위 (window/undefined)
};

obj.regular();  // 'dc'
obj.arrow();    // undefined (또는 상위 this)
```

화살표 함수는 **자체 this가 없으므로** 객체 메서드로 부적합. 반면 콜백에서 외부 `this` 유지에 유리.

```
class Timer {
  constructor() {
    this.count = 0;
    setInterval(() => this.count++, 1000);  // 화살표: this = Timer 인스턴스
    // setInterval(function() { this.count++ }, 1000); ← this = global, 에러
  }
}
```

## JS 함수의 핵심 특성

### 일급 객체 (First-Class Citizen)
함수를 **값처럼** 다룰 수 있음:
- 변수에 할당
- 다른 함수의 인자로 전달
- 다른 함수의 반환값으로 사용
- 객체의 프로퍼티로 저장

이 특성이 **고차 함수·콜백·클로저**의 기반.

### 고차 함수 (Higher-Order Function)
다른 함수를 **받거나 반환**하는 함수.
```
// 받는 예
[1,2,3].map(x => x * 2)

// 반환하는 예
function multiplier(factor) {
  return (x) => x * factor;
}
const double = multiplier(2);
double(5);  // 10
```
함수형 프로그래밍의 기초.

### 클로저 (Closure)
함수가 **자신이 선언된 스코프를 기억**하고 그 스코프의 변수에 접근하는 능력.

```
function counter() {
  let count = 0;
  return () => ++count;
}
const c = counter();
c();  // 1
c();  // 2
c();  // 3
```

`count`는 `counter()` 실행이 끝나도 **살아 있음** — 반환된 함수가 참조하니까.

용도:
- **상태 은닉** (class 없이 private 구현)
- 모듈 패턴
- 콜백에서 외부 변수 캡처
- 메모이제이션

함정:
- 클로저가 변수를 잡고 있으면 **GC 대상 안 됨** → 메모리 누수 가능

### 익명 함수·즉시 실행 (IIFE)
```
(function() {
  // 즉시 실행
})();
```
ES6 이전엔 모듈 격리용. 요즘은 ESM·블록 스코프로 대체.

## 형태 선택 가이드

### 함수 선언식
- 모듈 수준 함수
- 선언 순서에 구애받지 않고 쓰고 싶을 때
- 이름이 스택 트레이스에 명확히 찍힘

### 함수 표현식 (익명 화살표 포함)
- 콜백 (map·filter·이벤트 핸들러)
- IIFE
- 조건부로 함수 정의

### 화살표 함수
- 콜백·짧은 변환 (`x => x * 2`)
- 콜백에서 외부 `this` 유지 필요
- 한 줄 로직

### 화살표 금지
- 객체 메서드 (this가 필요)
- prototype 메서드
- `new`로 생성할 함수

## 흔한 실수

- 객체 메서드에 화살표 함수 → `this`가 외부로 새서 버그
- 클래스 메서드에 일반 함수 + 콜백 전달 → `this` 잃음 (`bind` 또는 화살표 필드로 해결)
- 함수 표현식을 선언 전에 호출 → `undefined is not a function`
- 클로저로 변수 잡아놓고 해제 안 함 → 메모리 누수

## 면접 체크포인트

- 세 형태의 호이스팅 차이
- 화살표 함수의 `this` 동작 (lexical)
- 일급 객체가 주는 능력 3가지
- 클로저가 가능한 이유 (렉시컬 스코프)
- 객체 메서드에 화살표 쓰면 안 되는 이유
- 클로저 메모리 누수 패턴

## 출처
- [매일메일 — JavaScript 함수](https://www.maeil-mail.kr/question/33)
- [매일메일 — 함수 선언식과 함수 표현식](https://www.maeil-mail.kr/question/68)

## 관련 문서
- [[Hoisting|호이스팅]]
- [[Prototype-OOP|Prototype 기반 OOP]]
- [[JS-Value-vs-Reference|JS 원시·참조·Call by Value]]
- [[Execution-Context|실행 컨텍스트]]
