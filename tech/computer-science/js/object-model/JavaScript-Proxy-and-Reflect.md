---
tags: [cs, javascript, proxy, reflect, metaprogramming]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Proxy Reflect", "JavaScript 프록시와 리플렉트"]
---

# JavaScript Proxy와 Reflect

`Proxy`는 target object의 essential internal method 호출을 handler의 trap으로 가로챈다. `Reflect`는 같은 종류의 object operation을 함수 형태로 제공해 trap 안에서 기본 동작을 위임하기 좋다.

```ts
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    auditRead(key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    validate(key, value);
    return Reflect.set(target, key, value, receiver);
  },
});
```

## target, handler, trap과 receiver

- target은 실제 operation의 대상이다.
- handler는 trap method를 담은 object다.
- trap이 없으면 해당 operation은 target으로 전달된다.
- `receiver`는 원래 property 접근을 받은 object이며 accessor 안의 `this`를 결정할 수 있다.
- trap method 자체의 `this`는 handler지만 receiver와 같은 개념이 아니다.

`Reflect.get/set`에 receiver를 전달하면 prototype chain의 accessor가 원래 receiver를 보도록 기본 의미를 보존한다. 단순 `target[key]`/`target[key] = value`는 accessor `this`와 상속 상황에서 다른 결과를 낼 수 있다.

## 주요 trap과 operation

| trap | 가로채는 대표 operation |
|---|---|
| `get`/`set` | property 읽기/쓰기 |
| `has` | `key in object` |
| `deleteProperty` | `delete object[key]` |
| `defineProperty` | property descriptor 정의 |
| `getOwnPropertyDescriptor` | own descriptor 조회 |
| `ownKeys` | `Reflect.ownKeys`, key enumeration 기반 |
| `getPrototypeOf`/`setPrototypeOf` | prototype 조회/변경 |
| `isExtensible`/`preventExtensions` | 확장 가능성 조회/차단 |
| `apply` | function 호출 |
| `construct` | `new`/`Reflect.construct` |

`set`, `deleteProperty`, `defineProperty`, `setPrototypeOf` 같은 trap은 성공 여부 boolean을 반환한다. strict mode assignment에서 `set`이 false면 `TypeError`가 발생할 수 있다.

## invariant는 우회할 수 없다

Proxy는 target의 non-configurable property, non-extensible 상태와 prototype 같은 essential invariant를 거짓으로 보고할 수 없다. engine은 trap 결과를 검사하고 위반하면 `TypeError`를 던진다.

- non-configurable/non-writable data property 값을 다른 값처럼 보고할 수 없다.
- non-extensible target의 own key를 추가/누락한 것처럼 보고할 수 없다.
- `isExtensible` 결과는 실제 target 상태와 같아야 한다.
- `construct` 결과는 object여야 한다.

이 제약은 Proxy가 언어의 object model과 memory safety 가정을 깨뜨리는 것을 막는다.

## Reflect의 역할

`Reflect`는 Proxy 전용 객체가 아니다. `Reflect.apply`, `construct`, `get`, `set`, `defineProperty`, `deleteProperty`, `ownKeys` 등은 언어 operation을 명시적으로 호출한다.

- 많은 mutation method가 boolean을 반환해 성공/실패를 분기하기 쉽다.
- `Reflect.ownKeys`는 own string/symbol key를 모두 반환한다.
- `Reflect.construct(Target, args, NewTarget)`는 allocation prototype을 분리할 수 있지만 framework 수준 metaprogramming 외에는 과용하지 않는다.
- `Reflect.has`는 own property만이 아니라 prototype chain까지 보는 `in` 의미다.

## revocable proxy와 수명

`Proxy.revocable(target, handler)`는 `proxy`와 `revoke`를 반환한다. revoke 뒤 proxy의 대부분 operation은 `TypeError`가 된다. plugin capability나 임시 view를 회수할 때 쓸 수 있지만 이미 노출된 target reference까지 무효화하지는 못한다.

