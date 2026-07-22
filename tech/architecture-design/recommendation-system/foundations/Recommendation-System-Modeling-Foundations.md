---
tags: [architecture, recommendation-system, machine-learning, statistics, implicit-feedback]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Modeling Foundations", "추천 시스템 모델링 기초", "추천 모델 기초"]
---

# 추천 시스템 모델링 기초

추천 시스템은 모델 하나가 아니라 후보 생성, 랭킹, 재랭킹, 실제 노출, 피드백과 실험을 잇는 시스템이다. 백엔드와 운영 경험은 서빙 계약을 설계하는 데 직접 쓰이고, 추가로 필요한 모델링 지식은 각 점수가 무엇을 추정하며 어떤 데이터와 평가가 그 주장을 지지하는지 판단할 정도면 된다.

## 먼저 구분할 세 질문

1. Retrieval: 전체 catalog에서 랭커가 놓치면 안 되는 후보를 어떻게 빠르게 찾는가
2. Ranking: 주어진 후보의 상대적 효용을 어떤 label과 loss로 학습하는가
3. Evaluation: 과거 정책이 만든 로그의 편향을 고려해 새 정책의 가치를 어떻게 검증하는가

같은 embedding을 써도 첫 질문과 둘째 질문의 목적은 다르다. 모델 이름보다 candidate universe, label, loss, 평가 집합과 serving cost를 함께 본다.

## 최소 수학

### 벡터, 내적과 코사인

사용자 벡터 `u`와 아이템 벡터 `v`의 기본 점수는 다음처럼 쓸 수 있다.

```text
dot score = uᵀv
cosine similarity = uᵀv / (||u|| ||v||)
```

- 내적은 방향과 벡터 크기의 영향을 모두 받는다. 학습이 벡터 norm에 인기나 확신을 담았다면 그 크기도 점수의 일부다.
- 코사인은 방향을 비교하고 norm을 제거한다. 같은 embedding이라도 내적과 코사인을 바꾸면 순서가 달라질 수 있다.
- 거리 함수는 임의 선택이 아니다. 모델이 어떤 점수로 학습됐는지와 ANN index 설정이 같아야 한다.
- Matrix Factorization의 latent 축이 장르처럼 사람이 붙인 의미와 일치한다고 보장할 수 없다.

### 확률, 기대값과 분산

- 조건부확률 `P(click | user, item, context)`는 feature가 주어진 상황의 확률이다. 관측 CTR 자체와 모델의 예측 확률은 구분한다.
- 기대값은 정책을 반복 적용했을 때의 평균 결과를 정의한다. 온라인 실험과 OPE가 추정하려는 대상도 기대 보상이다.
- 분산은 추정치의 불확실성과 필요한 표본 수를 좌우한다. 평균 상승만으로 출시하지 않고 표준 오차와 신뢰구간을 본다.
- 조건부확률을 잘 예측하는 calibration과 Top K 순서를 잘 만드는 ranking quality는 같은 성질이 아니다.

## 지도 학습의 최소 계약

| 개념 | 추천에서의 의미 | 확인할 함정 |
|---|---|---|
| Feature | 요청 시점에 알 수 있던 사용자, 아이템, 맥락과 source 값 | 미래 정보, 결측과 freshness |
| Label | 클릭, 찜, 재생, 완주처럼 예측할 결과 | 노출되지 않은 항목을 negative로 취급 |
| Classification | 클릭 여부처럼 범주나 확률 예측 | 확률 정확도와 순위 품질 혼동 |
| Regression | 시청 시간이나 가치처럼 연속값 예측 | Heavy tail, censoring과 단위 차이 |
| Loss | 모델이 학습 중 줄이는 오류의 정의 | 제품 지표와 불일치 |
| Regularization | 과도한 parameter나 norm을 억제 | 큰 모델의 데이터 암기 |

### Logistic Regression 예

```text
z = wᵀx + b
p(click=1 | x) = sigmoid(z)
binary cross entropy = -[y log p + (1-y) log(1-p)]
```

