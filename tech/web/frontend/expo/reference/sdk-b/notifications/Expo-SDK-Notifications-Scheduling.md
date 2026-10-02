---
tags: [expo, expo-sdk, notifications]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Local Notification Scheduling"]
---

# Expo SDK Local Notification Scheduling

scheduleNotificationAsync({content, trigger, identifier?}):Promise<string>는 requestidentifier를 반환한다. 예약 성공이 foreground presentation을 보장하지 않으며 [[Expo-SDK-Notifications-Events]] handler가 필요하다. Android exact alarm과 OS notification permission/channel 상태도 확인한다.

## Trigger 계약

trigger=null은 즉시 delivery, {channelId}는 channel-aware immediate다. Date/epoch-number는 DATE로 처리하고 object는 SchedulableTriggerInputTypes의 type을 명시한다. 오래된 예제의 {seconds:60, repeats:true} type 누락을 current 예제로 복제하지 않는다.

| Type | 입력과 주의점 |
| --- | --- |
| TIME_INTERVAL | seconds, repeats?, channelId?; iOS 반복은 60초 이상 |
| DATE | date:Date|number, channelId?; repeats 무시 |
| DAILY | hour/minute, channelId? |
| WEEKLY | weekday1Sunday..7Saturday, hour/minute |
| MONTHLY | day/hour/minute |
| YEARLY | month0January..11December, day/hour/minute |
| CALENDAR | iOS 날짜 component match, year/month/day/hour/minute/second/weekday/ordinal/week fields/timezone/repeats |

component range 밖이면 throw한다. monthly/yearly source는 JS Date range를 명시하지만 native Calendar input의 month 기준과 같은 것으로 무조건 일반화하지 않는다. getNextTriggerDateAsync(trigger):Promise<number|null>로 다음 epoch-ms를 확인한다. null이면 해당 trigger가 실행되지 않는다. output trigger는 calendar/dateComponents, daily/monthly/weekly/yearly, timeInterval, push/location/unknown 형태이며 input과 type shape가 다를 수 있다. location output의 circular/beacon region이 current schedulable input 지원을 뜻하지는 않는다.

```ts
const id = await Notifications.scheduleNotificationAsync({
  content:{title:'예약 알림',body:'할 일을 확인하세요'},
  trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:60}
});
await Notifications.cancelScheduledNotificationAsync(id);
```

## Content와 schedule lifetime

content는 title/body/subtitle/data/badge/sound, categoryIdentifier, Android color/priority/vibrate/autoDismiss(default true)/sticky(default false), iOS attachments/interruptionLevel/launchImageName이다. sound=false는 silent, iOS custom filename은 plugin bundle 포함, defaultCritical은 critical alert entitlement, defaultRingtone은 iOS 전용이다. iOS interruptionLevel은 passive/active/timeSensitive/critical이며 OS 정책을 따른다. attachment는 identifier/url/type/typeHint/hideThumbnail/thumbnailTime/thumbnailClipArea를 설정한다. output에는 iOS threadIdentifier/summary/targetContentIdentifier등 native fields가 추가될 수 있다.

getAllScheduledNotificationsAsync():Promise<NotificationRequest[]>는 pending requests다. cancelScheduledNotificationAsync(id)/cancelAllScheduledNotificationsAsync():Promise<void>는 future scheduling을 해제하며 없는 id도 resolve한다. dismissNotificationAsync(id)/dismissAllNotificationsAsync():Promise<void>는 이미 tray에 표시된 알림을 제거한다. cancel과 dismiss를 혼동하지 않는다. getPresentedNotificationsAsync():Promise<Notification[]>는 Android API23 미만이면 빈 배열다.

getBadgeCountAsync():Promise<number>는 0이면 표시하지 않으며, setBadgeCountAsync(count):Promise<boolean>는 0으로 clear한다. iOS allowBadge 없음/Android launcher 미지원이면 write false/read 0일 수 있다. badge 0이 앱의 unread data가 0임을 증명하지 않는다.

## 출처

- [Expo Documentation, Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

## 관련 문서

- [[Expo-SDK-Notifications]]
- [[Expo-SDK-Notifications-Events]]
- [[Expo-SDK-Notifications-Channels]]
