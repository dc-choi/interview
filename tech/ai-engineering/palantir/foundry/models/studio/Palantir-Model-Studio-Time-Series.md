---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# TimeSeries trainer의 horizon, covariate와 resampling

time-series forecasting은 AutoGluon TimeSeriesPredictor 기반으로 통계/머신러닝/deep model과 ensemble을 비교한다. 후보에는 AutoETS/ETS, DeepAR, DirectTabular/RecursiveTabular, NPTS, Naive/SeasonalNaive, PatchTST, TemporalFusionTransformer, Theta와 TiDE가 있다.

## 입력

training dataset에는 timestamp와 target, 여러 series면 item_id를 매핑한다. static dataset은 item_id당 한 row의 시간 불변 metadata이며 training/test와 같은 key로 연결한다. known covariate는 holiday/event처럼 forecast horizon 전체에서 미리 아는 값이고 나머지는 past covariate다. 미래를 모르는 값을 known으로 두어 leakage가 생기지 않게 한다.

## 학습과 예측

horizon은 미래 step 수다. best_quality는 다양한 model/긴 validation/여러 backtest, high/medium은 품질과 시간의 절충, fast_training은 간단한 statistical/tree 후보를 prototype으로 쓰는 안내다. time limit 뒤에도 validation/publish가 끝나야 job이 완료된다.

quantile0.1 출력은 실제 값이 해당 예측값보다 낮을 확률10%라는 예측 분포 해석이다. 실제 calibration이 보장되는 것은 아니다. source의 metric higher-is-better convention과 자신이 보는 raw error metric 방향을 구별한다.

## resampling과 missing

frequency auto는 추론 실패할 수 있다. 명시적인 pandas offset alias(예: business day B, weekly W)와 numeric/categorical aggregation을 따로 설정한다. timestamp를 정규 주기에 맞추면서 값이 aggregation/보간될 수 있으므로 원래 관측과 구별한다.

target missing fill strategy, ensemble enable과 excluded model을 설정한다. advanced hyperparameter는 명시한 model만 남기므로 DeepAR+Theta2개 설정이면 그3개만 학습 후 ensemble한다. 모르는 형식을 임의로 underlying model에 전달하지 않고 trainer version의 공식 parameter를 확인한다.

결과 model과 Experiment의 metric/plot을 함께 읽고 Quiver/Vertex/Workshop에서 forecast를 볼 수 있다. UI 시각화가 future holdout 평가나 생산 release의 근거를 대신하지 않는다.

## 출처

- [Palantir, trainers-timeseries-forecasting](https://www.palantir.com/docs/foundry/model-studio/trainers-timeseries-forecasting)

## 관련 문서

- [[Palantir-Model-Studio-Workflow]]
- [[Palantir-Model-Studio-Tabular-Trainers]]
