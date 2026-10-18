---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 편집 권한과 이력 공개

Single-source object edit는 객체를 읽을 수 있고 Action submission criteria를 통과해야 한다. Create에는 input source 접근이 필요하다. MDO modify는 수정할 source의 기존 값을 볼 수 있어야 하며 다른 source는 검사하지 않는다. 접근 못 하는 source는 validation에서 null로 나타나므로 실제 값이 없는 것과 혼동하면 안 된다.

MDO create는 값을 설정할 source 접근을 검사하고 다른 source 값은 null이다. 해당 source에서 과거 삭제된 객체를 다시 만들 때는 그 source들의 행 접근도 필요하다. Delete는 모든 source의 전체 객체를 볼 수 있어야 한다. Link create/delete는 양쪽 객체를 각각 어느 source에서든 load할 수 있으면 되고 개별 속성 전체 접근은 검사하지 않는다고 설명한다. 최신 OSP/Action 정책도 함께 대조한다.

## Edit history와 Action log

Edit history는 활성화 뒤의 실제 객체 변경을 기록하고 Action log는 제출 parameter와 당시 의사결정 맥락을 남긴다. 둘의 UTC commit timestamp는 같지만 정확한 query visibility 시각은 아니다. Current User/Time rule의 시각은 Action 실행 시작 시각이어서 더 이를 수 있다.

Edit history 활성화 초기 수분 동안 Action을 실행할 수 없다. Edit history 비활성화는 기존 이력을 영구 삭제한다. 이는 object type의 Allow edits를 끄는 것과 다르다. 2023년 12월 공식 설정 화면은 Allow edits를 꺼도 기존 edit는 제거하지 않으며, Delete edits를 별도 동작으로 제공한다. 객체를 삭제한 뒤 같은 PK로 다시 만들어도, 현재 그 객체를 읽을 수 있는 사용자는 삭제 전을 포함한 전체 과거 이력을 볼 수 있다. 재생성 뒤의 현재 접근 권한만 확인해서 민감한 과거 값이 안전하다고 판단하지 않는다. OSv1 이전 시 preserve edit history를 명시해야 한다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/announcements/1700146568076-action-log-requiredness.png) 대조)

## 출처

- [Palantir, permission-checks](https://www.palantir.com/docs/foundry/object-edits/permission-checks)
- [Palantir, user-edit-history](https://www.palantir.com/docs/foundry/object-edits/user-edit-history)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
