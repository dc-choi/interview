---
tags: [architecture, recommendation-system, ranking, reranking, learning-to-rank, multi-objective]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation Ranking and Reranking", "추천 랭킹과 재랭킹", "추천 순위화"]
---

# 추천 시스템 랭킹과 재랭킹

랭커는 여러 source에서 모인 후보를 공통 기준으로 scoring하고, 재랭커는 최종 목록 전체에 적용할 정책과 제약을 처리한다. 개별 아이템의 예상 효용과 목록 전체의 품질을 한 책임으로 섞지 않는 것이 핵심이다.

## 후보 점수와 랭킹 점수를 분리한다

후보 생성기의 점수는 source 내부 검색에 맞춰져 있다. ANN 내적, 인기도, 편집 우선순위는 scale과 의미가 다르므로 그대로 합쳐 최종 순서를 만들 수 없다.

공통 랭커는 작은 후보군에서 더 많은 특징과 복잡한 모델을 사용한다.

```text
rankScore = f(user features, item features, context features, cross features)
```

- 사용자 특징: 장기 취향, 최근 행동, 구독 상태
- 아이템 특징: 장르와 taxonomy concept, 신선도, 품질, 인기도, 제공 상태
- 요청 맥락: 시간, 기기, 화면, 현재 콘텐츠, session
- 교차 특징: 사용자 taxonomy affinity와 작품의 축별 overlap, 반복 노출, 시청 진행률
- 후보 특징: source, source 내부 rank와 원점수

특징은 많을수록 좋은 것이 아니다. 계산 비용, freshness와 결측률을 함께 관리해야 하며, training과 serving에서 같은 정의를 사용해야 한다.

## 단계별 특징 비용

| 계층 | 후보 규모 | 적합한 특징 | 이유 |
|---|---:|---|---|
| Retrieval | 수백에서 수천 이상 | 미리 계산한 embedding, 가벼운 맥락 | 높은 Recall과 저지연 우선 |
| Ranking | 수십에서 수백 | 사용자, 아이템과 교차 특징 | 작은 집합에서 정밀 scoring 가능 |
| Reranking | 최종 목록 근처 | 목록 중복, 다양성, 정책 상태 | 아이템 간 관계와 hard constraint 처리 |

비용이 낮고 반드시 지켜야 하는 법적 차단, 연령과 안전 조건은 랭킹 전에 적용해 낭비를 줄이고 응답 직전에도 검사한다. 현재 가용성, 구독과 재소비 조건은 surface 정책이 hard로 선언했을 때 같은 방식으로 적용한다.

## 학습 목표는 제품 행동을 만든다

랭커는 일반적인 좋음을 배우는 것이 아니라 label과 loss로 정의한 목표를 최적화한다.

| 접근 | 학습 단위 | 적합한 질문 | 주의점 |
|---|---|---|---|
| Pointwise | 아이템 하나의 점수 또는 확률 | 클릭, 재생, 별점을 얼마나 잘 예측하는가 | 점수 오차가 Top K 순서와 같지 않음 |
| Pairwise | 아이템 쌍의 상대 순서 | positive를 sampled item보다 위에 두는가 | pair sampling이 목표를 바꿈 |
| Listwise | 후보 목록의 순서 | 전체 slate의 순서를 직접 개선하는가 | 목록 단위 학습 데이터, loss 계산 비용과 목록 구성 의존성 |

Pointwise, pairwise와 listwise는 주로 학습 예제와 loss의 단위다. 같은 scorer를 서로 다른 loss로 학습할 수 있으므로 학습 방식만으로 추론 비용이 정해지지 않는다. 서빙 비용은 모델 구조, 후보 수와 목록 전체를 함께 추론하는지에 달려 있으며, 각 loss는 데이터와 목표 지표로 비교한다.

GBDT는 scorer의 모델 계열이고 Learning-to-Rank는 순서 학습 문제와 목적함수의 계열이다. 둘은 대안 축이 아니며 LambdaMART처럼 gradient boosted tree에 pairwise 순서 목적을 결합할 수 있다.

## Implicit label을 그대로 믿지 않는다

- 클릭은 관심 신호지만 제목과 위치의 영향을 받는다.
- 재생 시간은 소비 깊이를 보여주지만 콘텐츠 길이와 자동 재생에 영향받는다.
- 완주율은 길이 차이를 일부 보정하지만 짧은 콘텐츠에 유리할 수 있다.
- 저장과 좋아요는 의미가 강하지만 사용 빈도가 낮다.
- 숨김, 건너뛰기와 dislike는 강한 부정 신호지만 UI 노출과 기능 인지 여부에 좌우된다.

