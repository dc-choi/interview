---
tags: [cs, javascript, number, unicode, string, regexp]
status: done
verified_at: 2026-09-25
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

primitive에서 property나 method를 읽으면 명세상 `ToObject`로 만든 wrapper를 거쳐 조회하므로 `"abc".slice(1)`이 동작한다. 이 wrapper는 코드에서 참조할 수 없고 engine은 실제 객체 생성을 생략할 수 있다. 쓰기도 같은 경로를 거치지만 primitive에 남는 결과는 없다.

```js
"use strict";
const text = "abc";
text[0] = "x"; // TypeError: string index property는 writable이 false다
text.meta = 1; // TypeError: primitive에는 property를 만들 수 없다
```

sloppy code에서는 두 대입이 오류 없이 무시되고 `text`는 `"abc"`로 남는다. 문자열을 바꾸려면 `slice`, `replace`, template literal로 새 문자열을 만든다.

- `parseInt(text, radix)`는 첫 인자를 문자열로 바꾼 뒤 앞부분을 정수로 해석한다. radix를 생략하거나 0이면 10진수로 보되, 앞 공백과 부호를 뺀 문자열이 `0x`/`0X`로 시작하면 16진수로 읽어 `parseInt("0x1A")`는 26이다. `parseInt(0.0000001)`은 `"1e-7"`의 앞부분만 읽어 1이 된다. radix를 명시하고, 소수 버림에는 `Math.trunc`를 쓰며, 전체 문자열 검증이 필요하면 별도 grammar/schema를 사용한다.
- `parseFloat`도 해석 가능한 prefix 뒤를 무시할 수 있다. strict numeric input에 그대로 쓰지 않는다.
- `toString(radix)`, `toExponential`, `toFixed`는 문자열을 반환한다. 표시용 rounding과 회계 계산을 섞지 않는다.
- `toFixed(digits)`는 소스에 적은 십진 소수가 아니라 binary64로 저장된 값을 기준으로 가장 가까운 자릿수를 고르고, 정확히 중간이면 절댓값이 큰 쪽을 택한다. 저장값이 조금 작은 `(2.55).toFixed(1)`은 `"2.5"`, `(1.005).toFixed(2)`는 `"1.00"`이고 `(-2.5).toFixed(0)`은 `"-3"`이다. 십진 반올림이 업무 규칙이면 위 금액 표현 원칙을 따른다.
- `toLocaleString(locale, options)`은 국제화 표시 API다. machine-readable serialization이나 DB key로 쓰지 않는다. 일반 숫자의 소수 자릿수는 기본 최대 3자리로 반올림되어 천 단위 구분만 기대한 `(1234.5678).toLocaleString("ko-KR")`도 `"1,234.568"`이 되므로 `minimumFractionDigits`/`maximumFractionDigits`를 명시한다. 같은 locale과 옵션으로 반복 포맷하면 `Intl.NumberFormat` 인스턴스를 만들어 `format()`을 재사용한다.
- Number 상수는 표현 범위를 설명하지만 `MIN_VALUE`는 가장 작은 양의 Number이지 가장 작은 음수가 아니다.

