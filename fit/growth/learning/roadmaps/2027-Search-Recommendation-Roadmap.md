---
tags: [growth, learning, search, opensearch, recommendation-system]
status: todo
verified_at: 2026-07-22
category: "Growth - 학습"
aliases: ["2027 검색 추천 로드맵", "검색 엔진 우선 추천 전환 계획"]
---

# 2027 검색 엔진 우선, 추천 시스템 전환 로드맵

수학 2단계 gate 뒤 검색 엔진의 baseline과 품질 평가를 먼저 실습하고, 그 결과를 추천 시스템 baseline으로 연결한다. 검색은 추천의 수학적 선행조건이 아니다. 현재 업무 우선순위와 공통 discovery 계약의 재사용 가치를 근거로 실행 순서만 검색 우선으로 정한다.

## 시작 조건과 운영 원칙

- [[2026-H2-Math-Roadmap|2026 하반기 수학 기초 로드맵]]의 2단계 gate를 통과한 뒤 시작한다.
- 한 번에 한 트랙만 진행한다. 검색 1차 성공선 전에는 추천 실습 진도를 병행하지 않는다.
- 최근 4주 실제 개인 학습 시간 중앙값을 주간 총상한으로 두고 그 안에서 시간을 배분한다.
- 4주 기록이 없으면 기존 총학습 시간을 늘리지 않은 채 먼저 기록하고 새 트랙을 추가하지 않는다.
- DevOps 시간도 같은 총상한 안에서 재배분하며 검색/추천 완료를 DevOps 시작 조건으로 삼지 않는다.
- 업무상 긴급한 검색/추천 학습은 즉시 수행할 수 있지만 로드맵 단계 통과로 자동 인정하지 않는다.

## 검색을 먼저 하는 이유

1. 현재 구축 업무에서 검색 엔진의 mapping, analyzer, query와 품질 평가를 먼저 이해할 필요가 있다.
2. 작품 ID, catalog 정본, eligibility와 요청/노출 로그 계약은 검색과 추천 양쪽에서 재사용할 수 있다.
3. 관련도 판단과 회귀 평가 절차를 먼저 익히면 추천에서도 baseline 고정, slice 분석과 변경 판정 습관을 재사용할 수 있다.
4. 검색 relevance와 추천 선호 예측은 목적과 label이 다르므로 한 점수나 한 모델로 합치지 않는다.

## 전체 순서

```mermaid
flowchart LR
  A[통합 discovery 계약] --> B[검색 엔진 baseline과 품질]
  B --> C[추천 모델링 baseline]
  C --> D[Taxonomy 후보와 서빙]
  D --> E[남은 discovery 단계]
```

이 문서의 1차 성공선은 [[Search-Recommendation-Discovery-Learning-Path|검색과 추천 디스커버리 학습 경로]]의 0단계와 1단계, 이어서 2단계와 3단계 및 7단계 일부에 대응한다. 전체 완료는 연결 문서의 여덟 단계 산출물과 완료 조건으로만 판정한다.

## A. 통합 discovery 계약

검색 실습 전에 다음 계약을 작은 fixture로 고정한다.

- 작품 ID, title/alias, taxonomy, 공개 상태와 시청 가능성의 정본 및 snapshot 시각
- 검색 query, 추천 request, candidate source, ranked slate와 실제 impression을 구분하는 event schema
- 검색 relevance judgement와 추천 click/재생 outcome을 분리하는 label 정의
- eligibility가 적용되는 위치, fallback과 결과 version을 추적하는 필드

### 통과 gate

- [ ] Query-bound search, queryless recommendation과 taxonomy browse의 요청 흐름을 한 장에 그린다.
- [ ] 세 surface의 사용자 의도, candidate source, eligibility, ranking과 primary metric 차이를 표로 설명한다.
- [ ] 같은 작품 ID와 catalog snapshot을 사용하면서 label과 평가 protocol은 분리한 fixture를 만든다.

## B. 검색 엔진 baseline과 품질 평가

### 고정할 데이터와 실행 계약

- 첫 fixture는 작품 50개로 고정하고 title/alias와 검색에 필요한 필드를 포함한다.
- 서로 겹치지 않는 head, torso, tail 및 의도적 no-match query를 구간별 5개 이상 준비한다. Head/torso/tail에는 relevant 작품이 하나 이상 있어야 하며, 실제 query 빈도 로그가 없으면 구분을 가설로 표시한다.
- 모든 query-document 쌍을 0에서 3으로 판정하고 relevant threshold를 1로 고정한다. 의도적 no-match query는 모든 작품이 0인지 확인하며 판단 불일치는 별도로 기록한다.
- OpenSearch version, node 수와 instance 자원, index settings, mapping, analyzer, query DSL과 fixture hash를 결과에 남긴다.

