---
tags: [architecture, recommendation-system, evaluation, off-policy, causal-inference]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Off-Policy Evaluation", "추천 시스템 OPE", "Off-Policy Evaluation"]
---

# 추천 시스템 Off-Policy Evaluation

Off-Policy Evaluation(OPE)은 과거 logging policy가 만든 로그로 새 target policy의 기대 보상을 추정한다. 온라인 실험 전에 위험한 정책을 거르는 도구이지, 무작위 실험을 대체하는 보증서가 아니다. 추정량보다 먼저 실제 노출 action, 선택 확률과 reward의 정의가 서로 맞아야 한다.

## 추정 대상과 로그 계약

한 요청의 context를 `x`, 실제 노출 action을 `a`, 관측 reward를 `r`, logging policy를 `μ`, 평가할 target policy를 `π`라고 두자.

```text
logging propensity p = μ(a|x)
target probability q = π(a|x)
importance weight w = q / p
target value V(π) = Eₓ E_{a~π(.|x)}[r(x,a)]
```

유효한 row에는 최소한 다음 값이 필요하다.

- 평가 시점 이전에 확정된 context와 candidate/action space
- 실제 `servedActionId` 또는 `servedSlateId`
- logging policy가 그 action을 선택한 확률 `p`
- target policy가 같은 action에 주는 확률 `q`
- attribution window와 censoring 규칙이 고정된 reward
- logging policy, propensity factorization, eligibility와 fallback version

추천 결과를 뒤늦게 삭제, 압축하거나 보충했다면 원래 propensity를 재사용하지 않는다. 실제 served action의 합성 확률을 계산했거나 새 action space에서 정책 전체를 다시 실행한 경우가 아니면 OPE에서 제외한다. 이 계약은 [[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터|피드백 데이터]]가 소유한다.

## 식별 가정

| 가정 | 의미 | 진단 |
|---|---|---|
| Consistency | 로그의 action과 reward가 실제 served decision에 대응 | response와 impression, fallback chain 대조 |
| Support/positivity | `π(a|x) > 0`인 action에 `μ(a|x) > 0` | target probability mass의 미지원 비율 |
| Propensity correctness | 기록한 `p`가 logging policy의 실제 선택 확률 | 재현 simulation, calibration과 합계 검사 |
| Reward comparability | 정책 사이에 reward 의미와 관측 창이 동일 | label version, 지연과 censoring slice |
| Interference boundary | 한 단위의 처리가 다른 단위 reward를 임의로 바꾸지 않음 | household, session과 공유 재고/모델 경계 |

Support가 없으면 estimator를 바꿔도 식별되지 않는다. 탐색 traffic을 늘리거나 target policy의 적용 범위를 logging support 안으로 제한해야 한다.

## 기본 estimator

`n`개 로그와 reward model `m(x,a)=E[r|x,a]`를 사용한다.

### IPS

```text
V_IPS = (1/n) Σ wᵢ rᵢ
```

Propensity가 정확하고 support가 있으면 정책 차이를 보정하지만, 작은 `p`가 큰 weight를 만들어 분산을 폭발시킨다.

### SNIPS

```text
V_SNIPS = Σ wᵢ rᵢ / Σ wᵢ
```

Weight 합으로 정규화해 유한 표본 분산을 줄이는 대신 편향이 생길 수 있다. `Σw/n`이 1에서 크게 벗어나면 support, propensity 또는 표본 문제를 먼저 의심한다.

### Direct Method

```text
V_DM = (1/n) Σᵢ Σₐ π(a|xᵢ) m(xᵢ,a)
```

Target action을 로그에서 직접 관측하지 않아도 계산할 수 있지만 reward model이 틀리면 그대로 편향된다. 학습과 평가 fold를 분리하거나 cross-fitting해 같은 reward를 암기하는 누수를 막는다.

### Doubly Robust

```text
V_DR = (1/n) Σᵢ [Σₐ π(a|xᵢ)m(xᵢ,a) + wᵢ(rᵢ - m(xᵢ,aᵢ))]
```

Reward model과 propensity model 중 하나가 올바를 때 일관성을 얻는 성질이 있지만, support가 없거나 두 입력이 모두 틀리면 안전하지 않다. 큰 weight의 잔차 항은 DR에서도 고분산을 만든다.

## Weight 안정화

