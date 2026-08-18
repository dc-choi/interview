---
tags: [database, search, opensearch, query-dsl, bool, dis-max, compound]
status: done
verified_at: 2026-08-18
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Compound Query", "OpenSearch compound 쿼리", "OpenSearch Boolean Query", "OpenSearch bool 쿼리", "OpenSearch Disjunction Max Query", "OpenSearch dis_max"]
---

# OpenSearch compound 쿼리: bool과 dis_max

`bool`은 여러 query clause를 boolean 논리로 결합하는 compound query다. 렉시컬 검색 전반, query와 filter context의 구분, BM25 해석은 [[OpenSearch-Query-Relevance|렉시컬 검색과 Query DSL]]이 정본이고, 이 문서는 bool clause의 정확한 의미와 함정, 점수 결합 방식이 다른 `dis_max`와의 구분을 다룬다.

## Clause별 논리와 점수

| Clause | 논리 | 필수 여부 | 점수 |
|---|---|---|---|
| `must` | AND | 필수 | 기여 |
| `filter` | AND | 필수 | 기여하지 않음 |
| `must_not` | NOT | 제외 | 기여하지 않음 |
| `should` | OR | `minimum_should_match`에 따름 | match할수록 가산 |

- `filter`는 exact match, range, 날짜와 숫자 조건에 쓴다. 점수 계산 전에 대상 집합을 먼저 줄이고, 자주 반복되는 filter는 캐시로 재사용될 수 있다. 실제 재사용률의 함정은 [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]] 참고.
- `must_not`에 여러 clause를 넣으면 `NOT(A OR B)`다. 어느 하나라도 match하는 문서가 모두 제외된다. A와 B를 동시에 만족하는 문서만 제외하려면 `must_not` 안에 `bool` + `must`를 중첩한다.

## minimum_should_match 기본값 함정

- `should`만 있으면 기본 1: 최소 한 개는 match해야 결과에 들어간다.
- `must` 또는 `filter`가 있으면 기본 0: `should`는 필수 조건이 아니라 단순 가산점이 된다.

기존 query에 filter 하나를 추가하는 순간 `should`가 필수 조건에서 boost로 바뀔 수 있다. 의도가 필수라면 값을 명시한다.

```json
GET products/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"title": "무선 이어폰"}}
      ],
      "should": [
        {"match": {"description": "노이즈 캔슬링"}},
        {"match": {"description": "방수"}}
      ],
      "minimum_should_match": 1,
      "must_not": [
        {"term": {"status": "DISCONTINUED"}}
      ],
      "filter": [
        {"range": {"price": {"lte": 300000}}}
      ]
    }
  }
}
```

## _name으로 match 원인 추적

어떤 clause가 실제로 match됐는지 보려면 각 query의 필드를 object로 바꾸고 `_name`을 붙인다.

```json
{"match": {"title": {"query": "무선 이어폰", "_name": "title-must"}}}
{"match": {"description": {"query": "방수", "_name": "waterproof-should"}}}
```

이름 붙은 query에 하나라도 match한 hit에는 `matched_queries`가 붙는다. 기본은 이름 배열이고, `include_named_queries_score=true`면 이름과 점수의 객체가 된다. 어떤 named query에도 match하지 않은 hit에는 필드 자체가 없다.

```json
"matched_queries": ["title-must", "waterproof-should"]
```

여러 `should` 중 어떤 clause가 그 문서의 점수에 기여했는지 확인할 수 있어, 문서 단위 점수 분해가 필요한 `_explain` 전에 가볍게 쓸 수 있다.

## 중첩 bool

`(love OR hate) AND (life OR grace)` 같은 식은 `must` 안에 `should`만 가진 bool을 중첩해 표현한다.

```json
{
  "bool": {
    "must": [
      {"bool": {"should": [
        {"match": {"text_entry": "love"}},
        {"match": {"text_entry": "hate"}}
      ]}},
      {"bool": {"should": [
        {"match": {"text_entry": "life"}},
        {"match": {"text_entry": "grace"}}
      ]}}
    ]
  }
}
```

내부 bool에는 `should`만 있으므로 각각 기본 `minimum_should_match` 1이 적용되어 OR 그룹 자체는 필수가 된다. 중첩 안에 `must`나 `filter`를 섞으면 그 그룹의 기본값이 0으로 바뀌는 것도 같은 규칙이다.

## dis_max: 합산 대신 최대값 결합

`dis_max`도 compound query다. `queries` 배열 중 하나 이상 match하는 문서를 반환하고, 여러 clause에 match한 문서는 그중 최고 점수를 문서 점수로 삼는다. match한 clause 점수를 모두 합산하는 `bool`의 `should`와 대비된다.

```json
{
  "dis_max": {
    "queries": [
      {"match": {"title": "shakespeare poems"}},
      {"match": {"body": "shakespeare poems"}}
    ],
    "tie_breaker": 0.3
  }
}
```

- `tie_breaker`(0~1.0 사이 실수, 기본 0)를 주면 최고 점수에 나머지 match clause 점수 × tie_breaker를 더한다. 기본 0에서는 최고 점수만 남는다.
- `multi_match`의 `best_fields` 유형은 이 dis_max 결합으로 실행되며 같은 `tie_breaker`를 받는다.
- 같은 검색어를 여러 필드에 던질 때 합산 결합은 여러 필드에 얕게 걸린 문서의 점수를 부풀릴 수 있다. 한 필드의 강한 match가 순위를 결정해야 하면 dis_max 방식 결합이 맞고, 증거가 쌓일수록 점수를 올리고 싶으면 `should` 합산이 맞다.

## 관련 문서

- [[OpenSearch-Query-Relevance|렉시컬 검색, Query DSL과 관련도]] — query와 filter context, BM25
- [[OpenSearch-Relevance-Tuning|function_score와 rescore를 이용한 관련도 튜닝]]
- [[OpenSearch|OpenSearch 학습 지도]]

## 출처

- [Boolean query — OpenSearch Documentation 2.19](https://docs.opensearch.org/2.19/query-dsl/compound/bool/)
- [Disjunction max query — OpenSearch Documentation 2.19](https://docs.opensearch.org/2.19/query-dsl/compound/disjunction-max/)
- [Multi-match query — OpenSearch Documentation 2.19](https://docs.opensearch.org/2.19/query-dsl/full-text/multi-match/)
- [SearchHit.java — OpenSearch 2.19 소스, matched_queries 직렬화 조건](https://github.com/opensearch-project/OpenSearch/blob/2.19/server/src/main/java/org/opensearch/search/SearchHit.java)
