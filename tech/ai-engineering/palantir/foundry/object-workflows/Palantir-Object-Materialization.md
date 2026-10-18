---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 Materialization과 보안/보존 경계

Materialization은 원천과 user edit를 합친 객체 상태를 dataset/RV로 제공한다. OSv1은 edit를 위해 writeback dataset이 필요하지만 OSv2는 선택 사항이며 속성 일부를 여러 dataset으로 materialize할 수 있다. OSv1 writeback은 별도 schedule이 없으면 오래된 상태일 수 있다. OSv2 automatic은 수분 수준 전파와 추가 build 비용, periodic은 원천 변경 또는 6시간 주기를 사용한다. Dataset Preview에서 수동 build하지 않는다.

OSv2 materialized dataset은 최신 snapshot만 보장하고 과거 transaction retention을 조정할 수 없다. 이력과 object type 삭제 후 데이터가 필요하면 downstream transform으로 보존한다. Schema는 기본적으로 원천 column이 아니라 Ontology property API name이다. __is_deleted, __patch_offset 등 __ 접두사 column은 내부 dedup metadata이며 상태 계약으로 사용하면 안 된다.

## Restricted view와 다중 원천

MDO에서 선택하지 않은 source의 속성은 결과에 없다. 한 RV source를 RV로 materialize할 수 있지만 여러 source를 합치면 일반 dataset만 지원한다. 일반 dataset에는 RV의 row policy가 전파되지 않는다. 생성자는 backing dataset과 RV의 discretionary/mandatory control을 만족해야 하고, transaction 열람에는 backing transaction의 marking도 필요하다. RV에서 끊겼던 backing provenance가 materialization에는 다시 붙는다. Mandatory-control property의 allowed marking/org/max classification도 적용된다.

사용자 mandatory control을 string property와 비교하거나 authorized group ID 조건, static organization/marking 조건이 있으면 RV materialization을 구성할 수 없다. 적합한 mandatory-control property로 모델링해야 한다. 원문에서 RV transform input 불가라는 설명은 전체 플랫폼의 새로운 restricted workflow 지원과 혼동하지 않는다.

Global Branch에서 materialization 생성/편집은 불가하다. 기존 object type 변경은 branch output에 반영된다. Object type 삭제/branch 제거 시 dataset branch는 삭제되지만 materialized RV branch 삭제는 현재 미지원으로 남는다.

## 출처

- [Palantir, materializations](https://www.palantir.com/docs/foundry/object-edits/materializations)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
