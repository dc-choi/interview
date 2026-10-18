---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Objective의 binary/regression/custom evaluator

이 evaluation library는 Modeling Objective의 generated metric pipeline 계약이며 새 palantir_models built-in Evaluation API와 구분한다. 같은 이름의 지표도 parameter/schema가 다르다.

## Default library

binary evaluator는 integer0/1 actual_field와 inference_field, optional positive probability_field를 쓴다. row count/prior/accuracy/precision/recall/F1/MCC와 confusion/score plot을 제공하고 probability가 있으면 AUC/ROC/TPR/FPR/lift를 추가한다. ROC max samples 기본200,probability histogram width0.05의20bucket을 안내한다. subset에 양 class가 없으면 일부 metric을 못 만들 수 있다.

prior는 positive prevalence이며 성능 자체가 아니다. 원문의 F1 설명은2계수를 생략했으므로 표준식2PR/(P+R)로 해석한다. source가 적은 불완전한 식을 코드로 옮기지 않는다.

regression은 row count/MAE/RMSE/R²/explained variance와 score/residual distribution을 제공하며 residual=label-prediction이다. R²/explained variance는 음수일 수 있고 histogram_bins 기본10이다. required field prose는 integer라고 쓰지만 실제 연속값/type 지원을 installed evaluator configuration과 대조한다.

## Custom library

Model Evaluator Template Library에서 Evaluator.apply_spark(df)->List[ComputedMetricValue]를 구현한다. display-name/description과 optional param/metric docstring이 UI 이름을 정한다. library Viewer가 evaluator를 선택할 수 있고 새 tag로 publish한다. 여러 module은 build.gradle 목록에 등록한다.

configuration은 int/float/bool/str,Field[float/int/str]와 Optional을 지원한다. Field.name으로 실제 column을 읽고 ComputedMetricValue(name,value)를 돌려준다. numeric numpy계열,matplotlib Figure,정해진 get_figure/save/savefig중 하나를 구현한 object와 BarChart/LineChart를 지원한다. 값을 만드는 custom code의 정확성은 author가 검증한다.

## 출처

- [Palantir, evaluator-binary-classification](https://www.palantir.com/docs/foundry/evaluate-models/evaluator-binary-classification)
- [Palantir, evaluator-regression](https://www.palantir.com/docs/foundry/evaluate-models/evaluator-regression)
- [Palantir, evaluator-custom](https://www.palantir.com/docs/foundry/evaluate-models/evaluator-custom)

## 관련 문서

- [[Palantir-Objective-Automatic-Evaluation]]
- [[Palantir-Model-Builtin-Evaluators]]
