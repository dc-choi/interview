---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Chart embed의 filter, version과 표시 상태

embed는 source resource,선택 state,version과 data freshness를 함께 고정하거나 갱신한다. Notepad가 모든 source app의 편집 화면을 제공하는 것은 아니며 Workshop/Slate view를 Notepad안에 embed하는 기능은 지원하지 않는다.

|Widget|입력과 보존 범위|
|---|---|
|Code Workbook chart|visualization을 가진 board만 선택한다.|
|Contour chart|analysis path/board와 optional parameter override. 문서를 열 때 data를 갱신한다. template input은 type을 맞추고 array parameter는 JSON mode를 쓴다.|
|Quiver chart|Copy for Notepad는 filter state를 캡처하고 이후 analysis/chart selector를 수정하지 못한다. insertion menu는 filter를 캡처하지 않고 selector를 바꿀 수 있다. auto-update Function/chart도 copy시 최신 version으로 pin된다.|
|Quiver dashboard|published dashboard version 또는 auto-update를 선택하고 input을 template에 mapping한다. chart template화는 dashboard 경로를 쓴다.|
|Map|map/template과 static 또는 template parameter를 받는다. browser resource 제약으로 문서당4개까지다.|
|Solution Designer diagram|source diagram을 표시만 하며 편집은 원래 app에서 한다.|
|Vertex graph|read-only지만 select/pan/zoom/PNG export/Open in Vertex를 제공한다. PDF export에는 pan/zoom/selection state가 보존되지 않는다.|

## Parameter encoding

Contour form mode는 matching scalar template input을 받고 multi-value array는 JSON string override로 전달한다. JSON에 date는 ISO timestamp string을 쓴다. original default parameter는 override가 없을 때 적용된다.

Quiver dashboard Boolean은 Notepad String,Time은 Timestamp,Time Range는 ISO-format - ISO-format String,String List는 JSON array String으로 mapping한다. Number/String/Object/ObjectSet은 같은 type이고 Time Series input은 지원하지 않는다.

lock 지원/retention,인쇄 height와 static export는 각 widget별 조건이다. 화면에서 보이는 interaction 상태와 export에 담긴 결과를 따로 확인한다.

## 출처

- [Palantir, widgets-code-workbook-chart](https://www.palantir.com/docs/foundry/notepad/widgets-code-workbook-chart)
- [Palantir, widgets-contour-chart](https://www.palantir.com/docs/foundry/notepad/widgets-contour-chart)
- [Palantir, widgets-quiver-chart](https://www.palantir.com/docs/foundry/notepad/widgets-quiver-chart)
- [Palantir, widgets-quiver-dashboard](https://www.palantir.com/docs/foundry/notepad/widgets-quiver-dashboard)
- [Palantir, widgets-map](https://www.palantir.com/docs/foundry/notepad/widgets-map)
- [Palantir, widgets-solution-designer-diagram](https://www.palantir.com/docs/foundry/notepad/widgets-solution-designer-diagram)
- [Palantir, widgets-vertex-graph](https://www.palantir.com/docs/foundry/notepad/widgets-vertex-graph)

## 관련 문서

- [[Palantir-Notepad-Security-and-Snapshots]]
- [[Palantir-Notepad-Export-Contracts]]
- [[Palantir-Foundry-Analytics]]