### 실습 순서

1. 명시적인 mapping/analyzer/query 계약으로 BM25 baseline을 만든다.
2. `_analyze`로 token을 확인하고 `_explain`으로 대표 문서의 match와 score 근거를 추적한다.
3. Relevant 작품이 하나 이상인 query만 대상으로 Rank Evaluation API를 두 번 호출한다. nDCG@10은 `dcg: {k: 10, normalize: true, unknown_doc_rating: 0}`, MRR은 `mean_reciprocal_rank: {k: 10, relevant_rating_threshold: 1}`로 고정하고 같은 정의의 검증 script와 대조한다.
4. Query별 `details`와 `unrated_docs`를 저장한다. 전수 판정 fixture에서 unrated 문서가 하나라도 있으면 채택 판정을 보류하고 rating 누락부터 수정한다.
5. Profile API로 검색 구성 요소별 실행 시간을 비교한다. Profile 결과는 end-to-end 지연 시간과 동일하지 않으므로 p95 근거로 단독 사용하지 않는다.
6. 같은 client, 요청 집합, concurrency, warm-up, 반복 횟수와 cache 조건을 고정한 부하 절차로 end-to-end p95, timeout과 error rate를 측정한다.
7. Relevant 작품이 있는 query의 unexpected zero-result rate와 의도적 no-match query의 처리 결과를 별도 집계한다. No-match query를 nDCG/MRR 평균 분모에 넣지 않는다.
8. mapping, analyzer 또는 query 변경 하나를 고르고 primary metric, 허용할 query별 회귀와 latency/error guardrail을 변경 전에 고정한 뒤 채택 또는 기각한다.

### 검색 1차 성공선

- [ ] 작품 50개와 네 query 구간별 5개 이상의 fixture가 재현 가능하며, 빈도 근거가 없는 구간 분류는 가설로 표시했다.
- [ ] 모든 query-document 쌍의 rating, 판단 기준과 relevant threshold를 저장하고 query별 `unrated_docs=0`을 확인했다.
- [ ] Version이 고정된 BM25 baseline의 mapping, analyzer, query DSL과 두 Rank Evaluation metric payload를 저장했다.
- [ ] `_analyze`, `_explain`과 Profile 결과로 token, score 근거와 느린 구성 요소를 설명한다.
- [ ] 전수 판정 gold set에서 relevant 작품이 있는 query만으로 nDCG@10과 MRR을 계산하고, unexpected zero-result와 no-match 처리 결과 및 각 query 수를 별도로 기록한다.
- [ ] 반복 가능한 측정 절차로 end-to-end p95와 error rate를 계산한다.
- [ ] 변경 전에 정한 primary metric, query별 회귀와 latency/error guardrail에 따라 변경을 채택하거나 기각하고 이유를 남긴다.

검색 성공선에서 막히면 추천으로 넘어가 일정만 맞추지 않는다. corpus, judgement, query 계약 또는 측정 절차 중 실패한 항목을 먼저 수정한다.

## C. 추천 모델링 baseline

검색에서 만든 ID/event schema, versioning과 평가 규율은 재사용하지만 검색용 작품 fixture와 추천 모델링 데이터는 분리한다. 추천 첫 실습은 stable benchmark인 MovieLens 100K로 두고 배포판 URL, 내려받은 파일의 SHA-256, seed, 시간 cutoff와 동률 처리 규칙을 기록한다.

### 평가 계약

- Rating 4 이상을 relevant로 고정하고 전역 시간 순서로 train/validation/test를 나눈다. Validation에서는 train만으로 모델과 item 통계를 만들고 설정을 선택한다. 선택 뒤 train과 validation으로 한 번 다시 학습해 고정한 뒤 test는 한 번만 평가한다.
- Pinned MovieLens metadata snapshot의 모든 item이 각 prediction cutoff에 존재한다고 가정한다. Validation candidate는 전체 catalog에서 사용자의 train interaction item을 빼고, test candidate는 train+validation interaction item을 뺀다. 이 가정과 반복 추천 예외를 기록하며 label이나 sampled negative로 후보를 줄이지 않는다.
- Validation에서는 train에 interaction이 없는 item, test에서는 train+validation에 interaction이 없는 item을 cold-start로 판정한다. 이 item도 후보에서 빼지 않고 해당 단계의 과거 데이터만 사용하는 공통 deterministic fallback을 적용해 개수와 비율을 보고한다.
- Validation 평가 사용자는 train interaction과 validation relevant item이, test 평가 사용자는 train+validation interaction과 test relevant item이 하나 이상인 사용자로 각각 고정한다. 제외 사유와 사용자별 candidate 수의 min/median/p95를 단계별로 기록한다.
- Train/validation/test별 user/item/interaction 수와 모든 metric 분모를 남긴다. 최소 분모는 평가 사용자 100명과 test relevant pair 300개다.
- 최종 test의 사용자 활동량 구간은 train+validation interaction 수로 만들고 구간별 평가 사용자 30명 이상을 요구한다. 작품 인기도 구간도 train+validation interaction으로 만들며 구간별 test relevant pair 30개와 distinct item 10개 이상을 요구하고 distinct user/item/pair 수를 모두 보고한다. 미달 결과는 `insufficient`로 판정한다.

