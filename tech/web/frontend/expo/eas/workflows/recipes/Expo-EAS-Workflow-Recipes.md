---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CLI 작업을 Workflow로 연결하는 기준"]
---

# CLI 작업을 Workflow로 연결하는 기준

## 반복 작업의 입력을 명시한다

CLI의 build(platform/profile), submit(build ID/profile), update(environment/branch 또는 channel)를 각각 job 입력으로 옮긴다. 기존 build를 제출할 때 새 build를 무조건 만들지 말고 정확한 ID 또는 get-build filter를 사용한다.

`eas update --auto`만 있는 오래된 예시는 SDK 57에서 충분하지 않다. CLI는 --environment가 필수이고 Workflow update는 job.environment를 명시하는 편이 안전하다. branch와 environment는 서로 다른 이름 공간이다.

## 개발과 검토

개발 build는 팀이 재사용하고 native 변경 때 갱신한다. Preview Update는 이미 호환되는 development/preview build가 있을 때 JS 변경을 확인하는 경로다. PR review를 위해 production channel을 대신 사용하지 않는다.

[[Expo-EAS-Workflow-Development-Preview]]는 개발 build와 branch preview를, [[Expo-EAS-Workflow-Production-Recipe]]는 fingerprint 기반 release 분기를, [[Expo-EAS-Workflow-E2E-Recipe]]는 설치 artifact를 검증하는 테스트를 다룬다.

## 운영 조건

자동화 대상 동작이 publish/submit/delete인지 먼저 식별한다. 승인 gate가 필요한 release에는 require-approval을 넣고, 실패 진단은 after로 모은다. PostHog 지표 조건은 실제 관찰 구간과 오류 정책을 정한 다음 release gate로 사용한다.

문서에 YAML이 존재한다는 사실과 계정/서명/스토어 상태를 갖춘 실제 실행은 구분한다. 필요 없는 플랫폼이나 외부 메시지 job까지 예시에서 복사하지 않는다.

## 출처

- [Expo Documentation, Automating EAS CLI commands](https://docs.expo.dev/eas/workflows/automating-eas-cli)
- [Expo Documentation, EAS Workflows examples](https://docs.expo.dev/eas/workflows/examples/introduction)

## 관련 문서

- [[Expo-EAS-Workflow-Examples]]

- [[Expo]]
