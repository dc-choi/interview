---
tags: [cs, javascript, number, unicode, string, regexp]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Numbers Strings RegExp", "JavaScript 숫자 문자열 정규표현식"]
---

# JavaScript 숫자, 문자열과 정규표현식

JavaScript의 `Number`는 IEEE 754 binary64이고 `String`은 UTF-16 code unit sequence다. 화면의 문자, Unicode code point, byte와 정규표현식 index가 같은 단위라고 가정하면 정밀도/길이/검색 오류가 생긴다.

## Number의 정밀도

```ts
0.1 + 0.2 !== 0.3;
Number.isSafeInteger(9_007_199_254_740_991); // true
```

- `Number`는 integer/real 값을 같은 binary64 형식으로 나타낸다. `BigInt`는 별도 numeric type이므로 모든 JavaScript 숫자가 binary64라는 표현은 부정확하다.
- 안전 정수 범위 밖에서는 서로 다른 정수가 같은 Number로 반올림될 수 있다.
- `Number.isNaN`/`isFinite`는 인자를 number로 강제 변환하지 않지만 global `isNaN`/`isFinite`는 변환한다.
- `Number.isInteger`는 수학적 출처가 아니라 현재 binary64 값에 소수 부분이 있는지를 본다.
- `Object.is(NaN, NaN)`은 true이고 `Object.is(+0, -0)`은 false다. `===`와 의도적으로 다르다.

`Number.EPSILON`은 1 근처에서 1과 다음 표현 가능 수의 간격이다. 모든 크기의 계산에 고정 절대 오차로 쓰지 않는다.

```ts
const nearlyEqual = (a: number, b: number) =>
  Math.abs(a - b) <= Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
```

이 식도 domain 허용 오차를 대신하지 않는다. 금액은 최소 화폐 단위 integer 또는 검증된 decimal library를, 과학 계산은 규모에 맞춘 absolute/relative tolerance를 사용한다.

`Math.trunc`, `hypot`, `imul`, `fround`, logarithm/hyperbolic 함수는 각각 conversion/정밀도 계약이 다르다. 성능이나 C/C++ 호환을 이름만으로 추정하지 말고 입력 범위와 결과를 확인한다.

## 변환, wrapper와 숫자 표시

`Number(value)`는 Number primitive로 변환하고 `new Number(value)`는 wrapper object를 만든다. wrapper는 내부 값이 0이나 `false`여도 object 자체가 truthy이므로 일반 application 값으로 만들지 않는다. `String`/`Boolean` wrapper도 같은 함정이 있다.

- `parseInt(text, radix)`는 문자열 앞부분을 정수로 해석한다. radix를 명시하고 전체 문자열 검증이 필요하면 별도 grammar/schema를 사용한다.
- `parseFloat`도 해석 가능한 prefix 뒤를 무시할 수 있다. strict numeric input에 그대로 쓰지 않는다.
- `toString(radix)`, `toExponential`, `toFixed`는 문자열을 반환한다. 표시용 rounding과 회계 계산을 섞지 않는다.
- `toLocaleString(locale, options)`은 국제화 표시 API다. machine-readable serialization이나 DB key로 쓰지 않는다.
- Number 상수는 표현 범위를 설명하지만 `MIN_VALUE`는 가장 작은 양의 Number이지 가장 작은 음수가 아니다.

`Math.floor`/`ceil`/`round`/`trunc`는 음수에서 서로 다른 결과를 낸다. `Math.random()`은 simulation/UI 용도의 의사 난수이며 token, password, nonce에는 Web Crypto/Node `crypto`의 CSPRNG를 쓴다.

## UTF-16, code point와 grapheme

JavaScript string의 `length`와 index는 UTF-16 code unit 기준이다. 보조 평면 문자는 surrogate pair 두 단위를 차지할 수 있고 사용자에게 한 글자로 보이는 grapheme cluster는 여러 code point로 구성될 수 있다.

```ts
const text = "😀";
text.length; // 2 code units
[...text].length; // 1 code point
```

- `codePointAt`/`fromCodePoint`는 code point를 다룬다.
- `for...of`와 string iterator는 code point 단위로 전진하지만 grapheme 단위는 아니다.
- 사용자 표시 단위 분할에는 `Intl.Segmenter` 같은 grapheme-aware API를 검토한다.
- `normalize("NFC")`는 canonically equivalent한 표현을 통일한다. NFKC/NFKD는 compatibility character를 바꿀 수 있으므로 일반 기본값으로 단정하지 않는다.
- normalization만으로 confusable, spoofing이나 identifier security가 해결되지는 않는다.

