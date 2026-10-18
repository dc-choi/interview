---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 개발 환경, OAuth와 외부 source의 전환

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 편집기 전환의 실제 범위

3월 Function repo의 VS Code Workspaces는 live preview, resource import/SDK generation과 tag/release를 제공하고 6월 Code Repositories legacy 전환을 예상했다. 6월 23일 실제 공지는 **Python transforms editing**을 legacy로 지정했지만 계속 지원/제공했다. Java/SQL은 Code Repositories 권장이고 VS Code가 없는 enrollment의 Python 편집도 예외로 남았다. 예상 일정을 전체 repo editor 삭제로 해석하지 않는다.

4월 VS Code는 transform template의 IO/source 구성, automatic commit message를 추가했다. 수동 편집을 존중하고 branch switch/commit/빈 입력 10초 후 자동 생성을 재개한다. 5월 External Systems/egress/credential은 Settings로 이동했고 Cipher input preview가 extension 0.791에 추가됐다.

## Developer Console scope와 permission

- 2월 unscoped 앱을 선택할 수 있게 됐지만 새 앱은 scoped 기본이다. 기존 standalone OAuth client는 deprecated이며 5월 migration은 location/max classification/사용자 권한을 검토하고 기존 client workflow를 유지했다.
- 2월 문서는 Control Panel Third party applications의 client project/marking restriction이 Developer Console 앱과 호환되지 않아 그곳은 unrestricted로 두고 Developer Console에서 제한하라고 설명했다. marking scope는 4월 모든 앱으로 확대됐다. 한쪽 제한만 해제하고 새 scope를 빠뜨리지 않는다.
- 2월 Compass-managed permission은 새 앱의 Project/folder role/Org/marking 상속을 제공하고 기존 앱은 migration 대상이다. CBAC는 처음 향후 범위였지만 4월 지원 기록이 나왔다.
- 3월 다른 Org/namespace의 Ontology를 앱에 추가할 수 있게 됐다. 선택 허용이 그 Ontology의 실제 사용자/resource 권한 부여를 뜻하지 않는다.
- 5월 @osdk/react GA는 normalized object cache, Action response 기반 invalidation/where 재평가, temporary layer optimistic update와 실패 rollback, 동일 query request/cache deduplication을 제공했다. experimental import는 deprecated re-export로 남아 단계적으로 옮기되 향후 제거를 대비한다.

## 연결 설정

4월 wildcard domain egress와 6월 Snowflake external IdP OAuth client credentials(token URL/client ID/secret/scope/user claim)가 추가됐다. VMF/TAK hostname 검증과 edge Control Panel의 Data Connection 관리는 각각 대상 환경이 다르다. Source terminal 진단과 문서의 required/recommended driver property를 함께 확인한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 10, 2026, Create unscoped Developer Console applications — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#5c03c30d-a211-4245-9f12-b392a7ca1f83)
- [May 26, 2026, Migrate standalone OAuth clients into full Developer Console applications — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#08e9572c-4775-4c01-843b-c49bff664931)
- [February 26, 2026, Compass-managed permissions for Developer Console applications — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#56add96f-035d-451d-8041-57f99b83b8b4)
- [May 12, 2026, Develop OSDK React applications using Palantir's @osdk/react library — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#bc05a1b7-6a19-4f17-905b-f641041d5e16)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
- [[Palantir-OSDK]]
- [[Palantir-Connectors]]
