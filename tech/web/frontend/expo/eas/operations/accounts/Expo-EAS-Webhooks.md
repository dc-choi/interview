---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Build와 Submit webhook"]
---

# Build와 Submit webhook

## 전달과 서명

Webhook은 project별 BUILD/SUBMIT event에 등록한다. 완료 결과를 HTTP POST JSON으로 전달하며 응답이 200~399 밖이면 exponential backoff로 몇 차례 재시도한다. 성공/실패/취소 status를 확인하고 완료 알림을 항상 성공으로 처리하지 않는다.

Secret은 최소16자다. expo-signature header는 raw request body의 HMAC-SHA1 hex digest에 sha1= prefix를 붙인 값이다. JSON을 parse한 뒤 다시 serialize하면 byte가 달라져 서명이 깨질 수 있다.

수신기는 raw body에 대해 기대 signature를 계산하고 길이 검증과 constant-time 비교를 한 뒤 처리한다. 서명 오류나 malformed body를 정상 event로 수락하지 않는다. 재전달을 고려해 event type와 id를 기준으로 중복 효과를 막는다. 이는 receiver 설계 권고이며 Expo가 exactly-once delivery를 보장한다는 뜻은 아니다.

## Payload와 운영

Build는 id/appId/platform/status, artifact와 metadata, metrics/timestamps, 실패 error를 제공한다. retry에는 parentBuildId, Submit retry에는 parentSubmissionId가 있을 수 있다. artifact URL과 build 연결 정보는 상태/경로에 따라 없을 수 있다.

Submit의 finished는 제출 서비스 작업 완료이며 store 승인/공개 보장이 아니다. 오래된 예시의 SDK41/React Native0.60과 resource class를 현재 default로 복제하지 않는다.

webhook:list로 ID를 확인하고 webhook:update로 URL/secret, webhook:delete로 전달을 중단한다. 실제 secret을 CLI --secret argument에 평문으로 남기지 않고 안전한 입력/보관 경로를 사용한다.

## 출처

- [Expo Documentation, Webhooks](https://docs.expo.dev/eas/webhooks)

## 관련 문서

- [[Expo-Accounts]]

- [[Expo]]
