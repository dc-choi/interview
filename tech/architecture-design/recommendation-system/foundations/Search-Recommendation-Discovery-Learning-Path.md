---
tags: [architecture, search, recommendation-system, discovery, learning-path]
status: active
verified_at: 2026-07-22
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Search Recommendation Discovery Learning Path", "검색 추천 학습 경로", "디스커버리 시스템 학습 경로"]
---

# 검색과 추천 디스커버리 시스템 학습 경로

이 체크리스트는 문서를 읽었는지가 아니라 문서 없이 설계, 계산과 검증 결과를 만들 수 있는지를 기록한다. 퀴즈 정답이나 문서 수는 숙련의 증거가 아니다. 현재 키노라이츠 내부 구현을 안다는 전제도 두지 않으며, 공개 제품과 일반 계약으로 만든 가설을 내부 discovery에서 검증하는 연습이다.

## 진행 원칙

- 각 단계는 지정 문서를 먼저 읽고 하나의 재현 가능한 산출물을 만든다.
- 수치, threshold와 기술 선택은 대표 workload 또는 내부 데이터가 없으면 가설로 표시한다.
- 검색, 추천과 browse는 공통 데이터가 있어도 목적과 label이 다르므로 한 점수로 합치지 않는다.
- 앞 단계의 ID, event, eligibility와 평가 계약을 뒤 단계에서 그대로 재사용한다.
- 검색을 추천보다 먼저 실습하는 것은 현재 업무 우선순위에 따른 실행 순서이며 이론적 선행관계를 뜻하지 않는다.

## 0. 통합 Discovery 큰 그림

읽기:

- [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 Discovery 아키텍처]]
- [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 추천 시스템 초기 설계안]]
- [[OpenSearch|OpenSearch 학습 지도]]

산출물:

- Query-bound search, queryless recommendation, taxonomy browse의 요청 흐름을 한 장에 그린다.
- 공유 정본과 분리할 candidate, ranking, label 및 fallback을 표로 만든다.

- [ ] 통과: 사용자 의도, candidate source, eligibility, ranking과 primary metric이 세 surface에서 왜 다른지 문서 없이 설명한다.

## 1. 검색 Baseline과 품질 평가

읽기:

- [[OpenSearch-Mapping-Text-Analysis|매핑과 분석기]]
- [[OpenSearch-Query-Understanding|쿼리 이해]]
- [[OpenSearch-Relevance-Tuning|관련도 튜닝과 LTR]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]

산출물:

- 첫 fixture는 작품 50개로 고정하고 서로 겹치지 않는 head/torso/tail 및 의도적 no-match query를 구간별 5개 이상 준비한다. Head/torso/tail에는 relevant 작품이 하나 이상 있어야 하며 빈도 로그가 없으면 구간 분류를 가설로 표시한다.
- 모든 query-document 쌍을 0에서 3으로 판정하고 relevant threshold를 1로 고정한다.
- `_analyze`, `_explain`과 Profile 결과를 version-pinned fixture로 저장한다. Rank Evaluation API는 nDCG용 `dcg: {k: 10, normalize: true, unknown_doc_rating: 0}`와 MRR용 `mean_reciprocal_rank: {k: 10, relevant_rating_threshold: 1}`로 나눠 실행하고 검증 script와 대조한다.
- Query별 `details`를 저장하고 `unrated_docs=0`을 확인한다.
- Relevant 작품이 있는 query만 nDCG/MRR에 포함한다. Unexpected zero-result와 의도적 no-match 처리 결과는 query 수와 함께 별도 집계한다.
- 같은 client, query set, concurrency, warm-up, 반복 횟수와 cache 조건을 고정해 end-to-end p95와 error rate를 별도로 측정한다.

- [ ] 통과: 전수 판정 gold set에서 mapping, analyzer 또는 query 변경 하나의 primary metric, 허용할 query별 회귀와 latency/error guardrail을 사전에 고정하고 그 결과로 채택 또는 기각한다.

## 2. 추천 모델링 최소 기반

읽기:

- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
- [[Recommendation-System-Candidate-Generation#협업 필터링과 Matrix Factorization|협업 필터링과 Matrix Factorization]]
- [[Recommendation-System-Ranking-Reranking#학습 목표는 제품 행동을 만든다|랭킹 label과 loss]]

산출물:

- 검색 fixture와 분리한 MovieLens 100K의 배포판/파일 hash, seed, 시간 cutoff와 split별 user/item/interaction 수를 고정한다. Train-only validation, train+validation 재학습과 test one-shot으로 popularity, item-item CF 및 Matrix Factorization을 비교한다.
- Validation candidate는 pinned metadata catalog에서 사용자의 train item을, test candidate는 train+validation item을 뺀다. Label과 sampled negative로 후보를 줄이지 않는다. Cold-start도 validation은 train, test는 train+validation 기준으로 판정해 단계별 과거 데이터만 쓰는 공통 fallback과 개수를 기록한다.
- 첫 실습은 평가 사용자 100명과 test relevant pair 300개를 요구한다. 활동량 구간은 pre-test 기준 사용자 30명, 인기도 구간은 pre-test 기준 relevant pair 30개와 distinct item 10개 미만이면 `insufficient`로 판정하고 각 user/item/pair 분모를 보고한다.
- Recall@10과 NDCG@10을 계산하고 사용자 활동량 및 item 인기도 slice를 함께 기록한다.
- 모델 품질, Redis cache와 API 서빙 품질을 서로 다른 검증 결과로 남긴다.

- [ ] 통과: 분할, 평가 사용자와 제외 사유, full-catalog candidate universe, relevant 기준, 구간별 metric 분모와 구현을 고정한 재현 가능한 notebook 또는 script를 검토받는다.

## 3. Taxonomy와 추천 Candidate

읽기:

- [[Recommendation-System-Taxonomy-Content-Based|택소노미 기반 추천]]
- [[Recommendation-System-OTT-Discovery-Scenarios|S0-S3 구축 시나리오]]
- [[Recommendation-System-Candidate-Generation|추천 후보 생성]]
- [[Recommendation-System-Eligibility-Availability|자격 조건과 가용성]]

산출물:

- 작품 concept schema, version, assignment와 gold set 계약을 만든다.
- Taxonomy item-to-item, 인기/편집과 behavior item-to-item의 candidate를 같은 eligible universe에서 비교한다.
- Baseline source 목록, source별 K, 총 candidate budget, merge/truncation, canonical ID dedup과 최종 eligibility 순서를 고정한다.
- 같은 gold set에서 `Recall@K(base ∪ taxonomy) - Recall@K(base)`, 중복, underfill과 latency를 계산한다.

- [ ] 통과: 고정한 ablation 계약에서 Surface별 S0-S3 선택과 보류 이유를 데이터 성숙도 및 실패 fallback으로 방어한다.

## 4. Personalized Search와 Page 조립

읽기:

- [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 Discovery 아키텍처]]
- [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]
- [[Recommendation-System-Page-Level-Optimization|Page-level 추천]]

산출물:

- 검색 relevance를 보존하는 개인화 feature와 boost 상한을 설계한다.
- Home의 row 후보, row 순서, row 내부 item 순서와 cross-row dedup을 분리한다.
- 첫 viewport, module impression, 가로 스크롤과 OTT 이동 attribution을 정의한다.

- [ ] 통과: 특정 module의 CTR 상승이 page-level 가치 하락이 될 수 있는 사례와 guardrail을 설명한다.

## 5. Feedback와 OPE

읽기:

- [[Recommendation-System-Feedback-Data|피드백 데이터]]
- [[Recommendation-System-Off-Policy-Evaluation|Off-Policy Evaluation]]
- [[Recommendation-System-Evaluation-Experimentation|추천 평가와 실험]]

산출물:

- Assignment부터 outcome까지 한 요청을 audit reconstruction한다.
- 작은 로그 표본으로 IPS, SNIPS, DM과 DR을 계산한다.
- Weight mean, ESS, p99 weight, support 위반과 user bootstrap 신뢰구간을 보고한다.

- [ ] 통과: OPE 결과가 신뢰 불가능한 조건과 온라인 실험으로 넘길 기준을 수치로 제시한다.

## 6. 온라인 실험

읽기:

- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[Recommendation-System-Evaluation-Experimentation#출시와 단계 승급 게이트|출시 gate]]

산출물:

- Population, treatment, ITT estimand, primary와 guardrail을 사전 등록한다.
- MDE, power, randomization/분석 단위, ratio metric, CUPED와 다중 검정 family를 정한다.
- SRM, telemetry loss, novelty, interference와 rollback 조건을 포함한 runbook을 만든다.

- [ ] 통과: 효과 크기와 신뢰구간, guardrail 및 운영 비용으로 ramp/hold/rollback을 결정한다.

## 7. 서빙과 장애 훈련

읽기:

- [[Recommendation-System-Serving-Operations|추천 서빙과 운영]]
- [[OpenSearch-Indexing-Pipeline-Reliability|검색 색인 신뢰성]]
- [[OpenSearch-Performance-Troubleshooting|검색 성능 진단]]

산출물:

- Bundle, feature, taxonomy, index와 policy version을 요청 단위로 고정한다.
- Candidate source timeout, stale availability, ranker timeout과 OpenSearch 장애를 주입한다.
- Shadow, canary, alias cutover, fallback과 rollback 결과를 기록한다.

- [ ] 통과: 장애 중 eligibility를 우회하지 않으면서 latency SLO와 최소 품질을 지키는 경로를 시연한다.

## 완료 조건

- [ ] 여덟 단계의 산출물이 같은 ID와 event 계약으로 연결된다.
- [ ] 검색, 추천과 browse의 offline/online 지표가 surface별로 구분된다.
- [ ] 내부에서 확인하지 못한 수치와 구조가 가설로 표시된다.
- [ ] 최소 한 번의 품질 회귀, OPE 실패와 rollback 사례를 재현한다.

완료 체크는 문서 작성자가 아니라 산출물과 실행 증거를 검토한 뒤 갱신한다.

## 관련 문서

- [[Recommendation-System-Architecture|추천 시스템 지식 지도]]
- [[OpenSearch|OpenSearch 학습 지도]]
