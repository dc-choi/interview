---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 템플릿과 표 데이터 형태"]
---

# Slate 템플릿과 표 데이터 형태

## 템플릿의 위치가 타입을 결정한다

| 위치 | 치환 계약 |
|---|---|
| Query | 문자열로 렌더링, 복합 객체는 toString 결과에 주의 |
| Function/Event | 평가된 실제 값, helper 사용 불가 |
| Widget JSON | 템플릿 자체는 JSON 문자열로 작성 |
| Widget 문자열의 단독 참조 | 한 쌍의 괄호이고 바깥 공백/다른 문자가 없으면 실제 값 유지 |
| Widget 문자열의 보간/블록 | 문자열 치환 |

`{{x}}`와 ` {{x}} `는 widget에서 같은 계약이 아니다. Variables/Styles 편집기에는 Handlebars를 넣지 않는다. View mode에서 사용자가 입력한 Handlebars도 실행되지 않는다. Widget 전체나 내부 객체를 통째로 읽는 참조는 지원하지 않는 경우가 있어 leaf, array와 그 하위 속성을 사용한다.

## Helper의 타입과 보안 용도

`toNumber`는 JavaScript Number 변환이며 실패하면 NaN이 될 수 있다. `jsonParse`는 문자열만 받고 유효하지 않은 JSON은 오류다. 산술 helper는 숫자를, 비교 helper는 같은 타입의 숫자나 문자열을 요구한다. 문자열 true/false 예제를 엄격한 Boolean 타입 보장의 증거로 삼지 않는다.

`encodeURI`와 `encodeURIComponent`는 예약문자 처리 범위가 다르며 JSON/SQL 보안 helper를 대체하지 않는다. `getSelectedDisplayValue(s)`는 raw/display 배열 대응과 선택값 존재를 확인한다. 단수 helper의 원문 예제도 배열 결과를 보이므로 반환 모양을 호출부에서 확인한다.

## 평행 배열의 무결성

Table과 많은 chart는 행 배열 대신 열별 평행 배열을 받는다. 같은 index가 같은 행을 뜻하므로 열의 길이와 순서를 유지한다. 행→열 예제는 첫 객체가 모든 키를 갖는다는 가정이 기본이며, 누락 키가 있으면 전체 키 합집합이 필요하다. 빈 입력 예제의 `[]` 반환도 일반 열 객체와 형태가 다르다.

SQL query에는 `_response` 메타데이터가 있을 수 있다. 함수 export 문서는 `_results` 제거를 요구하는 다른 표기를 사용한다. 이름을 추정해 하나로 통일하지 말고 실제 결과에서 비열 메타데이터를 분리한다. 함수 export는 모든 속성이 같은 길이의 배열이어야 한다.

원문 예제에는 designation/id 불일치, 변수명 오기와 문법이 불완전한 코드가 있다. 본문을 읽었다는 사실을 그대로 실행 가능한 예제의 보장으로 바꾸지 않았다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
