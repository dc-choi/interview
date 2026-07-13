---
tags: [database, search, opensearch, lexical, query-dsl, bm25, relevance]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Lexical Search", "OpenSearch 렉시컬 검색", "OpenSearch Query DSL", "OpenSearch Relevance", "OpenSearch 쿼리"]
---

# OpenSearch 렉시컬 검색, Query DSL과 관련도

이 문서는 렉시컬 검색의 기본 정본으로 Query DSL, query와 filter의 구분, BM25 점수의 해석을 다룬다. 쿼리 설계의 첫 질문은 조건이 문서를 포함하거나 제외하는 필터인지, 결과 순위를 바꾸는 관련도 조건인지다. 모든 조건에서 점수를 계산하면 느리고 의미도 불명확해진다.

## 렉시컬 검색이란

렉시컬 검색은 문서와 검색어를 analyzer가 만든 term으로 비교하는 어휘 기반 검색이다. 원문 문자열 전체가 같아야 하는 검색이 아니라 역색인에서 공통 term을 찾고 BM25 같은 알고리즘으로 관련도 순위를 계산하는 전체 흐름을 뜻한다.

```text
문서 -> index analyzer -> term -> inverted index
검색어 -> search analyzer -> term -> 역색인 문서 목록 조회 -> BM25 -> 순위
```

소문자 변환, 형태소 분석, stemming 같은 어간 정규화와 동의어 확장을 적용해도 최종 term을 기준으로 찾으면 렉시컬 검색이다. 같은 의미라도 공통 term이나 동의어 규칙이 없으면 놓칠 수 있으며, 이 한계를 [[OpenSearch-Hybrid-Search|벡터와 하이브리드 검색]]으로 보완할 수 있다.

## Term-level과 Full-text

| 종류 | Query 분석 | 대상 |
|---|---|---|
| Term-level | 하지 않음 | `keyword`, 숫자, 날짜, Boolean, IP, ID |
| Full-text | analyzer 적용 | `text` 자연어 필드 |

### Term-level

- `term`, `terms`, `terms_set`
- `range`, `exists`, `ids`
- `prefix`, `wildcard`, `regexp`, `fuzzy`

`term`은 입력을 분석하지 않는다. 분석된 `text` 필드에 원문을 그대로 넣으면 0건이나 예상 밖 결과가 나올 수 있다.

### Full-text

- `match`: 한 필드의 기본 자연어 검색
- `match_phrase`: 순서와 위치가 중요한 phrase
- `multi_match`: 여러 필드 검색
- `combined_fields`: 3.2 이상에서 같은 analyzer의 여러 text 필드를 BM25F로 계산
- `simple_query_string`: 문법 오류에 관대한 사용자 검색식
- `query_string`: 엄격한 Lucene 문법
- `intervals`: 위치와 순서를 세밀하게 통제

`match`의 기본 operator는 `OR`다. 모든 단어를 요구하려면 `operator: and` 또는 `minimum_should_match`를 명시한다. 일반 사용자 입력을 `query_string`에 그대로 넣으면 문법 오류와 비싼 query를 허용할 수 있다.

## Query context와 Filter context

- Query context: 얼마나 잘 맞는지 계산하고 `_score`에 반영한다.
- Filter context: 맞는지 아닌지만 판단하며 점수를 계산하지 않는다.
- 자주 반복되는 filter는 cache 재사용 가능성이 있다.

```json
GET products/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"status": "ACTIVE"}},
        {"range": {"created_at": {"gte": "now-30d"}}}
      ],
      "must": [
        {
          "multi_match": {
            "query": "사용자 검색어",
            "fields": ["title^3", "description"],
            "minimum_should_match": "75%"
          }
        }
      ],
      "should": [
        {"term": {"featured": {"value": true, "boost": 2}}}
      ]
    }
  }
}
```

## `bool`의 정확한 의미

| Clause | 필수 여부 | 점수 |
|---|---|---|
| `must` | 필수 | 기여 |
| `filter` | 필수 | 기여하지 않음 |
| `must_not` | 제외 | 기여하지 않음 |
| `should` | 조건에 따라 선택 | boost |

중요한 함정은 `minimum_should_match` 기본값이다.

- `should`만 있으면 기본 1
- `must` 또는 `filter`가 있으면 기본 0

기존 query에 filter를 추가하면 `should`가 필수 조건에서 단순 boost로 바뀔 수 있다. 의도가 필수라면 값을 명시한다.

## BM25 mental model

OpenSearch의 기본 lexical similarity는 BM25다.

- IDF: shard의 문서 집합에서 드문 term일수록 가중치가 높다.
- TF saturation: 같은 문서에 term이 반복되어도 점수 증가는 점차 포화한다.
- Field length normalization: field의 분석된 token 수를 평균 길이와 비교해 TF 기여를 조정한다. 같은 term 증거라면 짧은 field가 유리할 수 있지만 항상 높은 것은 아니다.
- Field와 query boost: 특정 필드와 조건의 비중을 조절한다.

기본 parameter는 `k1=1.2`, `b=0.75`, `discount_overlaps=true`다.

