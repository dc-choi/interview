---
tags: [palantir, aip-evals, evaluation, experiment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP Evals 평가 suite"]
---

# AIP Evals의 사례, 실행과 판정 계약

Evaluation suite는 test cases, target functions와 evaluators를 함께 관리한다. Logic, published chatbot과 code-authored function을 비교하고 LLM의 반복 편차를 확인할 수 있다. Suite 생성이나 자동 생성된 test가 대표성과 정답을 보증하지는 않는다.

## 같은 사례를 여러 구현에 연결한다

Logic의 Generate evals는 함수 논리를 분석해 test case, evaluator와 metric의 초안을 만든다. 2025년 9월 beta에서 복잡한 Logic 지원 확대는 후속 계획이었다. 생성 이후 edge case, 정답과 judge의 조건을 사람이 수정/검증해야 하며 대상 Logic과 같은 가정을 공유하는 평가만으로 품질을 확정하지 않는다.

Manual test는 edge case와 명시적 expected output을 넣고, object-set-backed test는 실제 객체/속성, 연결 객체/집합과 static 값을 column에 mapping한다. Linked property 지원은 OSv2 조건을 확인한다. 같은 suite에 여러 object set과 manual case를 섞을 수 있다.

여러 target은 input/output signature가 달라도 각각 evaluator를 구성해 같은 사례로 비교할 수 있다. 다만 multi-target run과 experiment configuration은 함께 사용할 수 없다. Logic target은 last saved(기본) 또는 published를, 다른 function은 published version을 고른다. Input mapping은 column 이름이 같아야 하는 것이 아니라 타입이 맞아야 한다.

## 출력과 평가 기준을 분리한다

Evaluator 없는 suite도 실행/수동 검토는 가능하지만 aggregate 품질 metrics를 자동 만들지는 않는다. Exact Boolean/string/numeric/object, array, regex, 길이/범위, keyword, Levenshtein, ROUGE와 LLM judge 등을 필요에 맞게 고른다.

String exact는 기본 대소문자/공백에 민감하고 array는 기본 순서를 고려하므로 원하는 동일성 정의로 설정한다. Generic exact는 numeric과 date/timestamp를 일부 coerce하고 object/object set은 reference로 비교하며 struct/map은 순서 없는 key-value, list는 순서 있는 원소, model은 식별자/parameter로 비교한다. 전용 evaluator가 있으면 더 명시적인 옵션과 타입 검사를 우선한다.

LLM judge는 검증 가능한 condition과 사용 가능한 모델을 요구한다. Object locator/RID/object set/model 같은 reference actual 값은 받지 않는다. 판정 모델이 제공하는 reasoning을 debug할 수 있지만 그 설명이 실제 정답 검증을 대신하지 않는다. Custom function은 하나 이상의 Boolean/numeric metric을 반환하고 struct로 여러 metric, String으로 diagnostic debug output을 제공할 수 있다.

## Pass의 단위를 명시한다

Boolean은 기대 true/false, numeric은 maximize/minimize와 선택 threshold를 구성한다. Iteration은 모든 metric이 기준을 만족해야 pass하고 여러 iteration을 가진 case는 모든 iteration이 pass해야 통과한다. Average가 좋아도 일부 반복 실패를 가릴 수 없다는 판정 계약이다.

LLM-backed function에는 최소 3회 반복이 공식 권장된다. Numeric 분산이 크면 function뿐 아니라 test/evaluator가 의미 있는지도 검토한다. Default test parallelism은 10이며 rate limit에 걸리면 낮출 수 있다. 실험 조합 수, 반복과 병렬성은 서로 다른 비용 요소다.

## 실행 주체에 따라 결과 공개와 보존이 달라진다

| 모드 | 실행/공개 | 보존과 dataset |
|---|---|---|
| User-scoped 기본 | 실행자 권한, 자신만 열람 | 24시간 뒤 삭제, dataset 미기록 |
| Project-scoped beta | 필요한 자원을 project에 import, project 접근자 공유 | 무기한 보존, 구성하면 dataset 기록 |

Run metadata에는 branch/version/model과 custom key-value를 남길 수 있다. Project-scoped 결과는 민감한 input/output와 error도 포함할 수 있으므로 저장 권한을 검토한다. Run results dataset은 suite와 같은 project에 두고 project-scoped 실행에서만 기록한다. Metric별 pass/fail status는 dataset에 아직 지원하지 않으며 Ontology 편집 target은 function output을 남기지 않는다. Dataset 연결을 remove하면 같은 dataset을 다시 선택할 수 없어 새 dataset이 필요하다.

## Ontology simulation의 결과를 평가한다

Ontology 편집 case는 simulation으로 실행해 실제 Ontology를 변경하지 않는다. Create 결과는 simulation에만 있어 직접 case parameter로 넘길 수 없으므로 식별 속성으로 검색해 개수/값을 검사한다. Modify는 기존 객체를 넘겨 변경 속성을, delete는 식별자로 검색해 부재를 확인한다.

편집 평가에는 TypeScript custom evaluation 또는 Logic intermediate parameter를 사용한다. 블록의 flask icon으로 intermediate output을 노출하면 최종 답뿐 아니라 검색/분류/도구 입력 단계를 평가하고 result dataset에도 남길 수 있다. Simulation의 객체 편집 격리를 임의 외부 호출의 무효화 보장으로 확대하지 않는다.

## Experiment는 parameter 조합마다 별도 run이다

모델/prompt를 input으로 parameterize한 뒤 후보값의 Cartesian product를 grid search한다. Experiment 값은 case별 기존 parameter 값을 override한다. Logic Most recent run은 전체 조합 결과가 아니라 마지막 run 하나다. AIP Evals Runs에서 model/prompt 그룹과 metric을 비교하고 최대 4개 run의 test case를 나란히 볼 수 있다.

Debug view에서 target input/output, 코드 또는 Logic step, evaluator input/output과 debug strings를 함께 조사한다. Final output이 틀린 경우 intermediate와 judge를 나누어 원인을 찾는다. Metrics dashboard는 aggregate 분석을 제공하지만 metric objective를 지원하지 않으므로 suite의 pass/fail 화면과 동일한 판정 표면으로 해석하지 않는다.

Results analyzer는 단일 run의 실패 사례를 묶고 함수 정의, evaluator와 가벼운 prompt/response trace를 사용해 원인 후보와 prompt 수정을 제안한다. 2025년 11월 최초 범위는 Logic이었고 agent-as-function/일반 function 확대는 roadmap이었다. RCA 형태의 출력은 진단 후보이므로 사례/evaluator를 확인하고 수정 뒤 같은 suite 또는 experiment를 재실행한다.

Builder의 Use LLM evaluation suite는 2026년 9월 GA에서 manual/imported dataset test와 expected condition/evaluator를 실행해 매 run의 상세 결과를 dataset으로 썼다. 별도 AIP Evals 앱의 user/project retention 계약과 같은 것으로 추정하지 않는다. Production graph와 분리한 test input, result dataset 권한과 suite 전후 비교를 확인한다.

## 출처

- [Palantir, AIP Evals](https://www.palantir.com/docs/foundry/aip-evals/overview)
- [Palantir, Create an evaluation suite](https://www.palantir.com/docs/foundry/aip-evals/create-suite)
- [Palantir, Evaluation suites for Logic functions](https://www.palantir.com/docs/foundry/aip-evals/getting-started)
- [Palantir, Run an evaluation suite](https://www.palantir.com/docs/foundry/aip-evals/run-suite)
- [Palantir, Analyze run results](https://www.palantir.com/docs/foundry/aip-evals/analyze-run-results)
- [Palantir, Run experiments](https://www.palantir.com/docs/foundry/aip-evals/experiments)
- [Palantir, Use intermediate parameters](https://www.palantir.com/docs/foundry/aip-evals/intermediate-parameters)
- [Palantir, Evaluation functions and Ontology edits](https://www.palantir.com/docs/foundry/aip-evals/ontology-edits)
- [Palantir, Write run results to a dataset](https://www.palantir.com/docs/foundry/aip-evals/results-dataset)
- [Palantir, Evaluations metrics dashboard](https://www.palantir.com/docs/foundry/aip-evals/metrics-dashboard)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)

## 관련 문서

- [[Palantir-AIP-Logic-and-Evaluation|모델 호출과 업무 변경]]
- [[Palantir-AIP-Observability|운영 실행의 추적과 검색]]
- [[Palantir-Pro-Code-Agents|Void agent의 결과 객체]]