`Math.floor`/`ceil`/`round`/`trunc`는 음수에서 서로 다른 결과를 낸다. `Math.floor(-1.2)`는 -2, `Math.trunc(-1.2)`는 -1이다. `Math.round`는 소수부가 정확히 0.5이면 +∞ 방향을 택해 `Math.round(2.5)`는 3, `Math.round(-2.5)`는 -2이므로 0에서 먼 쪽을 택하는 다른 언어의 round나 `toFixed`와 음수에서 결과가 다르다. `Math.max()`와 `Math.min()`은 인자가 없으면 각각 `-Infinity`, `Infinity`를 반환해 빈 배열을 펼친 `Math.max(...values)`는 오류 없이 `-Infinity`가 되고 `JSON.stringify`에서는 `null`로 바뀐다. 빈 목록을 먼저 분기하고, 큰 배열의 spread 한계는 [[JavaScript-Function-Objects-and-Calls-Parameters#parameter 목록|argument 개수 한계]]를 따른다. `Math.random()`은 simulation/UI 용도의 의사 난수이며 token, password, nonce에는 Web Crypto/Node `crypto`의 CSPRNG를 쓴다.

## UTF-16, code point와 grapheme

JavaScript string의 `length`와 index는 UTF-16 code unit 기준이다. 보조 평면 문자는 surrogate pair 두 단위를 차지할 수 있고 사용자에게 한 글자로 보이는 grapheme cluster는 여러 code point로 구성될 수 있다.

```ts
const text = "😀";
text.length; // 2 code units
[...text].length; // 1 code point
```

- `codePointAt`/`fromCodePoint`는 code point를 다룬다.
- `for...of`와 string iterator는 code point 단위로 전진하지만 grapheme 단위는 아니다.
- `split("")`은 UTF-16 code unit 단위로 나눠 surrogate pair를 깨뜨린다. `"😀".split("")`은 원소 2개를 만들므로 code point 배열은 `[...text]`로 만든다.
- 사용자 표시 단위 분할에는 `Intl.Segmenter` 같은 grapheme-aware API를 검토한다.
- `normalize("NFC")`는 canonically equivalent한 표현을 통일한다. NFKC/NFKD는 compatibility character를 바꿀 수 있으므로 일반 기본값으로 단정하지 않는다.
- normalization만으로 confusable, spoofing이나 identifier security가 해결되지는 않는다.

`startsWith`, `endsWith`, `includes`, `repeat`, `padStart`/`padEnd`, `trimStart`/`trimEnd`는 편리하지만 index/length는 여전히 code unit 기준이다. padding은 화면 폭 정렬을 보장하지 않고 trim은 명세의 whitespace 집합만 제거한다. `startsWith(search, position)`의 두 번째 인자는 검색 문자열이 시작할 index이고 `endsWith(search, endPosition)`의 두 번째 인자는 검색 문자열이 끝나는 위치(마지막 문자 index + 1)라 `"Hello".endsWith("l", 4)`는 `"Hell"`을 기준으로 true다. `startsWith`, `endsWith`, `includes`는 RegExp 인자를 받으면 `TypeError`를 던지므로 pattern 검색에는 `RegExp.prototype.test`나 `search`를 쓴다.

## 문자열 API 선택

- `String(value)`는 primitive 문자열 변환이고 `new String(value)`는 피한다.
- `charAt(index)`는 범위 밖에서 빈 문자열을 반환하고 bracket access는 보통 `undefined`를 반환한다.
- `indexOf`/`lastIndexOf`는 code unit index를 반환한다. locale-aware 검색이나 grapheme 경계를 제공하지 않는다.
- `slice`는 음수 index를 지원하고 시작/끝의 순서를 바꾸지 않는다. `substring`은 음수를 0처럼 처리하고 두 index 순서를 바꿀 수 있다. `substr`은 legacy 기능이므로 새 코드에서 사용하지 않는다.
- `concat`보다 `+`나 template literal이 읽기 쉬운 경우가 많다. case conversion은 locale/언어 규칙과 identifier 보안 요구를 별도로 확인한다.
- `match`, `replace`, `search`, `split`의 동작은 인자로 전달한 RegExp의 flag와 protocol method에 따라 달라진다.
- `replace`에 문자열 pattern을 넘기면 첫 번째 일치만 바꾼다. 전체 치환에는 `replaceAll`을 쓰며 `g` flag 없는 RegExp를 넘기면 `TypeError`다. 외부 입력으로 `new RegExp(input, "g")`를 만들면 특수 문자가 pattern으로 해석되므로 문자열 그대로 `replaceAll`에 넘긴다.
- replacement 문자열의 `$&`, `$$`, `` $` ``, `$'`는 특수 pattern이다(`$n`, `$<name>`은 RegExp pattern일 때만). 외부 입력을 치환 값으로 넣을 때는 반환값에 특수 pattern이 적용되지 않는 replacement 함수를 쓴다. 함수는 `(match, p1, ..., pN, offset, string, groups)`를 받아 일치마다 다른 값을 만들 수 있다.

```ts
const userInput = "$&!";
"Hello, NAME".replace("NAME", userInput); // "Hello, NAME!"
"Hello, NAME".replace("NAME", () => userInput); // "Hello, $&!"
"createdAt".replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`); // "created_at"
```

Boolean conversion에서는 `undefined`, `null`, `false`, `+0`, `-0`, `0n`, `NaN`, 빈 문자열이 falsy이고 object는 모두 truthy다. 빈 배열, 빈 object와 `new Boolean(false)`도 truthy다.

## 정규표현식 state

`g` 또는 `y` flag를 가진 RegExp의 `exec`/`test`는 `lastIndex`를 읽고 갱신한다. 같은 instance를 여러 요청이나 비동기 흐름에서 공유하면 결과가 호출 순서에 의존할 수 있다.

- `g`는 `lastIndex` 이후에서 다음 match를 탐색한다.
- `y`는 정확히 `lastIndex` 위치에서만 match하는 sticky 동작이다.
- 실패하면 stateful regexp의 `lastIndex`가 0으로 reset될 수 있다.
- `u`/`v`는 Unicode-aware pattern 의미를 제공하고 `s`는 dot이 line terminator도 match하게 한다.
- `d`는 match indices를 요청한다. 지원 runtime과 필요한 semantics를 함께 확인한다.
- `i`는 대소문자를 구분하지 않는다. `m`은 다음 줄까지 검색하게 하는 flag가 아니라 `^`와 `$`가 문자열 전체의 양끝뿐 아니라 각 줄의 시작과 끝에도 match하게 바꾸므로, pattern에 `^`/`$`가 없으면 결과가 달라지지 않는다.

입력 전체를 검증하는 pattern은 `^`와 `$`로 양끝을 고정한다. 앵커가 없으면 `/\d{3}-\d{4}-\d{4}/.test("010-1234-56789")`처럼 일부만 맞아도 true이고, 검증 pattern에 `m`을 붙이면 `/^\d+$/m.test("abc\n123")`처럼 한 줄만 맞아도 통과한다.

`\d`는 `[0-9]`, `\w`는 `[A-Za-z0-9_]`인 ASCII 집합이라 `u` flag를 붙여도 한글이나 다른 문자 체계의 숫자를 포함하지 않는다(`i`와 함께 `u`나 `v`를 쓰면 `\w`에 case folding으로 U+017F, U+212A 같은 문자가 더해진다). 완성형 한글 음절은 `[가-힣]`(U+AC00부터 U+D7A3)으로 거를 수 있지만 `ㄱ`, `ㅏ` 같은 호환 자모(U+3131부터)는 범위 밖이고 NFD로 분해된 한글도 맞지 않으므로 먼저 `normalize("NFC")`를 적용한다. 자모까지 허용하려면 `u` flag와 `\p{Script=Hangul}`을 검토한다.

외부 입력으로 pattern을 직접 만들지 않고 catastrophic backtracking 가능성을 제한한다. 검색어처럼 사용자 입력을 literal로 찾아야 하면 `new RegExp(RegExp.escape(keyword), "i")`처럼 escape한 뒤 넣고, `replaceAll`로 backslash를 붙이는 escape를 직접 구현하지 않는다. `RegExp.escape`는 ES2025에 포함됐고 Node.js는 V8 13.6을 탑재한 24.0.0부터 제공하므로 더 낮은 runtime에서는 지원 여부를 확인한다. validation regex가 Unicode normalization, 길이 제한과 domain parser를 대체하지 않게 한다.

이메일 형식은 RFC 5322 전체를 흉내 낸 긴 정규표현식보다 HTML `input type="email"`의 valid email address 정의를 기준으로 삼는 편이 실용적이다. 이 정의는 RFC 5322가 `@` 앞은 너무 엄격하고 뒤는 너무 모호하며 comment, 공백, quoted string을 허용할 만큼 느슨하다는 이유로 의도적으로 따르지 않고, 같은 정의의 JavaScript 호환 정규표현식을 함께 제공한다. 이 정규표현식은 ASCII 주소만 받으므로 국제화 도메인은 punycode로 바꿔 검사하고, 비ASCII local part를 받아야 하면 별도 정책을 둔다. 형식 검사는 수신 가능 여부를 확인하지 않으므로 소유 확인이 필요하면 확인 메일 같은 별도 절차를 둔다.

## 백엔드 적용

- monetary amount를 Number 부동소수점 누적으로 계산하지 않는다.
- pagination ID/DB bigint를 Number로 강제 변환하지 말고 string/BigInt/driver mapping을 명시한다.
- 문자열의 API 길이 제한이 byte, code unit, code point, grapheme 중 무엇인지 contract로 정한다.
- stateful RegExp instance를 singleton NestJS provider의 mutable field로 공유하지 않는다.
- database collation/normalization과 application 비교 규칙을 함께 검증한다.

## 표현 정밀도와 입력 문법

binary64는 sign 1bit, exponent 11bit, fraction 52bit다. 정규화된 수는 숨은 선행 1을 합쳐 53bit 정밀도를 가져 연속 정수를 구별할 수 있는 안전 범위가 ±(2^53-1)이다. 2^53도 표현할 수 있지만 그 다음 정수는 구별하지 못하므로 최대 표현 정수와 안전 정수는 다르다. engine의 실제 저장 표현을 모든 Number가 항상 heap 8byte라는 주장으로 확대하지 않는다.

literal의 진법은 0x/0o/0b prefix로 명시한다. legacy 앞자리 0은 sloppy code에서 8진수/10진수 의미가 갈리고 strict에서는 SyntaxError다. `20.toString()`은 첫 점이 numeric literal에 포함되는 문법 문제이므로 `(20).toString()`을 쓴다. Number 문자열 변환은 전체 형식을 읽어 `Number('12px')`는 NaN, parseInt는 12다. unsigned 0x/0o/0b 문자열은 가능하지만 prefix 앞 부호나 numeric separator '_'가 들어간 문자열은 Number 문법과 다르다.

분모 0에 EPSILON을 더하면 정의되지 않은 비율을 임의 숫자로 바꾼다. (EPSILON/EPSILON)은 1이므로 평균/전환율의 정상값처럼 숨길 수 있다. 0분모는 업무 규칙대로 부재/오류를 처리한다. 10의 거듭제곱 보정도 `1.005 * 100`이 100.49999999999999인 것처럼 근사값을 정확한 정수로 복구하지 못한다. decimal 문자열에서 정수 minor unit을 만드는 parsing과 binary64 값을 사후 확대하는 것을 구분한다.

## 문자열 단위와 검색 결과

Unicode code space는 U+0000부터 U+10FFFF까지 17개 plane이고 BMP는 첫 plane이다. JS의 `\x31`은 2자리 byte escape, `\u0031`은 4자리 code unit, `\u{1F600}`은 code point escape다. 보조 평면 문자는 두 `\u` escape의 surrogate pair로도 표현한다. Unicode scalar value는 surrogate code point를 제외한다.

charCodeAt은 code unit을 반환하며 범위 밖은 NaN, codePointAt은 code unit index에서 시작해 pair면 결합한 code point를 반환하며 범위 밖은 undefined다. pair의 두 번째 위치를 주면 low surrogate 값만 얻는다. fromCharCode는 입력을 16bit로 변환하므로 code point 전체 복원에는 fromCodePoint를 쓴다. fromCodePoint는 정수가 아니거나 0~0x10FFFF 밖이면 RangeError다. 문자열 length와 UTF-8 byte 길이는 별개다.

padStart/padEnd는 길이가 이미 크면 자르지 않으며 pad string 생략은 공백, 빈 문자열은 변화 없음이다. code unit 기준 반복/잘림이라 emoji가 깨질 수 있고 화면 폭을 보장하지 않는다. 고정 최대 길이는 별도로 검증한다.

match는 일반 mode에서 첫 일치와 capture, g mode에서 일치 문자열 목록을 반환하며 부재는 null이다. search는 index/-1이고 문자열 인자도 RegExp pattern으로 해석할 수 있어 literal 검색에는 indexOf/includes를 쓴다. split limit은 결과 개수 상한이고 분리 뒤 원본 전체를 보존한다는 보장이 아니다. 관계 비교는 UTF-16 code unit 순서, localeCompare는 locale collation이며 반환값은 부호만 사용하고 ±1로 고정하지 않는다. 반복 locale 정렬에는 Intl.Collator를 재사용한다.

`/^.$/`는 emoji surrogate pair에 false, u mode는 true지만 grapheme 하나를 뜻하지 않는다. s는 dot의 줄바꿈 포함 여부를 바꾸고 Unicode 단위를 바꾸지 않는다. g/y의 lastIndex 공유 위험은 앞 절을 따른다. wrapper 두 개는 내부 primitive 값이 같아도 identity가 달라 ===는 false이며 실제 값은 valueOf로 얻는다.

문자열의 명세 상한 2^53-1 code unit은 실용 allocation 한도가 아니다. Node.js에서는 node:buffer의 constants.MAX_STRING_LENGTH로 engine 한도를 확인한다. 큰 JSON/string 병합은 최종 문자열과 중간값이 함께 남아 그보다 먼저 메모리가 부족할 수 있으므로 입력 상한, chunk/stream 처리와 byte/code unit 구분을 둔다.

큰 정수의 입력, 연산과 JSON 경계는 [[JavaScript-BigInt|BigInt]], `matchAll`, capture 위치와 Unicode 집합은 [[JavaScript-RegExp-Unicode-and-Matches|정규표현식의 Unicode와 매치 위치]]에서 다룬다. `trimLeft`/`trimRight`는 `trimStart`/`trimEnd`의 alias이며 문자 쓰기 방향에 따라 의미가 바뀌지 않는다. 문자열의 `at(-1)`도 UTF-16 code unit 하나를 반환하므로 emoji 전체를 보장하지 않는다.

## 출처

- [Numeric separators — V8](https://v8.dev/features/numeric-separators)
- [String.prototype.replaceAll — V8](https://v8.dev/features/string-replaceall)
- [String.prototype.trimStart and trimEnd — V8](https://v8.dev/features/string-trimming)

- 인프런 보충 강의: [3. 용어 사용 기준: 오브젝트, 인스턴스, 프로퍼티, 함수, 뉘앙스 고려](https://www.inflearn.com/courses/lecture?courseId=324642&unitId=35015)
- 인프런 보충 강의: [4. 숫자로 변환](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24597), [6. 단항 연산자](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24599), [9. 관계 연산자](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24602), [5. 산술 연산자(-, *, /, % 연산자)](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24598), [6. 정수, 실수, 숫자 처리](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24578), [7. 상수, 진수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24579), [8. 유니코드, UTF](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24601), [9. Number 타입, String 타입](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24583)

- [Node.js, MAX_STRING_LENGTH](https://nodejs.org/api/buffer.html#bufferconstantsmax_string_length)

- [ECMAScript Language Specification, Number objects](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number-objects)
- [ECMAScript Language Specification, String objects](https://tc39.es/ecma262/multipage/text-processing.html#sec-string-objects)
- [ECMAScript Language Specification, RegExp objects](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexp-regular-expression-objects)
- [ECMAScript Language Specification, parseInt](https://tc39.es/ecma262/multipage/global-object.html#sec-parseint-string-radix)
- [ECMAScript Language Specification, GetValue](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-getvalue)
- [ECMAScript Language Specification, PutValue](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-putvalue)
- [ECMAScript Language Specification, StringGetOwnProperty](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-stringgetownproperty)
- [MDN, parseInt()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt)
- [MDN, Strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
- [ECMAScript Language Specification, Number.prototype.toFixed](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.prototype.tofixed), [Math.round](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round), [Math.max](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.max)
- [MDN, Number.prototype.toFixed()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed), [Number.prototype.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString), [Intl.NumberFormat() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat), [Math.round()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round), [Math.max()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max)
- [MDN, String.prototype.split()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split), [String.prototype.endsWith()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith), [String.prototype.replace()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace), [String.prototype.replaceAll()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll)
- [MDN, RegExp.prototype.multiline](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/multiline), [Character class escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Character_class_escape), [Unicode character class escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape), [RegExp.escape()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape)
- [Unicode, Blocks.txt](https://www.unicode.org/Public/UCD/latest/ucd/Blocks.txt), [UnicodeData.txt](https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt)
- [ECMAScript Language Specification, WordCharacters](https://tc39.es/ecma262/multipage/text-processing.html#sec-wordcharacters)
- [HTML Living Standard, Valid email address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)
- [Node.js 24.0.0 (Current) — Node.js Blog](https://nodejs.org/en/blog/release/v24.0.0)
- [Finished Proposals — TC39](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [모던 자바스크립트 딥다이브 스터디 #1-3 (CH8, 9) — FE재남](https://www.youtube.com/watch?v=JFJiz7cOF78)
- [모던 자바스크립트 딥다이브 스터디 #2-1 (CH10, 11) — FE재남](https://www.youtube.com/watch?v=5b5km0pHoIs)
- [모던 자바스크립트 딥다이브 스터디 #7-1 (CH 28 - 31) — FE재남](https://www.youtube.com/watch?v=fVj5q2IaeAY)
- [모던 자바스크립트 딥다이브 스터디 #7-2 (CH 32 - 33) — FE재남](https://www.youtube.com/watch?v=poVRjQyhkM0)
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
