---
tags: [database, search, opensearch, highlighting, collapse, agentic, memory]
status: done
verified_at: 2026-07-30
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Search Features", "OpenSearch Highlight", "OpenSearch Agentic Search"]
---

# OpenSearch 검색 기능과 응답 제어

이 문서의 기본 범위는 highlight, collapse, 응답 필드, 검색 template과 실행 제어다. 본문 검색 이외의 기능은 별도 데이터 모델과 비용 구조를 가지므로 기본 query에 무심코 얹으면 index 크기와 latency가 빠르게 늘어난다. Agentic query와 memory는 기본 기능을 익힌 뒤 선택해서 보는 고급 확장으로 분리한다.

## 자동완성 선택지

Query-time prefix, edge n-gram, `search_as_you_type`와 completion suggester의 선택 기준, mapping과 운영 경계는 [[OpenSearch-Autocomplete|자동완성 설계]]에서 다룬다.

### 한국어 자동완성

한국어 prefix, 띄어쓰기와 초성 요구의 분리는 [[OpenSearch-Autocomplete#한국어 자동완성|한국어 자동완성]]을 따른다. 초성 감지와 색인 규칙은 [[OpenSearch-Query-Understanding#초성 검색과 자모 필드|초성 검색과 자모 필드]]가 정본이다.

## Highlight

| Highlighter | 특징 | 적합한 경우 |
|---|---|---|
| `unified` | 기본 선택, term vector와 postings offset을 우선 사용 | 일반적인 lexical highlight |
| `plain` | field를 재분석해 query를 반영 | 짧은 field와 제한된 hit |
| `fvh` | `with_positions_offsets` term vector 필수 | `matched_fields`와 phrase 가중 |
| `semantic` | OpenSearch 3.0 이상, model inference | 의미상 관련 문장과 passage |

주의점:

- Highlight는 `_source` 또는 stored field 원문을 읽으므로 큰 field에서 비싸다.
- 큰 본문은 `unified`와 `index_options: offsets`를 먼저 검토하고, FVH 전용 기능이 필요할 때 term vector 비용을 지불한다.
- 복잡한 Boolean query에서는 최종 match 조건과 무관한 term이 표시될 수 있다.
- `encoder: html`과 server에서 고정한 tag를 사용한다. `encoder: default`나 raw HTML이 필요하면 출력 context에 맞는 sanitization을 적용한다.
- Fragment, mapping과 성능 선택은 [[OpenSearch-Highlighting|highlighting과 안전한 검색 snippet]]에서 다룬다.

## 응답 필드 선택과 payload 줄이기

검색 latency에는 shard 실행뿐 아니라 fetch와 JSON 직렬화, 네트워크 전송도 포함된다.

| 방법 | 값의 출처와 응답 위치 | 선택 기준 |
|---|---|---|
| `_source` filtering | 저장된 원문 일부, `hit._source` | 원문 JSON 구조가 필요할 때 `includes`, `excludes`와 wildcard로 전송량을 줄인다. |
| `fields` | `_source`와 mapping, `hit.fields` | field와 wildcard 선택, 날짜 format처럼 mapping을 반영한 반환이 필요할 때 사용한다. |
| `docvalue_fields` | 열 지향 `doc_values`, `hit.fields` | `keyword`, date, numeric처럼 정렬과 집계에 쓰는 비분석 값을 직접 읽는다. |
| `stored_fields` | mapping에서 `store: true`로 별도 저장한 값, `hit.fields` | 추가 저장 비용을 감수하고 미리 정한 소수 field만 반복 조회할 때 사용한다. |
| `script_fields` | 검색 시 계산한 값, `hit.fields` | 응답용 파생값이 필요할 때 사용하되 계산할 hit 수를 제한한다. |

`fields`, `docvalue_fields`, `stored_fields`, `script_fields`는 기본 `_source` 반환을 끄지 않는다. 원문이 불필요하면 요청에 `_source: false`를 지정하고, 함께 필요하면 `_source` filtering으로 범위를 줄인다.

`_source`만 원래 JSON 구조를 유지한다. 나머지 방식의 값은 `hits.hits[].fields` 아래 배열로 반환되므로 client에서 scalar로 가정하지 않는다. Nested field의 `docvalue_fields`나 `stored_fields`는 nested query의 `inner_hits` 안에 지정한다.

- hit가 필요 없고 집계만 필요하면 `size: 0`을 사용한다.
- 정확한 전체 hit 수가 필요하지 않으면 `track_total_hits` 요구를 낮춘다.
- 큰 본문을 list API에서 반환하지 않고 detail API로 분리한다.

## Collapse search

`collapse`는 `doc_values`가 활성화된 단일값 `keyword`나 numeric field로 hit를 묶고, 각 group에서 top-level `sort` 기준의 대표 document 하나만 반환한다. 상품 variant처럼 같은 entity가 여러 문서로 검색될 때 목록 중복을 줄이는 응답 제어이며 bucket과 metric을 만드는 aggregation과 목적이 다르다.

```json
GET products/_search
{
  "collapse": {"field": "product_id"},
  "sort": [{"price": "asc"}]
}
```

- `collapse`는 top hit만 바꾸며 aggregation 결과에는 영향을 주지 않는다.
- `hits.total`은 collapse 전 document hit 수 또는 하한이며 unique group 수가 아니다. `relation`을 확인하고 정확한 document 수가 필요하면 `track_total_hits: true`를 사용해도, 정확한 group 수는 별도로 계산해야 한다.
- `inner_hits`로 group 내부 문서를 펼칠 수 있지만 collapse field가 index되어 검색 가능해야 하고, 반환 group과 `inner_hits` 정의마다 추가 검색이 실행된다. `size`와 정의 수를 제한하고 `max_concurrent_group_searches`로 동시성을 제어한다.
- OpenSearch 3.3 이상에서 `collapse`와 `search_after`를 함께 쓰려면 collapse field와 유일한 sort field가 같아야 한다. 관리형 서비스는 engine과 API 지원 여부를 확인하고, 일반적인 cursor 규칙은 [[OpenSearch-Aggregations-Pagination#search_after|페이지네이션 제약]]을 따른다.

## Search template

Search template은 Mustache 기반 parameter로 query를 만든다. Inline `source`로 실행하거나 `_scripts/{id}`에 저장해 호출할 수 있다.

장점:

- Stored template을 `id`로 호출하면 애플리케이션마다 query 구조가 드리프트하는 것을 줄인다.
- Stored query 변경과 애플리케이션 배포를 분리할 수 있다.
- Render Template API로 최종 query를 사전 검증할 수 있다.

주의:

- Template은 느린 query를 빠르게 만들지 않는다.
- Mustache는 타입 검증이나 보안 경계가 아니다. Parameter의 타입과 기본값을 애플리케이션 계약으로 검증한다.
- Raw Query DSL이나 `toJson` parameter를 노출하면 임의 query 삽입을 다시 허용할 수 있다.
- 변경 이력, 테스트, rollback 가능한 version 이름을 둔다.
- Render Template API로 최종 query를 확인한 뒤 실행한다.

## 검색 실행 제어

- `timeout`: shard 수준 제한이다. Partial result가 허용되면 `timed_out: true`와 일부 결과가 함께 올 수 있어 hard deadline으로만 믿지 않는다.
- `terminate_after`: shard별 수집 문서 수를 제한하므로 정확한 전체 결과가 필요하면 쓰지 않는다.
- `allow_partial_search_results`: shard 실패를 일부 성공으로 반환할지 결정한다.
- `preference`: 같은 문자열로 shard copy 선택을 안정화해 cache 재사용을 도울 수 있다.
- `routing`: 검색할 shard를 줄이지만 데이터 모델이 routing을 보장해야 한다.
- `cancel_after_time_interval`: coordinating node가 전체 요청과 연관 task를 취소하며 만료 시 오류를 반환한다. 요청 값이 cluster 설정을 덮어쓰고 기본값은 `-1`이다.

클라이언트는 HTTP 성공만 보지 말고 `_shards.failed`, `timed_out`, `terminated_early`를 확인한다.

## 고급 확장: Agentic query와 memory

이 절은 [[OpenSearch-Query-Relevance|기본 Query DSL]]과 검색 실행 제어를 이해한 뒤 필요한 경우에만 보는 고급 확장이다. `agentic` query는 새로운 lexical 또는 vector ranking 알고리즘이 아니다. 미리 등록한 agent의 `QueryPlanningTool`과 search pipeline의 `agentic_query_translator`가 자연어와 mapping을 LLM에 보내 Query DSL을 만들고, OpenSearch가 그 DSL을 실행한다. Conversational agent는 이전 응답의 `memory_id`로 후속 요청의 맥락을 이어갈 수 있다.

Agentic memory는 단순 대화 로그가 아니라 memory container 안에 working memory, 장기 지식과 preference, 변경 history를 구성하는 framework다. Namespace로 user, session과 agent를 분리할 수 있지만 검색 엔진이 자동으로 안전한 기억 계층이 되는 것은 아니다.

- Agentic query는 upstream OpenSearch 3.2, agentic memory는 3.3에서 도입됐다. Amazon OpenSearch Service와 Serverless는 target engine과 지원 API를 별도로 확인한다.
- Namespace를 인증 경계로 믿지 않고 index 권한, document-level security와 tenant 검증을 적용한다.
- 생성된 DSL의 index와 field allowlist, query 비용, timeout과 tool 호출 횟수를 제한하고 audit한다.
- 대화와 preference에는 개인정보가 들어갈 수 있으므로 보존 기간, 삭제, 동의, 수정과 사용자별 격리를 설계한다.
- LLM과 connector의 latency, quota, 비용과 비결정성을 SLO에 포함하고 실패 시 검증된 lexical query나 제한된 template으로 fallback한다.

## 검색 품질 검증

[[OpenSearch-Autocomplete|자동완성]] mapping, analyzer, 동의어와 template을 바꾸면 검색 결과도 함께 회귀할 수 있다. 대표 query와 judgment 관리, 오프라인 지표, 온라인 지표와 실험 절차는 [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]에서 하나의 검증 루프로 다룬다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Autocomplete|자동완성 설계]]
- [[OpenSearch-Mapping-Text-Analysis|매핑과 analyzer]]
- [[OpenSearch-Korean-Text-Analysis|한국어 analyzer와 사전 운영]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
- [[OpenSearch-Aggregations-Pagination|집계, 정렬과 페이지네이션]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]
- [[OpenSearch-Index-Lifecycle|자동완성 mapping 변경과 reindex]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]
- [[OpenSearch-Security-Production|Agentic memory 접근 제어]]
- [[Production-Agent-Architecture|프로덕션 agent guardrail]]

## 출처

- [OpenSearch vs Elasticsearch 비교 - YouTube](https://www.youtube.com/watch?v=EPGVqk9TrTI)
- [Agentic search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/agentic-search/index/)
- [Agentic query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/specialized/agentic/)
- [Agentic memory - OpenSearch Documentation](https://docs.opensearch.org/latest/ml-commons-plugin/agentic-memory/)
- [Amazon OpenSearch Service로 검색 구현하기 - YouTube](https://www.youtube.com/watch?v=2Swr59CkA_w)
- [Highlight query matches - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/highlight/)
- [Retrieve specific fields - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/retrieve-specific-fields/)
- [Collapse search results - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/collapse-search/)
- [Collapse field validation - OpenSearch source](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/search/collapse/CollapseBuilder.java#L217-L236)
- [OpenSearch 3.3.0 release notes - GitHub](https://github.com/opensearch-project/OpenSearch/releases/tag/3.3.0)
- [Search template API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search-template/index/)
- [Search API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [Search settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/search-settings/)
