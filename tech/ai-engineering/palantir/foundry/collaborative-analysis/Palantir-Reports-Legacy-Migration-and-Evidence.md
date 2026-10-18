---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Legacy Reports 전환과 근거 보존"]
---

# Legacy Reports 전환과 근거 보존

## 현재 상태와 과거 안내

2026-10-16 확인한 Reports 개요는 sunset, 기존 report read-only 가용성을 명시한다. 여러 하위 페이지의 편집/생성 안내는 이전 기능 설명으로 보존하며 현재 새 편집을 보장하는 방법으로 제시하지 않는다. 읽기만 하는 기존 report는 반드시 전환할 필요가 없고, 편집이 필요하면 대체 app을 고려한다.

Contour 중심과 parameter/상호작용은 Contour dashboard, Quiver 중심은 Quiver dashboard, 여러 앱의 live/static 문서는 Notepad라는 이관 기준이 제시된다. Legacy report를 Contour/Notepad로 변환해도 원본은 삭제되지 않고 여러 번 변환할 수 있다. Designated replacement는 원본 banner가 가리키는 권위 있는 전환본이며 자동 원본 삭제/완전한 데이터 이동을 뜻하지 않는다.

Contour가 지원하지 않는 Quiver/Code Workbook/Object View embed는 변환 시 원본 resource로의 link가 될 수 있다. 위젯 수가 같거나 변환 성공이라는 이유만으로 렌더링/상호작용 동등성을 단정하지 않는다. 전환본의 권한과 데이터시점을 별도로 확인한다.

## 리소스 접근과 내용의 복제

Report 공유는 underlying dataset/file/image 접근을 부여하지 않는다. View mode로 전환한 자신의 화면은 다른 사용자의 권한으로 시험한 결과가 아니다. Code Workbook embed는 viewer가 editor가 이미 계산한 input/parameter 조합만 볼 수 있다는 이전 제한도 있다. 읽기 위해 무조건 edit 권한을 넓히는 권고로 적용하지 않는다.

과거 media 직접 upload는 report에 bundle되고 file directory에 별도 resource로 나타나지 않는 방식이었다. 기존 resource link와 별도 file 생성 후 link는 다른 복제/권한 경계를 갖는다. Quiver embed는 v1 time-series chart만 지원하는 이전 계약이다.

## Export는 원본 전체가 아니다

Markdown copy는 text와 수동 Table widget만 포함한다. CSV board data, PDF/PPT 시각 결과와 source analysis는 각각 다른 산출물이다. PDF/PPT에서 Contour table은 최대1,000행과 전체 column을 표시하려 해 여러 페이지가 될 수 있으며 preview가 필요하다. Export 성공을 전체 dataset 보존의 근거로 삼지 않는다.

일반 표 widget은 data-backed table과 달라 수동 입력이며 단일 header, cell 한줄, row-height 조절 제한이 있었다. 과거 row당 최대6 widget, width/height 설정과 widget 잠금 협업도 읽기 전용 전환 이후의 현재 편집 가능성을 증명하지 않는다. 실제 변환/export를 수행하지 않았다.

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
