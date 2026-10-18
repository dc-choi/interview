---
tags: [palantir, foundry, security, policy, migration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 보안 관리와 이전 계약"]
---

# Foundry 보안 관리와 이전 계약

권한 구성은 사람의 membership, role operation, resource requirement와 policy 데이터의 계약을 함께 바꾼다. 기존 사용자를 새 marking에 넣으면 현재 Project 밖의 데이터 eligibility도 늘어날 수 있으므로 local 변경처럼 취급하지 않는다.

## 권한의 책임 분리

Marking의 manage/apply/remove/member 권한은 별도다. Apply나 manage를 가진 사람이 member라는 뜻은 아니다. 적용에는 marking의 Apply와 resource Update Markings가, 제거에는 Apply/Remove와 resource 변경 권한이 필요하다. Org requirement는 Apply organization과 Expand access라는 별도 권한으로 관리한다.

Marking/category는 생성 뒤 삭제할 수 없으며 marking은 다른 category로 옮길 수 없다고 명시한다. Visible/hidden category의 discovery와 membership을 구분한다. Category 내 한 marking 접근/관리 권한이 있으면 category의 다른 marking 존재도 보일 수 있다. API의 명시적 category-viewer 목록만으로 전체 발견 가능 대상을 계산하지 않는다.

## Transaction과 상속 변경

직접 적용한 marking을 제거하면 downstream requirement도 즉시 제거되며 rebuild가 필요하지 않다고 설명한다. 반대로 transform의 inherited marking 제거는 protected branch의 security approval 설정과 merge, output/downstream rebuild를 요구한다. 작업 branch preview에서는 제거가 아직 발효되지 않을 수 있다.

APPEND/UPDATE의 latest view는 예전 transaction 의존성을 포함할 수 있다. SNAPSHOT 예시처럼 최신 transform만 고쳐 모든 과거 marking이 정리되었다고 가정하지 않는다. Lineage simulation과 transaction Compare의 논리/security 변경을 함께 확인한다.

## Granular policy의 데이터 전제

Policy column null은 모든 사용자에게 inaccessible이 될 수 있다. Policy 전용 non-null column, domain invariant와 갑작스러운 hierarchy 변화를 확인하는 data check는 읽기 정확성을 유지하는 수단이다. 이 검증이 read-time policy를 downstream에 전파시키지는 않는다.

Equal/order 비교는 같은 타입의 single value가 필요하고 intersects/subset/superset은 해당 방향에 collection이 있어야 한다. Object security policy는 less/greater 비교를 지원하지 않는다. Policy는 최대 10 comparison, constant-field weight 1, collection-field 1,000, marking condition 3,000이며 합은 10,000 미만이어야 한다.

Group/user/organization 참조는 UUID 기준을 우선 확인한다. Org marking UUID와 `ri.multipass..organization` Org RID는 다르다. 일부 group-name legacy 안내는 realm을 요구하지만 granular-policy/reference 안내는 이름 대신 UUID를 요구해 설명이 상충한다. 이름 기반 정책을 신규 동작으로 보장하지 않는다. Membership NOT 조건은 scoped token에서 부적절한 grant를 만들 수 있다.

Restricted view transaction은 policy history를 남기지만 당시 모든 user attribute/group membership history를 보존하지 못한다. 과거 transaction을 현재 사용자로 열어 얻은 row를 사건 당시의 접근 결과라고 단정하지 않는다. View/build/edit와 object backing 변경 권한도 따로 필요하며 일부 안내는 legacy Ontology admin group 요건을 포함한다.

## Group, 사용자와 만료

Internal group은 Foundry에서, external group은 IdP에서 membership/metadata를 관리한다. External group에 Org가 없으면 모든 Org에 존재가 보일 수 있다. External group을 internal group에 nested하고 직접 사용자 부여를 줄이면 offboarding과 role bundle을 분리하기 쉽다.

Latest expiration과 maximum duration을 함께 쓰면 더 이른 경계가 신규 membership을 제한한다. 만료 7일 전 reminder가 있지만 7일 미만으로 추가된 membership은 reminder가 없을 수 있다. Request form에서 group을 숨기는 것은 membership이나 다른 Project의 요청을 막는 보안 경계가 아니다. 승인된 membership은 그 group의 모든 Project role에 영향을 준다.

Custom membership approval은 access request의 승인 조건이다. 2026-10-16 manage-groups 문서 기준 Beta여서 enrollment에서 제공되지 않을 수 있고 개발 중 기능이 바뀔 수 있다. 공식 설정 화면은 group manager가 추가 승인 조건과 관계없이 member를 직접 추가하거나 제거할 수 있다고 명시한다. 요청에 여러 승인자를 지정해도 관리자 직접 변경까지 같은 절차로 강제하는 것은 아니므로, membership 관리 권한과 변경 감사를 함께 검토한다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/platform-security-management/manage-group-policy.png) 확인)

