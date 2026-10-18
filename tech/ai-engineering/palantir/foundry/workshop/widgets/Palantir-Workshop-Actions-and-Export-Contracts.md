---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop Action, inline edit와 export"]
---

# Workshop Action, inline edit와 export

Action은 정의된 Ontology rule, submission criteria와 권한에 따라 object/link를 create/modify/delete한다. Form의 Visible/Hidden/Disabled default는 UI 표현이며 backend authorization을 대신하지 않는다. Action type 작성자와 기존 Action 실행자의 권한은 다르다. 원문의 actions-admins 안내는 이 문서 시점의 관리 요구다.

## Lifecycle와 inline 처리

Action form preview의 Submit은 submittability만 검사하고 실제 Action을 실행하지 않는다고 안내한다. 실제 제출의 on-start event와 on-success event는 서로 다른 시점이다. 성공 전에 navigation/variable reset으로 결과를 확정 표시하지 않는다.

Inline Action form은 한 Action을 guided하게, table은 CSV/bulk 입력을 다룬다. 둘 다 Action criteria를 따르되 table은 일부 form feature 미지원, batch-call limit과 non-conflicting edits 조건이 있다. Table prefill object type은 Action parameter와 일치해야 한다. Widget output은 created/modified object set이며 원본 전체 set과 다를 수 있다.

Object Table cell edit는 single Modify rule 또는 function-backed Action, from-parameter primitive single value, non-hidden parameter를 요구한다. Enum/validation은 반영하지만 parameter display 방식은 그대로 반영하지 않는다. Function-backed는20row, 일반 Action은200row까지 stage한다고 상세 table 문서가 안내한다. 이는 Inline Action grid 전체 한도와 같은 숫자로 일반화하지 않는다.

## Export

Button object-set export는 sort order를 보존하지 않고 Object Table right-click export는 configured sort를 따른다. Function/linked columns를 포함하면 CSV가 된다. Table 상세 안내는 CSV최대10,000row, Excel최대200,000row를 구분한다. UI에서 보이는 일부 page만 보아 전체 export 계약을 추정하지 않는다.

Function-backed export는 텍스트(CSV/TXT/JSON/XML)는 plain string, binary(PDF/DOCX/XLSX)는 base64 string이며 MIME prefix를 넣지 않는다. 원문은 Python bytes 직접 반환도 허용한다고 덧붙이므로 string-only picker 설명과 언어별 serialization 차이를 확인한다. UserFacingError는 사용자가 읽는 오류 메시지로 노출된다.

Media export는 max object count, media property와 filename substitution을 지정한다. Export file의 access control은 화면 read-time filter와 별개 propagation 계약을 검토한다. File upload→Action은 file별 실행이므로 multi-file을 원자적 일괄 transaction으로 가정하지 않는다. 실제 write/export는 실행하지 않았다.

## 출처

- [Palantir Workshop, actions-overview](https://www.palantir.com/docs/foundry/workshop/actions-overview)
- [Palantir Workshop, actions-use](https://www.palantir.com/docs/foundry/workshop/actions-use)
- [Palantir Workshop, widgets-button-group](https://www.palantir.com/docs/foundry/workshop/widgets-button-group)
- [Palantir Workshop, widgets-event-navigational](https://www.palantir.com/docs/foundry/workshop/widgets-event-navigational)
- [Palantir Workshop, widgets-inline-action-form](https://www.palantir.com/docs/foundry/workshop/widgets-inline-action-form)

## 관련 문서

- [[Palantir-Workshop]]
