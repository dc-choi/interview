---
tags: [database, search, opensearch, mapping, field-types]
status: done
verified_at: 2026-08-18
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Mapping", "OpenSearch 매핑"]
---

# OpenSearch 매핑과 저장 구조

검색 품질과 운영 안정성은 쿼리보다 먼저 매핑에서 결정된다. 매핑은 필드 타입, 역색인 생성 방식, 정렬과 집계 가능 여부와 저장 구조를 고정한다. 텍스트를 term으로 바꾸는 분석기 선택은 [[OpenSearch-Mapping-Text-Analysis-Analyzer|텍스트 분석]]에서 다룬다.

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

| 요구사항                         | 권장 타입                         |
| ---------------------------- | ----------------------------- |
| 자연어 제목과 본문 검색                | `text`                        |
| ID, 상태, 코드, 태그, exact filter | `keyword`                     |
| 같은 문자열로 검색과 정렬, 집계           | `text`와 `keyword` multi-field |
| 숫자 비교와 정렬                    | 충분한 범위의 numeric 타입            |
| 시간 범위와 histogram             | `date`                        |
| 객체 배열 원소 간 관계 불필요            | `object`                      |
| 객체 배열의 같은 원소 조건 보존           | `nested`                      |
| 미리 알 수 없는 부가 속성 보관           | `flat_object`, 2.7 이상         |
| substring과 정규식이 주 요구         | `wildcard`, 2.15 이상 검토        |

### `text`와 `keyword`

- `text`는 analyzer로 입력을 term으로 분해하며 full-text query에 사용한다.
- `keyword`는 각 입력값 전체를 하나의 term으로 색인하고 기본 `doc_values`로 exact filter, sort, aggregation을 처리한다.
- `text`는 `doc_values`를 지원하지 않는다. `fielddata: true`로 token을 heap에 올릴 수 있지만 메모리 비용이 크고 분석된 token 기준이다.
- 원문 단위 정렬과 집계는 `.keyword` multi-field를 기본으로 사용한다.
- 검색이 필요 없는 `keyword`는 `index: false`로 색인을 끄고 `doc_values`로만 정렬, 집계와 조회에 쓰면 디스크를 아낄 수 있다.
- 명시 mapping의 `ignore_above` 기본값은 2147483647로 dynamic subfield의 256과 다르다. 다만 `keyword`는 값 전체가 token 한 개라 32,766 byte를 넘는 값은 색인이 실패하므로, 긴 값이 올 수 있는 필드는 `ignore_above`를 직접 정해 초과 값을 색인 대상에서 제외한다. 단 `ignore_above`는 byte가 아니라 문자 수 기준이라, 문자당 최대 3 byte 환산으로 10922 이하면 byte 한도를 확실히 피한다. Elasticsearch 가이드는 보수적으로 32766/4 = 8191을 권고한다.
- 집계가 잦은 `keyword`는 `eager_global_ordinals`(기본 false)로 global ordinals 빌드를 refresh 시점으로 옮길 수 있지만, refresh가 느려지고 heap에 상주하는 트레이드오프다. 판단 기준은 [[OpenSearch-Inverted-Index-Structures|역색인 물리 구조]] 참고.

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

예시의 `cjk` analyzer와 `code_normalizer` 선택 근거는 [[OpenSearch-Mapping-Text-Analysis-Analyzer|텍스트 분석]] 참고.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Query-Relevance|다음: Query DSL과 관련도]]
- [[OpenSearch-Mapping-Text-Analysis-Analyzer|analyzer, normalizer와 CJK 텍스트 분석]]
- [[OpenSearch-Korean-Text-Analysis|한국어 Nori와 사전 운영]], [[OpenSearch-Index-Lifecycle|매핑 변경과 reindex]]
- [[OpenSearch-Performance-Troubleshooting|Mapping explosion 진단]]

## 출처

- [OpenSearch Documentation, Mappings](https://docs.opensearch.org/latest/mappings/)
- [OpenSearch Documentation, Dynamic mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/dynamic/)
- [OpenSearch Documentation, Mapping explosion](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [OpenSearch Documentation, Supported field types](https://docs.opensearch.org/latest/mappings/supported-field-types/index/)
- [OpenSearch Documentation, Doc values](https://docs.opensearch.org/latest/mappings/mapping-parameters/doc-values/)
- [OpenSearch Documentation 2.19, Keyword field type](https://docs.opensearch.org/2.19/field-types/supported-field-types/keyword/)
- [Elasticsearch Mapping Reference, ignore_above](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ignore-above)
- [OpenSearch Documentation 2.19, Analyzer mapping parameter](https://docs.opensearch.org/2.19/field-types/mapping-parameters/analyzer/)
- [후기 서비스 AWS OpenSearch 도입기 — 컬리 기술 블로그](https://helloworld.kurly.com/blog/2023-review-opensearch/)
