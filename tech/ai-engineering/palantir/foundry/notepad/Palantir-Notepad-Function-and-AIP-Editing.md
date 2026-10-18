---
tags: [palantir, foundry, notepad]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Notepad의 Function 생성과 AIP 편집

일반 문서의 선택한 text를 변환하는 custom Function과 template generation 때 값을 계산하는 Functions on Objects widget은 다른 계약이다. AIP 활성화 여부와 무관하게 Edit with functions를 사용할 수 있다. envelope-secured document에는 두 편집 기능이 제공되지 않는다.

## 선택 text 변환

single string input을 받아 string/Boolean/date/double/float/integer/long을 돌려주는 Function을 선택한다. input을 plain text/Markdown으로 정하고 preview/run한 뒤 output을 plain/Markdown으로 표시해 Replace한다. input/output format 기본은 같으며 rich-text 의미가 필요하면 Markdown을 받는다.

AIP는 grammar/spelling,style,shorten,translate/custom prompt를 지원하고 여러 operation을 preview한 뒤 replace할 수 있다. spelling 지원언어는 English/French/German/Japanese/Korean/Spanish/Ukrainian이며 enrollment별 availability는 다를 수 있다. formatting 보존 기능이 의미/정확성 검증까지 대신하지 않는다.

## Template Function

Functions on Objects는 선택한 Function version과 input으로 generation 때 scalar를 계산한다. unbatched output은 Boolean/date/numeric/string이며 Markdown parsing은 unbatched에만 지원한다.

generator 안에서는 ObjectSet<K>를 받아 FunctionsMap<K,V>로 object별 scalar를 돌려주는 batched Function이 호출 overhead를 줄인다. 일반 set/list 인자는 batched로 인정되지 않는다. 여러 generator ObjectSet input은 같은 주변 generator에서 와야 하며 nested/top generator 양쪽을 동시에 batch source로 쓰지 못한다. 실제 전달 object set은 generator 한도로 잘린 중간집합이다.

## Markdown 손실

Function conversion은 heading/list/checklist/table/link/code/blockquote/formatting 등을 지원하지만 unsupported element/구조는 누락되거나 parse실패할 수 있다. Object property Markdown editor의 CommonMark 지원과 같은 범위로 가정하지 않는다. generated text와 원본 schema/format을 비교한다.

## 출처

- [Palantir, aip-features](https://www.palantir.com/docs/foundry/notepad/aip-features)
- [Palantir, custom-functions](https://www.palantir.com/docs/foundry/notepad/custom-functions)
- [Palantir, widgets-functions](https://www.palantir.com/docs/foundry/notepad/widgets-functions)
- [Palantir, markdown-features](https://www.palantir.com/docs/foundry/notepad/markdown-features)

## 관련 문서

- [[Palantir-Notepad-Template-Generation]]
- [[Palantir-Notepad-Object-Editing]]
