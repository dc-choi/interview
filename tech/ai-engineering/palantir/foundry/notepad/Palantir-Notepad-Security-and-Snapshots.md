---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Notepad envelope security와 Lock data의 경계

일반 Notepad는 동적으로 읽는 content를 viewer의 marking membership에 따라 필터링한다. CBAC enrollment에서 제공되는 Beta envelope security는 문서 자체의 file classification/markings를 content가 넘을 수 없는 경계로 쓴다. 동일 authorized viewer에게 동일 content와 정확한 classification banner가 필요한 경우의 별도 모드다.

## Envelope 생성과 이동

생성할 때 enable하며 이후 on/off 전환할 수 없다. project/folder의 minimum classification과 mandatory marking,project maximum classification을 만족해야 한다. 위치를 바꾸면 preset/제약도 다시 확인한다. duplicate는 destination classification과 무관하게 원본 classification/markings를 유지하고 move도 이를 유지하되 새 project allowed range를 만족해야 접근 가능하다.

Notepad,PDF/DOCX와 Workshop embed에는 file-markings banner를 표시한다. custom export banner picker는 disabled다. 문서의 outline/history/referenced-data/page settings는 제공한다.

## Envelope 기능 제한

anchor/date/rule/image/LaTeX/object card/media/property/Markdown editor/pagebreak/table/mention만 지원한다. template/Marketplace/AIP 및 custom-function edit/App Pairing/AIP Assist/Automate integration은 지원하지 않는다. unsupported widget paste는 제거되고 invalid edit은 적용되지 않은 채 refresh할 수 있다. 일반 문서의 모든 widget을 넣을 수 있다고 가정하지 않는다.

## Lock data와 파생 content

Lock data는 누른 사용자가 보는 widget의 정적 snapshot을 만든다. document 접근과 source/upstream mandatory markings를 만족한 사용자는 source role 없이도 snapshot을 볼 수 있는 derived artifact다. 접근제어를 확정하기 어려운 source나 Restricted View는 Contour 예외 외에는 lock할 수 없다. admin은 checkpoint justification을 요구할 수 있다.

Contour lock은 visualization과 data를 잠그되 interaction을 유지한다. backing transaction이 retention/수동삭제되면 locked visual도 로드되지 않는다. template input parameter를 쓰는 Contour는 lock할 수 없다. 다른 widget lock의 noninteractive image와 다르다.

Update data로 unlock하면 기존 snapshot이 사라진다. Lock/unlock all도 있지만 snapshot이 원본의 복잡한 row-level policy나 무기한 보존을 그대로 재현한다고 보지 않는다.

## 출처

- [Palantir, envelope-security](https://www.palantir.com/docs/foundry/notepad/envelope-security)
- [Palantir, snapshot-widgets](https://www.palantir.com/docs/foundry/notepad/snapshot-widgets)

## 관련 문서

- [[Palantir-Notepad]]
- [[Palantir-Notepad-Analytics-Widgets]]
