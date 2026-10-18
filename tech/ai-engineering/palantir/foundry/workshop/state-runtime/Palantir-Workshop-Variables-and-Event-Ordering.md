---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop 변수와 이벤트의 실행 순서"]
---

# Workshop 변수와 이벤트의 실행 순서

Workshop 변수는 widget 입력/출력과 계산 의존성을 연결한다. 이름은 module 안에서 case-insensitive unique이며 folder 대신 page/tab prefix로 묶는다. 일부 tutorial의 variable folder 안내는 현재 Variables 설명과 다르다. Static 값, computed definition과 widget이 쓴 현재 값은 별개다.

## 이벤트와 recompute

Event 목록은 설정 순서대로 실행을 시작한다. Set variable은 source의 현재 값을 즉시 target에 복사해 다음 event가 그 target을 읽을 수 있지만, target에 의존한 계산 완료는 기다리지 않는다. Recompute 다음 Set variable을 붙여도 새 결과 대신 이전 값/loading state를 복사할 수 있다. Downstream 완료를 기다리는 강제 barrier는 지원하지 않아 사용자 단계나 계산 구조를 나눈다.

Recompute는 Automatic, event-only, module-load+event 세 mode다. 마지막 mode의 초기 계산도 lazy loading에 따라 처음 필요할 때 실행될 수 있다. Event-only input이 stale하면 downstream recompute가 input까지 강제로 갱신하지 않는다. Widget/Set variable이 computed 값을 바꿔도 다음 recompute는 definition 결과로 덮어쓴다. User input은 static 별도 변수에 두는 선택을 검토한다.

Object-set definition 자체에는 recompute setting이 없고 입력 filter/함수 등의 동작으로 제어한다. Object set을 반환하는 함수의 recompute를 멈추어도 widget이 보여주는 object data가 freeze되지는 않는다. 숨긴 section의 visibility 계산도 필요하면 계속 실행된다.

## Layout 상태

Page selection String은 Page ID와, collapse Boolean true는 collapsed와 연결된다. Page-switch/collapse event는 backing variable을 갱신하지 않으므로 동기화가 필요하면 Set variable을 사용한다. Tab selection과 overlay-open event는 backing variable도 갱신한다. Hidden section과 collapsed section은 같지 않으며 Boolean hide 기본true의 의미도 확인한다.

## Browser 변환과 입력 계약

Primitive variable transforms는 browser에서 실행되어 backend round trip이 필요하지 않다. Object set 조회/aggregation은 별도 data operation과 구분한다. Timestamp↔Date cast에는 timezone이 관여하고 Date→Timestamp는 해당 timezone의 start-of-day다. String geopoint는 lat,long, GeoJSON shape는 longitude,latitude coordinate array라 순서를 혼동하지 않는다.

Numeric input의 percent suffix는 entered value/100을 출력하고 min/max는 clamp한다. Decimal은 최대10자리다. Date-time picker는 millisecond/second/minute precision과 IANA timezone을 사용하며 GMT offset code와 다르다. String selector single은 string, multi는 array이며 default는 output variable에서 정한다. User-created option은 storage/action persistence와 별개다.

Text input Enter event는 single-line에서만 지원한다. Markdown mode는 Markdown string을 저장하고 image syntax가 rich-text load error를 낼 수 있다. User Select는 display name이 아니라 Multipass ID를 출력하며 group filter에는 View group membership 권한이 필요하다.

원문의 Does not contain 설명이 Contains와 동일한 문장이고 array Is null은 variable reference에서 empty로 표시된다는 제한이 있다. Null/empty/undefined와 실제 runtime 결과를 검증 없이 동일시하지 않는다. 실제 module event는 실행하지 않았다.

## 출처

- [Palantir Workshop, concepts-events](https://www.palantir.com/docs/foundry/workshop/concepts-events)
- [Palantir Workshop, concepts-variables](https://www.palantir.com/docs/foundry/workshop/concepts-variables)
- [Palantir Workshop, variable-backed-layouts](https://www.palantir.com/docs/foundry/workshop/variable-backed-layouts)
- [Palantir Workshop, variable-recompute](https://www.palantir.com/docs/foundry/workshop/variable-recompute)
- [Palantir Workshop, variable-transformations](https://www.palantir.com/docs/foundry/workshop/variable-transformations)
- [Palantir Workshop, widgets-date-time-picker](https://www.palantir.com/docs/foundry/workshop/widgets-date-time-picker)
- [Palantir Workshop, widgets-numeric-input](https://www.palantir.com/docs/foundry/workshop/widgets-numeric-input)
- [Palantir Workshop, widgets-string-selector](https://www.palantir.com/docs/foundry/workshop/widgets-string-selector)
- [Palantir Workshop, widgets-text-input](https://www.palantir.com/docs/foundry/workshop/widgets-text-input)
- [Palantir Workshop, widgets-user-select](https://www.palantir.com/docs/foundry/workshop/widgets-user-select)

## 관련 문서

- [[Palantir-Workshop]]