## 투명하지 않은 경계

Proxy는 모든 object에 완전히 투명한 wrapper가 아니다.

- `Map`, `Set`, `Date` 같은 built-in method는 internal slot receiver를 요구해 단순 proxy에서 실패할 수 있다.
- class private field는 target brand를 검사하므로 proxy receiver로 호출하면 실패할 수 있다.
- identity는 `proxy !== target`이며 WeakMap key와 equality에 영향을 준다.
- nested object는 자동으로 proxy되지 않는다.
- trap은 hot path 최적화와 debugging을 어렵게 만들 수 있으므로 측정한다.

Proxy를 authorization/security sandbox로 간주하지 않는다. validation, observation, virtualization처럼 명확한 경계에 사용하고 domain entity의 모든 접근을 마법처럼 가로채는 설계는 피한다.

## receiver, 고정 target과 실패 신호

Proxy를 prototype으로 두면 own property로 해결되지 않은 읽기/쓰기/has가 chain을 따라 trap에 도달한다. receiver는 처음 접근을 받은 child여서 Reflect.set(target,key,value,receiver)는 child에 own property를 만들 수 있지만 target[key] 대입은 target을 바꾼다. receiver를 생략하지 않는 이유다.

ProxyCreate는 생성 때의 target object를 저장하므로 바깥 target 변수에 다른 object를 재할당해도 proxy의 대상은 바뀌지 않는다. closure로 다른 대상을 위임하더라도 invariant 검사는 처음 target 기준이다. target/handler는 object여야 하고 빈 trap은 {}로 표현한다. apply/construct trap만 추가해도 일반 object가 함수/생성자가 되지 않으며 proxy는 target의 Call/Construct 능력을 따른다.

trap의 반환은 계약이 다르다. getPrototypeOf는 object/null, getOwnPropertyDescriptor는 descriptor/undefined, ownKeys는 중복 없는 String/Symbol 목록, construct는 object를 반환해야 한다. non-extensible target의 prototype과 key 목록을 거짓으로 보고할 수 없다. Array.isArray는 가짜 prototype을 돌려주는 trap이 아닌 실제 target의 배열 여부를 따른다.

Object.defineProperty는 실패하면 mode와 관계없이 TypeError, Reflect.defineProperty는 false다. property 대입은 실패 시 sloppy에서 무시, strict에서 TypeError이고 Reflect.set은 false다. Object.setPrototypeOf는 거부 시 TypeError, Reflect.setPrototypeOf는 false다. Reflect도 잘못된 인자나 trap이 던진 예외는 전파하므로 모든 실패를 boolean으로 바꾸는 API라고 일반화하지 않는다.

## 출처

- 인프런 보충 강의: [4. ArrayBuffer 인스턴스 생성: new ArrayBuffer(), byteLength, slice(), isView()](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50311)

- [ECMAScript Language Specification, Reflect](https://tc39.es/ecma262/multipage/reflection.html#sec-reflect-object)
- [ECMAScript Language Specification, Proxy objects](https://tc39.es/ecma262/multipage/reflection.html#sec-proxy-objects)
- [ECMAScript Language Specification, essential internal method invariants](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-invariants-of-the-essential-internal-methods)
- Proxy 기본: [operation](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48723), [동작](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48724), [handler/trap/target](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48729), [revocable](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48730)
- Proxy trap: [set 1](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48739), [set/receiver](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48740), [get](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48741), [has/delete](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48742), [descriptor/extensible](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48743), [prototype](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48744), [construct/apply/keys](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48745)
- Reflect: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48746), [get](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48747), [set](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48748), [has/delete](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48749), [descriptor/extensible](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48750), [prototype/keys](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48751), [construct/apply](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48752)

## 관련 문서

- [[Object-Property-Descriptor|Object property descriptor]]
- [[Prototype-Mechanism|Prototype 동작 원리]]
- [[Proxy패턴이란|구조 패턴 Proxy]]
- [[JavaScript-Class-Semantics|JavaScript Class 의미]]
