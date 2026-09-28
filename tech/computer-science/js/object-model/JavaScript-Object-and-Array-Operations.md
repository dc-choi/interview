---
tags: [cs, javascript, object, array, copy, prototype]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Object Array Operations", "JavaScript 객체와 배열 연산"]
---

# JavaScript Object와 Array 연산

Object/Array helper는 편리하지만 복사 깊이, key 범위, descriptor, prototype과 mutation 여부가 서로 다르다. method 이름만 보고 immutable 변환이나 deep copy라고 추정하지 않는다.

## 비교 알고리즘

JavaScript에는 목적별 equality가 있다.

| 연산 | 특징 |
|---|---|
| `===` | type conversion 없음, `NaN`은 자기 자신과 다름, `+0`/`-0` 같음 |
| `Object.is` | SameValue, `NaN` 같음, `+0`/`-0` 다름 |
| `Map`/`Set`/`includes` | SameValueZero, `NaN` 같음, `+0`/`-0` 같음 |

object는 구조가 같아도 같은 identity가 아니면 위 비교에서 다르다. domain equality가 필요하면 identifier/value object 규칙을 별도로 정의한다.

## Object.assign과 얕은 복사

`Object.assign(target, ...sources)`는 source의 enumerable own string/symbol property 값을 읽어 target에 설정하고 target을 반환한다.

- target이 `null`/`undefined`면 throw하고 source의 `null`/`undefined`는 건너뛴다.
- source getter와 target setter가 실행될 수 있다.
- descriptor/prototype과 non-enumerable property를 보존하지 않는다.
- 중첩 object identity는 그대로 공유한다.
- 중간 property에서 실패하면 앞선 target mutation이 rollback되지 않는다.

object spread도 얕은 복사지만 일반적으로 새 object에 data property를 생성하므로 inherited setter와의 상호작용이 `Object.assign`과 다를 수 있다.

## deep clone의 계약

`JSON.parse(JSON.stringify(value))`는 JSON-compatible data round trip이지 범용 deep clone이 아니다. `undefined`, Symbol, function, BigInt, cycle, special number, Date/Map/Set와 custom type의 의미를 잃거나 실패할 수 있다.

`structuredClone`은 cycle과 여러 built-in type을 지원하고 transferable object의 ownership도 이전할 수 있지만 function/WeakMap/Symbol 같은 모든 값을 clone하지는 않으며 custom class prototype/behavior 보존을 기대해서는 안 된다. domain object는 명시적 mapper/copy constructor가 더 안전하다.

## Object 변환과 descriptor

- `Object.keys/values/entries`는 enumerable own string-keyed property만 다룬다.
- `Object.fromEntries`는 iterable pair를 own data property로 만들며 duplicate key는 뒤 값이 이긴다.
- symbol/non-enumerable key까지 필요하면 `Reflect.ownKeys`를 쓴다.
- `Object.getOwnPropertyDescriptors`와 `Object.defineProperties`를 조합하면 accessor/attribute를 보존할 수 있지만 prototype은 별도다.

own key 순서는 `[[OwnPropertyKeys]]`가 정한다. ordinary object는 array index key(0부터 2^32 - 2까지 정수의 정규 문자열)를 숫자 오름차순으로 먼저 반환하고, 나머지 String key를 생성 순서로, 그 뒤에 Symbol key를 생성 순서로 반환한다. `Object.keys/values/entries`와 `JSON.stringify`의 순서를 명세가 보장한 것은 ES2020부터다. `for...in`도 ES2020부터 대상과 체인에 Proxy, TypedArray, module namespace object나 구현이 제공한 exotic object가 없고 순회 중 prototype 교체, property 삭제, prototype 쪽 property 추가, enumerable 변경이 없으면 객체마다 이 순서로 key를 방문한 뒤 prototype으로 올라간다. Array, String object, mapped arguments object처럼 목록에 없는 exotic object는 이 보장에 포함된다. ES2019까지는 명세가 `for...in` 순서를 정하지 않았고, 지금도 이 조건을 벗어나면 순서는 구현 의존이다.

