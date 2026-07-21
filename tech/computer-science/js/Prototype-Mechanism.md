---
tags: [cs, javascript, prototype, oop]
status: done
category: "CS - JavaScript"
aliases: ["Prototype Mechanism", "프로토타입 동작 원리", "프로토타입 객체", "Prototype Object", "constructor", "__proto__", "프로토타입 체인", "Prototype Chain"]
verified_at: 2026-07-21
---

# 프로토타입 동작 원리 (객체 생성과 체인)

JavaScript 객체는 다른 객체를 `[[Prototype]]` 내부 슬롯으로 참조하고, 자신에게 없는 프로퍼티 조회를 그 객체에 위임할 수 있다. 이 연결의 사슬이 프로토타입 체인이다. 객체 리터럴, 생성자 호출, 빌트인 팩터리, `Object.create()` 등 생성 경로는 여러 가지이며 함수가 모든 객체를 만드는 것은 아니다. 왜 JS가 이 모델을 택했는지는 [[JavaScript-Prototype-Philosophy|프로토타입 철학]], OOP 사용법은 [[Prototype-OOP]].

## 디자인 패턴 뿌리 — 프로토타입 패턴

GoF의 Prototype 생성 패턴은 원본 객체를 **복제**해 새 객체를 만드는 패턴이다. JavaScript의 prototype chain은 이름과 역사적 아이디어가 닿아 있지만 동작은 복제가 아니라 **위임 연결**이다. `new User()`는 `User.prototype`을 복사하지 않는다. 새 객체의 `[[Prototype]]`이 그 객체를 가리키게 한다. GoF 패턴 자체는 [[Prototype패턴이란|프로토타입 패턴]] 참조.

## 객체를 만드는 여러 경로

객체 리터럴(`{}`), 배열 리터럴, `new Constructor()`, `Object.create(proto)`, 빌트인 팩터리는 모두 객체를 만들 수 있다. 객체 리터럴 평가를 `Object` 생성자 호출로 설명하면 안 된다. 리터럴은 사양의 객체 리터럴 평가 규칙에 따라 새 ordinary object를 만들고 일반적으로 해당 Realm의 `%Object.prototype%`을 prototype으로 사용한다. `Object.create(null)`처럼 prototype을 `null`로 지정할 수도 있다.

## 함수의 프로토타입 객체 (prototype property)

생성자로 사용할 수 있는 일반 함수는 보통 객체인 `prototype` 프로퍼티를 갖는다. `new User()`는 새 객체를 만들고, `User.prototype`이 객체라면 그것을 새 객체의 `[[Prototype]]`으로 연결한 뒤 `User`를 `this`와 함께 실행한다. 연결 대상이 객체라는 사실과 인스턴스의 `typeof`가 `object`인 것은 복제 때문이 아니다.

## constructor — 원본이 가리키는 생성자

일반 함수가 처음 갖는 prototype 객체에는 보통 함수 자신을 가리키는 `constructor` 프로퍼티가 있다(`User.prototype.constructor === User`). 인스턴스에서 읽는 `constructor`는 대개 체인에서 상속한 일반 프로퍼티일 뿐이며, 생성 이력을 보장하는 내부 식별자가 아니다. prototype을 교체하거나 프로퍼티를 덮어쓰면 값이 달라질 수 있으므로 타입 판별의 절대 근거로 쓰지 않는다.

## __proto__ — 원본으로 가는 링크 (`[[Prototype]]`)

인스턴스가 prototype 객체를 가리키는 사양상의 링크가 `[[Prototype]]` 내부 슬롯이다. 일반 객체에서 `__proto__`로 보이는 것은 보통 `Object.prototype`에 정의된 legacy accessor가 이 슬롯을 읽고 쓰는 것이다. 둘은 같은 프로퍼티가 아니다.

- 함수의 `prototype` 프로퍼티: **자손에게 물려줄 원본** 객체
- 인스턴스의 `[[Prototype]]`: **프로퍼티 조회를 위임할 객체**로 가는 링크

