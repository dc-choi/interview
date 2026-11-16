---
tags: [cs, statistics, hypothesis-testing, t-test, p-value, ks-test]
status: done
category: "CS - 기초"
aliases: ["가설검정 기초", "Hypothesis Testing", "t-test", "Kolmogorov-Smirnov test"]
---

# 가설검정 기초

가게의 평균 대기시간이 5분에서 4.8분으로 12초 줄었다고 하자. 이 차이가 새 방식의 효과인지, 표본을 다시 뽑으면 생길 수 있는 흔들림인지는 차이의 크기만으로 정할 수 없다. 가설검정은 효과가 없다는 가정 아래에서 관측한 결과가 얼마나 드문지를 계산해 이 판단의 규칙을 정한다.

## 귀무가설과 대립가설

- **귀무가설(H0):** 비교의 출발점이 되는 가정이다. 위 예에서는 두 방식의 모평균 대기시간이 같다(`μ1 = μ2`).
- **대립가설(Ha):** 귀무가설과 반대되는 주장이다. 빨라진 경우와 느려진 경우를 모두 보면 `μ1 ≠ μ2`인 **양측 검정**, 한 방향만 보면 `μ1 > μ2`나 `μ1 < μ2`인 **단측 검정**이다.
- 방향은 데이터를 보기 전에 정한다. 결과를 본 뒤 유리한 쪽의 단측 검정으로 바꾸면 아래의 오류율 계산이 성립하지 않는다.

## 검정통계량은 차이를 표준오차로 나눈다

12초 차이도 개별 대기시간이 크게 흩어져 있거나 표본이 작으면 쉽게 생긴다. 그래서 평균 차이를 그 차이의 표준오차로 나눈 검정통계량으로 바꾼다. 독립인 두 표본의 평균을 비교하는 t 통계량은 다음과 같다.

`T = (Ȳ1 - Ȳ2) / sqrt(s1²/N1 + s2²/N2)`

- 두 집단의 분산을 같다고 볼 수 있으면 합동 표준편차를 쓰고 자유도는 `N1 + N2 - 2`다. 분산이 다르면 Welch-Satterthwaite 식으로 자유도를 근사한다. 분산이 같다고 가정하기 전에 그 가정 자체를 확인한다.
- 유의수준 α에서 양측 검정은 `|T| > t(1-α/2, ν)`일 때, 위쪽 단측 검정은 `T > t(1-α, ν)`일 때 귀무가설을 기각한다.
- 표준오차의 뜻은 [[Confidence-Intervals-and-Standard-Error|신뢰구간과 표준오차]]를 따른다.

## p값과 유의수준

p값은 귀무가설과 검정 모형이 맞을 때 관측값만큼 또는 그보다 극단적인 검정통계량이 나올 확률이다. 양측 검정에서 `T = -2`가 나왔다면 `T ≤ -2`와 `T ≥ 2` 두 꼬리의 확률을 더한다. 같은 `|T| = 2`라도 p값은 t 분포의 자유도에 따라 다르고, 자유도가 커질수록 표준정규분포의 값(약 0.0455)에 가까워진다.

- 유의수준 α(흔히 0.05)는 p값을 보기 전에 정한다. p값이 α보다 작으면 귀무가설을 기각한다.
- p값은 귀무가설이 참일 확률이 아니다. `1-p`를 효과가 있을 확률로 읽지 않는다.
- p값이 α보다 크다는 결과는 효과가 없다는 확정이 아니다. 차이를 찾아낼 만큼 데이터가 충분하지 않았다는 뜻일 수도 있다.
- 통계적으로 유의한 차이와 업무상 의미 있는 크기의 차이는 별개다. 차이의 크기는 신뢰구간과 함께 보고한다.

## 두 종류의 오류와 검정력

| 실제 상황 | 귀무가설을 기각 | 기각하지 않음 |
|---|---|---|
| 귀무가설이 참 | 제1종 오류 (확률 α) | 올바른 판단 |
| 귀무가설이 거짓 | 올바른 판단 (검정력 `1-β`) | 제2종 오류 (확률 β) |

- α는 분석자가 정하지만 β는 직접 고르지 않는다. β는 실제 차이의 크기에 달려 있어 큰 차이일수록 작고 작은 차이일수록 크다.
- 같은 데이터에서 α를 낮추면 β는 커진다.
- 다른 조건이 같으면 표본이 클수록 표준오차가 작아져 같은 크기의 차이를 찾아낼 검정력이 커진다. 실험 전에 검출할 최소 효과와 목표 검정력으로 표본 수를 정하는 절차는 [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]에 있다.

## 표본 구조에 맞는 검정을 고른다

