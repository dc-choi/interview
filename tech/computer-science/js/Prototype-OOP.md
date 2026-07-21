---
tags: [cs, javascript, oop, prototype]
status: seminar
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Prototype 기반 OOP"]
verified_at: 2026-07-21
---

# Prototype기반OOP

## JS의실행방식

- JavaScript 엔진은 소스를 파싱해 bytecode나 기계어로 실행하며, interpreter와 JIT 최적화의 조합은 엔진 구현에 따라 다름
- 함수 본문을 언제 파싱하고 컴파일하는지도 엔진의 lazy parsing, 최적화 전략에 따른 구현 세부사항이지 언어 명세의 보장이 아님

## JS OOP의특징

- JS의 OOP는 다른 언어(Java, C++ 등)의 클래스 기반 OOP와 다름
- **비교에 의미가 없고, JS 특징이 반영된 OOP 구현이 필요**

### 다른언어의OOP
- class 안에 메서드와 프로퍼티를 작성
- class → 인스턴스 생성 → 사용

### JS의OOP
- `Object()`나 `new Object()`는 객체를 만들 수 있고, 객체 리터럴도 별도의 class 선언 없이 일반 객체를 생성함
- 함수는 호출 가능한 객체다. 일반 함수와 class constructor는 `new`의 대상이 될 수 있지만 arrow function처럼 생성자로 쓸 수 없는 함수도 있음
- 생성자 함수의 `prototype`에 메서드를 두면 그 생성자로 만든 인스턴스가 프로토타입 체인을 통해 메서드를 공유함

## Prototype체인

```javascript
function Person(name) {
  this.name = name;  // 인스턴스 프로퍼티
}

Person.prototype.greet = function() {  // prototype에 메서드 연결
  return `Hello, ${this.name}`;
};

const p = new Person('Kim');
p.greet(); // prototype 체인을 통해 메서드 탐색
```

- `new` 연산자로 인스턴스 생성
- 인스턴스에서 메서드를 호출하면 prototype 체인을 따라 탐색
- 인스턴스마다 프로퍼티 값을 독립적으로 유지

## ES6class와prototype

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return `Hello, ${this.name}`;
  }
}
```

- ES6 `class`의 인스턴스 메서드는 prototype에 놓이고 `extends`도 프로토타입 체인을 구성함
- 다만 class body의 strict mode, `new` 없는 호출 금지, private field와 derived constructor 규칙처럼 생성자 함수 패턴에 없는 고유 의미가 있어 단순한 텍스트 치환으로 보지는 않음

## 인스턴스

| 개념 | 설명 |
|------|------|
| 생성 | `new` 연산자로 class/constructor function에서 생성 |
| 메서드 | class에 작성된 메서드를 prototype 체인으로 사용 가능 |
| 프로퍼티 | 인스턴스마다 독립적으로 값 유지 |
| 타입 확인 | `instanceof` 연산자로 확인 |

```javascript
const p = new Person('Kim');
p instanceof Person; // true
```

## 면접포인트
- "JS에서 class와 prototype의 관계?" → class는 prototype의 문법적 설탕
- "prototype 체인이란?" → 인스턴스에서 메서드 탐색 시 prototype을 따라 올라가는 메커니즘
- "JS OOP와 Java OOP의 차이?" → JS는 prototype 기반, Java는 class 기반. 비교보다 각 특성 이해가 중요

## 관련 문서
- [[Prototype-Mechanism|프로토타입 동작 원리 (prototype 객체, constructor, __proto__, 체인)]]
- [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유]]
- [[자바스크립트(JS)|JavaScript 인덱스]]

## 출처

- [ECMAScript Language Specification — TC39](https://tc39.es/ecma262/)
