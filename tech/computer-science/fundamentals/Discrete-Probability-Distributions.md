---
tags: [cs, statistics, probability, binomial, geometric, poisson]
status: done
category: "CS - 기초"
aliases: ["이산 확률분포", "Discrete Probability Distributions", "이항분포와 기하분포", "포아송분포"]
---

# 이산 확률분포와 관측 단위

확률변수는 실험 결과를 숫자로 대응시킨다. 같은 구매 현상도 고정된 고객 수에서 구매 횟수를 세는지, 첫 구매까지 고객을 세는지, 일정 시간의 구매 건수를 세는지에 따라 모형이 달라진다. 무엇을 고정하고 무엇을 셀지 먼저 정한다.

## 질문에 맞는 분포를 고른다

| 분포 | 확률변수 | 고정하는 것 | 가능한 값 |
|---|---|---|---|
| 베르누이 | 한 번의 성공 여부 | 한 시행의 성공확률 `p` | 0, 1 |
| 이항 | `n`번 중 성공 횟수 | 시행 수 `n`, 성공확률 `p` | 0부터 `n`까지의 정수 |
| 기하 | 첫 성공이 나올 때까지의 시행 수 | 성공확률 `p` | 1, 2, 3, … |
| 포아송 | 정해진 구간 안의 사건 수 | 그 구간의 기대 사건 수 `λ` | 0, 1, 2, … |

성공은 분석자가 정한 사건의 이름이다. 구매, 오류나 실패도 셀 사건으로 정의할 수 있다. 두 결과만 있다는 조건은 한 시행의 베르누이 모형에 해당한다. 이항분포로 여러 시행의 성공 횟수를 계산하려면 고정된 시행 수, 시행 간 독립성과 같은 성공확률도 필요하다.

## 이항분포: 정해진 횟수에서 성공을 센다

독립인 `n`번의 시행에서 성공확률이 모두 `p`라면 성공 횟수 `X`는 `Binomial(n, p)`를 따른다.

- 확률질량함수(PMF): `P(X = k) = C(n, k) p^k (1 - p)^(n - k)`
- 기댓값: `E[X] = np`
- 분산: `Var(X) = np(1 - p)`

가상의 고객 3명이 서로 독립적으로 확률 0.5로 구매한다고 가정한다.

| 구매자 수 `k` | `P(X = k)` | 누적확률 `F(k)` |
|---|---:|---:|
| 0 | 0.125 | 0.125 |
| 1 | 0.375 | 0.500 |
| 2 | 0.375 | 0.875 |
| 3 | 0.125 | 1.000 |

기댓값은 가능한 값에 확률을 곱해 더한 `Σ k P(X = k) = 1.5`다. 한 실험에서 구매자 1.5명이 나타난다는 뜻이 아니다. 추천이나 동행으로 고객의 구매가 서로 영향을 받거나 고객별 구매확률이 다르면 이 모형의 전제부터 다시 확인한다.

누적분포함수(CDF)는 `F(x) = P(X ≤ x)`다. 위 표에서 `P(X ≤ 1) = 0.5`, `P(X = 2) = F(2) - F(1) = 0.375`다. PMF는 각 값의 확률, CDF는 그 값까지 쌓은 확률을 나타낸다.

## 기하분포: 첫 성공까지 시행을 센다

독립 시행마다 같은 성공확률 `0 < p < 1`을 가정하고, 첫 성공을 포함한 시행 수를 `T`로 둔다.

- `P(T = k) = (1 - p)^(k - 1) p`, `k = 1, 2, …`
- `E[T] = 1 / p`

`p = 0.5`라면 세 번째 시행에서 처음 성공할 확률은 `0.5² × 0.5 = 0.125`다. 앞선 두 번의 실패와 세 번째 성공을 모두 포함한다. 이는 3번 중 한 번 성공할 이항확률 0.375와 다른 사건이다.

첫 성공 전의 실패 수를 세는 정의도 있다. 이 문서의 `T`에서 1을 뺀 `Y = T - 1`은 0부터 시작한다. 도구나 교재를 비교할 때 첫 성공 시행을 세는지 확인한다. 처음 성공한 사람의 신원이나 경과 시간 자체를 구하는 분포로 해석하지 않는다.

## 포아송분포: 일정 구간의 발생 횟수를 센다

`X ~ Poisson(λ)`에서 `λ > 0`는 선택한 구간의 기대 사건 수다.

