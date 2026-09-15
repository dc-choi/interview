---
tags: [database, search, opensearch, lexical, semantic, hybrid, rrf]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 하이브리드 검색 — 실행 흐름과 score 기반 결합

하이브리드 검색은 lexical query와 semantic query가 만든 후보를 한 검색 결과로 결합한다. 키워드 일치와 의미 유사성은 서로 다른 실패 모드를 가지므로 한쪽을 다른 쪽의 상위 호환으로 보지 않고 query 유형별로 기여도를 평가한다.

이 문서의 semantic branch는 dense vector k-NN을 기준으로 한다. Semantic search는 더 넓은 개념이며 neural sparse search나 reranker도 포함할 수 있다.

## 세 검색 방식의 역할

| 방식 | 잘 찾는 것 | 대표 실패 |
|---|---|---|
| Lexical, BM25 | 정확한 이름, 코드, 희귀 term, phrase | 표현이 다른 같은 의미를 놓침 |
| Dense vector | Paraphrase, 자연어 의도, 유사 문맥 | 고유명사 혼동, 넓은 의미의 오탐 |
| Hybrid | 두 후보군의 상호 보완 | 후보 수, 점수 결합과 weight tuning 필요 |

`코끼리 식당`이 상호명이라면 lexical signal이 강하다. 코끼리 그림이 있는 식당을 자연어로 묘사한 query라면 semantic signal이 기여할 수 있다. 정답은 알고리즘 이름이 아니라 사용자 의도와 relevance judgment가 결정한다.

## OpenSearch 실행 흐름

```text
검색 요청
  -> hybrid query의 하위 query를 shard별 실행
       ├── match 또는 multi_match
       └── knn 또는 neural query
  -> 각 하위 query의 후보와 score 수집
  -> coordinating node의 search pipeline
       ├── score normalization과 combination
       └── 또는 rank fusion
  -> 전역 정렬과 fetch
```

문서는 하위 query 중 하나 이상에 match해야 후보가 된다. Search pipeline은 이미 회수된 후보의 score나 rank를 결합할 뿐 누락된 문서를 새로 찾지 않는다. Vector branch의 `k`와 각 shard의 후보 깊이가 너무 작으면 fusion weight를 높여도 해당 문서를 복원할 수 없다.

Native `hybrid` query는 같은 search hit에 대한 하위 query 신호를 합친다. 서로 다른 index에 같은 `_id`가 있어도 하나의 문서로 join하지 않는다. 같은 논리 문서의 native hybrid가 핵심이면 text와 vector field를 같은 index에 두는 구성이 단순하다.

## Score 기반 결합

BM25와 vector `_score`는 범위와 분포가 달라 raw score를 그대로 더하면 한쪽이 결과를 지배할 수 있다. `normalization-processor`는 각 하위 query score를 정규화한 뒤 결합한다.

현재 지원하는 대표 구성은 다음과 같다.

| 단계 | 선택지 | 특징 |
|---|---|---|
| Normalization | `min_max` | 해석이 쉽지만 후보의 최솟값, 최댓값과 이상값에 민감 |
| Normalization | `l2` | score vector의 크기로 정규화 |
| Normalization | `z_score` | 분포의 평균과 표준편차 사용, arithmetic mean만 지원 |
| Combination | `arithmetic_mean` | weight 의미가 직관적 |
| Combination | `geometric_mean` | 한 branch의 매우 낮은 값에 민감 |
| Combination | `harmonic_mean` | 낮은 score를 더 강하게 반영 |

정규화된 lexical score를 `L`, semantic score를 `S`라고 하면 weighted arithmetic mean은 다음 형태로 이해할 수 있다.

```text
final_score = w_lexical * L + w_semantic * S
w_lexical + w_semantic = 1
```

이 형태를 일반 검색 문헌에서 convex combination이라고 부를 수 있지만 `CC`는 OpenSearch processor 이름이 아니다. Weight는 관련도 확률이 아니며 같은 70:30도 후보와 score 분포에 따라 다르게 동작한다. 설정과 운영 문서에서는 `normalization-processor`, normalization technique, combination technique와 weights를 구체적으로 기록한다.

## Normalization pipeline 예시

```json
PUT /_search/pipeline/product-hybrid-v1
{
  "description": "Lexical and vector score fusion",
  "phase_results_processors": [
    {
      "normalization-processor": {
        "normalization": {"technique": "min_max"},
        "combination": {
          "technique": "arithmetic_mean",
          "parameters": {"weights": [0.7, 0.3]}
        }
      }
    }
  ]
}
```

Weights의 순서는 `hybrid.queries` 배열 순서와 같다. Query를 추가하거나 순서를 바꿀 때 pipeline contract도 함께 versioning한다.

```json
GET products-v1/_search?search_pipeline=product-hybrid-v1
{
  "size": 20,
  "query": {
    "hybrid": {
      "filter": {"term": {"status": "ACTIVE"}},
      "queries": [
        {"match": {"title": {"query": "코끼리 식당"}}},
        {
          "knn": {
            "embedding": {
              "vector": [0.12, -0.03, 0.44],
              "k": 100
            }
          }
        }
      ]
    }
  }
}
```

예시 vector는 3차원 mapping을 전제로 한다. 실제 dimension과 distance contract는 [[OpenSearch-Vector-Search|OpenSearch 벡터 검색]]에서 관리한다.


## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 — YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [AWS OpenSearch 검색 기능 정리 — YouTube](https://www.youtube.com/watch?v=YyF2vBhFlAY)
- [OpenSearch Documentation, Hybrid search](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/)
- [OpenSearch Documentation, Hybrid query](https://docs.opensearch.org/latest/query-dsl/compound/hybrid/)
- [OpenSearch Documentation, Normalization processor](https://docs.opensearch.org/latest/search-plugins/search-pipelines/normalization-processor/)

## 관련 문서

- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
- [[OpenSearch-Hybrid-Search-RRF-Filtering|RRF와 filter 배치]]
- [[OpenSearch-Hybrid-Search-Evaluation-Operations|평가 설계와 운영 체크포인트]]
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
