---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 Workflow Lineage와 Autopilot의 가시성 한계

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Graph와 실제 사용 관계

- 2월 multi-Ontology graph는 외부 Ontology object/interface/action을 회색/warning으로 표시하고 현재 Ontology를 바꿀 수 있게 했다. **일괄 Function-backed Action 변경은 선택 Ontology에만** 가능했다.
- 3월 SDK node는 TS2/Python Function의 SDK 등록 resource와 의존을 연결했다. Function이 등록 resource를 모두 사용하는 것은 아니므로 SDK edge는 실제 사용의 과잉 근사일 수 있다.
- 4월 auto expansion은 약 800 node로 제한하고 수동 확장은 계속 허용했다. 안 보이는 node가 없다고 모든 의존성이 없다는 뜻은 아니다.
- 5월 Logic Function model 일괄 교체는 다른 resource까지 지원하는 기능이 아니었다. 6월 Function/version/criteria/replace/delete는 Main/새 branch/선택 branch 경로를 제공하며 기존 Ontology proposal 흐름을 대체했다.
- property detail의 backing datasource, Function Ontology binding, interface 상속/link constraint, lifecycle status와 custom widget/Workbench/Map node는 서로 다른 관계를 보여준다.
- presentation frame은 저장 graph의 layout/color/zoom snapshot이다. 4월 frame reorder는 branch에서 미지원이었다. autosave conflict의 abandon은 마지막 수동 저장이 아니라 최신 auto-saved version을 복구하도록 수정됐다.
- 2월 Notepad shortcut 공지와 3월 navigation-only 지원 표는 상충한다. 실제 앱/version의 진입점을 확인한다.

## Autopilot에서 추적하려면

3월 beta Autopilot는 dependency graph, fallback/object path, Kanban와 liveness를 통합했다. object history/path에는 **edit history 활성화가 필요**하고 project-scoped mode는 workbench 사용자의 execution/dependency 가시성을 Project 범위로 넓힌다.

6월 Automation events가 Object executions 탭을 대체했다. event는 automation/effect/fallback, 성공/실패/fallback outcome과 triggering object를 보이고 Automate batch와 맞춰 object별 trace/stack/time를 확인한다. 5월 Go to Logic run은 execution metadata가 있는 Logic span에만 나타났다.

Workbench의 custom card property와 graph color, shortcut은 진단을 돕는다. 관찰 화면만으로 모든 사용자가 모든 실행 로그를 볼 수 있거나 전체 workflow가 한 transaction으로 실행된다고 추정하지 않는다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [March 19, 2026, Visualize, monitor, and debug your automation workflows with Autopilot — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#3fde1671-9d08-47fa-ba2a-60037c825256)
- [May 12, 2026, Workflow Lineage now supports Global Branching — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#468f16b5-a6ed-4f1f-b8b2-9201b943c3d6)
- [March 3, 2026, Expanded Workflow Lineage access across the platform — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#36b68738-ce11-4a32-9786-15673f714ceb)
- [February 10, 2026, Presentation mode in Workflow Lineage — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#84ffb8c3-fb6c-4c2c-b6ee-c3d350412d77)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
