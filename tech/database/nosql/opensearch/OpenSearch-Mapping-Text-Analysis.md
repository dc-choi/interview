---
tags: [database, search, opensearch, mapping, analyzer, cjk]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Mapping", "OpenSearch Text Analysis", "OpenSearch 매핑과 분석기"]
---

# OpenSearch 매핑과 텍스트 분석

검색 품질과 운영 안정성은 쿼리보다 먼저 매핑에서 결정된다. 매핑은 필드 타입, 역색인 생성 방식, 정렬과 집계 가능 여부, 텍스트를 term으로 바꾸는 분석기를 고정한다.

## Dynamic mapping을 운영 스키마로 착각하지 않기

Dynamic mapping은 첫 문서의 JSON 값을 보고 필드를 자동 추가한다. 빠른 실험에는 편하지만 첫 값이 이후 스키마를 잘못 고정하거나 필드가 끝없이 늘어날 수 있다.

기본값은 `true`다. 새 문자열은 보통 `text`와 `keyword` multi-field가 되지만 날짜 감지에 걸리면 `date`가 될 수 있고 숫자 문자열 감지는 기본적으로 꺼져 있다. 자동 생성된 `keyword` subfield에는 기본 `ignore_above: 256`이 적용된다.

| `dynamic` 값 | 새 필드 동작 | 적합한 경우 |
|---|---|---|
| `true` | 자동으로 매핑 추가 | 탐색용 데이터와 짧은 실험 |
| `false` | `_source`에는 보관하지만 색인하지 않음 | 알 수 없는 부가 필드 보존 |
| `strict` | 문서 색인 실패 | 계약이 명확한 도메인 인덱스 |
| `strict_allow_templates` | template에 맞는 필드만 추가 | 2.16 이상, 통제된 확장 스키마 |
| `false_allow_templates` | template 밖 필드는 `_source`에만 보관 | 3.3 이상, 선택적 확장 스키마 |

운영에서는 핵심 필드를 explicit mapping으로 정의하고, 허용되는 확장은 `dynamic_templates`로 제한한다. 날짜처럼 보이는 문자열의 자동 감지와 긴 문자열의 `.keyword` 누락도 실제 샘플로 검증한다.

## Mapping explosion

동적 JSON key에 사용자 ID, 날짜, 임의 속성명을 넣으면 field metadata가 계속 증가한다. 결과는 cluster state 비대화, heap 증가, 느린 mapping update, 복구 지연이다.

방어 순서:

1. Key를 필드명이 아니라 `key`, `value` 데이터로 모델링한다.
2. 핵심 schema는 `dynamic: strict`로 닫는다.
3. 허용 패턴은 dynamic template으로 명시한다.
4. 검색하지 않는 임의 JSON은 `flat_object`를 검토한다.
5. `index.mapping.total_fields.limit` 등 mapping limit을 안전망으로 둔다.

Limit 상향은 schema 문제를 해결하지 않고 장애 시점을 늦출 뿐이다.

## 필드 타입 선택

| 요구사항 | 권장 타입 |
|---|---|
| 자연어 제목과 본문 검색 | `text` |
| ID, 상태, 코드, 태그, exact filter | `keyword` |
| 같은 문자열로 검색과 정렬, 집계 | `text`와 `keyword` multi-field |
| 숫자 비교와 정렬 | 충분한 범위의 numeric 타입 |
| 시간 범위와 histogram | `date` |
| 객체 배열 원소 간 관계 불필요 | `object` |
| 객체 배열의 같은 원소 조건 보존 | `nested` |
| 미리 알 수 없는 부가 속성 보관 | `flat_object`, 2.7 이상 |
| substring과 정규식이 주 요구 | `wildcard`, 2.15 이상 검토 |

### `text`와 `keyword`

- `text`는 analyzer로 입력을 term으로 분해하며 full-text query에 사용한다.
- `keyword`는 각 입력값 전체를 하나의 term으로 색인하고 기본 `doc_values`로 exact filter, sort, aggregation을 처리한다.
- `text`는 `doc_values`를 지원하지 않는다. `fielddata: true`로 token을 heap에 올릴 수 있지만 메모리 비용이 크고 분석된 token 기준이다.
- 원문 단위 정렬과 집계는 `.keyword` multi-field를 기본으로 사용한다.

### `object`, `nested`, `flat_object`

```json
{
  "patients": [
    {"age": 85, "smoker": false},
    {"age": 56, "smoker": true}
  ]
}
```

일반 `object`는 내부 값을 dot path로 평탄화한다. 따라서 `age >= 75 AND smoker = true`가 서로 다른 배열 원소의 값을 조합해 잘못 매칭할 수 있다.

