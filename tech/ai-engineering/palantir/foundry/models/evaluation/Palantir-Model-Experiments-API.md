---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Experiment의 step, 오류 처리와 MLflow 제한

Experiment는 ModelOutput에서 생성해 training parameter와 metric/image/plot series를 기록하고 model version과 함께 publish해야 model page에 보인다. name 중복은 자동 구분되며 단순 생성만으로 model에 공개된 것은 아니다.

## Log와 오류

parameter는 bool/date/datetime/float/int/string이고 같은 key를 덮어쓸 수 있다. metric은 numeric이며 series step은 엄격히 증가해야 한다. 명시 step 중복/역행은 오류다. step 생략은 각 series를 독립적으로 증가시키므로 batch log도 항상 같은 step이 된다고 가정하지 않는다.

PNG/Pillow image와 Plotly Figure series는 step을 가지며 table은 Pandas/Polars DataFrame을 쓴다. source의 일부 signature 설명에서 step type이 string으로 잘못 적힌 부분은 실제 int signature와 대조한다.

network logging 실패/size overflow 같은 비사용자-code 오류에 FAIL은 raise, WARN(default)은 첫 warning 뒤 후속 error를 suppress, SUPPRESS는 log도 생략한다. training build 성공만으로 모든 metric이 완전하게 기록됐다고 판단하지 않는다.

## MLflow와 한도

MLflow2.0.0이상의 as_mlflow_run context로 autolog/callback을 연결한다. publication/training 때만 log하고 PNG가 아닌 asset은 silently dropped, tags는 ignored, nested runs는 미지원이다. MLflow 전체 기능을 제공하는 backend로 취급하지 않는다.

experiment/metric/parameter name100자, 모든 metric series 합계100,000values, parameter500개, table100,000rows 제한이 있다. UI는 동시 최대5experiment를 비교하며 parallel coordinate plot의 Last/Min/Max 선택에 따라 보이는 값이 달라진다. parameter와 metric의 상관이 인과 효과를 증명하지 않는다.

## 출처

- [Palantir, experiment-reference](https://www.palantir.com/docs/foundry/integrate-models/experiment-reference)
- [Palantir, experiments-overview](https://www.palantir.com/docs/foundry/integrate-models/experiments-overview)
- [Palantir, experiments-visualize](https://www.palantir.com/docs/foundry/integrate-models/experiments-visualize)

## 관련 문서

- [[Palantir-Model-Evaluation-API]]
- [[Palantir-Model-Engineering-Workflow]]
