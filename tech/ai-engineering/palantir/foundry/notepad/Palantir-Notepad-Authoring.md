---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Notepad의 동적 문서와 version history

Notepad는 Ontology-aware 공동 rich-text editor다. chart/object/resource를 embed하고 object link를 추적하며 template으로 반복 문서를 만든다. 사용자 입력/선택에 따른 동적 dashboard filtering을 제공하는 도구는 아니므로 탐색 dashboard는 Quiver/Contour,업무 앱은 Workshop과 역할을 나눈다.

## 작성과 탐색

project/Notepad에서 문서를 만들고 text/column/image/table을 구성한다. / 또는 Widget menu로 embed하고 source의 Copy for Notepad로 가져올 수 있다. 문서에 참조한 object/ObjectSet/resource는 document link로 추적된다. link가 원본 접근권한까지 부여하지는 않는다.

heading에서 outline을 만들고 heading/body/widget anchor를 복사해 특정 위치를 공유한다. 다른 문서의 anchor는 source title도 보이며 tooltip에 source RID가 남는다. Workshop에서도 outline을 보이려면 Show outline when embedded를 켠다.

## Version과 비교

online 편집 중 기본5분마다 autosave하며 history 기본 view는 user-created version만 보인다. All versions로 autosave도 확인한다. 수동 name/endorsement로 release를 구분할 수 있지만 endorsement가 데이터 검증 결과를 뜻하지 않는다.

rollback은 현재 state를 먼저 version으로 저장하고 선택한 과거 state로 바꾼다. 과거 version은 기본 read-only이며 Current session에서 현재 편집으로 돌아온다. Show changes는 text내용을 비교하지만 font/color/size,alignment,list nesting,image size와 table formatting 변경은 제외한다.

## 기본 widget의 의미

|Widget|설정/의미|
|---|---|
|Table|행/열 추가삭제,배경색,dense mode를 설정하며 row generator와 별개다.|
|Image|drop/paste/file upload 후 resize handle로 크기를 바꾼다.|
|LaTeX|표시 식을 직접 입력하거나 template input에 연결한다.|
|Horizontal rule/Page break|시각 divider와 인쇄시 강제 페이지 분리는 다르다.|
|Resource link|resource명으로 표시하면서 원래 path를 유지한다. plain-text paste로 변환을 피한다.|
|User mention|개인 notification setting에 따라 알림을 보낸다.|
|Current date|자동갱신은 기본off,켜면 reload시 갱신한다. viewer timezone이 기본이며 고정 timezone/format을 선택할 수 있다. template generation시 freeze도 가능하다.|

본문/출력의 현재 값,document version과 upstream data version을 따로 확인한다.

## 출처

- [Palantir, notepad](https://www.palantir.com/docs/foundry/notepad)
- [Palantir, overview](https://www.palantir.com/docs/foundry/notepad/overview)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/notepad/getting-started)
- [Palantir, embed-widgets](https://www.palantir.com/docs/foundry/notepad/embed-widgets)
- [Palantir, document-outline](https://www.palantir.com/docs/foundry/notepad/document-outline)
- [Palantir, version-history](https://www.palantir.com/docs/foundry/notepad/version-history)
- [Palantir, widgets-anchor-link](https://www.palantir.com/docs/foundry/notepad/widgets-anchor-link)
- [Palantir, widgets-table](https://www.palantir.com/docs/foundry/notepad/widgets-table)
- [Palantir, widgets-image](https://www.palantir.com/docs/foundry/notepad/widgets-image)
- [Palantir, widgets-latex](https://www.palantir.com/docs/foundry/notepad/widgets-latex)
- [Palantir, widgets-horizontal-rule](https://www.palantir.com/docs/foundry/notepad/widgets-horizontal-rule)
- [Palantir, widgets-page-break](https://www.palantir.com/docs/foundry/notepad/widgets-page-break)
- [Palantir, widgets-resource-link](https://www.palantir.com/docs/foundry/notepad/widgets-resource-link)
- [Palantir, widgets-user-mention](https://www.palantir.com/docs/foundry/notepad/widgets-user-mention)
- [Palantir, widgets-current-date](https://www.palantir.com/docs/foundry/notepad/widgets-current-date)

## 관련 문서

- [[Palantir-Notepad]]
- [[Palantir-Notepad-Export-Contracts]]
