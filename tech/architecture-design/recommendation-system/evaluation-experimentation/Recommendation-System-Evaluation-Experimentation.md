---
tags: [architecture, recommendation-system, evaluation, ranking-metrics, ab-testing, off-policy]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation Evaluation and Experimentation", "추천 평가와 실험", "추천 시스템 평가"]
---

# 추천 시스템 평가와 실험

추천 품질은 한 숫자로 판정할 수 없다. 후보 생성, 랭킹, 최종 목록, 제품 행동과 시스템 안정성은 서로 다른 질문에 답한다. 오프라인 평가는 출시 후보를 줄이고, 온라인 무작위 실험은 실제 사용자 가치의 인과 효과를 검증한다.

## 평가 사다리

```mermaid
flowchart LR
  A[데이터와 Label 검증] --> B[Offline Retrieval]
  B --> C[Offline Ranking과 Slate]
  C --> D[Shadow와 Replay]
  D --> E[Online A/B]
  E --> F[장기 모니터링]
```

앞 단계 통과가 다음 단계의 필요조건일 수 있지만 충분조건은 아니다. Offline NDCG 상승만으로 사용자 만족 개선이나 안전한 지연을 보장하지 않는다.

이 문서는 평가 계층과 출시 gate를 연결하는 상위 계약이다. OPE estimator의 식과 진단은 [[Recommendation-System-Off-Policy-Evaluation|Off-Policy Evaluation]], power와 ratio metric, CUPED, sequential test와 interference 분석은 [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]가 소유한다.

## 비교 전에 고정할 평가 계약

- 평가 시점과 train, validation, test 기간
- Relevant item과 label의 정의, attribution window, `labelAvailableAt`과 finalized 기준
- Candidate universe와 eligibility 조건
- `K`, metric 구현, tie와 중복 처리
- 신규 사용자와 신규 아이템 포함 기준
- Negative sampling 또는 full-catalog 여부
- 모델, dataset, feature schema와 code version

이 계약이 다르면 같은 `Recall@100`이나 `NDCG@20`도 직접 비교할 수 없다.

## 시간 누수를 막는다

1. Interaction의 시간 순서로 train, validation과 test를 나눈다.
2. Train에는 label 자체가 `trainingCutoff`까지 관측되거나 확정된 row만 넣는다.
3. 각 추천 시점 이전에 존재한 feature만 point-in-time join한다.
4. 당시 catalog와 제공 가능 조건을 복원한다.
5. Test 기간의 popularity와 aggregate가 학습 feature에 섞이지 않았는지 확인한다.
6. 사용자나 item 단위 중복이 split 경계를 통해 정보를 누설하는지 검사한다.

Temporal split만으로는 충분하지 않다. 미래에 계산된 완주율이나 인기도를 과거 row에 join하거나, cutoff 뒤 확정된 구매와 재방문을 train label로 사용하면 dataset 순서가 맞아도 leakage가 생긴다. 최대 attribution window만큼 purge gap을 두거나 censoring과 delayed-feedback estimator를 평가 계약에 고정한다.

## 단계별 정확도 지표

