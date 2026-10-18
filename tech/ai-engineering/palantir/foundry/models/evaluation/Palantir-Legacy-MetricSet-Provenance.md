---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Legacy MetricSet의 transaction, stage와 migration

MetricSet은 foundry_ml dataset-backed model의 과거 metric container다. source는 foundry_ml이2025-10-31종료됐다고 명시하며 새 구현에는 Experiments 등 현재 API를 권장한다. MetricSet은 palantir_models model page에 표시되지 않지만 Modeling Objective에서 볼 수 있는 호환 경로가 남아 있다.

## 연결과 저장

MetricSet(model,input_data)은 실제 model stage/version과 evaluation dataset transaction을 연결한다. input_data는 metadata를 얻기 위해 TransformInput으로 전달하며 단순 DataFrame으로 대체하지 않는다. stage 생략은 마지막 model stage이므로 자신이 평가한 stage와 맞는지 확인한다.

add는 name,value와 string-to-string subset dictionary를 받는다. numeric,line/bar chart,matplotlib/seaborn image를 저장할 수 있다. subset name은 실제 필터를 설명해야 하며 이름만 넣어 자동 filter하는 기능이 아니다. workbook은 persisted transform return,repo는 metric_set.save(output)를 쓴다.

palantir_models와 쓸 때 foundry_ml_metrics를 추가하고0.1602.0이상의 model_version_rid에서 hash UUID 부분만 추출하는 예제가 있다. source code의 input parameter 이름 불일치는 수정하고 실제 evaluated model version과 dataset transaction이 기록되는지 확인한다.

## 갱신과 조회

model이나 input data가 바뀌면 metric dataset도 rebuild해야 한다. 옛 결과가 남아 있으면 새 모델의 성능으로 해석하지 않는다. objective의 Only show metrics produced by evaluation configuration을 끄면 수동 metric이 보이지만 최신이라는 보장은 사라진다.

옛 workbook/foundry_ml 설치 예제를 현재 정상 동작으로 재검증한 것은 아니다. historical lineage를 보존하면서 현재 ModelInput Evaluation/Experiment와 지원 차이를 확인해 migration한다.

## 출처

- [Palantir, metric-sets-reference](https://www.palantir.com/docs/foundry/evaluate-models/metric-sets-reference)
- [Palantir, model-evaluation-code](https://www.palantir.com/docs/foundry/evaluate-models/model-evaluation-code)

## 관련 문서

- [[Palantir-Foundry-ML-Migration]]
- [[Palantir-Model-Evaluation-API]]
- [[Palantir-Model-Experiments-API]]
