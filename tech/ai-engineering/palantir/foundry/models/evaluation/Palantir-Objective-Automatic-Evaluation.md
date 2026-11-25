---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-11-26
category: "AI엔지니어링(AIEngineering)"
---

# Objective evaluation pipeline과 dataset transaction 비교

objective는 submission×evaluation dataset마다 inference dataset, 이어 library마다 metrics dataset을 만든다. pipeline 생성과 자동 build enablement는 별도다. 자동 build는 새 submission 시 실행하며 기존 submission은 Build evaluation을 직접 실행해야 한다.

## 데이터와 접근

single tabular input model만 호환되고 external/multi-input은 다른 경로를 검토한다. objective/evaluation dataset/inference와 metrics destination은 같은 project에 두거나 resource reference로 연결해야 한다. 각 model/dataset/library/metric의 원래 permission을 존중한다.

representative validation/test/feedback/scenario dataset을 관리하고 expected output column을 evaluator configuration에 추가한다. UI가 suggest하는 column은 모든 model의 실제 output 존재를 보장하지 않는다. 흔한 expected output은 prediction(흔히 `prediction`), probability(흔히 `probability_1`)와 confidence score다.

evaluation dataset은 크기, 갱신 주기와 permission이 서로 달라도 되며, 나눠 두면 dataset별로 metric 계산 주기와 권한을 따로 통제할 수 있다. dataset마다 inference와 metrics 출력 folder를 지정하며 folder는 기존 것이어도 되고 dataset끼리 공유해도 된다. 공식 문서는 보통 modeling objective당 출력 folder 하나를 권장한다.

## Subset와 비용

Overall은 모든 row를 평가한다. string은 build 시 unique value마다 subset을 만들고 numeric은 fixed width 또는 cutoff로 lower-inclusive/upper-exclusive bucket을 만든다. fixed width는 starting value와 bucket width를 모두 받아 선택한 field 값의 범위 전체에 걸쳐 starting value의 양방향으로 bucket을 만든다. cutoff가 전범위를 덮지 않으면 column 최솟값에서 가장 낮은 cutoff까지, 가장 높은 cutoff에서 최댓값까지의 양 끝 bucket이 추가될 수 있다. subset field는 model input이나 output이 아니어도 evaluation dataset의 어느 column이든 되고 expected model output도 고를 수 있다. multi-field subset에서는 수치 field마다 bucketing 전략을 따로 정할 수 있다. 설정 화면의 evaluation dataset preview로 생성될 subset 수를 미리 확인한다. multi-field는 bucket 조합마다 subset을 만들어 build 수/시간이 급증할 수 있다.

## 비교와 view

dashboard는 selected dataset과 selected/search result model의 교집합 metric을 표시한다. model 선택은 explicit selection과 search 결과의 합집합이다. 특정 dataset transaction을 고르지 않으면 model마다 최신 결과를 보여 서로 다른 데이터가 섞일 수 있다. 공정한 비교에는 같은 transaction을 지정한다.

pinned metric/tab/chart 설정은 submission별이 아니라 objective 전체에 적용된다. Show pinned tabs 설정을 켜야 dashboard에도 보인다. default Only show metrics produced by evaluation configuration은 수동 metric을 숨기며 꺼야 옛 metric도 표시된다. 숨김 해제를 freshness 검증으로 오해하지 않는다.

최신 naming은 inference/metrics에 submission,dataset,library와 hash를 넣는다. legacy naming은 이름 충돌 위험이 있어 backward-compatibility 설정을 신중히 확인한다.

## 출처

- [Palantir, evaluate-models](https://www.palantir.com/docs/foundry/evaluate-models)
- [Palantir, model-evaluation-automatic](https://www.palantir.com/docs/foundry/evaluate-models/model-evaluation-automatic)
- [Palantir, review-model-metrics](https://www.palantir.com/docs/foundry/evaluate-models/review-model-metrics)
- [Palantir, customize-metric-views](https://www.palantir.com/docs/foundry/evaluate-models/customize-metric-views)
- [Palantir, modeling-objective-settings](https://www.palantir.com/docs/foundry/manage-models/modeling-objective-settings)

## 관련 문서

- [[Palantir-Objective-Evaluation-Libraries]]
- [[Palantir-Model-Evaluation-API]]
