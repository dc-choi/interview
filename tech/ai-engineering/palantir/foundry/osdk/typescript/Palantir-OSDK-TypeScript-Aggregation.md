---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# TypeScript2 aggregate 입력과 반환 타입

aggregate는 `$select`와 optional `$groupBy`만 받는다. filter는 먼저 object set에 where를 적용한다. selector key는 `$count` 또는 `property:metric`이라는 flat string이며 metric에 `$`를 붙이거나 nested object로 쓰지 않는다.

예를 들어 `$select: {"numberOfReviews:avg":"unordered"}`가 맞는 형태다. value는 unordered/asc/desc다. metric ordering은 group key가 최대 하나일 때만 허용되고 둘 이상이면 전부 unordered다.

## 결과 모양

ungrouped는 단일 object, grouped는 `$group`과 metric을 나란히 가진 row array다. match가 없으면 grouped array는 비므로 첫 row 접근을 guard한다. 문서의 raw HTTP 응답 예시와 SDK가 해석한 결과를 구별한다.

`$count`는 선택한 경우 number로 존재한다. approximateDistinct/exactDistinct는 property type/nullability와 무관하게 number 타입이다. metric alias는 TypeScript에 없고 반환 key가 property/metric에서 파생된다. Python의 alias 옵션과 다르다.

sum/avg/min/max는 underlying value type과 required 여부를 따른다. optional integer는 number|undefined, Long/Decimal/Timestamp/Date 계열은 generated type에 따라 string|undefined일 수 있다. no-match의 avg/min/max undefined를 처리한다.

## 가능한 metric

일반 property는 approximate/exact distinct, numeric은 sum/avg/min/max, date/timestamp는 min/max를 지원한다. date/timestamp에 avg/sum을 요청하지 않는다. compile-time 검사는 base type 기준이므로 array property의 metric은 compile돼도 runtime에서 실패할 수 있다.

## grouping

exact는 실제 value, fixed-width는 bucket 시작 scalar, range만 startValue/endValue object를 반환한다. range는 inclusive start/exclusive end의 두 끝값이 필수이며 열린 끝값을 표현하지 못한다. 날짜는 date string, timestamp는 ISO8601 timestamp로 구분한다.

duration은 [수,단위] tuple이다. seconds/minutes/hours는 Timestamp만, days는 date/timestamp에서 쓰고 weeks/months/quarters/years는 수가1인 조건을 따른다. 이를 일반적인 가변 calendar interval 지원으로 확대하지 않는다.

참조 문서는 aggregate endpoint의 OSv1/OSv2 공통 최대10,000 결과 제한을 설명한다. object-load endpoint의 OSv2 설명을 aggregate 한도에 대신 적용하지 않는다.

## 출처

- [Palantir, typescript-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Palantir, typescript-osdk-migration](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)

## 관련 문서

- [[Palantir-OSDK-TypeScript]]
- [[Palantir-OSDK-TypeScript-Read]]
