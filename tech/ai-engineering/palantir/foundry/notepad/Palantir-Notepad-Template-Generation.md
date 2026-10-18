---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Template input, version과 generator 한도

template은 input을 받아 새 문서를 만드는 blueprint다. string/number/date/timestamp/object/ObjectSet input을 widget에 명시적으로 연결한다. preview value는 편집 중 시뮬레이션 값이며 generation default가 아니다.

## 게시와 채택

새 template 또는 Save as template으로 만들고 현재 content/settings/input을 새 version으로 publish한다. Notepad home/header에서 생성하면 latest published version을 쓰지만 Workshop은 version을 명시적으로 고른다. 새 version publication만으로 기존 Workshop workflow가 바뀌지 않는다.

Value embed는 generation 때 input의 text로 치환한다. Conditional section은 string input의 rule에 따라 content를 포함하며 template에서만 제공한다. green/red preview border는 포함 여부이지 데이터 접근권한이 아니다.

## Generator

Section generator는 object마다 문서 section을,Table row generator는 table안에서 object마다 row를 만든다. 내부 widget은 Object from generator로 해당 object를 받는다. first-degree linked object 또는 별도 ObjectSet input으로 한 단계만 nested generator를 구성한다.

기본 section 한도는 top-level30,nested100objects,table row는 top/nested각100objects다. 초과 object는 무시될 수 있어 전체 결과를 출력했다고 보고하지 않는다. sorting은 property로 지정하며 최대2,000objects를 정렬한다.

space owner/manager는 Control Panel에서 top/nested section/row generation limit을 조정할 수 있고 모든 configuration은1,000상한이 있다. 별도의 extra-large hard limit을 넘으면 generation 자체가 실패한다. 기본 한도,config상한과 전체문서 보호한도를 구분한다. nested 조합은 문서 크기와 upstream 호출을 크게 늘릴 수 있다.

## 출처

- [Palantir, templates-overview](https://www.palantir.com/docs/foundry/notepad/templates-overview)
- [Palantir, templates-create](https://www.palantir.com/docs/foundry/notepad/templates-create)
- [Palantir, templates-inputs](https://www.palantir.com/docs/foundry/notepad/templates-inputs)
- [Palantir, templates-connect-inputs](https://www.palantir.com/docs/foundry/notepad/templates-connect-inputs)
- [Palantir, templates-publish](https://www.palantir.com/docs/foundry/notepad/templates-publish)
- [Palantir, templates-configuration](https://www.palantir.com/docs/foundry/notepad/templates-configuration)
- [Palantir, widgets-value-embed](https://www.palantir.com/docs/foundry/notepad/widgets-value-embed)
- [Palantir, widgets-conditional-section](https://www.palantir.com/docs/foundry/notepad/widgets-conditional-section)
- [Palantir, widgets-section-generator](https://www.palantir.com/docs/foundry/notepad/widgets-section-generator)
- [Palantir, widgets-table-row-generator](https://www.palantir.com/docs/foundry/notepad/widgets-table-row-generator)

## 관련 문서

- [[Palantir-Notepad]]
- [[Palantir-Notepad-Function-and-AIP-Editing]]
- [[Palantir-Notepad-Workshop-and-Packaging]]
