---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Push API 전송과 receipt"]
---

# Expo Push API 전송과 receipt

## HTTPS API와 배치

`POST https://exp.host/--/api/v2/push/send`는 JSON content type으로 single message 또는 최대 100 message objects array를 받는다. 같은 request의 token은 모두 동일 project여야 한다. to가 token array인 경우 recipient별 ticket이 생기므로 message object count만 보고 응답 개수를 단정하지 않는다. gzip body를 지원한다.

```json
{
  "to": "ExponentPushToken[placeholder]",
  "title": "새 메시지",
  "body": "대화를 확인하세요",
  "data": {"conversationId": "example-id"}
}
```

기본 API는 별도 authentication 없이 token으로 전송할 수 있다. project의 enhanced push security를 활성화한 경우 Authorization Bearer access token이 필수이며 없거나 유효하지 않으면 UNAUTHORIZED다. server-sdk-node는 constructor accessToken 옵션을 지원한다.

## Ticket과 receipt 구분

push response의 data는 입력 순서에 대응하는 tickets다. 성공은 status ok와 id(receipt ID), 실패는 status error/message/details.error를 가진다. HTTP200이어도 개별 ticket은 실패할 수 있다. 전체 request 실패는 HTTP4xx/5xx와 errors array다.

`POST https://exp.host/--/api/v2/push/getReceipts`에 `{ "ids": ["ticket-id"] }`를 보낸다. 최대 1000 IDs이며 response.data는 ID를 key로 갖는 receipt map이다. 아직 존재하지 않는 ID는 누락된다.

| 결과 | 증명하는 범위 |
|---|---|
| ticket ok | Expo가 payload를 받음 |
| receipt ok | Expo가 FCM/APNs에 성공적으로 넘김 |
| device 수신 | 기기/OS가 메시지를 전달함, 위 두 상태만으로 보장 안 됨 |
| 사용자 읽음/업무 완료 | 앱의 별도 acknowledgement 필요 |

receipt는 약15분 뒤 조회하도록 권장되며 24시간 뒤 제거된다. ID와 recipient의 연결을 서버에 보관하고 모든 receipt를 처리한다. DeviceNotRegistered는 provider가 해당 token을 invalid로 판단했을 때 나타나며 uninstall 직후 즉시 발생하는 것은 아니다.

## Throttling과 retries

project 한도는 초당600 notifications다. Node SDK는 최대6 concurrent connections와 throttling/backoff를 제공한다. network error, HTTP429/5xx는 exponential backoff로 재시도하며 malformed payload400, credentials 오류는 설정을 먼저 고친다. 수신자별 rate error는 해당 token에 backoff한다.

Expo 서비스에는 SLA가 없다. best effort와 at-least-one attempt의 전달 모델이며 provider로 중복되거나 누락될 가능성이 남는다. notification의 업무 식별자와 앱 처리의 idempotence를 고려한다. receipt ok를 exactly-once device delivery로 설명하지 않는다.

세부 payload는 [[Expo-Native-Push-Payload]], 오류와 network 진단은 [[Expo-Native-Push-Errors]]에 정리했다.

## 출처

- [Expo Documentation, Send notifications with the Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
