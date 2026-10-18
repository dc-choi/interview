---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 Global Branch의 승인과 수명주기

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Rename, GA와 지원 수준

3월 Foundry Branching→Global Branching 변경은 이름만 바꿨다. 5월 18일 주 GA는 transforms/TypeScript 1 repository, Pipeline Builder, Ontology, Workshop, Logic와 Object Views를 지원했다. Restricted Views/Automate는 beta이며 approval integration와 resource Remove가 부족했고 OSDK/TS2/Python Function/Developer Console 확대는 향후 범위였다.

3월 branch owner 위임과 Space admin 관리 권한이 소개됐다. 5월 GA 뒤에는 **proposal을 볼 수 있는 사용자도 checks와 resource approval을 통과하면 merge**할 수 있게 바뀌었다. branch owner의 Do not merge 설정, resource edit 권한과 reviewer 정책은 계속 필요하다. branch visibility의 Org membership과 resource permission은 별개다.

- Remove resource는 Main 상태로 reset하며 resource 삭제와 다르다.
- Project owner는 reviewer 자격/승인 수/self-approval을 설정하고 repo/Pipeline Builder는 resource 자체의 policy를 사용한다.
- 5월 Workflow Lineage와 Data Lineage가 branch-aware graph/search/details/color를 확대했다. Data Lineage saved graph는 branch context를 기억하지만 **graph 자체는 branched resource가 아니므로 Main에 merge하지 않는다**.
- 6월 local/Workspace VS Code의 Python transforms와 TS1 개발 도구는 checkout된 global branch의 preview/build/Function을 사용한다.
- 6월 Pipeline Builder conflict resolution의 discard base changes는 충돌하지 않는 base 변경까지 버리고 head만 유지할 수 있다. 단순 conflict 선택으로 해석하지 않는다.

## 6월의 lifecycle 변경

Active/inactive/merged/archived 네 상태로 구분하고 기존 closed를 archived로 바꿨다. inactivity 후 자동 close 대신 inactive가 되며 archive는 수동이다. inactive/archived branch는 Ontology de-index, build 즉시 실패와 일정 후 데이터 삭제가 적용된다.

기본 inactivity는 35일, branch-only data 삭제는 7일이며 Control Panel에서 조정한다. metadata/logic 보존과 데이터 보존은 다르다. release 이후 archive한 branch는 restore할 수 있고 inactive는 reactivate한다. archived branch는 selector에 안 보이지만 Global Branching 앱에서 복원한다.

4월 Iceberg branch isolation은 schema/partition spec/sort order를 독립 추적한다. Foundry build는 자동 적용하고 외부 client는 X-PLTR-Branch header로 opt-in한다. branch 지원 여부를 API/storage/UI별로 확인한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [May 5, 2026, Global Branching is generally available May 18 — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#15e8146e-3291-4bbb-8194-555d3f10fa90)
- [June 23, 2026, Introducing new lifecycle features for Global Branches — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#f8f81c59-9285-478f-ae91-57ec4f888b82)
- [March 17, 2026, Share control of your branches with role-based security — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#3b6a120b-1bdc-4ab3-aeaa-aac5ac1ff816)
- [June 23, 2026, Develop on global branches in VS Code workspaces — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#acbe203a-e3a0-4ad5-a0f6-e79eebf01868)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
