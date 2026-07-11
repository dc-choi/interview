---
tags: [database, search, opensearch, lexical, semantic, hybrid, rrf]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["OpenSearch Hybrid Search", "OpenSearch 하이브리드 검색"]
---

# OpenSearch 하이브리드 검색과 점수 결합

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

## Rank 기반 결합과 RRF

`score-ranker-processor`는 Reciprocal Rank Fusion을 사용한다. 각 branch의 절대 score 대신 순위를 `RRF(d) = sum(w_i / (rank_i(d) + C))` 형태로 결합한다.

- `rank_constant`가 작으면 각 branch의 최상위 결과 영향이 커진다.
- 값이 크면 순위 간 차이가 완만해진다.
- Score 분포가 query마다 흔들릴 때 raw scale에 덜 민감하다.
- 반대로 1위와 2위의 score 차이가 매우 커도 순위 차이로만 반영된다.

```json
PUT /_search/pipeline/product-hybrid-rrf-v1
{
  "phase_results_processors": [
    {
      "score-ranker-processor": {
        "combination": {
          "technique": "rrf",
          "rank_constant": 60,
          "parameters": {"weights": [0.7, 0.3]}
        }
      }
    }
  ]
}
```

RRF는 단순해서 기본값이라는 뜻이 아니다. Weighted score fusion과 RRF를 같은 query set에서 비교하고, query bucket별 최악 결과까지 본다.

## Filter의 위치

| 방식 | 실행 의미 | 사용 예 |
|---|---|---|
| `hybrid.filter` | 모든 하위 query에 공통 pre-filter | Tenant, ACL, 공개 상태, 판매 가능 여부 |
| 각 하위 query filter | Branch별 후보 생성 제약 | Engine별 k-NN filter 조건 |
| `post_filter` | Scoring 뒤 표시할 hit만 제거 | Query 전체 기준 facet은 유지하고 화면 결과만 제한 |

보안과 정합성 조건은 top-level pre-filter로 강제한다. `post_filter`는 이미 생성한 후보를 버리므로 부족한 결과 수나 낮아진 recall을 복원하지 못한다.

## Score 결합보다 먼저 볼 것

Lexical analyzer와 query 구조, embedding model과 k-NN filter를 각각 먼저 검증한다. 각 branch의 후보 깊이와 공통 ACL, source version을 확인한 뒤 normalization, weight와 RRF를 비교한다. 한 branch가 잘못된 상태에서 weight만 조절하면 문제를 숨긴다. Exact 상품명과 ID에는 lexical only 경로를 선택할 수도 있다.

## 평가 설계

| 평가 층 | 질문 | 지표 예 |
|---|---|---|
| ANN 품질 | Vector 후보가 exact 이웃을 회수했나 | Recall@k |
| 검색 관련도 | 사용자 의도에 맞는 순서인가 | nDCG@k, Precision@k, MAP |
| 운영 성능 | 목표 부하에서 안정적인가 | p50, p95, p99, throughput, error |

Query set을 최소한 다음 bucket으로 나눈다.

- 정확한 상호명, 상품명, ID와 코드
- 짧은 키워드, category query, 동의어와 띄어쓰기 변형
- 긴 자연어와 paraphrase
- 강한 ACL이나 재고 filter가 있는 query
- 드물고 판단이 어려운 tail query

BM25 only, vector only, weighted hybrid와 RRF를 같은 judgment로 비교한다. 평균 nDCG만 보지 말고 exact query의 회귀, zero-result, 최악 query와 latency budget을 함께 본다. Search Relevance Workbench는 실험을 자동화할 수 있지만 judgment 품질을 대신하지 않는다.

## 운영 체크포인트

- [ ] Query clause 순서와 pipeline weights를 함께 versioning하는가
- [ ] Candidate depth를 늘릴 때 relevance와 p99를 함께 측정하는가
- [ ] `hybrid_score_explanation`으로 문제 query의 결합 과정을 볼 수 있는가
- [ ] Top-level filter가 모든 branch에 같은 보안 조건을 적용하는가
- [ ] OpenSearch와 Amazon OpenSearch Service의 engine version이 processor를 지원하는가
- [ ] Pipeline 장애 시 lexical only fallback과 rollback 경로가 있는가

Hybrid query, normalization processor와 score ranker processor는 서로 다른 버전에서 도입됐다. 최신 문서의 예제를 현재 cluster에 바로 복사하지 말고 provisioned domain과 Serverless를 포함한 target engine의 기능과 제약을 확인한다.

## 관련 문서

- [[OpenSearch-Query-Relevance|렉시컬 Query DSL과 BM25]]
- [[OpenSearch-Korean-Text-Analysis|한국어 analyzer와 사전 운영]]
- [[OpenSearch-Vector-Search|k-NN과 embedding pipeline]]
- [[Vector-Similarity-Search|ANN과 HNSW 원리]]

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 - YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [AWS OpenSearch 검색 기능 정리 - YouTube](https://www.youtube.com/watch?v=YyF2vBhFlAY)
- [Hybrid search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/)
- [Hybrid query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/compound/hybrid/)
- [Normalization processor - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/normalization-processor/)
- [Score ranker processor - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/score-ranker-processor/)
- [Hybrid score explanation - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/explanation-processor/)
- [Optimizing hybrid search - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/optimize-hybrid-search/)
