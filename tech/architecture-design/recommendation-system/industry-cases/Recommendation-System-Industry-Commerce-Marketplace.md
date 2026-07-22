---
tags: [architecture, recommendation-system, industry-case-study, commerce, marketplace]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Commerce Marketplace Cases", "추천 시스템 커머스 마켓플레이스 사례"]
---

# 커머스와 마켓플레이스 추천 시스템 산업 사례

Amazon, Alibaba, Airbnb 사례는 상품을 추천한다는 표면만 비슷하다. Amazon item-to-item은 안정적인 item 관계를 사전 계산하는 방식, Alibaba DIN은 후보별 CTR ranking, MIND는 다중 관심 retrieval, Airbnb는 재고와 양쪽 선호가 있는 marketplace ranking 사례다.

## 전체 비교

| 사례 | Pipeline 위치 | 주된 신호 | 공개 목적 | 핵심 제약 |
|---|---|---|---|---|
| Amazon item-to-item | 후보 생성과 설명 가능한 조합 | 구매, 평가, browse와 현재 맥락 | 관련 item 발견 | 큰 catalog와 낮은 online 계산비 |
| Alibaba DIN | Candidate ranking | 행동 history, candidate, context | CTR과 사업 점수 | 후보마다 다른 user interest |
| Alibaba MIND | Matching과 retrieval | 다수의 과거 item behavior | 다음 item 후보 recall | 한 사용자의 다양한 관심 |
| Airbnb embedding | Similar Listings와 search ranker feature | click, skip, booking, host rejection | booking에 가까운 relevance | availability와 양면시장 |

## Amazon item-to-item collaborative filtering

### 문제와 점수의 의미

2003년 공개 설계는 요청 시 비슷한 사용자를 찾는 대신 item 사이의 relatedness를 사전 계산한다. 기본 직관은 item A를 산 고객이 평균 고객보다 item B도 살 가능성이 얼마나 더 높은가다.

이는 현대 supervised model의 특정 loss를 공개한 사례가 아니다. Co-purchase와 다른 관심 신호로 item 관계를 만들고, 현재 사용자의 context에 있는 item별 관련 목록을 합치는 알고리즘이다.

### Offline과 online 분리

```text
Offline
  user-item behavior -> item pair relatedness -> related-item table

Online
  current cart / browse / history
  -> item별 related list lookup
  -> merge와 weight
  -> 이미 본 상품과 구매 상품 filter
  -> recommendation
```

대부분의 pair 계산을 batch로 옮기므로 online 경로는 table lookup과 짧은 목록 조합으로 끝난다. 새 행동은 전체 relation table을 즉시 다시 만들지 않아도 사용자 context에는 바로 추가할 수 있다.

### Product surface가 목적을 바꾼다

2017년 회고는 당시 Amazon의 여러 표면을 구분한다.

- Homepage는 과거 구매와 관심 기반 개인화다.
- Search result는 현재 query와 관련된 상품이 중요하다.
- Cart와 product detail은 각각 보완 상품, 현재 item과의 관계가 중심이다.
- Order 이후와 email은 다음 구매 시점과 장기 관심을 본다.

같은 item-to-item table을 사용해도 source item, filter, relation type과 설명 문구가 달라진다. 유사 상품과 함께 사는 상품을 하나의 similarity로 합치면 사용자 의도와 맞지 않을 수 있다.

### 평가와 근거 경계

공개 논문과 회고는 scale과 perceived quality, controlled online experiment의 필요성을 설명하지만 재사용 가능한 A/B lift를 제시하지 않는다. 2003년 설계와 2017년 개선 회고도 같은 시점의 구현이 아니다.

이 사례는 현대 Amazon Store, Prime Video와 Ads의 현재 모델을 설명하지 않는다. 전이할 부분은 안정적인 item relation을 미리 계산하고 최신 context를 online에서 가볍게 조합하는 구조다.

## Alibaba DIN: candidate-aware ranking

### Pipeline 위치