랭킹 학습 전에 각 event가 무엇을 관측한 것인지 정의해야 한다. 노출되지 않은 아이템과 노출됐지만 선택되지 않은 아이템도 구분한다. 자세한 계약은 [[Recommendation-System-Feedback-Data|피드백 데이터]]가 소유한다.

## Multi-task와 Multi-objective

추천에는 클릭, 재생, 시청 시간, 완주, 만족도와 재방문처럼 경쟁하는 목표가 있다. Multi-task 모델은 여러 loss를 함께 학습하고 일부 표현을 공유할 수 있다.

```text
utility = w1 * P(play) + w2 * E(watch time) + w3 * P(save) - w4 * P(hide)
```

이 식은 구조 예시일 뿐 보편 공식이 아니다. 확률과 시간처럼 단위가 다른 출력을 합치려면 의미, calibration, clipping과 weight 변경 절차를 정해야 한다. Weight는 기술 상수가 아니라 제품 가치와 위험을 반영하는 정책이다.

CTR만 최적화하면 clickbait가, 시청 시간만 최적화하면 긴 콘텐츠가 유리해질 수 있다. 주 목표 밖의 장기 만족, 이탈, 신고, 공급자 노출과 지연을 guardrail로 둔다.

## 맥락과 순차 추천

장기 사용자 embedding만으로는 현재 의도 변화를 놓칠 수 있다.

- Session-based 추천은 로그인 이력보다 현재 session의 짧은 행동 순서를 중심으로 본다.
- Sequential 추천은 장기 이력의 순서와 최근성을 함께 모델링한다.
- Markov 또는 item-to-item 방식은 단순하고 희소 데이터에서 강한 baseline이 될 수 있다.
- RNN과 self-attention은 더 긴 의존성을 표현하지만 데이터, 계산과 운영 비용이 커진다.

SASRec 같은 모델은 과거 interaction 중 다음 행동과 관련 있는 항목에 attention을 둔다. Transformer라는 이유만으로 단순 baseline보다 낫다고 가정하지 않고, sequence 길이와 밀도별로 비교한다.

## 재랭킹은 목록 전체를 본다

랭커가 각 아이템을 독립 scoring하면 상위 결과가 같은 시리즈나 장르로 몰릴 수 있다. 재랭커는 후보 간 관계와 제품 정책을 사용해 최종 slate를 조정한다.

### Hard constraint는 surface 계약이다

- 법적 차단, 연령과 안전 정책, 삭제된 정본은 모든 surface와 fallback에서 우회하지 않는다.
- 현재 시청 가능성은 지금 보기 화면에서는 hard지만 발견 화면에서는 작품 카드와 offer CTA를 다르게 처리할 수 있다.
- 구독 불일치, 이미 소비한 작품과 공개 예정작은 화면 목적에 따라 hard, soft 또는 허용이 된다.
- 콘텐츠 목록은 정본 item으로 묶을 수 있지만 제공처 비교 화면은 같은 작품의 여러 offer를 보존한다.

[[Recommendation-System-Eligibility-Availability|Versioned eligibility policy]]는 `ALLOW`, `DENY`, `DEGRADE`와 reason code를 반환한다. `UNAVAILABLE`, 계산된 `STALE` 또는 구독 `UNKNOWN`을 임의의 낮은 점수로 바꾸지 않고 surface가 fail-closed, CTA 제거 또는 fallback을 결정한다. Hard로 선언된 `DENY`는 모델 점수로 타협하지 않는다.

### Soft objective

- 같은 장르, 시리즈와 출연진의 반복 억제
- 신작, 장기 미노출과 탐색 후보의 제한적 승격
- 사용자 관점의 novelty와 catalog 관점의 coverage
- 소비자와 공급자 양쪽의 노출 편향 감시
- 캠페인과 편집 후보의 상한, 하한 조정

Soft objective는 정확도와 tradeoff가 있으므로 weight와 영향 범위를 실험한다. 다양성 지표 하나로 공정성을 대신할 수 없으며, 어떤 사용자와 공급자 집단의 exposure를 보는지 별도 정의가 필요하다.

## Exploration과 Exploitation

현재 점수가 높은 것만 반복 노출하면 새 아이템과 취향을 학습할 기회가 줄어든다. 반대로 무작위 탐색이 많으면 단기 품질이 떨어진다.

