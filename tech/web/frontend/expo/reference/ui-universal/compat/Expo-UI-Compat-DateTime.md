---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community DateTimePicker declarative dialog"]
---

# Community DateTimePicker declarative dialog

## Platform과 migration

`@expo/ui/community/datetime-picker` default import를 사용한다. Android Material3 inline DateTimePicker/Dialog, iOS SwiftUI DatePicker다. web 지원은 없다. Android imperative DateTimePickerAndroid.open은 없고 component mount로 dialog를 열며 onValueChange/onDismiss에서 unmount한다. iOS presentation은 ignored, 항상 inline이다.

```tsx
{show && <DateTimePicker value={date} mode="date" presentation="dialog"
  onValueChange={(_,next)=>{setDate(next);setShow(false);}}
  onDismiss={()=>setShow(false)} />}
```

## Props와 callbacks

| API | 타입/default | 지원/의미 |
| --- | --- | --- |
| value | Date required | controlled current date |
| mode | date(default)/time/datetime | Android/iOS, countdown 없음 |
| display | default(default), spinner/compact/inline/calendar/clock union | 실제 OS 지원 subset 확인 |
| presentation | dialog(default)/inline | Android only, mount open |
| minimumDate/maximumDate | Date | selectable range |
| onValueChange | (event,date)=>void | 선택 시, date required |
| onDismiss | ()=>void | Android cancel |
| onChange | (event,date?)=>void deprecated | new specific listeners 우선 |
| accentColor | string | Android color/iOS tint |
| is24Hour | boolean | Android |
| positiveButton/negativeButton | {label:string} | Android confirm/cancel labels |
| disabled/locale/themeVariant | bool/string/light-dark | iOS |
| timeZoneName | string IANA | iOS display timezone |
| style | ViewProps style | container |
| testID | string | Android dialog에는 forwarding 안 됨 |

Android spinner는 text input이며 wheel이 아니다. prose Android supports default/spinner, iOS default/spinner/compact/inline를 명시하므로 union에 calendar/clock가 있다고 모든 style이 두 platform에서 동작한다고 해석하지 않는다.

DateTimePickerChangeEvent.nativeEvent는 timestamp:number/utcOffset:number다. deprecated event는 type set/dismissed를 더하며 iOS는 dismissed를 fire하지 않는다. old onChange cancellation에서 optional date를 그대로 setState하지 않는다.

unsupported는 minuteInterval,textColor,firstDayOfWeek,neutralButton/onNeutralButtonPress,fullscreen,title,startOnYearSelection,countdown/timeZoneOffsetInMinutes다. timeZoneName로 대체하되 지원 OS를 확인한다. 원문은 onError가 필요 없다고 설명한다. Date instant와 display timezone/calendar-day business value를 구분하고 DST/range 선택을 검증한다.

## 출처

- [Expo Documentation, DateTimePicker](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/datetimepicker)

## 관련 문서

- [[Expo-UI-Compat-Picker]]
