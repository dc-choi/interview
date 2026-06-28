---
tags: [cs, javascript, prototype, oop, inheritance]
status: done
category: "CS - JavaScript"
aliases: ["Prototype Inheritance", "프로토타입 상속", "프로토타입 룩업", "Prototype Lookup", "Object.create 상속"]
---

# 프로토타입 상속 (멤버 정의와 상속 구현)

JS에는 상속, 캡슐화가 언어 차원의 키워드로 존재하지 않는다. OOP 개념을 프로토타입으로 흉내 낸 패턴일 뿐이다. 상속은 프로토타입 체인으로, 캡슐화는 클로저로 구현한다. 프로토타입 연결의 기본 원리는 [[Prototype-Mechanism|프로토타입 동작 원리]]를 전제로 한다.

## 멤버 정의 두 방법 — this vs prototype

생성자 함수로 객체에 프로퍼티, 메서드를 붙이는 길은 둘이고, 결과가 다르다.

- **생성자 안에서 `this`에 정의**: 인스턴스가 생성될 때마다 **각 객체에 직접, 새로** 할당된다. 그래서 두 인스턴스의 같은 메서드도 서로 다른 함수다(`a.say !== b.say`). 인스턴스마다 값이 달라야 하는 **고유 상태**(예: `this.name`)는 이 방법으로 둔다.
- **`Constructor.prototype`에 정의**: 인스턴스 자신은 그 멤버를 갖지 않고 **원본 객체의 것을 공유**한다. 그래서 두 인스턴스의 메서드가 동일하다(`a.say === b.say`). 메서드처럼 모든 인스턴스가 똑같이 쓰는 것은 prototype에 두면 메모리에 하나만 존재한다.

주의: prototype에 둔 값은 **공유**되므로, `Constructor.prototype.name = 'Evan'`처럼 상태성 데이터를 올리면 모든 인스턴스가 같은 값을 보게 된다. 고유 상태는 `this`, 공유 메서드는 prototype이 원칙이다.

## 프로토타입 룩업 (Prototype Lookup)

`this`로 아무것도 안 붙인 빈 인스턴스에서도 prototype에 정의한 메서드를 호출할 수 있는 이유다. 프로퍼티 접근 시 JS는,

1. 객체 **자신**이 그 프로퍼티를 가졌는지 본다.
2. 없으면 `__proto__`(원본 객체)로 올라가 다시 찾는다.
3. 이 과정을 최상위 `Object.prototype`까지 반복하고, 끝내 없으면 `undefined`를 반환한다.

그래서 모든 객체는 자기 프로토타입 체인에 있는 **모든 원본 객체의 멤버를 빌려 쓸 수 있다**(빈 객체도 `Object.prototype`의 `toString`, `hasOwnProperty`를 쓰는 이유). 이 룩업은 **접근하는 순간마다** 일어나 동적이다 — 클래스 정의 시점에 상속 관계가 한 번에 고정되는 클래스 기반 언어와 다른 지점이다. 부모(원본)의 속성을 물려받는다는 점에 착안해 이 룩업 위에 상속을 구현한다.

## Object.create로 상속 구현

`Object.create(proto, descriptors?)`는 첫 인자를 **원본 객체(프로토타입)로 지정**해 새 객체를 만든다. 둘째 인자는 선택이며 `Object.defineProperties`식 서술자(데이터, 접근 서술자)로 준다([[Object-Property-Descriptor|프로퍼티 디스크립터]]). 프로토타입 체인을 직접, 심지어 런타임에 동적으로 조립할 수 있다는 게 핵심이다.

부모 `SuperClass`, 자식 `SubClass`의 상속은 세 단계로 엮는다.

1. **부모 생성자 호출** — 자식 생성자 안에서 `SuperClass.call(this, ...args)`. `call`(또는 `apply`, `bind`)은 함수의 실행 컨텍스트(`this`)를 첫 인자로 바꾼다. 부모 생성자를 자식 인스턴스의 `this`로 실행해 부모의 **고유 상태**(`this.name` 등)를 자식 인스턴스에 심는다. Java의 `super(...)` 호출에 해당한다.
2. **프로토타입 체인 연결** — `SubClass.prototype = Object.create(SuperClass.prototype)`. 자식의 prototype을 부모 prototype을 원본으로 하는 객체로 교체해, 자식 인스턴스 → `SubClass.prototype` → `SuperClass.prototype` 체인을 만든다. 이로써 부모의 **공유 메서드**가 룩업으로 닿는다.
3. **constructor 복구** — 2단계에서 자식 prototype을 통째로 갈아끼웠으므로 `SubClass.prototype.constructor`가 여전히 `SuperClass`를 가리킨다. `SubClass.prototype.constructor = SubClass`로 되돌려, 자식 인스턴스가 자기 생성자를 올바로 역추적하게 한다.

결과 체인은 `instance` → `SubClass.prototype`(자식 고유 메서드 + constructor) → `SuperClass.prototype`(부모 메서드) → `Object.prototype` → `null`이다. 1단계가 고유 상태 상속, 2단계가 공유 메서드 상속을 담당하는 분업이 요점이다.

## ES6 class와의 관계

`class SubClass extends SuperClass { constructor() { super(...) } }`는 위 세 단계를 그대로 캡슐화한 문법이다. `extends`가 2단계(프로토타입 체인 연결), `super(...)`가 1단계(부모 생성자 호출)에 대응한다. 동작 원리는 동일한 프로토타입 상속이라, 레거시 ES5 상속 코드를 읽고 class로 마이그레이션하려면 이 레시피를 이해해야 한다.

## 면접 체크포인트

- `this` 정의(인스턴스 고유, 매번 새로) vs `prototype` 정의(공유, 메모리 1개)의 차이와 선택 기준
- prototype에 상태성 데이터를 올리면 전 인스턴스가 공유되는 함정
- 프로토타입 룩업 절차(자신 → `__proto__` 체인 → `Object.prototype` → `undefined`)와 매 접근 시 동적 수행
- 상속 3단계 — `Super.call(this)`(고유 상태), `Object.create`(체인), `constructor` 복구
- `call`/`apply`/`bind`로 `this`(실행 컨텍스트)를 바꾸는 의미, `super` 대응
- `extends`/`super`가 이 레시피의 문법 캡슐화라는 점

## 출처

- [프로토타입을 사용하여 상속하기 — evan-moon](https://evan-moon.github.io/2019/10/27/inheritance-with-prototype/)

## 관련 문서

- [[Prototype-Mechanism|프로토타입 동작 원리 (prototype 객체, constructor, __proto__, 체인)]]
- [[Prototype-OOP|Prototype 기반 OOP (instanceof, ES6 class)]]
- [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유]]
- [[Object-Property-Descriptor|프로퍼티 디스크립터 (Object.create 서술자)]]
- [[자바스크립트(JS)|JavaScript 인덱스]]
