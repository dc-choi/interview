---
tags: [cs, javascript, class, prototype, inheritance]
status: done
verified_at: 2026-09-28
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

class body에는 `constructor`를 하나만 둘 수 있고 getter, setter, generator, async method로 정의할 수 없으며, 어기면 early `SyntaxError`다. constructor를 생략하면 base class는 `constructor() {}`, derived class는 `constructor(...args) { super(...args); }`처럼 동작하는 기본 constructor를 받으므로 constructor가 없는 subclass에 넘긴 인자는 모두 parent constructor로 전달된다.

base constructor가 object를 명시적으로 반환하면 새 instance 대신 그 object가 결과가 되고 primitive 반환은 무시된다. derived constructor는 instance를 직접 만들지 않는다. `super(...)`가 parent constructor를 현재 `new.target`으로 construct하고 그 결과를 `this`에 바인딩하므로 `this`를 쓰기 전에 `super()`를 호출해야 한다. instance 할당을 base 쪽이 맡기 때문에 `class List extends Array`의 instance는 prototype이 `List.prototype`이면서 index 대입에 따라 `length`가 갱신되는 Array exotic object다. ES5식 `Array.call(this)`는 새 배열을 만들어 반환할 뿐 `this`를 초기화하지 않으므로 `this`는 일반 object로 남는다.

- `super()` 전에 `this`에 접근하거나, `super()`를 호출하지 않은 constructor가 return 없이 끝나거나 `undefined`를 반환하면 `ReferenceError`다. `super()`를 두 번 호출하면 parent constructor가 한 번 더 실행된 뒤 `ReferenceError`다.
- derived constructor가 `undefined`가 아닌 primitive를 반환하면 `super()` 호출 여부와 관계없이 `TypeError`다.
- derived constructor가 `super()` 없이 다른 object를 반환할 수도 있지만 class invariant와 private field 초기화를 깨뜨리기 쉬워 일반 설계에는 쓰지 않는다.

computed property name은 class 정의 시점에 평가될 수 있으므로 외부 mutable state나 effect를 넣지 않는다. 초기화 순서는 base field, base constructor, derived field, derived constructor의 규칙을 예제로 검증한다.

비동기로 준비할 값은 constructor 밖에서 기다린다. constructor에서 Promise를 반환하면 `new`의 결과가 instance가 아닌 Promise가 되므로, 준비된 값만 받는 constructor와 값을 `await`한 뒤 `new`를 호출하는 static async factory로 나눈다. NestJS에서는 `useFactory`가 Promise를 반환하는 [[Custom-Provider|async provider]]를 두면 그 Promise가 resolve될 때까지 이를 주입받는 class의 인스턴스화가 미뤄진다.

