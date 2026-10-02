---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Calendar event, recurrence와 system dialog 결과"]
---

# Calendar event, recurrence와 system dialog 결과

## Event와 Reminder 변경

ExpoCalendarEvent.get(id)는 missing에서 throw 한다. Event는 id/calendarId/title/startDate/endDate/timeZone/allDay/location/notes/alarms/recurrenceRule/availability/status를 가지며 iOS url,creationDate,lastModifiedDate,originalStartDate,isDetached,readonly organizer와 Android endTimeZone,accessLevel,guest permissions,organizerEmail,originalId,volatile instanceId를 구분한다. organizer는 서비스 calendar의 읽기 전용 필드다. instanceId는 recurring instance의 영구 identity가 아니다.

event.update(details)는 title/location/timeZone/url/notes/alarms/recurrenceRule/availability/startDate/endDate/allDay를 수정하고 explicit null은 값을 제거한다. delete는 Promise<void>다. getOccurrenceSync({instanceStartDate,futureEvents})는 particular recurring instance를 선택한다. 첫 occurrence가 필요하지 않으면 instanceStartDate를 명시한다. 원문의 method signature만 으로 event.delete가 series 어디까지 영향을 주는지 단정하지 않고 occurrence 선택과 platform 동작을 확인한다.

Reminder는 iOS만 제공한다. ExpoCalendarReminder.get/update/delete,calendar.createReminder/listReminders를 사용한다. startDate/dueDate/completed/completionDate/alarms/recurrenceRule/title/location/notes/timeZone/url을 다루며 completionDate를 nonnull로 설정하면 completed=true가 된다. Android에 같은 Reminders record 기능이 있다고 가정하지 않는다.

## Attendee와 alarm

event.getAttendees()는 Attendee 객체 배열,createAttendee는 객체를 반환한다. attendee.update/delete는 **Android 전용**이다. name/role/status/type와 Android email/id,iOS isCurrentUser/url을 구분한다. current createAttendee generated heading에 는 양쪽 플랫폼이 표기되고 legacy에서는 Android 전용이므로 legacy의 지원 제한을 current mutation 전체로 추론하지 않는다. allowedAttendeeTypes/Availabilities/Reminders는 calendar 마다 확인한다.

Alarm.relativeOffset는 event start에 대한 **분**,음수는 이전이다. iOS absoluteDate는 relativeOffset/structuredLocation보다 우선한다. Android method는 alarm/alert/default/email/sms이고 iOS는 notification이다. structuredLocation은 coords/radius/proximity/title이다. Availability는 busy/free/tentative와 iOSunavailable/notSupported,EventStatus는 none/confirmed/tentative/canceled 다.

## RecurrenceRule

frequency는 daily/weekly/monthly/yearly,interval 기본1,occurrence는 횟수,endDate와 함께주면 endDate가 우선한다. iOSdaysOfTheWeek는 Sunday1~Saturday7과 weekNumber(-53~53,0ignored),daysOfTheMonth(-31~31,0 제외,monthly),daysOfTheYear(-366~366,yearly),monthsOfTheYear1~12,weeksOfTheYear(-53~53),setPositions(-366~366)을 지원한다. negative는 끝에서센위치다. frequency와 관련없는 option을 섞지않는다. 원문의 setPositions를 매두번째 Mondayinterval 처럼설명한부분은 positionfilter와 interval을 혼동할수있어그대로권장예제로사용하지 않는다. RecurringEventOptions.futureEvents는 선택 instance이 후도적용할지정한다.

## system UI와 결과의 한계

calendar.addEventWithForm(options)는 prefill title/start/end/allDay/location/notes/recurrenceRule/iOSalarms/url와 presentationoption 으로 OScreateUI를 연다. classmethod는 최소 write-onlypermission을 요구한다. event.editInCalendar/openInCalendar는 edit/delete 또는 previewUI 다. iOS는 EKEventView/EditController,Android는 calendaractivity 다.

DialogEventResult는 action/id 다. **Android action은 항상 done,id는 null이며 saved/canceled/deleted를 구분할수없다**. iOSsaved/canceled/deleted와 permittedsavedid를 받는다. openresult는 done/canceled/deleted/responded 다. AndroidstartNewActivityTask 기본 true는 activity를 연자마자 done 으로 resolve 하므로저장완료 signal로 쓰지않는다. iOSallowsEditing/CalendarPreview 기본 false이며 editing은 user-createdcalendar,preview는 invitation에 적용된다. 마지막 action이 canceled 여도그전에수정저장되었을수있다. 필요하면 data를 다시조회한다.

- [Expo Documentation, Calendar](https://docs.expo.dev/versions/latest/sdk/calendar/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