숫자 ID를 object key로 쓰면 이 규칙이 결과를 바꾼다. 정렬해 조회한 행을 ID key object로 모으면 열거 순서와 JSON 응답의 key 순서가 ID 오름차순으로 바뀐다. `"01"`처럼 정규 형식이 아니거나 2^32 - 1 이상인 숫자 문자열은 일반 String key라 생성 순서를 유지하므로 ID 범위에 따라 결과가 달라진다. 순서가 의미를 가지면 배열이나 삽입 순서를 보존하는 `Map`을 쓰고, API canonicalization/signature에는 명시적 sort를 둔다.

```ts
const rows = [{ id: 30 }, { id: 10 }]; // 정렬된 조회 결과
Object.keys(Object.fromEntries(rows.map((row) => [row.id, row]))); // ["10", "30"]
[...new Map(rows.map((row) => [row.id, row])).keys()]; // [30, 10]
```

## prototype 변경

`__proto__` accessor는 web compatibility를 위해 명세 본문(20.1.3.8)에 Normative Optional, Legacy로 남은 기능이다. 조회에는 `Object.getPrototypeOf`, 생성에는 `Object.create`, 꼭 필요한 변경에는 `Object.setPrototypeOf`를 사용한다.

이미 생성된 object의 prototype을 바꾸면 engine 최적화를 방해하고 object 전체의 lookup 의미를 바꾼다. prototype pollution 입력과도 경계가 맞닿으므로 untrusted key를 prototype 조작에 사용하지 않는다. 동적 상속 조립보다 class/composition과 명시적 factory를 우선한다.

instance own function은 instance마다 새 identity/storage를 갖고 prototype method는 instance들이 공유한다. callback binding/override 요구가 없다면 prototype method가 기본이다.

## Array 생성과 변환

- `Array.from`은 iterable 또는 array-like에서 새 Array를 만들며 optional mapper를 생성 중 적용한다. `Symbol.iterator`가 있으면 iterator를 먼저 쓰고 없을 때만 `length`와 index로 읽는다. 문자열은 code point 단위로 나뉘므로 UTF-16 code unit 단위인 `split('')`과 다를 수 있다. `'\u{1F600}a'.split('')`는 surrogate pair가 갈라져 3개, `Array.from('\u{1F600}a')`는 2개다.
- `Array.of(3)`은 `[3]`, `Array(3)`은 length 3의 sparse array다. 인수가 하나이고 숫자가 아니면 `Array`는 그 값을 첫 요소로 넣으므로 쿼리 문자열의 `'5'`를 그대로 넘기면 `['5']`가 된다. 길이는 정수로 검증한 뒤 `Array.from({ length })`로 만들고 요소 목록은 `Array.of`나 literal로 만든다.
- `Array.fromAsync`는 async/sync iterable과 array-like를 비동기로 수집하지만 전체 materialization 비용은 남는다.
- 많은 `Array.prototype` method가 generic이라는 뜻은 `length`/indexed property contract로 다른 object에도 호출 가능하다는 뜻이지 모든 iterable에 자동 적용된다는 뜻이 아니다.

## mutation과 검색

| method | 핵심 의미 |
|---|---|
| `copyWithin` | 같은 배열 범위를 겹침 안전하게 복사, 원본 mutation, 길이 유지 |
| `fill` | 같은 value reference로 범위를 채움, 원본 mutation |
| `find`/`findIndex` | 첫 predicate match의 값/index, 없으면 `undefined`/`-1` |
| `findLast`/`findLastIndex` | 뒤에서부터 찾은 첫 match의 값/index, 없으면 `undefined`/`-1`, ES2023 |
| `includes` | SameValueZero로 포함 확인 |
| `flat` | 지정 depth만큼 새 배열로 평탄화, 생략하면 1, `Infinity`면 모든 중첩 해제 |
| `flatMap` | map 뒤 depth 1만 평탄화 |

