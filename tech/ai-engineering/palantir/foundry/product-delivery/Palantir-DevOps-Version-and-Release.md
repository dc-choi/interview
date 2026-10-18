---
tags: [palantir, foundry, product-delivery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Product version, recall과 환경별 release

Release channel은 배타적이지 않다. Release track은 Release/Pre-stable/Stable versions, Pre-stable track은 Pre-stable/Stable, Stable track은 Stable만 받는다. installation 기본은 Release다. channel 선정과 auto upgrade on/off, maintenance window를 함께 설계한다.

Product deprecate는 storefront에서 숨기며 hard delete는 지원하지 않는다. local version recall은 새 install/manual upgrade/auto upgrade의 해당 version 사용을 막지만 이미 설치된 version에는 영향이 없다. remote store recall은 지원하지 않고 local recall이 다른 enrollment의 remote store에 전파되지 않는다. 수동 local upload는 recall 정보를 유지한다.

Maven coordinate는 enrollment reverse URL + Space namespace + store identifier의 group과 product artifact ID로 connected Apollo hub에 게시한다. coordinate에 sensitive data를 넣지 않는다. store category/tag는 store 범위이고 category 이름 및 category 안 tag 이름은 중복 불가다. 삭제는 product 부착도 제거하고 복구할 수 없으며 새 product version을 publish해야 tag 적용이 반영된다.

## Environment separation

장기 Dev/Test/Production은 Space별로 data, behavior(예: notification recipient/approver)와 external integration을 분리한다. environment config는 enrollment 전체와 모든 stores에 영향을 주고 해당 Space Owner만 추가/수정/삭제할 수 있다. 여러 workflow가 같은 Space에서 resource를 공유할 수 있어 Space 분리가 모든 의존성의 자동 격리를 보장하지 않는다.

Project:product를1:1로 두는 지침은 resource owner를 찾기 쉽게 한다. object type은 backing dataset, link는 더 downstream object product, Action은 관련 use case 또는 backing Function, Function은 producer repository/logic과 함께 둔다. 공통 Action/Function은 core product로 분리한다. 문서의 Ontology entity가 Project 밖이라는 설명은 기존 모델의 지침이며 현행 folder tracking의 project-based permissions 지원과 구별한다.

동일 packaged version을 Test에서 검증하고 다음 environment에 설치한다. upstream 먼저 설치하고 downstream inputs는 같은 environment의 resources로 채운다. Global Branching은 한 environment 안 feature/hotfix의 빠른 격리/merge에 적합하고 short-lived/limited resource coverage로 장기 환경의 다른 source/security/integration과 release channel 요구를 모두 대신하지 못한다. DevOps release와 branching은 운영 목적에 따라 함께 쓴다.

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/devops-release-management/overview).

## 출처

- [Palantir, manage-products](https://www.palantir.com/docs/foundry/foundry-devops/manage-products)
- [Palantir, manage-store-tags](https://www.palantir.com/docs/foundry/foundry-devops/manage-store-tags)
- [Palantir, devops-release-management](https://www.palantir.com/docs/foundry/devops-release-management)
- [Palantir, use-devops-for-release-management](https://www.palantir.com/docs/foundry/devops-release-management/use-devops-for-release-management)

## 관련 문서

- [[Palantir-DevOps-Linked-Products]]
- [[Palantir-DevOps-Permissions-and-Transport]]
