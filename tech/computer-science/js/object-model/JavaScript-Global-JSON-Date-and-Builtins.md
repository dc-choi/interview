---
tags: [cs, javascript, global-object, json, date, built-in]
status: done
verified_at: 2026-09-25
category: "CS - JavaScript"
aliases: ["JavaScript Global JSON Date Builtins", "JavaScript 전역 객체 JSON Date"]
---

# JavaScript global object, JSON과 Date

Built-in은 ECMAScript가 정의하는 값과 object이고 browser/Node.js API는 host가 제공한다. 오래된 Number/String/Object 중심 목록은 학습 출발점일 뿐 현재 built-in 전체 목록이 아니며, global binding과 host global object도 실행 환경별로 구분해야 한다.

## built-in과 Realm

각 Realm은 global object, global environment와 intrinsic object 집합을 가진다. iframe/vm context처럼 한 process 안에도 Realm이 여럿일 수 있어 “프로그램 전체에 global object가 정확히 하나”라고 일반화하지 않는다.

- browser Window context의 global object는 WindowProxy를 통해 노출되고 `window`, `self`, `globalThis` 관계에는 host semantics가 개입한다.
- Node.js의 `globalThis`는 global object에 접근하지만 module scope variable이 자동 global property가 되는 것은 아니다.
- top-level `var`/function, `let`/`const`, classic script, module의 global binding 규칙은 서로 다르다.
- 다른 Realm의 Array는 현재 Realm의 `Array.prototype` chain에 없을 수 있으므로 `Array.isArray` 같은 brand-aware API를 쓴다.

`globalThis`는 여러 환경에서 global object 접근 spelling을 통일하지만 global namespace에 application 상태를 모으라는 뜻은 아니다. dependency injection과 module export로 ownership/lifecycle을 드러낸다.

## global 값과 숫자 parsing

`Infinity`, `NaN`, `undefined`는 global value property다. Shadowing 가능한 identifier와 Number semantics 자체를 구분한다.

- global `isNaN`과 `isFinite`는 먼저 Number conversion을 수행한다. 이미 number인지 검사하려면 `Number.isNaN`/`Number.isFinite`를 사용한다.
- `Object.is(value, NaN)`도 NaN 판별은 가능하지만 `Number.isNaN`이 의도를 더 직접 표현한다.
- `parseInt(text, radix)`와 `parseFloat(text)`는 유효한 prefix까지만 읽을 수 있다. 전체 입력 validation을 대신하지 않는다.
- `Number(text)`는 전체 numeric conversion 규칙을 따르지만 빈 문자열, whitespace, `null` 같은 coercion도 허용하므로 외부 입력 schema가 필요하다.

## URL encoding과 eval

`encodeURI`는 완성된 URI에서 구분자 일부를 보존하고 `encodeURIComponent`는 URI component를 더 폭넓게 encode한다. 문자열 이어붙이기보다 `URL`과 `URLSearchParams`로 구조를 만들면 query 경계와 중복 key를 명확히 다룰 수 있다.

URI encoding은 HTML escaping, SQL parameterization, JSON serialization과 목적이 다르다. context가 바뀔 때 같은 encoding을 재사용하지 않는다.

`eval`은 문자열을 JavaScript source로 parse/execute한다. direct eval과 indirect eval은 scope 의미도 다르며 injection, CSP, static analysis와 optimization을 해친다. JSON에는 `JSON.parse`, 동적 dispatch에는 allowlisted strategy map, 표현 언어에는 parser/sandbox를 사용한다. `Function` constructor도 임의 source 실행 위험을 공유한다.

## JSON은 데이터 교환 형식이다

`JSON.stringify`는 JavaScript object의 범용 직렬화나 deep clone이 아니다.

- object property의 `undefined`, Function, Symbol value는 보통 생략되고 array에서는 `null`로 나타날 수 있다.
- `NaN`/Infinity는 JSON number가 아니므로 `null`로 직렬화된다.
- BigInt는 기본적으로 직렬화할 수 없고 cycle은 `TypeError`를 낸다.
- Date는 기본 `toJSON`을 통해 문자열로 바뀌지만 type/timezone 의도가 자동 복원되지는 않는다.
- replacer/space parameter와 object의 `toJSON`이 결과에 관여할 수 있다.
- replacer 배열을 넘기지 않으면 직렬화 대상은 own enumerable string key property뿐이고 값은 property를 읽어 얻는다. object literal의 getter는 own enumerable accessor라 `JSON.stringify`가 getter를 호출해 반환값을 일반 값으로 출력하지만, class getter는 prototype에 non-enumerable로 정의되므로 instance를 직렬화하면 빠진다. replacer 배열을 넘기면 나열한 key를 그대로 읽으므로 class getter도 포함된다. `#private` 필드와 Symbol key는 replacer 배열로도 포함되지 않는다.
- JSON text에는 prototype 정보가 없어 `JSON.parse` 결과는 class method와 `instanceof` 관계가 없는 일반 object다. domain object가 필요하면 parse 뒤 명시적 mapper로 다시 만들고, NestJS 응답에서 계산 속성을 노출하는 방법은 [[NestJS-Serialization|NestJS 응답 직렬화]]를 본다.