Group rename은 ID를 유지하면서 이전 이름의 compatibility group을 만드는 동작을 설명한다. 문구의 membership 방향을 추정해 migration하지 않고 실제 group graph를 확인한다. Preregister username은 login username과 정확히 같아야 한다.

30일 successful login이 없으면 inactive가 되어 token이 일시 invalid가 되지만 다시 login하면 token도 re-enable된다고 설명한다. 이를 영구 revoke로 대체하지 않는다. Account deleted/locked/inactive는 서로 다른 상태이며 undelete와 login reactivation도 구분한다.

## Role set, template와 이전

Role set은 Project/Ontology/Marketplace Installation 문맥을 구분하며 role 하나는 한 set에 속한다. Space role set 교체나 role 경계를 넘는 resource 이동은 기존 role→새 role mapping을 요구하고 grant를 갱신한다. Space permission custom role은 frozen이지만 Project default를 복사한 role set은 default update를 자동 수신하는 설명이 있으므로 대상 문맥을 확인한다.

Space filesystem은 생성 뒤 바꿀 수 없다. Usage account 기본값은 Project에서 override할 수 있고 resource queue는 Space Project에 공통 적용된다. Project template는 role/group/marking/constraint 초기값을 만들며 새 marking의 membership이 Project role grant 대상에게 자동 부여되는 점을 검토한다. Folder 구조까지 template가 구성한다고 가정하지 않는다.

Ignore inherited permissions와 Propagate view requirements는 planned deprecation의 legacy 설정이다. 전자는 parent grant를 차단하고 후자는 downstream에 source view requirement를 요구한다. 각각 2024-12/2024-10부터 대부분 enrollment에서 쓸 수 없다는 기준이며 모두에게 완전 제거되었다는 뜻은 아니다.

먼저 적절한 Project/marking과 사용자 eligibility를 구성한 뒤 legacy 기능을 끄는 방식으로 이전한다. 꺼진 설정은 다시 켤 수 없다고 명시한다. 기존 marking 재사용으로 access가 전역 확대되는지와 upstream 원천까지 보호하는지를 확인한다. 이 문서는 실제 이전/권한 변경을 실행하지 않았다.

## 출처

- [Palantir Security Management, platform-security-management](https://www.palantir.com/docs/foundry/platform-security-management)
- [Palantir Security Management, disabling-ignore-inherited-permissions](https://www.palantir.com/docs/foundry/platform-security-management/disabling-ignore-inherited-permissions)
- [Palantir Security Management, disabling-propagate-view-requirements](https://www.palantir.com/docs/foundry/platform-security-management/disabling-propagate-view-requirements)
- [Palantir Security Management, manage-granular-policies](https://www.palantir.com/docs/foundry/platform-security-management/manage-granular-policies)
- [Palantir Security Management, manage-groups](https://www.palantir.com/docs/foundry/platform-security-management/manage-groups)
- [Palantir Security Management, manage-markings](https://www.palantir.com/docs/foundry/platform-security-management/manage-markings)
- [Palantir Security Management, manage-orgs-and-spaces](https://www.palantir.com/docs/foundry/platform-security-management/manage-orgs-and-spaces)
- [Palantir Security Management, manage-project-constraints](https://www.palantir.com/docs/foundry/platform-security-management/manage-project-constraints)
- [Palantir Security Management, manage-project-templates](https://www.palantir.com/docs/foundry/platform-security-management/manage-project-templates)
- [Palantir Security Management, manage-restricted-views](https://www.palantir.com/docs/foundry/platform-security-management/manage-restricted-views)
- [Palantir Security Management, manage-roles](https://www.palantir.com/docs/foundry/platform-security-management/manage-roles)
- [Palantir Security Management, manage-users](https://www.palantir.com/docs/foundry/platform-security-management/manage-users)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation]]
- [[Palantir-Security-Projects-Roles-and-Collaboration]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility]]
