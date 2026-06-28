---
tags: [cs, javascript, prototype, oop]
status: done
category: "CS - JavaScript"
aliases: ["Prototype Mechanism", "프로토타입 동작 원리", "프로토타입 객체", "Prototype Object", "constructor", "__proto__", "프로토타입 체인", "Prototype Chain"]
---

# 프로토타입 동작 원리 (객체 생성과 체인)

JavaScript의 객체는 함수로 생성되고, 그 함수에 딸린 **프로토타입 객체를 원본 삼아 위임 관계로 연결**된다. 이 연결의 사슬이 프로토타입 체인이며, 모든 객체는 최종적으로 `Object.prototype`에 닿는다. 클래스 기반 언어에서 온 사람이 가장 자주 헷갈리는 지점이 바로 이 메커니즘이다. 왜 JS가 이 모델을 택했는지는 [[JavaScript-Prototype-Philosophy|프로토타입 철학]], OOP 사용법은 [[Prototype-OOP]].

## 디자인 패턴 뿌리 — 프로토타입 패턴

프로토타입은 JS 전용이 아니라 GoF의 **생성(creational) 디자인 패턴** 중 하나다. 생성 비용이 큰 객체를 매번 새로 만들지 않고, 한 번 만든 원본(prototype)을 **복제(clone)** 해 파생하는 방식이다. 자세한 패턴 설명은 [[Prototype패턴이란|프로토타입 패턴]]. JS는 이 발상을 언어 차원으로 끌어올려, 객체를 만들 때마다 항상 어떤 원본을 위임 대상으로 연결한다.

## JS는 함수로 객체를 만든다

클래스가 없는 JS에서 객체 생성의 주체는 **함수**다. 리터럴(`{}`)이나 `new Object({...})`로 만들어도 내부적으로는 `Object`라는 함수가 동원된다(`typeof Object === 'function'`). 클래스 기반 언어에서 클래스만의 것이라 여기던 `new`와 생성자(constructor)를 JS에서는 함수가 갖는다.

## 함수의 프로토타입 객체 (prototype property)

함수를 선언하면 그 함수의 **프로토타입 객체가 자동으로 함께 생성**되어 함수의 `prototype` 프로퍼티에 연결된다. `new User()`로 인스턴스를 만들면 `User` 함수 자체가 아니라 **`User.prototype`을 원본으로** 위임 연결한 객체가 만들어진다. 그래서 인스턴스의 타입은 함수(`function`)가 아니라 객체(`object`)다 — 복제된 원본이 객체이기 때문이다.

## constructor — 원본이 가리키는 생성자

프로토타입 객체는 `constructor` 프로퍼티로 자신을 만든 함수를 되가리킨다(`User.prototype.constructor === User`). 인스턴스 자신은 어떤 생성자가 호출됐는지 직접 들고 있지 않지만, 원본(프로토타입)의 `constructor`를 타고 알아낼 수 있다(`instance` → 원본 → `constructor`).

## __proto__ — 원본으로 가는 링크 ([[Prototype]])

인스턴스가 자신의 원본(`User.prototype`)을 가리키는 링크가 `[[Prototype]]` 내부 슬롯이고, 그 별칭이 `__proto__`다(`evan.__proto__ === User.prototype`). 두 개념을 구분해야 한다.

- 함수의 `prototype` 프로퍼티: **자손에게 물려줄 원본** 객체
- 인스턴스의 `[[Prototype]]`(`__proto__`): **내가 복제한 원본**으로 가는 링크

`__proto__`는 비표준 별칭이므로 실제 코드에서는 `Object.getPrototypeOf()` / `Object.setPrototypeOf()`를 쓰고, 원본을 명시해 객체를 만들 땐 `Object.create(proto)`를 쓴다.

## 프로토타입 체인

`__proto__` 링크를 따라 원본을 거슬러 올라가면 사슬이 드러난다.

- 인스턴스 → `Constructor.prototype` → `Object.prototype` → `null`
- 모든 함수 → `Function.prototype` → `Object.prototype` → `null`

`Object.prototype`이 모든 객체의 최상위 조상이라 그 위로는 원본이 없다(`Object.prototype.__proto__ === null`). 그래서 `Object.prototype`만 유일하게 원본 링크가 없다. 프로퍼티를 읽을 때 객체 자신에 없으면 이 체인을 따라 위로 올라가며 찾는데(프로토타입 룩업), 끝까지 없으면 `undefined`다. 빌트인 `String`, `Array`, `Boolean`도 모두 이 방식으로 정의돼 같은 체인에 얹힌다.

## 클래스와의 관계

ES6 `class`는 이 메커니즘 위에 얹은 문법이다. 단순한 문법 설탕을 넘어 재선언 금지, 호이스팅 시 TDZ 등 더 엄격한 제약을 더하지만, 내부 동작은 그대로 프로토타입이다(`class` 메서드는 결국 `prototype`에 얹힌다). JS가 클래스 기반 언어가 된 것이 아니라, 클래스의 외형을 두른 프로토타입이다. 레거시 ES5 코드의 프로토타입 상속을 읽고 마이그레이션하려면 이 원리를 알아야 한다.

## 면접 체크포인트

- JS 객체는 함수로 생성되고, `new`는 함수가 아니라 함수의 `prototype` 객체를 원본으로 위임 연결한다 (그래서 인스턴스 타입이 object)
- 함수의 `prototype` 프로퍼티(자손에게 줄 원본) vs 인스턴스의 `__proto__`/`[[Prototype]]`(내 원본 링크)의 구분
- `constructor`로 인스턴스가 자신의 생성자를 역추적하는 경로
- 프로토타입 체인 끝(`Object.prototype.__proto__ === null`)과 프로퍼티 룩업
- `__proto__`는 비표준 — `Object.getPrototypeOf`/`create` 사용
- `class`가 프로토타입의 외형이라는 점과 ES5 상속 코드 마이그레이션의 전제

## 출처

- [자바스크립트의 프로토타입 훑어보기 — evan-moon](https://evan-moon.github.io/2019/10/23/js-prototype/)

## 관련 문서

- [[Prototype-Inheritance|프로토타입 상속 (this vs prototype, 룩업, Object.create 상속)]]
- [[Prototype-OOP|Prototype 기반 OOP (prototype에 메서드 연결, instanceof)]]
- [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유 (철학, Self)]]
- [[Prototype패턴이란|프로토타입 패턴 (GoF 생성 패턴)]]
- [[JS-Value-vs-Reference|원시 vs 참조 (얕은 복사의 참조 공유)]]
- [[Hoisting|호이스팅, TDZ (class의 제약)]]
- [[자바스크립트(JS)|JavaScript 인덱스]]
