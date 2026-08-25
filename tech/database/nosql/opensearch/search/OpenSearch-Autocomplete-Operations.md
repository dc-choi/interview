---
tags: [database, search, opensearch, autocomplete, operations, security]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Autocomplete Operations", "OpenSearch 자동완성 운영"]
---

# OpenSearch 자동완성 운영과 검증

[[OpenSearch-Autocomplete|자동완성 설계]]에서 분리한 운영 정본이다. 구현 방식 선택은 부모 문서가 다루고, 여기서는 후보 데이터의 분리 기준, 권한과 노출 경계, 도입 전 검증 체크리스트를 다룬다.

## 후보 데이터와 운영 경계

- 원본 문서와 생성, 수정, 삭제 주기가 같으면 같은 index의 multi-field나 `search_as_you_type`으로 시작한다.
- 인기 검색어, 운영자 추천어, weight와 만료 주기가 다르면 suggestion 전용 index로 분리한다.
- Suggestion 문서는 표시 문자열, 정규화 key, 대상 ID와 유형, locale, weight를 분리한다.
- 사용자 검색 로그는 최소 빈도, 최신성, 중복, 금칙어와 민감 정보 필터를 통과한 후보만 반영한다.
- 문서 검색 방식은 본 검색과 같은 server-side 권한 filter를 적용한다.
- Completion의 top-level `suggest`는 일반 query와 filter가 후보를 제한하지 않는다. 비공개 후보는 tenant나 접근 등급별 index로 분리하거나, 공식 DLS 문서가 suggester 동작을 명시하지 않으므로 target 환경에서 직접 검증한 DLS만 사용하고, 다른 권한의 후보가 나오지 않는 negative integration test를 둔다.
- 입력마다 요청되므로 client debounce와 최소 글자 수, server rate limit을 함께 둔다.
- 실패해도 검색 입력 자체를 막지 말고 suggestion을 숨기거나 인기 검색어로 대체한다.

## 검증 체크리스트

- 대표 입력마다 `_analyze` 결과와 실제 후보를 snapshot으로 남긴다.
- 한 글자, 긴 입력, 띄어쓰기, 한글 한 음절 오타와 zero-result 입력을 포함한다.
- 같은 query set으로 relevance와 후보 중복, p95 latency를 비교한다.
- Edge n-gram과 `search_as_you_type`은 index 크기와 색인 처리량을 함께 측정한다.
- Completion 메모리와 refresh 이후 노출 시점, 다른 권한 후보의 부재, 실제 keystroke QPS의 debounce와 rate limit을 함께 검증한다.

## 관련 문서

- [[OpenSearch-Autocomplete|자동완성 설계]]
- [[OpenSearch-Popular-Keywords-TopK|인기 검색어 후보와 weight]]
- [[OpenSearch-Search-API-Layer|검색 API 보호와 폴백]]
- [[OpenSearch|OpenSearch 학습 지도]]

## 출처

- [OpenSearch Documentation, Autocomplete functionality](https://docs.opensearch.org/latest/search-plugins/searching-data/autocomplete/)
- [OpenSearch Documentation, Document-level security](https://docs.opensearch.org/latest/security/access-control/document-level-security/)
- [OpenSearch Documentation, Search-as-you-type field type](https://docs.opensearch.org/latest/mappings/supported-field-types/search-as-you-type/)
- [OpenSearch Documentation, Completion field type](https://docs.opensearch.org/latest/mappings/supported-field-types/completion/)
- [CompletionSuggester.java — OpenSearch 2.19 소스, suggest와 query/filter의 독립 실행](https://github.com/opensearch-project/OpenSearch/blob/2.19/server/src/main/java/org/opensearch/search/suggest/completion/CompletionSuggester.java)
- [OpenSearch Documentation, Refresh API](https://docs.opensearch.org/latest/api-reference/index-apis/refresh/)
