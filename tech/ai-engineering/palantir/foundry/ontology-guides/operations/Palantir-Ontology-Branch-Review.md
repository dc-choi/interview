---
tags: [palantir, ontology]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
---

# Ontology branch의 변경, 검토와 병합

현재 Ontology 변경은 Global Branching과 통합한다. Legacy ontology branch는 종료 중이며 Global Branching이 활성화된 enrollment에서는 새 legacy branch를 만들 수 없다. Branch는 main에서만 만든다.

## 보호와 rebase

Project permissioning으로 이동한 object, action, link, interface와 shared property type은 보호할 수 있다. Type group은 보호 대상이 아니며 rule set은 소유 object type의 보호를 따른다. 보호된 resource는 branch와 proposal을 통해 변경한다.

Ontology 변경이 없는 global branch는 자동 rebase한다. Object type indexing을 포함해 Ontology 변경이 생기면 수동 rebase가 필요하다. 이는 10분마다 자동 rebase되는 업무 scenario와 다른 계약이다.

Rebase 중에는 main 변경을 branch로 가져오고 기존 branch 변경을 working state에 다시 올린다. 충돌 resource는 branch 내용을 기본 표시한다. Main 선택, branch 유지 또는 직접 수정을 거쳐 conflict와 error를 모두 해결한 후 Finish rebase and save를 수행한다.

Main에서 datasource나 conditional formatting rule set을 제거/교체한 충돌은 branch 내용을 유지하면 merge가 실패하므로 main 변경을 선택해야 한다. Pipeline Builder에서 만든 object type은 branch의 Ontology Manager에서 수정할 수 없다.

## Branch indexing과 media set

Branch에서 object type을 index해야 그 branch의 data로 preview와 테스트를 할 수 있다. Ontology Manager에서는 object type 화면이나 그 object type을 편집하는 action type에서 index하고, 여러 object type은 Workflow Lineage의 bulk indexing으로 한 번에 처리한다. 진행 상황은 Ontology proposal의 Preview status 탭에서 본다.

Global branch에서 object type을 처음 index하면 그 object type이 참조하는 media set도 자동으로 branch에 추가된다. 새 media set branch는 비어 있는 상태로 시작하며 main이나 다른 global branch의 media item을 복사하지 않는다. 대신 branched backing datasource에 있는 media reference는 object type을 통해 계속 읽을 수 있어 main의 media item도 보인다. 즉 기존 참조는 읽히고 branch에서 새로 넣은 media만 격리된다. Branch의 media set이 비어 있다는 사실을 참조 media가 사라졌다는 뜻으로 해석하지 않는다.

Global branch가 media set을 지원하기 전에 이미 index한 object type은 media set이 branch에 없을 수 있다. 이때 Ontology Manager가 경고 배너를 띄우며, global branch에서 해당 object type이나 media set을 참조하는 action type을 열어 Add media set to branch를 선택해 추가한다.

## Branch indexing의 범위와 user edit 가져오기

Branch indexing은 object type과 many-to-many link type이 대상이며 main branch에 영향을 주지 않는다. Branch에서 object type을 수정하면 자동으로 index된다. Link type을 수정하면 관련 object type이 자동 index되고, many-to-many link type이면 link type 자체도 index된다. Shared property type이나 interface를 바꿔도 그것을 쓰는 object type이 index될 수 있으므로, 직접 고치지 않은 object type이 indexed로 보여도 이상 신호로 단정하지 않는다. 부분 data만 index하는 선택지는 없고 선택한 type의 전체 data를 index한다.

Action이 편집하는 object type이 branch에 index되어 있지 않으면 action은 그 편집을 적용하지 않는다. Action type 화면의 Index entities 배너나 save 화면의 Indexing on branch 탭에서 필요한 resource를 한 번에 index할 수 있다. 수정 때문에 처음 index되는 resource는 이 탭의 resource별 Import user edits 토글로 가져오기 여부를 정하고, 저장하면 다른 변경과 함께 index가 시작된다.

