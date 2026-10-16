---
tags: [ai, machine-learning, time-series, forecasting, evaluation]
status: done
verified_at: 2026-10-16
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

## 서로 다른 입력을 예측 시점에 맞춘다

센서 관측, 제품 메타데이터와 외부 환경 데이터를 결합할 때는 입력의 종류와 미래값을 알 수 있는지를 따로 구분한다. 다음은 TFT(Temporal Fusion Transformer) 원 논문의 입력 구분을 제조 예시에 적용한 것이다.

| 입력 종류 | 예시와 확인 조건 |
|---|---|
| 정적 공변량 | 설비 유형처럼 해당 예측 구간에서 변하지 않는 속성. 변경되는 배합이나 설정값까지 정적으로 취급하지 않는다. |
| 미래에 알려진 입력 | 예측 시점에 확정된 달력이나 작업 계획. 사후 변경된 계획을 과거 평가에 넣지 않는다. |
| 과거에만 관측한 입력 | 센서값과 실제 외기 온도. 예측 대상 시점의 실제 관측값을 미리 제공하지 않는다. |

TFT는 이 입력들을 함께 다루는 다중 예측 거리 모델이다. 입력 특성을 고르는 구성요소, 국소 시간 관계를 처리하는 순환 계층과 장기 의존성을 다루는 어텐션을 결합한다. 입력을 나누어 받는 구조가 잘못 정렬된 시각이나 미래 정보 누출을 자동으로 막는 것은 아니다.

외부 변수가 있다는 이유만으로 딥러닝이 필수인 것은 아니다. **ARIMA 오차를 갖는 회귀 모델**도 외부 설명변수를 쓸 수 있다. 다만 예측에 필요한 미래 설명변수가 미지라면 별도로 예측하거나 시나리오 값을 정해야 한다. 그 값을 고정해 계산한 예측 구간에는 설명변수 자체의 예측 불확실성이 포함되지 않는다.

모델 비교에서는 동일한 예측 시점에 이용 가능한 입력과 예측 거리를 맞춘다. 다음은 운영 적용을 위한 점검 제안이다. 데이터 결합 시각, 누락값 처리와 사후 수정 여부를 기록하고, 예측 오차뿐 아니라 재학습 시간과 추론 지연도 함께 비교한다. 복잡한 모델을 선택했다는 사실을 정확도 개선이나 안전한 공정 제어의 증거로 삼지 않는다.

## 여러 시계열을 함께 학습할 때의 입력 계약

부분 검증(2026-10-16): SageMaker AI DeepAR 공식 문서 기준, 서로 같거나 유사한 생성 과정을 가진 여러 시계열을 하나의 모델로 함께 학습할 수 있다. 상품별 모델을 따로 만드는 방식과 비교할 후보이며, 단순히 데이터 수를 늘리면 정확도가 좋아진다는 보장은 아니다.

- 시계열마다 시작일과 길이는 달라도 되지만 관측 주기와 범주형 특성 수, 동적 특성 수는 맞춰야 한다.
- `cat`으로 학습했다면 추론에도 해당 특성을 제공한다. 각 범주값은 학습 데이터에 등장한 값이어야 한다. 학습한 시계열과 유사한 새 시계열을 예측할 수 있다는 설명을 미관측 범주값도 허용한다는 뜻으로 해석하지 않는다.
- `dynamic_feat`으로 학습했다면 추론에서도 과거 입력과 예측 구간 전체의 특성값이 필요하다. 미래 행사 일정처럼 예측 시점에 확보 가능한 값인지 확인하며, 나중에 관측한 실제값으로 채우지 않는다.

평가 설계 제안: 단일 시계열 기준 모델과 같은 예측 거리와 시간 분할로 비교하고, 전체 평균 외에 제품군별 오차를 확인한다. 관련 없는 시계열을 함께 묶은 결과나 특정 매장의 개선 효과는 검증하지 않았다. 이 절은 DeepAR의 입력 조건 대조이며 실제 모델 학습 결과가 아니다.

### 미래 외부 변수가 없는 경우의 모델 비교

