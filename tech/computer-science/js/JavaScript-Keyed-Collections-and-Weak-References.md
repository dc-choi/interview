---
tags: [cs, javascript, map, set, weakmap, weakset, garbage-collection]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Keyed Collections", "JavaScript Map Set WeakMap WeakSet"]
---

# JavaScript keyed collection과 약한 참조

`Map`/`Set`은 enumerable collection이고 `WeakMap`/`WeakSet`은 key/value의 생존을 강하게 붙들지 않는 identity 기반 보조 구조다. Object보다 새 API라는 이유만으로 Map을 선택하거나, Weak collection이라는 이유만으로 memory leak이 사라진다고 가정하지 않는다.

## Map과 Object

Map은 arbitrary value를 key로 사용하고 SameValueZero로 key를 구분하며 삽입 순서로 순회한다.

```ts
const metadata = new Map<object, Metadata>();
metadata.set(entity, { loadedAt: Date.now() });
```

- object key는 구조가 아니라 identity로 비교한다.
- `set`은 같은 Map을 반환해 chaining할 수 있고 기존 key의 value를 바꿔도 원래 순서 위치는 유지된다.
- `get` 결과 `undefined`만으로 미존재와 저장된 `undefined`를 구분할 수 없으므로 `has`를 쓴다.
- `entries`와 `[Symbol.iterator]`는 key/value pair, `keys`/`values`는 각 iterator를 반환한다.
- `forEach` callback 순서는 `(value, key, map)`이며 Array의 `(value, index, array)`와 비슷하지만 두 번째 값의 의미가 다르다.

명세는 Map/Set access가 collection 크기에 대해 평균 sublinear여야 한다고 요구할 뿐 특정 hash table이나 항상 O(1)을 보장하지 않는다.

Object는 JSON/record/property descriptor/prototype ecosystem에 자연스럽고 Map은 dynamic key, non-string key, 빈번한 삽입/삭제와 명시적 size/iteration에 자연스럽다. 특별한 경우가 아니면 무조건 Map이라는 규칙은 두지 않는다.

## Set의 uniqueness

Set도 SameValueZero를 사용해 각 값을 최대 한 번 저장한다. object는 같은 identity만 중복으로 본다.

- `add`는 Set을 반환하고 `has`, `delete`, `clear`로 관리한다.
- `keys`와 `values`는 같은 값 stream이고 `entries`는 Map 호환을 위해 `[value, value]` pair를 낸다.
- 중복 제거 뒤 원래 multiplicity/count가 필요하다면 Set만으로는 정보가 사라진다.
- domain uniqueness는 DB unique constraint나 aggregate invariant를 함께 사용한다.

## WeakMap과 WeakSet

현재 ECMAScript에서 weak key/value가 될 수 있는 것은 object 또는 비등록 Symbol이다. `Symbol.for`로 얻은 registry Symbol은 weakly hold할 수 없다. object만 가능하다는 과거 설명은 현재 명세 전체를 반영하지 않는다.

WeakMap key나 WeakSet value에 대한 다른 strong reference가 사라지면 해당 entry가 collection 때문에 살아남지는 않는다. 하지만 GC 실행 시점과 제거 시점은 관찰할 수 없고 다음 API가 없다.

- iteration, `size`, `keys`, `values`, `entries`, `clear`
- 특정 entry가 언제 수거됐는지 확인하는 API
- GC를 강제로 실행해 business logic을 결정하는 기능

WeakMap value가 다른 곳에서 강하게 참조되거나 application이 key를 별도 array/cache에 보관하면 leak은 남을 수 있다. Weak collection은 자동 누수 방지제가 아니라 object lifetime에 붙는 metadata/memoization/private state에 맞는 도구다.

```ts
const requestMetadata = new WeakMap<object, RequestMetadata>();
```

WeakSet은 처리한 object 표시처럼 membership만 필요할 때 쓴다. audit/count/enumeration이 필요하면 durable store나 일반 collection이 맞다.

## mutation 중 iteration

Map/Set iterator는 underlying collection을 참조한다. 순회 중 delete/add가 이후 방문 결과에 영향을 줄 수 있고 새 entry가 관찰될 수도 있다. 안정 snapshot이 필요하면 명시적으로 복사하되 메모리 비용을 감수한다.

## NestJS/TypeScript 적용

- singleton provider의 일반 Map cache에는 TTL/size bound/eviction과 tenant key를 둔다.
- request object metadata처럼 owner object 수명에 붙는 값은 WeakMap 후보지만 관측 가능한 cache metric이 필요하면 별도 counter를 설계한다.
- Map의 object identity key를 DB entity equality나 primary key equality와 혼동하지 않는다.
- process-local collection을 distributed lock/idempotency/unique constraint 대용으로 쓰지 않는다.
- serialization boundary에서는 Map/Set을 DTO array/record로 명시적으로 변환한다.

## 출처

- [ECMAScript Language Specification, keyed collections](https://tc39.es/ecma262/multipage/keyed-collections.html)
- [ECMAScript Language Specification, liveness and execution](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-liveness)
- Map: [생성/구조](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30817), [Map/Object 선택](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30818), [set/get/has](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30819), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30820), [forEach/delete/clear](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30821)
- WeakMap: [개요](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30823), [method](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30824), [GC](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30984), [Map 비교](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30825)
- Set: [생성/Map 비교](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30827), [add/has](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30828), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30829), [forEach/delete/clear](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30830)
- [WeakSet](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30832)

## 관련 문서

- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JS-Value-vs-Reference|JavaScript 값과 identity]]
- [[TTL|TTL과 cache lifecycle]]
- [[Call-Stack-Heap|V8 heap과 Garbage Collection]]