1. Popularity baseline
2. Item-item collaborative filtering
3. Matrix Factorization
4. 시간 기준 train/validation/test 분리와 데이터 누수 검사
5. 같은 candidate universe와 relevant 기준의 Recall@10 및 NDCG@10 비교
6. 사용자 활동량과 작품 인기도 slice별 결과 비교

### 2027 추천 baseline 1차 성공선

- [ ] Dataset version/hash, cutoff, split별 user/item/interaction 수, 평가 사용자와 제외 사유 및 모든 metric의 분모를 기록한다.
- [ ] Train-only validation, test one-shot, full-catalog candidate universe, cold-start fallback과 누수 검사를 고정하고 세 baseline을 같은 평가 사용자 집합에서 비교한다.
- [ ] Recall@10과 NDCG@10의 전체 결과와 사용자 활동량 및 작품 인기도 구간의 user/item/pair 분모를 함께 기록하며 최소 분모 미달은 `insufficient`로 표시한다.
- [ ] 성능 차이뿐 아니라 popularity 대비 복잡도를 늘릴 근거와 보류 조건을 적는다.

## D. Taxonomy 후보와 logging/serving

이 단계는 MovieLens 지표를 그대로 이어 붙이지 않는다. 검색에서 사용한 도메인 작품 fixture 또는 승인된 내부 catalog snapshot으로 돌아가고, A단계의 ID/event schema와 version 계약만 재사용한다.

- [ ] Baseline source 목록, source별 K, 총 candidate budget, merge/truncation, canonical ID dedup과 최종 eligibility 순서를 먼저 고정한다. 같은 gold set에서 `Recall@K(base ∪ taxonomy) - Recall@K(base)`와 중복, underfill 및 latency를 계산한다.
- [ ] request, candidate item/source, ranked slate, actual impression, position, timestamp/context와 click/재생 outcome의 join key 및 연결률을 audit한다.
- [ ] Redis/API의 cache hit/miss, 정확성, latency와 실패 fallback을 model quality와 분리해 검증한다.
- [ ] 검색, 추천과 taxonomy 결과의 채택/보류 이유를 하나의 재현 가능한 보고서로 설명한다.

이 지점은 1차 성공선이다. Personalized Search, page 조립, OPE, 온라인 실험과 전체 장애 훈련은 [[Search-Recommendation-Discovery-Learning-Path|전체 학습 경로]]의 남은 단계로 이어간다. OPE, Two-Tower, deep ranking, Transformer, GNN과 강화학습을 앞당기지 않는다.

## 관련 문서

- [[2026-H2-Math-Roadmap|2026 하반기 수학 기초 로드맵]]
- [[Search-Recommendation-Discovery-Learning-Path|검색과 추천 디스커버리 학습 경로]]
- [[OpenSearch|OpenSearch 학습 지도]]
- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
- [[2027-DevOps-Practical-Roadmap|2027 DevOps 실전 로드맵]]
- [[roadmaps|학습 로드맵 인덱스]]

## 출처

- GroupLens: [MovieLens datasets](https://grouplens.org/datasets/movielens/)
- OpenSearch: [Analyze API](https://docs.opensearch.org/latest/api-reference/analyze-apis/)
- OpenSearch: [Explain API](https://docs.opensearch.org/latest/api-reference/search-apis/explain/)
- OpenSearch: [Rank evaluation API](https://docs.opensearch.org/latest/api-reference/search-apis/rank-eval/)
- OpenSearch core: [DiscountedCumulativeGain.java](https://github.com/opensearch-project/OpenSearch/blob/main/modules/rank-eval/src/main/java/org/opensearch/index/rankeval/DiscountedCumulativeGain.java), [MeanReciprocalRank.java](https://github.com/opensearch-project/OpenSearch/blob/main/modules/rank-eval/src/main/java/org/opensearch/index/rankeval/MeanReciprocalRank.java)
- OpenSearch: [Profile API](https://docs.opensearch.org/latest/api-reference/search-apis/profile/)
