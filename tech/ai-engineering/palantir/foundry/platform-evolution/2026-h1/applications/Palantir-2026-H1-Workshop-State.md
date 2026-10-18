---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 Workshop 변수, 캐시와 사용량의 관측 단위

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 상태의 계산과 변경

- 4월 edit mode도 view mode처럼 visible widget/layout 또는 current-value preview에 필요한 변수만 lazy evaluate하게 됐다.
- 6월 Variable Lineage GA는 variable/widget의 read/write dependency를 한 node씩 확장하고 computation time, 사용 page/overlay와 undo/redo를 보여준다. legend는 **현재 보이는 node**만 포함한다.
- 서로 다른 input object set의 Table/List/Dropdown/Selector가 output selection 변수를 공유하면 다른 widget의 선택을 지우거나 깨뜨릴 수 있어 4월 lint가 추가됐다.
- 4월 branch/rebase/edit-view 전환 때 stale module을 보이는 문제와 Carbon tab 간 object-set filter 전달이 수정됐다. 실제 module version과 data freshness를 따로 확인한다.
- 5월 default saved state는 URL에 explicit state가 없을 때만 적용하고 삭제하면 default도 해제한다.
- 6월 variable rename은 대소문자 무시 중복 시 숫자 suffix, 빈 이름은 이전 값 복구로 save 실패를 예방한다. object set 자동 이름과 ID 검색, active-page/widget별 partition은 발견 기능이다.
- 6월 string Length/Substring은 static/reference/variable 입력과 optional end index를 받는다. locale numeric grouping으로 NaN이 되는 오류, trailing newline preview, struct/array wrapping 수정은 실제 값과 표시를 구분해 검증한다.

## 앱 사용량과 사람의 식별

3월 Metrics는 **집계 수이며 특정 사용자에 귀속하지 않는다**. successful Action submission은 기본 수집하고 layout/page/tab/overlay view는 granular metrics opt-in, 최대 24시간 지연이며 **Main branch의 view mode만** 기록한다. 7/30/90일과 이전 동일 기간을 비교한다.

4월 Workflow Lineage는 선택 Workshop 모듈의 4주 total view/unique user를 집계했다. 이 집계를 edit/branch 활동까지 포함하는 전체 사용 이력으로 확대하지 않는다. UI의 layout view와 Action 성공, Ontology index 갱신은 서로 다른 사건이다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [June 1, 2026, Visualize Workshop modules with the new variable lineage graph — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#38f7ae8e-897b-4bbb-99eb-b882f2f91217)
- [March 5, 2026, Track your Workshop applications with usage metrics — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#e269f2e2-ed06-45f8-b480-de2a31030aea)
- [June 17, 2026, Workshop enforces unique variable names on rename — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#e4952f1c64b869fcb6e71380c589e2352d4b0a8564270d78b910054d425eafa0)
- [June 15, 2026, String length and substring operations in string transformation variables — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#32de848f14e404b3be8aa05e7dfd00f43abb34450aeca549388e1f268187107e)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
