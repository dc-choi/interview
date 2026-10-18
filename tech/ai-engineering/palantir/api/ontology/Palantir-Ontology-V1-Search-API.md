---
tags: [palantir, foundry, api, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology V1의 검색과 집계

`POST /api/v1/ontologies/{ontologyRid}/objects/{objectType}/search`는 JSON query로 검색하고 `/aggregate`는 query로 선택한 객체를 집계한다. OAuth2 scope는 `api:ontologies-read`다. V2 ObjectSet filter 이름과 V1 query 이름을 섞지 않는다.

## 검색 문법과 페이지

query의 type, field, value를 지정한다. field는 `properties.age`처럼 쓴다. 비교는 lt/gt/lte/gte/eq, null은 isNull, array 원소는 contains, 논리는 not/and/or다. and/or를 조합한 query는 최대 세 단계다.

Search body의 optional fields는 반환할 property API name 목록이다. orderBy.fields에는 field와 asc/desc 방향을 넣는다. 문자열 정렬은 분석된 term이 아닌 원문 Unicode code point 순서여서 숫자, 대문자, 소문자의 순서가 드러난다.

기본 pageSize는 1,000이며 최대 요청치다. 객체가 커서 내부 메모리 한도에 닿으면 더 작은 페이지가 올 수 있다. nextPageToken이 있으면 계속 읽고 pageSize나 query 등 다른 부분을 바꾸지 않는다. totalCount는 모든 페이지의 결과 수이며 long 문자열 형식이다.

OSv1은 최대 10,000개 조회 제한, OSv2는 이 제한이 없다. null property는 반환에서 빠진다. pageSize보다 작은 페이지를 마지막 페이지로 판정하지 않는다.

## 텍스트 조건의 의미

| type | 의미 |
|---|---|
| prefix | term 순서를 유지하며 마지막 term에 prefix 일치 |
| phrase | term 순서와 연속 일치 |
| anyTerm | term 중 하나 이상, 순서 무관 |
| allTerms | 모든 term, 순서 무관 |

공식 endpoint 요약은 phrase를 substring, prefix를 starts-with로 짧게 설명하지만 상세 페이지는 term 분석 예시를 제시한다. 예를 들어 phrase의 Fox는 Foxes와 같지 않으며 punctuation과 공백은 term 경계가 될 수 있다. 문자열 원문 전체에 단순 startsWith/substring을 적용하는 의미로 단정하지 않는다.

기본적으로 공백과 punctuation으로 term을 분리하며 단독 마침표는 무시한다. 텍스트 term 조건은 대소문자를 구별하지 않으며 parsing 규칙은 바뀔 수 있다. 일반 eq/비교는 대소문자를 구별하고 string eq에는 Selectable 설정이 필요하다. anyTerm/allTerms의 fuzzy는 schema에 정의된 별도 옵션이다.

## 집계와 그룹

aggregation 목록은 count, min/max/sum/avg, approximateDistinct를 조합한다. count는 object 개수다. optional name을 생략하면 count 또는 `max_<propertyApiName>` 같은 기본 이름이 된다. aggregation 목록 순서는 결과에 영향을 주지 않지만 **groupBy 목록 순서는 계산 결과에 영향을 준다**.

| groupBy | 계약 |
|---|---|
| exact | 동일 값 그룹, 기본 maxGroupCount 10,000 |
| fixedWidth | 수치 property의 지정 폭 |
| ranges | 수치, date, timestamp의 명시 범위 |
| duration | date/timestamp의 ISO 8601 시간 간격 |

ranges의 권장 설명은 gte 시작 포함, lt 끝 제외다. typed schema에는 gt/lte도 별도로 있어 경계를 명시한다. 예제 하나의 `type: range`와 달리 schema 및 상세 문서의 이름은 `ranges`이므로 예제를 그대로 복사하지 않는다.

Date는 P3D 같은 일 단위만, timestamp는 일/시/분/초를 지원한다. duration 응답의 group 값은 구간 시작이다. `P2D` 구간 시작이 10월 1일이면 1일과 2일을 포함한다.

## 결과에서 빠진 데이터

응답의 data는 group과 metrics를 가진 그룹별 항목이다. excludedItems는 maxGroupCount를 넘겨 결과에서 빠진 항목 수다. page 또는 metric 누락과 동일한 뜻으로 보지 않는다.

groupBy property가 null인 객체는 그룹 계산에서 제외되고 aggregation property가 null인 객체도 해당 계산에서 제외된다. 결과에 null group이나 null metric은 포함되지 않는다. count 결과와 특정 property의 avg 대상 수는 다를 수 있다.

이 문서는 공개 검색/집계 계약이다. enrollment에서 특정 property 설정, 대규모 성능이나 동시 쓰기 중 재현 결과는 시험하지 않았다.

## 출처

- [Search Objects Details](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/search)
- [Search Objects endpoint](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/search-objects)
- [Aggregate Objects Details](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/aggregate)
- [Aggregate Objects endpoint](https://www.palantir.com/docs/foundry/api/ontology-resources/objects/aggregate-objects)

## 관련 문서

- [[Palantir-Ontology-V1-Read-API]]
- [[Palantir-Ontology-SQL-API]]