`JSON.parse`는 JSON grammar 전체가 맞아야 하며 실패하면 `SyntaxError`다. 외부 입력은 `try/catch`만이 아니라 size limit와 schema validation을 거친다. reviver는 child부터 parent 순서로 value를 변환하고 property를 삭제할 수도 있다. `__proto__` 같은 key가 포함된 parsed object를 다른 object에 무검증 merge하지 않는다.

## Date의 시간 모델

Date는 UTC 1970-01-01T00:00:00Z 기준 millisecond time value를 저장하고 getter/formatter가 local 또는 UTC 관점을 제공한다.

- numeric constructor/getter의 month는 0부터 시작한다. 표시 월과 그대로 섞지 않는다.
- 날짜 문자열 parsing은 명세가 보장하는 형식과 implementation-dependent 형식을 구분한다. API에는 timezone/offset이 포함된 ISO 8601 기반 contract를 우선한다.
- `Date.now()`는 wall-clock millisecond다. NTP/사용자 설정으로 바뀔 수 있어 duration 측정에는 monotonic clock인 `performance.now()`/Node `performance`를 검토한다.
- DST가 있는 local time에서 “하루”와 24시간은 다를 수 있다. calendar arithmetic과 elapsed duration을 구분한다.
- client clock을 결제 만료, 인증 또는 감사의 신뢰 기준으로 쓰지 않는다. 서버/DB의 authoritative time과 clock skew 정책을 둔다.
- Date 객체에는 timezone이 저장되지 않는다. local getter와 `toString()`은 실행 host의 timezone으로 time value를 해석하므로 같은 값도 서버 설정에 따라 다른 날짜가 된다. Node.js는 `TZ` 환경 변수로 이 기준을 정하고([[Deterministic-Test#타임존과 로케일 고정|TZ 고정]]), instance별로 timezone을 바꾸는 setter는 없다.
- `getTimezoneOffset()`은 UTC 시각에서 local 시각을 뺀 분 단위 값이라 KST(UTC+9)에서는 -540으로 offset 표기 `+09:00`과 부호가 반대다. DST나 과거 offset 변경이 있는 timezone에서는 날짜에 따라 값이 달라질 수 있으므로(Asia/Seoul도 1987, 1988년 여름은 -600, 1958년 1월은 -510) offset을 상수로 저장해 날짜 계산에 쓰지 않는다.
- 특정 지역 시각으로 표시할 때는 `toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })`처럼 `timeZone`을 명시하고, 반복 포맷에는 `Intl.DateTimeFormat` 인스턴스를 재사용한다. `toISOString()`은 UTC 기준 `Z` 표기로 직렬화한다.
- timezone을 값에 담아 계산해야 하면 Stage 4에 도달한 Temporal의 `ZonedDateTime`을 검토한다. TC39 finished proposals 기준 게시 예정 연도는 2027이고 MDN 기준 Baseline이 아니므로 대상 runtime 지원을 확인한다.
- `new` 없이 `Date()`를 호출하면 인자를 무시하고 현재 시각을 `new Date().toString()`과 같은 문자열로 반환한다.

## NestJS 적용

- global mutable singleton 대신 provider scope와 explicit dependency로 상태를 관리한다.
- JSON DTO에서 bigint/date/decimal mapping을 명시하고 OpenAPI schema와 runtime validation을 맞춘다.
- query string은 `URLSearchParams` 또는 framework parser를 거친 뒤 allowlist/schema로 검증한다.
- DB timestamp의 timezone, precision과 serialization format을 API contract에 포함한다.

## 출처

- [ECMAScript Language Specification, global object](https://tc39.es/ecma262/multipage/global-object.html), [JSON](https://tc39.es/ecma262/multipage/structured-data.html#sec-json-object), [Date](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-objects)
- [ECMAScript Language Specification, SerializeJSONObject](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonobject), [SerializeJSONProperty](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty), [Date constructor](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-constructor), [Date.prototype.getTimezoneOffset](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.gettimezoneoffset)
- [MDN, JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), [get](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get), [Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [MDN, Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), [Date.prototype.getTimezoneOffset()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset), [Date.prototype.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString), [Intl.DateTimeFormat() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat), [Date() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date)
- [MDN, Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal), [Temporal.ZonedDateTime](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime)
- [Finished Proposals — TC39](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [Node.js, Command-line API: TZ](https://nodejs.org/api/cli.html#tz)
- [모던 자바스크립트 딥다이브 스터디 #7-1 (CH 28 - 31) — FE재남](https://www.youtube.com/watch?v=fVj5q2IaeAY)
- [모던 자바스크립트 딥다이브 스터디 #10-2 (CH 41 , 43) — FE재남](https://www.youtube.com/watch?v=8_2kse0fgMk)
- Built-in: [개요/분류](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24626), [기초 object 목록](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24627)
- Global: [개요](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24663), [값/API](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24664), [Window 관계](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24665), [parseInt/parseFloat](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24666), [NaN/finite](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24667), [URI encoding](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24668), [eval](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24669)
- JSON: [stringify](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24706), [parse/reviver](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24707)
- Date: [time value/문자열](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24709), [생성/API](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24710)

## 관련 문서

- [[JavaScript-Numbers-Strings-and-Regular-Expressions|숫자와 문자열]]
- [[JavaScript-ES-Modules|ES Modules]]
- [[JavaScript-Binary-Data-and-Workers|structured clone과 binary data]]
- [[Security|Node.js 보안]]