- `k1`을 낮추면 반복 횟수 효과가 빨리 포화한다.
- `b=0`이면 길이 정규화를 끈다.
- 값을 바꾸기 전에 analyzer, query 구조, field boost, phrase boost를 먼저 검증한다.

OpenSearch 3.0은 Lucene native BM25로 바뀌어 이전 버전보다 절대 score가 낮아질 수 있지만 상대 순위는 이 상수 차이만으로 바뀌지 않는다. 운영에서 score 숫자 자체를 고정 임계값으로 쓰면 버전 업그레이드에 취약하다.

기본 `query_then_fetch`는 각 shard의 지역 term 통계로 BM25를 계산한다. 작은 shard나 분포가 불균형한 인덱스에서는 score 차이가 커질 수 있다. `dfs_query_then_fetch`는 전체 shard 통계를 먼저 수집하지만 추가 왕복과 비용이 발생하므로 제한된 진단에 사용한다.

BM25 score는 field와 query term별 기여를 query 구조에 따라 합친 상대값이며 확률이나 의미 이해 결과가 아니다. 단어 순서는 BM25 자체가 아니라 position을 사용하는 phrase query 등이 제한한다.

## 여러 필드 검색

`multi_match` 유형을 의도에 맞게 고른다.

| 유형 | 적합한 경우 |
|---|---|
| `best_fields` | 한 필드의 강한 match가 중요 |
| `most_fields` | 같은 내용을 여러 analyzer로 색인한 결과를 합산 |
| `cross_fields` | term이 여러 필드에 나뉘어도 하나처럼 검색 |
| `phrase` | 단어 순서가 중요 |
| `bool_prefix` | search-as-you-type |

`combined_fields`는 3.2 이상에서 여러 text 필드의 term 통계를 통합해 BM25F로 계산한다. 모든 대상이 같은 text analyzer를 사용해야 하며 조건에 맞지 않는 필드를 자동으로 그룹화하지 않는다.

## 비싼 query

### Wildcard와 Regexp

- 선행 wildcard인 `*suffix`는 많은 term을 열거할 수 있다.
- 사용자 입력의 정규식을 무제한 허용하지 않는다.
- 본질적인 substring 요구는 `wildcard` field type을 검토한다.
- Prefix 요구는 edge n-gram, `search_as_you_type`, completion과 비교한다.

### Fuzzy

- 짧은 단어에서 오탐과 term expansion이 급증할 수 있다.
- `prefix_length`, `max_expansions`, fuzziness를 데이터로 제한한다.
- 고유 코드와 ID에는 fuzzy를 쓰지 않는다.

### Script와 비즈니스 점수

- Script query와 script score는 cache와 CPU 비용을 고려한다.
- 인기도와 최신성 결합, 상한, decay, rescore는 기본 관련도가 안정된 뒤 [[OpenSearch-Relevance-Tuning|관련도 튜닝]]에서 다룬다.

## 관련도 디버깅 도구

| 도구 | 답하는 질문 | 주의 |
|---|---|---|
| `_analyze` | 어떤 token이 생성됐나 | index와 search analyzer를 각각 확인 |
| `_explain/{id}` | 특정 문서 점수가 왜 이 값인가 | 비싸므로 문제 문서에 제한 |
| `profile: true` | 어떤 query와 aggregation 단계가 느린가 | 자체 overhead가 큼 |
| `_validate/query?explain` | query가 어떻게 rewrite되나 | 실행 전 구조 확인 |

Profile은 network latency, fetch phase, queue 대기, coordinator reduce 전체를 모두 설명하지 않는다. Slow log, Nodes Stats, Query Insights와 함께 본다.

## 관련도 개선 순서

1. 대표 query와 기대 결과, 실패 결과를 고정한다.
2. `_analyze`로 index와 query token을 확인한다.
3. 정확 조건을 filter로 분리한다.
4. `operator`와 `minimum_should_match`를 명시한다.
5. 제목, 본문, exact field의 boost를 조절한다.
6. Phrase와 동의어를 추가한다.
7. `_explain`으로 상위와 누락 문서를 비교한다.
8. 마지막에 BM25 parameter와 function score를 실험한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Architecture|다음: 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Mapping-Text-Analysis|매핑과 텍스트 분석]]
- [[OpenSearch-Korean-Text-Analysis|한국어 analyzer와 사전 운영]]
- [[OpenSearch-Relevance-Tuning|function_score와 rescore를 이용한 관련도 튜닝]]
- [[OpenSearch-Hybrid-Search|렉시컬과 시맨틱 점수 결합]]
- [[OpenSearch-Aggregations-Pagination|집계와 페이지네이션]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]

## 출처

- [Amazon OpenSearch Service로 검색 구현하기 - YouTube](https://www.youtube.com/watch?v=2Swr59CkA_w)
- [Query DSL - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/)
- [Query and filter context - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/query-filter-context/)
- [Full-text queries - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/full-text/index/)
- [Combined fields query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/full-text/combined-fields/)
- [Boolean query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/compound/bool/)
- [Keyword search and BM25 - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/keyword-search/)
- [Explain API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/explain/)
- [Profile API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/profile/)