- 같은 원소의 관계가 중요하면 `nested`를 쓰고 `nested` query를 사용한다.
- `nested`는 각 원소를 내부 문서로 저장하므로 문서 수와 쿼리 비용이 늘어난다.
- `flat_object`는 field 수를 줄이지만 typed range, 분석, 정렬, 집계 능력이 제한된다.
- 자주 조회하는 속성은 typed field로 승격하고 나머지만 `flat_object`에 둔다.

## 저장 구조 세 가지

| 구조 | 방향 | 용도 |
|---|---|---|
| Inverted index | term에서 document 찾기 | 검색과 filter |
| `doc_values` | document에서 field value 읽기 | 정렬, 집계, script |
| `_source` | 원본 JSON | 응답, update, reindex, 디버깅 |

`_source`를 끄면 저장 공간은 줄지만 update와 reindex, 장애 분석이 크게 제한된다. 응답 크기가 문제라면 mapping에서 제거하기 전에 요청별 `_source` filtering을 사용한다.

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

필터 순서는 결과를 바꾼다. 동의어 규칙이 소문자라면 보통 lowercase가 synonym보다 앞에 있어야 한다. 추측하지 말고 `_analyze` 결과를 테스트한다.

## Index analyzer와 Search analyzer

기본 원칙은 양쪽을 같게 두어 동일한 term 공간을 만드는 것이다. 다르게 두는 대표 사례는 autocomplete다.

- 색인 시 edge n-gram으로 여러 prefix를 만든다.
- 검색 시 일반 analyzer로 query를 한 번만 분석한다.
- query에도 edge n-gram을 적용하면 term이 다시 팽창해 오탐과 비용이 늘어난다.

기존 필드의 index-time `analyzer`는 Update Mapping API로 바꿀 수 없고 이미 생성된 term을 바꾸려면 새 인덱스 생성, reindex, alias 전환이 필요하다. Query-time `search_analyzer` 변경은 기존 term을 다시 만들지 않으므로 별도로 판단한다.

## Normalizer

Normalizer는 `keyword` 값을 하나의 token으로 유지하면서 lowercase, trim, folding 등을 적용한다. `_source` 원문은 그대로다.

적합한 예:

- 대소문자를 무시하는 코드와 이메일
- canonical tag와 상태 값
- 공백과 Unicode 표기를 정규화한 exact filter

동의어와 stemming처럼 여러 token을 만들 수 있는 처리는 normalizer에서 지원하지 않는다.

## 한국어와 CJK

공식 문서에서 직접 확인할 수 있는 기본 선택지는 다음과 같다.

- `standard`: Unicode word boundary와 lowercase 기반
- `cjk`: 한중일 문자를 겹치는 bigram으로 분리
- `icu_analyzer`: ICU plugin이 필요하며 CJK와 복합 문자의 경계와 정규화를 개선할 수 있음

공식 문서는 CJK word boundary detection에서 `icu_analyzer`가 `cjk`의 bigram 방식보다 정확하다고 설명한다. 대신 ICU는 CPU와 메모리를 더 사용할 수 있으므로 실제 corpus에서 token, 검색 품질, 색인 비용을 함께 비교한다.

한국어 형태소 분석이 필요하면 Nori plugin 지원 범위, 복합어 분해, 사용자 사전, 동의어와 회귀 테스트를 [[OpenSearch-Korean-Text-Analysis|Nori와 사전 운영]]에서 이어서 설계한다.

## 예시 매핑

```json
PUT products-v1
{
  "settings": {
    "analysis": {
      "normalizer": {
        "code_normalizer": {"type": "custom", "filter": ["lowercase", "trim"]}
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "id": {"type": "keyword"},
      "title": {
        "type": "text",
        "analyzer": "cjk",
        "fields": {"raw": {"type": "keyword"}}
      },
      "status": {"type": "keyword", "normalizer": "code_normalizer"},
      "created_at": {"type": "date"},
      "variants": {
        "type": "nested",
        "properties": {"sku": {"type": "keyword"}, "price": {"type": "integer"}}
      },
      "extra": {"type": "flat_object"}
    }
  }
}
```

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Query-Relevance|다음: Query DSL과 관련도]]
- [[OpenSearch-Korean-Text-Analysis|한국어 Nori와 사전 운영]], [[OpenSearch-Index-Lifecycle|매핑 변경과 reindex]]
- [[OpenSearch-Performance-Troubleshooting|Mapping explosion 진단]]

## 출처

- [Mappings - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/)
- [Dynamic mapping parameter - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/dynamic/)
- [Mapping explosion - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [Supported field types - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/index/)
- [Doc values - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/doc-values/)
- [Text analysis - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/)
- [CJK analyzer - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/language-analyzers/cjk/)
- [ICU analyzer - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/language-analyzers/icu/)
- [Analyze API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/analyze-apis/)
- [후기 서비스 AWS OpenSearch 도입기 - 컬리 기술 블로그](https://helloworld.kurly.com/blog/2023-review-opensearch/)
