---
tags: [palantir, foundry, fusion]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Fusion 편집, table region과 template

Fusion formula는 =로 시작하고 string은 single quote를 쓴다. Contour DSL과 spreadsheet 전용 함수가 섞여 있으므로 Excel 문법과의 동일성을 가정하지 않는다. Boolean은 =true/=false이고 IF/OR/NOT 조합을 쓴다. 여러 사용자가 동시에 편집하지만 cell 변경은 Enter 등으로 제출한 뒤 다른 사용자에게 보인다.

Table region은 header/column-name reference와 정형 데이터를 제공하고 row 추가 시 아래 cells를 밀어낸다. **Sort는 view가 아니라 sheet의 실제 rows를 재배열한다.** 끄기로 원순서가 돌아오지 않아 undo가 필요하다. cell lock은 실수 방지이며 누구나 해제할 수 있어 접근 통제가 아니다.

Dropdown/multidropdown은 unique values를 string label로 표시한다. selected label이 source에서 사라지면 기본은 empty cell이다. allow_invalid=true는 이전 선택을 보존하지만 string 결과에만 권장한다. null default는 미선택이며 placeholder로 안내한다. color/tooltip과 conditional format은 표현을 조절하며 Numeric settings는 decimal/thousands separator를 바꾼다. Presentation view와 grid 숨김은 소비 화면의 구성이다.

Template로 표시한 document를 일반 URL로 열면 원본 대신 복사본의 저장 위치를 고른다. master 편집은 Edit template Fusion sheet를 쓴다. /copy?Sheet1!A1=test 형태로 복사 시 cell override를 전달할 수 있다. XLS/XLSX는 drag/drop 또는 New from Excel로 변환한다. 직접 paste는 local memory에 의존하며 보통 수천 row 수준이므로 큰 파일은 XLS import를 쓴다.

## 출처

- [Palantir, boolean-logic](https://www.palantir.com/docs/foundry/fusion/boolean-logic)
- [Palantir, create-templates](https://www.palantir.com/docs/foundry/fusion/create-templates)
- [Palantir, create-use-table-regions](https://www.palantir.com/docs/foundry/fusion/create-use-table-regions)
- [Palantir, dropdowns-locked-cells-links](https://www.palantir.com/docs/foundry/fusion/dropdowns-locked-cells-links)
- [Palantir, format-cells](https://www.palantir.com/docs/foundry/fusion/format-cells)
- [Palantir, formulas-overview](https://www.palantir.com/docs/foundry/fusion/formulas-overview)
- [Palantir, import-xls](https://www.palantir.com/docs/foundry/fusion/import-xls)
- [Palantir, presentation-view](https://www.palantir.com/docs/foundry/fusion/presentation-view)
- [Palantir, sheets-overview](https://www.palantir.com/docs/foundry/fusion/sheets-overview)

## 관련 문서

- [[Palantir-Fusion-Formula-Contracts]]
