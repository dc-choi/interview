---
tags: [palantir, approvals, checkpoint, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 승인 요청과 실행 lifecycle"]
---

# 승인 요청과 실행 lifecycle

Approvals는 요청, 개별 변경 task의 승인과 실제 invocation을 관리한다. 한 request의 모든 task가 승인돼야 변경을 invoke한다. 완료 request도 남아 과거 결정을 참조할 수 있다.

## Request와 task의 상태를 구분한다

Task는 Review/Approved/Rejected이며 task마다 eligible reviewer가 다를 수 있다. Request-level Approve all/Reject all도 해당 reviewer가 심사할 수 있는 task에만 적용된다. 일부 task 승인과 전체 변경 적용을 같은 상태로 보지 않는다.

Request의 Pending approval은 승인 대기, Changes requested는 열린 상태에서 수정/추가 사유를 요구한다. Closed와 Rejected and Closed는 재개할 수 없다. Completed는 invoke한 상태다. 모든 task 승인이 있어도 필수 Checkpoint가 비어 있으면 Action required로 남아 사용자 처리가 필요하다.

Request 작성자와 eligible reviewer는 edit/close할 수 있고 approve/reject는 eligible reviewer만 가능하다. 열린 request의 task rejection은 다른 eligible reviewer의 approval로 override할 수 있다. 따라서 최초 rejection과 최종 결정 이력을 함께 본다.

## Reviewer 지정은 권한 부여가 아니다

기본 reviewer는 해당 변경을 스스로 실행할 수 있는 사용자다. Group membership, project role, marking access, reference와 Ontology proposal은 각각 다른 권한을 요구한다. Invite reviewers는 알림과 inbox에 대상을 추가하지만 request 열람/승인 권한을 새로 부여하지 않는다.

Comment는 request 전체 또는 task별로 남기며 link/file을 근거로 첨부한다. 심사할 수 있는 task만 보더라도 request 전체의 영향을 고려한다. Required Checkpoint는 보통 requester가 채우지만 reviewer가 대신 작성할 수도 있어 사유 작성자와 원 요청자를 구분한다.

## 알림과 감사 기록은 다르다

Reviewer 추가, invocation 성공, close/create와 nudge 알림은 사용자 설정을 따른다. Group membership으로 자동 reviewer가 되면 해당 group이 50명 미만일 때만 생성 시 알림을 보낸다. Notification을 못 받았다는 이유로 reviewer가 아니거나 request가 없다고 확정하지 않는다.

## 출처

- [Palantir, Approvals](https://www.palantir.com/docs/foundry/approvals/overview)
- [Palantir, Review a request](https://www.palantir.com/docs/foundry/approvals/review-a-request)

## 관련 문서

- [[Palantir-Security-and-Governance|정책과 실행 강제]]
- [[Palantir-Automation-and-Purpose-Boundaries|자동화와 목적별 통제]]