부분 검증(2026-10-16): Amazon Forecast의 CNN-QR과 관련 시계열 문서를 대조했다. 외부 변수의 미래값이 없다는 조건은 그 변수의 과거 관측도 사용할 수 없다는 뜻이 아니다.

- **CNN-QR**은 예측 구간의 값이 없는 과거 관련 시계열도 사용할 수 있다. 기본 동작에서 이 입력은 encoder에만 들어가며, 예측 구간까지 있는 관련 시계열은 encoder와 decoder에 들어간다.
- **SageMaker AI DeepAR**의 `dynamic_feat` 입력은 앞 절처럼 예측 구간까지 필요하다. Amazon Forecast의 legacy predictor에서도 DeepAR+의 관련 시계열은 미래 구간을 포함해야 한다. 서비스별 입력 계약을 구분하며 이 조건을 모든 시계열 모델에 확대하지 않는다.
- 관련 시계열이나 상품 메타데이터를 추가해도 정확도가 반드시 좋아지지는 않는다. CNN-QR의 AutoML 또는 HPO는 이 입력을 사용하는 경우와 사용하지 않는 경우를 평가한다.

평가 제안: 미래 날씨의 실제 관측값을 알고 있다고 가정한 실험과, 예측 당시의 기상 예보 또는 과거 날씨만 사용한 실험을 나눈다. 입력을 확보할 수 있는 조건에 맞춰 모델 후보를 정한 뒤 같은 예측 거리에서 비교한다. 과거 발표의 정확도 개선율과 학습 속도 배율은 일반 성능 보장으로 옮기지 않는다. Forecast의 신규 고객 접근 제한은 아래 서비스 공지 절을 따르며, 이 비교는 신규 도입 권고나 실제 학습 결과가 아니다.

## 판매 0, 품절과 행사 급증을 구분한다

2026-10-16 Amazon Forecast의 결측값 문서와 예측 교재의 이상치 처리 원칙을 대조했다. 판매량이 0인 이유를 구분하지 않고 채우면 예측 대상의 의미가 달라진다.

| 관측 상태 | 전처리에서 확인할 것 |
|---|---|
| 판매 가능한 재고가 있었지만 판매 0 | 실제 무판매 관측이다. 이를 일괄 결측 처리하면 수요를 높게 예측하는 편향이 생길 수 있다 |
| 품절로 판매할 수 없었음 | 판매 0을 고객 수요 0으로 단정하지 않는다. 품절 구간을 0으로 채우면 수요를 낮게 예측할 수 있다 |
| 기록 누락이나 수집 실패 | 원인을 확인하고 모델의 결측 처리 방식에 맞춘다. 품절과 같은 상태로 자동 분류하지 않는다 |
| 행사 중 판매 급증 | 큰 값이라는 이유만으로 제거하지 않는다. 입력 오류인지, 반복될 수 있는 실제 변화인지 확인한다 |

적용 제안: 원본 판매량과 재고 가용 여부, 누락 사유를 따로 보존한다. 행사 시작과 종료 구간을 나누어 오차를 보고, 예측 시점에 확정된 행사 일정과 가격만 입력한다. 이상치 판정과 대치 규칙도 각 평가 회차의 학습 구간에서 정하고 이후 관측을 미리 사용하지 않는다. 이 점검은 특정 매장의 성능 개선을 보장하거나 검증한 결과가 아니다.

## MAPE는 정답률이 아니다

MAPE(Mean Absolute Percentage Error)는 실제값 대비 절대 백분율 오차의 평균이다. 실제값이 0이면 정의되지 않거나 무한대가 되고, 0에 가까우면 극단적인 값이 될 수 있다.

`100 - MAPE`를 분류 문제의 정답률이나 미래 예측의 성공 확률로 해석하지 않는다. 예를 들어 실제값 100을 90으로 예측하면 절대 백분율 오차가 10%다. 이것이 예측 10번 중 9번을 맞힌다는 뜻은 아니다.

MAE는 실제값과 같은 단위로 오차를 읽을 수 있고, RMSE는 제곱 오차를 집계한다. 어느 지표가 작은지만 보지 말고 평가 기간, 예측 거리와 비교 기준 모델을 함께 명시한다.

## 분위수 예측과 분위수 손실을 구분한다

