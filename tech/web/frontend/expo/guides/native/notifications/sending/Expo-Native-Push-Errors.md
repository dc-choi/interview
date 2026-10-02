---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Push API 오류와 네트워크 진단"]
---

# Push API 오류와 네트워크 진단

## 개별 token/payload 오류

Ticket 또는 receipt의 details.error를 검사한다.

| Error | 대응 |
|---|---|
| DeviceNotRegistered | 해당 token 전송 중지, app의 재등록 때 재활성화 |
| MessageTooBig | title/data 등 전체 payload4096bytes 이하로 줄임 |
| MessageRateExceeded | 수신자별 exponential backoff |
| MismatchSenderId | FCM service account project와 google-services.json project_number/sender 일치 확인 |
| InvalidCredentials | FCM V1/APNs credential, revocation, entitlement/provisioning 확인 |

APNs key를 revoke하면 그 key를 사용하는 모든 app 전송이 영향을 받는다. 새 key 업로드만으로 ExpoPushToken이 바뀌는 것은 아니다. InvalidProviderToken이 key/provisioning 문제와 연결되면 새 push key와 provisioning profile, rebuild까지 필요할 수 있다.

## Request-level 오류

| Error | 한도/원인 |
|---|---|
| TOO_MANY_REQUESTS | project 초당600 notifications 초과 |
| PUSH_TOO_MANY_EXPERIENCE_IDS | 다른 project token을 한 request에 섞음 |
| PUSH_TOO_MANY_NOTIFICATIONS | 최대100 notifications/request 초과 |
| PUSH_TOO_MANY_RECEIPTS | 최대1000 receipt IDs/request 초과 |
| UNAUTHORIZED | enhanced push security 활성 상태의 access token 누락/오류 |

HTTP429/5xx/network는 잠시 기다린 뒤 backoff하며 HTTP400 payload 오류는 같은 input 무한 재전송으로 해결되지 않는다. response.errors와 per-ticket error를 각각 기록한다.

## Network 확인 순서

DNS에서 exp.host가 resolve되는지, outbound HTTPS443가 허용되는지, proxy/authentication, cloud ACL/security group과 MTU 문제를 확인한다. 서버는 Expo push 인프라가 있는 미국 GCP 서비스와 통신할 수 있어야 한다.

```sh
dig exp.host
curl --verbose https://exp.host/
openssl s_client -connect exp.host:443 -servername exp.host
```

TLS chain과 SNI를 확인한다. traceroute/ping 실패만으로 HTTPS endpoint 실패를 단정하지 않는다. 운영 network 정책에 따라 ICMP가 차단될 수 있으므로 실제 HTTPS request 결과를 함께 본다. local notification이 표시되는데 remote가 실패하면 client presentation과 provider credentials/API delivery를 분리해 조사한다.

## 출처

- [Expo Documentation, Send notifications with the Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