Logistic Regression은 강한 baseline이자 feature와 label 문제를 드러내는 도구다. 경사하강법은 loss의 기울기를 따라 parameter를 갱신하고, L1이나 L2 regularization은 복잡도와 큰 weight에 비용을 준다. Loss가 낮아도 position bias나 데이터 누수가 있으면 실제 추천 정책이 좋아졌다는 뜻은 아니다.

## Train, Validation과 Test

- Train은 parameter를 학습한다.
- Validation은 model, feature, hyperparameter와 중단 시점을 선택한다.
- Test는 선택이 끝난 뒤 일반화 성능을 한 번 확인한다.

추천 로그를 interaction row 단위로 무작위 분할하면 같은 사용자의 미래 행동이나 미래 item 상태가 과거 학습에 섞일 수 있다. 운영 시나리오를 재현하려면 대개 시간 순서와 label 완결 시점을 보존하고, 각 example에는 추천 시점 이전 feature만 point-in-time join한다.

무작위 분할이 언제나 틀린 것은 아니다. IID 일반화나 component unit test를 의도할 수 있다. 하지만 미래 사용자 행동 예측, 신규 사용자, 신규 아이템은 서로 다른 estimand이므로 temporal split, user holdout과 item holdout을 목적에 맞게 선택한다.

## Implicit Feedback와 미관측의 의미

클릭, 조회, 찜과 시청은 사용자가 명시적 점수를 주지 않아도 생기는 implicit feedback이다. 핵심은 0의 의미가 하나가 아니라는 점이다.

```text
응답에 없었음 != 응답에 있었지만 보이지 않음
보였지만 클릭하지 않음 != 싫어함
클릭함 != 만족하거나 끝까지 시청함
```

따라서 request, candidate, ranked slate, actual impression과 outcome을 연결해야 한다. Impression 없이 click만 모으면 노출 기회를 통제할 수 없고, 이전 정책과 position이 만든 선택 편향을 학습하게 된다.

### Negative Sampling

전체 미관측 item을 모두 학습하기 비싸므로 일부를 negative로 뽑을 수 있다. Uniform, in-batch, popularity와 hard negative는 서로 다른 학습 문제를 만든다. 미관측이지만 관련 있는 item을 false negative로 넣을 수 있고, sampling 확률을 무시하면 인기 분포가 목표를 지배할 수 있다. Sampling은 속도 최적화가 아니라 loss와 estimator 계약의 일부다.

## 알고리즘 사다리

| 방식 | 배우는 것 | 먼저 쓰기 좋은 조건 | 주요 한계 |
|---|---|---|---|
| 인기와 편집 | 집단 기준선과 제품 의도 | 데이터가 적고 fallback이 필요 | 개인화와 long-tail 부족 |
| 콘텐츠 기반 | item feature 유사도와 사용자 profile | taxonomy와 metadata가 신뢰 가능 | Overspecialization과 feature 품질 |
| User/Item KNN | 이웃 interaction의 유사성 | 관계를 설명 가능한 baseline | 희소성, 비용과 노출 편향 |
| Matrix Factorization | user-item latent factor | 상호작용 밀도와 안정 ID가 있음 | Cold Start와 side feature 한계 |
| Two-Tower | query와 item embedding retrieval | 큰 catalog에서 ANN이 필요 | 세밀한 cross feature 제약 |
| Learning to Rank | 후보의 pointwise/pairwise/listwise 순서 | 후보 source와 label이 안정 | 편향된 label과 serving feature 비용 |
| Sequential model | 행동 순서와 현재 의도 | 충분한 sequence와 freshness | 데이터, 계산과 운영 복잡도 |
| Bandit | 탐색과 활용의 정책 | 선택 확률과 안전한 탐색 범위가 있음 | 사용자 비용, support와 분산 |

이 표는 의무 도입 순서가 아니다. Popularity, taxonomy, item-to-item과 behavior source를 함께 쓰고 공통 ranker에서 결합할 수 있다. Transformer나 bandit은 baseline 대비 증분 가치와 운영 가능성이 입증될 때 선택한다.

## Accuracy보다 Top K를 보는 이유

