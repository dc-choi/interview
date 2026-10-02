---
tags: [cs, javascript, bigint, precision]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
---

# BigInt와 정수 정밀도

BigInt는 Number의 안전한 정수 범위를 넘는 정수를 표현한다. 소수나 자동으로 정확해지는 금액 타입은 아니다. 외부 ID, 정수 카운터와 바이너리 프로토콜에서 입력, 연산, 저장 경계까지 같은 표현 계약을 유지할 때 유용하다.

## 입력부터 정밀도를 보존한다

Number의 안전한 정수 범위는 `-(2 ** 53 - 1)`부터 `2 ** 53 - 1`까지다. 이 범위를 넘는 모든 값이 즉시 부정확해지는 것은 아니지만, 이웃 정수를 구분한다는 보장을 잃는다.

```js
const id = 9007199254740993n;
const parsed = BigInt('9007199254740993');
const alreadyRounded = BigInt(9007199254740993);
console.log(id === parsed); // true
console.log(alreadyRounded); // 9007199254740992n
```

서버가 JSON number로 보낸 큰 정수를 클라이언트에서 BigInt로 바꿔도 앞서 손실된 비트는 돌아오지 않는다. 큰 ID는 문자열로 전송하는 등 경계 계약부터 정한다. `Number(bigint)`는 범위를 확인한 뒤 명시적으로 사용한다.

## 연산 규칙

- `1n + 2n`처럼 BigInt끼리 계산한다. `1n + 2`처럼 Number와 섞는 산술 연산은 `TypeError`다.
- 나눗셈은 소수 부분을 0 방향으로 버린다. `-7n / 3n`은 `-2n`이다. 0으로 나누면 `RangeError`다.
- `1n === 1`은 false이고 `1n == 1`은 true다. 관계 비교는 허용되지만 이미 부정확한 Number 입력의 정밀도를 복원하지 않는다.
- Boolean 변환에서 `0n`은 false, 나머지 BigInt는 true다.
- unary `+`와 unsigned right shift `>>>`는 지원하지 않는다. `Math` 메서드도 일반적으로 Number를 받으므로 BigInt 전용 계산과 구분한다.

혼합 배열의 정렬 comparator를 `(a, b) => a - b`로 만들면 Number/BigInt 혼합 산술이나 BigInt 반환 때문에 실패한다. 필요한 경우 `a < b ? -1 : a > b ? 1 : 0`처럼 Number comparator 결과를 만든다.

## 크기 제한과 바이너리 경계

일반 BigInt는 64비트에 묶이지 않지만 메모리와 구현 한계는 있다. `BigInt64Array`와 `BigUint64Array`는 원소마다 64비트로 제한한다.

```js
BigInt.asUintN(8, 257n); // 1n
BigInt.asIntN(8, 255n);  // -1n
```

`asIntN`/`asUintN`은 범위를 벗어나면 오류를 내는 검증기가 아니라 해당 비트 폭으로 감싸는 변환이다. 범위 초과를 거절해야 하는 API에서는 변환 전에 상한과 하한을 검사한다. WebAssembly의 `i64` 경계도 [[WebAssembly|WebAssembly와 BigInt]]에서 따로 다룬다.

## JSON과 저장 계약

기본 `JSON.stringify`는 BigInt 값에서 예외를 낸다. 모든 숫자 문자열을 자동으로 BigInt로 복원하면 ID, 날짜와 사용자 입력까지 바꾸므로 필드별 schema로 변환한다.

```js
const payload = JSON.stringify({ id: id.toString() });
const data = JSON.parse(payload);
const restoredId = BigInt(data.id); // 실제 경계에서는 형식과 길이도 검증한다.
```

정수 단위 금액을 BigInt로 저장할 수는 있지만 통화별 scale, 나눗셈의 반올림, 세금과 배분 잔액 정책은 별도다. 매우 긴 외부 숫자 문자열은 파싱과 연산 비용도 제한한다. 암호 연산에 일정 시간 실행이 필요하면 일반 BigInt 연산을 그 보장으로 취급하지 않는다.

## 호환성과 적용 판단

문법과 산술 연산자 자체를 제공하는 기능이므로 단순 전역 함수 polyfill만으로 `1n + 2n`을 지원하게 만들 수 없다. 배포 대상 런타임을 확인하고, 구형 환경이 필수면 명시적인 라이브러리 연산 API와 변환 비용을 함께 판단한다.

## 출처

- [BigInt: arbitrary-precision integers in JavaScript — V8](https://v8.dev/features/bigint)
- [ECMAScript, BigInt Objects](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects)

## 관련 문서

- [[JavaScript-Numbers-Strings-and-Regular-Expressions|Number와 문자열의 표현 단위]]
- [[JavaScript-Binary-Data-and-Workers|TypedArray와 바이너리 데이터]]