2026-10-14 Amazon Forecast 평가 문서 대조 기준. **P90은 예측 분포의 90번째 백분위수이고, wQL은 특정 분위수 예측을 실제 관측값과 비교하는 손실 지표**다. 둘 다 0.9라는 숫자로 표현되는 하나의 확률이라고 해석하지 않는다.

- P90 예측이 300이면 실제값이 그 예측값 아래에 놓이는 비율을 90%로 목표하는 분위수 예측이다. 실제값이 정확히 300일 확률이 90%라는 뜻은 아니다. 운영 데이터에서 그 비율이 달성되는지는 따로 평가한다.
- P10과 P90 사이는 명목상 80% 예측 구간이다. 몇 개의 관측값이 그 안에 들었다는 사실만으로 전체 기간의 보정이 입증되지는 않는다.
- wQL은 과소 예측과 과대 예측의 페널티를 분위수에 따라 다르게 준다. 높은 분위수는 과소 예측을 더 크게 벌한다. wQL 값 자체를 수요량이나 성공 확률로 사용하지 않는다.

재고 예측의 적용 점검으로는 같은 예측 거리에서 분위수별 손실과 실제 구간 포함 비율을 함께 확인한다. 품절과 폐기 비용이 다르면 적절한 분위수도 달라질 수 있으므로 P90을 모든 업무의 기본값으로 고정하지 않는다. 이는 평가 설계 제안이며 특정 매장의 절감 효과를 검증한 결과는 아니다.

제품 도입과 평가 원리는 구분한다. AWS는 Amazon Forecast의 신규 고객 접근을 2024-07-29부터 중단한다고 공지했고 기존 고객은 계속 사용할 수 있다고 밝혔다. 과거 구축 영상을 신규 도입 절차로 그대로 사용하지 않는다. 검증 범위는 이 절의 분위수 해석과 해당 서비스 공지다.

### P50과 평균 예측을 같은 값으로 취급하지 않는다

부분 검증(2026-10-16): Amazon Forecast 평가 문서에서 P50은 예측 분포의 중앙값이고 `mean`은 평균 예측이다. 비대칭 분포에서는 둘이 달라질 수 있다. 점 예측을 선택할 때도 P50 하나로 고정하지 않는다. 예측 교재는 MAE를 최소화하는 예측이 중앙값에, RMSE를 최소화하는 예측이 평균에 대응한다고 설명한다.

Forecast의 현재 평가 문서는 WAPE와 RMSE에 평균 예측을 사용한다고 명시한다. 과거에는 WAPE를 MAPE로 부르고 P50으로 계산했으며, 2020-11-11 이전 생성 predictor의 RMSE도 기본적으로 P50을 사용했다. 과거 발표의 지표 이름이나 그래프를 현재 API 결과와 비교할 때는 예측값의 종류와 계산 정의를 함께 확인한다. 같은 이름의 지표를 나란히 놓는 것만으로 성능 비교 조건이 같아지지는 않는다.

적용 제안: 예측 결과에 `mean`, P50, P90 등 값의 종류를 남기고, 평가에 사용한 값과 연결한다. 이 구분은 지표 해석의 검증이며 특정 모델의 성능이나 재고 절감 효과를 검증한 결과는 아니다.

### 예측값 조회와 모델 평가 API를 구분한다

부분 검증(2026-10-16): Amazon Forecast의 `QueryForecast`는 `Forecast.Predictions` 아래에 시점별 `Timestamp`와 예측 `Value`를 반환한다. 이 값이 RMSE나 분위수 손실인 것은 아니다. `GetAccuracyMetrics`는 predictor의 `TestWindows`별 평가 결과에 RMSE와 `WeightedQuantileLosses` 등을 제공한다.

적용 제안: 화면에 보여 줄 수요 예측값과 모델 채택에 사용할 평가 지표를 별도 데이터로 관리한다. 예측 조회 성공을 정확도 검증으로 계산하지 않고, 평가 지표에는 평가 기간과 predictor를 함께 연결한다. 실제 API 호출은 시험하지 않았으며 신규 고객 접근 제한은 앞 절을 따른다.

## 물리적 운전 구간을 예측 평가에 반영한다

