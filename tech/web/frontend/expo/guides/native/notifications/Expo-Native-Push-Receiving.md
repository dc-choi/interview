---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Notification 수신과 response 처리"]
---

# Notification 수신과 response 처리

## 두 listener의 역할

addNotificationReceivedListener는 앱에 도착한 notification, addNotificationResponseReceivedListener는 사용자가 tap/action한 response를 받는다. foreground received event를 사용자 클릭으로 취급하지 않는다. 두 subscription 모두 remove로 정리한다.

```ts
const received = Notifications.addNotificationReceivedListener(notification => {
  const data = notification.request.content.data;
  // update in-app UI
});
const responded = Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  // validate and route
});
// lifecycle cleanup
received.remove();
responded.remove();
```

공통 custom data는 request.content.data로 읽는다. Android trigger.remoteMessage에는 provider metadata, iOS trigger.payload에는 aps와 platform payload가 있을 수 있다. platform raw payload에 동일 구조가 있다고 가정하지 않고 app-level content/data를 public 처리 경로로 사용한다.

## SDK57과58의 foreground 기본 차이

SDK57 이하에서는 handler가 없으면 foreground 알림을 표시하지 않는다. handler가3초 안에 응답하지 않아도 drop된다. 표시를 원하면 아래 옵션을 명시한다.

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

SDK58+ guide는 default 표시(sound/banner/list/badge)와 timeout 때 표시로 변경한다고 설명한다. SDK58의 setNotificationHandler(null)은 Android foreground 표시를 끄고 iOS 결정을 다른 UNUserNotificationCenterDelegate에 넘기는 의미다. 이 변경을 SDK57 현재 API default로 적지 않는다.

## Startup와 closed-state 제한

앱이 notification으로 시작하면 last notification response를 함께 확인하고 초기 navigation 준비 이후 한 번 처리한다. live listener와 startup response가 같은 action을 두 번 처리하지 않도록 identifier/action을 기준으로 중복 방지를 고려한다. data의 route/deep link는 유효한 앱 경로인지 검증하고 로그인/authorization 이후 이동한다.

Android 제조사의 배터리/deep-clear 설정이나 force-stop은 closed-state 전달에 영향을 줄 수 있다. listener 설치만으로 모든 OS 상태에서 메시지 전달을 보장하지 않는다. response 처리, OS 표시와 headless background task는 다른 책임이다.

## 출처

- [Expo Documentation, Handle incoming notifications](https://docs.expo.dev/push-notifications/receiving-notifications)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
