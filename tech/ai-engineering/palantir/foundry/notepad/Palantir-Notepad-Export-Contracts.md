---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# PDF/DOCX rendering과 출력 손실의 경계

Notepad의 화면과 PDF/DOCX는 다른 artifact다. File Export는 background rendering 뒤 다운로드하며 chart계산이 길면 render timeout으로 미완성 chart가 생길 수 있다. Open in print mode에서 모든 chart가 로드될 때까지 기다린 뒤 browser print로 출력하는 대안을 쓴다.

## 페이지와 widget

Letter가 기본이고 Legal/Tabloid/A3/A4/A5를 고를 수 있다. portrait/landscape,header/footer와 pagebreak를 정한다. header/footer는 print/export때 보인다. browser print의 page size/orientation과 default margin도 문서설정에 맞춘다.

wide widget은 zoom으로 축소하고 공간이 부족할 때 새 page로 보내는 option을 조정한다. scrollbar auto-expand는 Contour table과 Quiver object/pivot table만 지원하므로 모든 스크롤 content가 자동 출력된다고 보지 않는다.

## DOCX Beta

style/layout 보존을 보장하지 않는다. text/image/table/column에 다른 scaling factor를 적용하고 이미지는 aspect ratio를 유지하며 page폭에 맞춘다. Word16highlight color에 가까운 색으로 대체한다.

nested table은 제외하고 table cell안 column은 세로배치한다. checklist는 checkbox 없는 bullet로,깊은 list는9단계까지 변환한다. placeholder는 제외한다. 지원 widget만 static PNG로 내보내 interaction을 잃고 unsupported widget은 export하지 않는다.

지원목록은 Clip,CodeWorkbook/Contour chart,Compass file reference,image,ObjectCard/media/property,pagebreak,Quiver chart/dashboard,SolutionDesigner,Table,Vertex와 Map이다. DOCX 생성 성공을 전체 content/format 보존으로 판단하지 말고 결과를 확인한다. envelope document는 custom banner가 아닌 file-markings banner를 사용한다.

## 출처

- [Palantir, export](https://www.palantir.com/docs/foundry/notepad/export)
- [Palantir, export-pdf](https://www.palantir.com/docs/foundry/notepad/export-pdf)

## 관련 문서

- [[Palantir-Notepad-Security-and-Snapshots]]
- [[Palantir-Notepad-Analytics-Widgets]]
- [[Palantir-Notepad-Workshop-and-Packaging]]
