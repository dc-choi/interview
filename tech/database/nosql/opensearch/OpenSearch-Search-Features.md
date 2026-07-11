---
tags: [database, search, opensearch, autocomplete, highlighting, agentic, memory]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Search Features", "OpenSearch 자동완성", "OpenSearch Highlight", "OpenSearch Agentic Search"]
---

# OpenSearch 자동완성, Highlight, Agentic Search와 응답 제어

본문 검색 이외의 검색 경험은 별도 데이터 모델과 비용 구조를 가진다. 자동완성, highlight, 응답 필드, 검색 template을 기본 query에 무심코 얹으면 index 크기와 latency가 빠르게 늘어난다.

## 자동완성 선택지

| 방식 | 적합한 경우 | 비용과 한계 |
|---|---|---|
| Prefix query | 작은 데이터와 빠른 실험 | query-time term 확장 |
| `match_phrase_prefix` | phrase 마지막 token prefix | 후보가 많으면 비용 증가 |
| Edge n-gram | 일반 검색과 prefix를 함께 설계 | index term과 저장 공간 증가 |
| `search_as_you_type` | custom 설정을 줄인 prefix와 infix | 자동 생성 subfield 비용 |
| Completion suggester | 별도 suggestion과 weight 기반 추천 | suggestion 데이터를 별도 색인 |

### Edge n-gram 원칙

- Index analyzer에서만 edge n-gram을 생성한다.
- Search analyzer는 일반 analyzer를 사용한다.
- `min_gram`, `max_gram`이 index 크기와 recall을 직접 바꾼다.
- 짧은 gram은 후보와 오탐을 폭증시킨다.
- `max_gram`보다 긴 query가 어떻게 분석되는지 `_analyze`로 확인한다.

`데이터`를 `데`, `데이`, `데이터`로 만드는 방식은 일반 n-gram이 아니라 시작 위치를 고정한 edge n-gram이다. 일반 n-gram은 `이`, `터`, `이터` 같은 내부 조각도 만들므로 infix 검색에는 유용하지만 token 수와 오탐이 더 늘어날 수 있다.

### 같은 index와 별도 suggestion index

자동완성에 별도 index가 항상 필요한 것은 아니다.

- 제목과 상품명처럼 원본 문서와 생성, 수정, 삭제 주기가 같으면 같은 index의 autocomplete multi-field나 `search_as_you_type` field로 시작한다.
- 인기 검색어, 운영자가 관리하는 추천어, weight와 만료 시간이 별도 데이터라면 suggestion 전용 index가 관리하기 쉽다.
- Completion suggester도 전용 `completion` field가 필요하지만 반드시 별도 index를 요구하지는 않는다.
- 사용자 검색 로그를 후보로 만들 때는 정규화, 중복 제거, 최소 빈도, 최신성, 금칙어와 민감 정보 필터를 거친다.
- 접근 제어가 필요한 문서의 제목을 자동완성으로 노출하면 존재 자체가 유출될 수 있으므로 본 검색과 같은 권한 필터를 적용한다.

Suggestion 문서는 보통 표시 문자열, 정규화된 검색 문자열, 대상 ID와 유형, weight, locale을 분리한다. 본문 전체를 잘게 잘라 후보로 쓰기보다 사용자가 선택했을 때 의미 있는 짧은 표현만 색인한다.

### 한국어 자동완성

한국어 본문 analyzer를 자동완성에 그대로 재사용하지 않는다. 다음 요구를 분리한다.

- 완성된 단어 prefix
- 띄어쓰기 변형
- 영문과 숫자가 섞인 상품명과 코드
- 초성 검색
- 인기 검색어와 개인화된 suggestion

OpenSearch의 기본 analyzer가 초성 검색을 자동 제공한다고 가정하면 안 된다. 초성 필드가 필요하면 애플리케이션 전처리와 별도 mapping을 명시적으로 설계한다.

## Highlight

| Highlighter | 특징 | 적합한 경우 |
|---|---|---|
| `unified` | 기본 선택, 대부분의 query 지원 | 일반적인 본문 검색 |
| `plain` | field를 재분석해 query를 반영 | 짧은 field와 제한된 hit |
| `fvh` | 별도 위치와 offset 메타데이터 필요, 긴 field에 유리 | 추가 저장 비용 허용 |