| 대상 | 대표 지표 | 답하는 질문 | 한계 |
|---|---|---|---|
| Retrieval | Recall@K, eligible Recall@K | Relevant item과 적격 item이 후보에 들어온 비율은 얼마인가 | Relevant set과 [[Recommendation-System-Candidate-Generation#Filter 순서와 underfill\|filter 위치]]에 민감 |
| Retrieval | Hit Rate@K | 사용자별로 relevant item을 하나라도 찾았는가 | 여러 relevant item의 누락을 숨김 |
| Ranking | Precision@K | 상위 K 중 relevant 비율은 얼마인가 | Recall과 graded relevance 미반영 |
| Ranking | NDCG@K | 높은 relevance를 상단에 배치했는가 | Gain과 discount 정의에 의존 |
| Ranking | MRR | 첫 relevant item이 얼마나 위에 있는가 | 첫 성공 뒤의 목록 품질 미반영 |
| Rating | RMSE, MAE | Explicit score를 얼마나 정확히 예측하는가 | Top K 순위를 직접 측정하지 않음 |

후보 생성은 ranker가 복구할 수 없는 누락을 측정하므로 Recall 중심으로 보고, 랭킹은 상단 위치와 relevance 수준을 보는 NDCG 같은 지표를 함께 사용한다.

## 목록과 생태계 지표

- `Catalog Coverage`: 일정 기간 추천된 고유 item의 카탈로그 비율
- `Diversity`: 같은 slate 안의 item들이 얼마나 다른가
- `Novelty`: 사용자에게 덜 익숙하거나 덜 인기 있는 항목을 포함하는가
- `Freshness`: 새 item과 최신 상태가 적시에 반영되는가
- `Repetition`: 최근 노출 또는 소비 항목이 과도하게 반복되는가
- `Constraint violation`: 제공, 안전과 정책 조건 위반이 있는가
- `Exposure by slice`: 사용자와 공급자 집단별 노출 분포가 어떠한가

정확도와 다양성을 하나의 점수로 합치면 tradeoff가 숨을 수 있다. 먼저 각각을 보고 제품 목표에 따라 Pareto tradeoff를 선택한다.

## Full-catalog와 sampled metric

전체 카탈로그에서 모든 negative를 scoring하는 평가는 비쌀 수 있다. 일부 negative만 뽑은 sampled metric은 계산을 줄이지만 naive sampling에서는 exact metric과 모델 순서를 보존하지 않을 수 있다.

- 가능하면 full-catalog 또는 실제 serving candidate universe로 평가한다.
- 불가피한 sampling에는 논문과 구현이 정의한 보정 estimator를 사용한다.
- Sampling 분포, 개수와 seed를 기록한다.
- Sampled metric을 exact metric의 대체값으로 해석하지 않는다.
- 모델 선택 후 더 넓은 candidate universe에서 재검증한다.

Sampling 규칙을 고정하는 것은 재현성에는 도움이 되지만 ranking reversal 자체를 해결하지 않는다.

## Baseline과 Slice

복잡한 모델은 다음 baseline과 비교한다.

- 전역 또는 세그먼트 인기
- 최신과 편집 목록
- Item-to-item 또는 단순 콘텐츠 유사도
- 이전 production policy

전체 평균만 보면 Cold Start와 long-tail 실패가 가려진다. 최소한 신규 사용자, 신규 item, 활동량 구간, 지역, 기기, source, 콘텐츠 범주와 공급자 집단을 분리한다. Slice 표본이 작으면 불확실성도 함께 보고한다.

## Offline과 Online이 어긋나는 이유

| 원인 | 설명 |
|---|---|
| 정책 편향 | 과거 recommender가 노출한 항목에서만 label 관측 |
| Proxy mismatch | 클릭이나 시청 시간이 장기 만족과 다름 |
| Distribution shift | 사용자, catalog와 UI가 시간에 따라 변함 |
| Feedback effect | 새 정책의 노출이 다음 행동과 학습 데이터를 바꿈 |
| 시스템 비용 | 더 좋은 모델이 지연, 오류와 fallback을 늘림 |
| Novelty effect | 새로운 UI나 목록에 대한 일시적 반응 |

그래서 Offline 개선은 실험 진입 기준이지 출시 결론이 아니다.

## 출시와 단계 승급 게이트

실험 시작 전에 가설, 변경 범위, 대상 population과 제외 기준을 고정한다. 다음 조건은 보고용 체크리스트가 아니라 다음 단계와 production ramp를 허용하는 gate다.

| Gate | 사전 정의와 통과 조건 |
|---|---|
| Assignment와 logging | Stable randomization unit, 대상 population과 allocation version, 독립 assignment event, assignment와 exposure 단계별 분모, SRM과 누락이 허용 범위 안 |
| Duration과 power | MDE, 최소 표본과 기간, 완결된 label window, 반복 관찰과 다중 비교 방식 충족 |
| Primary | 사전 정의한 effect size와 불확실성이 출시 기준 충족 |
| Guardrail | 숨김, 이탈, 신고, 부적격 노출과 공급자 편향이 각 non-inferiority margin 안 |
| Slice | 신규 사용자, heavy user, 주요 market, 기기와 공급자 집단에 중대한 악화가 없거나 적용 대상을 제한 |
| System | p95와 p99, 오류, timeout, fallback과 빈 결과가 SLO 충족 |
| Rollout | Canary hold window, 중단 조건, rollback trigger와 검증된 이전 bundle 준비 완료 |

사용자 기반 추천도 household, session, 공급자와 학습 데이터 공유로 interference가 생길 수 있다. 제품 구조에 맞는 randomization unit을 고르고, 실험 도중 variant가 서로의 학습 데이터에 영향을 주는 symbiosis를 진단한다.

ITT는 Assignment 모집단을 기준으로 계산하고 Request와 Impression 발생 여부를 결과 경로로 본다. Triggered 분석은 treatment의 영향을 받지 않는 counterfactual trigger를 양 variant에 기록하고, trigger complement에서 효과와 SRM이 없는지 확인한다. 노출자만 사후 선택해 전체 실험 효과로 일반화하지 않는다.

적용 가능한 gate를 하나라도 통과하지 못하면 primary metric이 상승해도 승급하지 않는다. 통계적 유의성만 보지 않고 효과 크기, 운영 비용과 제품 의미를 함께 판단한다.

Gate를 실제 계산으로 옮기는 절차, randomization/분석 단위, MDE와 power, ratio metric의 분산, CUPED, SRM과 반복 확인 통제는 [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]를 따른다.

## Off-policy Evaluation

과거 logging policy의 데이터로 새 policy를 평가하려면 실제 served action의 propensity, 정책 간 support와 같은 reward 계약이 필요하다. Candidate set과 최종 eligibility로 action space를 sample 전에 고정하고, late filter나 fallback이 slate를 바꾸면 composite 확률을 계산하거나 `INVALIDATED`로 제외한다. Seed는 선택 확률을 대신하지 않는다.

IPS, SNIPS, Direct Method, Doubly Robust, clipping과 Switch-DR의 식, ESS와 weight tail, support 및 bootstrap 진단은 [[Recommendation-System-Off-Policy-Evaluation|OPE 정본]]을 따른다. OPE는 위험한 정책을 거르는 사전 평가이며 randomized online experiment를 대체하지 않는다.

## 출시 판단표

| 조건 | 판단 |
|---|---|
| Offline 하락, Online 미실시 | 데이터와 목적함수부터 재검토 |
| Offline 상승, 시스템 SLO 실패 | 최적화하거나 후보 규모 축소 |
| Primary 상승, Guardrail 악화 | 원인과 tradeoff 해결 전 보류 |
| 전체 평균 상승, 핵심 slice 악화 | 대상 정책 또는 공정성 검토 |
| 효과와 비용 모두 양호 | 단계적 ramp와 rollback 준비 |

출시 뒤에도 효과가 유지되는지 장기 holdout 또는 반복 실험을 검토하고, novelty가 사라진 뒤의 값과 학습 데이터 변화까지 본다.

## 관련 문서

- [[Recommendation-System-Architecture|추천 시스템 지식 지도]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]
- [[Recommendation-System-Serving-Operations|추천 서빙과 운영]]
- [[Recommendation-System-Off-Policy-Evaluation|Off-Policy Evaluation]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[OpenSearch-Search-Quality-Evaluation#온라인 실험|검색 품질 평가와 온라인 실험]]
- [[Metrics-Framework|제품 지표 설계]]

## 출처

- [Ranking metrics - TensorFlow Ranking](https://www.tensorflow.org/ranking/api_docs/python/tfr/keras/metrics)
- [On Sampled Metrics for Item Recommendation - Google Research](https://research.google/pubs/on-sampled-metrics-for-item-recommendation/)
- [Point-in-time joins - Feast Documentation](https://docs.feast.dev/getting-started/concepts/point-in-time-joins)
- [Trustworthy Analysis of Online A/B Tests - Microsoft Research](https://www.microsoft.com/en-us/research/publication/trustworthy-analysis-of-online-a-b-tests-pitfalls-challenges-and-solutions/)
- [Data Quality for Trustworthy A/B Testing - Microsoft Research](https://www.microsoft.com/en-us/research/articles/data-quality-fundamental-building-blocks-for-trustworthy-a-b-testing-analysis/)
- [Patterns of Trustworthy Experimentation, Post-Experiment - Microsoft Research](https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-post-experiment-stage/)
- [The Netflix Recommender System: Algorithms, Business Value, and Innovation](https://doi.org/10.1145/2843948)
- [Reducing Symbiosis Bias through Better A/B Tests - Google Research](https://research.google/pubs/reducing-symbiosis-bias-through-better-ab-tests-of-recommendation-algorithms/)
- [Top-K Off-Policy Correction for a REINFORCE Recommender System - Google Research](https://research.google/pubs/top-k-off-policy-correction-for-a-reinforce-recommender-system/)
- [Off-policy Evaluation for Slate Recommendation - NeurIPS](https://proceedings.neurips.cc/paper/2017/hash/5352696a9ca3397beb79f116f3a33991-Abstract.html)
- [Capturing Delayed Feedback in Conversion Rate Prediction - AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/16587)
- [Towards Unified Metrics for Accuracy and Diversity - Google Research](https://research.google/pubs/towards-unified-metrics-for-accuracy-and-diversity-for-recommender-systems/)
