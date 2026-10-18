---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# ModelInput evaluation의 버전, 원자성과 한도

Evaluation은 완성된 단일 model version을 test data에 평가한 snapshot이다. Experiment의 stepped training series와 다르며 ModelInput에서 만들고 evaluation set은 동일 methodology를 version 간 묶는다. 서로 다른 방법은 다른 decorator set name을 가진 transform으로 정의한다.

## 실행과 권한

repo를 upgrade하고 palantir_models0.2384.0이상을 쓴다. evaluation logic repo와 model은 같은 project에 있어야 하며 다르면 permission error가 난다. @pm.transforms.evaluation(non-empty set name)이 필요하고 create_evaluation 반복 호출은 같은 instance를 반환한다.

성공 build에서 commit, 실패하면 abort하여 결과를 publish하지 않는다. name은 중복 시 자동 구분하며 생략하면 set name을 쓴다. model은 build branch latest가 기본이고 model_version pin이 branch보다 우선한다. result는 실제 로드한 그 version에 연결된다.

## Log 계약

numeric int/float metric은 같은 key에 다시 쓰면 덮어쓴다. image는 PNG path/bytes/Pillow만, plot은 Plotly Figure만, table은 Pandas/Polars DataFrame만 받는다. Evaluation log에는 step이 없다.

prefix/name은 첫 slash 전 문자열로 subset을 묶을 뿐 데이터 분할은 author가 책임진다. metric/log name100자, image caption200자, image/plot/table 각5MB, table100,000rows, model당100sets 제한을 따른다.

## 조회와 재실행

기본 table은 모든 branch의 evaluation을 model version별 생성시각 내림차순으로 보인다. branch filter와 group by를 확인하고 같은 log name의 image/plot을 side-by-side 비교한다. ad-hoc Run은 정확한 model version과 latest source evaluation logic을 조합하므로 과거 결과를 동일하게 재현한 것과 다를 수 있다.

새 model publication trigger 또는 주기 schedule로 평가할 수 있으나 자동 drift detection 의미는 자신이 정의한 데이터/metric에 달린다. evaluation 공개가 release gate 통과를 뜻하지는 않는다.

## 출처

- [Palantir, evaluation-reference](https://www.palantir.com/docs/foundry/integrate-models/evaluation-reference)
- [Palantir, evaluations-overview](https://www.palantir.com/docs/foundry/integrate-models/evaluations-overview)
- [Palantir, evaluations-writing](https://www.palantir.com/docs/foundry/integrate-models/evaluations-writing)
- [Palantir, evaluations-faq](https://www.palantir.com/docs/foundry/integrate-models/evaluations-faq)
- [Palantir, evaluations-visualize](https://www.palantir.com/docs/foundry/integrate-models/evaluations-visualize)

## 관련 문서

- [[Palantir-Model-Builtin-Evaluators]]
- [[Palantir-Model-Experiments-API]]
