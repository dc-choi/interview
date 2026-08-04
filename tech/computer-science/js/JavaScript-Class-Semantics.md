---
tags: [cs, javascript, class, prototype, inheritance]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Class Semantics", "JavaScript 클래스 의미"]
---

# JavaScript Class 의미와 상속

JavaScript `class`는 prototype 기반 객체 모델 위에 정의된 문법이지만 단순한 constructor function 별칭은 아니다. 호출 방식, lexical binding, strict mode, method descriptor와 derived constructor 규칙이 명세로 정해진다.

## class가 만드는 구조

```ts
class Product {
  static category = "goods";
  #price: number;

  constructor(price: number) {
    this.#price = price;
  }

  get price() {
    return this.#price;
  }

  *prices() {
    yield this.#price;
  }
}
```

- instance method는 `Product.prototype`에 non-enumerable property로 정의된다.
- static method/field는 constructor object인 `Product`에 속한다.
- class body는 strict mode로 평가된다.
- private field는 이름 관례가 아니라 language-level brand check를 가진다.
- generator method는 호출할 때 iterable iterator를 반환한다.

class declaration은 lexical binding을 만들고 scope 진입 때 binding 자체는 준비되지만 선언 평가 전에는 TDZ에 있다. 따라서 단순히 호이스팅되지 않는다고 외우기보다 `let`/`const`처럼 선언 전 접근이 `ReferenceError`라는 동작을 기억한다.

## constructor와 반환값

base constructor가 object를 명시적으로 반환하면 새 instance 대신 그 object가 결과가 될 수 있고 primitive 반환은 무시된다. derived constructor는 `this`를 사용하기 전에 `super()`로 base constructor를 실행해야 한다. 다른 object를 직접 반환하는 특수한 경우가 있지만 class invariant와 private field 초기화를 깨뜨리기 쉬워 일반 설계에는 쓰지 않는다.

computed property name은 class 정의 시점에 평가될 수 있으므로 외부 mutable state나 effect를 넣지 않는다. 초기화 순서는 base field, base constructor, derived field, derived constructor의 규칙을 예제로 검증한다.

## 상속은 두 prototype chain을 연결한다

`class Child extends Parent`는 대략 다음 두 관계를 만든다.

```text
Child.prototype -> Parent.prototype
Child           -> Parent
```

첫 관계는 instance method 상속, 둘째 관계는 static member 상속에 쓰인다. overriding method에서 `super.method()`는 home object를 기준으로 parent method를 찾으며 단순히 현재 `this`의 property를 다시 조회하는 것과 다르다.

- `extends` 뒤에는 constructor 또는 `null`로 평가되는 expression이 올 수 있다.
- built-in subclassing은 명세가 지원해도 species, allocation과 runtime 호환성을 확인한다.
- DOM interface는 host object이므로 임의의 browser/realm에서 모두 construct/subclass 가능하다고 가정하지 않는다.
- private field는 이름이 같아도 parent/child 사이에서 별도 brand다.
- inheritance보다 composition이 invariant와 교체 가능성을 더 잘 드러내는지 먼저 비교한다.

상속의 목적을 instance마다 다른 property 지원이라고 한정하지 않는다. 각 instance의 상태는 상속 없이도 가질 수 있다. 상속은 subtype 관계와 behavior reuse를 표현하며, LSP와 결합 비용을 감수할 이유가 있을 때 선택한다.

## getter, setter와 static

getter/setter는 property 접근 문법에 계산을 연결한다. I/O나 큰 계산을 숨기면 호출자가 비용과 실패를 예상하기 어렵다.

- getter는 인자를 받지 않고 setter는 하나의 값을 받는다.
- setter만 있거나 getter만 있는 descriptor의 반대 접근 결과를 확인한다.
- validation 실패 정책을 throw, Result 또는 별도 method 중 하나로 명확히 한다.
- static factory는 생성 정책에 이름을 부여할 때 유용하지만 global mutable state 저장소로 만들지 않는다.

## this와 callback

class method의 `this`는 호출 receiver에 따라 정해진다. method를 callback으로 분리하면 instance binding을 잃을 수 있다.

```ts
button.addEventListener("click", product.handleClick.bind(product));
```

arrow field는 lexical `this`를 보존하지만 instance마다 함수가 생성된다. prototype method와 bind/arrow field 중 identity, memory, removeEventListener와 override 필요를 비교한다.

## TypeScript/NestJS 적용

- entity/domain class는 constructor와 factory에서 invariant를 만들고 setter 남용을 피한다.
- decorator metadata와 TypeORM proxy/lazy relation은 language private field와 상호작용을 확인한다.
- NestJS provider method를 callback으로 넘길 때 context binding을 잃지 않게 한다.
- inheritance로 controller/service를 공통화하기보다 composition, interceptor와 guard가 책임 경계를 더 잘 보존하는지 비교한다.

## 출처

- [ECMAScript Language Specification, class definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions)
- [ECMAScript Language Specification, private identifiers](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-names-and-keywords)
- yongsoocho, [class와 interface, function의 경계](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=162054)
- 과정 안내: [범위](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48646), [학습 접근](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48731)
- Class: [OOP와 객체](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48727), [선언/구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48728), [computed name](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48732), [constructor](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48733), [getter/setter/static/TDZ](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48734), [extends/override](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48735), [super](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48736), [built-in 상속](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48737), [this/generator](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48738)

## 관련 문서

- [[JS-Prototype|JavaScript prototype]]
- [[Prototype-Inheritance|Prototype 상속]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[Object-Property-Descriptor|Object property descriptor]]
- [[Generalization-vs-Abstraction|일반화와 추상화]]
