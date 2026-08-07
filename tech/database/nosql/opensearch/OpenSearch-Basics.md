---
tags: [database, search, opensearch, inverted-index, rest-api, query-dsl]
status: done
verified_at: 2026-08-07
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Basics", "OpenSearch 기초", "OpenSearch 입문"]
---

# OpenSearch 기초 — 요청과 응답의 실물

[[OpenSearch|학습 지도]] 0단계 전의 진입 계단이다. 다른 문서들은 인덱스, 매핑, analyzer, term 같은 단어의 실물을 이미 봤다고 전제한다. 이 문서는 그 실물을 처음 보여준다. 인덱스 하나를 만들고 문서를 넣고 검색해 응답을 읽을 수 있으면 통과다.

## RDB 개념 대응표

진입용 비유다. 일대일 등가가 아니고, join과 다중 행 transaction이 없다는 차이는 [[OpenSearch-vs-RDB-Search|0단계 문서]]가 다룬다.

| RDB | OpenSearch | 차이 |
|---|---|---|
| table | index | 새 필드 추가는 자유롭지만 이미 만든 필드의 타입은 바꿀 수 없어 재색인이 필요 |
| row | document | 고정 컬럼이 아니라 중첩 가능한 JSON 문서 |
| column | field | 타입에 따라 색인 구조가 달라짐 |
| schema (DDL) | mapping | 필드 타입과 분석 방식을 정의하는 JSON |
| SQL | Query DSL | JSON 형태의 질의 언어 |

## 역색인의 실물

RDB 인덱스는 값에서 행 위치를 찾는다. 역색인(inverted index)은 반대로 단어에서 문서 목록을 찾는다. 문서 3개를 색인하면 아래처럼 저장된다.

```text
문서 1: "무선 블루투스 이어폰"
문서 2: "블루투스 스피커"
문서 3: "유선 이어폰"

term (정렬된 단어 사전)   posting list (문서 ID 목록)
무선                  → [1]
블루투스              → [1, 2]
스피커                → [2]
유선                  → [3]
이어폰                → [1, 3]
```

- 문장을 term으로 바꾸는 처리 파이프라인이 analyzer다. 쪼개는 단계가 tokenizer이고 소문자화 같은 정규화 단계가 뒤따른다. 그렇게 나온 검색 단위 하나가 term이다.
- 정렬된 term 목록이 term dictionary, term마다 붙은 문서 ID 목록이 posting list다 (다른 문서에서는 postings로도 쓴다).
- 블루투스 이어폰 검색은 두 term의 posting list를 조회해 합치는 것으로 끝난다. 문서 전체를 훑지 않는다.

기본 standard analyzer는 Unicode 단어 경계 기준으로 쪼갠 뒤 대소문자가 있는 문자를 소문자로 정규화한다 (한국어는 대소문자가 없어 그대로다). 위처럼 띄어쓰기된 한국어는 공백 단위로 나뉘고, 조사가 붙는 실전 한국어(예: 이어폰을)는 형태소 분석이 필요하다. [[OpenSearch-Korean-Text-Analysis|Nori]]가 그 역할이다. 이 구조를 B-tree와 같은 데이터로 비교한 그림 버전은 [[OpenSearch-Architecture-Map|아키텍처 한 장 지도]]에 있다.

## 인덱스 생성부터 검색까지

색인, 검색, 인덱스 관리는 HTTP REST API로 한다. 아래 요청은 Dashboards의 Dev Tools 콘솔 문법이고, curl로 실행하려면 메서드와 호스트, `Content-Type: application/json` 헤더, `-d` 본문 형태로 바꾼다.

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
- 매핑 없이 문서를 먼저 넣으면 값을 보고 타입을 추측해 자동 생성한다(dynamic mapping). 운영 함정은 [[OpenSearch-Mapping-Text-Analysis|매핑 문서]] 참고.

### 2. 문서 색인

```json
PUT /products/_doc/1
{ "title": "무선 블루투스 이어폰", "category": "전자기기", "price": 39000 }
```

응답의 `"result": "created"`와 `_id`, `_version`을 확인한다. 같은 `_id`로 다시 넣으면 덮어쓰기이고 `"result": "updated"`가 된다. 위 예시의 문서 2, 3도 같은 방식으로 넣는다.

