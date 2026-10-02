---
tags: [cs, javascript, template-literal, symbol, metaprogramming]
status: done
verified_at: 2026-09-27
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

함수와 메서드 참조는 Symbol과 달리 오류 없이 문자열로 변환된다. 함수의 `toString()`은 host가 source를 제공하는 사용자 정의 함수면 정의한 source text를, `bind`한 함수처럼 source text가 없거나 host가 제공하지 않는 함수면 native function 문자열을 반환한다. 따라서 `` `${client.status}` ``처럼 호출 괄호를 빠뜨리면 반환값 대신 메서드 source나 native function 문자열이 삽입된다. TypeScript는 `--strict`에서도 이를 오류로 보고하지 않는다(5.9.3, 6.0.3, 7.0.2에서 확인). typescript-eslint의 `restrict-template-expressions`는 type information으로 template expression의 타입을 검사해 함수 타입을 보고하고 `recommended-type-checked` 구성에 포함되므로, 이 실수는 lint 단계에서 잡는다. 다만 TypeScript 7.0은 안정된 compiler API를 제공하지 않고(`typescript/unstable/*`에 실험 API만 있다) typescript-eslint 8.70.1(지원 TypeScript `>=4.8.4 <6.1.0`)은 7.0을 감지하면 `typescript-eslint does not support TS 7.0.` 오류로 lint 실행 전체를 중단하므로, 7.0 프로젝트에서는 [[option#TypeScript 7.0 전환|6.0 compiler API alias]]를 함께 둬야 이 규칙이 실행된다.

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

registry는 같은 agent의 realm이 함께 쓰고 key 문자열이 곧 식별 기준이라, 서로 다른 library가 같은 key로 `Symbol.for`를 호출하면 같은 Symbol을 받는다. 공유 object나 built-in prototype에 붙이는 method처럼 충돌을 피하려고 Symbol key를 쓰는 곳에 `Symbol.for("sum")` 같은 흔한 key를 쓰면 문자열 property key와 같은 충돌이 남는다. 공유가 필요 없으면 `Symbol()`로 만든 값을 module에서 export하고, registry가 필요하면 `Symbol.for("my-lib.sum")`처럼 namespace prefix를 붙인다.

Symbol은 암묵적으로 문자열이나 숫자로 변환되지 않는다. `sym + ""`와 `` `${sym}` ``는 ToString 단계에서, `+sym`은 ToNumber 단계에서 `TypeError`를 던진다. `String(sym)`은 Symbol을 따로 처리해 `"Symbol(desc)"` 형태를 반환하고 `sym.toString()`과 `sym.description`도 쓸 수 있지만 `new String(sym)`은 throw한다. Symbol일 수 있는 token이나 property key를 log message에 넣을 때는 `String(value)`로 명시 변환한다.

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
- object를 JSON/DB row로 보낼 때 symbol-keyed state가 조용히 빠지는 것을 고려한다. Symbol 값도 `JSON.stringify`에서 object property면 생략되고 array 원소면 `null`이 된다(`JSON.stringify({ dir: Symbol("up") })`는 `"{}"`). Symbol 값을 `Object.freeze`한 object에 모은 상수 집합은 같은 agent(thread) 안의 비교에만 쓴다. worker `postMessage`와 `structuredClone`은 Symbol 값을 만나면 `DataCloneError`를 던지므로, 이런 structured clone 경로와 API 응답, queue message, DB column처럼 직렬화되는 상태 값에는 `as const` 문자열 값이나 문자열 enum을 쓴다.
- custom iterator/disposable protocol은 resource owner와 failure propagation을 함께 정의한다.

## tag 인자와 protocol 적용 범위

expression이 n개면 tag의 첫 인자는 n+1개 문자열 조각이고 뒤 인자는 평가된 원래 값 n개다. `${a}${b}`처럼 인접하거나 끝에 expression이 있으면 빈 조각도 포함한다. strings.raw는 source escape 조각이며 String.raw는 `{ raw: [...] }` object와 값을 받는 일반 함수 호출도 가능하다. source의 들여쓰기와 줄바꿈은 그대로 데이터가 된다.

species getter의 기본값은 호출 receiver인 constructor이고 subclass에서 `static get [Symbol.species]() { return Array; }`로 결과 type을 바꿀 수 있다. 이 hook은 사용하는 method에만 적용되므로 Map/Set에 getter가 있다는 사실이 모든 결과 생성에서 조회한다는 뜻은 아니다. Array의 최신 복사 method 같은 species를 사용하지 않는 API도 있다.

String match는 인자의 Symbol.match method를 먼저 조회하고, startsWith/endsWith/includes의 RegExp 판별도 Symbol.match 값이 있으면 그 Boolean을 따른다. 실제 RegExp에 Symbol.match=false를 두면 문자열로 변환해 읽을 수 있지만 다른 protocol까지 제거하는 것은 아니다. hook에 callable이 아닌 값을 두면 호출이 필요한 API에서 TypeError가 날 수 있다.

Symbol.unscopables는 sloppy code의 with environment에서 제외할 property 이름을 정한다. strict/ESM의 with는 SyntaxError이므로 새 code에는 쓰지 않는다. 과거 명세의 @@ 표기는 해당 well-known Symbol을 가리키는 설명 관례이며 실제 property 접근은 Symbol.xxx를 쓴다. toStringTag는 표시용이고 type 신뢰 기준이 아니라는 앞 절의 원칙을 유지한다.

## 진단용 문자열과 식별성

사용자 정의 함수의 `Function.prototype.toString()`은 소스가 제공되는 경우 주석과 공백을 포함한 원문 형태를 보존한다. native 함수나 source를 제공하지 않는 함수까지 실행 가능한 원문을 돌려준다는 계약은 아니므로 함수 복원, 보안 검사와 의존성 분석을 여기에 의존하지 않는다. `Symbol().description`은 `undefined`, `Symbol('').description`은 빈 문자열이다. 같은 description은 같은 Symbol identity를 뜻하지 않는다.

## 출처

- [Function.prototype.toString revision — V8](https://v8.dev/features/function-tostring)
- [Symbol.prototype.description — V8](https://v8.dev/features/symbol-description)

- 인프런 보충 강의: [1. Set 오브젝트 개요, new Set(), Set과 Map 비교](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30827)

- [ECMAScript Language Specification, template literals](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-template-literals)
- [ECMAScript Language Specification, Symbol objects](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-objects)
- [ECMAScript Language Specification, well-known symbols](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-well-known-symbols)
- [ECMAScript Language Specification, ToString](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tostring)
- [ECMAScript Language Specification, String constructor](https://tc39.es/ecma262/multipage/text-processing.html#sec-string-constructor-string-value)
- [MDN, Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
- [MDN, Symbol.for()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for)
- [MDN, JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [HTML Living Standard, StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)
- [ECMAScript Language Specification, Symbol.for](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol.for)
- [ECMAScript Language Specification, Function.prototype.toString](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.tostring)
- [MDN, Function.prototype.toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString)
- [typescript-eslint, restrict-template-expressions](https://typescript-eslint.io/rules/restrict-template-expressions/)
- [typescript-eslint, Dependency Versions](https://typescript-eslint.io/users/dependency-versions/)
- [모던 자바스크립트 딥다이브 스터디 #1-3 (CH8, 9) — FE재남](https://www.youtube.com/watch?v=JFJiz7cOF78)
- [모던 자바스크립트 딥다이브 스터디 #7-2 (CH 32 - 33) — FE재남](https://www.youtube.com/watch?v=poVRjQyhkM0)
- [TypeScript로 보는 GoF의 디자인 패턴: 6. Adapter — GIS DEVELOPER](https://www.youtube.com/watch?v=L3fxjPFPvak)
- template: [literal](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30772), [tagged template](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30773), [String.raw](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30774)
- Symbol 기본: [primitive/wrapper](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30800), [Symbol 함수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30801), [property/직렬화](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30802)
- protocol hook: [well-known symbols](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30804), [toStringTag](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30805), [isConcatSpreadable](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30806), [species](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30807), [species override](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30808), [toPrimitive](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30809), [iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30810), [generator iterator](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30811), [match](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30812)
- registry/introspection: [for/keyFor](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30814), [description/getOwnPropertySymbols](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30815)

## 관련 문서

- [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator]]
- [[JavaScript-Proxy-and-Reflect|Proxy와 Reflect]]
- [[Object-Property-Descriptor|property descriptor]]
- [[SQL-Injection|SQL injection 방어 경계]]
