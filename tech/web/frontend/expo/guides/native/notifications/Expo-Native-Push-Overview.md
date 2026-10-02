---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Push Service 구성과 선택"]
---

# Expo Push Service 구성과 선택

## 전송 경로

서버는 앱이 등록한 ExpoPushToken으로 Expo Push Service에 요청한다. Expo는 Android FCM, iOS APNs에 메시지를 넘기고 provider가 기기로 전달한다. expo-notifications는 앱의 permission, token, local scheduling, foreground handler와 response listener를 담당한다.

Expo API로 두 플랫폼의 전송 payload를 공통화할 수 있지만 platform별 delivery와 권한 제한은 남는다. EAS Build는 credentials 관리를 쉽게 하며 필수 build 방식은 아니다. local native build에서도 notifications를 사용할 수 있다.

## 서비스 선택

| 경로 | Token | 책임 |
|---|---|---|
| Expo Push Service | getExpoPushTokenAsync | Expo ticket/receipt와 공통 request 처리 |
| 직접 FCM/APNs | getDevicePushTokenAsync | OAuth/JWT, provider endpoint, retries, credentials 직접 관리 |
| Local notification | token 불필요 | 앱에서 content/trigger schedule, OS가 표시 |

push는 development build가 필요하며 SDK53+ Expo Go는 지원하지 않는다. local notification을 push와 같은 기능으로 판단하지 않는다. receiving listener가 동작해도 backend credential이나 remote delivery가 검증되는 것은 아니다.

설치/permission/token은 [[Expo-Native-Push-Setup]], 상태/유형은 [[Expo-Native-Push-Behavior]], 서버 계약은 [[Expo-Native-Push-Sending]], 반응 처리는 [[Expo-Native-Push-Receiving]]으로 연결된다.

## 출처

- [Expo Documentation, Expo push notifications: Overview](https://docs.expo.dev/push-notifications/overview)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
