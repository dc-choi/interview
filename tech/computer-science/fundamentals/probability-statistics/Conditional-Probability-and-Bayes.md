---
tags: [cs, probability, statistics, bayes, conditional-probability]
status: done
category: "CS - 기초"
aliases: ["조건부확률과 베이즈 정리", "Conditional Probability and Bayes", "기저율과 경보 확률", "조건부 독립", "Conditional Independence"]
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

## 독립과 조건부 독립

두 사건 `A`, `B`는 `P(A ∩ B) = P(A)P(B)`일 때 독립이다. 동전을 두 번 던지면 앞의 결과가 뒤의 결과에 영향을 주지 않으므로 둘 다 앞면일 확률은 `1/2 × 1/2 = 1/4`다.

`P(C) > 0`인 사건 `C`가 주어졌을 때 다음이 성립하면 `A`와 `B`는 `C` 아래에서 조건부 독립이다.

$$
P(A \cap B \mid C) = P(A \mid C)\,P(B \mid C)
$$

같은 뜻으로 `P(B ∩ C) > 0`이면 `P(A | B ∩ C) = P(A | C)`다. `C`를 알고 나면 `B`가 `A`에 대해 더 알려 주는 것이 없다는 뜻이다. 독립과 조건부 독립은 서로를 함의하지 않는다. 아무 정보가 없을 때 독립이어도 어떤 사실을 안 뒤에는 의존할 수 있고, 그 반대도 있다.

### 가운데 변수를 아는지가 독립을 가른다

세 변수의 연결 구조마다 가운데 변수 `Z`를 관측했는지에 따라 `X`와 `Y`의 관계가 달라진다. 표의 의존은 구조상 일반적인 경우이며, 특정 확률값에서 우연히 독립이 되는 경우는 따로 계산해야 한다.

| 구조 | 예 | `Z`를 모를 때 | `Z`를 알 때 |
|---|---|---|---|
| 연쇄 `X → Z → Y` | 화재, 연기, 연기만 감지하는 경보 | 화재 소식이 경보 예측에 도움이 된다 | 연기 여부를 알면 화재는 경보 확률을 바꾸지 않는다 |
| 공통 원인 `X ← Z → Y` | 비가 교통체증과 우산 사용을 함께 일으킴 | 체증이 비를 시사해 우산 예측에 도움이 된다 | 비를 알면 체증과 우산은 조건부 독립이다 |
| 공통 결과 `X → Z ← Y` | 맑은 날씨나 지루함 중 하나만 참이어도 강아지가 산책함 | 다른 연결이 없으면 맑음과 지루함은 독립이다 | 산책을 알면 둘이 의존하게 된다 |

공통 결과 구조에서 결과를 알면 원인끼리 엮이는 현상을 explaining away라고 한다. 맑음 `S`와 지루함 `B`가 각각 확률 1/2로 독립이고 둘 중 하나라도 참이면 산책 `W`를 한다는 가상 모형에서, 산책을 했다는 정보는 맑지 않고 지루하지도 않은 경우만 지운다. 남은 세 경우가 각각 1/3이 되어 다음과 같다.

- `P(S | W) = P(B | W) = 2/3`이지만 `P(S ∩ B | W) = 1/3`이고 `2/3 × 2/3 = 4/9`와 다르다. 산책을 알면 두 원인은 독립이 아니다.
- 지루하지 않았다는 사실까지 알면 `P(S | W ∩ Bᶜ) = 1`이다. 산책의 다른 원인이 없으므로 날씨는 맑을 수밖에 없다.

### 센서 두 개가 울려도 확률은 두 배가 되지 않는다

앞의 누수 모형에 같은 성능의 센서 `A₁`, `A₂`를 둔다. 누수가 두 센서의 공통 원인이고, 누수 여부가 주어지면 두 센서가 조건부 독립이라고 가정한 **가상 모형**이다. 전원이나 설치 위치를 공유해 함께 오작동하는 센서라면 이 가정이 깨진다.

$$
P(A_1 \cap A_2) = 0.8^2 \times 0.1 + 0.1^2 \times 0.9 = 0.064 + 0.009 = 0.073
$$

$$
P(L \mid A_1 \cap A_2) = \frac{0.064}{0.073} \approx 87.67\%
$$

