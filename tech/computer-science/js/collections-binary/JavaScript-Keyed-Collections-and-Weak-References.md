---
tags: [cs, javascript, map, set, weakmap, weakset, weakref, garbage-collection]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Keyed Collections", "JavaScript Map Set WeakMap WeakSet"]
---

# JavaScript keyed collection과 약한 참조

`Map`/`Set`은 enumerable collection이고 `WeakMap`/`WeakSet`은 각각 key와 value의 생존을 강하게 붙들지 않는 identity 기반 보조 구조다. Object보다 새 API라는 이유만으로 Map을 선택하거나, Weak collection이라는 이유만으로 memory leak이 사라진다고 가정하지 않는다.

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
- Set은 `add`가 성공한 삽입 순서로 순회하므로 `[...new Set(array)]`는 각 값의 첫 등장 순서를 유지하며 중복을 제거한다. `array.filter((value, index) => array.indexOf(value) === index)`는 요소마다 그 값의 첫 등장 위치까지 배열을 다시 훑는다. 비용은 고유 값의 개수가 아니라 각 값이 처음 나타나는 위치로 정해진다. 모든 값이 다르면 길이의 제곱에 비례하고, 같은 값끼리 묶여 정렬된 입력도 묶음들이 전체 길이에 비례할 만큼 크면 고유 값이 두 개뿐이어도 길이의 제곱에 비례한다. 또 `indexOf`가 `NaN`을 찾지 못해 `NaN`을 모두 버린다.
- 중복 제거 뒤 원래 multiplicity/count가 필요하다면 Set만으로는 정보가 사라진다.
- domain uniqueness는 DB unique constraint나 aggregate invariant를 함께 사용한다.

ES2025부터 `union`, `intersection`, `difference`, `symmetricDifference`(새 Set 반환)와 `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`(boolean 반환)이 표준 method다. Node.js는 V8을 12.4로 올린 22부터 기본 제공한다.

- receiver는 실제 Set이어야 하지만 인자는 `size`, `has`, `keys`를 가진 set-like object면 된다. 인자는 `[Symbol.iterator]`로 순회하지 않는다. `union`, `symmetricDifference`, `isSupersetOf`는 `keys()`로 요소를 읽고, `isSubsetOf`는 `has()`로 소속만 확인하며, `intersection`, `difference`, `isDisjointFrom`은 receiver의 크기가 인자의 `size`보다 크면 `keys()`, 아니면 `has()`를 쓴다. Map의 `keys()`와 `has()`는 모두 key를 기준으로 하므로 Map을 넘기면 key 집합으로 계산한다.
- Array는 `size`와 `has`가 없어 set-like가 아니다. `set.intersection([2])`는 `size`를 숫자로 읽지 못해 `TypeError`이므로 `new Set(array)`로 감싼다.
- 오래된 runtime 대응으로 같은 이름의 method를 `Set.prototype`에 직접 추가하면 writable인 표준 구현을 덮어쓴다. 독립 함수나 표준을 따르는 polyfill을 쓴다.

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

## WeakRef와 FinalizationRegistry

`WeakRef`(ES2021)는 대상 하나를 약하게 참조한다. 다른 strong reference가 모두 사라지면 대상은 수거될 수 있고, 수거된 뒤 `deref()`는 `undefined`를 반환한다. WeakRef는 수거를 막지 않을 뿐이고, 언제 수거할지와 수거 여부는 engine 구현이 정한다.

- 대상은 object 또는 (ES2023부터) 비등록 Symbol이어야 한다. `new WeakRef(10)`이나 `Symbol.for()`로 얻은 Symbol처럼 허용되지 않는 값을 넘기거나 `new` 없이 호출하면 `TypeError`다.
- WeakRef를 만들거나 `deref()`로 대상을 꺼내면 현재 job이 끝날 때까지 대상은 수거되지 않는다. 수거는 event loop turn 사이에서만 관찰된다.
- 아무도 강하게 참조하지 않아도 `deref()`가 계속 대상을 반환할 수 있다. 수거 여부를 business logic이나 테스트의 판정 조건으로 쓰지 않는다.

WeakMap은 문자열을 key로 쓸 수 없고 value는 key가 살아 있는 동안 유지하므로, 문자열 key로 큰 결과를 캐시하면서 결과만 수거되게 하는 용도에는 맞지 않는다. 이때는 `Map<string, WeakRef<V>>`에 결과를 넣고 `deref()`가 `undefined`면 다시 계산한다. 대상이 수거돼도 `WeakRef` 객체와 Map entry는 남으므로 `FinalizationRegistry`의 cleanup callback으로 entry를 지운다.

```ts
/**
 * key별 계산 결과를 약한 참조로 캐시한다. 수거된 결과는 다시 계산한다.
 * @param compute key로 결과를 만드는 함수
 * @returns 캐시를 거쳐 결과를 반환하는 함수
 */
const createWeakCache = <V extends object>(compute: (key: string) => V) => {
  const cache = new Map<string, WeakRef<V>>();
  const registry = new FinalizationRegistry<string>((key) => {
    // 같은 key에 새 값이 들어왔을 수 있으므로 비어 있을 때만 지운다
    if (!cache.get(key)?.deref()) {
      cache.delete(key);
    }
  });

  return (key: string): V => {
    const cached = cache.get(key)?.deref();
    if (cached) {
      return cached;
    }
    const value = compute(key);
    cache.set(key, new WeakRef(value));
    registry.register(value, key);
    return value;
  };
};
```

