---
tags: [architecture, recommendation-system, experimentation, ab-testing, statistics]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation Online Experimentation Statistics", "추천 온라인 실험 통계", "추천 A/B 테스트"]
---

# 추천 시스템 온라인 실험 통계

온라인 실험은 새 추천 정책이 실제 사용자 가치에 미친 인과 효과를 추정한다. Dashboard 숫자를 사후 비교하는 일이 아니라 실험 전 가설, 단위, 지표, 검정과 중단 규칙을 고정하고 assignment부터 outcome까지 분모를 보존하는 운영 시스템이다.

## 먼저 고정할 estimand

```text
Population: 어떤 사용자와 요청에 적용하는가
Treatment: 후보, 랭커, 재랭커, UI 중 무엇이 바뀌는가
Outcome: 어떤 기간의 어떤 사용자 가치인가
Estimand: assignment 기준 ITT인가, 사전 정의된 triggered effect인가
Decision: 어느 효과와 guardrail이면 ramp/hold/rollback인가
```

Primary 하나, 핵심 guardrail과 사전 정의 slice를 실험 계획에 version으로 남긴다. Assignment 뒤 request나 impression이 없는 사용자를 조용히 분모에서 빼면 treatment가 만든 진입 효과가 사라진다.

## Randomization 단위와 분석 단위

| 단위 | 적합한 경우 | 주의점 |
|---|---|---|
| User | 로그인 기반 장기 경험 | 여러 device와 반복 요청의 상관 |
| Household | 계정과 시청 행태를 공유 | household 식별 오류와 표본 감소 |
| Session | 단기 query/session 정책 | 세션 사이 carryover |
| Request | 상태 없는 낮은 영향 변경 | 같은 사용자가 variant를 오가며 오염 |
| Cluster/time block | 공급, 모델이나 시장 공유로 interference | cluster 수와 시간 추세 |

분석의 표준 오차는 randomization 단위의 독립성을 따른다. User randomization에서 impression을 독립 표본처럼 세면 표본 수와 유의성이 과장된다. Event는 user 단위 numerator와 denominator로 집계하거나 cluster-robust 방법을 사용한다.

## Power와 MDE

두 variant의 평균 차이를 고정 기간에 검정하는 단순 근사에서 arm당 표본은 다음과 같이 시작한다.

```text
n ≈ 2 × (z_(1-α/2) + z_(1-β))² × σ² / δ²
```

`δ`는 검출하려는 최소 효과(MDE), `σ²`는 randomization 단위 metric의 분산이다. 비율 metric은 baseline `p`에서 `p(1-p)`를 출발점으로 쓰되 반복 노출, cluster와 ratio 구조를 반영한 과거 실험 분산으로 재계산한다.

- Business threshold보다 작은 MDE로 과도한 표본을 요구하지 않는다.
- 트래픽만으로 기간을 정하지 않고 weekday cycle, label 완결 창과 novelty 관찰 기간을 포함한다.
- 실험 중 관측 분산으로 계획을 바꾸려면 blinded re-estimation처럼 사전 정의한 절차를 쓴다.

## Ratio metric

CTR, OTT 이동률과 완주율은 보통 `ΣY/ΣX` 형태다. `사용자별 Y/X의 평균`은 denominator가 작은 사용자에게 같은 가중치를 줘 다른 estimand가 된다.

```text
R = E[Y] / E[X]
delta-method influence ≈ (Y - R×X) / E[X]
```

User randomization이면 user별 numerator `Y`와 denominator `X`를 먼저 만들고, 위 linearization의 variant 평균 차이로 표준 오차를 구하거나 user bootstrap을 쓴다. Impression 행을 그대로 독립 표본으로 검정하지 않는다. Denominator 자체가 treatment 영향을 받는다면 CTR 상승과 노출 감소를 함께 보고 product 의미를 확인한다.

## 효과와 불확실성

- `estimate = treatment - control`, 상대 변화, 표준 오차와 신뢰구간을 함께 보고한다.
- `p < 0.05`만으로 출시하지 않는다. 신뢰구간이 최소 실용 효과와 non-inferiority guardrail을 만족하는지 본다.
- Heavy-tail metric은 winsorization, robust metric이나 bootstrap을 사전 정의하고 raw 결과도 보존한다.
- 전체 평균과 신규 사용자, heavy user, 기기, market 및 공급자 slice를 같이 보되 작은 slice의 불확실성을 숨기지 않는다.

## CUPED 분산 감소

Treatment 이전의 같은 metric이나 강한 공변량 `X`가 있으면 다음처럼 variance를 줄일 수 있다.

```text
Y_cuped = Y - θ(X - E[X])
θ = Cov(Y, X) / Var(X)
```

