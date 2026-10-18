---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Workshop widget의 입력, 표시와 export 경계

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Table과 filter

- 1월 Action table auto-map은 hidden parameter를 제외해 보이지 않는 값을 덮어쓰지 않게 했다. 2월 branch Action table preview와 Action 변경/Undo 설정 보존이 추가됐다.
- 3월 Inline Action의 table/form 기본 layout과 file upload toggle은 Ontology Manager의 Action layout 설정을 아직 자동 반영하지 않았다. row add/remove/upload를 module에서 따로 설정한다.
- Object table은 visible column이 아니어도 sorting property를 표시하고 Boolean/numeric/date/timestamp array별 전용 filter를 제공했다. numeric histogram, date range와 value count의 의미를 구분한다.
- ObjectDropdown은 Allow no selection일 때 외부 selected object set clear를 화면에 반영하도록 수정됐다. hidden property도 builder의 변수 설정에서 선택 가능해졌다.
- Pivot Table은 frozen column과 CSV export 비활성화, viewer resize, aggregation row/column과 header layout/style를 확대했다. 12월 header line 제한 등 표시 개선과 export 정책을 구분한다.

## 표시/입력 구성

- Metric card의 tag 대량 rendering, XY selection/format/loading spinner, tab best-match selection, button color/duplicate, long Markdown wrapping와 vertical scrolling 등의 수정은 기존 구성의 상호작용을 회복했다.
- 7월 Markdown annotation은 highlight/underline/create Action/event를 추가했다. 10월 Notepad widget은 string을 plain/Markdown으로 표시했다.
- Object view widget은 tab manager와 single/set adaptive view, empty state와 direct property 값을 확대했다. 새 interface로의 upgrade가 필요한 기존 widget은 자동 지원으로 간주하지 않는다.
- 9월 geopoint/geoshape string cast, geohash/lat-lon/MGRS 변환이 추가됐다. 표현 변환과 geometry 검증을 구분한다.
- 10월 PDF/이미지/audio annotation와 seek, 11월 loop virtualization은 새 변수를 소비하는 시점과 사용자 interaction event를 함께 시험해야 한다.

## Export와 접근 통제

3월 Pivot CSV export disable, 8월 Function PDF export, custom/media export와 function-backed download는 서로 다른 경로다. 1월 function-backed export checkpoint, 2월 Submit Action checkpoint와 export 정책을 함께 확인한다. UI export button을 숨기는 것과 source/ontology/API download 권한을 회수하는 것은 다르다.

2025년 2월에 실린 Workshop 2024 highlights는 custom iframe widget, module interface, URL routing, loop/kiosk/autosave/rebase, struct variable와 recomputation, calendar/Vega/translation/RTL/audio/action table/OSv2 history 등을 **2024 회고**로 정리한 글이다. 이 항목들을 모두 2025년 신규 출시로 계산하지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [February 4, 2025, Workshop feature highlights from 2024 — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#3ef10aa3-a7b5-4fe7-b2bf-0c9e37a785a6)
- [May 6, 2025, Introducing the new Workshop Map Widget — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#da04d2b2-70b8-40a3-88c3-a0cf36a6b190)
- [January 23, 2025, The Send to AIP Assist event in Workshop now features an AIP Assist Agent selector — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#95cfa6c5-8724-4f93-b5d6-47081ee2b3d3)
- [July 3, 2025, Annotate and tag text in Workshop with the Markdown widget — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#8c995c80-6b2d-4499-aec5-811c1e0d2dcf)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-2025-Workshop-State]]
- [[Palantir-2025-Media]]