센서 하나가 울렸을 때의 47.06%를 두 배로 한 94.12%가 아니다. 확률을 두 배로 늘리는 계산은 근거가 없고, 사후확률이 50%를 넘는 경우에는 1을 넘는 값까지 만든다. 조건부 독립은 누수 여부(누수와 누수 없음)를 알 때만 성립한다. 누수를 모르면 `P(A₁ ∩ A₂) = 0.073`이고 `P(A₁)P(A₂) = 0.17² ≈ 0.0289`보다 커서 두 센서는 독립이 아니다.

클래스 `Y`가 주어졌을 때 특징 `X₁`, `X₂`가 조건부 독립이라고 가정하면 `P(X₁ ∩ X₂ | Y) = P(X₁ | Y)P(X₂ | Y)`로 곱해 계산을 크게 줄인다. 나이브 베이즈는 클래스가 주어지면 각 특징이 나머지 특징 전체와 조건부 독립이라고 가정해 `P(X₁, …, Xₙ | Y) = ∏ P(Xᵢ | Y)`로 곱하는 분류기다. 특징이 셋 이상이면 쌍마다 조건부 독립인 것만으로는 이 곱셈이 보장되지 않는다. 실제 특징이 같은 클래스 안에서도 서로 연관되어 있으면 곱한 값은 근사다.

## 이해 확인과 적용

1. 첫 표에서 경보가 없을 때 누수일 확률은 무엇인가? 분모는 경보가 없는 전체 확률이므로 `0.02 / 0.83 ≈ 2.41%`다.
2. 탐지율이 같아도 사후확률이 달라지는 이유는 무엇인가? 사전확률이 달라지면 실제 탐지와 오탐의 상대적인 양이 달라진다.
3. 두 센서의 조건부확률을 곱하기 전에 확인할 것은 무엇인가? 무엇을 조건으로 두었는지와, 그 조건 아래에서 두 센서가 서로 영향을 주지 않는 구조인지다.
4. 추천시스템에서 클릭 확률을 읽을 때 무엇이 주어진 조건인지 먼저 적는다. 사용자, 아이템과 노출 맥락을 조건으로 둔 확률과 전체 관측 클릭 비율을 구분하는 출발점이다. 모델링과 노출 편향은 [[Recommendation-System-Modeling-Foundations|추천시스템 모델링 기초]]에서 별도로 다룬다.

## 출처

2026-11-03 공개 확률 교재와 정의 및 공식을 대조했다. 누수 수치와 기저율 변경은 가상 계산이며 센서의 실측 성능이 아니다.

- [Introduction to Probability, Statistics, and Random Processes, Conditional Probability — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_0_conditional_probability.php)
- [Introduction to Probability, Statistics, and Random Processes, Law of Total Probability — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_2_total_probability.php)
- [Introduction to Probability, Statistics, and Random Processes, Bayes' Rule — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_3_bayes_rule.php)
- [Introduction to Probability, Statistics, and Random Processes, Independence — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_1_independence.php)
- [Introduction to Probability, Statistics, and Random Processes, Conditional Independence — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter1/1_4_4_conditional_independence.php) — 2026-11-09 조건부 독립의 정의와 독립과의 비함의 관계 대조
- [CS228 Notes, Bayesian networks — Stanford, Ermon Group](https://ermongroup.github.io/cs228-notes/representation/directed/) — 2026-11-09 연쇄, 공통 원인, 공통 결과 구조의 관측 여부별 독립과 explaining away 대조
- [scikit-learn User Guide, Naive Bayes](https://scikit-learn.org/stable/modules/naive_bayes.html) — 2026-11-09 클래스가 주어질 때 각 특징의 조건부 독립 가정과 곱셈 공식 대조
- [YouTube, ZeroCho TV, 인공지능 7편 - 경보가 울리면 정말 누수일까?](https://www.youtube.com/watch?v=ywqtA2GBE2Q) — 누수 사례의 출발점. 전사문의 수치를 공식에 대입해 검산
- [YouTube, ZeroCho TV, 인공지능 8편 - 센서 두 개가 울리면 누수 확률도 두 배일까?](https://www.youtube.com/watch?v=BwX8fUOPyFE) — 세 연결 구조와 두 센서 사례의 출발점. 두 센서의 사후확률은 앞 모형의 수치로 새로 계산

## 관련 문서

- [[Discrete-Probability-Distributions|이산 확률분포와 관측 단위]]
- [[Descriptive-Statistics-and-Distribution|기술통계와 분포]]
- [[Recommendation-System-Modeling-Foundations|추천시스템 모델링 기초]]
