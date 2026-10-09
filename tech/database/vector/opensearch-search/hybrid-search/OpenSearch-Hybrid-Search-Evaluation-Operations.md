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

## 질의 확장은 결합과 따로 평가한다

결과 목록을 합치는 fusion과 첫 검색 결과로 질의를 보강하는 pseudo relevance feedback은 다른 단계다. Pseudo relevance feedback은 첫 검색의 상위 K개 문서를 관련 있다고 가정하고 질의를 보강한다. 사람이 그 문서의 관련성을 확인했다는 뜻은 아니다. 첫 결과가 특정 의미에 치우치면 다음 질의도 그 방향으로 벗어나는 query drift가 생길 수 있다.

Wormhole vectors는 lexical, semantic, behavioral처럼 서로 다른 검색 공간을 오가는 실험적 접근이다. 독립적으로 얻은 목록을 합치는 것 외에 검색 공간 사이의 탐색을 추가한다. 2026-10-09 확인한 강연 소개도 이를 실험적 접근으로 설명하므로, OpenSearch의 기본 내장 기능이나 기존 hybrid보다 보편적으로 우수한 방법으로 간주하지 않는다.

이 차이를 검증하려면 같은 query set과 judgment에서 기존 hybrid, 질의 확장 추가, 확장 결과의 fusion 추가를 나눠 비교한다. 초기 후보 수와 확장 횟수를 기록하고, 정확한 상품명과 다의어 질의에서 의도 이탈과 지연을 함께 확인한다. 이는 query drift 위험에서 도출한 평가 설계이며 특정 구현의 성능 보장이 아니다.

Workbench의 자동 최적화 범위도 구분한다. 2026-10-09 공식 문서 기준 hybrid optimization은 정확히 두 query clause를 대상으로 한다. 이 제약을 hybrid 검색 전체의 clause 제한으로 확대하지 않으며, 다단계 질의 확장까지 자동 최적화한다고 가정하지 않는다.

## 상품 검색 결과와 생성 설명을 따로 평가한다

상품 목록의 관련도와 그 목록을 설명하는 생성 답변의 품질은 다른 평가 대상이다. 정확한 상품명을 찾는 경로와 자연어 의도를 해석하는 경로를 구분하고, 상품 조회와 생성 설명을 분리하면 각 단계의 지연과 오류를 따로 관측할 수 있다. 실제로 두 API를 분리한 검색 구현이 공개되어 있다. [AWS 구현 사례](https://aws.amazon.com/ko/blogs/tech/implementation-of-an-advanced-search-service-with-generative-ai-on-fredit/)

다음은 이 구조에서 도출한 평가 제안이다. 특정 검색 방식의 우월성이나 개선율을 보장하는 기준은 아니다.

| 평가 대상 | 확인할 조건 |
|---|---|
| 경로 선택 | 정확한 상품명, 오타, 초성, 자연어 질의를 나누고 의도한 검색 경로로 들어가는지 확인 |
| 상품 목록 | 생성 설명 없이도 정답 상품을 찾는지 평가하고, 빈 결과와 잘못된 상품 노출을 분리 |
| 생성 설명 | 실제 반환한 상품의 속성과 설명이 맞는지 확인하고, 그럴듯한 문장이 잘못된 검색 결과를 가리지 않는지 점검 |
| 응답 시간 | 목록 표시, 생성 설명 시작, 설명 완료를 따로 측정하고 생성 단계 실패 시 목록을 제공할 조건을 결정 |
| 사전 개선 | 빈 결과 로그를 오타 후보로 검토하되, 미판매 상품이나 모호한 요구를 오타로 단정하지 않음 |

검색 성공률을 비교할 때는 성공의 정의, 분모와 측정 기간을 먼저 맞춘다. 클릭률을 관련도 정답률로 대체하지 않으며, 위치 편향과 judgment 구성은 [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]의 기준을 따른다. 사용자 행동으로 만든 judgment에는 노출 위치와 클릭을 함께 기록하고 편향을 검토해야 한다. [OpenSearch 평가 가이드](https://opensearch.org/blog/measuring-and-improving-search-quality-metrics/)

이 절은 2026-10-10에 위 공개 구현과 평가 가이드를 대조했다. 사례의 과거 모델, 리전과 성과 수치를 현재 환경의 기본값으로 사용하지 않는다.

## 운영 체크포인트

- [ ] Query clause 순서와 pipeline weights를 함께 versioning하는가
- [ ] Candidate depth를 늘릴 때 relevance와 p99를 함께 측정하는가
- [ ] `hybrid_score_explanation`으로 문제 query의 결합 과정을 볼 수 있는가
- [ ] Top-level filter가 모든 branch에 같은 보안 조건을 적용하는가
- [ ] OpenSearch와 Amazon OpenSearch Service의 engine version이 processor를 지원하는가
- [ ] Pipeline 장애 시 lexical only fallback과 rollback 경로가 있는가

Hybrid query, normalization processor와 score ranker processor는 서로 다른 버전에서 도입됐다. 최신 문서의 예제를 현재 cluster에 바로 복사하지 말고 provisioned domain과 Serverless를 포함한 target engine의 기능과 제약을 확인한다.

## 출처

- [Amazon Bedrock과 Amazon OpenSearch를 활용한 hy 프레딧의 생성형 AI 기반 검색 서비스 구현 여정 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/implementation-of-an-advanced-search-service-with-generative-ai-on-fredit/)
- [Measuring and improving search quality metrics — OpenSearch](https://opensearch.org/blog/measuring-and-improving-search-quality-metrics/)
- [OpenSearch Documentation, Optimizing hybrid search](https://docs.opensearch.org/latest/search-plugins/search-relevance/optimize-hybrid-search/)
- [Pseudo relevance feedback — Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/html/htmledition/pseudo-relevance-feedback-1.html)
- [Maven, Trey Grainger와 Dmitry Kan, Beyond Hybrid Search with Wormhole Vectors](https://maven.com/p/8c7de9)

## 관련 문서

- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가와 judgment 구성]]
- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
- [[OpenSearch-Hybrid-Search-Execution-Fusion|실행 흐름과 score 기반 결합]]
- [[OpenSearch-Hybrid-Search-RRF-Filtering|RRF와 filter 배치]]
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
