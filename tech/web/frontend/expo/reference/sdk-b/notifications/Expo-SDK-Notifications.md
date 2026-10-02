---
tags: [expo, expo-sdk, notifications]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Notifications 설정과 Push Token"]
---

# Expo SDK Notifications 설정과 Push Token

expo-notifications는 Android/iOS의 local scheduling, remote push token, presentation과 interaction을 제공한다. npx expo install expo-notifications 후 namespace import한다. Android SDK53+ Expo Go remote push는 불가, local notifications는 가능하며 development build로 remote를 검증한다. Google Play services Android emulator, Xcode14+/macOS13+/iOS16+ simulator도 source의 지원 조건에 포함되지만 native credentials/runtime 구성을 확인한다.

## Native plugin과 permissions

plugin icon은 Android96x96 white/transparent PNG, color default white, defaultChannel은 FCMv1, sounds는 bundled local filenames(.wav권장), enableBackgroundRemoteNotifications=false는 iOS UIBackgroundModes remote-notification을 추가한다. native config는 rebuild가 필요하며 Android debug push launch splash issue는 release에서 확인한다. iOS aps-environment development가 archive에서 production으로 바뀌는 build flow를 확인한다.

Android RECEIVE_BOOT_COMPLETED는 schedule 복원용 자동추가, Android12/API31 exact scheduling은 SCHEDULE_EXACT_ALARM 설정/OS 권한이 필요하다. Android13 notification prompt가 뜨도록 channel을 먼저 만들고 token을 얻는다. iOS getPermissionsAsync/requestPermissionsAsync():Promise<NotificationPermissionsStatus>는 root status보다 ios.status를 함께 본다. NOT_DETERMINED0/DENIED1/AUTHORIZED2/PROVISIONAL3(비방해 알림)/EPHEMERAL4(일시 권한)을 구분한다. request default는 alert/badge/sound이며 allowProvisional/allowCriticalAlerts/allowDisplayInCarPlay/provideAppNotificationSettings도 선택한다. critical/CarPlay는 별도 entitlement/approval 조건이지 flag만으로 허용되지 않는다.

status는 canAskAgain/granted/expires, Android importance/interruptionFilter, iOS allowsAlert/Badge/Sound/CriticalAlerts/DisplayOnLockScreen/NotificationCenter/CarPlay/Announcements/Previews, alertStyle와 settings 제공 여부를 포함한다. 사용자의 channel/focus/silent 설정이 실제 표시와 소리를 제한한다.

## Token 취득과 lifetime

getDevicePushTokenAsync():Promise<DevicePushToken>은 native FCM/APNs {type:android|ios, data:string}, getExpoPushTokenAsync({projectId,...}):Promise<{type:'expo', data:string}>는 Expo backend에 등록한다. 둘은 service가 다르므로 send target을 혼동하지 않는다. Expo 요청은 offline/HTTPS/timeout failure로 reject할 수 있어 catch 후 연결 복구시 retry한다.

```ts
await Notifications.setNotificationChannelAsync('messages', {
  name:'메시지', importance:Notifications.AndroidImportance.DEFAULT
});
const permission = await Notifications.requestPermissionsAsync();
if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
  const token = await Notifications.getExpoPushTokenAsync({projectId});
  await registerTokenForCurrentSession(token.data);
}
```

ExpoPushTokenOptions는 explicit projectId 권장, applicationId(default nativeID), devicePushToken(existingtoken), iOS development(sandbox/production), deviceId와 endpoint baseUrl/url/type override다. endpoint override는 기본 사용 흐름과 구분한다. token은 app/user/installation mapping과 signout lifecycle을 backend에서 관리하고 로그에 공개하지 않는다.

addPushTokenListener(callback)→subscription.remove()는 token rotation을 통지한다. callback 안의 getDevicePushTokenAsync는 다시 listener를 trigger해 loop를 만들 수 있으므로 제공된 token을 사용한다. subscribeToTopicAsync/unsubscribeFromTopicAsync→Promise<null>는 native service topic 기능이며 source의 per-platform 배지를 확인한다. unregisterForNotificationsAsync():Promise<void>는 registration 해제 surface다. topic/client token을 backend authorization 증거로 사용하지 않는다.

상세 수신/표시/작업은 [[Expo-SDK-Notifications-Events]], local schedule은 [[Expo-SDK-Notifications-Scheduling]], channel/category는 [[Expo-SDK-Notifications-Channels]]에 있다.

## 출처

- [Expo Documentation, Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

## 관련 문서

- [[Expo-SDK-Notifications-Events]]
- [[Expo-SDK-Notifications-Scheduling]]
- [[Expo-SDK-Notifications-Channels]]
- [[Expo-Integrations-Push-Purchases]]