DIN은 billion-item retrieval이 아니라 upstream matching이 만든 candidate ad를 점수화하는 CTR ranking model이다. 공개 표면은 2017년 Alibaba e-commerce display advertising이다.

입력은 네 그룹으로 나뉜다.

1. User profile: 연령대와 같은 profile attribute
2. User behavior: 방문한 상품, shop, category ID history
3. Candidate ad: 현재 점수화할 상품과 category
4. Context: placement와 time 같은 request 정보

### Local activation

고정 user vector는 모든 후보에 같은 관심 표현을 사용한다. DIN은 candidate embedding과 각 history item embedding을 local activation unit에 넣어 후보와 관련된 행동에 더 큰 weight를 준다.

```text
candidate A -> history 중 A와 관련된 행동을 강조 -> user vector A
candidate B -> history 중 B와 관련된 행동을 강조 -> user vector B
```

이 user vector를 profile, candidate, context embedding과 합쳐 MLP가 click probability를 예측한다. Candidate마다 history attention을 다시 계산하므로 정밀 ranking에는 맞지만 전체 catalog retrieval에는 비싸다.

### 학습, 평가와 serving

- Label은 click 여부이고 loss는 binary negative log-likelihood다.
- 논문은 2주 약 20억 sample 학습, 다음 날 약 1.4억 sample 평가를 보고한다.
- Offline은 impression-weighted per-user AUC와 relative improvement를 사용한다.
- 2017년 약 한 달 A/B에서 당시 baseline 대비 최대 CTR 10.0%, RPM 3.8% 향상을 보고했다.
- Peak traffic에서 많은 candidate를 짧은 시간에 점수화하기 위해 request batching과 GPU serving 최적화를 함께 적용했다.

이 수치들은 당시 ad baseline과 traffic의 결과다. Organic 상품 추천이나 현재 Alibaba 공통 모델의 기대 lift로 사용하면 안 된다.

## Alibaba MIND: multi-interest retrieval

### Single-vector bottleneck

한 사용자가 전자기기, 책, 운동용품을 모두 본다면 하나의 평균 embedding은 서로 다른 관심을 섞는다. MIND는 behavior embedding을 dynamic routing으로 여러 interest capsule에 soft-cluster해 여러 user vector를 만든다.

Training에서는 target item이 label-aware attention으로 관련 interest를 선택한다. Serving에는 target을 미리 알 수 없으므로 여러 interest vector 각각으로 ANN retrieval을 수행하고 후보를 merge한다.

```text
behavior history
  -> multiple interest vectors
  -> interest별 ANN retrieval
  -> merge와 similarity sort
  -> top 1000
  -> downstream CTR ranker
```

### 학습과 공개 결과

- Objective는 interacted target item의 sampled-softmax probability를 높이는 것이다.
- Offline task는 과거 behavior로 target item을 맞히는 next-item prediction이며 HitRate@K를 사용한다.
- 공개 offline split은 user-item interaction data를 random 19:1로 나누고 사용자별 target item을 무작위 선택하므로 strict temporal holdout이 아니다.
- Online 비교는 matching만 바꾸고 downstream ranker를 동일하게 유지해 retrieval 효과를 격리했다.
- 논문은 billion-scale pool에서 수천 후보를 15ms 미만에 찾고 daily model update를 수행한 사례를 보고한다.

MIND는 CIKM 2019 Tmall homepage matching 사례다. DIN과 같은 ranking model이 아니며, explicit time interval을 직접 모델링한 sequence model도 아니다.

## Airbnb: availability가 있는 양면 marketplace

### 일반 상품 추천과 다른 점

- 같은 숙소를 반복 예약하는 빈도가 낮다.
- 숙소는 특정 날짜에 한 예약만 받을 수 있다.
- Guest가 선호해도 host가 수락하지 않으면 transaction이 성립하지 않는다.
- 위치, 날짜, 인원과 가격이 hard eligibility가 된다.

따라서 embedding similarity는 후보 자격과 양쪽 전환을 대신할 수 없다.

### Short-term listing embedding