주의점:

- Highlight는 `_source` 또는 stored field 원문을 읽으므로 큰 field에서 비싸다.
- `fvh`용 위치와 offset 메타데이터를 저장하면 index 크기가 커진다.
- 복잡한 Boolean query에서는 최종 match 조건과 무관한 term이 표시될 수 있다.
- `encoder: html`은 원문을 escape한 뒤 highlight tag를 삽입한다. Fragment 전체를 다시 escape하면 `<em>` 같은 tag도 깨진다.
- 애플리케이션은 고정된 허용 tag만 렌더링하고 custom tag나 `encoder: default`에는 별도 sanitization을 적용한다.

## 응답 payload 줄이기

검색 latency에는 shard 실행뿐 아니라 fetch와 JSON 직렬화, 네트워크 전송도 포함된다.

- `_source` includes와 excludes로 필요한 원문만 반환한다.
- 정렬과 집계용 값은 `docvalue_fields`를 검토한다.
- `stored_fields`는 mapping 단계에서 별도 저장 비용을 지불한 특수한 경우에만 사용한다.
- hit가 필요 없고 집계만 필요하면 `size: 0`을 사용한다.
- 정확한 전체 hit 수가 필요하지 않으면 `track_total_hits` 요구를 낮춘다.
- 큰 본문을 list API에서 반환하지 않고 detail API로 분리한다.

```json
GET products/_search
{
  "_source": ["id", "title", "thumbnail"],
  "track_total_hits": false,
  "query": {"match": {"title": "검색어"}},
  "highlight": {
    "encoder": "html",
    "fields": {"title": {}}
  }
}
```

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

## Agentic query와 memory

`agentic` query는 새로운 lexical 또는 vector ranking 알고리즘이 아니다. 미리 등록한 agent의 `QueryPlanningTool`과 search pipeline의 `agentic_query_translator`가 자연어와 mapping을 LLM에 보내 Query DSL을 만들고, OpenSearch가 그 DSL을 실행한다. Conversational agent는 이전 응답의 `memory_id`로 후속 요청의 맥락을 이어갈 수 있다.

Agentic memory는 단순 대화 로그가 아니라 memory container 안에 working memory, 장기 지식과 preference, 변경 history를 구성하는 framework다. Namespace로 user, session과 agent를 분리할 수 있지만 검색 엔진이 자동으로 안전한 기억 계층이 되는 것은 아니다.

- Agentic query는 upstream OpenSearch 3.2, agentic memory는 3.3에서 도입됐다. Amazon OpenSearch Service와 Serverless는 target engine과 지원 API를 별도로 확인한다.
- Namespace를 인증 경계로 믿지 않고 index 권한, document-level security와 tenant 검증을 적용한다.
- 생성된 DSL의 index와 field allowlist, query 비용, timeout과 tool 호출 횟수를 제한하고 audit한다.
- 대화와 preference에는 개인정보가 들어갈 수 있으므로 보존 기간, 삭제, 동의, 수정과 사용자별 격리를 설계한다.
- LLM과 connector의 latency, quota, 비용과 비결정성을 SLO에 포함하고 실패 시 검증된 lexical query나 제한된 template으로 fallback한다.

## 검색 품질 회귀 테스트

1. 실제 사용자 query와 기대 상위 문서를 고정한다.
2. 0건이어야 하는 query와 금지 오탐도 포함한다.
3. Analyzer token snapshot과 ranking 평가를 분리한다.
4. Mapping, 동의어, boost 변경 전후를 같은 corpus로 비교한다.
5. Relevance와 p95 latency, index 크기를 함께 본다.

## 관련 문서

- [[OpenSearch-Mapping-Text-Analysis|매핑과 analyzer]]
- [[OpenSearch-Korean-Text-Analysis|한국어 analyzer와 사전 운영]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
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
- [Autocomplete - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/autocomplete/)
- [Edge n-gram token filter - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/token-filters/edge-ngram/)
- [Search-as-you-type - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/search-as-you-type/)
- [Completion - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/completion/)
- [Highlight query matches - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/highlight/)
- [Search template API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search-template/index/)
- [Search API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [Search settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/search-settings/)
