---
tags: [database, search, opensearch, analyzer, nori, synonym]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Korean Analysis", "OpenSearch 한국어 분석", "Nori 분석기"]
---

# OpenSearch 한국어 텍스트 분석과 사전 운영

한국어 렉시컬 검색 품질은 형태소 분석기 하나로 결정되지 않는다. 문서와 검색어를 같은 term 공간으로 바꾸는 analyzer, 도메인 단어의 경계를 정하는 사용자 사전, 의미 관계를 확장하는 동의어, 실제 검색 결과를 검증하는 평가 corpus가 함께 맞아야 한다.

## Analyzer의 실행 모델

```text
원문
  -> character filter 0개 이상
  -> tokenizer 정확히 1개
  -> token filter 0개 이상
  -> token, position, offset
```

- Character filter는 HTML 제거, 문자 치환과 표기 정규화를 담당한다.
- Tokenizer는 문자 흐름을 token으로 나누고 position과 offset을 만든다.
- Token filter는 token을 제거하거나 변환하고 동의어 token을 추가한다.

분석 순서는 검색 동작을 바꾼다. 예를 들어 lowercase 뒤에 동의어를 적용할 때는 동의어 규칙도 소문자 분석 결과와 맞아야 한다. 특수문자를 먼저 제거하면 `C++`와 `C`가 같은 token으로 무너질 수도 있다.

## Index analyzer와 Search analyzer

Index analyzer는 문서를 역색인의 term으로 바꾼다. Search analyzer는 `match` 같은 full-text query의 입력을 term으로 바꾼다. 기본값은 같은 analyzer지만 다음처럼 의도적으로 분리할 수 있다.

| 요구 | Index analyzer | Search analyzer |
|---|---|---|
| 일반 본문 검색 | 같은 형태소와 정규화 규칙 | 같은 형태소와 정규화 규칙 |
| 자동완성 | edge n-gram 생성 | 일반 token만 생성 |
| 동의어를 자주 변경 | 원래 term을 보존 | `synonym_graph`로 query 확장 |
| Phrase에서 불용어 보존 | 불용어 보존 | 일반 검색과 phrase용 analyzer 분리 검토 |

두 analyzer가 같아야 한다는 규칙보다 최종 term과 position이 의도대로 만나는지가 중요하다.

## Nori의 역할과 경계

Nori는 Lucene의 한국어 형태소 분석 모듈을 OpenSearch의 `analysis-nori` plugin으로 제공한다. Self-managed cluster에서는 모든 관련 node에 같은 버전의 plugin을 설치하고 재시작해야 한다. Amazon OpenSearch Service 지원표에는 provisioned domain의 Nori가 OpenSearch 1.3 이상, Seunjeon이 1.0 이상으로 구분되어 있고 Serverless 지원 목록에는 Nori가 포함된다. Engine과 배포 방식마다 지원 범위가 다르므로 실제 domain은 `_cat/plugins`로 확인하고 두 plugin의 설정을 서로 바꾸어 쓰지 않는다.

| 구성 | 역할 | 핵심 판단 |
|---|---|---|
| `nori_tokenizer` | 한국어 형태소와 복합어 분해 | `decompound_mode`, 사용자 사전, 구두점 처리 |
| `nori_part_of_speech` | 지정한 품사 token 제거 | `stoptags` 생략 시 기본 제거 목록 적용 |

`decompound_mode`는 복합어를 어떻게 보존할지 결정한다.

- `none`: 원형 복합어를 유지한다.
- `discard`: 복합어를 버리고 분해된 token만 남긴다.
- `mixed`: 원형과 분해 token을 함께 남긴다.

`mixed`는 recall을 늘릴 수 있지만 term 수와 오탐도 늘린다. 상품명, 인물명, 일반 본문을 같은 설정으로 처리하기보다 field별 analyzer를 비교한다.

## 사용자 사전, 동의어, 불용어는 목적이 다르다

| 장치 | 해결하는 문제 | 예시 |
|---|---|---|
| 사용자 사전 | 잘못된 token 경계와 복합어 분해 | 도메인 고유명사를 하나의 token으로 유지 |
| 동의어 | 서로 다른 표현의 검색 연결 | 약어와 정식 명칭, 구명칭과 신명칭 |
| 불용어와 품사 제거 | 순위 신호가 약한 token 제거 | 조사와 어미 일부 |
| 별도 exact field | 기호와 공백을 포함한 식별자 보존 | `C++`, 모델 코드, 상품 번호 |

사용자 사전은 의미가 같은 단어를 연결하지 않고 token 경계만 바꾼다. 동의어는 경계를 고치지 않는다. `C++` 같은 표현은 형태소 사용자 사전에만 맡기지 말고 정규화된 `keyword` field나 별도 exact field를 함께 검토한다.

동의어 규칙도 방향을 구분한다.

- `A, B`: 두 표현을 동등한 그룹으로 확장한다.
- `A => B`: A를 B로 단방향 치환한다.
- 여러 단어 표현은 query-time `synonym_graph`가 position 관계를 더 정확히 보존한다.

산업마다 같은 단어의 의미가 다르므로 사전은 전역 파일보다 도메인과 index template 단위로 versioning한다.

## Nori analyzer 예시

