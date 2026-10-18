---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Model Function의 API, row-wise 입력과 버전 전파

live deployment에서 branch별 하나의 model-backed Function을 직접 publish할 수 있다. 일반적인 새 model version은 새 Function version을 만들지만 Marketplace installed-output retraining에는 예외가 있다. model version, deployment version과 소비자가 고른 Function version을 따로 추적한다.

## 입력 API

기본 row-wise API는 tabular input1개와 tabular output1개일 때 가능하다. 추가 Parameter input이 있으면 배열 기반 row-wise API 조건에 맞지 않는다. object/ObjectSet API 대안을 검토하고 toggle 변경 뒤에는 새 Function version을 publish한다.

## Ontology binding과 import

2026년2월부터 새 Function은 Ontology에 bound된다. TypeScript2/Python은 Ontology-bound Function만 지원한다. 옛 TypeScript1의 space-bound ModelDeployment import와 새 Queries import를 같은 계약으로 섞지 않는다.

TypeScript1 resource import는 resources.json을 확인하고 TypeScript2/Python은 원하는 Function version을 remove/reimport한다. objective API가 바뀌면 새 Function version publish가 필요하다. 기존 API의 소비자는 model 자체 업데이트만으로 새 signature를 채택하지 않는다.

Function을 Workshop/Slate/action 등에서 사용할 수 있어도 downstream edit/action 권한과 operation semantics는 별도다. API validation 실패는 재시도보다 model/Function signature와 소비자 version 불일치를 먼저 확인한다.

## 출처

- [Palantir, functions-on-models](https://www.palantir.com/docs/foundry/model-integration/functions-on-models)
- [Palantir, model-functions-guide](https://www.palantir.com/docs/foundry/model-integration/model-functions-guide)

## 관련 문서

- [[Palantir-Model-Marketplace-Packaging]]
- [[Palantir-Model-Engineering-Workflow]]
