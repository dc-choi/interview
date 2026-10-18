---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop chart와 aggregation 반환 계약"]
---

# Workshop chart와 aggregation 반환 계약

Chart 선택은 raw object, grouped aggregate, time series와 function-return shape를 구분한다. Null line의 gap/ignored/zero는 서로 다른 해석을 만들어 visual truth를 바꿀 수 있다. Display rounding은 underlying value를 바꾸지 않는다. Selection filter는 object-backed layer 등 지원되는 source에 한정한다.

## Function aggregation 언어 차이

TSv1 2D는 {buckets:[{key,value}]},3D inner는 value array다. TSv2는 bare bucket array,3D inner는 groups다. Python은 SingleBucket/NestedBucket과 wrapper를 사용한다. Declared return type의 serialization은 호환돼도 TSv1 literal을 TSv2 함수에 남기면 type error다.

TSv2 aggregate는 flat group rows이며 row.$group.<key>와 nullable metric을 읽어 원하는 chart shape로 재구성한다. $duration은 bucket start scalar라 end를 직접 구성해야 한다. 원문의1day는 fixed24h 코드로 되어 있어 임의 calendar/DST window와 같다고 일반화하지 않는다.

별도 unordered numerator/denominator는 row position이 아닌 group key로 join한다. TSv1 예제의 index 기반 division과 zero division/누락 bucket 처리를 검증 없이 이식하지 않는다. Multi-key groupBy는 flatten된 조합이며 ordering이 안 된다. Exact bucket count 기본이 TSv1 topValues1,000→TSv2 exact10,000으로 달라지고 cardinality를 넘으면 object가 빠져 approximate가 될 수 있다. TS OSDK가 accuracy flag를 노출하지 않는 한계도 있다.

## Pivot totals와 null

Object pivot은 single type, 최대7row group/1column group이다. Total은 raw objects에 같은 aggregation을 다시 적용한 결과이며 화면 subtotal의 단순 합으로 보장하지 않는다. Function pivot은 struct array의 values field와 grouping fields로 표현한다.

Grouping field omission은 total, explicit undefined는 null bucket, empty string은 subtotal처럼 해석될 수 있다고 원문이 구분한다. JSON 직렬화가 undefined key를 제거할 수 있으므로 custom type/runtime serialization을 검증해야 한다. 예제의 세미콜론 object literal과 합계 불일치를 실행 보장으로 복사하지 않는다. Function pivot selection은 struct output, object pivot selection은 object-set filter다.

## Vega와 temporal display

Vega는 JSON spec과 named data를 사용하며 Vega-Lite selection은 widget parameter 이름과 spec params를 모두 설정해야 한다. 자동 주입되지 않는다. Object/group source로 filter translation이 안 되면 JSON string output을 사용한다. Source 기준 Vega-Lite5.18은 해당 snapshot의 version이지 무기한 최신 보장이 아니다.

TSv2 Long은 string이라 quantitative chart에 바로 넣으면 달라질 수 있다. Numeric axis에는 Double/Integer/Float를 검토하고 Python은 functions.api Long alias와 bare int의 등록 type 차이를 확인한다. Full spec preview에는 실제 data가 주입되므로 외부 Vega editor에 복사하기 전에 공개 가능 여부를 확인한다.

Gantt range의 no-end는 exclude/point/fallback timestamp 중 선택한다. Timeline layer는 single type이고 range/instant event와 timezone을 구분한다. Chart의 grouping, axis scale/log, totals, unit과 selected range는 데이터 정확성에 영향을 주는 계약이며 실제 render는 수행하지 않았다.

## 출처

- [Palantir Workshop, widgets-chart](https://www.palantir.com/docs/foundry/workshop/widgets-chart)
- [Palantir Workshop, widgets-gantt-chart](https://www.palantir.com/docs/foundry/workshop/widgets-gantt-chart)
- [Palantir Workshop, widgets-metric-card](https://www.palantir.com/docs/foundry/workshop/widgets-metric-card)
- [Palantir Workshop, widgets-pie-chart](https://www.palantir.com/docs/foundry/workshop/widgets-pie-chart)
- [Palantir Workshop, widgets-pivot-table](https://www.palantir.com/docs/foundry/workshop/widgets-pivot-table)
- [Palantir Workshop, widgets-timeline](https://www.palantir.com/docs/foundry/workshop/widgets-timeline)
- [Palantir Workshop, widgets-vega-chart](https://www.palantir.com/docs/foundry/workshop/widgets-vega-chart)
- [Palantir Workshop, widgets-visualization](https://www.palantir.com/docs/foundry/workshop/widgets-visualization)

## 관련 문서

- [[Palantir-Workshop]]
