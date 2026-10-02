---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Push notification 유형과 앱 상태"]
---

# Push notification 유형과 앱 상태

## Remote와 local

remote push는 외부 서버에서 기기로 보내는 메시지다. local은 앱이 즉시 또는 schedule trigger로 생성한다. foreground는 화면이 active한 상태, background는 최소화된 상태, terminated는 실행되지 않는 상태다. Android 설정에서 force-stop하면 앱을 직접 다시 열기 전까지 알림이 정상 재개되지 않는다.

## 메시지 종류

| 종류 | Payload | background/terminated |
|---|---|---|
| Notification Message | title/body 등 표시 정보 | OS가 표시 |
| Notification Message + data | Android notification와 data, iOS 일반 alert에 extra data | OS 표시, 앱 action에서 data 처리 |
| Headless Background | 표시 정보 없이 JSON data | OS가 허용하면 등록된 JS task 실행 |

foreground에서는 두 종류 모두 received listener와 등록된 JS task로 처리할 수 있고 화면 표시는 NotificationHandler가 결정한다. SDK57 기본은 표시하지 않음이다. SDK58의 표시 기본 변경을 현재 SDK57에 적용하지 않는다.

Expo request에서 title/subtitle/body/icon/channelId가 있으면 Notification Message가 된다. headless는 data와 `contentAvailable: true`, ttl 등 비interactive field만 넣는 형태다. iOS는 background notification config가 필요하다. Android data 안에 title/message를 넣으면 expo-notifications가 headless를 표시하는 예외가 있으며 iOS와 일치하지 않는다.

## 사용자 반응과 cold start

| App state | iOS | Android |
|---|---|---|
| foreground response | response listener | response listener |
| background response | response listener | response listener 및 JS task |
| terminated response | 시작 후 response listener/last response 확인 | JS task, 시작 response 확인 |

listener가 trigger되면 useLastNotificationResponse의 값도 바뀐다. iOS cold start에서는 response listener를 가능한 한 이른 module top-level에 등록하고 startup에서 useLastNotificationResponse 또는 getLastNotificationResponse를 함께 확인한다. React effect listener 하나만으로 모든 initial interaction을 보장하지 않는다.

## Background 처리의 한계

headless task는 terminated에서도 실행될 수 있지만 OS가 app delivery를 보장하지 않는다. Android Doze, iOS background throttling, 사용자의 force-stop/배터리 설정이 영향을 준다. Apple은 background notification을 시간당 2~3회 이하로 보내는 방식을 권장한다. JS background 실행이 필요하지 않으면 일반 Notification Message를 우선한다. 정해진 시간의 업무 처리나 필수 데이터 동기화를 push만으로 보장하지 않는다.

## 출처

- [Expo Documentation, What you need to know about notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
