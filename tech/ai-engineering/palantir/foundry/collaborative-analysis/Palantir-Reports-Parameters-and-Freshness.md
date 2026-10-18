---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Legacy Reports parameter와 최신성"]
---

# Legacy Reports parameter와 최신성

## 값의 적용과 연결

과거 Reports parameter는 number/string/date를 지원하고 date의 주 시작은 일요일로 설명된다. Edit default 변경은 current value를 덮어쓰며 View의 current value는 보통 재오픈 시 default로 돌아간다. URL에 보존된 값은 재로딩과 공유 시 적용되므로 URL parameter가 남아 있는지를 확인한다.

View에서 여러 값을 바꾼 뒤 Apply를 눌러 reload하는 것은 비용이 큰 재계산을 입력마다 반복하지 않으려는 계약이다. Text inline/title prefix는 edit 시 이름, view/export 시 값을 표시한다. Title은 string prefix만 지원했고 임의 중간 삽입은 아니었다.

Parameter A를 B로 merge하면 A가 숨겨지고 A를 쓰던 widget이 B를 사용한다. Unmerge는 마지막 하나만이 아니라 연결된 모든 parameter를 되돌린다. 이름만 비슷한 두 parameter를 합칠 때 의미/타입/단위가 같은지 확인해야 한다.

## 제안값과 유효값

Suggested values는 String/Number에만 제공하고 Date에는 제공하지 않는다. Source는 report의 data-backed widget이 참조하는 upstream column 또는 수동 목록이다. Stats의 cardinality 한계와 갱신 지연으로 목록이 불완전할 수 있고 목록 밖의 값을 직접 입력할 수 있다. 따라서 dropdown에 없다는 사실이 원본 값 부재나 invalid를 증명하지 않는다.

Restricted View와 Row-level Policy Service dataset은 column-linked suggestion을 지원하지 않는다고 명시되어 수동 값과 구분된다. Stats 계산을 다시 했다는 사실이 해당 사용자의 실제 조회 범위를 보장하지 않는다.

## 데이터시점과 경고

Live report는 열 때 최신 resource data/logic를 읽는 기본 동작이고 Contour의 refresh-on-open도 필요했다. Report가 열린 중 upstream이 바뀌면 widget별 out-of-date 경고와 수동 갱신 경로가 있었다.

자동 refresh 끄기와 out-of-date 경고 숨기기는 서로 다른 설정이다. 경고를 숨겨도 데이터가 최신이 되지 않으며, refresh를 껐어도 수동 widget update는 가능하다. Static report라는 설명을 모든 외부 참조의 불변 snapshot 보장으로 확대하지 않는다. 현재 read-only legacy와 이전 편집 설명의 수명 차이를 유지하며 실제 기존 report를 조작하지 않았다.

## 출처

- [Palantir reports, reports](https://www.palantir.com/docs/foundry/reports)
- [Palantir reports, add-content](https://www.palantir.com/docs/foundry/reports/add-content)
- [Palantir reports, add-content-from-other-apps](https://www.palantir.com/docs/foundry/reports/add-content-from-other-apps)
- [Palantir reports, add-parameter](https://www.palantir.com/docs/foundry/reports/add-parameter)
- [Palantir reports, change-parameter](https://www.palantir.com/docs/foundry/reports/change-parameter)
- [Palantir reports, change-title](https://www.palantir.com/docs/foundry/reports/change-title)
- [Palantir reports, change-width-and-height](https://www.palantir.com/docs/foundry/reports/change-width-and-height)
- [Palantir reports, collaborate](https://www.palantir.com/docs/foundry/reports/collaborate)
- [Palantir reports, copy-as-markdown](https://www.palantir.com/docs/foundry/reports/copy-as-markdown)
- [Palantir reports, duplicate-report](https://www.palantir.com/docs/foundry/reports/duplicate-report)
- [Palantir reports, export-board-to-csv](https://www.palantir.com/docs/foundry/reports/export-board-to-csv)
- [Palantir reports, export-to-pdf-ppt](https://www.palantir.com/docs/foundry/reports/export-to-pdf-ppt)
- [Palantir reports, merge-multiple-parameters](https://www.palantir.com/docs/foundry/reports/merge-multiple-parameters)
- [Palantir reports, overview](https://www.palantir.com/docs/foundry/reports/overview)
- [Palantir reports, parameters-overview](https://www.palantir.com/docs/foundry/reports/parameters-overview)
- [Palantir reports, reorder-widgets](https://www.palantir.com/docs/foundry/reports/reorder-widgets)
- [Palantir reports, report-conversion](https://www.palantir.com/docs/foundry/reports/report-conversion)
- [Palantir reports, share](https://www.palantir.com/docs/foundry/reports/share)
- [Palantir reports, show-and-hide-content](https://www.palantir.com/docs/foundry/reports/show-and-hide-content)
- [Palantir reports, show-suggested-values](https://www.palantir.com/docs/foundry/reports/show-suggested-values)
- [Palantir reports, update-data-automatically](https://www.palantir.com/docs/foundry/reports/update-data-automatically)
- [Palantir reports, use-a-parameter-as-widget-title-prefix](https://www.palantir.com/docs/foundry/reports/use-a-parameter-as-widget-title-prefix)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