```ts
class ReportClient {
  readonly #token: string;

  private constructor(token: string) {
    this.#token = token;
  }

  /**
   * token을 비동기로 준비한 뒤 instance를 만든다.
   * @param loadToken token을 읽어 오는 비동기 함수
   * @returns token이 준비된 ReportClient
   */
  static async create(loadToken: () => Promise<string>): Promise<ReportClient> {
    const token = await loadToken();
    return new ReportClient(token);
  }

  authorizationHeader(): string {
    return `Bearer ${this.#token}`;
  }
}
```

## 상속은 두 prototype chain을 연결한다

`class Child extends Parent`는 대략 다음 두 관계를 만든다.

```text
Child.prototype -> Parent.prototype
Child           -> Parent
```

첫 관계는 instance method 상속, 둘째 관계는 static member 상속에 쓰인다. `super.prop`는 호출 receiver인 `this`가 아니라 method의 `[[HomeObject]]`가 가진 `[[Prototype]]`에서 찾는다. HomeObject는 method를 정의한 object로 instance method는 class의 `prototype`, static method는 class 자신, object literal method는 그 literal이다. 그래서 static method 안의 `super.method()`는 parent class의 static method를 찾는다.

HomeObject는 정의할 때 고정된다. method를 다른 object에 대입하거나 mixin처럼 다른 class의 `prototype`으로 복사하거나 `bind`, `call`로 receiver를 바꿔도 `this`만 바뀌고 `super`는 원래 HomeObject의 `[[Prototype]]`에서 계속 찾는다. 이 `[[Prototype]]`은 조회할 때마다 읽으므로 `Object.setPrototypeOf` 등으로 상속 사슬 자체를 바꿀 때만 달라진다. 여러 class에 복사해 공유할 method는 `super`에 의존하지 않는다.

- `super.x`는 class와 object literal의 method 축약형, getter, setter, class field initializer와 static block에서 쓸 수 있다. `{ f: function () { return super.x; } }`처럼 property에 넣은 function expression 안에서는 early `SyntaxError`다.
- `super`는 값이 아니라 `super(...)` 호출과 `super.prop`, `super[expr]` property 조회라는 두 문법 형태다. `super` 자체를 읽거나 변수에 담을 수 없다.
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
- class의 instance getter와 setter는 instance가 아니라 `prototype`에 non-enumerable accessor로 정의된다(static accessor는 class constructor에 정의된다). object spread도, replacer 배열 없이 호출한 `JSON.stringify`도 enumerable own property만 다루므로 getter로 계산한 값은 결과에 나타나지 않는다(replacer 배열에 key를 나열하면 `JSON.stringify`가 그 getter를 호출해 포함한다). 응답에 넣으려면 `toJSON()`이나 명시적 DTO 변환을 두고, NestJS의 `ClassSerializerInterceptor`에서는 getter에 `@Expose()`를 붙인다([[NestJS-Serialization|응답 직렬화]]).
- static factory는 생성 정책에 이름을 부여할 때 유용하지만 global mutable state 저장소로 만들지 않는다.
- static initialization block `static { ... }`(ES2022)은 class 평가 중 한 번, static field initializer와 선언 순서대로 실행된다. 블록 안의 `this`는 class constructor이고 class의 private member에도 접근할 수 있어 try/catch가 필요한 초기화나 한 번의 계산으로 여러 static 값을 채울 때 쓴다. 블록 안의 `var`, `let`, `const`와 함수 선언은 블록 local이라 static property가 되지 않으므로 값은 `this.key = value`로 남긴다. 블록 안의 `await`, `arguments`와 `super()`는 `SyntaxError`다.

## this와 callback

class method의 `this`는 호출 receiver에 따라 정해진다. method를 callback으로 분리하면 instance binding을 잃을 수 있다.

```ts
button.addEventListener("click", product.handleClick.bind(product));
```

arrow field는 lexical `this`를 보존하지만 instance마다 함수가 생성된다. prototype method와 bind/arrow field 중 identity, memory, removeEventListener와 override 필요를 비교한다.

arrow field의 `this`가 instance인 이유는 field initializer의 평가 방식에 있다. initializer는 class 정의 때 HomeObject를 가진 method 형태의 함수로 만들어지고, instance 생성 중 그 instance를 receiver로 호출된다. 그래서 initializer 안의 `this`는 생성 중인 instance이고 `super.x`는 base class의 `prototype`에서 찾으며, 여기서 만든 arrow는 이 둘을 lexical하게 잡는다. `const handle = order.handle`처럼 떼어 호출해도 instance를 가리키는 것은 일반 lexical `this` 규칙의 결과다.

## TypeScript/NestJS 적용

- entity/domain class는 constructor와 factory에서 invariant를 만들고 setter 남용을 피한다.
- decorator metadata와 TypeORM proxy/lazy relation은 language private field와 상호작용을 확인한다.
- NestJS provider method를 callback으로 넘길 때 context binding을 잃지 않게 한다.
- inheritance로 controller/service를 공통화하기보다 composition, interceptor와 guard가 책임 경계를 더 잘 보존하는지 비교한다.

## static receiver

`Child.create()`로 상속받은 static method를 호출하면 this는 Child여서 `return new this()` factory는 Child를 만든다. method를 떼어 일반 호출하면 class code는 strict라 this가 undefined다. static member는 instance에는 없고 `this.constructor.method()`는 교체 가능한 일반 constructor property를 읽는다. 생성 중 실제 class가 필요하면 new.target을 확인한다. class도 typeof 결과는 function이고 public static field는 ES2022 표준이다.

## 출처

- [ECMAScript Language Specification, class definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions)
- [ECMAScript Language Specification, private identifiers](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-names-and-keywords)
- [ECMAScript Language Specification, class definitions early errors](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions-static-semantics-early-errors)
- [ECMAScript Language Specification, ClassDefinitionEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-classdefinitionevaluation)
- [ECMAScript Language Specification, ClassFieldDefinitionEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-classfielddefinitionevaluation)
- [ECMAScript Language Specification, ECMAScript function object의 Construct internal method](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ecmascript-function-objects-construct-argumentslist-newtarget)
- [ECMAScript Language Specification, super keyword](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-super-keyword)
- [ECMAScript Language Specification, GetSuperBase](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-getsuperbase)
- [ECMAScript Language Specification, Array constructor](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array-constructor)
- [ECMAScript Language Specification, SerializeJSONObject](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonobject)
- [ECMAScript Language Specification, SerializeJSONProperty](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty)
- [MDN, super](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)
- [MDN, constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/constructor)
- [MDN, get](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)
- [MDN, Static initialization blocks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks)
- [MDN, Public class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields)
- [MDN, JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [NestJS, Async providers](https://docs.nestjs.com/fundamentals/async-providers)
- [NestJS, Serialization](https://docs.nestjs.com/application/serialization)
- [Finished Proposals — TC39](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [모던 자바스크립트 딥다이브 스터디 #5-2 (CH 25 클래스) — FE재남](https://www.youtube.com/watch?v=QImQUt-FDKE)
- [모던 자바스크립트 딥다이브 스터디 #6-1 (CH 26 함수의 추가기능) — FE재남](https://www.youtube.com/watch?v=eeDbljgvCxg)
- [모던 자바스크립트 딥다이브 스터디 #11-1 (CH 46 제네레이터와 async/await) — FE재남](https://www.youtube.com/watch?v=IyLdUbzyqcs)
- yongsoocho, [class와 interface, function의 경계](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=162054)
- 과정 안내: [범위](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48646), [학습 접근](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48731)
- Class: [OOP와 객체](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48727), [선언/구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48728), [computed name](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48732), [constructor](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48733), [getter/setter/static/TDZ](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48734), [extends/override](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48735), [super](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48736), [built-in 상속](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48737), [this/generator](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48738)

## 관련 문서

- [[JS-Prototype|JavaScript prototype]]
- [[Prototype-Inheritance|Prototype 상속]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[Object-Property-Descriptor|Object property descriptor]]
- [[Generalization-vs-Abstraction|일반화와 추상화]]