2018년 공개 사례는 click gap 30분으로 session을 나누고 skip-gram과 negative sampling으로 32차원 listing embedding을 학습했다.

- 가까운 click은 positive context다.
- Random listing은 negative다.
- 같은 market의 random listing을 hard negative로 추가한다.
- Booking으로 끝난 session은 booked listing을 앞선 click 전체의 global positive로 둔다.

### Long-term과 양쪽 신호

Booking은 click보다 희소해 raw user와 listing ID만으로 long-term embedding을 만들기 어렵다. 공개 논문은 규칙으로 묶은 user type과 listing type을 같은 공간에서 학습하고, host rejection을 explicit negative로 넣는다.

이는 guest 취향만이 아니라 host acceptance도 transaction signal이라는 뜻이다. Type abstraction은 sparsity를 줄이지만 개인별 세부 차이를 잃는 대가가 있다.

### 두 serving surface

**Similar Listings**는 같은 market과 해당 날짜 availability를 만족한 후보에서 cosine kNN top 12를 표시했다. 즉 ANN이나 kNN 이전에 eligibility filter가 있다.

**Search Ranking**은 Kafka로 최근 click과 skip history를 유지하고, candidate와 최근 행동 사이의 embedding similarity를 기존 GBDT ranker feature로 추가했다. 이 사례에서 embedding은 search의 독립 retrieval model이 아니다.

### 평가 결과를 섞지 않는다

- Similar Listings A/B는 carousel CTR 21% 증가와 최종 booking listing을 carousel에서 발견한 guest 4.9% 증가를 보고했다.
- Search는 offline holdout 개선과 statistically significant booking gain을 보고했지만 정확한 online lift는 공개하지 않았다.
- 두 표면이 당시 booking conversion의 99%를 담당했다는 설명은 recommender 자체의 기여율이 아니다.

이 결과는 2017년 출시를 2018년에 공개한 Airbnb Homes 사례다. 현재 Airbnb search stack이나 별도의 최신 embedding retrieval 구조와 합치면 안 된다.

## 전이 가능한 설계 선택

| 상황 | 우선 참고할 패턴 |
|---|---|
| 설명 가능하고 안정적인 related item | Amazon offline relation table과 online context merge |
| 좁혀진 후보를 history와 정밀 비교 | DIN candidate-aware activation |
| 다양한 관심으로 큰 catalog retrieval | MIND multiple user vectors와 ANN |
| 재고와 양쪽 수락이 필요한 거래 | Airbnb eligibility와 bilateral negative signal |

모델을 고르기 전에 surface, label, eligibility와 retrieval/ranking 위치를 먼저 고정한다. DIN attention을 retrieval에 그대로 쓰거나 MIND vector를 final ranking으로 끝내는 식의 단계 혼동을 피한다.

## 관련 문서

- [[Recommendation-System-Industry-Case-Studies|추천 시스템 산업 사례 지도]]
- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]
- [[Recommendation-System-Evaluation-Experimentation|평가와 실험]]

## 출처

- [Amazon.com Recommendations: Item-to-Item Collaborative Filtering - IEEE](https://doi.org/10.1109/MIC.2003.1167344)
- [Two Decades of Recommender Systems at Amazon.com - Amazon Science](https://www.amazon.science/publications/two-decades-of-recommender-systems-at-amazon-com)
- [Deep Interest Network for Click-Through Rate Prediction - Alibaba 연구진](https://arxiv.org/abs/1706.06978)
- [Multi-Interest Network with Dynamic Routing for Recommendation at Tmall - Alibaba 연구진](https://arxiv.org/abs/1904.08030)
- [Real-time Personalization using Embeddings for Search Ranking at Airbnb - KDD](https://www.kdd.org/kdd2018/accepted-papers/view/real-time-personalization-using-embeddings-for-search-ranking-at-airbnb)
- [Listing Embeddings for Similar Listing Recommendations and Search Personalization - Airbnb Engineering](https://medium.com/airbnb-engineering/listing-embeddings-for-similar-listing-recommendations-and-real-time-personalization-in-search-601172f7603e)
