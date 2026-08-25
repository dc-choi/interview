---
tags: [database, search, opensearch, query, requirements, relevance]
status: done
verified_at: 2026-08-13
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Query Requirement Classification", "검색 요구사항 분류"]
---

# 검색 요구사항을 쿼리 메커니즘으로 분류하기

"검색이 안 된다"는 한 문장이 같은 원인을 뜻하지는 않는다. 별칭, 시리즈 번호, 인물명, 제목 부분일치, 의미 연관 검색은 필요한 데이터와 검색 메커니즘이 다르다. 구현을 고르기 전에 기대 동작을 분류해야 동의어 사전이나 점수 조정에 모든 문제를 밀어 넣지 않는다.

## 다섯 가지 요구 유형

| 유형 | 사용자의 기대 | 먼저 확인할 것 | 주된 해결 축 |
|---|---|---|---|
| 별칭 | 약칭이나 다른 표기로 같은 대상을 찾음 | 별칭의 범위와 관리 주체 | 동의어 또는 별칭 필드 |
| 시리즈와 서수 | 제목 뒤 숫자로 특정 편이나 시리즈를 찾음 | 공식 순서, 리부트와 분할편 규칙 | 정규화와 시리즈 도메인 데이터 |
| 엔티티 | 인물, 장르, 브랜드로 관련 대상을 찾음 | 어떤 엔티티를 반환할지 | 엔티티 색인 또는 관계 기반 조회 |
| 문자열 부분일치 | 검색어가 제목 일부에 실제로 포함됨 | analyzer가 후보를 만들 수 있는지 | n-gram, prefix와 필드 설계 |
| 의미 연관 | 검색어가 제목에 없어도 개념적으로 관련된 결과를 기대 | 검색인지 추천인지, 정답 기준 | 큐레이션, 벡터 또는 하이브리드 검색 |

겉으로 비슷해도 요구를 섞지 않는다. 예를 들어 제목에 검색어가 포함된 케이스는 의미 검색이 아니라 렉시컬 부분일치 문제다. 인물명으로 작품을 찾는 요구는 인물명 동의어를 제목 필드에 계속 추가하는 것보다 엔티티 관계를 모델링하는 편이 자연스럽다.

## 도달성과 순위를 먼저 나눈다

가장 먼저 물을 질문은 "정답 문서가 후보 집합에 들어왔는가"다.

- 후보에 없다면 mapping, analyzer, query clause, 데이터 누락을 고친다.
- 후보에는 있지만 너무 낮다면 BM25, field boost, `function_score`와 rescore를 조정한다.
- 정답 기준이 합의되지 않았다면 구현보다 golden set 정의가 먼저다.

OpenSearch의 `function_score`는 query가 반환한 문서의 점수를 다시 계산한다. 점수 조정만으로 query가 찾지 못한 문서를 새 후보로 만들 수는 없다. 따라서 recall 문제를 ranking 문제로 오진하면 boost를 계속 키워도 해결되지 않는다.

## 메커니즘 선택 기준

### 별칭과 동의어

같은 대상을 가리키는 제한된 표기 변형에 쓴다. 등록 주체, 검수, 만료 정책이 없으면 사전이 누적되어 오검색 원인을 추적하기 어려워진다. 시리즈 전 작품의 숫자 표기나 인물과 작품 관계까지 동의어로 표현하지 않는다.

### 정규화와 도메인 데이터

띄어쓰기, 대소문자와 문자 뒤 숫자 같은 표면 변형은 query 정규화 후보이다. 그러나 "2"가 두 번째 공개작, 시즌, 파트 또는 제목 일부 중 무엇인지 결정하는 일은 analyzer가 아니라 도메인 규칙이다.

### 부분일치

`ngram`은 token을 작은 부분 문자열로 나눠 부분일치 후보를 늘린다. Recall을 넓히는 대신 index 크기, query 비용과 오검색도 늘 수 있으므로 최소 길이와 적용 필드를 golden set으로 검증한다. 정확한 식별자나 분류값은 analyzed `text`가 아니라 `keyword` 계열 필드의 term-level query가 맞다.

### 엔티티와 의미 검색

인물, 장르와 브랜드는 제목의 다른 표기가 아니라 별도 엔티티다. 반환 계약과 관계 데이터부터 정의한다. 의미 연관 검색은 제품 범위와 평가 기준이 준비된 뒤 검토하며, 소수 예시만으로 벡터 인프라를 먼저 도입하지 않는다.

## 진단 순서

1. 검색어별 기대 결과와 제외 결과를 적는다.
2. 각 케이스를 별칭, 서수, 엔티티, 부분일치, 의미 연관으로 분류한다.
3. mapping과 `_analyze`로 index/query token을 확인한다.
4. 정답 문서의 직접 조회와 `_explain`으로 후보 도달 여부를 확인한다.
5. 도달하지 않으면 데이터와 retrieval을, 도달했으면 ranking을 고친다.
6. 유형별 golden set으로 recall과 상단 순위를 따로 회귀 검증한다.

## 관련 문서

- [[OpenSearch-Query-Understanding|쿼리 이해와 정규화]]
- [[OpenSearch-Autocomplete|edge n-gram과 ngram 구현]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도 진단]]
- [[OpenSearch-Relevance-Tuning|랭킹 튜닝]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가와 golden set]]

## 출처

- [OpenSearch Documentation, Query DSL](https://docs.opensearch.org/latest/query-dsl/)
- [OpenSearch Documentation, Match query](https://docs.opensearch.org/latest/query-dsl/full-text/match/)
- [OpenSearch Documentation, Term-level queries](https://docs.opensearch.org/latest/query-dsl/term/index/)
- [OpenSearch Documentation, Function score](https://docs.opensearch.org/latest/query-dsl/compound/function-score/)
- [OpenSearch Documentation, N-gram token filter](https://docs.opensearch.org/latest/analyzers/token-filters/ngram/)
