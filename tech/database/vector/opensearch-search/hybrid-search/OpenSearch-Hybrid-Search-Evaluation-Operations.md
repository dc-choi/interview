---
tags: [database, search, opensearch, lexical, semantic, hybrid, rrf]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 하이브리드 검색 — 평가 설계와 운영 체크포인트

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

## 출처

- [OpenSearch Documentation, Optimizing hybrid search](https://docs.opensearch.org/latest/search-plugins/search-relevance/optimize-hybrid-search/)

## 관련 문서

- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
- [[OpenSearch-Hybrid-Search-Execution-Fusion|실행 흐름과 score 기반 결합]]
- [[OpenSearch-Hybrid-Search-RRF-Filtering|RRF와 filter 배치]]
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