Index할 때 Index and import edits(권장)와 import 없는 index 중 하나를 고른다. 가져오기는 최초 index 때 한 번만 일어나며 이후 main의 user edit는 branch로 동기화되지 않는다. 나중에 가져오려면 resource를 branch에서 제거한 뒤 다시 index해야 하고, 제거는 그 resource에 branch에서 한 다른 변경도 되돌린다. 이미 index된 resource에는 edit를 추가로 가져올 수 없다. Many-to-many link type의 edit를 가져오면 관련 object type의 edit도 함께 가져와야 한다.

가져오기를 쓸 수 없는 경우는 resource가 branch에서 새로 만들어져 main에 없을 때, main에서 user edit가 비활성일 때, branch가 main보다 뒤처졌을 때다. 마지막 경우는 rebase를 먼저 한다.

Overview 탭의 Index status는 `Indexed (edits imported)`, `Indexed`, `Indexed (on main branch)`로 구분한다. 마지막 값은 branch에는 index되지 않고 main에만 index된 상태다.

Branch에서 action으로 만든 user edit는 테스트용이며 branch를 merge해도 main으로 옮겨지지 않는다. Branch 테스트에서 만든 data를 운영 data 준비 수단으로 쓰지 않고, main에 필요한 data 변경은 main에서 별도로 수행한다(설계 제안).

## Reviewer 지정은 승인 권한이 아니다

Global Branching proposal을 만들면 Ontology 변경을 위한 local proposal이 함께 생긴다. Resource별 task로 검토하지만 하나의 Ontology proposal에 묶이므로 reviewer 하나를 추가하면 전체 Ontology resource에 적용된다. 각 resource가 요구하는 승인자는 해당 project policy로 결정한다.

권한 없는 사용자의 의견은 승인 상태를 충족하지 않는다. 반대로 승인 권한이 있는 사용자는 reviewer 목록에 없어도 승인할 수 있다. 목록은 검토 담당을 추적하는 수단이지 접근 통제가 아니다.

Preview status의 indexed는 branch data를 테스트할 수 있다는 뜻이다. 테스트 성공이나 승인 완료를 자동 의미하지 않는다. Indexing 자체도 resource 수정이므로 보호 정책의 승인 대상이다. 이를 제거해 병합 대상에서 뺄 수 있지만 테스트하지 않은 변경을 숨기는 방식으로 사용하면 안 된다.

Title/description은 Ontology 접근자에게 발견될 수 있다. 개별 변경 내용은 resource Viewer 권한으로 통제한다. 민감한 내용을 proposal 제목에 넣기 전에 노출 범위를 확인한다.

## Legacy 자료의 경계

복구한 한국어 ontologies-proposals는 AIP가 번역한 미검증 과거 문서다. Ontology roles에서는 Viewer가 branch에서 변경을 제안할 수 있다는 설명과 datasource-derived에서는 Editor/Owner가 필요하다는 설명을 구분한다. 현재 project 기반 권한에 그대로 적용하지 않는다.

Legacy 안내는 승인된 proposal을 branch 편집자가 merge한다고 쓰지만 현재 review 안내는 legacy branch를 볼 수 있는 사용자도 필요한 승인을 얻으면 merge할 수 있다고 쓴다. 이 차이는 문서 충돌로 남기고 실제 enrollment에서 권한을 확인한다. Legacy proposal은 닫으면 다시 열 수 없고 자동 revert도 지원하지 않는다고 설명한다.

현재 방식의 최종 병합은 Global Branching proposal에서 수행한다. 필요한 승인, merge check와 rebase 상태를 함께 확인한다.

## 출처

- [Palantir, branching-ontology](https://www.palantir.com/docs/foundry/ontologies/branching-ontology)
- [Palantir, indexing-on-branch](https://www.palantir.com/docs/foundry/ontologies/indexing-on-branch)
- [Palantir, ontologies-proposals (한국어)](https://palantir.com/docs/kr/foundry/ontologies/ontologies-proposals/)
- [Palantir, ontology-branches-legacy](https://www.palantir.com/docs/foundry/ontologies/ontology-branches-legacy)
- [Palantir, review-ontology-proposals](https://www.palantir.com/docs/foundry/ontologies/review-ontology-proposals)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