`fill({})`은 각 칸에 새 object를 만드는 것이 아니라 같은 object reference를 넣는다. cycle 처리나 arbitrary iterable flatten은 별도 contract다.

마지막 match를 `array.reverse().find(fn)`로 찾으면 `reverse`가 원본 순서를 바꾸고 index도 `length - 1 - i`로 다시 계산해야 한다. 뒤에서부터 찾을 때는 `findLast`/`findLastIndex`를 쓴다.

`entries`, `keys`, `values`는 stateful Array iterator를 반환한다. 원본 배열을 참조하므로 순회 중 mutation이 이후 관찰 결과에 영향을 줄 수 있다. 한 번 exhausted된 iterator가 reset되지는 않지만 object가 즉시 사라진다는 뜻도 아니다.

## TypeScript/NestJS 적용

- DTO/entity 복제에 spread나 JSON round trip을 사용해 class behavior와 relation을 잃지 않는다.
- patch command에서 `undefined`(미제공)와 `null`(명시적 제거)을 구분한다.
- prototype-sensitive key인 `__proto__`, `constructor`, `prototype`을 동적 merge에서 차단하고 검증된 schema를 쓴다.
- 큰 async input을 `Array.fromAsync`로 전부 모으기 전에 streaming/backpressure 필요를 검토한다.

## 출처

- [ECMAScript Language Specification, Object constructor](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object-constructor)
- [ECMAScript Language Specification, Array objects](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array-objects)
- [ECMAScript Language Specification, String.prototype.split](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.split)
- [ECMAScript Language Specification, String iterator](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-%symbol.iterator%)
- [MDN, Array.prototype.flat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat)
- [HTML Standard, structured data](https://html.spec.whatwg.org/multipage/structured-data.html)
- [ECMAScript Language Specification, OrdinaryOwnPropertyKeys](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys)
- [ECMAScript Language Specification, EnumerableOwnProperties](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-enumerableownproperties)
- [ECMAScript Language Specification, EnumerateObjectProperties](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-enumerate-object-properties)
- [Normative: make EnumerableOwnPropertyNames ordered — tc39/ecma262 #1793](https://github.com/tc39/ecma262/pull/1793)
- [Normative: specify for-in enumeration order in more cases — tc39/ecma262 #1791](https://github.com/tc39/ecma262/pull/1791)
- [Finished Proposals — tc39/proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [모던 자바스크립트 딥다이브 스터디 #4-2 (CH 19 프로토타입) — FE재남](https://www.youtube.com/watch?v=IBUSatGNUzs)
- [모던 자바스크립트 딥다이브 스터디 #6-2 (CH 27 배열) — FE재남](https://www.youtube.com/watch?v=bpvmUePh7ZM)
- Object: [Object.is](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30762), [assign](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30763), [deep copy](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30764), [entries/descriptors](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30765), [prototype 호출](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30766), [instance function](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30767), [__proto__ 변경](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30768), [instance prototype 변경](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30769), [prototype 연결](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30770)
- Array: [from/of](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30776), [copyWithin](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30777), [generic method](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30778), [find/findIndex](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30779), [fill/includes](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30780), [flat/flatMap](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30781), [entries](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30782), [keys/values](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30783)

## 관련 문서

- [[JS-Value-vs-Reference|JavaScript 값과 참조]]
- [[JavaScript-Array-Mutation-Iteration-and-Sorting|Array 변경, 순회와 빈 slot]]
- [[Object-Property-Descriptor|property descriptor와 불변성]]
- [[Prototype-Mechanism|Prototype 동작 원리]]
- [[JavaScript-Iterable-Functional-Pipelines|JavaScript 이터러블 파이프라인]]
