---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow REST API와 상태 추적"]
---

# Workflow REST API와 상태 추적

## Dispatch 요청

EAS REST API는 https://api.expo.dev 아래 JSON 요청/응답을 제공한다. Authorization의 Bearer token은 해당 프로젝트 접근 권한이 있어야 한다. 운영 통합은 필요한 role의 robot user token을 고려하고 token을 client 앱에 넣지 않는다.

`POST /v2/workflows/dispatch`에는 appId(EAS project UUID), gitRef(branch/tag/SHA), fileName이 필수다. fileName은 deploy.yml 같은 이름만 쓰며 .eas/workflows prefix나 다른 path segment를 포함하지 않는다. inputs는 workflow_dispatch.inputs schema로 검증한다.

```json
{
  "appId": "00000000-0000-4000-8000-000000000001",
  "gitRef": "main",
  "fileName": "deploy.yml",
  "inputs": { "environment": "preview" }
}
```

200 응답 data.id/url은 새 run이 접수됐다는 뜻이다. 400은 요청/input schema, 403은 접근 권한, 404는 linked repository의 ref 또는 workflow 파일을 확인한다. 인증 token과 실제 project ID는 예시 값으로 대체한다.

## 상태 조회

`GET /v2/workflows/runs/:workflowRunId`는 run과 jobs를 반환한다. Run status는 new/in-progress/action-required/success/failure/canceled다. terminal은 success/failure/canceled이고 action-required는 승인 같은 조치 대기다.

Job은 pending-cancel/skipped도 가진다. cancellation 요청과 종료를 구분한다. jobs.outputs, errors와 buildId/submissionId로 하위 작업을 추적하고 gitCommitHash/requestedGitRef를 함께 기록한다. 응답의 secret 참조는 placeholder로 표시된다.

## Polling과 재시도

HTTP 실패, JSON 파싱 실패와 data.id 누락을 먼저 처리한다. 종료 없는 while loop로 polling하지 말고 timeout/backoff와 action-required 알림을 둔다. 원문의 단순 polling 예시는 HTTP 오류와 timeout 처리를 생략하므로 운영 구현에 그대로 쓰지 않는다.

Dispatch 응답을 못 받았다고 곧바로 동일 배포를 반복하면 run이 중복될 수 있다. 기존 run 존재와 side effect를 확인한 후 재시도한다. 성공 상태도 실제 스토어 공개 출시나 사용자 업데이트 적용과는 별도 검증 대상이다.

## 출처

- [Expo Documentation, Workflows REST API](https://docs.expo.dev/eas/workflows/rest-api)

## 관련 문서

- [[Expo-EAS-Workflow-Operations]]

- [[Expo]]
