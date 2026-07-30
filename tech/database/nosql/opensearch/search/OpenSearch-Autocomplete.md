---
tags: [database, search, opensearch, autocomplete, prefix, ngram, completion]
status: done
verified_at: 2026-07-30
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Autocomplete", "OpenSearch 자동완성", "검색어 자동완성"]
---

# OpenSearch 자동완성 설계

자동완성은 입력 중인 문자열에 맞는 문서나 검색어 후보를 짧은 지연으로 반환하는 기능이다. 하나의 정답이 있는 기능이 아니라 후보를 query 시점에 확장할지, index 시점에 미리 만들지와 문서 검색인지 추천어 조회인지에 따라 구현을 고른다.

## Mental model

```text
입력 -> 정규화와 최소 길이 검사 -> prefix 조회 -> 권한 필터 -> 후보 순위와 개수 제한 -> UI
```

- Query-time은 기존 매핑으로 바로 시작하지만 입력할 때마다 term을 확장하고, index-time은 조회 비용을 낮추는 대신 색인 시간, 저장 공간 또는 메모리를 사용한다.
- 문서 자동완성은 제목이나 상품을 찾아 결과 문서로 이동시킨다.
- 검색어 suggestion은 인기 검색어와 운영자 추천어처럼 선택 후 다시 검색할 짧은 문구를 반환한다.

## 네 가지 구현 방식

| 방식 | 적합한 경우 | 주요 비용과 한계 |
|---|---|---|
| `match_phrase_prefix` | 기존 매핑으로 시작하는 작은 규모와 실험 | Query마다 마지막 term을 확장 |
| Edge n-gram | 분석기와 prefix 길이를 직접 통제하는 문서 검색 | 색인 term과 index 크기 증가 |
| `search_as_you_type` | Custom analyzer 없이 prefix와 infix를 지원하는 문서 검색 | 자동 생성 subfield의 저장 비용 |
| Completion suggester | 미리 정한 후보, weight와 오타 허용이 필요한 suggestion | 후보 사전 색인과 in-memory 구조 비용 |

## Query-time prefix matching

`match_phrase_prefix`는 앞선 term을 phrase로 찾고 마지막 불완전 term을 prefix query로 바꾼다. 별도 매핑이 없어 빠르게 도입할 수 있다.

```json
GET products/_search
{
  "_source": ["id", "title"],
  "query": {
    "match_phrase_prefix": {
      "title": {"query": "무선 이어", "max_expansions": 20}
    }
  }
}
```

- 짧은 prefix는 매우 많은 term으로 확장될 수 있으므로 최소 입력 길이와 `max_expansions`를 제한한다.
- 단어 사이 거리나 순서를 느슨하게 해야 할 때만 `slop`을 늘린다.
- 규모가 커져 query 비용이 문제가 되면 index-time 방식으로 전환한다.

## Edge n-gram

Edge n-gram은 token의 시작부터 여러 길이의 prefix를 index에 저장한다. Index analyzer에만 적용하고 Search analyzer는 입력을 다시 n-gram으로 쪼개지 않는 일반 analyzer를 사용한다.

```json
PUT products-edge-v1
{
  "settings": {
    "index.max_ngram_diff": 13,
    "analysis": {
      "filter": {"autocomplete_edge":
        {"type": "edge_ngram", "min_gram": 2, "max_gram": 15}},
      "analyzer": {
        "autocomplete_index": {"type": "custom", "tokenizer": "standard",
          "filter": ["lowercase", "autocomplete_edge"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {"type": "text",
        "fields": {
          "autocomplete": {"type": "text", "analyzer": "autocomplete_index",
            "search_analyzer": "standard"}
        }
      }
    }
  }
}
```

```json
GET products-edge-v1/_search
{"query": {"match": {"title.autocomplete": "무선 이어"}}}
```

- `min_gram`이 너무 작으면 후보와 오탐이 늘고, 너무 크면 짧은 입력을 찾지 못한다.
- `max_gram`보다 긴 입력은 대응하는 term이 없을 수 있다. 실제 검색어 길이를 기준으로 정하고 `_analyze`로 확인한다.
- 기존 field의 index analyzer를 바꾸면 기존 term은 변하지 않으므로 새 index에 reindex해야 한다.

## Search as you type

`search_as_you_type` field는 기본적으로 root field와 `_2gram`, `_3gram`, `_index_prefix` subfield를 만든다. 별도 analyzer 없이 문서의 prefix와 infix 검색을 시작할 때 적합하다.

```json
PUT products-sayt-v1
{
  "mappings": {"properties": {"title": {"type": "search_as_you_type"}}}
}
```

```json
GET products-sayt-v1/_search
{
  "query": {
    "multi_match": {
      "query": "무선 이어",
      "type": "bool_prefix",
      "fields": ["title", "title._2gram", "title._3gram"]
    }
  }
}
```

