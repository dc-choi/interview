---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["FCM V1과 APNs 직접 전송"]
---

# FCM V1과 APNs 직접 전송

## Native token 사용

직접 provider로 보낼 때 getExpoPushTokenAsync가 아닌 getDevicePushTokenAsync().data를 서버에 등록한다. Android는 FCM token, iOS는 APNs device token이다. expo-notifications의 client listener/permission은 계속 사용할 수 있다.

## FCM V1

service account로 OAuth2 access token을 얻고 `POST https://fcm.googleapis.com/v1/projects/<project>/messages:send`에 Bearer token을 전달한다. request는 message.token과 notification/data/android 등의 provider schema다. data 값은 FCM 요구에 맞는 string 형태로 직렬화한다.

원문의 FCM-SERVER-KEY 환경변수는 legacy server key 문자열이 아니라 V1 service account JSON 경로를 뜻한다. 예제 함수 key를 string으로 선언하면서 key.client_email/private_key를 읽는 타입 불일치는 parsed object로 고친다. access token은 수명이 있으므로 갱신하고 서버에서 보관한다. google-auth-library/Admin SDK의 현재 인증 API를 사용한다.

scopeKey/experienceId는 SDK52 이하 legacy Expo Go 테스트용이므로 SDK57 development/production 앱의 필수 payload로 추가하지 않는다. 직접 FCM data payload의 presentation과 content.data 변환은 expo-notifications의 supported FirebaseRemoteMessage contract를 확인한다.

## APNs client capability

CNG 앱은 expo-notifications plugin으로 entitlement를 포함하는 것이 권장된다. library를 쓰지 않으면 ios.entitlements에 aps-environment를 넣거나 native Xcode target에 Push Notifications capability를 설정한다. signing/provisioning의 실제 environment와 entitlement가 일치해야 한다.

APNs token auth는 .p8 private key, Key ID, Apple Team ID로 ES256 JWT를 만든다. iss는 Team ID, iat는 발급 Unix time, header kid는 Key ID다. private key는 server에서만 쓴다. 원문의 JWT 예제는 comma 누락 등 설명용 오류가 있으므로 literal code를 그대로 사용하지 않는다.

## APNs HTTP2

| 설정 | 값 |
|---|---|
| development host | api.sandbox.push.apple.com |
| production host | api.push.apple.com |
| method/path | POST /3/device/<native-token> |
| apns-topic | 실제 bundle identifier |
| authorization | bearer JWT |
| payload | aps alert/background contract |

alert/background에 맞는 apns-push-type, priority 등 Apple 현재 header 요구도 함께 적용한다. source의 최소 예제는 pooling/error handling을 제공하지 않으므로 HTTP2 session 재사용, provider error parsing, token invalidation, retry/backoff를 구현한다. SDK57에 Expo Go scope fields는 필요하지 않다. 직접 전송 경로는 Expo tickets/receipts가 아니라 provider의 response를 확인한다.

## 출처

- [Expo Documentation, Send notifications with FCM and APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
