---
tags: [database, search, opensearch, lexical, semantic, hybrid, rrf]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 하이브리드 검색 — RRF와 filter 배치

## Rank 기반 결합과 RRF

`score-ranker-processor`는 OpenSearch 2.19 이상에서 Reciprocal Rank Fusion을 사용한다. 각 branch의 절대 score 대신 순위를 `RRF(d) = sum(w_i / (rank_i(d) + C))` 형태로 결합한다. Amazon OpenSearch Service와 Serverless는 engine version 외에도 해당 processor의 서비스 지원 여부를 배포 전에 확인한다.

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

보안과 정합성 조건은 top-level pre-filter로 강제한다. `post_filter`는 이미 생성한 후보를 버리므로 부족한 결과 수나 낮아진 recall을 복원하지 못한다. 패싯 개수 유지와 다중 패싯 정합성은 [[OpenSearch-Aggregations-Pagination#패싯 — 집계의 대표 사용처|패싯 집계]]가 정본이다.

## Score 결합보다 먼저 볼 것

Lexical analyzer와 query 구조, embedding model과 k-NN filter를 각각 먼저 검증한다. 각 branch의 후보 깊이와 공통 ACL, source version을 확인한 뒤 normalization, weight와 RRF를 비교한다. 한 branch가 잘못된 상태에서 weight만 조절하면 문제를 숨긴다. Exact 상품명과 ID에는 lexical only 경로를 선택할 수도 있다.

## 출처

- [OpenSearch Documentation, Score ranker processor](https://docs.opensearch.org/latest/search-plugins/search-pipelines/score-ranker-processor/)
- [OpenSearch Documentation, Hybrid score explanation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/explanation-processor/)

## 관련 문서

- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
- [[OpenSearch-Hybrid-Search-Execution-Fusion|실행 흐름과 score 기반 결합]]
- [[OpenSearch-Hybrid-Search-Evaluation-Operations|평가 설계와 운영 체크포인트]]
