---
tags: [ai, machine-learning, evaluation, scikit-learn, learning]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["지도학습 검증과 평가 지표", "Supervised Learning Validation and Metrics", "교차 검증", "Cross-Validation"]
---

# 지도학습 검증과 평가 지표

표 형태 데이터의 지도학습은 특징(feature) X로 목표값 y를 예측한다. 같은 데이터로 학습하고 점수를 매기면 모델이 본 표본을 외운 정도까지 성능으로 계산되므로, 파라미터를 정하는 데이터, 설정을 고르는 데이터, 최종 성능을 확인하는 데이터를 나눈다. 평가 지표는 과업의 오류 비용에 맞춰 먼저 정하고 모든 후보에 같은 기준으로 적용한다.

## 세 데이터의 역할

| 구분 | 쓰는 단계 | 지킬 점 |
|---|---|---|
| 학습(train) | 모델 파라미터와 전처리 통계를 정한다 | 스케일링 범위, 결측 대체값, 특징 선택도 여기서만 계산한다 |
| 검증(validation) | 모델 종류와 하이퍼파라미터를 고른다 | 여러 번 보며 고르므로 이 점수는 선택에 쓰인 낙관적 추정이다 |
| 테스트(test) | 선택이 끝난 뒤 한 번 성능을 확인한다 | 학습과 선택에 쓰지 않는다. 결과를 보고 설정을 다시 고르면 검증 데이터가 된다 |

데이터를 세 덩어리로 고정하면 학습에 쓸 표본이 크게 줄고, 검증 점수가 우연히 뽑힌 한 분할에 좌우된다. K-fold 교차 검증은 학습 데이터를 K개로 나눠 K-1개로 학습하고 나머지 1개로 평가하는 과정을 K번 반복한 뒤 그 점수의 평균을 성능으로 보고한다. 이렇게 하면 별도 검증 세트 없이 설정을 비교할 수 있지만, 최종 평가용 테스트 세트는 여전히 따로 남긴다.

설정을 고른 뒤 학습 데이터 전체로 다시 학습해 테스트를 예측할지, 검증 때 만든 모델을 그대로 쓸지는 실험 설계로 정하고 기록한다. 시간 순서가 있는 데이터는 일반 K-fold가 섞지 않더라도 앞쪽 fold를 평가할 때 뒤 기간으로 학습하게 되므로, `TimeSeriesSplit`처럼 과거로 학습하고 이후 구간으로 평가하는 기간 분할을 쓴다([[Time-Series-Forecast-Evaluation|시계열 예측 평가]], [[Recommender-System-Foundations-Roadmap|추천시스템 기반 로드맵]]의 시간 경계).

## 데이터 누수 막기

누수(data leakage)는 예측 시점에 쓸 수 없는 정보가 학습이나 모델 선택에 들어가 성능이 실제보다 좋게 보이는 현상이다. scikit-learn의 일반 규칙은 테스트 데이터에 `fit`을 호출하지 않는 것이다.

- 전처리 전에 학습과 테스트를 먼저 나눈다. 전체 데이터에 `fit`이나 `fit_transform`을 한 뒤 나누면 테스트의 평균, 범위와 분포가 학습에 들어간다.
- 교차 검증에서도 각 fold의 학습 부분에서만 전처리를 학습해야 한다. 전처리와 모델을 `Pipeline`으로 묶어 `cross_val_score` 같은 함수에 넘기면 fold마다 이 순서가 지켜진다.
- 특징 선택도 전처리와 같다. 전체 데이터에서 목표값과 상관이 높은 열을 고른 뒤 교차 검증하면 선택 자체가 평가 fold를 본 셈이 된다.

```python
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

model = make_pipeline(SimpleImputer(), StandardScaler(), LogisticRegression())
scores = cross_val_score(model, X_train, y_train, cv=5, scoring="f1_macro")
```

분류기에 정수 `cv`를 주면 `StratifiedKFold(shuffle=False)`로 클래스 비율을 유지해 나눈다.

## 분류 지표와 평균 방식

정밀도(precision)는 양성으로 예측한 것 중 실제 양성의 비율, 재현율(recall)은 실제 양성 중 찾아낸 비율이다. F1은 둘의 조화평균이며 `2 * TP / (2 * TP + FP + FN)`으로 계산한다. 정확도(accuracy)는 클래스 비율이 크게 기울면 다수 클래스만 맞혀도 높게 나온다.

클래스가 셋 이상이면 클래스별 F1을 하나로 묶는 방식을 정해야 한다.

| `average` | 계산 | 해석 |
|---|---|---|
| `macro` | 클래스별 지표의 단순 평균 | 모든 클래스를 같은 무게로 본다. 드문 클래스의 낮은 성능이 크게 반영된다 |
| `micro` | 모든 표본과 클래스 쌍의 TP, FP, FN을 합쳐 계산 | 표본 수가 많은 클래스의 영향이 크다. 모든 클래스를 넣은 단일 레이블 다중 분류에서는 accuracy와 같다 |
| `weighted` | 클래스별 지표를 실제 표본 수로 가중 평균 | 불균형을 반영하지만 드문 클래스의 실패가 가려질 수 있다 |

드문 클래스를 놓치는 비용이 큰 과업이면 macro 평균이 그 실패를 드러낸다. 모든 클래스가 똑같이 중요하다는 가정이 맞지 않으면 macro 점수 하나로 판단하지 말고 클래스별 정밀도와 재현율을 함께 본다.

## 회귀 지표와 로그 오차

