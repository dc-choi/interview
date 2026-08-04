---
tags: [cs, javascript, template-literal, symbol, metaprogramming]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Template Literals and Symbols", "JavaScript 템플릿 리터럴과 Symbol"]
---

# JavaScript Template Literal과 Symbol

template literal은 문자열 조합과 tagged processing을 위한 문법이고 Symbol은 고유한 primitive/property key다. 둘 다 abstraction hook을 제공하지만 escaping, privacy나 security boundary를 자동으로 만들지는 않는다.

## template literal

```ts
const message = `order ${orderId} failed`;
```

untagged template의 expression은 문자열로 변환되고 source의 줄바꿈이 결과에 포함된다. logging/query/HTML에 값을 삽입할 때 context-specific escaping이나 parameter binding을 생략하면 안 된다.

tagged template은 괄호 없는 특수 호출로, cooked string 조각 배열과 expression 값을 분리해 받는다.

```ts
const query = sql`SELECT * FROM orders WHERE id = ${orderId}`;
```

안전한 `sql` tag라면 expression을 query text에 합치지 않고 bind parameter로 바꿔야 한다. tag를 붙였다는 사실만으로 SQL injection/XSS가 막히는 것은 아니다. 같은 template site의 strings object는 identity가 재사용되고 동결되므로 cache key로 활용할 수 있다.

`strings.raw`와 `String.raw`는 escape sequence가 처리되기 전 source text 조각을 다룬다. 일반 문자열 escaping/sanitizing 함수나 모든 backslash를 보존하는 serializer로 오해하지 않는다.

## Symbol의 identity

`Symbol(description)`을 호출할 때마다 새 Symbol primitive가 생긴다. description은 debugging label일 뿐 identity가 아니다. `new Symbol()`은 throw하지만 `Object(symbol)`로 wrapper object를 만들 수 있으므로 Symbol에 wrapper가 없다고 말할 수도 없다.

```ts
const internal = Symbol("internal");
const model = { [internal]: 1 };
```

symbol-keyed property는 `Object.keys`, `for...in`과 JSON object serialization에서 보이지 않지만 `Reflect.ownKeys`/`Object.getOwnPropertySymbols`로 발견할 수 있다. 따라서 private field, access control 또는 data integrity 수단이 아니다.

`Symbol.for(key)`는 agent-wide global symbol registry에서 같은 key를 재사용하고 `Symbol.keyFor`는 registry symbol의 key만 반환한다. registry symbol은 weak collection의 weak key로 쓸 수 없다.

## Well-known Symbol

Well-known Symbol은 언어 operation이 object behavior를 조회하는 protocol hook이다.

| Symbol | 연결되는 의미 |
|---|---|
| `iterator`/`asyncIterator` | sync/async iteration |
| `toPrimitive` | object의 primitive conversion |
| `toStringTag` | 기본 object tag 표현 |
| `hasInstance` | `instanceof` behavior |
| `isConcatSpreadable` | `Array.prototype.concat` 전개 여부 |
| `species` | 일부 built-in method의 결과 constructor |
| `match`/`matchAll`/`replace`/`search`/`split` | String/RegExp protocol |
| `dispose`/`asyncDispose` | explicit resource management protocol |

각 String method는 해당하는 개별 symbol hook을 조회한다. `Symbol.match` 하나가 replace/search/split 전체를 재정의한다고 설명하면 부정확하다. `Symbol.match`는 object를 RegExp로 볼지 판단하는 일부 operation에도 관여한다.

`Symbol.toStringTag`는 표시 문자열을 바꾸므로 신뢰할 수 있는 runtime type check가 아니다. `Symbol.toPrimitive`도 side effect/throw가 가능하므로 암묵적 coercion을 domain validation으로 사용하지 않는다.

## species와 built-in subclass

`Symbol.species`는 일부 built-in subclass method가 결과를 만들 constructor를 선택하게 한다. 유연하지만 cross-realm, arbitrary constructor execution, 최적화와 예상 타입을 복잡하게 만든다. collection behavior를 바꾸려는 목적이라면 built-in subclass와 species override보다 composition/factory를 먼저 검토한다.

## TypeScript/NestJS 적용

- TypeScript의 `unique symbol`로 symbol identity를 type level에서 구분할 수 있다.
- framework metadata key에 Symbol을 써도 외부 code가 reference를 얻으면 접근 가능하다.
- SQL/HTML/log template tag는 parameterization, escaping과 secret redaction을 각각 구현한다.
- object를 JSON/DB row로 보낼 때 symbol-keyed state가 조용히 빠지는 것을 고려한다.
- custom iterator/disposable protocol은 resource owner와 failure propagation을 함께 정의한다.

## 출처

- [ECMAScript Language Specification, template literals](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-template-literals)
- [ECMAScript Language Specification, Symbol objects](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-objects)
- [ECMAScript Language Specification, well-known symbols](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-well-known-symbols)
- template: [literal](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30772), [tagged template](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30773), [String.raw](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30774)
- Symbol 기본: [primitive/wrapper](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30800), [Symbol 함수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30801), [property/직렬화](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30802)
- protocol hook: [well-known symbols](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30804), [toStringTag](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30805), [isConcatSpreadable](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30806), [species](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30807), [species override](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30808), [toPrimitive](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30809), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30810), [generator iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30811), [match](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30812)
- registry/introspection: [for/keyFor](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30814), [description/getOwnPropertySymbols](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30815)

## 관련 문서

- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JavaScript-Proxy-and-Reflect|Proxy와 Reflect]]
- [[Object-Property-Descriptor|property descriptor]]
- [[Security-Headers#정적 검사 + SQL Injection은 별개|SQL injection 방어 경계]]
