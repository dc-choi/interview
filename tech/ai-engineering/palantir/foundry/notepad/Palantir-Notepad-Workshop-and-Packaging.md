---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Workshop 생성, object link와 Marketplace version

Workshop Embedded Document는 Notepad RID variable을 받아 기본read-only로 보여 주고 Allow Editing으로 제한된 편집을 제공한다. full editor의 모든 operation을 제공하지는 않는다. Linked Documents는 특정 object를 참조한 문서를 나열하며 Active Notepad RID를 선택마다 갱신해 embed/export로 전달할 수 있다.

## 생성과 내보내기

New Notepad Button은 published template version과 matching Workshop input을 받거나 String variable을 plain/Markdown으로 파싱한다. single object input도 object1개가 든 Workshop ObjectSet variable에 연결한다. generation에는 현재 variable값이 쓰이며 preview value는 default가 아니다.

save chooser를 허용하면 default location은 무시된다. default는 생성자의 home이고 default name은 PDF filename에도 쓰인다. template에서 Export generated as PDF만 켜면 기본적으로 Notepad는 저장되지 않아 save location 등이 무시된다. String생성 예외와 Save Notepad from PDF export option을 확인한다.

Created document RID를 Action/event로 object property에 저장할 수 있다. Action parameter에 notepad:notepad_rid type class가 필요하다. PDF다운로드,resource저장과 object-link Action은 서로 다른 사건이다. 기존문서 Export Button은 RID를 받고 filename/PDF-DOCX/button label을 설정한다.

## Command와 App Pairing

Command widget은 app command와 required/optional parameter를 선택해 다른 app의 동작을 실행한다. paired Gaia clip 예제는 Foundry와 Gotham 양쪽 enrollment가 전제다. UI에서 보이는 command가 단순 문서 annotation과 같은 효과는 아니다.

## Marketplace

문서/template을 product output에 추가하고 template version을 고른다. Quiver dashboard/Function 등 참조resource도 함께 package하고 같은 resource를 참조한 widget은 version을 맞춘다. 지원widget은 native link/list/table/image/LaTeX/mention/date/pagebreak,value/conditional/functions,object card/media/property와 generators/Quiver dashboard다. 일반 embed전체나 envelope document를 package할 수 있다고 가정하지 않는다.

## 출처

- [Palantir, workshop-embed](https://www.palantir.com/docs/foundry/notepad/workshop-embed)
- [Palantir, workshop-export](https://www.palantir.com/docs/foundry/notepad/workshop-export)
- [Palantir, workshop-objects](https://www.palantir.com/docs/foundry/notepad/workshop-objects)
- [Palantir, workshop-templates](https://www.palantir.com/docs/foundry/notepad/workshop-templates)
- [Palantir, widgets-command](https://www.palantir.com/docs/foundry/notepad/widgets-command)
- [Palantir, marketplace-notepad](https://www.palantir.com/docs/foundry/notepad/marketplace-notepad)

## 관련 문서

- [[Palantir-Notepad-Template-Generation]]
- [[Palantir-Notepad-Export-Contracts]]
- [[Palantir-Notepad-Security-and-Snapshots]]