| 지표 | 계산 | 확인할 점 |
|---|---|---|
| MAE | 절대 오차의 평균 | 목표값과 같은 단위로 읽는다 |
| MSE | 제곱 오차의 평균 | 큰 오차를 더 크게 벌점한다 |
| RMSE | MSE의 제곱근 | 단위를 목표값으로 되돌린 값이다 |
| MSLE, RMSLE | `log(1 + y)`와 `log(1 + ŷ)` 차이의 제곱 평균과 그 제곱근 | 절대 크기보다 비율 차이를 본다. 과소 예측을 과대 예측보다 크게 벌한다 |

로그 오차는 `log(1 + 값)`을 계산하므로 -1 이하 값에서 정의되지 않는다. 입력 검사는 버전마다 다르다. scikit-learn 1.5.2의 `mean_squared_log_error`는 정답이나 예측에 음수가 하나라도 있으면 `ValueError`를 냈고, 1.6.1과 1.9.1은 -1 이하 값이 있을 때만 `ValueError`를 낸다(`root_mean_squared_log_error`는 1.4에 추가). 외부 채점기나 다른 구현의 처리는 따로 확인한다.

판매량이나 가격처럼 음수가 될 수 없는 목표를 예측할 때, 트리 출력을 더해 가는 부스팅이나 선형 모델은 학습 목표값 범위 밖의 음수를 낼 수 있다. 제출이나 평가 전에 예측 범위를 확인하고 다음을 검토한다.

- 목표의 정의역으로 하한을 둔다. 정답이 0 이상일 때 예측을 0으로 자르면 표본별 오차는 늘지 않지만, 그 구간의 예측 품질을 보장하지는 않는다.
- `log1p`로 목표를 변환해 학습하고 `expm1`로 되돌린다. 되돌린 값도 -1과 0 사이의 음수일 수 있으므로 되돌린 뒤 하한을 함께 적용한다.
- 로그 링크를 쓰는 손실을 고른다. 예를 들어 `HistGradientBoostingRegressor`의 `loss="poisson"`은 내부에서 로그 링크를 쓰며 목표가 0 이상이어야 한다.

## 모델 비교의 기준

- 후보 모델은 같은 분할, 같은 지표와 같은 전처리 순서로 비교한다. 특정 알고리즘이 데이터 크기에 따라 항상 낫다는 경험칙보다 현재 데이터의 교차 검증 결과를 기준으로 삼는다.
- 하이퍼파라미터를 바꿀 때는 무엇을 바꿨는지와 fold별 점수를 함께 남긴다. 같은 분할에서 평가한 모델의 점수는 서로 독립이 아니므로 fold별 점수 차이를 짝지어 보고, 유의성을 판단할 때는 이 의존성을 보정한 검정(예: Nadeau와 Bengio의 보정 t-검정)을 쓴다.
- 실행 시간 제한이 있으면 반복 횟수와 모델 크기도 비교 조건에 넣는다.
- 평가 대상 행을 결측이나 이상치 때문에 지우지 않는다. 테스트의 모든 행에 예측이 필요하면 결측은 학습 데이터에서 정한 규칙으로 대체하고, 예측 결과의 행 수와 식별자 순서를 입력과 대조한다.

## 이해 확인

1. 표준화를 전체 데이터에 먼저 적용한 실험과 `Pipeline` 안에서 적용한 실험이 다른 이유를 설명한다.
2. 세 클래스의 작은 혼동 행렬로 macro, micro, weighted F1을 손으로 계산하고 `f1_score` 결과와 대조한다.
3. 음수 예측이 섞인 회귀 결과에서 RMSE와 RMSLE를 각각 계산해 보고 오류가 나는 조건을 확인한다.

## 출처

- [scikit-learn, Cross-validation: evaluating estimator performance](https://scikit-learn.org/stable/modules/cross_validation.html) — 1.9.1 문서. 테스트 세트 보존, K-fold 점수 평균, 전처리와 `Pipeline`.
- [scikit-learn, Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html) — 1.9.1 문서. 데이터 누수와 테스트 데이터에 `fit`하지 않는 규칙.
- [scikit-learn, Metrics and scoring: quantifying the quality of predictions](https://scikit-learn.org/stable/modules/model_evaluation.html) — 1.9.1 문서. 다중 클래스 평균 방식과 F-measure, MSLE 정의.
- [scikit-learn, sklearn/metrics/_regression.py 1.9.1](https://github.com/scikit-learn/scikit-learn/blob/1.9.1/sklearn/metrics/_regression.py) — 로그 오차 함수의 -1 이하 입력 검사와 `root_mean_squared_log_error`의 추가 버전. 1.5.2와 1.6.1 태그의 같은 파일로 검사 조건 변화를 대조했다.
- [scikit-learn, cross_val_score](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.cross_val_score.html) — 분류기와 정수 `cv`의 기본 분할.
- [scikit-learn, classification_report](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.classification_report.html) — micro 평균과 accuracy의 관계.
- [scikit-learn, Statistical comparison of models using grid search](https://scikit-learn.org/stable/auto_examples/model_selection/plot_grid_search_stats.html) — 같은 분할 점수의 비독립성과 보정 t-검정.
- [scikit-learn, HistGradientBoostingRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html) — poisson 손실의 로그 링크와 목표 조건.
- [YouTube, 메타코드M, 빅데이터분석기사 실기 총 정리편](https://www.youtube.com/watch?v=TW-g0ERndqE) — 학습 계기. 시험 정보와 모델별 경험칙은 옮기지 않았다.

## 관련 문서

- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
- [[Recommendation-System-Evaluation-Experimentation|추천시스템 평가와 실험]]
- [[Recommender-System-Foundations-Roadmap|추천시스템 기반 로드맵]]
- [[Descriptive-Statistics-and-Distribution|기술통계와 분포]]
- [[Data-Measurement-and-Tidy-Data|데이터 측정과 결측 처리]]
