---
tags: [palantir, rollback, datasets, reindexing]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Dataset rollback과 재색인"]
---

# Dataset rollback과 재색인

Dataset rollback은 성공한 과거 transaction으로 data/job history를 되돌리는 기능이다. Logic은 되돌리지 않는다. 잘못된 logic을 수정하지 않으면 다음 build에서 같은 결과가 재발할 수 있다. Retention으로 실제 삭제한 transaction으로는 돌아갈 수 없지만 이전 rollback으로 제외된 transaction은 다시 대상이 될 수 있다.

## Rollback과 force snapshot은 다르다

Dataset rollback은 transactional dataset과 Editor 권한을 요구한다. 선택 branch가 그 dataset에 없으면 fallback branch에 적용될 수 있으므로 graph의 branch configuration과 실제 target을 먼저 확인한다. Data Lineage에서 History의 성공 transaction을 선택하고 preview/confirmation 후 결과 history를 확인한다.

Force snapshot은 즉시 data/history를 바꾸지 않고 다음 build의 incremental state를 초기화하도록 예약한다. Input/logic이 fresh면 별도의 force build가 필요할 수 있다. Force build(실행 재요청)와 force snapshot(계산 방식 변경)을 구분한다.

실수로 force snapshot을 예약했다면 이어서 rollback하지 않는다. 먼저 snapshot build를 수행한 뒤 의도한 rollback을 해야 부분 rollback 상태를 피할 수 있다는 경고를 따른다. 이 동작은 쉽게 undo할 수 있다고 가정하지 않는다.

## Multi-output job의 일관성

같은 job이 만드는 모든 output은 같은 이전 job의 transaction으로 함께 되돌려야 한다. 일부만 rollback하면 다음 incremental이 예상 밖 snapshot으로 바뀔 수 있다. Force snapshot도 모든 output에 요청해야 하며 일부만 요청하면 다음 job이 incremental을 계속할 수 있다.

각 dataset의 시각만 비슷하다는 것으로 같은 job의 consistent state를 증명하지 않는다. Job identity와 input provenance, downstream 상태를 함께 대조한다. Build 전체 원자성이나 외부 side effect의 rollback을 이 기능으로 보장하지 않는다.

## Ontology index와 downstream은 별도 상태다

OSv2 object type backing dataset을 rollback하면 replacement pipeline의 성공적인 full reindex를 수동으로 수행해야 object state에 반영된다. Dataset History가 과거로 바뀌었다고 object query/Workshop까지 같은 상태가 되었다고 보고하지 않는다.

Streaming dataset/media/virtual table/restricted view 등은 동일한 rollback capability를 전제하지 않는다. Dataset만 개별로 되돌릴 때 downstream이 이미 잘못된 data를 읽었는지도 조사하고 재build/reindex 계획을 세운다.

## Legacy pipeline rollback의 역사적 경계

2026-10-16 확인한 pipeline rollback 문서는 planned deprecation이며 November 30th 이후 사용 불가 예정이라고 하지만 연도가 명시되지 않았다. 특정 연도의 확정 종료일로 기록하지 않고 현재 지원 여부를 확인하며 권장 경로는 dataset rollback이다.

과거 pipeline rollback은 upstream transaction의 provenance로 downstream transaction을 찾아 preview하고 일부를 제외할 수 있었다. JobSpec 있는 transactional dataset/Editor/성공 transaction이 대상이며 upstream 최대 50 transaction rollback 제한, uploaded/기타 unsupported resource 제외를 갖는다. 없는 downstream을 rollback 전에 없던 상태로 만드는 대신 incremental history만 초기화하고 data는 그대로 둘 수 있다.

이 legacy 규칙을 현재 dataset rollback의 모든 제한으로 일반화하지 않는다. 특히 graph에 unsupported/excluded resource가 남으면 pipeline 전체가 같은 시점으로 돌아갔다고 보고하지 않는다. 이 문서는 rollback을 실행한 기록이 아니라 공식 계약과 예외를 정리한 지식이다.

## 출처

- [Palantir, Roll back a dataset](https://www.palantir.com/docs/foundry/data-lineage/dataset-rollback)
- [Palantir, Roll back a pipeline (Planned deprecation)](https://www.palantir.com/docs/foundry/data-lineage/pipeline-rollback)

## 관련 문서

- [[Palantir-Lineage-Branches-and-Builds|Graph branch와 fallback]]
- [[Palantir-Dataset-Transactions-and-Build-Branches|Job output과 transaction]]
- [[Palantir-Lineage-Aware-Deletion-Policies|복구 가능한 history와 retention]]
