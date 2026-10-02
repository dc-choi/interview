---
tags: [expo, react-native, inputs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose 날짜와 시간 선택기"]
---

# Compose 날짜와 시간 선택기

`DateTimePicker`, `DatePickerDialog`, `TimePickerDialog`는 Android용 Compose 선택기다. inline 선택기는 캘린더와 내부 스크롤 입력이 유한한 수평 제약을 필요로 하므로 `Host`에 너비를 부여한다.

## Inline 선택기

| 속성 | 계약 |
| --- | --- |
| `initialDate` | 초기 ISO 문자열 또는 null |
| `displayedComponents` | `date` 기본값, `hourAndMinute`, `dateAndTime` |
| `variant` | `picker` 기본값 또는 `input` |
| `showVariantToggle` | 달력/텍스트 입력 전환 표시, 기본 true |
| `is24Hour` | 24시간 표시, 기본 true |
| `selectableDates` | `{ start: Date, end: Date }` 범위 |
| `onDateSelected` | 선택 결과 `Date`를 받는 callback |
| `color` | 일부 주요 요소의 tint |
| `elementColors` | 개별 Material 색 재정의. color보다 우선 |
| `modifiers` | Compose modifier 배열 |

Android에서 `dateAndTime`은 날짜 선택으로 대체된다. 하나의 inline 위젯으로 날짜와 시간이 함께 선택된다고 가정하지 않는다. 선택 결과를 상태로 저장할 때 문자열 입력과 `Date` 출력의 타입을 구분한다.

```tsx
<Host style={{ width: 360 }} matchContents={{ vertical: true }}>
  <DateTimePicker initialDate={new Date().toISOString()}
    displayedComponents="date" variant="picker"
    selectableDates={{ start: new Date('2026-10-01'), end: new Date('2026-10-31') }}
    onDateSelected={setDate} />
</Host>
```

## Dialog 수명

두 dialog 모두 `onDismissRequest`가 필수다. 표시 조건을 상태로 관리하고 닫기 요청을 받아 unmount한다. 공통 선택 속성은 `initialDate`, `color`, `elementColors`, `confirmButtonLabel`, `dismissButtonLabel`, `onDateSelected`다. 날짜 dialog에는 `selectableDates`, `variant`, `showVariantToggle`을 추가할 수 있다. 시간 dialog에는 `is24Hour`가 있다. 날짜 전용 속성을 시간 dialog에도 전달하는 계약은 없다.

## 요소별 색

`elementColors`를 생략한 필드는 테마를 따른다. 모든 색 값은 선택적 `ColorValue`다.

| Date picker 색 그룹 | 필드 |
| --- | --- |
| 컨테이너/제목 | `containerColor`, `titleContentColor`, `headlineContentColor`, `subheadContentColor`, `navigationContentColor`, `dividerColor` |
| 날짜와 오늘 | `dayContentColor`, `weekdayContentColor`, `todayContentColor`, `todayDateBorderColor` |
| 선택 날짜 | `selectedDayContainerColor`, `selectedDayContentColor`, `dayInSelectionRangeContainerColor`, `dayInSelectionRangeContentColor` |
| 비활성 날짜 | `disabledDayContentColor`, `disabledSelectedDayContainerColor`, `disabledSelectedDayContentColor` |
| 연도 | `yearContentColor`, `currentYearContentColor`, `selectedYearContainerColor`, `selectedYearContentColor`, `disabledYearContentColor`, `disabledSelectedYearContainerColor`, `disabledSelectedYearContentColor` |

| Time picker 색 그룹 | 필드 |
| --- | --- |
| 바탕/다이얼 | `containerColor`, `clockDialColor`, `selectorColor` |
| 다이얼 숫자 | `clockDialSelectedContentColor`, `clockDialUnselectedContentColor` |
| 오전/오후 | `periodSelectorBorderColor`, `periodSelectorSelectedContainerColor`, `periodSelectorSelectedContentColor`, `periodSelectorUnselectedContainerColor`, `periodSelectorUnselectedContentColor` |
| 시간 입력 | `timeSelectorSelectedContainerColor`, `timeSelectorSelectedContentColor`, `timeSelectorUnselectedContainerColor`, `timeSelectorUnselectedContentColor` |

## 출처

- [Expo Documentation, DateTimePicker](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/datetimepicker)

## 관련 문서

- [[Expo-UI-Compat-DateTime]]
- [[Expo-Compose-Dialogs]]
