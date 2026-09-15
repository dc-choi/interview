---
tags: [database, search, opensearch, inverted-index, rest-api, query-dsl]
status: done
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
---

# OpenSearch 기초 — REST API 실습

## 인덱스 생성부터 검색까지

색인, 검색, 인덱스 관리는 HTTP REST API로 한다. 아래 요청은 Dashboards Dev Tools의 축약 문법이다.

- Dev Tools는 로그인한 browser session을 통해 `METHOD /path`와 JSON body만 보낸다.
- Terminal의 curl은 `METHOD scheme://host:port/path?query` 전체 URL을 쓰고, JSON body가 있으면 `Content-Type: application/json`과 `-d`를 제공한다. `pretty`는 사람이 응답을 읽을 때만 붙인다.
- Security plugin을 끈 로컬 Quickstart는 HTTP와 무인증, 공식 demo security 구성은 HTTPS와 인증을 사용한다. 실제 배포에서는 endpoint의 TLS 설정을 확인하고 CA를 검증한다. Demo certificate에서 `-k`로 검증을 끄는 예외는 [[OpenSearch-Local-Quickstart#Demo security 구성|로컬 Quickstart]]에만 한정한다.

### 1. 매핑과 함께 인덱스 생성

```json
PUT /products
{
  "mappings": {
    "properties": {
      "title":    { "type": "text" },
      "category": { "type": "keyword" },
      "price":    { "type": "integer" }
    }
  }
}
```

- `text`: analyzer가 term으로 쪼개 역색인한다. 전문 검색용.
- `keyword`: 값을 통째로 하나의 term으로 저장한다. 정확 일치 필터, 정렬, 집계용.
- 매핑 없이 문서를 먼저 넣으면 값을 보고 타입을 추측해 자동 생성한다(dynamic mapping). `GET /products/_mapping`으로 실제 추론 결과를 확인한다. 한 번 생성된 field type은 제자리에서 바꿀 수 없으므로 잘못 추론됐다면 명시적 mapping의 새 index를 만들고 reindex한다. 운영 함정은 [[OpenSearch-Mapping-Text-Analysis|매핑 문서]] 참고.

### 2. 문서 색인

```json
PUT /products/_doc/1
{ "title": "무선 블루투스 이어폰", "category": "전자기기", "price": 39000 }
```

응답의 `"result": "created"`와 `_id`, `_version`을 확인한다. 같은 `_id`에 `PUT /products/_doc/1`을 다시 보내면 document 전체를 교체하고 `"result": "updated"`가 된다. ID를 자동 생성하려면 `POST /products/_doc`을 사용한다. 일부 field만 바꾸는 `POST /products/_update/1`은 `doc`을 현재 `_source`에 합친 뒤 내부적으로 다시 색인한다. `DELETE /products/_doc/1`은 document, `DELETE /products`는 index 전체를 삭제하므로 마지막 요청은 버려도 되는 실습 index에서만 실행한다. 위 예시의 문서 2, 3도 같은 방식으로 넣는다.

### 3. ID로 조회

```json
GET /products/_doc/1
```

`_source`에 넣은 JSON 원문이 그대로 들어 있고 `"found": true`가 붙는다. 검색과 달리 ID 조회는 기본 설정에서 real-time이라 색인 직후에도 바로 보인다.

### 4. 검색과 응답 읽기

본문 없는 `GET /products/_search`는 `match_all`과 같지만 일치 문서 중 기본 10건만 반환한다. `GET /products/_search?q=title:이어폰`처럼 Lucene query string을 URL에 넣을 수도 있다. 다만 `q`는 엄격한 문법과 예약 문자를 사용하며 request body의 `query`보다 우선하므로, 사용자 입력을 받는 애플리케이션은 보통 아래처럼 Query DSL의 `match` 또는 문법 오류에 관대한 `simple_query_string`을 사용한다.

```json
GET /products/_search
{
  "query": {
    "match": { "title": "블루투스 이어폰" }
  }
}
```

```json
{
  "took": 4, "timed_out": false,
  "_shards": { "total": 1, "successful": 1, "skipped": 0, "failed": 0 },
  "hits": {
    "total": { "value": 3, "relation": "eq" },
    "max_score": 1.87,
    "hits": [
      { "_id": "1", "_score": 1.87, "_source": { "title": "무선 블루투스 이어폰", "category": "전자기기", "price": 39000 } },
      { "_id": "2", "_score": 0.60, "_source": { "title": "블루투스 스피커", "category": "전자기기", "price": 59000 } },
      { "_id": "3", "_score": 0.60, "_source": { "title": "유선 이어폰", "category": "전자기기", "price": 15000 } }
    ]
  }
}
```

- `took`: OpenSearch 내부 검색에 걸린 밀리초. `timed_out: true`이면 제한 시간까지 수집된 부분 결과일 수 있고, `_shards.failed`가 0보다 크면 일부 shard가 실패한 것이다. HTTP 성공만으로 완전한 결과라고 간주하지 않으며, 완전성이 필수라면 [[OpenSearch-Search-Features#검색 실행 제어|검색 실행 제어]]의 `allow_partial_search_results`도 검토한다.
- `hits.total.value`: 조건에 맞은 문서 수. 기본 설정에서는 큰 결과일 때 정확한 수 대신 `"value": 10000, "relation": "gte"`처럼 하한으로 표시될 수 있다. 왜 그런지는 [[OpenSearch-Inverted-Index-Structures#Block-Max WAND와 track_total_hits|track_total_hits]] 참고.
- `hits.hits[]._score`: 관련도 점수. 각 hit의 `_index`는 예시에서 생략했고, 위 점수는 예시 값이다. 검색어를 블루투스 이어폰으로 넣으면 두 term 중 하나만 있어도 매칭되고(기본 OR), 둘 다 가진 문서 1이 더 높은 점수로 먼저 온다. 이 점수를 계산하는 공식의 이름이 BM25이고, 원리는 [[OpenSearch-Query-Relevance|관련도 문서]]가 다룬다.

RDB와 가장 다른 지점이 이 `_score`다. WHERE는 참과 거짓만 가르지만, 검색은 얼마나 잘 맞는지의 순위를 만든다.

BM25의 입문 mental model은 세 가지다. 같은 field에서 query term이 자주 나타날수록 유리하지만 반복 효과는 점차 포화하고(TF), 문서 집합에서 드문 term일수록 중요하게 본다(IDF). 같은 term 증거라면 긴 field는 길이 정규화로 불리할 수 있다. `_score`는 확률이 아니라 같은 query 안에서 순서를 정하기 위한 상대값이다.

## 출처

- [OpenSearch Documentation, Communicate with OpenSearch](https://docs.opensearch.org/latest/getting-started/communicate/)
- [OpenSearch Documentation, Index document](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/)
- [OpenSearch Documentation, Reindex data](https://docs.opensearch.org/latest/im-plugin/reindex-data/)
- [OpenSearch Documentation, Get document](https://docs.opensearch.org/latest/api-reference/document-apis/get-documents/)
- [OpenSearch Documentation, Term-level and full-text queries compared](https://docs.opensearch.org/latest/query-dsl/term-vs-full-text/)
- [OpenSearch Documentation, Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [OpenSearch Documentation, Search your data](https://docs.opensearch.org/latest/getting-started/search-data/)

## 관련 문서

- [[OpenSearch-Basics|OpenSearch 기초 목차]]
- [[OpenSearch-Basics-Concepts|이전: 개념과 역색인의 실물]]
- [[OpenSearch-Basics-Query-Vocabulary|다음: 쿼리의 최소 어휘와 통과 기준]]
