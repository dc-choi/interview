---
tags: [palantir, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology의 조직 경계와 resource 권한

Ontology는 object/link/action type, interface, shared property와 type group을 담는 resource다. Space와 1:1로 생성되고 같은 조직 경계를 갖는다. Private은 하나의 organization, shared는 여러 organization의 공동 workflow에 사용한다. 같은 조직 안의 여러 팀은 별도 Ontology보다 project의 group role로 권한을 나누는 것이 기본 안내다.

## Shared는 원천 공개를 뜻하지 않는다

Shared space를 만들면 shared Ontology가 생성된다. 적용된 조직의 member/guest에게 resource 접근을 줄 수 있지만 backing dataset의 기존 조직 요구사항이 저절로 없어지지는 않는다. Private project의 dataset을 shared project로 import해도 원래 요구사항이 남으므로 별도의 승인된 inherited marking/organization 제거 절차가 필요하다.

## Schema와 data 접근을 구분한다

현재 project permissioning에서는 Ontology resource를 Compass project에 저장하고 role로 view/edit/manage를 결정한다. 기존 Ontology는 owner의 활성화와 resource migration이 필요하다.

Object type definition의 View는 schema와 연락처 같은 metadata를 볼 권한이다. 실제 object를 보려면 type View와 해당 data 정책이 모두 필요하다. Datasource policy이면 backing source 권한을 확인하고, object/property security policy이면 type에 직접 정의한 정책을 따른다. 따라서 모든 설정에서 backing dataset View가 필수라고 일반화하지 않는다.

Backing datasource가 없는 type은 project에 저장하고 object security policy를 반드시 둔다. Backing datasource가 있는 type은 indexing을 위해 그 datasource를 project에 import해야 한다. Link 편집은 link와 양쪽 object type Edit, Action 편집은 Action과 수정 대상 Ontology resource Edit를 요구한다.

## Marketplace와 분류

Marketplace 설치는 package를 만들 때의 permission model을 따른다. 대상 환경의 새 resource를 project에 저장하도록 강제하는 toggle이 기존 Ontology roles package를 자동 변환하지 않는다. Source가 project permissioning으로 이동한 뒤 다음 upgrade에서 target도 이동한다.

CBAC project의 resource는 project maximum 이하의 file classification이 필요하다. 분류가 없으면 object type materialization이 실패한다. Marketplace product는 file classification을 자체 포함하지 않는다.

- Publish: store보다 높은 분류를 버리게 되면 publisher의 declassify 권한을 검사한다.
- Install: 파일은 target project 분류를 받고 store보다 낮으면 installer의 declassify 권한이 필요하다.
- Upgrade: 기존 file classification과 사용자의 수동 변경을 유지한다.

## Ontology 사이의 이동

Resource 이동은 resource 권한을 바꾸지만 underlying data/input datasource 권한은 바꾸지 않는다. Object edits는 기본적으로 보존한다. 연결된 resource를 함께 선택하지 않으면 migration이 실패한다. Private에서 default Ontology로 이동하는 type은 원래 default에서 생성된 경우에만 허용된다는 제한을 확인한다.

Root와 overview의 본문은 같은 SHA로 확인했다. 이 문서는 권한 계약을 학습한 것이며 실제 계정의 접근 권한을 바꾼 기록이 아니다.

## 출처

- [Palantir, ontologies](https://www.palantir.com/docs/foundry/ontologies)
- [Palantir, ontologies-overview](https://www.palantir.com/docs/foundry/ontologies/ontologies-overview)
- [Palantir, ontology-migration](https://www.palantir.com/docs/foundry/ontologies/ontology-migration)
- [Palantir, ontology-permissions](https://www.palantir.com/docs/foundry/ontologies/ontology-permissions)
- [Palantir, shared-ontologies](https://www.palantir.com/docs/foundry/ontologies/shared-ontologies)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
