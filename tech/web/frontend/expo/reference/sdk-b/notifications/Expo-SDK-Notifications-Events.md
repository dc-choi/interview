---
tags: [expo, expo-sdk, notifications]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 알림 수신, 표시와 Background Task"]
---

# Expo SDK 알림 수신, 표시와 Background Task

addNotificationReceivedListener(notification)은 실행 중 수신, addNotificationResponseReceivedListener(response)는 사용자 tap/action, Android FCM addNotificationsDroppedListener()는 server drop(onDeletedMessages)을 구독한다. 각 subscription.remove()로 cleanup한다. receive와 user interaction을 같은 이벤트로 처리하지 않는다.

## Presentation handler

setNotificationHandler({handleNotification, handleSuccess?, handleError?}|null):void는 foreground 표시 정책을 정한다. handleNotification은 3초 안에 Promise<NotificationBehavior>를 반환해야 하며 handler 부재/timeout이면 표시하지 않는다. behavior는 shouldShowBanner/shouldShowList/shouldPlaySound/shouldSetBadge, optionalAndroidpriority다. shouldShowAlert는 deprecated다. Android shouldPlaySound=false는 channel sound를 override하고 drop-down alert도 억제할 수 있으므로 banner=true만으로 heads-up을 보장하지 않는다.

```ts
Notifications.setNotificationHandler({handleNotification:async()=>({
  shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false
})});
```

handler success는 표시 정책 처리 결과이며 notification 배송/사용자 열람 증거가 아니다.

## Last response와 routing

getLastNotificationResponse():NotificationResponse|null은 synchronous, Async suffix는 deprecated다. clearLastNotificationResponse():void는 처리한 초기 response를 지우고 hook 값도 지운다. useLastNotificationResponse는 undefined(초기 판정 중)/null(없음)/object를 구분한다. response는 notification, actionIdentifier, userText?이며 일반 tap은 DEFAULT_ACTION_IDENTIFIER다. category action마다 다른 command로 처리한다.

Notification은 date/request, request는 identifier/content/trigger다. content.data의 URL은 외부 payload다. typeof 검사는 URL 신뢰를 보장하지 않아 허용된 앱 path/schema를 확인하고 auth-ready/routing-ready 시점에 이동한다. requestidentifier/action으로 중복 초기 response와 listener 처리도 방지한다. source Router example처럼 단순 push만 하면 remount에서 같은 화면이 재선택될 수 있다.

## Headless task

TaskManager.defineTask는 early-imported module global scope, Notifications.registerTaskAsync(name):Promise<null>는 native registration이다. unregisterTaskAsync→Promise<null>로 해제한다. Android는 background/terminated action tap에도 task가 실행될 수 있고 terminated 수신은 headless notification만 해당한다. iOS enableBackgroundRemoteNotifications/UIBackgroundModes remote-notification, data-only payload+_contentAvailable:true가 필요하다. manual source의 Expo.plist 표기는 반복 Info.plist 지침과 불일치하므로 actual target Info.plist/plugin을 따른다.

OS Doze/throttle/notification budget 때문에 항상 delivery되지 않는다. source의 hourly 권고를 정확한 hard quota로 해석하지 않는다. TaskManager background launch는 module side effect도 실행하므로 앱 UI 의존 없이 처리한다. task payload는 response 또는 {data:{dataString:JSONstring}, notification:record|null, aps?}이며 headless면 notification=null이다. body/data 검사를 거친 뒤 actionIdentifier 유무로 분기하고 JSON parse failure를 처리한다.

background result는 Notifications.BackgroundNotificationTaskResult.NewData0/NoData1/Failed2다. 원문 예제의 BackgroundNotificationResult는 실제 enum 이름과 다르고 import도 빠졌으므로 그대로 복제하지 않는다. 로그가 보이지 않는 background environment도 있어 persistent 진단과 실제 device state를 확인한다.

## 출처

- [Expo Documentation, Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

## 관련 문서

- [[Expo-SDK-Notifications]]
- [[Expo-SDK-TaskManager]]
- [[Expo-Router-Link]]
