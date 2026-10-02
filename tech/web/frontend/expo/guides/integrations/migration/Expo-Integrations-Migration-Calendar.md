---
tags: [expo, expo-integrations, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["expo-calendar class API 이전"]
---

# expo-calendar class API 이전

expo-calendar root는 ExpoCalendar/Event/Reminder/Attendee instance 중심 stable API이고 legacy는 /legacy다. create 결과가 string ID에서 instance로 바뀌며 majority는 async, explicit Sync 함수는 동기다.

## Calendar와 Event

createCalendar는 instance, getCalendars(EntityTypes.EVENT)는 list, ExpoCalendar.get(id)는 ID를 instance로 읽는다. calendar.update/delete, iOS getDefaultCalendarSync와 presentPicker(null 취소)를 사용한다. getSourcesAsync는 getSourcesSync로 바뀌고 single source-by-ID 대체가 없다.

calendar.createEvent({title,startDate,endDate})는 Event, calendar.listEvents(start,end)는 list, listEvents([calendar1,calendar2],start,end)는 여러 calendar를 조회한다. ExpoCalendarEvent.get(id) 뒤 event.update/delete/openInCalendar/editInCalendar를 사용한다. occurrence는 getOccurrenceSync({instanceStartDate})다.

가장 큰 의미 변화는 update/delete가 반복 일정 전체 series에 적용되는 것이다. legacy의 iOS recurringEventOptions로 단일/미래 occurrence를 지정하던 처리가 없다. 메서드 이름만 바꾸면 데이터 범위가 확대되므로 occurrence 편집 요구가 있으면 legacy 유지/별 UX를 검토한다.

## Native form과 attendee/reminder

openInCalendar의 id는 instance에서 얻고 allowsEditing/allowsCalendarPreview/startNewActivityTask를 하나의 params object에 넣는다. event.editInCalendar와 calendar.addEventWithForm은 edit/create native UI다. fire-and-forget sync openEventInCalendar는 제거됐다.

event.getAttendees/createAttendee는 instance list/new attendee이며 attendee.update/delete는 Android-only다. iOS reminder는 calendar.createReminder, listReminders(start,end,status), ExpoCalendarReminder.get과 reminder.update/delete로 옮긴다. createReminder도 ID 대신 instance다.

requestCalendarPermissions/getCalendarPermissions/requestRemindersPermissions/getRemindersPermissions는 Async suffix를 제거하고 기존 useCalendarPermissions/useRemindersPermissions hook은 유지한다. permission 이름 변경이 OS permission scope/usage description까지 동일하다는 뜻은 아니다. native reference에서 지원 platform과 grant를 확인하고 클래스 참조를 JSON 저장 객체로 그대로 serialize하지 않는다.

## 출처

- [Expo Documentation, Migrate to the new expo-calendar API](https://docs.expo.dev/guides/sdk-libraries-migration/calendar)

## 관련 문서

- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-Migration-Contacts]]
