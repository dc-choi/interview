---
tags: [palantir, carbon, workspace, access]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Carbon workspace 구성과 권한"]
---

# Carbon workspace와 접근 경계

Carbon은 업무별 application과 object workflow를 모아 제공하는 curated workspace다. Workspace는 Project의 독립 file resource이며 자체 viewer/editor 권한을 갖는다. Workspace를 볼 수 있다는 사실은 포함한 Workshop, object, dataset과 다른 application 권한을 부여하지 않는다.

## 편집, promotion과 기본 진입점을 나눈다

Resource Editor는 Home/General/Menu/Access 설정을 편집한다. Organization별 Carbon administrator는 promotion과 organization theme/navigation을 관리한다. Control Panel의 User experience administrator 또는 Manage Carbon workspaces workflow로 이 권한을 정할 수 있다.

Link-only는 direct URL/Project에서 열고, promoted는 해당 organization member/guest의 Navigation Menu에 나타난다. 실제 표시에는 workspace viewer 권한도 필요하다. Promotion 설정은 전체 organization에 적용하며 특정 workspace 내부에만 한정되지 않는다. Non-admin editor가 group default를 지정해도 promotion을 대체하지 못한다.

Default workspace는 `/workspace/carbon/` 진입 시 이동할 대상이다. Group default 목록과 promotion을 둘 다 충족해야 한다. Default가 없거나 여러 group에서 겹치면 선택 화면 또는 browser cookie의 최근 workspace를 사용한다. Cookie 삭제/다른 device에서 선택이 달라질 수 있다. Login landing page는 별도로 Control Panel의 home URL(`/carbon` 등)을 설정한다.

Default group 변경과 promoted 목록 수정은 일반 workspace Save와 독립적으로 즉시 반영된다. 일반 configuration Save도 새 version을 즉시 publish한다. 별도 release 대기 상태로 착각하지 않는다. Version history에서 과거 설정 preview/edit/republish를 할 수 있고 unsaved asterisk와 preview tag를 구분한다.

공식 Access 탭 화면은 해당 변경이 즉시 적용되며 workspace history에는 기록되지 않는다고 명시한다. 과거 configuration을 republish했다는 사실만으로 Access 설정까지 복원됐다고 판단하지 않는다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/carbon/configure-workspace-access-tab.png) 확인)

## 화면 구성은 업무 빈도와 상태를 기준으로 한다

Home은 logo/크기, subtitle, search와 세 column의 widget을 설정하거나 module로 대체한다. Card는 thumbnail을 포함할 수 있고 List는 많은 항목에 더 조밀하다. Default module home에서 이전 기본 home으로 복원할 수도 있다. Menu의 anchored module은 상시 tab, new-tab module은 사용자가 열 추가 항목이다.

Default search filter는 사용자가 바꾸거나 제거할 수 있는 UX 설정이다. Object type filter로 data permission을 구현하지 않는다. Theme는 organization 기본을 따르거나 workspace에서 override한다. AIP Assist는 workspace에서 기본 off이며 Enable 설정과 사용자의 configured chatbot 접근 권한을 모두 요구한다.

Carbon notification은 모든 Foundry 알림의 완전한 inbox가 아니다. Menu guide는 announcement, Action, object comment, 공유/access request, approval과 issue를 포함한다. Navigation 제한 상태에서는 표시되더라도 Carbon 밖 target은 누를 수 없을 수 있다.

## Navigation 제한은 authorization을 대체하지 않는다

Navigation out of Carbon을 Disabled로 하면 외부 link, help와 account 이동 같은 Carbon UI를 숨기거나 비활성화한다. 기존 link 설정은 보존되어 다시 enable하면 복구한다. Module 내부 link로 밖으로 나갈 가능성은 남는다.

Dataset Preview/Data Lineage/분석 생성 같은 module 동작은 개별 workspace에서 모두 끌 수 없다. Control Panel Application access에서 사용자/group별 app 접근을 관리하고 underlying resource security를 유지한다. 화면에서 사라진 action을 backend 권한 취소로 읽지 않는다.

## Walkthrough와 packaging은 별도 수명이다

Workspace update/walkthrough는 자체 dialog Save로 저장하며 configuration Save와 독립적이다. 미열람 최신 step이 첫 진입에 표시되고 중단한 내용은 What's New에서 다시 본다. Archive는 복원 가능하지만 permanent delete는 복원되지 않는다. Workspace 자체 deletion도 영구적이다.

Marketplace Carbon packaging은 walkthrough, Workshop/object type/Foundry application link 이외 module, search의 group 설정과 Select objects item을 제한한다. 편집 가능한 workspace라는 사실과 설치 가능한 product 기능을 구분한다. 같은 folder에 workspace와 module을 두면 권한 관리가 단순해지지만 개별 dependency 접근 검증은 계속 필요하다.

## 출처

- [Palantir, Carbon](https://www.palantir.com/docs/foundry/carbon)
- [Palantir, Workspaces](https://www.palantir.com/docs/foundry/carbon/workspaces-overview)
- [Palantir, Create a workspace](https://www.palantir.com/docs/foundry/carbon/workspaces-create)
- [Palantir, Edit a workspace](https://www.palantir.com/docs/foundry/carbon/workspaces-edit)
- [Palantir, Workspace version history](https://www.palantir.com/docs/foundry/carbon/workspaces-history)
- [Palantir, Configure permissions](https://www.palantir.com/docs/foundry/carbon/permissions-configure)
- [Palantir, Set a default workspace](https://www.palantir.com/docs/foundry/carbon/permissions-default-workspace)
- [Palantir, Foundry landing page](https://www.palantir.com/docs/foundry/carbon/permissions-landing-page)
- [Palantir, Access configuration](https://www.palantir.com/docs/foundry/carbon/configuration-access)
- [Palantir, General configuration](https://www.palantir.com/docs/foundry/carbon/configuration-general)
- [Palantir, Home configuration](https://www.palantir.com/docs/foundry/carbon/configuration-home)
- [Palantir, Menu bar configuration](https://www.palantir.com/docs/foundry/carbon/configuration-menu-bar)
- [Palantir, Enable dark mode](https://www.palantir.com/docs/foundry/carbon/dark-mode)
- [Palantir, Navigation between workspaces](https://www.palantir.com/docs/foundry/carbon/workspaces-navigation)
- [Palantir, Restrict navigation](https://www.palantir.com/docs/foundry/carbon/restrict-workspace-nav)
- [Palantir, Workspace updates](https://www.palantir.com/docs/foundry/carbon/workspaces-updates)
- [Palantir, Carbon Marketplace](https://www.palantir.com/docs/foundry/carbon/marketplace-carbon-workspace)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/carbon/getting-started)
- [Palantir, Example workspaces](https://www.palantir.com/docs/foundry/carbon/example-workspaces)

## 관련 문서

- [[Palantir-Carbon-Navigation-and-Parameters|Module 발견과 전달 계약]]
- [[Palantir-Platform-Experience-and-Distribution|Platform experience]]
- [[Palantir-Security-and-Governance|리소스 보안]]
