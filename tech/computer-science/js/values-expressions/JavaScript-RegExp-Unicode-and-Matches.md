---
tags: [cs, javascript, regexp, unicode]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
---

# 정규표현식의 Unicode와 매치 위치

정규표현식은 매치 여부뿐 아니라 어떤 단위로 문자를 읽고 원문 어디를 선택했는지도 계약에 포함한다. Unicode mode가 grapheme 단위 문자열 API를 만드는 것은 아니다.

## 전체 매치와 capture를 함께 순회한다

`String.prototype.matchAll`은 각 매치의 capture, `index`, `groups`를 포함한 iterator를 반환한다. RegExp 인자를 주면 `g` flag가 필요하다. `match`의 global 모드처럼 capture를 잃지 않고 순회할 수 있다.

```js
const matches = [...'id=12 id=34'.matchAll(/id=(?<id>\d+)/g)];
const ids = matches.map(({ groups }) => groups.id);
console.log(ids); // ['12', '34']
```

iterator를 배열로 펼치면 전체 결과를 보관한다. 큰 입력은 `for...of`로 소비하고, 결과 수와 입력 크기도 제한한다. 복잡한 패턴의 실행 비용을 iterator가 자동으로 해결하지는 않는다.

## d flag로 원문 구간을 얻는다

`d` flag는 `indices`를 추가한다. 각 구간은 시작 포함, 끝 제외인 `[start, end]`이고 UTF-16 code unit offset이다. `u`나 `v`를 함께 써도 offset이 code point나 화면 글자 수로 바뀌지 않는다. 매치하지 않은 선택적 capture의 위치는 `undefined`다.

```js
const text = '😀:ab';
const match = /:(?<word>ab)/d.exec(text);
const [start, end] = match.indices.groups.word;
console.log([start, end]); // [3, 5]
console.log(text.slice(start, end)); // 'ab'
```

부분 capture를 원문에서 다시 `indexOf`로 찾으면 같은 문자열이 여러 번 나올 때 잘못된 구간을 선택할 수 있다. 구문 강조, 진단 위치와 편집 도구는 capture indices를 그대로 사용한다.

## v flag와 Unicode 집합

`v`는 Unicode 집합 연산과 문자열 속성을 지원한다. `u`와 함께 지정할 수 없으며, 기존 `u` 패턴을 확인 없이 일괄 교체하지 않는다. 문자 클래스 안의 예약 문자와 escaping 규칙도 다르다.

```js
const digit = /^[\p{Decimal_Number}&&\p{ASCII}]+$/v;
digit.test('123'); // true
digit.test('١٢٣'); // false

const emoji = /^\p{RGI_Emoji}$/v;
emoji.test('👨‍👩‍👧‍👦'); // true, 여러 code point인 문자열도 대상이다.
```

- `&&`는 교집합, `--`는 차집합을 만든다. 중첩 집합으로 연산 경계를 표현한다.
- `\q{ab|cd}`처럼 유한한 문자열 집합도 문자 클래스에 넣을 수 있다.
- `\p{RGI_Emoji}` 같은 문자열 속성은 한 code point보다 긴 매치를 만들 수 있다.
- 대소문자 무시 `i`와 complement를 함께 쓸 때 case folding 순서가 `u`와 다를 수 있다. 기존 테스트와 실제 Unicode 입력으로 확인한다.

Unicode property escape가 사람 이름, 비밀번호나 식별자 정책 전체를 검증하는 것은 아니다. normalization, 허용 문자와 길이 단위를 먼저 정하고 필요한 검증만 조합한다.

## 배포와 안전성

구형 런타임은 지원하지 않는 literal flag를 파일 파싱 단계에서 거절할 수 있다. 호환 분기가 필요하면 `new RegExp(pattern, flags)`의 생성 실패를 처리하거나 빌드 단계에서 대상별로 변환한다. 입력 길이 제한과 패턴 복잡도 검토는 flag 지원 여부와 별개다.

## 엔진의 실행 비용과 ReDoS

V8의 2019년 tier-up 설계는 RegExp를 먼저 bytecode로 실행하고 자주 쓰는 패턴을 native code로 컴파일해 시작 비용과 코드 메모리를 줄였다. JS 함수의 Ignition과 같은 bytecode가 아니며, 긴 입력과 일부 replace 경로는 다른 승격 판단을 쓴다. 글의 한 번 실행 뒤 승격이나 성능 배수를 현재의 보편 임계값으로 사용하지 않는다.

Backtracking은 실패한 선택지로 되돌아가며 다른 조합을 시도한다. `(a*)*b`처럼 반복이 중첩된 패턴은 마지막 매치가 실패할 때 탐색량이 급증할 수 있다. Native JIT가 빨라도 이 알고리즘의 최악 복잡도가 자동으로 없어지지 않는다.

2021년 V8의 non-backtracking engine 글은 선형 시간 실행을 지향하는 experimental 대안을 소개했다. 당시 backreference, lookaround, 일부 큰 반복과 flag 조건은 지원 범위에서 제외됐다. `l` flag와 fallback 설정은 표준 JS 계약이나 모든 현재 Node.js 빌드의 활성화 보장이 아니다. 신뢰할 수 없는 패턴/입력은 길이 제한과 패턴 검토, 실행 격리 또는 요구 문법을 지원하는 안전한 엔진을 함께 검토한다.

## 출처

- [Improving V8 regular expressions — V8](https://v8.dev/blog/regexp-tier-up)
- [An additional non-backtracking RegExp engine — V8](https://v8.dev/blog/non-backtracking-regexp)
- [String.prototype.matchAll — V8](https://v8.dev/features/string-matchall)
- [RegExp match indices — V8](https://v8.dev/features/regexp-match-indices)
- [RegExp v flag with set notation and properties of strings — V8](https://v8.dev/features/regexp-v-flag)

## 관련 문서

- [[JavaScript-Numbers-Strings-and-Regular-Expressions|UTF-16과 RegExp 기본 계약]]
- [[JavaScript-Iterator-and-Generator-Protocol|Iterator 소비와 종료]]