- 탐색 가능한 slot과 대상군을 제한한다.
- 안전과 제공 조건을 통과한 후보 안에서만 탐색한다.
- 선택 확률을 아는 stochastic policy는 최종 hard eligibility를 적용하고 고정한 action space에서 실행하며 [[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터|logging policy와 실제 served slate의 propensity 계약]]을 기록한다. 늦은 재검사가 slate를 바꾸면 기존 결정을 폐기하고 새 action space에서 정책 전체를 새 ID로 다시 sample하거나 해당 요청을 OPE에서 제외한다. 단순 삭제, 압축이나 보충에는 기존 propensity를 재사용하지 않는다.
- 탐색 트래픽의 사용자 가치 비용과 얻은 정보량을 함께 본다.

탐색은 Cold Start의 만능 해법이 아니라 데이터 수집 정책이다. Off-policy 평가 가능성은 logging support와 정책 간 overlap에 달려 있다.

## 실패 패턴

| 증상 | 확인할 원인 |
|---|---|
| CTR 상승, 만족도 하락 | label과 제품 목표 불일치, clickbait |
| 인기 콘텐츠 도배 | source/feature popularity bias, diversity 정책 부족 |
| 최신 행동 미반영 | online feature 지연, sequence window 문제 |
| 특정 source만 상위 독점 | source score 직접 비교, ranker feature 누락 |
| 오프라인 상승, 온라인 무효 | 노출 편향, 데이터 누수, proxy와 가치 불일치 |
| 지연 급증 | 비싼 교차 특징, 후보 수 증가, 외부 feature 조회 |

## 평가와 운영 계약

- Ranking: NDCG@K, Precision@K, MRR와 목적별 calibration
- Slate: diversity, novelty, repetition과 constraint violation
- Aggregate/ecosystem: 기간 내 catalog coverage와 사용자 및 공급자 집단별 exposure distribution
- Product: 재생, 완주, 저장, 숨김, 재방문과 이탈
- System: stage별 p95와 p99, timeout, fallback과 빈 결과율
- Slice: 신규 사용자, 신규 아이템, 지역, 기기와 공급자 집단

새 랭커는 shadow scoring으로 점수 분포와 지연을 확인하고, 작은 실험에서 주 지표와 guardrail을 검증한다. 모델만 되돌려도 feature schema나 embedding이 호환되지 않으면 복구되지 않으므로 배포 단위는 [[Recommendation-System-Serving-Operations|서빙과 운영]]에서 정의한다.

## 관련 문서

- [[Recommendation-System-Architecture|추천 시스템 지식 지도]]
- [[Recommendation-System-Candidate-Generation|추천 후보 생성]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Recommendation-System-Eligibility-Availability|추천 자격 조건과 가용성]]
- [[Recommendation-System-Evaluation-Experimentation|추천 평가와 실험]]
- [[OpenSearch-Relevance-Tuning#rescore — top-N 2단계 재정렬|검색의 2단계 재정렬]]
- [[Personalization-Recommendation|개인화와 추천의 비즈니스 관점]]

## 출처

- [Scoring - Google for Developers](https://developers.google.com/machine-learning/recommendation/dnn/scoring)
- [Re-ranking - Google for Developers](https://developers.google.com/machine-learning/recommendation/dnn/re-ranking)
- [Listwise ranking - TensorFlow Recommenders](https://www.tensorflow.org/recommenders/examples/listwise_ranking)
- [Multi-task recommenders - TensorFlow Recommenders](https://www.tensorflow.org/recommenders/examples/multitask)
- [Recommending What Video to Watch Next - Google Research](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/)
- [BPR: Bayesian Personalized Ranking - Rendle et al.](https://arxiv.org/abs/1205.2618)
- [Self-Attentive Sequential Recommendation - Kang, McAuley](https://arxiv.org/abs/1808.09781)
- [Joint Multisided Exposure Fairness for Recommendation - Google Research](https://research.google/pubs/joint-multisided-exposure-fairness-for-recommendation/)
- [Learning to Rank - XGBoost](https://xgboost.readthedocs.io/en/stable/tutorials/learning_to_rank.html)
- [개인화 추천 시스템 2, Personalized Content Ranking - 오늘의집](https://www.bucketplace.com/post/2024-07-10-%EA%B0%9C%EC%9D%B8%ED%99%94-%EC%B6%94%EC%B2%9C-%EC%8B%9C%EC%8A%A4%ED%85%9C-2-personalized-content-ranking/)
