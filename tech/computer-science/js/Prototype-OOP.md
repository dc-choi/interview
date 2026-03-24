---
tags: [cs, javascript, oop, prototype]
status: seminar
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Prototype 기반 OOP"]
---

# Prototype기반OOP

## JS의실행방식

- 소스 코드를 사전에 컴파일하여 실행 파일을 만들지 않음
- **사용하는 시점에 컴파일하고 실행** (JIT)
- 함수 키워드를 만나면 함수 오브젝트를 생성하지만, 함수 안 코드는 호출될 때 컴파일됨

## JS OOP의특징

- JS의 OOP는 다른 언어(Java, C++ 등)의 클래스 기반 OOP와 다름
- **비교에 의미가 없고, JS 특징이 반영된 OOP 구현이 필요**

### 다른언어의OOP
- class 안에 메서드와 프로퍼티를 작성
- class → 인스턴스 생성 → 사용

### JS의OOP
- `Object`는 인스턴스를 생성할 수 없음
- `Function` 자체는 OOP의 객체라고 부르기 어려움
- **prototype에 메서드를 연결**해서 사용 → Function이 class처럼 동작

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

- ES6 `class`는 문법적 설탕(Syntactic Sugar)
- 내부적으로는 **prototype을 사용하여 연결**
- `class` 문법이 더 직관적이지만 동작 원리는 동일

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
