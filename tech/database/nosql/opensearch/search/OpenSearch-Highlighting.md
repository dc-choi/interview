---
tags: [database, search, opensearch, highlighting, snippet, security]
status: done
verified_at: 2026-07-30
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Highlighting", "OpenSearch 하이라이팅", "OpenSearch 검색 결과 강조"]
---

# OpenSearch highlighting과 안전한 검색 snippet

Highlight는 검색 결과를 고르거나 `_score`를 바꾸지 않는다. Query가 선택한 hit의 원문을 fetch 단계에서 읽고, lexical highlighter는 character offset을 계산하며 semantic highlighter는 model inference로 관련 구간을 고른다. 결과는 표시 tag가 삽입된 fragment로 별도 `highlight` object에 반환된다.

```text
query로 hit 선택
  -> 반환 hit와 highlight field의 원문 로드
  -> type별 위치 계산
     lexical: postings, term vector 또는 원문 재분석으로 offset 계산
     semantic: model inference로 관련 문장 선택
  -> fragment 생성과 tag 삽입
  -> hits.hits[].highlight.<field>[]
```

## 기본 요청과 응답

```json
GET articles/_search
{
  "_source": ["title"],
  "query": {
    "match": {"body": "분산 검색"}
  },
  "highlight": {
    "encoder": "html",
    "pre_tags": ["<mark>"],
    "post_tags": ["</mark>"],
    "fields": {
      "body": {
        "type": "unified",
        "fragment_size": 120,
        "number_of_fragments": 2
      }
    }
  }
}
```

응답은 `_source.body`를 수정하지 않고 hit에 별도 배열을 추가한다. Match fragment가 없는 field는 `highlight` object에 없을 수 있으므로 client는 optional field로 처리한다.

```json
"highlight": {
  "body": [
    "...<mark>분산</mark> 환경의 검색 요청..."
  ]
}
```

## 원문과 offset을 얻는 방법

Highlighter는 stored field나 `_source`에서 실제 문자열을 읽는다. Lexical highlighter는 term의 시작과 끝 offset을 찾고, semantic highlighter는 offset 대신 model inference를 사용한다.

| 방식 | Mapping | 비용과 용도 |
|---|---|---|
| 원문 재분석 | 추가 설정 없음 | hit와 field마다 작은 in-memory index를 만들어 query를 다시 실행한다. 짧은 field와 작은 결과에 적합하다. |
| Postings offset | `index_options: offsets` | `unified`가 역색인의 offset을 사용한다. 큰 본문 재분석을 줄이지만 index가 커진다. |
| Term vector | `term_vector: with_positions_offsets` | `unified`와 `fvh`가 사용한다. 더 많은 index 공간을 쓰며 `fvh`에는 필수다. |
| Model inference | 배포된 highlight model | `semantic`이 lexical offset 없이 관련 문장이나 passage를 고른다. |

검색 요청에서 `_source: false`로 응답 원문을 숨겨도 mapping에 저장된 `_source`는 highlight에 사용될 수 있다. `force_source: true`는 stored field보다 `_source`를 강제로 읽으므로 mapping에서 `_source`를 끈 index에는 사용하지 않는다.

## Highlighter 선택

| Type | 선택 기준 | 제약 |
|---|---|---|
| `unified` | 기본값. Phrase와 fuzzy, prefix, regex를 포함한 일반 lexical highlight | Postings offset과 term vector가 있으면 단독 또는 조합해 사용하고, 둘 다 없으면 재분석한다. |
| `plain` | Query의 term 중요도와 phrase position을 재현해야 하는 짧은 field | 항상 원문을 재분석하므로 큰 field와 많은 hit에서 비싸다. |
| `fvh` | `matched_fields`, phrase match 가중과 FVH fragment 기능이 필요할 때 | `with_positions_offsets` term vector가 필수고 span query를 지원하지 않는다. |
| `semantic` | Exact term이 없어도 의미상 관련된 문장이나 passage를 표시할 때 | OpenSearch 3.0 이상과 배포된 `model_id`가 필요하고 inference 비용이 든다. |

`semantic` single inference는 document마다 model을 호출한다. OpenSearch 3.3 이상의 batch mode는 여러 document를 묶지만 batch를 지원하는 externally hosted model과 별도 설정이 필요하다. Lexical highlight의 단순 대체로 켜지 않는다.

## Fragment와 field 옵션

전역 `highlight` 옵션을 각 field가 상속하며 field-level 설정이 같은 이름의 전역 설정을 덮어쓴다.

