---
tags: [architecture, recommendation-system, multi-interest, user-representation, retrieval, ranking, news-recommendation]
status: done
verified_at: 2026-11-04
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Multi-Interest Recommendation", "다중 관심 추천", "다중 관심 사용자 표현", "Multi-Interest User Representation", "MINER", "Poly Attention"]
---

# 다중 관심 사용자 표현

다중 관심 모델은 한 사용자의 행동 이력을 벡터 하나로 줄이지 않고 여러 관심 벡터로 표현한다. 같은 다중 관심이라도 후보 생성에서 쓰는지, 주어진 후보의 점수를 매기는 데 쓰는지에 따라 관심의 개수, 관심 사이의 분리, 점수 집계와 서빙 비용의 문제가 달라진다.

## 단일 벡터의 병목

전자기기, 책, 운동용품을 모두 보는 사용자의 행동을 평균 하나로 요약하면 세 관심이 섞인 중간 지점이 생긴다. 내적이나 코사인으로 후보를 찾으면 그 중간 지점과 가까운 아이템이 올라오고, 각 관심의 대표 아이템은 오히려 멀어질 수 있다(직관적 설명). MINER 저자들은 다양한 관심을 한 벡터에 압축해야 한다는 점을 병목으로 보고, 특히 관심이 여럿이고 이력이 긴 사용자에게 단일 벡터가 불충분하다고 설명한다. Alibaba MIND 저자들도 단일 벡터가 matching 단계의 부정확한 retrieval로 이어진다고 적는다.

```text
단일 벡터:  history -> u              -> score(u, item)
다중 관심:  history -> u_1, ..., u_K  -> 관심별 비교 -> 집계 또는 병합
```

다중 관심 표현은 이 병목을 줄이지만 비용도 함께 늘린다. 관심 벡터를 몇 개 둘지, 벡터들이 같은 관심으로 뭉치지 않게 할지, 후보 하나에 여러 관심 점수를 어떻게 합칠지를 따로 정해야 한다.

## 파이프라인 위치가 먼저다

Alibaba의 MIND(CIKM 2019)와 MINER(Findings of ACL 2022)는 둘 다 사용자마다 여러 관심 벡터를 만들지만 쓰이는 단계가 다르다.

| 구분 | Alibaba MIND | MINER |
|---|---|---|
| 단계 | 전체 catalog에서 후보를 찾는 matching(retrieval) | 주어진 후보 집합의 클릭 점수를 매겨 정렬하는 ranking |
| 관심 벡터 생성 | 행동 embedding을 dynamic routing으로 soft clustering한 interest capsule | 학습 가능한 context code K개가 각각 클릭 뉴스 embedding에 additive attention |
| 관심 수 | 상한 K와 선택적인 사용자별 휴리스틱 `K'_u = max(1, min(K, log2(\|I_u\|)))`(`I_u`는 사용자 행동 집합). Offline 표는 K를 hyper-parameter로만 적고 휴리스틱 적용 여부를 밝히지 않음. Online은 고정 K=1, 3, 5, 7과 K=7을 상한으로 휴리스틱을 적용한 판을 비교 | 모든 사용자에 공통인 hyper-parameter(실험 설정 K=32) |
| 관심 분리 | 초기 capsule이 같아지지 않게 routing logit을 Gaussian 무작위 값으로 초기화 | 관심 벡터 쌍의 평균 cosine 유사도를 줄이는 disagreement regularization |
| 후보 점수 | 학습은 label-aware attention으로 target에 맞는 관심을 고르고, retrieval 점수는 관심별 내적의 max | 관심별 내적을 max, mean 또는 후보 기반 weighted로 집계 |
| 서빙 | 관심별 ANN top N을 병합해 유사도로 정렬하고 상위 1000개를 ranker로 넘김 | 서빙 지연과 비용 보고 없음. 4.6절 recall 실험은 평균 벡터 bi-encoder. 식에서 유도하면 후보마다 관심별 내적과 후보에 의존하는 가중을 계산 |
| 논문 평가 | random 19:1 분할의 HitRate@N과 ranker를 고정한 1주 online A/B | Microsoft MIND 뉴스 데이터셋의 AUC, MRR, nDCG@5, nDCG@10과 MIND-small recall 실험 |