- Clipping: `w' = min(w, c)`로 tail을 자른다. 분산은 줄지만 원래 target value에 대한 편향을 도입하므로 `c`별 sensitivity를 함께 보고한다.
- Switch-DR: `w <= τ`인 row만 DR correction을 사용하고 큰 weight 영역은 DM에 맡긴다. `τ`는 test 결과에 맞춰 고르지 않고 validation 또는 이론적 기준으로 정한다.
- Self-normalization: SNIPS처럼 weight 합으로 나누되 raw IPS와 함께 보고해 정규화가 결론을 뒤집는지 확인한다.
- Policy restriction: 최소 logging probability와 최대 policy divergence를 배포 gate로 두는 것이 사후 clipping보다 해석이 쉽다.

## 필수 진단

| 진단 | 계산 | 실패 신호 |
|---|---|---|
| Weight mean | `Σw/n` | 1에서 큰 이탈 |
| Effective Sample Size | `(Σw)^2 / Σw^2` | row 수 대비 급락 |
| Tail | p95/p99/max weight와 상위 1% 기여 | 소수 row가 estimate 지배 |
| Support | `p < ε`인 target mass와 row 비율 | 정책 비교 불가 영역 |
| Overlap by slice | 사용자/작품/surface별 weight 분포 | 평균 뒤의 특정 slice 붕괴 |
| Estimator agreement | IPS, SNIPS, DM과 DR 비교 | 모델 또는 propensity 의존성 큼 |

예를 들어 `w=[0.5, 2, 1]`, `r=[1, 0, 1]`이면 IPS는 `0.50`, SNIPS는 `1.5/3.5=0.429`, ESS는 약 `2.33`이다. 세 row를 모두 썼어도 독립적인 균등 표본 2.33개 정도의 정보만 있다는 경고다. 이 예시는 estimator 우열이 아니라 진단을 읽는 법을 보여준다.

## 불확실성

- 같은 사용자의 요청이 반복되면 row bootstrap을 하지 않는다. Randomization 또는 독립성 단위인 사용자, household나 cluster를 resample한다.
- Time dependence가 크면 날짜 block bootstrap이나 switchback block을 사용한다.
- Point estimate만 보고하지 않고 표준 오차, 신뢰구간, 유효 표본과 weight tail을 함께 남긴다.
- Estimator, clipping threshold, slice와 reward를 여러 개 시도했다면 선택 과정을 공개하고 holdout을 분리한다.

## 단일 action과 slate

단일 item 선택의 weight는 `π(a|x)/μ(a|x)`다. 여러 slot의 순서 있는 slate는 전체 slate 확률의 비가 필요해 action space와 분산이 급격히 커진다.

- Slot별 조건부 확률을 곱하려면 logging과 target policy가 같은 순차 factorization을 사용해야 한다.
- Item reward를 slot별로 분해하는 estimator는 reward decomposition 가정을 명시해야 한다.
- 재랭킹, 중복 제거와 late eligibility가 slate를 바꾸면 그 단계까지 포함한 composite policy 확률이 필요하다.
- Full-slate support가 희박하면 OPE 범위를 source weight나 제한된 slot 변경으로 축소하고 온라인 실험으로 넘긴다.

## 출시 gate

1. `servedActionId`, propensity와 reward를 request 단위로 재구성한다.
2. Target policy가 logging support 밖에 주는 probability mass를 계산한다.
3. Weight mean, ESS, tail과 slice overlap를 통과시킨다.
4. IPS/SNIPS/DM/DR과 clipping sensitivity가 같은 의사결정 방향인지 확인한다.
5. 독립성 단위 bootstrap 신뢰구간이 사전 정의한 최소 효과와 위험 기준을 만족한다.
6. 통과해도 작은 randomized experiment로 인과 효과와 시스템 guardrail을 검증한다.

OPE가 실패했다는 뜻은 새 정책이 나쁘다는 뜻이 아니다. 현재 로그로는 그 정책을 신뢰성 있게 평가할 수 없다는 뜻이다.

## 관련 문서

- [[Recommendation-System-Evaluation-Experimentation|추천 평가와 실험]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]

## 출처

- [Doubly Robust Policy Evaluation and Learning - Dudík et al.](https://arxiv.org/abs/1103.4601)
- [Counterfactual Risk Minimization - Swaminathan, Joachims](https://www.jmlr.org/papers/v16/swaminathan15a.html)
- [Optimal and Adaptive Off-policy Evaluation in Contextual Bandits - Wang et al.](https://proceedings.mlr.press/v70/wang17a.html)
- [Off-policy Evaluation for Slate Recommendation - Swaminathan et al.](https://proceedings.neurips.cc/paper/2017/hash/5352696a9ca3397beb79f116f3a33991-Abstract.html)
- [Recommendations as Treatments - Schnabel et al.](https://proceedings.mlr.press/v48/schnabel16.html)
