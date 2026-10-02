---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Calendar current class API와 접근 권한"]
---

# Calendar current class API와 접근 권한

## current entrypoint와 build

SDK57 `expo-calendar` root는 ExpoCalendar/Event/Reminder/Attendee class API 다. Android/iOS 실제 기기용이며 **Expo Go와 Snack에서 current API는 지원하지 않는다**. development build가 필요하다. root의 deprecated `*Async` 함수는 runtime throw 하므로 기존 API는 `expo-calendar/legacy`를 import 한다. [[Expo-SDK-A-Calendar-Legacy]]는 별도 계약이다.

plugin calendarPermission은 NSCalendarsUsageDescription과 FullAccess 문구,remindersPermission은 RemindersUsageDescription/FullAccess 문구를 설정한다. locale ios matching key는 InfoPlist.strings로 생성된다. iOS17+ writeOnlyAccess:true는 WriteOnlyAccessUsageDescription을 추가하고 FullAccess를 생략하며 requestCalendarPermissions(true)로 요청한다. write-only는 **event 생성만** 허용하며 calendar 읽기/생성/수정/삭제 권한이 아니다. getCalendars/listEvents/presentPicker에 는 full access가 필요하다. Android direct data access는 READ_CALENDAR/WRITE_CALENDAR 선언과 runtime 허가가 필요하다. system UI만 쓰는 경로의 권한은 class API와 legacy UI의 차이를 확인한다.

getCalendarPermissions(writeOnly?)/requestCalendarPermissions(writeOnly?)와 iOS get/requestRemindersPermissions는 Promise<PermissionResponse>다. useCalendarPermissions/useRemindersPermissions는 `[response|null,request,get]` hook이다. canAskAgain=false 면 Settings로 안내한다. calendar와 reminder access를 같은 permission 으로 보지 않는다.

## Calendar 선택과 계정

`await getCalendars(EntityTypes.EVENT)`는 SharedObject 배열이다. iOS entityType을 생략하면 calendar/reminders 양쪽 권한이 필요하다. source usage의 missing await는 현재 Promise 계약에 맞춰 수정한다. `ExpoCalendar.get(id)`는 없으면 throw 한다. iOS getDefaultCalendarSync와 getSourcesSync는 synchronous 다. Android에 는 단일 system default/source API가 없어 getCalendars에서 writable calendar를 고르고 isPrimary/source를 확인한다. iOS presentPicker는 선택 객체 또는 취소 null이다.

```ts
import * as Calendar from 'expo-calendar';
const permission = await Calendar.requestCalendarPermissions();
if (!permission.granted) return;
const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
const selected = calendars.find(calendar => calendar.allowsModifications);
if (selected) {
  const event = await selected.createEvent({ title: '작업 확인',
    startDate: new Date('2026-10-02T09:00:00+09:00'),
    endDate: new Date('2026-10-02T09:30:00+09:00'), timeZone: 'Asia/Seoul' });
  saveEventId(event.id);
}
```

Calendar id/title/color/source/allowedAvailabilities/allowsModifications를 확인한다. Android accessLevel/allowedReminders/allowedAttendeeTypes,isPrimary,isVisible,isSynced,ownerAccount/name/timeZone와 iOS entityType/type/sourceId는 platform-specific 다. isSynced가 true가 아니면 예상치 못한 동작이 있을 수 있다. Android source의 isLocalAccount가 false 면 name/type가 실제 기기 계정과 맞아야 하며 아니면 OS가 calendar를 지울 수 있다.

## 생성, 수정과 조회

createCalendar(details)는 새 ExpoCalendar를 반환한다. update는 title/color를 바꾸고 명시 null은 property 제거다. delete는 calendar와 연결 기록 삭제 범위를 고려한다. calendar.listEvents(startDate,endDate),module listEvents(calendar IDs/objects,startDate,endDate)는 Promise<ExpoCalendarEvent[]>다. createEvent는 해당 calendar에 생성한 객체를 반환한다. 날짜는 특별히 명시되지 않으면 ISO8601이며 timezone,allDay,UTC/local 경계를 함께 정한다.

calendar.createReminder와 listReminders(startDate=null,endDate=null,status=null)는 iOS 전용이다. status는 completed/incomplete 또는 양쪽이며 기간은 overlap을 찾는다. class SharedObject는 native reference 수명을 따르므로 reference release 후 재사용하지 않는다. 서버 calendar API 나 자동 cloud sync 완료 보장이 아니라 device system records 접근이다.

- event, reminder와 recurrence 상세: [[Expo-SDK-A-Calendar-Events]]

## 출처

- [Expo Documentation, Calendar](https://docs.expo.dev/versions/latest/sdk/calendar)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