풍력 발전 출력은 풍속이 커질수록 끝없이 증가하지 않는다. 미국 에너지부의 출력 곡선 설명은 발전을 시작하는 cut-in, 정격 출력에 도달하는 rated speed와 보호를 위해 정지하는 cut-out을 구분한다. 정격 도달 이후의 출력 제한과 정지 구간이 있으므로 풍속의 세제곱 관계를 실제 전력 출력의 모든 구간에 적용하지 않는다. 구간 경계는 터빈별로 확인한다.

평가 설계 제안: 기상 예보를 입력으로 쓰는 발전량 모델은 예보가 발표된 시각과 예측 대상 시각을 보존하고, 실제 관측 기상으로 바꾼 사후 평가와 나눈다. 전체 오차 외에 저풍속, 정격 부근과 정지 구간의 오차도 확인한다. 출력이 0인 구간에는 MAPE의 문제가 있으므로 MAE 같은 지표를 함께 보고, 순간 전력과 일정 기간 누적 발전량의 단위도 구분한다.

이 절은 물리적 출력 곡선을 기존 시계열 평가 원칙에 연결한 점검 방법이다. 특정 발전소의 정확도나 정산 수익을 검증한 결과가 아니다.

## 운영에 적용하는 기록 기준

다음은 위 평가 원칙을 반복 실행되는 예측 서비스에 적용한 점검 항목이다.

1. 예측 생성 시각, 대상 시각, 모델 버전과 사용한 데이터 범위를 보존한다.
2. 실제값이 관측된 뒤 해당 시점에 저장했던 예측값과 대조한다. 재학습한 모델로 과거 예측을 덮어쓰지 않는다.
3. 단순 기준 모델과 같은 기간, 같은 예측 거리에서 비교한다.
4. 외부 지표는 관측 시각뿐 아니라 실제 이용 가능 시각을 확인한다. 나중에 공개된 값을 과거 평가에 넣지 않는다.
5. 예측 결과를 LLM으로 설명하더라도 수치와 평가 결과의 정본은 계산된 데이터로 유지한다.

오차 개선과 업무 성과는 별도 관측 대상이다. 업무 의사결정에는 예측 외의 제약도 있으므로 모델 오차 감소만으로 비용 절감이나 수익 향상을 단정하지 않는다.

### 재학습 평가와 배치 예측을 별도 실행으로 둔다

2026-10-14 SageMaker AI 공식 문서와 AWS의 배치 운영 예제를 대조했다. 학습한 모델을 평가하고 등록하는 실행과, 승인된 모델로 새로운 입력을 예측하는 실행은 서로 다른 주기로 구성할 수 있다. 매번 예측할 때 모델까지 다시 학습해야 하는 것은 아니다.

- **학습과 평가:** SageMaker Pipelines의 `ConditionStep`은 평가 결과를 조건으로 후속 모델 등록 등의 실행을 나눌 수 있다. 조건 통과와 모델 등록, 승인 상태를 구분하며, 학습 작업 성공을 운영 채택으로 계산하지 않는다.
- **예측 실행:** 상시 endpoint가 필요 없는 대량 입력에는 Batch Transform을 검토할 수 있다. 예측 실행에 사용한 모델 버전과 입력 범위를 남기고 실제값이 나온 뒤 그 결과를 평가한다.
- **주기 결정:** 데이터 확정 시각, 예측을 사용할 시점과 성능 변화에 따라 재학습과 추론 주기를 정한다(설계 제안). 월별 집계라는 이유만으로 월 1회 실행을 보편 규칙으로 삼지 않는다. 수정된 입력이나 별도 시나리오가 들어오면 같은 기간의 재예측도 필요할 수 있다.

평가 조건에는 앞 절의 시간 분할과 업무에 맞는 지표를 연결한다. 예제의 임계값을 그대로 복사하거나 파이프라인 성공만으로 미래 성능을 보장하지 않는다. 이 절은 실행 구조와 기능 범위의 부분 검증이며 실제 AWS 배포나 예측 품질을 시험한 결과는 아니다.

## 출처