### 3. ID로 조회

```json
GET /products/_doc/1
```

`_source`에 넣은 JSON 원문이 그대로 들어 있고 `"found": true`가 붙는다. 검색과 달리 ID 조회는 기본 설정에서 real-time이라 색인 직후에도 바로 보인다.

### 4. 검색과 응답 읽기

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
  "took": 4,
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

점수는 예시 값이고 `timed_out`, `_shards` 필드는 생략했다. 읽는 순서는 세 가지다.

- `took`: 검색에 걸린 밀리초.
- `hits.total.value`: 조건에 맞은 문서 수. 기본 설정에서는 큰 결과일 때 정확한 수 대신 `"value": 10000, "relation": "gte"`처럼 하한으로 표시될 수 있다. 왜 그런지는 [[OpenSearch-Inverted-Index-Structures#Block-Max WAND와 track_total_hits|track_total_hits]] 참고.
- `hits.hits[]._score`: 관련도 점수. 검색어를 블루투스 이어폰으로 넣으면 두 term 중 하나만 있어도 매칭되고(기본 OR), 둘 다 가진 문서 1이 더 높은 점수로 먼저 온다. 이 점수를 계산하는 공식의 이름이 BM25이고, 원리는 [[OpenSearch-Query-Relevance|관련도 문서]]가 다룬다.

RDB와 가장 다른 지점이 이 `_score`다. WHERE는 참과 거짓만 가르지만, 검색은 얼마나 잘 맞는지의 순위를 만든다.

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
- `filter`는 점수에 영향을 주지 않고, 자주 반복되는 조건은 캐시로 재사용될 수 있다. WHERE에 해당하는 조건은 `filter`에 두는 것이 기본형이고, 구분의 원리는 [[OpenSearch-Query-Relevance|Query context와 Filter context]] 참고.
- 카테고리별 개수 집계처럼 검색 결과를 묶어 세는 기능이 aggregation이고, 그걸로 만드는 필터 UI가 패싯이다. [[OpenSearch-Aggregations-Pagination|집계 문서]] 참고.

## 방금 넣은 문서가 검색에 안 보이는 이유

색인한 문서는 바로 검색되지 않고 refresh가 일어나야 검색 대상이 된다. 기본 refresh 간격은 1초라 near real-time이라고 부른다 (검색 요청이 한동안 없는 shard는 idle로 전환되어 refresh를 미루는 예외가 있다). ID 조회(GET)는 기본 설정에서 refresh 전에도 최신 문서를 반환하므로, 3번의 GET과 4번의 Search는 보이는 시점의 보장이 다르다. 이 구분은 이후 [[OpenSearch-Indexing-Internals|색인 내부]]에서 translog, segment와 함께 다시 나온다.

마지막으로 규모의 어휘 하나. 인덱스는 여러 shard로 쪼개져 여러 노드에 분산 저장되고, shard의 복제본이 replica다. 지금은 문서 저장과 검색의 단위가 인덱스라는 것만 알면 되고, 분산 구조는 [[OpenSearch-Architecture|아키텍처 문서]]가 다룬다.

## 통과 기준

- [ ] 인덱스 생성부터 match 검색까지 네 요청을 문서를 보지 않고 작성한다.
- [ ] 검색 응답에서 `took`, `hits.total`, `_score`, `_source`를 설명한다.
- [ ] `text`와 `keyword`, `match`와 `term`의 차이를 역색인 구조로 설명한다.

통과하면 [[OpenSearch-vs-RDB-Search|0단계: RDB vs 검색엔진 도입 판단]]으로 간다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-vs-RDB-Search|다음: RDB vs 검색엔진]]
- [[OpenSearch-Mapping-Text-Analysis|매핑과 텍스트 분석]]
- [[OpenSearch-Query-Relevance|BM25 관련도와 Query DSL]]

## 출처

- [Intro to OpenSearch - OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/intro/)
- [Communicate with OpenSearch - OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/communicate/)
- [Index document - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/)
- [Reindex data - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/reindex-data/)
- [Get document - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/get-documents/)
- [Term-level and full-text queries compared - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/term-vs-full-text/)
- [Match query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/full-text/match/)
- [Standard analyzer - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/supported-analyzers/standard/)
- [Boolean queries - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/compound/bool/)
- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
