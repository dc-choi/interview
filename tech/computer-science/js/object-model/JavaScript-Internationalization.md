---
tags: [cs, javascript, intl, localization]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
---

# Intl과 지역화된 표시

Intl은 locale에 맞춰 값의 표시와 언어 규칙을 처리한다. 시간대 결정, 금액 계산, 번역 문장 작성과 입력 검증을 대신하지 않는다. 출력은 런타임의 국제화 데이터 버전에 따라서도 달라질 수 있으므로 특정 구두점이나 공백을 저장 형식으로 사용하지 않는다.

## Locale과 표시 이름

`Intl.Locale`은 BCP 47 language tag를 구조화한다. language, script, region과 calendar, numbering system 같은 선호를 표현할 수 있다. locale의 region만으로 사용자의 물리적 위치나 현재 시간대를 확정할 수 없다.

`Intl.DisplayNames`는 언어, 지역, 문자 체계, 통화 코드 등에 대응하는 표시 이름을 만든다. `type`에 맞는 코드 형식과 `fallback` 정책을 정한다. 사용자가 지원 언어를 고르는 화면에서 코드와 표시 문자열을 분리하는 데 유용하다.

```js
const names = new Intl.DisplayNames(['ko'], {
  type: 'language',
  fallback: 'code',
});
console.log(names.of('en')); // 영어
```

표시 문자열을 다시 원래 코드로 파싱하지 않는다. 선택값에는 `en` 같은 안정적인 코드를 저장한다.

## 목록과 문장 조각

`Intl.ListFormat`은 conjunction, disjunction, unit 목록을 locale별 연결 규칙으로 만든다. `array.join(', ')`만으로 언어별 마지막 접속사와 구두점까지 처리할 수 없다.

```js
const list = new Intl.ListFormat('en', { type: 'conjunction' });
console.log(list.format(['A', 'B', 'C'])); // A, B, and C
```

입력은 문자열 목록이다. `formatToParts`를 사용하면 항목과 연결 문자열을 구분해 렌더링할 수 있다. 반환 문자열이나 part는 HTML escaping을 수행하지 않으므로 DOM에는 안전한 텍스트 렌더링 경로를 사용한다.

## 숫자, 통화와 단위

`Intl.NumberFormat`은 currency, unit, percent, compact/scientific/engineering notation 등을 조합한다. 같은 설정으로 반복 표시할 때 formatter를 재사용한다. `formatToParts`는 부호, 정수, 구분자와 통화 기호 등을 분리한다.

```js
const percentage = new Intl.NumberFormat('en', { style: 'percent' });
percentage.format(0.25); // 25%

const delta = new Intl.NumberFormat('en', { signDisplay: 'exceptZero' });
delta.format(-0); // 0
```

`style: 'percent'`는 비율을 백분율로 표시한다. `style: 'unit', unit: 'percent'`는 이미 백분율인 수치에 단위를 붙이는 다른 계약이다. 단위 formatter는 미터를 마일로 환산하지 않는다. BigInt를 표시할 수 있지만 큰 정수를 먼저 Number로 바꿔 넘기면 손실된 정밀도는 복원되지 않는다.

`signDisplay: 'exceptZero'`는 양의 0과 음의 0 모두 부호를 생략한다. 자리수 옵션에 따른 반올림은 표시 정책이다. 금액 저장, 계산, 정산 반올림은 별도로 정하고 표시 결과를 다시 숫자로 읽지 않는다.

## 복수형 선택

`Intl.PluralRules`는 수를 `one`, `two`, `few`, `many`, `zero`, `other` 같은 locale별 category로 분류한다. 어떤 category를 쓰는지는 언어와 cardinal/ordinal 설정에 따라 다르다. 영어의 1/나머지 규칙을 모든 언어로 일반화하지 않는다.

복수형 category는 완성된 번역 문장이 아니다. 선택 결과에 대응하는 메시지 catalog가 필요하다. ordinal도 영어의 11th, 12th, 13th 같은 예외가 있어 끝자리만으로 구현하지 않는다.

## 상대 시간 표시

`Intl.RelativeTimeFormat`은 숫자와 단위를 받는다. `numeric: 'auto'`는 가능한 경우 yesterday 같은 표현을 쓴다.

```js
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
relative.format(-1, 'day'); // yesterday
```

이 API는 두 Date의 차이를 구하거나 적절한 단위를 자동 선택하지 않는다. 24시간 차이와 사용자의 시간대에서 달력상 하루 차이는 DST 경계에서 다를 수 있다. 기준 시각, 시간대, 단위 선택과 반올림을 계산한 뒤 formatter에 전달한다.

## 운영 시 확인할 것

locale fallback과 지원 locale, 국제화 데이터 차이를 배포 환경에서 확인한다. 테스트는 비즈니스 의미와 필요한 part를 중심으로 작성하고, exact string snapshot을 쓸 때는 런타임과 데이터 버전 변경에 따른 갱신을 고려한다.

같은 설정으로 많은 값을 포맷하면 `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator`를 만들어 재사용하는 방식을 검토한다. V8의 2019년 구현 개선은 ICU 호출과 내부 객체 layout의 비용을 줄였지만 당시의 생성 속도 향상 배수가 오늘의 모든 환경에 적용되지는 않는다.

V8의 국제화 기능은 ICU와 연결되며 배포된 locale 데이터와 호스트 빌드가 결과에 영향을 준다. 개발 기기에서 formatter가 있다는 사실만으로 대상 서버의 모든 locale 데이터까지 확인한 것은 아니다. `supportedLocalesOf`와 실제 필요 locale의 출력을 배포 환경에서 확인한다.

## 출처

- [Faster and more feature-rich internationalization APIs — V8](https://v8.dev/blog/intl)
- [V8, i18n support](https://v8.dev/docs/i18n)
- [ECMA-402, Intl.Locale Objects](https://tc39.es/ecma402/#locale-objects)
- [Intl.DisplayNames — V8](https://v8.dev/features/intl-displaynames)
- [Intl.ListFormat — V8](https://v8.dev/features/intl-listformat)
- [Intl.NumberFormat — V8](https://v8.dev/features/intl-numberformat)
- [Intl.PluralRules — V8](https://v8.dev/features/intl-pluralrules)
- [Intl.RelativeTimeFormat — V8](https://v8.dev/features/intl-relativetimeformat)
- [ECMA-402, NumberFormat Format Functions](https://tc39.es/ecma402/#sec-intl.numberformat.prototype.format)

## 관련 문서

- [[JavaScript-Global-JSON-Date-and-Builtins|Date와 global 객체]]
- [[JavaScript-BigInt|큰 정수와 직렬화]]
