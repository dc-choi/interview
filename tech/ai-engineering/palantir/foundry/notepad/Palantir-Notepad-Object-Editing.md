---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Object property와 media의 표시, 편집 계약

Object card는 prominent property를 기본 표시하고 visible property/order를 고른다. Object property는 title이 기본이며 icon/name/hover/ontology formatting/empty placeholder와 link disable을 설정한다. link를 숨겨도 객체 접근권한이 바뀌지는 않는다.

card/property hover의 Action과 inline edit은 Ontology에 쓰는 기능이다. 문서 text 변경과 같은 효과로 취급하지 않는다. 지원되는 property에 Action-backed inline edit을 먼저 구성해야 한다.

## Markdown property editor

CommonMark를 따르지만 image/HTML/link reference와 특정 비직접 nested-list 구조는 제외한다. Allow editing=false이면 inline edit이 있어도 편집하지 못한다. select하면 다른 사용자의 동시 widget편집을 막고 toolbar에서 raw Markdown 또는 rich text를 편집해 save하면 Ontology property를 갱신한다. 이 UI lock을 모든 외부 writer에 대한 transaction lock으로 확대하지 않는다.

## Media preview

media-reference property,attachment,정해진 media-set/dataset URL string 또는 CSP가 허용한 외부 URL을 표시한다. media reference image만 resize하며 다른 media는 resize하지 않는다. dataset transaction URL은 version고정,branch/view URL은 최신 data를 가리킬 수 있어 reproducibility를 구분한다.

document media reference의 print new-page 기본on과 auto-expand height를 설정할 수 있지만 최대15embedded pages만 펼친다. 다른 media type에는 이 print 설정이 제공되지 않는다. 전체문서 export가 성공해도 preview의 모든 문서 page가 포함됐다는 보장은 아니다.

## 출처

- [Palantir, widgets-object-card](https://www.palantir.com/docs/foundry/notepad/widgets-object-card)
- [Palantir, widgets-object-property](https://www.palantir.com/docs/foundry/notepad/widgets-object-property)
- [Palantir, widgets-object-property-markdown-editor](https://www.palantir.com/docs/foundry/notepad/widgets-object-property-markdown-editor)
- [Palantir, widgets-object-image](https://www.palantir.com/docs/foundry/notepad/widgets-object-image)

## 관련 문서

- [[Palantir-Notepad-Security-and-Snapshots]]
- [[Palantir-Notepad-Export-Contracts]]
