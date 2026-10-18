---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry upgrade campaign과 완료 근거"]
---

# Foundry upgrade campaign과 완료 근거

Upgrade Assistant는 endpoint/library semantics와 폐기, correctness/security fix처럼 기존 workflow를 바꾸는 platform change를 알리고 잠재 영향 resource와 remediation을 배정한다. Campaign의 표시 진도는 실제 수정과 동일한 증거가 아니다.

## 탐지와 due date

영향 resource telemetry는 background task이며 보통 실시간이 아니다. Python version 변경 예시는 compliance 반영에 최대 24시간을 안내한다. 각 campaign마다 탐지법이 다르므로 목록에 없다는 사실만으로 영향이 없다고 단정하지 않는다.

Due date는 준비를 마쳐야 하는 기준이다. 배포 일정상 실제 적용이 뒤에 올 수 있어도 이 날짜를 미뤄 해석하지 않는다. 일부 campaign은 Maintenance Operator에게 보통 14일의 Pre-published 검토 기간을 제공하지만 항상 보장된 기간은 아니다.

## 배정과 권한의 구분

Resource는 한 번에 최대 100 user/group에 배정할 수 있다. Compass resource는 Project point of contact를 우선하고 없으면 Owner를 찾는다. Object type은 Editor/Owner, restricted type은 backing dataset의 권한도 고려한다. Enrollment는 Maintenance Operator, 없으면 Org Admin에 배정한다. Space/link/action/schedule 등은 reporting service가 배정을 제공할 수 있다.

Assignee가 없거나 너무 많으면 Needs triage로 Maintenance Operator에게 돌아갈 수 있다. 자동 배정은 heuristic이므로 담당자가 실제 책임자인지 확인하고 다시 배정한다. 배정 자체가 underlying resource 읽기/수정 권한을 부여하지 않는다.

Maintenance Operator는 Org permissions의 Oversee progress workflow이며 기본 Org Admin/Technical Compliance Officer role에 포함된다. Admin view는 권한 밖 resource를 포함한 aggregate progress를 보여주고 restricted Project도 RID를 복사할 수 있다. 개별 resource detail 접근을 새로 부여하는 것은 아니다.

## 완료, ignore와 알림

Enrollment resource는 자동 compliance 갱신이 없으며 operator가 수동 resolved 표시한다. Ignore는 모든 사용자에게 적용하고 진도 계산에서는 완료처럼 세지만 remediation을 실행하지 않는다. Notification도 중단되므로 due date 뒤 resource가 깨질 수 있다. Ignore와 수동 완료를 실제 배포 검증의 근거로 사용하지 않는다.

Status-change 알림은 operator에게 Pre-published/Published 때, summary는 pending assigned action을 가진 사용자에게 최대 월 1회, reminder는 기본 deadline 30/21/14/7/5/3/2/1일 전이다. 조직별 frequency 예외와 unsubscribe가 있어 알림이 없다고 pending action이 없다는 뜻은 아니다.

Admin CSV는 조직별 remediation summary이며 source compatibility 시험 결과와 별도다. 현재 구현/version, migration 실행과 workflow의 결과 검증을 함께 남기는 것이 완료 판단의 적용 원칙이다. 이 문서는 campaign 변경이나 resource ignore, notification 발송을 실행하지 않았다.

## 출처

- [Palantir upgrade-assistant, upgrade-assistant](https://www.palantir.com/docs/foundry/upgrade-assistant)
- [Palantir upgrade-assistant, ignore-resources](https://www.palantir.com/docs/foundry/upgrade-assistant/ignore-resources)
- [Palantir upgrade-assistant, impacted-resources](https://www.palantir.com/docs/foundry/upgrade-assistant/impacted-resources)
- [Palantir upgrade-assistant, notifications](https://www.palantir.com/docs/foundry/upgrade-assistant/notifications)
- [Palantir upgrade-assistant, overview](https://www.palantir.com/docs/foundry/upgrade-assistant/overview)
- [Palantir upgrade-assistant, platform-changes](https://www.palantir.com/docs/foundry/upgrade-assistant/platform-changes)
- [Palantir upgrade-assistant, resource-assignment](https://www.palantir.com/docs/foundry/upgrade-assistant/resource-assignment)
- [Palantir upgrade-assistant, resource-type](https://www.palantir.com/docs/foundry/upgrade-assistant/resource-type)
- [Palantir upgrade-assistant, technical-maintenance-operators](https://www.palantir.com/docs/foundry/upgrade-assistant/technical-maintenance-operators)

## 관련 문서

- [[Palantir-Platform-Operations]]
