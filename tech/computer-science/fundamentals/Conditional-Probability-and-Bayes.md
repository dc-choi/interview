---
tags: [cs, probability, statistics, bayes, conditional-probability]
status: done
category: "CS - 기초"
aliases: ["조건부확률과 베이즈 정리", "Conditional Probability and Bayes", "기저율과 경보 확률"]
---

# 조건부확률과 베이즈 정리

조건부확률은 특정 사건이 일어났다는 정보를 얻은 뒤, 그 조건 안에서 다른 사건의 확률을 계산한다. 누수일 때 경보가 울릴 확률과 경보가 울렸을 때 누수일 확률은 분모가 다르다.

## 사건, 결합확률과 주변확률

`L`은 누수 사건, `A`는 경보 사건, `Lᶜ`와 `Aᶜ`는 각각의 여사건으로 둔다. 다음은 실제 센서 측정값이 아닌 **가상 확률 모형**이다.

| 상태 | 경보 `A` | 경보 없음 `Aᶜ` | 합계 |
|---|---:|---:|---:|
| 누수 `L` | 0.08 | 0.02 | 0.10 |
| 누수 없음 `Lᶜ` | 0.09 | 0.81 | 0.90 |
| 합계 | 0.17 | 0.83 | 1.00 |

각 내부 칸은 두 사건이 함께 일어나는 결합확률이다. `P(L ∩ A) = 0.08`이다. 행과 열의 합은 다른 사건의 여부를 합쳐 없앤 주변확률로, `P(L) = 0.10`, `P(A) = 0.17`이다.

## 조건을 바꾸면 분모가 바뀐다

`P(A) > 0`일 때 조건부확률은 다음과 같다.

$$
P(L \mid A) = \frac{P(L \cap A)}{P(A)}
$$

- 경보가 울린 경우만 남기면 `P(L | A) = 0.08 / 0.17 ≈ 47.06%`다.
- 누수인 경우만 남기면 `P(A | L) = 0.08 / 0.10 = 80%`다.

분자는 같아도 비교 대상 집합이 달라 결과가 달라진다. 경보라는 조건 안에서 누수와 누수 없음의 확률을 더하면 1이다. 조건 사건의 확률이 0이면 위 비율식으로 계산하지 않는다.

## 사전확률과 탐지 성능으로 역산한다

결합확률 표 대신 `P(L) = 0.1`, 탐지율 `P(A | L) = 0.8`, 오탐률 `P(A | Lᶜ) = 0.1`이 주어졌다고 하자. 전체 경보 확률에는 실제 누수와 오탐을 모두 넣는다.

$$
P(A) = P(A \mid L)P(L) + P(A \mid L^c)P(L^c)
     = 0.8 \times 0.1 + 0.1 \times 0.9 = 0.17
$$

이는 전체확률의 법칙이다. 누수와 누수 없음처럼 서로 겹치지 않고 전체를 덮는 경우로 나눈다. 베이즈 정리는 다음처럼 조건의 방향을 바꾼다.

$$
P(L \mid A) = \frac{P(A \mid L)P(L)}{P(A)}
             = \frac{0.08}{0.17} \approx 0.4706
$$

`P(L)`은 경보를 알기 전의 사전확률, `P(A | L)`은 누수라는 조건에서 경보라는 증거가 나올 가능성, `P(A)`는 증거의 전체 확률이다. `P(L | A)`는 경보를 관측한 뒤의 사후확률이다. 이 예에서는 10%에서 약 47%로 올라가지만 확정 판정은 아니다.

## 기저율이 달라질 때

탐지율 80%와 오탐률 10%를 그대로 두고 누수 사전확률만 1%로 낮춘 가상 모형을 계산하면 다음과 같다.

$$
P(L \mid A) = \frac{0.8 \times 0.01}{0.8 \times 0.01 + 0.1 \times 0.99}
             = \frac{0.008}{0.107} \approx 7.48\%
$$

사건이 드물면 정상 상태에서 생긴 오탐이 전체 경보의 큰 몫을 차지할 수 있다. 오탐률 10%의 분모는 누수가 없는 경우이며, 경보 중 누수가 없는 비율과 다르다. 후자는 첫 모형에서 `0.09 / 0.17 ≈ 52.94%`다.

## 이해 확인과 적용

1. 첫 표에서 경보가 없을 때 누수일 확률은 무엇인가? 분모는 경보가 없는 전체 확률이므로 `0.02 / 0.83 ≈ 2.41%`다.
2. 탐지율이 같아도 사후확률이 달라지는 이유는 무엇인가? 사전확률이 달라지면 실제 탐지와 오탐의 상대적인 양이 달라진다.
3. 추천시스템에서 클릭 확률을 읽을 때 무엇이 주어진 조건인지 먼저 적는다. 사용자, 아이템과 노출 맥락을 조건으로 둔 확률과 전체 관측 클릭 비율을 구분하는 출발점이다. 모델링과 노출 편향은 [[Recommendation-System-Modeling-Foundations|추천시스템 모델링 기초]]에서 별도로 다룬다.

## 출처

2026-11-03 공개 확률 교재와 정의 및 공식을 대조했다. 누수 수치와 기저율 변경은 가상 계산이며 센서의 실측 성능이 아니다.

- [Introduction to Probability, Statistics, and Random Processes, Conditional Probability — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_0_conditional_probability.php)
- [Introduction to Probability, Statistics, and Random Processes, Law of Total Probability — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_2_total_probability.php)
- [Introduction to Probability, Statistics, and Random Processes, Bayes' Rule — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_3_bayes_rule.php)
- [YouTube, ZeroCho TV, 인공지능 7편 - 경보가 울리면 정말 누수일까?](https://www.youtube.com/watch?v=ywqtA2GBE2Q) — 누수 사례의 출발점. 전사문의 수치를 공식에 대입해 검산

## 관련 문서

- [[Discrete-Probability-Distributions|이산 확률분포와 관측 단위]]
- [[Descriptive-Statistics-and-Distribution|기술통계와 분포]]
- [[Recommendation-System-Modeling-Foundations|추천시스템 모델링 기초]]
