---
tags: [cs, probability, statistics, markov-chain, stochastic-process]
status: done
category: "CS - 기초"
aliases: ["Markov Chain", "마르코프 체인", "마르코프 연쇄", "Stationary Distribution", "정상 분포", "정상 상태 분포", "전이 확률 행렬", "Transition Matrix"]
---

# 마르코프 체인과 정상 분포

마르코프 체인은 상태가 시간에 따라 바뀌는 과정을 **현재 상태와 상태 사이의 전이 확률**만으로 표현하는 확률 모형이다. 날씨, 웹 페이지 이동, 다음 단어처럼 앞 상태가 다음 상태에 영향을 주는 과정에 쓴다. 동전 던지기처럼 매번 독립인 시행과 달리 상태 사이의 의존을 모형에 넣는다.

## 마르코프 성질: 현재가 주어지면 과거와 미래는 조건부 독립

이산 시간 마르코프 체인은 다음 상태의 확률이 현재 상태에만 의존한다고 가정한다.

```text
P(X_{m+1} = j | X_m = i, X_{m-1} = i_{m-1}, ..., X_0 = i_0) = P(X_{m+1} = j | X_m = i)
```

현재 상태를 알면 과거와 미래가 조건부 독립이라는 뜻이다. 내일 날씨를 예측할 때 오늘만 알면 되고 그 이전 날씨는 더 이상 정보를 주지 않는다. 실제 날씨가 그렇다는 주장이 아니라, 과거 전체를 조건으로 두면 모형이 감당할 수 없을 만큼 커지므로 둔 단순화 가정이다. 조건부 독립의 일반 개념은 [[Conditional-Probability-and-Bayes|조건부확률과 베이즈 정리]]에서 다룬다.

전이 확률 `p_ij = P(X_{m+1} = j | X_m = i)`가 시점 `m`에 따라 바뀌지 않는다고 함께 가정하는 경우가 많다(시간 동질). 이 가정 아래에서 전이 확률은 하나의 행렬 `P`로 정리된다. 각 행은 현재 상태, 각 열은 다음 상태이며 한 행의 합은 1이다.

## 예시: 맑음과 비의 두 상태

| 오늘 \ 내일 | 맑음 | 비 |
|---|---|---|
| 맑음 | 0.9 | 0.1 |
| 비 | 0.3 | 0.7 |

오늘의 분포를 행 벡터 `π(0) = [0.5, 0.5]`(초기 분포)로 두면 다음 날 분포는 `π(1) = π(0) P`다. 내일 맑으려면 오늘 맑고 내일도 맑거나, 오늘 비가 오고 내일 맑아지는 두 경로가 있고 각 경로 확률을 더한다.

- 1일 뒤 맑음: `0.5 × 0.9 + 0.5 × 0.3 = 0.6`, 비는 0.4
- 2일 뒤 맑음: `0.6 × 0.9 + 0.4 × 0.3 = 0.66`, 비는 0.34
- 일반화: `π(n) = π(n-1) P = π(0) P^n`

여기서 구한 것은 특정 하루 날씨가 나올 **모든 경로의 확률 합**이다. "맑음, 비, 맑음"처럼 경로 하나의 확률은 시작 확률과 각 단계의 전이 확률을 곱한 값이며, 그 경로들을 모두 더한 것이 그 날의 주변 분포다.

## 정상 분포

전이를 한 번 더 거쳐도 바뀌지 않는 분포를 정상 분포(stationary distribution)라고 한다.

```text
π = π P,   Σ_j π_j = 1
```

위 예시에서 `π_맑음 = 0.9 π_맑음 + 0.3 π_비`이므로 `0.1 π_맑음 = 0.3 π_비`, 즉 `π_맑음 = 3 π_비`다. 합이 1이 되도록 풀면 `[0.75, 0.25]`다. 초기 분포를 `[0.5, 0.5]`로 시작해도 `0.6`, `0.66`, ...으로 0.75에 다가간다.

정상 분포에 도달했다는 것은 **날씨가 더 이상 바뀌지 않는다는 뜻이 아니다.** 하루하루의 날씨는 계속 전이 확률대로 바뀌지만, 오래 관찰하면 전체 날 중 약 75%가 맑고 25%가 비인 상태가 유지된다는 뜻이다. 아래 수렴 조건을 만족하는 체인에서 정상 확률 `π_j`는 긴 기간 동안 체인이 상태 `j`에 머무는 비율로 해석하며, 상태 `j`로 다시 돌아오기까지의 평균 시간은 `1 / π_j`다.

## 모든 체인이 수렴하지는 않는다

상태 수가 유한하고 다음 두 조건을 만족하면 `π = πP`의 해는 유일하며, 초기 분포와 관계없이 `π(n)`이 그 분포로 수렴한다.