matching이라는 말도 두 논문에서 뜻이 다르다. Alibaba의 matching은 후보 생성 단계이고, MINER의 matching은 후보 뉴스와 관심 벡터를 맞대어 클릭 점수를 내는 연산이다. MINER 저자들은 자기 모델을 ranking model로 부르고, Alibaba MIND를 e-commerce 추천의 matching 단계용으로 설계된 모델로 구분한다. Alibaba MIND의 serving과 학습 결과는 [[Recommendation-System-Industry-Commerce-Marketplace#Alibaba MIND: multi-interest retrieval|커머스 사례의 MIND 절]]에 있다.

### 이름이 같은 MIND 두 개

MINER를 평가한 MIND는 Alibaba 모델이 아니라 Microsoft의 뉴스 추천 데이터셋(ACL 2020)이다.

- 2019-10-12부터 11-22까지 6주 동안 뉴스 클릭이 5회 이상인 사용자 100만 명을 무작위로 뽑았다. 뉴스는 161,013건, impression은 15,777,377건, 클릭은 24,155,470건이다.
- 각 샘플은 사용자, 시각, 클릭 이력과 impression 로그로 이뤄지고, impression 안의 뉴스마다 클릭 여부 label이 붙는다.
- 마지막 주를 test, 다섯째 주를 training으로 쓰고 다섯째 주 마지막 날을 validation으로 쓰는 시간 분할이다. 카테고리는 편집자가 붙였고, 뉴스의 84.5% 이상은 2일 안에 수명이 끝난다.
- MINER 논문은 이 전체 데이터(MIND-large)와 사용자 50,000명을 무작위로 뽑은 MIND-small을 함께 쓴다.

## MINER의 구성

뉴스 제목(최대 길이 20, leaderboard 제출은 32)을 BERT에 넣은 [CLS] 출력이 뉴스 embedding이고, 사용자의 최근 클릭 뉴스 50개로 관심을 만든다.

```text
관심 벡터    e_i = sum_j softmax_j( c_i^T tanh(W_h h_j) ) h_j      (i = 1..K, c_i는 학습되는 context code)
카테고리 가중  위 softmax의 logit에 lambda * cos(b_j, b_c)를 더함   (b는 이력 뉴스와 후보 뉴스의 카테고리 embedding)
관심별 점수    s_i = e_i^T h_c
weighted 집계  s = sum_i softmax_i( e_i^T gelu(W_e h_c) ) s_i
학습 목표     L = L_NCE + beta * L_D,  L_D = (1/K^2) sum_i sum_j cos(e_i, e_j)
```

- Poly attention은 context code마다 additive attention을 하나씩 두어 K개의 관심 벡터를 뽑는다. Poly-Encoder의 아이디어를 클릭 시퀀스에 옮긴 구조다.
- Disagreement regularization은 모든 관심 벡터 쌍의 평균 cosine 유사도를 줄여 벡터들을 서로 다르게 만든다. K=4로 둔 한 impression 사례의 시각화에서 이 항을 넣은 뒤 관심별 attention 분포가 더 다양해졌다.
- Category-aware attention weighting은 이력 뉴스 가운데 후보 뉴스와 카테고리가 비슷한 것에 attention을 더 준다. 카테고리 embedding은 300차원 GloVe로 초기화하고 고정했으며, 카테고리 embedding을 단순히 이어 붙인 방식은 성능이 더 낮았다.
- 학습은 클릭 뉴스 하나에 같은 session의 비클릭 뉴스 4개를 negative로 묶은 NCE loss에 disagreement 항(beta=0.8)을 더한다.
- 저자들은 soft attention으로 배운 관심 벡터에 명시적인 의미가 없을 수 있다고 적는다. 관심 벡터를 카테고리 label이나 화면의 추천 이유로 바로 쓰지 않는다(해석).

## 논문 결과를 읽는 법

- **주요 수치:** MIND-large에서 MINER-weighted는 AUC 71.51, MRR 36.18, nDCG@5 39.72, nDCG@10 45.34로, 표의 기존 최고였던 UNBERT의 70.68, 35.68, 39.13, 44.78보다 높았다. 비교 기준인 UNBERT를 포함한 일부 baseline 수치는 다른 논문에서 가져왔고, 공식 leaderboard 1위는 ensemble 모델의 결과다.
- **집계 방식의 차이:** 성능은 weighted, mean, max 순이었다. 저자들은 mean이 max보다 나은 가능한 이유로, 다이어트 뉴스가 건강과 음식 관심에 함께 맞는 것처럼 후보 하나가 여러 관심과 맞을 수 있다는 점을 들었다. MIND-small에서 MINER-max는 AUC 67.39로, 같은 데이터의 K 분석에서 K=1로 단일 벡터가 된 결과(68.92)와 표의 NRMS+BERT 68.60, LSTUR+BERT 68.28, HieRec 67.95, UNBERT 67.62보다 낮았다. MIND-large에서는 MINER-max(69.97)가 다른 논문에서 가져온 NRMS+BERT 수치보다 높았지만 UNBERT 70.68보다는 낮았다. 관심 벡터를 여러 개 두는 것만으로 이득이 보장되지 않고 집계가 과제에 맞아야 한다는 뜻으로 읽는다(해석). K 분석이 Table 2의 MINER-max와 같은 구성인지는 논문에 명시돼 있지 않다.
- **관심 수:** MIND-small에서 K를 1, 4, 16, 32, 48, 64로 바꾼 결과 32가 가장 좋았다. 너무 큰 K가 중복 파라미터로 성능을 해칠 수 있다는 설명과 최적 K가 이력 길이에 따라 달라질 수 있다는 설명은 저자들의 추측이다. K=1에서도 AUC 68.92가 나온 것을 저자들은 BERT 뉴스 인코더와 category 가중의 효과로 봤다.
- **Ablation:** MIND-small 결과에서 저자들은 카테고리 가중을 뺀 하락이 disagreement 항을 뺀 하락보다 훨씬 크다고 썼다. BERT를 쓰지 않은 행에서는 세 지표 모두 그렇지만, BERT를 쓴 행에서는 AUC만 그렇고 MRR과 nDCG@10은 disagreement 항을 뺐을 때 더 떨어졌다(disagreement 항을 뺀 값, category 가중을 뺀 값 순으로 MRR 33.46과 33.60, nDCG@10 43.56과 43.60).

## 집계 방식이 서빙 위치를 정한다

아래는 두 논문의 점수 식에서 유도한 해석이다.

- **max 집계는 관심별 검색으로 나뉜다.** 점수가 `max_i e_i^T h`이면 정확한 검색에서 관심별 top N을 합쳐 max 점수로 다시 정렬한 결과가 전체 top N과 같다(동점 제외). 전체 top N에 드는 아이템은 자기 점수를 만든 관심의 top N에도 반드시 들기 때문이다. Alibaba MIND가 관심별 ANN 결과를 병합하는 serving이 이 구조이고, ANN의 근사만큼 결과도 근사가 된다.
- **mean 집계는 평균 벡터 하나와 같다.** 내적이 선형이므로 `(1/K) sum_i e_i^T h = ((1/K) sum_i e_i)^T h`다. MINER 논문의 recall 실험은 후보 정보를 쓰지 않도록 category 가중을 뺀 MINER-mean으로 관심 벡터를 평균해 검색했으므로, 실질적으로 단일 벡터 검색이다. 이 실험의 recall 우위는 다중 벡터 검색이 아니라 poly attention으로 학습한 표현을 평균해 쓴 효과로 읽는다.
- **weighted 집계는 ranking 단계에 속한다.** ANN index에는 미리 계산한 아이템 벡터가 들어가고 사용자 벡터는 요청 때 질의로 쓴다. weighted 집계의 가중치는 `h_c`에 의존하는 logit을 관심 K개에 대해 softmax한 값이므로, 후보와 무관한 질의 벡터 하나로 색인된 아이템을 검색하는 방식으로 바꿀 수 없다. 후보마다 다시 계산한다는 점에서 [[Recommendation-System-Industry-Commerce-Marketplace#Alibaba DIN: candidate-aware ranking|DIN의 candidate-aware ranking]]과 같은 위치다.
- **category 가중은 카테고리별 질의로 우회할 여지가 있다.** 이 가중은 후보에 의존하므로 질의 하나로는 안 되지만, 후보 정보 가운데 카테고리 embedding `b_c`에만 의존한다. 아이템마다 카테고리가 하나라면 max나 mean 집계와 함께 쓸 때 카테고리마다 관심 벡터를 다시 만들어 카테고리 필터를 건 ANN으로 검색하는 방식이 식으로 가능하다. max 집계면 질의는 카테고리 수 곱하기 K개로, MIND-large의 카테고리 20개와 K=32라면 640개다. weighted 집계와 함께 쓰면 위의 이유로 여전히 바꿀 수 없다. MINER 논문은 이 방식을 시험하지 않았고 서빙 지연과 비용도 보고하지 않았다.

## 관심 수 K와 비용

- Alibaba MIND의 휴리스틱은 행동이 적은 사용자에게 관심 벡터를 덜 만들어 계산과 메모리를 아낀다. Tmall의 online 실험에서는 관심 수를 1에서 5로 늘릴수록 좋아졌고 최적은 5~7이었다. 사용자별 관심 수 조정은 CTR 이득을 내지 않았고, 저자들은 서빙 비용을 줄일 수 있다고 수치 없이 적었다. Offline 최적 K는 Amazon Books 3, TmallData 5였다.
- MINER의 K=32는 모든 사용자에 같은 값이다.
- 같은 K라도 비용의 의미가 다르다. Alibaba MIND에서는 요청마다 실행할 ANN 질의 수와 병합할 후보량이다. MINER에서 max와 weighted 집계는 후보마다 관심별 점수 K개가 필요하고(mean은 평균 벡터와의 내적 하나), weighted 집계는 가중치 계산에 내적 K개가 더 든다. 가중치에 쓰는 `gelu(W_e h_c)` 투영은 아이템에만 의존하므로 미리 계산해 둘 수 있다. category 가중을 쓰면 후보 카테고리마다 이력 50개에 대한 attention으로 관심 벡터 K개를 다시 만든다. 한 논문의 K 값을 다른 단계에 그대로 옮기지 않는다(식에서 유도한 해석).

## 적용 점검

다음은 두 논문을 실무에 옮길 때의 점검 제안이다.

- 다중 관심을 후보 생성에 쓸지, 좁혀진 후보의 ranking에 쓸지 먼저 정한다. 후보에 의존하는 집계는 질의 벡터 하나의 ANN 검색으로 바꿀 수 없다.
- K=1이나 mean 집계 같은 단일 벡터 기준선과 같은 데이터, 같은 분할로 비교해 다중 관심의 증분을 확인한다.
- 관심별 후보를 합칠 때는 정본 ID 기준 dedup, 관심별 quota와 공통 ranker의 재점수화를 [[Recommendation-System-Candidate-Generation#병합 계층의 계약|병합 계층의 계약]]으로 정한다.
- Offline 분할을 확인한다. Alibaba MIND의 offline 평가는 random 19:1 분할이고 Microsoft MIND는 시간 분할이다. 수명이 짧은 아이템일수록 시간 분할이 실제 serving에 가깝다.
- 여러 지면에 같은 모델을 적용하면 지면마다 단계 위치, label과 [[Recommendation-System-Eligibility-Availability|eligibility]]가 다르므로 K와 집계 방식을 지면별로 다시 검증한다.
- 관심 벡터를 사용자에게 보이는 설명으로 쓰려면 의미가 있는지 따로 검증한다.

## 출처

- [MINER: Multi-Interest Matching Network for News Recommendation — Findings of ACL 2022, Jian Li 외](https://aclanthology.org/2022.findings-acl.29/) — 2026-11-04 PDF 전문 대조. 1절과 2.1절의 문제 정의와 Alibaba MIND와의 구분, 3.1~3.5절의 과제 정의, poly attention, disagreement regularization, 집계와 category 가중, 학습 목표, 4.1~4.7절의 설정, Table 2~3 수치, K 분석과 recall 실험
- [Multi-Interest Network with Dynamic Routing for Recommendation at Tmall — CIKM 2019, Chao Li 외](https://arxiv.org/abs/1904.08030) — 2026-11-04 arXiv v1 전문 대조. 3.1절 점수 함수, 3.3절 단일 벡터의 한계와 3.3.2절 routing 초기화와 관심 수 휴리스틱, 3.4~3.5절 label-aware attention과 serving, 4.1~4.3절 offline과 online 실험, 5절 병합과 상위 1000개 전달
- [MIND: A Large-scale Dataset for News Recommendation — ACL 2020, Fangzhao Wu 외](https://aclanthology.org/2020.acl-main.331/) — 2026-11-04 PDF 전문 대조. 3.1~3.2절 수집 기간, 샘플 형식, 시간 분할과 통계, 5.1절 평가 지표

## 관련 문서

- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]
- [[Recommendation-System-Industry-Commerce-Marketplace|커머스와 마켓플레이스 산업 사례]]
- [[Recommendation-System-Evaluation-Experimentation|평가와 실험]]
- [[Vector-Similarity-Search|벡터 유사도 검색과 ANN]]
