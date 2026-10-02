---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI DatePicker, Date와 환경 설정"]
---

# Expo SwiftUI DatePicker, Date와 환경 설정

iOS와 Expo Go 전용이다. selection은 JavaScript Date, onDateChange(Date)는 변경된 선택값을 전달한다. displayedComponents 기본 ['date']이며 ['hourAndMinute'] 또는 둘 다 지정한다. title 문자열 또는 children custom label을 지원한다.

## 날짜 범위와 표시 환경

range의 start/end는 각각 선택적 Date다. datePickerStyle은 automatic/compact/graphical/wheel, disabled()는 입력을 막는다. environment('locale', localeID)는 표시 언어와 형식, environment('timeZone', IANA zone)는 표시 시간대를 바꾼다. 시간대 표현과 저장하는 Date의 시점을 구분한다. DatePicker는 주어진 폭을 채우므로 Host matchContents만 사용하지 않는다.

```tsx
import { useState } from 'react';
import { Host, DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle, environment } from '@expo/ui/swift-ui/modifiers';
export function AppointmentDate() {
  const [date, setDate] = useState(new Date('2026-10-02T09:00:00+09:00'));
  return <Host style={{ width: '100%', height: 100 }}><DatePicker
    title="예약 시간" selection={date} onDateChange={setDate}
    displayedComponents={['date', 'hourAndMinute']}
    range={{ start: new Date('2026-10-01T00:00:00+09:00') }}
    modifiers={[datePickerStyle('compact'), environment('locale', 'ko_KR'),
      environment('timeZone', 'Asia/Seoul')]} />
  </Host>;
}
```

CommonViewModifierProps를 상속한다. 현재 페이지는 범위 밖 selection의 자동 보정이나 callback 발생을 명시하지 않으므로 초기 선택과 범위를 앱에서 맞춘다.

## 출처

- [Expo Documentation, DatePicker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/datepicker)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
