---
tags: [expo, expo-sdk, notifications]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Android Channel과 Interactive Category"]
---

# Expo SDK Android Channel과 Interactive Category

Android8/API26+ 알림은 channel을 사용한다. 명시하지 않으면 Miscellaneous fallback이 생긴다. 사용자는 channel의 표시/sound/importance를 바꿀 수 있으며 source의 enum 숫자를 Android raw platform constants와 직접 치환하지 않는다.

## Channel과 group

setNotificationChannelAsync(id, input):Promise<NotificationChannel|null>는 name/importance(required)와 description/groupId/sound/audioAttributes/bypassDnd/enableLights/lightColor/enableVibrate/vibrationPattern/lockscreenVisibility/showBadge를 설정한다. 생성 후 앱은 name/description만 바꿀 수 있다. sound를 바꾸려면 기존 channelID update만으로 적용될 것으로 기대하지 않는다. custom sound는 plugin에 bundle하고 base filename을 content(구형 Android)/channel(Android8+) 양쪽에 설정한다.

getNotificationChannelAsync(id)→channel|null, getNotificationChannelsAsync()→channel[], deleteNotificationChannelAsync(id)→void를 제공한다. group은 setNotificationChannelGroupAsync(id,{name, description})→group|null, get...GroupAsync/get...GroupsAsync, delete...GroupAsync다. group 삭제는 소속 channels도 삭제한다. unsupportedplatform에서는 null/[]/no-op이다. Channel output sound는 default/custom/null이며 input filename과 shape가 다르다.

AndroidImportance는 UNKNOWN/UNSPECIFIED(compat)/NONE/MIN/LOW/DEFAULT/HIGH/MAX, priority는 min/low/default/high/max, visibility는 UNKNOWN/PUBLIC/PRIVATE/SECRET다. audioAttributes는 contentType(unknown/speech/music/movie/sonification), usage(media/voice/alarm/notification등), flags(enforceAudibility, hardwareAVsync)다. 높은 importance가 permission/focus 정책을 우회하지 않는다.

## Category와 action

setNotificationCategoryAsync(identifier, actions, options?):Promise<Category>를 먼저 등록하고 content.categoryIdentifier로 연결한다. identifier에 : 또는 -를 쓰면 잘 동작하지 않을 수 있다. getNotificationCategoriesAsync()→Category[], deleteNotificationCategoryAsync(id)→boolean(없는 id면 false)이다.

```ts
await Notifications.setNotificationCategoryAsync('messageActions', [{
  identifier:'reply',buttonTitle:'답장',textInput:{placeholder:'내용',submitButtonTitle:'보내기'},
  options:{opensAppToForeground:true,isAuthenticationRequired:true,isDestructive:false}
}]);
```

action은 identifier/buttonTitle, options{isAuthenticationRequired, isDestructive, opensAppToForeground}, textInput{placeholder, submitButtonTitle}다. response.actionIdentifier/userText로 command를 구분하며 중요한 write는 사용자 auth/backend 검사를 별도로 거친다.

iOS category options는 customDismissAction=false(명시적 dismiss만, 무시하거나 banner를 밀기 제외), previewPlaceholder, showTitle/showSubtitle=false, categorySummaryFormat, intentIdentifiers[], allowInCarPlay=false(approval 필요)다. allowAnnouncement는 deprecated/ignored다. preview 비활성 상태에서도 title/subtitle를 표시하는 옵션은 사용자의 민감 내용 노출 선택과 함께 검토한다. categories/channels를 같은 concept로 취급하지 않는다.

## 출처

- [Expo Documentation, Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

## 관련 문서

- [[Expo-SDK-Notifications]]
- [[Expo-SDK-Notifications-Events]]
- [[Expo-SDK-Notifications-Scheduling]]
