---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Objective submission, review와 release의 권한 경계

Modeling Objective는 목표/metadata, model submission, evaluation, review와 release/deployment를 묶는다. description은 Markdown README로 쓰고 실제 contributor/consumer가 접근할 project에 저장한다. objective를 조회할 수 있다는 사실이 모든 model/evaluation dataset/library/metric 접근권한을 주지는 않는다.

## Submission과 metadata

기존 model resource를 선택해 특정 version을 submit하고 required custom metadata를 채운다. Display metadata의 체크는 표시 위치를 바꾸며 선택하지 않은 default metadata도 submission의 Model details에는 남는다. custom metadata는 objective의 문제/관리 맥락에 맞게 정의하고 JSON editor로 configuration을 옮길 수 있다.

## Check의 실제 강제 범위

check는 name/description과 승인 가능한 user/group을 정한다. eligible group 중 누군가 승인하는 구조이며 모든 구성원의 동의가 필요한 것은 아니다. reviewer는 approve/reject/comment/attachment로 근거를 남긴다. 현재 source는 모든 check 승인 없이도 release 생성이 가능하다고 명시하므로 강제 배포 gate로 설명하지 않는다.

automatic check는 지정 dataset/library의 metric requirement에 따라 PASS/REJECT/PENDING을 정한다. metric 값이 조건을 못 맞추거나 metric이 없으면 REJECT, 미build/실패build면 PENDING이다. green build를 check approval로 바꾸지 않는다. archived check도 과거 discussion/approval history는 남는다.

## Release와 archive

staging release는 staging deployment를, production release는 production deployment를 구동한다. owner가 검증 뒤 staging을 production으로 올리고 release history에 시각/metadata를 남긴다. 해당 environment의 이전 release는 새 것으로 교체되며 연결 deployment가 갱신된다. batch 결과 dataset의 재계산은 schedule/build와 별개다.

release된 submission은 archive할 수 없다. unreleased archive는 release 생성 기능을 없애고 archive table로 옮기지만 system-of-record history는 보존한다. archive 뒤에도 metric pipeline schedule은 별도로 수정/제거해야 한다.

## Ontology 연결

model-backed Action/Workshop workflow는 Functions on objects가 live deployment를 호출하는 방식으로 묶는다. property binding이나 inference 결과가 실제 Ontology edit 적용과 동일하지 않으며 Function/action의 권한과 downstream version을 따로 확인한다.

## 출처

- [Palantir, manage-models](https://www.palantir.com/docs/foundry/manage-models)
- [Palantir, create-a-modeling-objective](https://www.palantir.com/docs/foundry/manage-models/create-a-modeling-objective)
- [Palantir, submit-model](https://www.palantir.com/docs/foundry/manage-models/submit-model)
- [Palantir, configure-objective-metadata](https://www.palantir.com/docs/foundry/manage-models/configure-objective-metadata)
- [Palantir, review-model](https://www.palantir.com/docs/foundry/manage-models/review-model)
- [Palantir, set-up-checks](https://www.palantir.com/docs/foundry/manage-models/set-up-checks)
- [Palantir, release-model](https://www.palantir.com/docs/foundry/manage-models/release-model)
- [Palantir, archive-model](https://www.palantir.com/docs/foundry/manage-models/archive-model)
- [Palantir, models-in-the-ontology](https://www.palantir.com/docs/foundry/manage-models/models-in-the-ontology)

## 관련 문서

- [[Palantir-Model-Engineering-Workflow]]
- [[Palantir-Model-Functions-Versioning]]