- `P(X = k) = exp(-λ) λ^k / k!`, `k = 0, 1, …`
- `E[X] = Var(X) = λ`

시간당 평균 2건인 동질 포아송 과정으로 모델링하면 1시간의 `λ`는 2, 30분의 `λ`는 1이다. 1시간 동안 0건일 확률은 `exp(-2) ≈ 0.1353`이다. 평균 2건은 매시간 정확히 2건 발생한다는 약속이 아니다.

동질 포아송 과정은 겹치지 않는 구간의 사건 수가 독립이고, 일정한 발생률에서 같은 길이의 구간이 같은 분포를 따른다는 조건을 둔다. 시간당 건수라는 이유만으로 채택하지 않는다. 적용 점검 예로 시간대별 집중, 묶음 도착과 재시도 폭증이 있으면 일정 발생률과 독립성 가정을 확인한다. 관측한 평균 하나만으로 모형이 맞는다고 판정하지 않는다.

## 모형, 관측 비율과 정규분포를 구분한다

모형의 `p = 0.5`와 실제 10번 중 6번의 성공은 모순이 아니다. 같은 확률의 독립 시행을 늘리면 성공 비율이 `p`에서 일정 크기 이상 벗어날 확률이 작아진다는 것이 큰 수의 법칙의 한 형태다. 매번 오차가 줄거나 이전 실패를 다음 성공이 보상한다는 뜻은 아니다.

정규분포는 평균 `μ`와 표준편차 `σ > 0`를 갖는 분포족이다. 이 중 `μ = 0`, `σ = 1`인 경우만 **표준정규분포**다. 임의의 자료를 평균 0, 표준편차 1로 표준화해도 정규분포가 되는 것은 아니다.

중심극한정리의 기본형은 독립, 동일 분포이고 유한한 양의 분산을 가진 변수들의 합이나 평균을 적절히 표준화했을 때, 표본 크기가 커지면 그 분포가 표준정규분포에 가까워진다는 내용이다. 큰 수의 법칙과 다른 주장이다. 고객 3명의 구매자 수를 여러 번 관찰해도 원래 확률변수는 `Binomial(3, 0.5)`이며 정규분포로 바뀌지 않는다.

## 이해 확인

1. 세 번째에 처음 성공할 확률과 3번 중 한 번 성공할 확률은 왜 다른가?
2. 시간당 평균 2건인 동질 포아송 과정에서 30분의 기대 사건 수는 얼마인가?
3. 구매자 수의 기댓값이 1.5라는 말과 실제 구매자 수가 1.5라는 말은 어떻게 다른가?
4. 평균 0, 표준편차 1로 바꾼 자료가 정규분포라고 단정할 수 없는 이유는 무엇인가?

## 출처

2026-10-24 아래 공개 교재와 대조했다. 구매와 도착 사례는 가상 계산이며 실제 고객 데이터에 대한 적합도 검증이 아니다.

- [NIST/SEMATECH e-Handbook of Statistical Methods, Binomial Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366i.htm) — 이항 PMF, CDF, 기댓값과 분산
- [Penn State, STAT 414, Geometric and Negative Binomial Distributions](https://online.stat.psu.edu/stat414/Lesson11) — 독립 시행, 첫 성공까지의 시행 수와 기댓값
- [NIST/SEMATECH e-Handbook of Statistical Methods, Poisson Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366j.htm) — 구간의 사건 수, PMF와 모수
- [Introduction to Probability, Statistics, and Random Processes: Basic Concepts of the Poisson Process — Hossein Pishro-Nik](https://www.probabilitycourse.com/chapter11/11_1_2_basic_concepts_of_the_poisson_process.php) — 독립 증분, 일정 발생률과 구간 길이
- [UC Berkeley, Law of Large Numbers](https://www.stat.berkeley.edu/~stark/Java/Html/lln.htm) — 베르누이 성공 비율의 수렴과 개별 시행열의 한계
- [NIST/SEMATECH e-Handbook of Statistical Methods, Normal Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm) — 정규분포와 표준정규분포의 구분
- [UC Berkeley, STAT 135, Probability Prerequisites](https://www.stat.berkeley.edu/~ani/s201af14.old/prereq.html) — 큰 수의 법칙과 유한 분산, 독립 동일 분포 조건의 중심극한정리

## 관련 문서

- [[기초(Fundamentals)|컴퓨터 기초]]
- [[Data-Measurement-and-Tidy-Data|측정 척도와 관측 단위]]
- [[Descriptive-Statistics-and-Distribution|기술통계와 분포]]
