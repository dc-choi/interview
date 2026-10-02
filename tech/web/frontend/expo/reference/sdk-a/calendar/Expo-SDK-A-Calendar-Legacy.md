---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Calendar legacy ID API와 permission 없는 dialog"]
---

# Calendar legacy ID API와 permission 없는 dialog

## entrypoint와 데이터 API

`import * as Calendar from 'expo-calendar/legacy'`는 ID 기반 Promise API 다. legacy 페이지에는 ExpoGo 포함으로표기되어있고 currentclass는 developmentbuild 필요로표기되므로실제 binary의 module 지원과 entrypoint를 구분한다. root의 동명 deprecated 함수는 throw 한다. 동일 packageplugin/nativeusage 설정은 current [[Expo-SDK-A-Calendar]]의 iOS17full/write-only 기준과함께확인한다. legacy 페이지의옛 usagekey 목록만으로현재 OS 설정완료를단정하지 않는다.

getCalendarsAsync(entityType)는 plainCalendar 배열이다. iOSentityTypeevent/reminder를 생략하면양쪽 permission 필요다. createCalendarAsync/updateCalendarAsync는 IDstring,deleteCalendarAsync는 관련 events/reminders/attendees도 삭제한다. iOSgetDefaultCalendarAsync/getSourcesAsync/getSourceAsync는 source를 조회한다. Android 새 calendar는 localaccountsource 또는기기실제 account와 일치하는 source가 필요하다. get/requestCalendarPermissionsAsync와 iOSget/requestRemindersPermissionsAsync,permissionhooks를 사용한다. isAvailableAsync는 platformAPI 존재만확인하며 permission을 검사하지 않는다.

## Event, attendee와 recurring ID

createEventAsync(calendarId,details)/updateEventAsync(id,details,recurringOptions)는 ID를 반환하고 getEventAsync는 record,deleteEventAsync는 삭제한다. **recurringinstance는 두 platform 모두영구고유 ID가 없으므로**instanceStartDate와 seriesID를 함께선택한다. iOSfutureEvents:true는 선택 instance이 후도변경하며 false는 그 instance만 이다. property 제거는 null을 명시한다.

getEventsAsync(calendarIds,startDate,endDate)는 iOS에 서기간과조금이라도 overlap 하는 event,Android에서는 start이 상이면서 end이 하인**완전히포함된 event**만반환한다. 경계가같다고두 platform 결과가같다고가정하지 않는다. timezone과 allDayduration을 함께검증한다.

```ts
const permission = await Calendar.requestCalendarPermissionsAsync();
if (permission.granted) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter(calendar => calendar.allowsModifications);
  const events = await Calendar.getEventsAsync(writable.map(c => c.id), rangeStart, rangeEnd);
}
```

AndroidcreateAttendeeAsync/updateAttendeeAsync는 IDstring,deleteAttendeeAsync는 void 다. create가 recurringseries에 참석자를추가하면모든 instance에 적용된다. getAttendeesForEventAsync는 양쪽에서 recurring 옵션으로특정 instance를 조회한다. iOSReminders는 createReminderAsync(calendarId|null,record),get/update/deleteReminderAsync,getRemindersAsync를 사용한다. calendarIdnull은 OSdefaultremindercalendar 다. status가 정해지면 start/end도 필요하며 periodoverlap을 조회한다. remindercompletionDate는 completed를 true로 바꾼다.

record의 calendar/source/event/reminder,alarm,recurrence와 enum 지원은 [[Expo-SDK-A-Calendar-Events]]를함께참조한다. readonlyorganizer를 생성하지않으며 AndroidinstanceId는 volatile이다.

## user-mediated dialog

createEventInCalendarAsync(eventData,presentationOptions)는**iOS와 Android에서 systemUI만 으로생성할 때 permission을 요청하지않아도되는 legacy 경로**다. 데이터직접읽기/쓰기는별도 permission이 필요하다. editEventInCalendarAsync({id,instanceStartDate},options)는 Android에서 open과 같다. openEventInCalendar(id)는 Androidintent만 보내는 void,openEventInCalendarAsync는 결과 Promise 다.

Androiddialogdone은 저장여부를알수없고 idnull이다. startNewActivityTask 기본 true 면 activity 열자마자 resolve 한다. iOSsaved/canceled/deleted/responded와 editing/preview 조건은 currentdialog과 같이확인한다. user가 저장한뒤 dismiss 하면최종 canceled가 올수있으므로 cancel 결과를변경없음의증거로쓰지않는다. legacyUI와 currentcalendar.addEventWithForm의 minimumwrite-onlyrequirement를 같은계약으로합치지않는다.

## 출처

- [Expo Documentation, Calendar (legacy)](https://docs.expo.dev/versions/latest/sdk/calendar-legacy)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
