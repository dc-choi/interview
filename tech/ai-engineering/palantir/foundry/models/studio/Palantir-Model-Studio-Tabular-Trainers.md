---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Classification과 regression trainer의 선택 및 평가

두 trainer는 AutoGluon TabularPredictor 기반으로 여러 model을 병렬/순차 학습하고 필요하면 weighted ensemble, bagging과 stacking을 사용한다. Experiment의 Plots로 ensemble 구조를 확인한다.

기본 후보는 GBM/LightGBM, CAT/CatBoost, XGB, RF, XT, KNN, LR, NN_TORCH와 FASTAI다. 원문의 regression 목록에도 classifier 계열 명칭이 섞여 있으므로 실제 trainer implementation/config를 확인하며 이름만으로 모든 조합의 적합성을 단정하지 않는다.

## preset와 시간

best_quality/high_quality/good_quality는 stacking/bagging을 켜고 학습/추론 비용과 품질을 교환한다. medium_quality는 이를 끄고 빠른 prototype 용도로 안내한다. preset 이름은 자신의 dataset에서 품질 우열을 보장하지 않는다.

training time limit은 stacking/bagging 때 best effort일 수 있다. limit에 도달해도 validation과 publish가 끝날 때까지 전체 job은 계속될 수 있다. inference time limit은 초과 model을 후보에서 제외하므로 실제 serving timeout과 구별한다.

weighted ensemble은 각 layer, 마지막 layer의 이전 model 전체 포함, 추가 full ensemble 옵션을 구별한다. stacking이 꺼졌거나 앞 옵션이 꺼졌으면 후속 옵션에 효과가 없을 수 있다.

## hyperparameter와 output

advanced hyperparameter를 지정하면 거기에 없는 model은 제외되고 AutoGluon default를 덮어쓴다. GBM에 extra_trees/default 두 설정과 NN_TORCH만 지정하면 해당3개만 학습 후 ensemble한다. 단순히 일부 option만 추가하면서 다른 후보는 유지되는 설정으로 해석하지 않는다.

classification probability 출력은 `{prediction_column}_proba_{class_label}` 열을 추가한다. prediction column 기본값은 target column 이름이다. 기본 objective evaluator가 target/prediction 양쪽을 기대하면 target을 덮어써100% 정확도처럼 보일 수 있으므로 서로 다른 prediction column을 명시한다.

classification의 source metric은 higher-is-better convention을 설명한다. regression은 MAE/MSE/RMSE 낮을수록, R²/Pearson 높을수록 좋다는 차이를 명시한다. metric name과 방향, 원본 ground truth 보존을 함께 확인한다. 최고 validation model 출력이 독립 test/운영 품질을 대신하지 않는다.

## 출처

- [Palantir, trainers-classification](https://www.palantir.com/docs/foundry/model-studio/trainers-classification)
- [Palantir, trainers-regression](https://www.palantir.com/docs/foundry/model-studio/trainers-regression)
- [Palantir, faq](https://www.palantir.com/docs/foundry/model-studio/faq)

## 관련 문서

- [[Palantir-Model-Studio-Workflow]]
- [[Palantir-Model-Deployment-and-Monitoring]]