- **기약(irreducible)**: 모든 상태가 서로 도달 가능하다. 서로 오갈 수 없는 두 묶음으로 나뉘면 어느 쪽에서 시작했는지가 결과를 정한다.
- **비주기(aperiodic)**: 어떤 상태로 되돌아오는 시점이 일정한 주기의 배수로만 묶이지 않는다.

반례로 두 상태가 확률 1로 서로 바뀌는 체인(`P = [[0, 1], [1, 0]]`)은 `X_{n+2} = X_n`이 되어, 초기 분포가 `[0.5, 0.5]`가 아니면 `π(n)`이 한 값으로 수렴하지 않고 초기 분포에 따라 진동한다. 이 체인도 정상 분포 `[0.5, 0.5]`는 유일하게 있고 장기적으로 두 상태에 절반씩 머문다. 깨지는 것은 n단계 분포의 수렴이다. 각 상태가 확률 1로 자기 자신에 머무는 체인(`P = I`)은 두 상태가 끊어져 기약이 아니므로, 시작 상태가 결과를 정하고 정상 분포도 하나로 정해지지 않는다. 따라서 n일 뒤 분포를 정상 분포로 근사하기 전에 체인 구조가 이 조건을 만족하는지 먼저 확인한다.

## 트레이드오프와 적용 점검

- **장점**: 상태와 전이 행렬만으로 다음 상태 분포, 장기 비율과 재방문 시간을 계산할 수 있다. 웹 페이지 이동이나 사용자 행동 순서처럼 직전 상태가 강한 신호인 과정의 기준 모형이 된다.
- **한계**: 1차 마르코프 가정은 최근 한 상태 외의 이력을 버린다. 계절, 사용자 장기 취향처럼 긴 맥락이 중요하면 상태 정의를 넓히거나 다른 모형을 써야 하며, 상태를 넓히면 전이 행렬의 크기가 빠르게 커진다.
- **시간 동질 가정**: 전이 확률이 시간에 따라 바뀌는 데이터(요일, 프로모션, 계절)에 한 행렬을 그대로 적용하면 장기 비율이 틀린다.
- **확인 질문**: 상태는 무엇이며 실제로 관측되는가? 직전 상태만으로 충분한가? 체인이 기약이고 비주기인가? 관측되지 않는 상태를 간접 신호로 추정해야 한다면 은닉 마르코프 모형(HMM)을 검토한다.

## 이해 확인

1. 위 예시에서 3일 뒤 맑을 확률은? `0.66 × 0.9 + 0.34 × 0.3 = 0.696`이다.
2. 정상 분포가 `[0.75, 0.25]`라는 말을 "결국 매일 맑다"로 읽으면 왜 틀리는가? 개별 날의 상태는 계속 바뀌고, 장기 비율이 고정될 뿐이다.
3. `P = [[0, 1], [1, 0]]`에서 정상 분포 `[0.5, 0.5]`를 100일 뒤 날씨 분포로 쓰면 안 되는 이유는? 주기 2인 체인이라 초기 분포가 `[0.5, 0.5]`가 아니면 `π(n)`이 수렴하지 않고 진동한다. 장기 체류 비율은 여전히 절반씩이다.

## 출처

2026-11-18 공개 확률 교재와 정의, 공식, 수렴 조건을 대조했다. 날씨 전이 확률은 설명용 가상 값이다.

- [Introduction to Probability, Statistics, and Random Processes, Markov Chains Introduction — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_2_1_introduction.php)
- [Introduction to Probability, Statistics, and Random Processes, State Transition Matrix and Diagram — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_2_2_state_transition_matrix_and_diagram.php)
- [Introduction to Probability, Statistics, and Random Processes, Probability Distributions — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_2_3_probability_distributions.php)
- [Introduction to Probability, Statistics, and Random Processes, Classification of States — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_2_4_classification_of_states.php)
- [Introduction to Probability, Statistics, and Random Processes, Stationary and Limiting Distributions — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_2_6_stationary_and_limiting_distributions.php)
- [YouTube, ZeroCho TV, 인공지능 10탄 - 미래를 예측하는 데 쓰일 수 있는 마르코프 체인, 강화학습으로 가는 길](https://www.youtube.com/watch?v=Dc49BVGrLM4) — 날씨 예시의 출발점. 전사문의 수치를 공식에 대입해 검산

## 관련 문서

- [[Conditional-Probability-and-Bayes|조건부확률과 베이즈 정리]]
- [[Discrete-Probability-Distributions|이산 확률분포]]
- [[Recommendation-System-Modeling-Foundations|추천시스템 모델링 기초]]
- [[CS-Probability-Statistics|확률과 통계 인덱스]]