`startsWith`, `endsWith`, `includes`, `repeat`, `padStart`/`padEnd`, `trimStart`/`trimEnd`는 편리하지만 index/length는 여전히 code unit 기준이다. padding은 화면 폭 정렬을 보장하지 않고 trim은 명세의 whitespace 집합만 제거한다.

## 문자열 API 선택

- `String(value)`는 primitive 문자열 변환이고 `new String(value)`는 피한다.
- `charAt(index)`는 범위 밖에서 빈 문자열을 반환하고 bracket access는 보통 `undefined`를 반환한다.
- `indexOf`/`lastIndexOf`는 code unit index를 반환한다. locale-aware 검색이나 grapheme 경계를 제공하지 않는다.
- `slice`는 음수 index를 지원하고 시작/끝의 순서를 바꾸지 않는다. `substring`은 음수를 0처럼 처리하고 두 index 순서를 바꿀 수 있다. `substr`은 legacy 기능이므로 새 코드에서 사용하지 않는다.
- `concat`보다 `+`나 template literal이 읽기 쉬운 경우가 많다. case conversion은 locale/언어 규칙과 identifier 보안 요구를 별도로 확인한다.
- `match`, `replace`, `search`, `split`의 동작은 인자로 전달한 RegExp의 flag와 protocol method에 따라 달라진다.

Boolean conversion에서는 `undefined`, `null`, `false`, `+0`, `-0`, `0n`, `NaN`, 빈 문자열이 falsy이고 object는 모두 truthy다. 빈 배열, 빈 object와 `new Boolean(false)`도 truthy다.

## 정규표현식 state

`g` 또는 `y` flag를 가진 RegExp의 `exec`/`test`는 `lastIndex`를 읽고 갱신한다. 같은 instance를 여러 요청이나 비동기 흐름에서 공유하면 결과가 호출 순서에 의존할 수 있다.

- `g`는 `lastIndex` 이후에서 다음 match를 탐색한다.
- `y`는 정확히 `lastIndex` 위치에서만 match하는 sticky 동작이다.
- 실패하면 stateful regexp의 `lastIndex`가 0으로 reset될 수 있다.
- `u`/`v`는 Unicode-aware pattern 의미를 제공하고 `s`는 dot이 line terminator도 match하게 한다.
- `d`는 match indices를 요청한다. 지원 runtime과 필요한 semantics를 함께 확인한다.

외부 입력으로 pattern을 직접 만들지 않고 catastrophic backtracking 가능성을 제한한다. validation regex가 Unicode normalization, 길이 제한과 domain parser를 대체하지 않게 한다.

## 백엔드 적용

- monetary amount를 Number 부동소수점 누적으로 계산하지 않는다.
- pagination ID/DB bigint를 Number로 강제 변환하지 말고 string/BigInt/driver mapping을 명시한다.
- 문자열의 API 길이 제한이 byte, code unit, code point, grapheme 중 무엇인지 contract로 정한다.
- stateful RegExp instance를 singleton NestJS provider의 mutable field로 공유하지 않는다.
- database collation/normalization과 application 비교 규칙을 함께 검증한다.

## 출처

- [ECMAScript Language Specification, Number objects](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number-objects)
- [ECMAScript Language Specification, String objects](https://tc39.es/ecma262/multipage/text-processing.html#sec-string-objects)
- [ECMAScript Language Specification, RegExp objects](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexp-regular-expression-objects)
- Number: [binary64/상수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30753), [EPSILON/진수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30754), [검사 함수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30755)
- String: [Unicode/UTF-16](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30757), [code point/normalize](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30758), [검색/반복](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30759), [padding/trim](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30760)
- [Math 함수](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30785)
- RegExp: [lastIndex](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30787), [sticky flag](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30788), [Unicode/dotAll](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=30789)
- Number 기초: [개요/API](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24629), [변환/상수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24630), [new/instance](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24631), [Number wrapper](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24632), [primitive/valueOf](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24633), [toString/toLocaleString](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24634), [지수/고정 소수점](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24635)
- String 기초: [개요/연결](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24637), [변환/wrapper](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24638), [length/boxing](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24639), [trim/chaining](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24640), [prototype lookup](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24641), [index/search](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24642), [연결/case](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24643), [substring/slice](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24644), [RegExp 연동](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24645), [문자 코드/localeCompare](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24646)
- [Boolean 변환](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24691), [Math API와 난수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24712)

## 관련 문서

- [[JS-Value-vs-Reference|JavaScript 값과 참조]]
- [[JavaScript-Binary-Data-and-Workers|JavaScript 바이너리 데이터]]
- [[SQL-Tuning-Terminology|DB 문자/byte 단위]]
- [[Password-Hashing|문자열과 인증 보안]]
