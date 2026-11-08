---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-11-08
---

# 객체 Materialization과 보안/보존 경계

Materialization은 원천과 user edit를 합친 객체 상태를 dataset/RV로 제공한다. 주 용도는 둘이다. 하나는 user edit를 포함한 최신 객체 상태가 필요한 downstream pipeline이고, 다른 하나는 object type 전체의 최신 상태 다운로드다. 대량 다운로드는 materialized dataset을 만든 뒤 일반 dataset의 data export나 transform 기반 export 경로로 내보내는 방식이 권장된다. OSv1은 edit를 위해 writeback dataset이 필요하지만 OSv2는 선택 사항이며 속성 일부를 여러 dataset으로 materialize할 수 있다. OSv1 writeback은 별도 schedule이 없으면 오래된 상태일 수 있다. OSv2 automatic은 수분 수준 전파와 추가 build 비용, periodic은 원천 변경 또는 6시간 주기를 사용한다. Dataset Preview에서 수동 build하지 않는다.

OSv2 materialized dataset은 최신 snapshot만 보장하고 과거 transaction retention을 조정할 수 없다. 이력과 object type 삭제 후 데이터가 필요하면 downstream transform으로 보존한다. Schema는 기본적으로 원천 column이 아니라 Ontology property API name이다. __is_deleted, __patch_offset 등 __ 접두사 column은 내부 dedup metadata이며 상태 계약으로 사용하면 안 된다.

## Restricted view와 다중 원천

MDO에서 선택하지 않은 source의 속성은 결과에 없다. 한 RV source를 RV로 materialize할 수 있지만 여러 source를 합치면 일반 dataset만 지원한다. 일반 dataset에는 RV의 row policy가 전파되지 않는다. 생성자는 backing dataset과 RV의 discretionary/mandatory control을 만족해야 하고, transaction 열람에는 backing transaction의 marking도 필요하다. RV에서 끊겼던 backing provenance가 materialization에는 다시 붙는다. Mandatory-control property의 allowed marking/org/max classification도 적용된다.

OSv2에서 RV에 사용자 mandatory control을 string property와 비교하는 조건, authorized group ID 조건, static organization/marking 조건이 있으면 materialization을 구성할 수 없다. 적합한 mandatory-control property로 모델링해야 한다. RV는 새 dataset을 만드는 transform이나 batch 작업의 입력으로 쓸 수 없어, materialization이 RV를 일반 dataset으로 바꾸는 유일한 경로다.

Global Branch에서 materialization 생성/편집은 불가하다. 기존 object type 변경은 branch output에 반영된다. Object type 삭제/branch 제거 시 dataset branch는 삭제되지만 materialized RV branch 삭제는 현재 미지원으로 남는다.

## 장애 사례: 오래 변하지 않은 object type의 읽기 실패

OSv2 materialized dataset 읽기가 `Catalog:TransactionDataDeleted`로 실패하고 오류가 materialized dataset이 아닌 다른 dataset을 가리키면, materialization이 아직 읽는 내부 데이터를 retention이 지운 경우일 수 있다. 알려진 제약으로, 데이터가 오랫동안 바뀌지 않은 object type에서 생길 수 있다. 해당 object type의 Funnel live pipeline이 데이터 변경과 함께 다시 돌면 읽기가 회복된다.

재발 방지는 object type RID와 전체 오류 메시지를 Palantir Support에 전달해 incremental no-op transaction을 켜는 방식이다. 이 설정은 해당 object type의 Ontology indexing compute 사용량을 늘리므로 읽기 안정성과 비용을 함께 판단한다.

## 출처

- [Palantir, materializations](https://www.palantir.com/docs/foundry/object-edits/materializations)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