- **독립 두 표본:** 서로 다른 사람으로 이루어진 두 집단을 비교한다. 위의 두 표본 t 검정이다.
- **대응 표본:** 같은 사람을 전후로 두 번 측정했다면 사람마다 차이 `Xi - Yi`를 구해 그 차이의 평균을 검정한다. 같은 사람의 두 값은 서로 독립이 아니므로 독립 두 표본 식에 넣지 않는다.
- **평균이 아닌 분포 전체:** 평균이 같아도 퍼짐이나 모양은 다를 수 있다. 두 표본 Kolmogorov-Smirnov(KS) 검정은 두 표본이 같은 분포에서 왔다는 귀무가설을 두고, 두 경험적 누적분포함수(ECDF) 사이의 최대 거리 `D = max |E1 - E2|`를 통계량으로 쓴다. 분포의 종류를 미리 정하지 않아도 되지만 연속 분포를 전제하므로, 분 단위로 반올림한 설문 응답처럼 같은 값이 많으면 결과를 그대로 믿지 않는다. KS 통계량은 분포의 꼬리보다 중앙 부근 차이에 더 민감하므로(아래 정규성 검정 절), 퍼짐만 다른 경우에는 분산 비교 검정도 함께 고려한다.

## 정규성 검정

정규성 검정은 표본이 정규분포에서 왔다는 귀무가설을 검정한다.

- **Shapiro-Wilk:** W 통계량이 작을수록 정규성에서 벗어났다는 증거다.
- **Anderson-Darling:** KS를 변형해 분포의 꼬리에 더 큰 가중치를 준다. KS는 분포의 중앙에 더 민감하고 꼬리에는 덜 민감하다.
- **한 표본 KS의 주의점:** 비교할 분포의 모수를 미리 완전히 정해야 한다. 평균과 표준편차를 같은 데이터에서 추정해 넣으면 표준 임계값이 맞지 않아 시뮬레이션 등으로 다시 구해야 한다. 연속 분포에만 적용한다.
- 정규성 검정에서 귀무가설을 기각하지 못했다는 결과도 정규분포임을 증명하지 않는다. 히스토그램이나 Q-Q 그림을 함께 본다.

## 이해 확인

1. 설문으로 모은 대기시간의 12초 차이가 같은 크기여도 표본의 퍼짐에 따라 유의성이 달라지는 이유는 무엇인가?
2. p = 0.03을 귀무가설이 참일 확률이 3%라고 읽으면 무엇이 틀렸는가?
3. 같은 고객의 도입 전후 대기시간을 독립 두 표본 t 검정으로 비교하면 어떤 문제가 생기는가?
4. 두 집단의 평균은 같지만 한쪽의 대기시간이 훨씬 넓게 흩어져 있다. 이 차이를 보려면 어떤 검정을 고려하는가?

## 출처

- [NIST/SEMATECH e-Handbook of Statistical Methods, Two-Sample t-Test for Equal Means](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm) — 가설, 검정통계량, 합동 분산과 Welch 자유도, 양측과 단측 기각역, 대응 표본의 차이
- [NIST/SEMATECH e-Handbook of Statistical Methods, Do two processes have the same mean?](https://www.itl.nist.gov/div898/handbook/prc/section3/prc31.htm) — 독립 표본 가정과 분산 동일성 확인
- [NIST/SEMATECH e-Handbook of Statistical Methods, What are statistical tests?](https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm) — 유의수준, 제2종 오류와 차이 크기, α와 β의 관계, 기각하지 못한 결과의 해석
- [NIST/SEMATECH e-Handbook of Statistical Methods, Critical values and p values](https://www.itl.nist.gov/div898/handbook/prc/section1/prc131.htm) — p값의 정의와 유의수준의 사전 선택
- [ASA Statement on Statistical Significance and P-Values — American Statistical Association](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf) — p값이 가설이 참일 확률이 아니라는 점, 효과 크기와 유의성의 구분
- [NIST/SEMATECH e-Handbook of Statistical Methods, Sample sizes required](https://www.itl.nist.gov/div898/handbook/prc/section2/prc222.htm) — 표본 수 식의 α, β와 검출할 차이
- [NIST/SEMATECH e-Handbook of Statistical Methods, Kolmogorov-Smirnov Goodness-of-Fit Test](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35g.htm) — ECDF 최대 거리, 연속 분포, 중앙 민감도, 모수 추정 시 임계값
- [NIST Dataplot Reference Manual, KOLMOGOROV SMIRNOV TWO SAMPLE](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/ks2samp.htm) — 두 표본 KS의 가설과 통계량
- [NIST/SEMATECH e-Handbook of Statistical Methods, Anderson-Darling and Shapiro-Wilk tests](https://www.itl.nist.gov/div898/handbook/prc/section2/prc213.htm) — 꼬리 가중치와 W 통계량
- [YouTube, ZeroCho TV, 데이터과학 8탄 - 12초 빨라졌다고 하는데 진짜 빨라진 게 맞나?](https://www.youtube.com/watch?v=SAgA54PiXtg) — 전사문의 대기시간 예와 검정 설명을 위 자료로 대조

## 관련 문서

- [[Confidence-Intervals-and-Standard-Error|신뢰구간과 표준오차]]
- [[Descriptive-Statistics-and-Distribution|기술통계와 분포]]
- [[Recommendation-System-Online-Experimentation-Statistics|추천시스템 온라인 실험 통계]] — 표본 수 설계, 비율 지표와 반복 확인
- [[Supervised-Learning-Validation-and-Metrics|지도학습 검증과 지표]] — 같은 분할 점수의 보정 t 검정
