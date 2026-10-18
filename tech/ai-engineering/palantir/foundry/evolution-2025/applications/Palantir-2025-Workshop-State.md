---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Workshop 상태, 변수와 branch 동작

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 값의 준비와 상태 전파

- 1월 Function struct input 선택은 required field를 모두 가진 변수만 노출하도록 바뀌었다. null struct field extraction과 struct array Function/property output도 확대됐다.
- 1월 filter value extraction은 filter가 바뀌면 기본 filter 구성에서 사용한 변수들을 역으로 업데이트한다. 양방향 바인딩으로 인한 재계산을 시험해야 한다.
- 3월 아직 loading인 값을 Set variable value로 복사하면 target도 loading에 고정될 수 있어 edit-mode warning을 추가했다. 준비 완료 후 이벤트를 실행하도록 순서를 구성한다.
- 3월 branch auto-refresh는 branch에 indexed된 object data의 갱신을 따르게 됐다. Main 화면 갱신과 branch 격리를 혼동하지 않는다.
- 3월 object set upstream filter/시작 set을 바꿔도 downstream traversal/filter를 유지하고 object-backed link traversal을 허용했다.
- 5월 optional Function parameter, primitive array loop, 7월 struct array loop가 추가됐다. struct array loop는 non-Ontology 데이터를 배치로 표현해 N+1을 줄이는 용도였다.
- 8월 array subset/length/index update/cast/concat, embedded module schema 자동 구성, ObjectList PK array 수동 정렬이 추가됐다. 목록에 없는 PK는 별도 비정렬 상태로 남을 수 있다.
- 7월 Last updated freshness는 upstream source 시간이 아니라 마지막 **index** 시각이었다.

## Application boundary

- 4월 Agent 변수 update tool/deterministic output, 7월 모든 agent session widget, 10월 object set 기반 custom widget 확장이 module 상태 연결을 확대했다.
- 8월 custom widgets GA 예고는 iframe의 standalone subdomain/full-page/CSP와 구분되는 격리 rendering/CLI/dev-mode 경로였다. object set parameter와 Marketplace는 후속 확대였고 11월/12월에 지원이 추가됐다.
- 11월 custom widget set packaging은 Workshop 자동 포함과 수동 packaging을 나눴다. 설치 후 Ontology API access가 기본 비활성화라 수동 enable이 필요했다.
- 12월 custom widget은 ObjectSet RID와 OSDK instance를 받을 수 있게 됐다. 기존 version의 iframe message 계약과 합치지 않는다.
- module interface 전달 current value, dialog scroll containment, loop layout의 보일 때까지 지연 계산과 visualization은 실제 UI 동작에 영향을 준다. 모든 숨은 widget을 미리 계산한다고 가정하지 않는다.

## 진단과 UI 정책

2월 GA Performance Profiler는 처음 화면에 영향을 주는 widget/변수만 계산하고 load/reload timeline을 기록했다. 새 layout과 Action/Function/event를 직접 실행해 추가 비용을 관찰한다. 1월 misconfigured widget lint, 10월 Function/Workshop monitor는 각각 저장 오류와 운영 성능을 찾는다.

2월 Kiosk GA는 module에서 직접 접근 가능한 entity로 session scope를 줄이고 Org의 module/launcher allowlist와 session history를 사용했다. 장시간 session이 일반 로그인 권한을 그대로 유지한다는 뜻이 아니다. 외부 allowed URI/scheme는 warning을 생략하는 정책이지 데이터 권한 부여가 아니다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [August 21, 2025, New array variable transform operations are available in Workshop — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#ceb816eb-d998-45f0-85aa-eff165d8df72)
- [August 21, 2025, Extend Workshop module development with custom widgets — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f2d2e5e2-bff3-4ae3-a931-008f4030b7d8)
- [July 31, 2025, Looping over array of structs and embedded module creation from loop layout configuration in Workshop — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#c8c2d73f-30c7-4467-9dac-c9a80999eaa8)
- [February 18, 2025, Diagnose and troubleshoot Workshop application performance with Performance Profiler — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#801aa8ae-e194-4246-bb95-c36de8a7e700)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
