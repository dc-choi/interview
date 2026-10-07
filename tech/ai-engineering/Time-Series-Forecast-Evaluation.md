---
tags: [ai, machine-learning, time-series, forecasting, evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["시계열 예측 평가", "Time Series Forecast Evaluation", "Rolling Origin Evaluation"]
---

# 시계열 예측 평가

시계열 예측은 **예측을 만든 시점에 알 수 있었던 정보**로 미래 관측값을 추정하는 문제다. 학습 데이터에 잘 맞는 정도와 아직 관측하지 않은 기간을 예측하는 능력을 나눠 평가한다.

## 예측 대상과 시점을 고정한다

평가 전에 대상 변수, 관측 주기와 예측 거리를 정한다. 다음 날 수요와 앞으로 3개월의 일별 수요는 평가 조건이 다르다. 같은 모델도 얼마나 먼 미래를 예측하느냐에 따라 오차가 달라진다.

Rolling origin 평가는 예측 기준 시점을 앞으로 옮기며 반복한다. 각 회차에서는 기준 시점 이전의 관측만 학습에 쓰고, 그 이후를 예측해 실제값과 비교한다. 여러 단계 뒤를 예측하는 서비스라면 평가도 그 예측 거리에 맞춘다. 전체 기간으로 학습한 모델의 잔차를 미래 예측 오차로 대신하지 않는다.

## 외부 변수의 미래값을 구분한다

- **사전 예측(ex-ante)**: 예측 시점에 확보할 수 있는 정보만 사용한다. 미래 외부 변수가 필요하면 그 변수도 예측하거나 시나리오를 정한다.
- **사후 조건부 평가(ex-post)**: 나중에 관측한 외부 변수의 실제값을 사용한다. 모델의 특성을 분석할 수 있지만 실제 운영 시점의 예측 성능과는 다르다.
- **미리 아는 변수**: 달력과 공휴일처럼 미래값을 사전에 알 수 있는 변수는 위 구분에서 예외가 될 수 있다.

시나리오의 외부 변수값을 고정한 예측 구간은 그 변수의 미래 불확실성까지 포함하지 않는다. 범위가 좁아 보인다는 이유만으로 전체 예측이 확실하다고 판단하지 않는다.

## MAPE는 정답률이 아니다

MAPE(Mean Absolute Percentage Error)는 실제값 대비 절대 백분율 오차의 평균이다. 실제값이 0이면 정의되지 않거나 무한대가 되고, 0에 가까우면 극단적인 값이 될 수 있다.

`100 - MAPE`를 분류 문제의 정답률이나 미래 예측의 성공 확률로 해석하지 않는다. 예를 들어 실제값 100을 90으로 예측하면 절대 백분율 오차가 10%다. 이것이 예측 10번 중 9번을 맞힌다는 뜻은 아니다.

MAE는 실제값과 같은 단위로 오차를 읽을 수 있고, RMSE는 제곱 오차를 집계한다. 어느 지표가 작은지만 보지 말고 평가 기간, 예측 거리와 비교 기준 모델을 함께 명시한다.

## 운영에 적용하는 기록 기준

다음은 위 평가 원칙을 반복 실행되는 예측 서비스에 적용한 점검 항목이다.

1. 예측 생성 시각, 대상 시각, 모델 버전과 사용한 데이터 범위를 보존한다.
2. 실제값이 관측된 뒤 해당 시점에 저장했던 예측값과 대조한다. 재학습한 모델로 과거 예측을 덮어쓰지 않는다.
3. 단순 기준 모델과 같은 기간, 같은 예측 거리에서 비교한다.
4. 외부 지표는 관측 시각뿐 아니라 실제 이용 가능 시각을 확인한다. 나중에 공개된 값을 과거 평가에 넣지 않는다.
5. 예측 결과를 LLM으로 설명하더라도 수치와 평가 결과의 정본은 계산된 데이터로 유지한다.

오차 개선과 업무 성과는 별도 관측 대상이다. 업무 의사결정에는 예측 외의 제약도 있으므로 모델 오차 감소만으로 비용 절감이나 수익 향상을 단정하지 않는다.

## 출처

- [Forecasting: Principles and Practice, Evaluating point forecast accuracy — Hyndman, Athanasopoulos](https://otexts.com/fpp3/accuracy.html)
- [Forecasting: Principles and Practice, Time series cross-validation — Hyndman, Athanasopoulos](https://otexts.com/fpp3/tscv.html)
- [Forecasting: Principles and Practice, Forecasting with regression — Hyndman, Athanasopoulos](https://otexts.com/fpp3/forecasting-regression.html)
- [AI로 읽는 미래: 롯데웰푸드의 원자재 가격 예측과 데이터 기반 구매 혁신의 시작 — Amazon Web Services Korea](https://www.youtube.com/watch?v=a8XuiMYBnnA)

## 관련 문서

- [[Eval-Model-Drift-Monitoring|서빙 모델의 변화 감시]]
- [[Agent-Data-Analysis-Workflow|계산 결과와 에이전트 설명의 분리]]