- [Amazon Forecast, QueryForecast](https://docs.aws.amazon.com/forecast/latest/dg/API_forecastquery_QueryForecast.html)
- [Amazon Forecast, GetAccuracyMetrics](https://docs.aws.amazon.com/forecast/latest/dg/API_GetAccuracyMetrics.html)
- [Amazon Forecast, CNN-QR Algorithm](https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-algo-cnnqr.html) — 과거 관련 시계열의 encoder 입력과 추가 특성 평가를 2026-10-16 대조
- [Amazon Forecast, Using Related Time Series Datasets](https://docs.aws.amazon.com/forecast/latest/dg/related-time-series-datasets.html) — legacy predictor별 관련 시계열 지원 범위를 2026-10-16 대조
- [Amazon SageMaker AI, Use the SageMaker AI DeepAR forecasting algorithm](https://docs.aws.amazon.com/sagemaker/latest/dg/deepar.html) — 다중 시계열 학습, 범주값과 미래 동적 특성의 입력 조건을 2026-10-16 대조
- [Amazon Forecast, Handling Missing Values](https://docs.aws.amazon.com/forecast/latest/dg/howitworks-missing-values.html) — 재고 가용 여부와 0/NaN 대치의 편향을 2026-10-16 대조
- [Forecasting: Principles and Practice, Dealing with outliers and missing values — Hyndman, Athanasopoulos](https://otexts.com/fpp3/practical.html#dealing-with-outliers-and-missing-values)
- [시계열 분석을 사용한 수요 예측 및 재고 관리 최적화 사례 — Amazon Web Services Korea](https://www.youtube.com/watch?v=yKymTXu2ZS8) — 행사 구간과 전처리 문제의 학습 계기. 사례의 개선율을 일반 성능으로 옮기지 않았다
- [Amazon SageMaker AI, Define a pipeline](https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html)
- [Amazon SageMaker AI, Batch transform for inference](https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html)
- [Create SageMaker Pipelines for training, consuming and monitoring your batch use cases — AWS](https://aws.amazon.com/blogs/machine-learning/create-sagemaker-pipelines-for-training-consuming-and-monitoring-your-batch-use-cases/)
- [Amazon Forecast, Evaluating Predictor Accuracy](https://docs.aws.amazon.com/forecast/latest/dg/metrics.html) — 2026-10-14 분위수와 wQL, 2026-10-16 P50과 평균 및 과거 지표 정의의 차이 대조
- [Transition your Amazon Forecast usage to Amazon SageMaker Canvas — AWS](https://aws.amazon.com/cn/blogs/machine-learning/transition-your-amazon-forecast-usage-to-amazon-sagemaker-canvas/) — 신규 고객 접근 중단 공지
- [How Do Wind Turbines Survive Severe Weather and Storms? — U.S. Department of Energy](https://www.energy.gov/cmei/wind/articles/how-do-wind-turbines-survive-severe-weather-and-storms) — 출력 곡선의 운전 구간을 2026-10-14 대조
- [Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting — Lim et al.](https://arxiv.org/abs/1912.09363) — 정적, 미래에 알려진 입력과 과거 관측 입력의 구분, TFT의 구성.
- [Forecasting: Principles and Practice, Forecasting — Hyndman, Athanasopoulos](https://otexts.com/fpp3/forecasting.html) — ARIMA 오차 회귀와 미래 설명변수의 조건.
- [Forecasting: Principles and Practice, Evaluating point forecast accuracy — Hyndman, Athanasopoulos](https://otexts.com/fpp3/accuracy.html)
- [Forecasting: Principles and Practice, Time series cross-validation — Hyndman, Athanasopoulos](https://otexts.com/fpp3/tscv.html)
- [Forecasting: Principles and Practice, Forecasting with regression — Hyndman, Athanasopoulos](https://otexts.com/fpp3/forecasting-regression.html)
- [AI로 읽는 미래: 롯데웰푸드의 원자재 가격 예측과 데이터 기반 구매 혁신의 시작 — Amazon Web Services Korea](https://www.youtube.com/watch?v=a8XuiMYBnnA)

## 관련 문서

- [[Eval-Model-Drift-Monitoring|서빙 모델의 변화 감시]]
- [[Agent-Data-Analysis-Workflow|계산 결과와 에이전트 설명의 분리]]