Pointwise classification의 accuracy, log loss와 calibration은 모델 진단에 쓸 수 있지만, 최종 제품이 상위 K개를 순서대로 보여준다면 그것만으로 목록 품질을 보장하지 않는다.

- Candidate 단계는 Recall@K와 eligible Recall로 관련 후보를 놓치지 않는지 본다.
- Ranking은 NDCG@K, MRR과 목적별 Precision/Recall을 본다.
- Slate와 page는 diversity, duplication, constraint와 catalog coverage를 함께 본다.
- Offline 지표는 온라인 인과 효과가 아니다. 실제 출시는 무작위 실험의 primary와 guardrail로 결정한다.

## 첫 산출물: MovieLens Baseline

1. Rating과 timestamp를 읽고 평가 시점의 user/item만 사용하는 분할 protocol을 문서화한다.
2. Popularity, item-item CF와 Matrix Factorization을 같은 train/validation/test에서 비교한다.
3. Relevant threshold와 candidate universe를 고정하고 Recall@10과 NDCG@10을 계산한다.
4. 사용자 활동량, item 인기도와 신규성 slice별 결과를 함께 본다.
5. 모델, split, seed, dependency와 결과를 재현 가능한 notebook이나 script로 남긴다.
6. 선택한 결과를 Redis 같은 cache에 저장하고 API로 제공하되 model quality와 serving quality를 별도 검증한다.

MovieLens는 rating과 timestamp가 있는 교육용 데이터다. 실제 impression, logging propensity, OTT availability와 production latency가 없으므로 exposure bias 교정, OPE, 온라인 효과나 실서비스 준비를 입증하지 못한다. 첫 프로젝트의 목적은 알고리즘 이름 수집이 아니라 같은 protocol에서 baseline과 tradeoff를 재현하는 것이다.

## 관련 문서

- [[Recommendation-System-Candidate-Generation|추천 후보 생성]], [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]
- [[Recommendation-System-Feedback-Data|피드백 데이터]], [[Recommendation-System-Evaluation-Experimentation|평가와 실험]]
- [[Recommendation-System-Off-Policy-Evaluation|OPE]], [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[Recommendation-System-Serving-Operations|추천 서빙과 운영]], [[Vector-Similarity-Search|벡터 유사도 검색]]

## 출처

- [Collaborative Filtering for Implicit Feedback Datasets - Hu, Koren, Volinsky](https://yifanhu.net/PUB/cf.pdf)
- [BPR: Bayesian Personalized Ranking from Implicit Feedback - Rendle et al.](https://arxiv.org/abs/1205.2618)
- [Matrix Factorization Techniques for Recommender Systems - Koren, Bell, Volinsky](https://doi.org/10.1109/MC.2009.263)
- [Deep Neural Networks for YouTube Recommendations - Covington et al.](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/)
- [Google Machine Learning Crash Course - Logistic Regression](https://developers.google.com/machine-learning/crash-course/logistic-regression)
- [MovieLens datasets - GroupLens](https://grouplens.org/datasets/movielens/)

## 보조 학습 자료

아래 자료는 용어와 전체 흐름을 훑는 입문용 읽을거리다. 위 수식과 운영 계약의 검증 근거로 사용하지 않는다.

- [추천 시스템 입문 - NVIDIA](https://www.nvidia.com/ko-kr/glossary/recommendation-system/)
- [추천 시스템 입문 - Intel](https://www.intel.co.kr/content/www/kr/ko/learn/recommendation-systems.html)
- [추천 시스템 - 위키백과](https://ko.wikipedia.org/wiki/%EC%B6%94%EC%B2%9C_%EC%8B%9C%EC%8A%A4%ED%85%9C)
- [추천 알고리즘 기본 개념 - Tistory](https://cherie-ssom.tistory.com/25)
- [추천 알고리즘 종류 - Tistory](https://calmmimiforest.tistory.com/100)
- [Content-Based Recommendation System - Velog](https://velog.io/@9e0na/%EC%B6%94%EC%B2%9C%EC%8B%9C%EC%8A%A4%ED%85%9C-Content-Based-Recommender-System)
