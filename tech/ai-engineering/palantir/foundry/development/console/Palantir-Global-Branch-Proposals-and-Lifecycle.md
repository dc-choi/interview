---
tags: [palantir, global-branching, approvals, lifecycle]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["Global branch proposal과 수명"]
---

# Global branch proposal과 수명

Global Branching(이전 이름 Foundry Branching)은 여러 resource의 변경을 하나의 branch/proposal로 조정한다. Development 안의 격리와 별도 환경으로 version을 보내는 release management는 상호 보완적이다. 지원 integration마다 isolation/rebase/build 의미가 다르므로 global branch를 전체 platform 복제 환경으로 취급하지 않는다.

공식 문서의 결합 예시는 dataset과 object type schema를 바꾸는 몇 주짜리 기능을 global branch에서 개발해 development environment에 merge한 뒤, release management로 test와 production environment에 배포하는 흐름이다. Release management의 environment는 각각 space이고 branch는 한 space에 속하므로, branch merge는 그 environment의 `main` 반영까지이고 다른 environment 배포는 별도 단계다.

## 격리의 예외

Ontology entity는 branch에서 생성/수정/삭제를 분리할 수 있다. 다른 Foundry resource는 branch에서 생성/삭제하면 Main에 영향을 주며 지원하는 기존 resource 변경부터 격리한다. Branch에서 resource를 제거하면 Main version으로 돌아가 dependent branched resource를 깨뜨릴 수 있다. 일부 application은 branch를 선택할 때 resource를 먼저 branch에 추가하라고 요구하고, 다른 application은 첫 변경을 저장한 뒤 자동으로 추가한다.

Branch는 하나의 고정 Ontology와 space에 속한다. Organization은 space에 연결된 organization의 subset이며 그중 하나의 member여야 접근할 수 있다. 이름 같은 branch metadata는 resource를 통해 외부에도 보일 수 있어 민감정보를 넣지 않는다.

Owner/space Administrator는 branch 관리, proposal 생성/close, branch archive/restore, Do not merge 적용/해제 등을 제어한다. Branch role이 resource edit/view를 주지는 않는다. Space Administrator는 Owner와 같은 관리 권한이 있지만 branch notification을 자동 수신하지 않는다.

## Approval과 merge 주체

모든 resource check/approval이 충족되고 Do not merge가 없으면 proposal을 볼 수 있는 사용자도 merge할 수 있다. Merger가 모든 resource를 직접 edit할 필요는 없으며 사전 작성/승인된 변경을 적용하는 모델이다. Project로 옮기지 않은 Ontology entity의 branch edit 제한 예외는 editor approval로 보완한다.

Protected resource는 Main 직접 변경을 막고 branch review를 요구한다. Project Owner는 eligible reviewers/승인 수/contributor self-approval을 구성하며 새 file 자동 보호도 켤 수 있다. Project가 default approval policy 옵션을 고르면 각 resource는 소유 application이 정한 default policy로만 보호되며(예: object type은 Ontology), 이 policy는 contributor의 permission으로 대개 자동 충족되므로 protected가 항상 독립 reviewer 한 명을 보장하지 않는다. Default policy가 자동 충족되지 않는 드문 경우(대개 policy가 요구하는 permission이 없을 때)에만 다른 사용자의 approval이 필요하다. Reviewer로 미리 지정되지 않아도 policy 요건을 충족하는 사용자는 누구나 approve할 수 있다. 적용되는 policy는 proposal page의 reviewers column이나 branch taskbar에서 resource approval status를 눌러 연 popover로 확인하며, policy별 eligible reviewers, 필요 approval 수와 contributor approval 허용 여부가 표시된다.

Unprotected resource도 기본 edit-level approval을 요구할 수 있다. Code Repositories/Pipeline Builder는 자체 local branch protection과 approval policy를 유지한다. 공식 문서는 이 둘에서 project approval policy를 선택할 수 있게 하겠다고 예고만 했으므로, 현재는 project policy가 이 resource에 그대로 적용된다고 가정하지 않는다. 한 명의 reject는 resource와 전체 proposal merge를 막고 그 rejecting user가 다시 approve해야 한다. Review 요청 수신/일반 approval 수 충족만으로 reject가 해제되지 않는다.

