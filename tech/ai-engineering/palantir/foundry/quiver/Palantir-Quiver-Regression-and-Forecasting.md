---
tags: [palantir, foundry, quiver, regression, forecast, uncertainty]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 회귀, 예측과 분포 해석"]
---

# Quiver 회귀, 예측과 분포 해석

Quiver는 시계열/산점도 회귀, empirical distribution과 forecast를 제공한다. 설정된 모델이 과거 데이터에 맞는다는 것과 미래 예측이 유효하다는 것은 다른 검증 대상이다. 실제 모델 fitting과 수식 이미지의 시각 검증은 수행하지 않았다.

## Scatter와 분포의 표본

Time-series scatter는 두 series를 비교한다. 기본적으로 underlying time range의 1/1,000 bucket 평균을 점으로 사용하며 bucket 수, points per bucket와 aggregate를 바꿀 수 있다. 기본 범위는 source plot의 zoom range이고 manual range로 바꿀 수 있다. 따라서 보이는 상관은 raw tick pair 상관과 다를 수 있다.

Numeric series formula는 numeric x-axis용이며 time-axis chart의 수식과 구분한다. Distribution은 series value의 aggregate count를 bin으로 표시하며 기본 전체 range, 선택 time range와 bin 수를 구성할 수 있다. Heat grid는 두 series의 같은 bucket 밀도를 색으로 표현한다. Plot을 같은 축에 놓기 전에 단위와 표본 범위를 확인한다.

Correlation matrix는 object property의 Pearson 또는 Spearman을 제공한다. 표본 정렬, 결측값 처리와 인과성까지 이 짧은 카드 설명이 보증하지는 않는다.

## 회귀 결과와 범위

Time-series regression과 scatter regression은 linear, exponential과 degree 0~13 polynomial을 제공한다. Time-series regression은 time range 설정이 필요하다. Scatter regression은 기본 source zoom range를 쓰며 saved range로 바꿀 수 있다. Coefficient card는 계수를 number array로 반환한다.

Array만 저장하면 모델 종류, degree, coefficient 순서와 단위가 빠질 수 있다. 재사용 시 fitted range와 모델 설정을 함께 관리한다. 높은 차수의 fit이나 관측 구간 내 낮은 오차를 out-of-sample 성능으로 해석하지 않는다.

## Forecast 모델과 학습 구간

Forecast 입력과 출력은 time series이며 standard card를 지원하고 transform table transform은 지원하지 않는다. 모델 fitting의 학습 범위는 기본 전체 history이며 범위를 줄일 수 있다. Forecast 범위, coefficient bound와 loss function도 별도 설정이다.

| 모델 | 설정의 의미 |
|---|---|
| Constant | 일정한 값에 맞춤 |
| Linear | 시간에 따른 직선 추세 |
| Formula/governing equation | periodic/exponential 등 명시한 형태와 coefficient |
| ODE | 1차/2차 미분방정식 형태. 실제 식과 초기조건은 모델 구성에서 확인 |
| ARIMA | p(AR), d(differencing), q(MA), seasonal P/D/Q와 period |

일별 데이터의 weekly seasonality 예시는 period 7이다. 관측 주기와 seasonality 단위를 먼저 맞춘다. Auto ARIMA는 maximum-likelihood 기반 fit을 선택하며 작은 term으로 generalization을 높이는 접근을 권한다. 자동 선택을 업무 지식과 미래 검증의 대체물로 사용하지 않는다.

## Loss 설명의 불일치

기본 loss 이름은 Sum of squared differences지만, 설명은 squared difference 합의 제곱근인 L2 norm이라고 적는다. 이름과 설명의 차이를 임의로 고치지 않고 보존한다. 다른 선택은 absolute difference 합(L1), 가장 큰 absolute difference(L-infinity)다. 구현의 정확한 목적함수와 scale은 런타임 또는 상세 reference로 확인해야 한다.

Reference profile/Bollinger band와 forecast를 구분한다. 전자는 관측된 분포나 선택 process의 변동 범위이고 후자는 모델로 생성한 미래 값이다. Upper/lower 그림자만으로 calibrated prediction interval인지 판단하지 않는다.

## 적용 점검

동일 source라도 sampling, view range, filtering과 interpolation이 바뀌면 fit이 바뀔 수 있다. 학습 구간 이후의 holdout, 단위, 누락과 계절 주기를 확인하고, 실제 의사결정에 필요한 오차와 불확실성을 따로 평가한다. 이 마지막 검증 절차는 적용을 위한 판단이며 제품이 자동 수행한다고 주장하지 않는다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Scatter plot regression](https://www.palantir.com/docs/foundry/quiver/card-scatter-plot-regression)
- [Palantir Quiver, Quiver / Detailed card index / Scatter plot regression coefficients](https://www.palantir.com/docs/foundry/quiver/card-scatter-plot-regression-coefficients)
- [Palantir Quiver, Quiver / Detailed card index / Time series distribution](https://www.palantir.com/docs/foundry/quiver/card-time-series-distribution)
- [Palantir Quiver, Quiver / Detailed card index / Time series forecast](https://www.palantir.com/docs/foundry/quiver/card-time-series-forecast)
- [Palantir Quiver, Quiver / Detailed card index / Time series heat grid](https://www.palantir.com/docs/foundry/quiver/card-time-series-heat-grid)
- [Palantir Quiver, Quiver / Detailed card index / Time series regression](https://www.palantir.com/docs/foundry/quiver/card-time-series-regression)
- [Palantir Quiver, Quiver / Detailed card index / Time series regression coefficients](https://www.palantir.com/docs/foundry/quiver/card-time-series-regression-coefficients)
- [Palantir Quiver, Quiver / Detailed card index / Time series scatter plot](https://www.palantir.com/docs/foundry/quiver/card-time-series-scatter-plot)
- [Palantir Quiver, Quiver / Detailed card index / Time series forecast](https://www.palantir.com/docs/foundry/quiver/timeseries-forecast)
- [Palantir Quiver, Quiver / Time series / Time series X/Y plots](https://www.palantir.com/docs/foundry/quiver/xy-plots)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