`X`는 assignment 전에 측정되고 treatment의 영향을 받지 않아야 한다. 실험 후 잘 맞는 공변량을 고르거나 missing pre-period 사용자를 임의 제외하면 편향과 선택 문제가 생긴다. CUPED 전후 effect가 같은 estimand인지, variance reduction이 실제로 얼마인지 기록한다.

## SRM과 데이터 품질

Sample Ratio Mismatch(SRM)는 관측 assignment 수가 계획 비율과 맞지 않는지 카이제곱 등으로 검사한다.

- Assignment event를 request나 impression과 독립적으로 기록한다.
- 전체뿐 아니라 platform, country, app version과 eligibility slice에서 검사한다.
- SRM이 나면 실험 결과를 해석하기 전에 bucketing, logging loss, cache와 eligibility 분기를 조사한다.
- SRM이 없다고 randomization과 metric pipeline이 모두 옳다는 뜻은 아니다. A/A와 invariant metric을 함께 사용한다.

## Peeking과 다중 비교

- Fixed horizon: 최소 표본과 기간이 끝날 때 한 번 confirmatory 판단한다.
- Sequential: 매일 볼 필요가 있으면 alpha-spending, group-sequential 또는 always-valid 방식과 중단 경계를 사전 정의한다.
- Safety stop은 통계적 성공 중단과 분리한다. 오류율이나 부적격 노출 급증은 즉시 rollback할 수 있다.
- Primary family가 여러 개면 Holm 또는 Bonferroni 같은 family-wise error 통제를 적용한다. 탐색 지표는 FDR 또는 명시적 exploratory 표기로 분리한다.
- 유리한 기간, slice와 metric만 골라 다시 primary처럼 보고하지 않는다.

## Novelty, carryover와 interference

새 UI와 순위 변화는 초기에 클릭을 끌 수 있다. 최소 한 번의 사용 주기와 label 완결 기간을 포함하고 시간별 effect를 본다. 장기 학습 정책은 holdout 또는 반복 실험으로 효과 유지와 feedback 변화를 확인한다.

Treatment가 공유 후보, 재고, social graph, 모델 학습 데이터나 household 경험을 바꾸면 user 간 interference가 생긴다.

- 영향이 cluster 안에 머물면 household, market 또는 공급자 cluster randomization을 검토한다.
- 시간에 따라 공유되는 marketplace나 시스템 정책은 switchback으로 variant를 시간 block별 교대한다.
- Switchback은 washout, 주기와 시간 추세를 설계하고 block 수준 결과를 보존한다. 그러나 block 집계만으로 시간적 독립성이 생기지는 않는다. 사전 정의한 randomization inference나 시간 의존성을 반영한 추론법을 사용하고, carryover 차수와 washout 길이를 바꾼 민감도 분석을 함께 보고한다.
- Variant가 서로의 학습 데이터에 섞이는 symbiosis는 model version과 training corpus를 격리하거나 결과 해석에 명시한다.

## 실행 runbook

1. 가설, population, treatment, ITT/triggered estimand와 owner를 등록한다.
2. Primary, guardrail, slice, MDE, α, power, 기간과 label 완결 시점을 고정한다.
3. Randomization/분석 단위, CUPED 공변량, ratio 계산과 다중 검정 family를 정한다.
4. A/A, assignment chain, SRM, invariant metric과 telemetry loss를 검증한다.
5. Canary에서 시스템 SLO와 안전 stop을 먼저 통과시킨다.
6. 사전 정의한 horizon 또는 sequential rule에 따라 effect와 신뢰구간을 계산한다.
7. Primary뿐 아니라 guardrail, slice, novelty와 운영 비용으로 ramp/hold/rollback을 결정한다.
8. 결과, query와 code, 제외 row, metric version과 재현 notebook을 보존한다.

## 관련 문서

- [[Recommendation-System-Evaluation-Experimentation|추천 평가와 실험]]
- [[Recommendation-System-Off-Policy-Evaluation|Off-Policy Evaluation]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Recommendation-System-Serving-Operations|추천 서빙과 운영]]

## 출처

- [Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data - Deng et al.](https://doi.org/10.1145/2433396.2433413)
- [Diagnosing Sample Ratio Mismatch in Online Controlled Experiments - Fabijan et al.](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/)
- [Always Valid Inference: Continuous Monitoring of A/B Tests - Johari et al.](https://doi.org/10.1287/opre.2021.2135)
- [Reducing Symbiosis Bias through Better A/B Tests of Recommendation Algorithms - Google Research](https://research.google/pubs/reducing-symbiosis-bias-through-better-ab-tests-of-recommendation-algorithms/)
- [Design and Analysis of Switchback Experiments - Bojinov et al.](https://arxiv.org/abs/2009.00148)
- [Trustworthy Online Controlled Experiments - Kohavi et al.](https://doi.org/10.1017/9781108653985)