Resource move는 protection 상태를 유지하지만 새 Project policy가 적용된다. Open proposal 표시 갱신은 최대 하루 지연될 수 있고 resource edit/merge 시도도 refresh한다. Policy 변경은 기존 관련 proposal을 재평가하므로 처음 만든 시점의 승인 규칙이 영구 고정되는 것은 아니다.

## Rebase와 부분 merge

Main update는 branch별 rebase로 받아들이고 non-conflict는 자동 해소할 수 있지만 같은 property 양쪽 edit는 수동 선택한다. Proposal Changes에는 resource별 viewer가 있고 일부 Workshop/Pipeline Builder/AIP Logic은 별도 review experience를 사용한다. 체크 통과만으로 실제 end-to-end 성공을 증명하지 않는다.

Merge의 build option은 수정 resource와 그 사이 transform까지 build, 수정 resource만 build, build 안 함 세 가지다. 수정 resource만 build하면 이 branch의 upstream 변경에 의존하는 resource는 수동 build가 필요할 수 있다. 수정 resource를 merge build에서 제외할 수도 있으며, 제외를 저장하면 선택한 수정 resource 쌍 사이의 transform으로 계산한 affected resource 미리보기가 갱신된다. 제외는 build만 빼고 변경은 그대로 merge한다. Logic merge와 data 갱신을 구분한다. 일부 resource merge가 실패하면 성공한 resource와 branch에 남은 resource가 나뉘며 현재 부분 실패한 merge는 revert할 수 없다. Error를 해결하고 다시 merge한다. Single-click UI가 전체 원자적 rollback을 보장하지 않는다.

## Branch retention과 복구

Active는 data를 유지한다. Default로 35일 inactive 이후 label과 de-index, 추가 7일 뒤 data deletion을 trigger하지만 space policy에서 조정한다. Inactive/Archived build는 즉시 실패하고 반복 실패 schedule이 자동 pause될 수 있다. Archive는 수동이며 open proposal도 close한다.

Branch details의 Branch settings에서 Keep branch active를 켜면 inactive 전환과 그에 따른 de-index, data deletion을 받지 않는다. 공식 문서는 active branch가 inactive branch보다 시간이 지날수록 비용이 커진다고 설명하므로, 계속 유지해야 하는 branch에 한정하는 편이 낫다. Proposal 상태는 Open(진행 중이거나 승인됨), Merged, Closed(merge 없이 닫힘) 세 가지라 Open만으로 미승인 상태라고 판단하지 않는다.

Restore/reactivate는 삭제된 data/JobSpec/index를 자동 복구하지 않는다. Ontology reindex, Code Repository no-op commit 후 repository 안에서 첫 build, Pipeline Builder deploy/build가 필요할 수 있다. Data Lineage에서 첫 build만 하면 사라진 JobSpec을 다시 넣지 못한다. Schedule도 필요하면 수동 resume한다.

Local Git 작업은 inactive/archive 상태에서도 막히지 않아 새 logic/data가 삭제될 수 있다. AI FDE는 reactivate/restore를 요구한다. Merged branch는 terminal이며 restore할 수 없다. Metadata 보존과 materialized data 보존을 구분한다.

## 출처

- [Palantir, Global Branching](https://www.palantir.com/docs/foundry/global-branching)
- [Palantir, Global Branching overview](https://www.palantir.com/docs/foundry/global-branching/overview)
- [Palantir, Global Branching application](https://www.palantir.com/docs/foundry/global-branching/application)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/global-branching/core-concepts)
- [Palantir, Branch security](https://www.palantir.com/docs/foundry/global-branching/branch-security)
- [Palantir, Branch taskbar](https://www.palantir.com/docs/foundry/global-branching/branch-taskbar)
- [Palantir, Integrations](https://www.palantir.com/docs/foundry/global-branching/integrations)
- [Palantir, Resource protection and project approval policies](https://www.palantir.com/docs/foundry/global-branching/resource-protection-and-approval-policies)
- [Palantir, Release management overview](https://www.palantir.com/docs/foundry/devops-release-management/overview/)

## 관련 문서

- [[Palantir-OSDK-Branch-Context-and-Preview|OSDK runtime branch 검증]]
- [[Palantir-Lineage-Branches-and-Builds|Branch-aware graph와 fallback]]
- [[Palantir-Branching-and-Packaging-Boundaries|격리와 배포의 차이]]
