---
tags: [cs, javascript, object, property, descriptor, immutability]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["프로퍼티 디스크립터", "JavaScript Object Property Descriptor"]
---

# JavaScript 프로퍼티 디스크립터와 Object 상태

JavaScript object는 property의 집합과 `[[Prototype]]` 같은 internal slot을 가진다. property 값만 보면 writable/enumerable/configurable, getter/setter, own/inherited 여부를 놓치므로 조작 목적에 맞는 reflection API를 선택해야 한다.

## property key와 접근

Property key는 String 또는 Symbol이다. object literal, dot, bracket syntax는 편의 문법이고 내부 의미와 완전히 같은 용어가 아니다.

```ts
const user = { name: "Kim" };
user.name = "Lee";
user[dynamicKey] = value;
```

- dot syntax는 정적인 identifier-like key에, bracket syntax는 동적 String/Symbol key에 적합하다.
- 없는 property 조회는 prototype chain까지 찾은 뒤 `undefined`를 반환한다. 값이 `undefined`인 own property와 property 부재는 다르다.
- `Object.hasOwn(object, key)`로 own 여부를 검사한다. 대상이 override할 수 있는 `object.hasOwnProperty` 직접 호출보다 안전하다.
- `for...in`은 enumerable string property를 own/inherited 모두 열거한다. own data만 필요하면 `Object.keys/values/entries`를 쓴다.
- property 순서는 명세 규칙이 있지만 business 정렬이나 signature canonicalization으로 암묵 사용하지 않는다.

Untrusted key를 그대로 merge하면 `__proto__`, `constructor`, `prototype`을 통한 prototype pollution이 생길 수 있다. schema allowlist와 null-prototype dictionary/Map을 검토한다.

## object, instance와 host

ECMAScript가 정의한 built-in object와 browser/Node.js host가 제공하는 object를 구분한다. 오래된 native/host 분류를 모든 현재 API의 절대 분류표로 쓰지 않는다. 서로 다른 Realm은 각자의 intrinsic과 prototype을 가지므로 `instanceof`가 경계를 넘으면 예상과 다를 수 있다.

Object 생성 경로는 literal, `Object()`, `new Constructor()`, `Object.create(proto)` 등 여러 가지다. 모두 prototype 복제를 뜻하지 않는다. `new`는 construct operation이고 자세한 연결은 [[Prototype-Mechanism|프로토타입 동작 원리]]에서 다룬다.

Property 값이 callable이면 일반적으로 method처럼 호출할 수 있지만 “prototype에 있으면 method, 아니면 function”이라는 분류는 정확하지 않다. method definition은 `[[HomeObject]]` 등 별도 의미를 가질 수 있고 같은 function value도 호출 형태에 따라 `this`가 달라진다.

## descriptor 두 종류

| 종류 | 전용 field | 공통 field |
|---|---|---|
| data descriptor | `value`, `writable` | `enumerable`, `configurable` |
| accessor descriptor | `get`, `set` | `enumerable`, `configurable` |

Data field와 accessor field를 한 descriptor에 섞으면 `TypeError`다. `Object.defineProperty`에서 생략한 Boolean attribute는 기본 `false`다. 반면 ordinary assignment/object literal로 만든 property는 보통 writable/enumerable/configurable가 true다.

```ts
Object.defineProperty(account, "balance", {
  value: 0,
  writable: false,
  enumerable: true,
  configurable: false,
});
```

- `writable: false`는 data value 재할당을 막는다. sloppy code에서는 무시될 수 있고 strict code에서는 `TypeError`다.
- `enumerable: false`는 `Object.keys`/`for...in` 등에서 제외하지만 property 자체를 숨기거나 비공개로 만들지는 않는다.
- `configurable: false`는 삭제와 대부분의 descriptor 재정의를 막는다. 일부 one-way 변경만 허용된다.
- getter/setter는 property access에 code를 실행하므로 side effect, 오류와 serialization 비용을 숨길 수 있다.

`Object.getOwnPropertyDescriptor(s)`로 own descriptor를 읽고 `Object.defineProperty/defineProperties`로 정의한다. `Object.getOwnPropertyNames`는 non-enumerable string key도, `Object.getOwnPropertySymbols`는 Symbol key를, `Reflect.ownKeys`는 둘 다 반환한다.

## 확장 제한과 얕은 불변성

| API | 새 property | 삭제/config 변경 | 기존 writable value |
|---|---|---|---|
| `preventExtensions` | 금지 | 가능 | 가능 |
| `seal` | 금지 | 금지 | 가능 |
| `freeze` | 금지 | 금지 | 금지 |

`Object.freeze`는 own property descriptor 수준의 얕은 동결이다. 중첩 object, private field가 가리키는 상태, 외부 resource까지 immutable하게 만들지 않는다. TypedArray view 등 일부 exotic object에는 추가 제약이 있다. deep freeze는 cycle/Symbol/prototype와 외부 identity를 포함한 별도 contract가 필요하다.

`const`는 binding 재할당을 막고 `freeze`는 object의 표면 mutation을 제한한다. TypeScript `readonly`는 주로 compile-time 제약이다. 세 가지를 같은 보장으로 설명하지 않는다.

## 타입/프로토타입 판별

- `Object.getPrototypeOf(value)`는 직접 prototype을 읽는다.
- `proto.isPrototypeOf(value)`는 chain에 특정 object가 있는지 본다.
- `value instanceof Constructor`는 기본적으로 `Constructor.prototype`이 value의 chain에 있는지 검사하며 custom `Symbol.hasInstance`가 개입할 수 있다.
- `constructor` property는 상속/교체 가능한 일반 property여서 생성 이력을 보장하지 않는다.
- runtime shape/brand 검증에는 schema, discriminant와 목적별 built-in 검사(`Array.isArray`)를 사용한다.

## TypeScript/NestJS 적용

- DTO의 `readonly`를 runtime 보안 경계로 보지 말고 validation/authorization을 별도로 둔다.
- entity/DTO를 descriptor 복사로 복제해 ORM proxy와 class invariant를 우회하지 않는다.
- global singleton의 getter가 request별 mutable state를 숨기지 않게 한다.
- configuration object를 freeze하더라도 nested secret/resource lifecycle은 별도로 보호한다.

## 출처

- [ECMAScript Language Specification, Object constructor](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object-constructor), [property descriptor](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-property-descriptor-specification-type)
- property 기초: [추가/변경](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24623), [조회/for-in](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24624)
- Object 기초: [object 분류/instance](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24648), [공통 API](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24649), [생성/valueOf/instanceof](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24650), [prototype 구조](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24651), [function/method 호출](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24653), [소유/열거 검사](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24654), [Object.prototype](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24655)
- prototype/OOP: [script/OOP](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24693), [prototype 기반 구현](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24694), [instance/instanceof](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24695), [method 호출 형태](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24696)
- ES5 descriptor: [개요](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24698), [defineProperty](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24699), [data attributes](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24701), [getter/setter](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24702), [property 추출](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24703), [확장 제한/freeze](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24704)

## 관련 문서

- [[Prototype-Mechanism|프로토타입 동작 원리]]
- [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]
- [[JavaScript-Proxy-and-Reflect|Proxy와 Reflect]]
- [[JS-Value-vs-Reference|값과 참조]]