| 옵션 | 의미와 기본값 |
|---|---|
| `require_field_match` | 기본 `true`. Query가 해당 field에 match한 경우만 강조한다. |
| `fragment_size` | Fragment당 문자 수, 기본 100 |
| `number_of_fragments` | 최대 fragment 수, 기본 5. `0`이면 field 전체를 반환한다. |
| `order` | 기본 `none`. `score`는 fragment를 highlighter별 relevance로 정렬한다. |
| `no_match_size` | Match fragment가 없을 때 field 앞부분을 반환할 문자 수, 기본 0 |
| `boundary_scanner` | `unified`와 `fvh`의 sentence 또는 word 경계 제어 |
| `force_source` | Stored field 대신 `_source`에서 원문을 읽는다. |
| `max_analyzer_offset` | 요청에서 재분석할 문자 범위를 index 한도보다 낮게 제한한다. |

`number_of_fragments: 0`은 `fragment_size`를 무시하고 field 전체를 반환하므로 목록 API의 payload 제한으로 쓰면 안 된다. 한국어 문장 경계는 analyzer가 아니라 `boundary_scanner`와 locale의 영향을 받으므로 실제 corpus로 fragment를 확인한다.

## 다른 query와 field의 match 결합

### `highlight_query`

`highlight_query`는 표시할 term을 고르는 query만 바꾸며 hit 선택에는 영향을 주지 않는다. Candidate query 뒤에 `rescore_query`를 적용하는 경우처럼 최종 ranking 근거를 snippet에 반영할 때 사용한다. 표시 기준이 검색 기준과 어긋나지 않도록 원 검색 query도 `highlight_query`에 포함한다.

### `matched_fields`

같은 원문을 서로 다른 analyzer로 색인한 multi-field의 match를 대표 field 하나에 합친다. `unified`와 `fvh`에서 지원하며 `fvh`는 `matched_fields`의 모든 field에 `term_vector: with_positions_offsets`가 필요하다.

### `require_field_match`

기본값 `true`는 query가 match한 field만 강조한다. `false`는 다른 field가 hit를 만들었어도 highlight 대상 field를 검사하므로 multi-field snippet에는 유용하지만 field 수와 비용을 함께 늘릴 수 있다.

## HTML 렌더링

`encoder: html`은 원문을 먼저 HTML escape한 뒤 `pre_tags`와 `post_tags`를 삽입한다. Server에서 `<mark>`처럼 고정한 tag만 사용하고 API 사용자가 tag나 `encoder`를 임의로 정하지 못하게 한다.

- Highlight fragment는 tag가 포함된 HTML이므로 신뢰된 고정 tag만 허용하는 renderer를 사용한다.
- Fragment 전체를 다시 escape하면 tag도 문자열로 보이므로 원문 escape와 tag 렌더링 책임을 분리한다.
- `encoder: default`나 원문의 raw HTML을 렌더링해야 한다면 출력 context에 맞는 sanitization을 별도로 적용한다.

## 비용과 제한

- 비용은 대체로 반환 hit 수, highlight field 수와 원문 길이가 함께 커질수록 증가한다.
- 큰 본문은 먼저 `unified`와 `index_options: offsets`를 검토한다. FVH 전용 기능이 필요할 때 term vector 비용을 지불한다.
- 기존 text field의 `index_options`와 `term_vector`는 제자리에서 바꿀 수 없다. 원하는 mapping의 새 index를 만들고 reindex한다.
- `index.highlight.max_analyzed_offset`의 기본값은 1,000,000자다. 재분석이 이 한도를 넘으면 오류가 날 수 있다.
- 더 낮은 요청 `max_analyzer_offset`으로 분석 범위를 제한하면 오류를 피할 수 있지만 뒤쪽 match가 누락될 수 있다.
- FVH의 `phrase_limit` 기본값은 256이고 값을 높이면 query time과 memory가 증가한다.
- 복잡한 Boolean query, nested Boolean과 `minimum_should_match`에서는 실제 match 조건과 무관한 term도 표시될 수 있다.

Highlight는 사용자 설명용 snippet이지 query match의 감사 증거가 아니다. 이상한 강조는 `_analyze`, `_explain`과 실제 query 구조를 함께 확인한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Mapping-Text-Analysis|매핑과 analyzer]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
- [[OpenSearch-Search-Features|검색 기능과 응답 field]]
- [[OpenSearch-Inner-Hits|nested와 parent-child 내부 highlight]]
- [[OpenSearch-Segment-Merge|stored field 압축과 fetch 비용]]

## 출처

- [Highlight query matches - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/highlight/)
- [Index options - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/index-options/)
- [Term vector - OpenSearch Documentation](https://docs.opensearch.org/latest/field-types/mapping-parameters/term-vector/)
- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Highlight fetch phase - OpenSearch source](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/search/fetch/subphase/highlight/HighlightPhase.java)
- [Cross Site Scripting Prevention - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
