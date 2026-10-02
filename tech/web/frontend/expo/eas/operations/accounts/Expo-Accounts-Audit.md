---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Audit logs"]
---

# EAS Audit logs

## 감사 기록의 범위

Enterprise Audit logs는 actor, entity, CREATE/UPDATE/DELETE action, message, 시각과 metadata를 기록한다. Account/subscription/project/permission/invitation, Android/iOS credential과 Apple device/team, Update branch/channel, Hosting deployment/domain/alias, Workflow/revision 등이 대상이다.

기록은 사용자가 수정하거나 삭제할 수 없다. 모든 시스템 행동을 무조건 포함한다고 가정하지 않는다. 일부 entity는 Enterprise 구독 이후 수집을 시작한다. 2026-10-01 기준 보존1.5년, 계정 삭제 후90일 뒤 해당 log 삭제다.

## 조회와 export

Account/Organization settings의 Audit logs 또는 eas account:audit ACCOUNT --json으로 조회한다. UI Export는 최대30일 범위를 파일로 내보내며 Message 필드는 제외한다. CLI read와 웹 export를 구분한다.

Permission 변경은 role 이름이 아니라 permission 이름으로 기록된다. PUBLISH_PROTECTED는 Release Manager/Admin/Owner에 포함될 수 있으므로 permission 하나로 actor role 전체를 단정하지 않는다. 현재 device 목록에서 사라진 항목도 과거 log에 남을 수 있다.

감사 로그는 어떤 계정이 행동했는지를 보여 준다. 계정 탈취 여부나 실제 사람의 의도를 확인하려면 authentication/security activity와 함께 조사한다.

## 출처

- [Expo Documentation, Audit logs](https://docs.expo.dev/accounts/audit-logs)

## 관련 문서

- [[Expo-Accounts]]

- [[Expo]]
