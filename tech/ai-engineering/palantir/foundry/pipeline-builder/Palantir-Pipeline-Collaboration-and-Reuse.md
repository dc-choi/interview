---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 협업과 재사용 계약"]
---

# Pipeline Builder 협업과 재사용 계약

Pipeline branch는 pipeline에, global branch는 여러 application에 걸친 변경을 묶는다. 같은 이름의 Code Repositories branch와 input/fallback을 맞출 수 있지만 실제 dataset이 현재 branch에서 build되지 않았다면 fallback 목록 순서로 읽는다. Branch라는 이름만으로 모든 input이 격리되었다고 보지 않는다.

## 저장과 변경 검토

일반 pipeline 편집은 명시 Save가 필요하다. Text node는 입력 중 autosave라고 별도로 설명하므로 전체 graph의 저장 계약과 구분한다. History의 read-only detail/diff는 과거 상태 검토이며 되돌리기와 다르다. Archive한 branch는 복구 전 편집/사용할 수 없다.

Proposal은 ADD/MOD/DEL 변경과 column stats, unit test, comment를 검토한다. Reviewed 표시는 사용자별이고 대상이 바뀌면 해제된다. Comment resolve는 변경의 정확성이나 승인과 같은 사건이 아니다. 삭제한 node의 comment도 proposal sidebar에 남을 수 있다.

일반 approval은 기여자가 아닌 Edit 권한 사용자 조건을 쓴다. Protected branches는 같은 approval 규칙을 공유하며 Project approval policy가 추가될 수 있다. Enrollment default protection은 새 pipeline에만 적용하고 기존 pipeline은 바꾸지 않는다.

## Merge, rebase와 reset

일반 proposal merge는 squash이므로 장기 branch끼리 반복 merge하면 공통 이력이 달라져 충돌이 반복될 수 있다. Resolve changes의 fast-forward 경로는 이를 피하지만 protected target에는 직접 저장할 수 없어 proposal이 필요하다. Navigation의 main에서 merge 불가 문구는 최신 branch 가이드의 다중 branch/resolve 설명과 일치하지 않으므로 모든 merge 방향의 현재 제한으로 확대하지 않는다.

Rebase는 base의 non-conflicting 변경을 기본으로 받아들인다. Discard new changes from base는 이들까지 버릴 수 있으며 Squash intermediate versions는 중간 version을 줄인다. Reset branch는 saved/unsaved 변경과 이력을 다른 branch 상태로 바꾸며 되돌릴 수 없다고 설명한다. 단순 충돌 해결과 reset을 혼동하지 않는다.

## 재사용의 변경 반경

Global parameter는 constant/regex/struct locator/column/expression을 참조한다. 한 값을 바꾸면 모든 사용처의 논리가 달라진다. Placeholder를 쓰더라도 실제 값이 없으면 deploy error이며 column 존재도 각 사용 transform에서 확인한다.

Custom expression은 단일 expression, custom transform path는 여러 board를 재사용한다. Argument type은 구체적인 column 이름과 분리한다. Cast를 nested expression에 넣으면 다른 사용처의 원본 type을 바꾸지 않고 원하는 입력을 맞출 수 있다. Duplicate 제거를 대표 row 선택으로 쓸 때는 deterministic ordering을 별도 보장한다.

Beta subgraph는 하나 이상의 transform과 schema를 가진 reusable block이다. Required input column을 다 충족해야 하며 multi-input은 각각 mapping한다. 한 subgraph 수정은 모든 instance에 영향을 줄 수 있어 실제 instance/output schema를 검토한다. 지원 여부와 cross-pipeline 배포 방식은 해당 enrollment에서 확인한다.

## 화면 구조와 실행 구조

Color group, folder, hidden node와 text node는 탐색을 돕는다. Hidden edge는 점선으로 남고 숨긴다고 실행이 제외되지 않는다. Folder 삭제는 안의 node도 지운다. Color assignment는 copy/paste에 보존된다. Search/replace는 column/reference/RID/constant/schema 등 범위를 선택하고 replacement preview와 제외 대상을 검토한다.

Color-group 안내는 Cmd/Ctrl+D를 duplicate로, tips 안내는 child selection으로 설명해 shortcut이 상충한다. 실제 Hotkeys UI를 확인하며 이 문서는 어느 쪽도 공통 보장으로 고정하지 않는다. Pseudocode는 시각적 표현이며 특정 언어 문법이나 code editing 기능이 아니다.

## 출처

- [Palantir Pipeline Builder, branches-approve-a-change](https://www.palantir.com/docs/foundry/pipeline-builder/branches-approve-a-change)
- [Palantir Pipeline Builder, branches-create-a-branch](https://www.palantir.com/docs/foundry/pipeline-builder/branches-create-a-branch)
- [Palantir Pipeline Builder, branches-fallback-branches](https://www.palantir.com/docs/foundry/pipeline-builder/branches-fallback-branches)
- [Palantir Pipeline Builder, branches-overview](https://www.palantir.com/docs/foundry/pipeline-builder/branches-overview)
- [Palantir Pipeline Builder, branches-propose-a-change](https://www.palantir.com/docs/foundry/pipeline-builder/branches-propose-a-change)
- [Palantir Pipeline Builder, branches-protected-branches](https://www.palantir.com/docs/foundry/pipeline-builder/branches-protected-branches)
- [Palantir Pipeline Builder, management-color-groups](https://www.palantir.com/docs/foundry/pipeline-builder/management-color-groups)
- [Palantir Pipeline Builder, management-create-custom-functions](https://www.palantir.com/docs/foundry/pipeline-builder/management-create-custom-functions)
- [Palantir Pipeline Builder, management-file-tree](https://www.palantir.com/docs/foundry/pipeline-builder/management-file-tree)
- [Palantir Pipeline Builder, management-find-and-replace](https://www.palantir.com/docs/foundry/pipeline-builder/management-find-and-replace)
- [Palantir Pipeline Builder, management-overview](https://www.palantir.com/docs/foundry/pipeline-builder/management-overview)
- [Palantir Pipeline Builder, management-parameter-overview](https://www.palantir.com/docs/foundry/pipeline-builder/management-parameter-overview)
- [Palantir Pipeline Builder, management-show-hide-nodes](https://www.palantir.com/docs/foundry/pipeline-builder/management-show-hide-nodes)
- [Palantir Pipeline Builder, management-text-nodes](https://www.palantir.com/docs/foundry/pipeline-builder/management-text-nodes)
- [Palantir Pipeline Builder, navigation](https://www.palantir.com/docs/foundry/pipeline-builder/navigation)
- [Palantir Pipeline Builder, subgraphs](https://www.palantir.com/docs/foundry/pipeline-builder/subgraphs)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
