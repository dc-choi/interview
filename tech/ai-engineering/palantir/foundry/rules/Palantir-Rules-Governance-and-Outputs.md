---
tags: [palantir, foundry, rules]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Rule 객체, 권한과 출력 제약

Rule은 metadata/custom properties와 compressed JSON logic blob을 가진 표준 object다. Proposal은 대상 rule ID, author/status/reviewer와 old/new property diff를 가진다. 한 rule에 여러 proposal을 만들 수 있고 proposal 자체가 필수 계약은 아니다. 승인 흐름은 표준 Actions로 목적에 맞게 바꾼다.

권한 예시는 rule author 또는 superuser만 수정/삭제 proposal을 승인하고, 거절은 rule author/proposal author/superuser에게 허용한다. 실수 proposal의 철회 경로도 고려한다. Action에 rule object parameter가 있어야 해당 rule 기반 submission criterion을 구성할 수 있다.

Custom property는 backing column을 먼저 마련하고 Rule에 property, Proposal에 current_/new_ 쌍을 추가한다. current property에 foundry-rules.property-diff-for:new_PROPERTY type class를 붙인다. 관련 생성/수정 Action parameter와 Workshop 기본값도 함께 갱신한다. Proposal Reviewer에는 new property를 표시한다. type class는 proposal object property에 붙이며 Action parameter에 붙이는 설정과 구별한다.

Output은 column/static 각각 Any/None/Selection을 제한할 수 있다. static numeric/date에는 Range, string에는 Users도 지원한다. Users 집합이 비면 제한이 없다. multiple value는 각 item에 제약을 적용한다. string template를 켜면 static/column을 혼합하지만 추가 제약은 구성하지 못한다. default는 새 rule 작성 때 채워지고 기존 rule의 논리 자동 수정으로 해석하지 않는다.

Optional Window/Aggregation/Join/Expression/Select/Union boards, Contour import 및 time series를 사용 목적에 맞게 제한한다. Marketplace는 workflow/Workshop과 Rule/Proposal types/Actions를 포장하지만 authored Rule/Proposal objects와 logic은 포함하지 않는다. Production 설치는 두 type의 Only allow edits via actions를 켜야 proposal 생성 PermissionDenied를 피한다.

ReadonlyObjectError는 writeback 연결을, InvalidParametersForApply는 required parameter를 확인한다. build 성공인데 결과가 비면 rules writeback 재실행과 rule status dataset의 개별 실패를 확인한다. legacy metadata 오류는 object/link RID, project references와 AdditionalInputs의 권한을 대조한다.

## 출처

- [Palantir, add-a-custom-property](https://www.palantir.com/docs/foundry/foundry-rules/add-a-custom-property)
- [Palantir, common-issues](https://www.palantir.com/docs/foundry/foundry-rules/common-issues)
- [Palantir, customization](https://www.palantir.com/docs/foundry/foundry-rules/customization)
- [Palantir, enable-optional-features](https://www.palantir.com/docs/foundry/foundry-rules/enable-optional-features)
- [Palantir, marketplace](https://www.palantir.com/docs/foundry/foundry-rules/marketplace)
- [Palantir, object-model](https://www.palantir.com/docs/foundry/foundry-rules/object-model)
- [Palantir, permitted-and-default-output-values](https://www.palantir.com/docs/foundry/foundry-rules/permitted-and-default-output-values)
- [Palantir, rule-permissions](https://www.palantir.com/docs/foundry/foundry-rules/rule-permissions)

## 관련 문서

- [[Palantir-Rules-Workflow-and-Execution]]