cleanup callback은 늦게 호출되거나 호출되지 않을 수 있고, 프로그램이 종료되거나 registry 자체에 도달할 수 없게 되면 호출될 가능성이 낮다. 파일 핸들, DB 연결처럼 반드시 해제해야 하는 자원은 `try/finally` 같은 명시적 경로로 정리하고, 두 API는 오래 실행되는 프로그램의 메모리 사용량을 줄이는 비필수 최적화에만 쓴다. 운영 cache에는 아래 NestJS 절처럼 크기 상한과 TTL을 둔 일반 cache를 먼저 검토한다.

## mutation 중 iteration

Map/Set iterator는 underlying collection을 참조한다. 순회 중 delete/add가 이후 방문 결과에 영향을 줄 수 있고 새 entry가 관찰될 수도 있다. 안정 snapshot이 필요하면 명시적으로 복사하되 메모리 비용을 감수한다.

## NestJS/TypeScript 적용

- singleton provider의 일반 Map cache에는 TTL/size bound/eviction과 tenant key를 둔다.
- request object metadata처럼 owner object 수명에 붙는 값은 WeakMap 후보지만 관측 가능한 cache metric이 필요하면 별도 counter를 설계한다.
- Map의 object identity key를 DB entity equality나 primary key equality와 혼동하지 않는다.
- process-local collection을 distributed lock/idempotency/unique constraint 대용으로 쓰지 않는다.
- serialization boundary에서는 Map/Set을 DTO array/record로 명시적으로 변환한다.

## 생성 입력과 가공

Map 생성자는 각 entry가 object인지 확인하고 그 entry의 property 0과 1을 key/value로 읽는다. `new Map([{id:1},{id:2}])`는 오류 없이 `undefined => undefined` 하나가 되고 primitive entry는 TypeError다. `new Map(rows.map(row => [row.id,row]))`나 Object.entries로 pair를 명시한다. plain Object는 숫자 key를 문자열로 바꾸지만 Map은 100과 '100'을 구분하므로 route/query 입력은 key type을 먼저 통일한다. size는 getter라 대입으로 비우지 않고 clear를 쓴다.

Map/Set 자신에는 map/filter가 없다. `[...map].filter(...)`처럼 배열로 모으거나, 지원 runtime에서는 ES2025 iterator helper로 `new Map(map.entries().filter(([,v]) => v.active))`처럼 중간 배열 없이 지연 소비한다. iterator helper도 한 번만 소비된다. 순차 effect는 for...of에 두고 helper 지원과 type 설정은 배포 환경에서 확인한다.

## 출처

- [ECMAScript, Iterator.prototype.map](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator.prototype.map)

- [ECMAScript, AddEntriesFromIterable](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-add-entries-from-iterable)

- [ECMAScript Language Specification, keyed collections](https://tc39.es/ecma262/multipage/keyed-collections.html)
- [ECMAScript Language Specification, liveness and execution](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-liveness)
- [ECMAScript Language Specification, WeakRef objects](https://tc39.es/ecma262/multipage/managing-memory.html#sec-weak-ref-objects), [FinalizationRegistry objects](https://tc39.es/ecma262/multipage/managing-memory.html#sec-finalization-registry-objects)
- [ECMAScript 2021 Language Specification](https://262.ecma-international.org/12.0/), [ECMAScript 2023 Language Specification](https://262.ecma-international.org/14.0/), [ECMAScript 2025 Language Specification](https://262.ecma-international.org/16.0/)
- [MDN, Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [MDN, Array.prototype.indexOf()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf)
- [MDN, WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
- [MDN, FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)
- [MDN, Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [Node.js 22 is now available! — Node.js](https://nodejs.org/en/blog/announcements/v22-release-announce)
- [모던 자바스크립트 딥다이브 스터디 #1-1 (CH4, 5) — FE재남](https://www.youtube.com/watch?v=3ZP3VPlrr0U)
- [모던 자바스크립트 딥다이브 스터디 #9-2 (CH 37, 42) — FE재남](https://www.youtube.com/watch?v=DnsAOh_sw5o)
- Map: [생성/구조](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30817), [Map/Object 선택](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30818), [set/get/has](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30819), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30820), [forEach/delete/clear](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30821)
- WeakMap: [개요](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30823), [method](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30824), [GC](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30984), [Map 비교](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30825)
- Set: [생성/Map 비교](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30827), [add/has](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30828), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30829), [forEach/delete/clear](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30830)
- [WeakSet](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30832)

## 관련 문서

- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JS-Value-vs-Reference|JavaScript 값과 identity]]
- [[TTL|TTL과 cache lifecycle]]
- [[Call-Stack-Heap|V8 heap과 Garbage Collection]]
