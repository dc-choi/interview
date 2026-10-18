---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 Workshop 구성과 custom widget의 권한 경계

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 표시와 입력의 확장

2월 Markdown text input은 rich/raw 편집을 제공하되 **output은 Markdown string**이다. hex/Blueprint/saved background는 밝기에 따라 child widget theme를 바꾸며 section split은 원래 색을 상속한다. metric conditional visibility/color, Pivot fill-width와 TSV clipboard/group 선택, object type filter와 default filter, PDF417, Action parameter visibility/default 설정이 확대됐다.

Function-backed export는 2월 DOCX를 지원하고 6월 실패 원인/Function thrown message를 표시하며 알 수 없는 오류는 fallback한다. 취소는 실패 toast를 띄우지 않도록 바뀌었다. Excel object table export는 4월 user ID 대신 username을 표시했다. export의 PII 범위와 허용 권한을 따로 확인한다.

5월 Property/List/Table security marking pill은 **정보 표시**다. object가 Secret이고 property가 Unclassified여도 object Secret 접근 요건을 없애지 않는다. pill 숨김도 정책 enforcement를 끄지 않는다. Responsive 표시 방식은 Object Table에서 제외되고 Full/Icon 옵션을 나눈다.

## Custom widget와 browser 기능

- 2월 custom widget mobile 지원은 responsive layout 검증이 필요했다. mobile-compatible 검색/filter는 당시 향후 범위였다.
- 3월 preview parameter는 browser tab 세션 안에서 widget version이 달라도 유지됐다. 서버 영구 설정과 다르다.
- camera/microphone/download/popup 등 기본 제한 browser attribute는 developer가 요청하고 **host builder가 수동 opt-in**해야 적용된다. 일부 값은 Checkpoint로 justification을 수집한다.
- module editor는 widget 사용 위치/version update와 screen-reader 개선을 제공했다. 4월 Workflow Lineage custom widget node는 Workshop usage만 보이며 underlying object edge는 초기 release에 없었다.
- 6월 Object View linked component는 빈 link type을 숨기고 loading/error를 구분했다. 2월 Core Object View GA는 prominent media/TS/geo와 표/links를 자동 표현하고 custom view를 만들더라도 core view를 계속 선택할 수 있었다.

더 간결한 UI와 자동 구성은 데이터 접근 허용이나 Action 검증을 대신하지 않는다. browser capability, host opt-in, resource permission와 실제 payload를 각각 시험한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 19, 2026, Core Object Views are now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#d1fc78b9-0d5d-42b9-9c54-1f7f17bf3a34)
- [May 19, 2026, View property security markings in select Workshop widgets  — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#45b8a9a9-f9ee-452e-9c42-a43f6ffe5d1c)
- [February 26, 2026, Custom background colors for Workshop sections and pages — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#5ad95488-281f-4ccd-a8bb-9c78299034c8)
- [February 19, 2026, Markdown editing mode now available in the text input widget — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#908490b7-6463-4087-8f8e-e66ba863c3fd)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