`__proto__` accessor는 ECMAScript Annex B에 표준화돼 있지만 웹 호환성을 위한 legacy 기능이며 normative optional이다. 일반 코드에서는 `Object.getPrototypeOf()`와 `Object.setPrototypeOf()`를 쓰고, prototype을 지정해 객체를 만들 때는 `Object.create(proto)`를 쓴다. 성능과 예측 가능성 때문에 생성 후 prototype 변경은 피하는 편이 좋다.

## 프로토타입 체인

`__proto__` 링크를 따라 원본을 거슬러 올라가면 사슬이 드러난다.

- 일반 생성자 인스턴스 → `Constructor.prototype` → 보통 `Object.prototype` → `null`
- 일반 함수 객체 → `Function.prototype` → `Object.prototype` → `null`

많은 일반 객체의 체인은 해당 Realm의 `Object.prototype`을 거쳐 `null`에서 끝난다. 그러나 `Object.create(null)`로 만든 null-prototype 객체는 처음부터 `null`에서 끝나며, 모든 객체가 `Object.prototype`에 도달하는 것은 아니다. 다른 Realm의 객체는 그 Realm의 intrinsic prototype을 따른다. 프로퍼티를 읽을 때 객체 자신에 없으면 체인을 따라 찾고, 끝까지 없으면 `undefined`다.

## 클래스와의 관계

ES6 `class`는 이 메커니즘 위에 얹은 문법이다. 단순한 문법 설탕을 넘어 재선언 금지, 호이스팅 시 TDZ 등 더 엄격한 제약을 더하지만, 내부 동작은 그대로 프로토타입이다(`class` 메서드는 결국 `prototype`에 얹힌다). JS가 클래스 기반 언어가 된 것이 아니라, 클래스의 외형을 두른 프로토타입이다. 레거시 ES5 코드의 프로토타입 상속을 읽고 마이그레이션하려면 이 원리를 알아야 한다.

## 면접 체크포인트

- 객체 생성 경로는 여러 가지이며, `new`는 생성자의 `prototype` 객체를 복제하지 않고 새 객체의 `[[Prototype]]`으로 연결한다
- 함수의 `prototype` 프로퍼티(자손에게 줄 원본) vs 인스턴스의 `__proto__`/`[[Prototype]]`(내 원본 링크)의 구분
- `constructor`는 상속 가능한 일반 프로퍼티라 생성 이력을 보장하지 않는다
- 체인은 `null`에서 끝나며 null-prototype 객체처럼 `Object.prototype`을 거치지 않는 예외가 있다
- `__proto__`는 표준화된 legacy accessor — 새 코드에서는 `Object.getPrototypeOf`/`create` 사용
- `class`가 프로토타입의 외형이라는 점과 ES5 상속 코드 마이그레이션의 전제

## 출처

- [자바스크립트의 프로토타입 훑어보기 — evan-moon](https://evan-moon.github.io/2019/10/23/js-prototype/)
- [ECMAScript 2024 Language Specification — Ordinary Object Internal Methods and Internal Slots](https://tc39.es/ecma262/2024/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinary-object-internal-methods-and-internal-slots)
- [ECMAScript 2024 Annex B — Object.prototype.__proto__](https://tc39.es/ecma262/2024/multipage/additional-ecmascript-features-for-web-browsers.html#sec-object.prototype.__proto__)

## 관련 문서

- [[Prototype-Inheritance|프로토타입 상속 (this vs prototype, 룩업, Object.create 상속)]]
- [[Prototype-OOP|Prototype 기반 OOP (prototype에 메서드 연결, instanceof)]]
- [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유 (철학, Self)]]
- [[Prototype패턴이란|프로토타입 패턴 (GoF 생성 패턴)]]
- [[JS-Value-vs-Reference|원시 vs 참조 (얕은 복사의 참조 공유)]]
- [[Hoisting|호이스팅, TDZ (class의 제약)]]
- [[자바스크립트(JS)|JavaScript 인덱스]]