```json
PUT korean-docs-v1
{
  "settings": {
    "analysis": {
      "tokenizer": {
        "ko_nori": {
          "type": "nori_tokenizer",
          "decompound_mode": "mixed",
          "user_dictionary_rules": ["오픈서치", "검색랭킹"]
        }
      },
      "filter": {
        "ko_pos": {
          "type": "nori_part_of_speech",
          "stoptags": ["E", "J"]
        },
        "domain_synonyms": {
          "type": "synonym_graph",
          "lenient": false,
          "synonyms": ["오픈서치, opensearch"]
        }
      },
      "analyzer": {
        "ko_index": {
          "type": "custom",
          "tokenizer": "ko_nori",
          "filter": ["lowercase", "ko_pos"]
        },
        "ko_search": {
          "type": "custom",
          "tokenizer": "ko_nori",
          "filter": ["lowercase", "ko_pos", "domain_synonyms"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ko_index",
        "search_analyzer": "ko_search"
      }
    }
  }
}
```

예시의 `stoptags`와 사전 단어를 그대로 운영 기본값으로 쓰지 않는다. `stoptags`는 유지 목록이 아니라 제거할 품사 목록이며 단어 기반 stopword와도 다르다. 품사를 제거하면 phrase, 제목과 고유명사의 구분 신호를 잃을 수 있다.

작은 사전은 `user_dictionary_rules`로 version 관리할 수 있다. `user_dictionary`와 동시에 지정할 수 없고 `discard_punctuation` 기본값은 `true`다. 큰 파일의 배포 방식은 self-managed와 관리형 서비스가 다르므로 현재 engine과 package 지원 범위를 확인한다.

## Analyze API와 Term Vectors API

| API | 확인 대상 | 용도 |
|---|---|---|
| `_analyze` | 주어진 문자열의 분석 결과 | analyzer 후보 비교, index와 search token 확인 |
| `_termvectors` | 문서나 요청한 가상 문서의 term-vector 표현 | 빈도, position, offset과 통계 진단 |

```json
POST korean-docs-v1/_analyze
{
  "analyzer": "ko_search",
  "text": "오픈서치를 사용할 수 있습니다",
  "explain": true
}
```

`explain: true`로 단계별 token 변화를 확인한다. Token 문자열뿐 아니라 position, `positionLength`, start와 end offset을 본다. Phrase query와 highlight는 이 metadata에 영향을 받는다.

```json
GET korean-docs-v1/_termvectors/42
{
  "fields": ["title"],
  "positions": true,
  "offsets": true,
  "term_statistics": true
}
```

Term Vectors의 `per_field_analyzer`는 지정한 analyzer로 term-vector를 생성하거나 재생성하며 postings 자체를 직접 조회하거나 역색인을 바꾸지 않는다. 저장된 색인 상태는 mapping, `_analyze`, 실제 query와 `_explain`을 함께 사용해 진단한다.

## 사전 변경과 재색인

- Tokenizer, index analyzer, index-time 사용자 사전과 동의어를 바꿔도 기존 term은 변하지 않는다. Index close와 open도 기존 문서를 다시 분석하지 않는다.
- 새 index를 만들고 reindex한 뒤 alias를 전환한다.
- 파일 기반 search-time 동의어는 ISM plugin, `updateable: true`와 refresh search analyzer API를 지원하는 환경에서 재색인 없이 갱신할 수 있다.
- 검색 시점 변경도 즉시 전체 query 결과를 바꾸므로 canary와 rollback 가능한 사전 version이 필요하다.

권장 배포 순서는 `사전 변경 -> _analyze 회귀 테스트 -> shadow index 또는 search analyzer canary -> relevance 평가 -> alias나 설정 전환`이다.

## 품질 개선 루프

1. Exact 이름, 띄어쓰기 변형, 조사 변형, 약어, 영문 혼용, 오타 query를 bucket으로 나눈다.
2. 각 query에 기대 hit와 나오면 안 되는 문서를 기록한다.
3. `_analyze`로 index와 search token 차이를 확인한다.
4. `_termvectors`, `_explain`과 highlight로 실제 문서를 진단한다.
5. 사전, 동의어, query 구조를 한 번에 하나씩 바꾼다.
6. nDCG, Precision과 zero-result 비율뿐 아니라 p95와 색인 비용도 비교한다.

사전 크기나 token 수를 목표로 삼지 않는다. 도메인 query에서 관련 문서의 순위가 안정적으로 개선되는지가 목표다.

## 관련 문서

- [[OpenSearch-Mapping-Text-Analysis|매핑과 analyzer 기본 구조]]
- [[OpenSearch-Query-Relevance|BM25와 lexical relevance]]
- [[OpenSearch-Hybrid-Search|렉시컬과 시맨틱 결과 결합]]

## 출처

- [Amazon OpenSearch Service로 검색 구현하기 - YouTube](https://www.youtube.com/watch?v=2Swr59CkA_w)
- [AWS OpenSearch 검색 기능 정리 - YouTube](https://www.youtube.com/watch?v=YyF2vBhFlAY)
- [Text analysis - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/)
- [Analyze API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/analyze-apis/)
- [Term vectors - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/termvector/)
- [Synonym graph token filter - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/token-filters/synonym-graph/)
- [Refresh search analyzer - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/refresh-analyzer/)
- [Additional plugins - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/additional-plugins/)
- [Nori tokenizer implementation - OpenSearch](https://github.com/opensearch-project/OpenSearch/blob/main/plugins/analysis-nori/src/main/java/org/opensearch/index/analysis/NoriTokenizerFactory.java)
- [OpenSearch Service 지원 plugin - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-plugins.html), [OpenSearch Serverless 지원 plugin - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html)
- [OpenSearch Service custom package - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/custom-packages.html)
