---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Built-in evaluator의 dispatch, ground truth와 지표

built-in evaluate는 scikit-learn이 필요하고 model inference, metric 계산과 Evaluation log를 함께 수행한다. EvaluationResult.metrics를 돌려주며 decorator 안에서는 evaluation을 자동 생성하거나 명시 instance에 쓴다.

## 입출력 선택

DataFrame은 single argument, tuple은 positional, dict는 keyword로 풀지만 single map/struct API면 dict를 그대로 넘긴다. predict를 override했으면 predict, 아니면 transform을 사용한다. Spark DataFrame은 metric 계산을 위해 Pandas로 materialize하므로 driver memory에 들어가야 한다.

targets는 evaluation_df 또는 inputs에서 정확히 한 column을 찾아야 한다. prediction_column 기본값은 targets와 같으므로 서로 다른 output 이름을 명시한다. output은 DataFrame 또는 InferenceResults/dict/tuple/list 안의 DataFrame이며 prediction column을 가진 frame이 정확히1개여야 한다. 없거나 여러 개면 실패한다.

## 지표

regression은 example_count,MAE,MSE,RMSE,R²,max_error,MAPE를 기록한다. classification은 prediction/label의 unique class 수로 binary/multiclass를 정하고 example_count,accuracy,precision,recall,F1을 남긴다. binary는 TP/TN/FP/FN, multiclass는 weighted(default)/micro/macro/samples average를 쓴다.

ROC AUC는 class_probabilities_columns(클래스 순서의 열 목록) 또는 class_probability_column(배열 column) 중 정확히 하나로 probability를 공급해야 한다. 둘을 같이 주면 오류고 둘 다 없으면 AUC를 생략한다. multi-class는 one-vs-rest다.

subset option은 metric prefix를 붙여 그룹화한다. 평가 dataset을 원하는 segment로 나눈 뒤 반복 호출해야 실제 해당 segment의 지표가 된다. 이름만 subgroup으로 붙여도 데이터가 자동 분할되는 것은 아니다.

## 출처

- [Palantir, evaluations-builtin](https://www.palantir.com/docs/foundry/integrate-models/evaluations-builtin)

## 관련 문서

- [[Palantir-Model-Evaluation-API]]
- [[Palantir-Model-Adapter-Contracts]]
