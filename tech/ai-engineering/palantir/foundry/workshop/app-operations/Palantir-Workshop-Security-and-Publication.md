---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop 권한, branch와 publish"]
---

# Workshop 권한, branch와 publish

Module을 열고 편집하는 권한과 underlying object/action/function을 사용하는 권한은 별개다. Module에는 Organization/Marking과 role이 필요하며 기본 Viewer/Edit 역할을 구분한다. Parent module 접근이 child resource 접근을 부여하지 않는다.

Read-time row/column controls는 widget이 unauthorized data를 보여 주지 않도록 필터링하지만 export/Action write/downstream function에 동일 policy가 전파된다는 뜻은 아니다. Marking/CBAC와 각 downstream contract를 함께 검토한다. 숨긴 버튼/column과 data authorization을 혼동하지 않는다.

## Redact와 kiosk

Redact는 custom glyph/image hiding 같은 시각적 보조일 뿐 data fetch/variables/events/Actions는 계속 실행된다. Browser session 접근자에게 민감값 보호를 보장하지 않는다.

Kiosk는 allowlisted published module에 scoped long-lived read-only session을 만든다. Nested Workshop entities는 scope에 포함되지만 다른 embedded app의 내부 entity는 자동 포함되지 않는다. Restricted-view-backed object는 미지원, Slate embed는 write 가능성 때문에 disabled다. OSDK iframe token lifetime은 builder 책임이며 inactivity timeout도 남는다.

Read-only dashboard의 별도 Org/space/application access pattern은 app navigation 제약과 underlying data/write permission 설계를 함께 적용하는 예시다. Workshop UI가 read-only처럼 보여도 모든 Action/backend가 자동 금지된다고 가정하지 않는다.

## Version과 branch

Save와 publish는 분리할 수 있고 auto-publish setting이 있으면 save가 publish도 한다. Revert는 과거 configuration을 새 version으로 저장한다. Changelog는 changed/added/deleted/moved/made-unused를 구분하고 JSON diff로 확인한다.

Protected main은 branch/proposal review를 요구한다. Main 변경 후 rebase가 필요하며 unsaved edits는 보존되지 않으므로 먼저 저장한다. 다른 config field는 merge할 수 있지만 같은 field/variable/layout position은 conflict다. Reject all changes from main은 module configuration을 branch로 덮는 선택이므로 일반 conflict resolution과 구분한다. Non-Workshop embed는 branch에서 수정되지 않을 수 있다.

## Packaging

GA feature는 static/object-backed scenarios 예외를 빼고 packaging 지원이라고 설명한다. Installation linter는 dependency detection을 검사하며5~10초 지연될 수 있다. Resource List Compass references/custom widget은 manual dependency/packaging 설정이 필요할 수 있다. String/Boolean installation parameter는 installer customization이며 runtime user 권한이 아니다. 실제 publish/package/권한 변경은 수행하지 않았다.

## 출처

- [Palantir Workshop, branching-integration](https://www.palantir.com/docs/foundry/workshop/branching-integration)
- [Palantir Workshop, changelog](https://www.palantir.com/docs/foundry/workshop/changelog)
- [Palantir Workshop, concepts-permissions](https://www.palantir.com/docs/foundry/workshop/concepts-permissions)
- [Palantir Workshop, kiosk-mode](https://www.palantir.com/docs/foundry/workshop/kiosk-mode)
- [Palantir Workshop, marketplace-workshop](https://www.palantir.com/docs/foundry/workshop/marketplace-workshop)
- [Palantir Workshop, read-only-dashboard](https://www.palantir.com/docs/foundry/workshop/read-only-dashboard)
- [Palantir Workshop, redact-mode](https://www.palantir.com/docs/foundry/workshop/redact-mode)
- [Palantir Workshop, versions](https://www.palantir.com/docs/foundry/workshop/versions)

## 관련 문서

- [[Palantir-Workshop]]
