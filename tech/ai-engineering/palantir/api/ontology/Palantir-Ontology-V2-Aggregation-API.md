---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V2 집계의 정확도 계약

`POST /objects/{objectType}/aggregate`는 where로 고른 객체를, `/objectSets/aggregate`는 재귀 ObjectSet 정의를 집계한다. 둘 다 `api:ontologies-read`가 필요하다. ObjectSet 쪽은 branch/transaction/scenario와 executeInMemoryOnly도 명시적으로 제공한다.

## Metric과 property 식별자

count, min/max/sum/avg, approximateDistinct에 exactDistinct와 approximatePercentile이 추가된다. 뒤의 두 연산은 OSv2가 필요하며 exactDistinct는 approximate보다 느릴 수 있다. metric 대상은 field 또는 propertyIdentifier 중 하나만 채운다. count는 property 없이 객체 수를 센다.

Metric에는 optional name과 direction ASC/DESC를 지정할 수 있다. 응답 metric value는 수치라면 double, 날짜 metric이면 date string이므로 number로 고정하지 않는다. property selector의 struct/load level, experimental 제약은 [[Palantir-Ontology-SQL-API]]를 따른다.

## GroupBy 경계

| type | 계약 |
|---|---|
| exact | 기본 maxGroupCount 10,000, null 처리를 선택적으로 지정 |
| fixedWidth | 지정한 수치 폭 |
| ranges | startValue 포함, endValue 제외 |
| duration | value와 unit으로 date/timestamp 구간 지정 |

duration의 YEARS/QUARTERS/MONTHS/WEEKS는 value가 반드시 1이다. V1의 ISO 8601 duration 문자열이나 gte/lt range와 V2 구조를 혼용하지 않는다. 일부 예제는 `type: range`를 쓰지만 typed schema의 variant는 `ranges`이므로 schema를 기준으로 확인한다.

exact의 defaultValue는 null 객체를 지정한 문자열 그룹으로, includeNullValues는 null 그룹으로 포함한다. **둘은 동시에 사용할 수 없다.** includeNullValues는 aggregation의 orderBy clause와도 함께 사용할 수 없다. V1에서 null을 무조건 제외한다는 규칙을 V2 exact에 적용하지 않는다.

## 정확도를 요청하고 확인하기

maxGroupCount는 반환 그룹 수만 자르는 값이 아니라 서버가 할당할 자원에도 영향을 준다. distinct 값이 할당 범위를 넘으면 top N을 포함한 결과가 approximate가 될 수 있다. 고 cardinality에서 정확한 결과가 필요하면 distinct 수를 감당하도록 maxGroupCount를 설정한다.

- accuracy 생략 또는 ALLOW_APPROXIMATE는 근사 결과를 허용한다.
- REQUIRE_ACCURATE는 정확도가 보장될 때만 결과를 반환하고 불가능하면 `AggregationAccuracyNotSupported`로 실패한다.
- 응답 accuracy의 ACCURATE/APPROXIMATE를 실제로 검사한다. 성공 HTTP status만으로 정확한 집계라고 판단하지 않는다.
- excludedItems는 limit을 넘겨 결과에서 제외한 항목 수다. metric 자체가 근사인지와 결과의 누락을 별도 점검한다.

ObjectSet 집계의 optional includeComputeUsage는 OSDK 전용이고 요청 성능을 느리게 할 수 있어 production 사용을 권장하지 않는다. 결과 computeUsage는 compute-seconds 단위다. 이 값이나 in-memory-only flag를 무제한 계산 보장으로 해석하지 않는다.

## 출처

- [Aggregate Objects](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-objects/aggregate-objects)
- [Aggregate Object Set](https://www.palantir.com/docs/foundry/api/ontologies-v2-resources/ontology-object-sets/aggregate-object-set)

## 관련 문서

- [[Palantir-Ontology-V2-ObjectSet-API]]
- [[Palantir-Ontology-V1-Search-API]]