- `bool_prefix`는 term 순서를 강제하지 않지만 같은 순서의 문서를 더 높게 평가한다.
- 순서를 지키는 phrase가 필요하면 root field에 `match_phrase_prefix`를 사용한다.
- `max_shingle_size`는 2에서 4 사이이며 기본값은 3이다. 값을 키우면 구체적인 phrase에 유리하지만 index도 커진다.

## Completion suggester

Completion suggester는 미리 색인한 후보를 in-memory 자료구조로 조회한다. 문서 본문을 검색하는 방식보다 표시할 후보와 순위를 명시적으로 통제할 때 적합하다.

```json
PUT suggestions-v1
{
  "mappings": {"properties": {"suggest": {"type": "completion"}}}
}

PUT suggestions-v1/_doc/1?refresh=wait_for
{"suggest": {"input": ["무선 이어폰", "블루투스 이어폰"], "weight": 20}}
```

```json
GET suggestions-v1/_search
{
  "_source": false,
  "suggest": {
    "autocomplete": {
      "prefix": "무선 이",
      "completion": {"field": "suggest", "size": 5, "skip_duplicates": true, "fuzzy": {"fuzziness": "AUTO", "unicode_aware": true}}
    }
  }
}
```

- `weight`는 양의 정수이며 후보 순위에 반영된다.
- Fuzzy completion의 `unicode_aware` 기본값은 `false`라 edit distance를 byte로 계산한다. 한글 오타는 `true`로 두고 느려지는 비용과 한 음절 치환 결과를 함께 측정한다.
- 후보 목록을 먼저 색인해야 하며 빠른 조회의 대가로 메모리 사용이 늘어난다.

## 후보 데이터와 운영 경계

- 원본 문서와 생성, 수정, 삭제 주기가 같으면 같은 index의 multi-field나 `search_as_you_type`으로 시작한다.
- 인기 검색어, 운영자 추천어, weight와 만료 주기가 다르면 suggestion 전용 index로 분리한다.
- Suggestion 문서는 표시 문자열, 정규화 key, 대상 ID와 유형, locale, weight를 분리한다.
- 사용자 검색 로그는 최소 빈도, 최신성, 중복, 금칙어와 민감 정보 필터를 통과한 후보만 반영한다.
- 문서 검색 방식은 본 검색과 같은 server-side 권한 filter를 적용한다.
- Completion의 top-level `suggest`는 일반 query와 filter가 후보를 제한하지 않는다. 비공개 후보는 tenant나 접근 등급별 index로 분리하거나 target 환경에서 검증한 DLS만 사용하고, 다른 권한의 후보가 나오지 않는 negative integration test를 둔다.
- 입력마다 요청되므로 client debounce와 최소 글자 수, server rate limit을 함께 둔다.
- 실패해도 검색 입력 자체를 막지 말고 suggestion을 숨기거나 인기 검색어로 대체한다.

## 한국어 자동완성

- 완성된 단어 prefix, 띄어쓰기 변형, 영문과 숫자 혼합, 초성 검색을 별도 요구로 나눈다.
- 본문용 Nori analyzer를 그대로 재사용하지 말고 자동완성 field의 `_analyze` 결과를 확인한다.
- 기본 analyzer는 초성 검색을 만들지 않는다. 필요하면 애플리케이션에서 초성을 생성해 별도 field로 색인한다.
- 표시 문자열과 검색용 정규화 문자열을 분리해 사용자가 선택한 문구가 갑자기 바뀌지 않게 한다.

## 검증 체크리스트

- 대표 입력마다 `_analyze` 결과와 실제 후보를 snapshot으로 남긴다.
- 한 글자, 긴 입력, 띄어쓰기, 한글 한 음절 오타와 zero-result 입력을 포함한다.
- 같은 query set으로 relevance와 후보 중복, p95 latency를 비교한다.
- Edge n-gram과 `search_as_you_type`은 index 크기와 색인 처리량을 함께 측정한다.
- Completion 메모리와 refresh 이후 노출 시점, 다른 권한 후보의 부재, 실제 keystroke QPS의 debounce와 rate limit을 함께 검증한다.

## 관련 문서

- [[OpenSearch-Mapping-Text-Analysis|매핑과 analyzer]], [[OpenSearch-Query-Understanding|오타 교정, 초성과 검색어 전처리]]
- [[OpenSearch-Popular-Keywords-TopK|인기 검색어 후보와 weight]], [[OpenSearch-Search-API-Layer|검색 API 보호와 폴백]], [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]

## 출처

- [Autocomplete functionality - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/autocomplete/)
- [Edge n-gram token filter - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/token-filters/edge-ngram/)
- [Search-as-you-type field type - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/search-as-you-type/)
- [Completion field type - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/completion/)
- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Document-level security - OpenSearch Documentation](https://docs.opensearch.org/latest/security/access-control/document-level-security/)
