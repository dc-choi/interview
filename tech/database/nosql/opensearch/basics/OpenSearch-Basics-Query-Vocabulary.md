---
tags: [database, search, opensearch, inverted-index, rest-api, query-dsl]
status: done
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
---

# OpenSearch 기초 — 쿼리의 최소 어휘와 통과 기준

[[OpenSearch-Basics-REST-Walkthrough|REST 실습]]에서 만든 `products` 인덱스와 색인한 문서를 사용한다. 아래 통과 기준의 네 요청도 해당 실습의 인덱스 생성, 문서 색인, ID 조회와 검색을 가리킨다.

## match, term, bool — 쿼리의 최소 어휘

```json
GET /products/_search
{
  "query": {
    "bool": {
      "must":   [ { "match": { "title": "이어폰" } } ],
      "filter": [
        { "term":  { "category": "전자기기" } },
        { "range": { "price": { "lte": 50000 } } }
      ]
    }
  }
}
```

| 쿼리 | 동작 | 쓰는 곳 |
|---|---|---|
| `match` | 검색어를 analyzer로 쪼개 term 단위로 매칭 | `text` 필드 전문 검색 |
| `term` | 쪼개지 않고 값 그대로 하나의 term과 정확 일치 | `keyword`, 숫자, 날짜 필터 |
| `range` | 범위 비교 (`gte`, `lte` 등) | 숫자, 날짜 |
| `bool` | 여러 쿼리를 `must`(점수 계산), `filter`(참거짓만), `should`, `must_not`으로 조합 | 검색과 필터의 결합 |

- 흔한 함정: `text` 필드에 `term` 쿼리를 쓰면 쿼리 문자열은 쪼개지 않고 색인된 쪽만 쪼개져 있어, 블루투스 이어폰처럼 분석 결과와 어긋나는 값은 0건이 된다. 단일 term과 우연히 일치하면 매칭되기도 해서 더 헷갈린다. 전문 검색은 `match`, 정확 일치는 `keyword` 필드에 `term`.
- `filter`는 점수에 영향을 주지 않고, 자주 반복되는 조건은 캐시로 재사용될 수 있다. WHERE에 해당하는 조건은 `filter`에 두는 것이 기본형이고, 구분의 원리는 [[OpenSearch-Query-Relevance|Query context와 Filter context]], bool clause별 의미는 [[OpenSearch-Query-Relevance-Compound|compound 쿼리 문서]] 참고.
- 카테고리별 개수 집계처럼 검색 결과를 묶어 세는 기능이 aggregation이고, 그걸로 만드는 필터 UI가 패싯이다. [[OpenSearch-Aggregations-Pagination|집계 문서]] 참고.

## 방금 넣은 문서가 검색에 안 보이는 이유

색인한 문서는 바로 검색되지 않고 refresh가 일어나야 검색 대상이 된다. 기본 refresh 간격은 1초라 near real-time이라고 부른다 (검색 요청이 한동안 없는 shard는 idle로 전환되어 refresh를 미루는 예외가 있다). ID 조회(GET)는 기본 설정에서 refresh 전에도 최신 문서를 반환하므로, [[OpenSearch-Basics-REST-Walkthrough#3. ID로 조회|REST 실습 3번의 GET]]과 [[OpenSearch-Basics-REST-Walkthrough#4. 검색과 응답 읽기|4번의 Search]]는 보이는 시점의 보장이 다르다. 이 구분은 이후 [[OpenSearch-Indexing-Internals|색인 내부]]에서 translog, segment와 함께 다시 나온다.

마지막으로 규모의 어휘 하나. 인덱스는 여러 shard로 쪼개져 여러 노드에 분산 저장되고, shard의 복제본이 replica다. 지금은 문서 저장과 검색의 단위가 인덱스라는 것만 알면 되고, 분산 구조는 [[OpenSearch-Architecture|아키텍처 문서]]가 다룬다.

## 통과 기준

- [ ] 인덱스 생성부터 match 검색까지 네 요청을 문서를 보지 않고 작성한다.
- [ ] 검색 응답에서 `took`, `hits.total`, `_score`, `_source`를 설명한다.
- [ ] `text`와 `keyword`, `match`와 `term`의 차이를 역색인 구조로 설명한다.

통과하면 [[OpenSearch-vs-RDB-Search|0단계: RDB vs 검색엔진 도입 판단]]으로 간다.

## 출처

- [OpenSearch Documentation, Boolean queries](https://docs.opensearch.org/latest/query-dsl/compound/bool/)
- [OpenSearch Documentation, Range query](https://docs.opensearch.org/latest/query-dsl/term/range/)
- [OpenSearch Documentation, Index settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)

## 관련 문서

- [[OpenSearch-Basics|OpenSearch 기초 목차]]
- [[OpenSearch-Basics-Concepts|개념과 역색인의 실물]]
- [[OpenSearch-Basics-REST-Walkthrough|이전: 인덱스 생성부터 검색까지]]
