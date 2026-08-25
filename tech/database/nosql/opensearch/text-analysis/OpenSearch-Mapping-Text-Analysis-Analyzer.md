---
tags: [database, search, opensearch, analyzer, normalizer, cjk]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Text Analysis", "OpenSearch Analyzer", "OpenSearch 텍스트 분석"]
---

# OpenSearch 텍스트 분석 — analyzer, normalizer와 CJK

[[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조]]에서 분리한 텍스트 분석 정본이다. Raw text가 역색인 term이 되는 파이프라인, index와 search analyzer의 구분, `keyword`용 normalizer, CJK analyzer 선택을 다룬다.

## Analyzer 파이프라인

```text
raw text
  -> character filter 0개 이상
  -> tokenizer 정확히 1개
  -> token filter 0개 이상
  -> inverted index term
```

- Character filter: HTML 제거, 문자와 패턴 치환
- Tokenizer: 단어, 공백, 경로, edge n-gram 등의 기준으로 분리
- Token filter: lowercase, stopword, stemming, synonym, folding, shingle

필터 순서는 결과를 바꾼다. 실무에서는 동의어 규칙이 소문자라면 보통 lowercase를 synonym보다 앞에 두는 식인데, 순서 문제는 추측하지 말고 `_analyze` 결과로 확인한다.

## Index analyzer와 Search analyzer

기본 원칙은 양쪽을 같게 두어 같은 term 공간을 만드는 것이다. Query 시점의 analyzer는 query의 `analyzer` 파라미터, 필드의 `search_analyzer`, 인덱스의 `analysis.analyzer.default_search` 설정, 필드의 `analyzer`, `standard` 순서로 결정된다. 다르게 두는 대표 사례는 [[OpenSearch-Autocomplete|autocomplete]]다.

- 색인 시 edge n-gram으로 여러 prefix를 만든다.
- 검색 시 일반 analyzer로 query를 한 번만 분석한다.
- query에도 edge n-gram을 적용하면 term이 다시 팽창해 오탐과 비용이 늘어난다.

기존 필드의 index-time `analyzer`는 Update Mapping API로 바꿀 수 없고 이미 생성된 term을 바꾸려면 새 인덱스 생성, reindex, alias 전환이 필요하다. Query-time `search_analyzer` 변경은 기존 term을 다시 만들지 않으므로 별도로 판단한다.

## Normalizer

Normalizer는 `keyword` 값을 하나의 token으로 유지하면서 lowercase, trim, folding 등을 적용한다. `_source`는 원본 JSON을 보존하므로 분석 결과와 무관하게 그대로다.

적합한 예:

- 대소문자를 무시하는 코드와 이메일
- canonical tag와 상태 값
- 공백과 Unicode 표기를 정규화한 exact filter

동의어와 stemming처럼 여러 token을 만들 수 있는 처리는 normalizer에서 지원하지 않는다.

## 한국어와 CJK

현행(latest) 공식 문서 기준으로 확인한 기본 선택지는 다음과 같다. 2.19 문서에는 `icu_analyzer` 전용 페이지가 없고 additional plugin 목록에 `analysis-icu`만 있다.

- `standard`: Unicode word boundary와 lowercase 기반
- `cjk`: 한중일 문자를 겹치는 bigram으로 분리
- `icu_analyzer`: ICU plugin이 필요하며 CJK와 복합 문자의 경계와 정규화를 개선할 수 있음

공식 문서는 CJK word boundary detection에서 `icu_analyzer`가 `cjk`의 bigram 방식보다 정확하다고 설명한다. 대신 ICU는 CPU와 메모리를 더 사용할 수 있으므로 실제 corpus에서 token, 검색 품질, 색인 비용을 함께 비교한다.

한국어 형태소 분석이 필요하면 Nori plugin 지원 범위, 복합어 분해, 사용자 사전, 동의어와 회귀 테스트를 [[OpenSearch-Korean-Text-Analysis|Nori와 사전 운영]]에서 이어서 설계한다.

## 관련 문서

- [[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조]]
- [[OpenSearch-Korean-Text-Analysis|한국어 Nori와 사전 운영]]
- [[OpenSearch-Autocomplete|자동완성 설계]]
- [[OpenSearch|OpenSearch 학습 지도]]

## 출처

- [OpenSearch Documentation, Text analysis](https://docs.opensearch.org/latest/analyzers/)
- [OpenSearch Documentation 2.19, Analyzer mapping parameter](https://docs.opensearch.org/2.19/field-types/mapping-parameters/analyzer/)
- [OpenSearch Documentation 2.19, Search analyzers](https://docs.opensearch.org/2.19/analyzers/search-analyzers/)
- [OpenSearch Documentation 2.19, Normalizers](https://docs.opensearch.org/2.19/analyzers/normalizers/)
- [OpenSearch Documentation, Standard analyzer](https://docs.opensearch.org/latest/analyzers/supported-analyzers/standard/)
- [OpenSearch Documentation, CJK analyzer](https://docs.opensearch.org/latest/analyzers/language-analyzers/cjk/)
- [OpenSearch Documentation, ICU analyzer](https://docs.opensearch.org/latest/analyzers/language-analyzers/icu/)
- [OpenSearch Documentation, Analyze API](https://docs.opensearch.org/latest/api-reference/analyze-apis/)
- [OpenSearch Documentation 2.19, Put Mapping API](https://docs.opensearch.org/2.19/api-reference/index-apis/put-mapping/)
- [OpenSearch Documentation, _source metadata field](https://docs.opensearch.org/latest/field-types/metadata-fields/source/)
