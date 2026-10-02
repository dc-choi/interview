---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 외부 입력 컴포넌트"]
---

# Expo 외부 입력 컴포넌트

## DateTimePicker

`@react-native-community/datetimepicker`는 Android와 iOS 시스템 날짜/시간 선택기를 노출하고 Expo Go에서 사용할 수 있다. 설치는 `npx expo install @react-native-community/datetimepicker`다. 시스템 UI를 사용하므로 플랫폼별 표시 방식과 옵션 지원을 동일하다고 가정하지 않는다.

SDK 57에는 `@expo/ui`의 DateTimePicker 대체 컴포넌트도 있다. Android는 Jetpack Compose, iOS는 SwiftUI 기반이다. 기존 컴포넌트에서 바꾸기 전 실제 사용하는 속성의 호환성을 확인한다.

## Slider

`@react-native-community/slider`는 Android, iOS, 웹에서 일정 범위의 값을 드래그로 선택한다. Expo Go에 포함되며 `npx expo install @react-native-community/slider`로 설치한다. 정확한 숫자 입력이 필요한 경우 슬라이더만으로 입력을 강제하지 않고 별도 입력 방식도 검토한다.

SDK 57의 `@expo/ui`에도 Slider 대체 컴포넌트가 있다. 컴포넌트 교체와 SDK 업그레이드는 분리해서 동작을 확인한다.

## Picker

`@react-native-picker/picker`는 Android, iOS, macOS, 웹의 선택 UI를 제공하고 Expo Go에 포함된다. `npx expo install @react-native-picker/picker`로 설치한다. 옵션 목록을 네이티브 선택기로 제공하려는 경우 사용한다. 플랫폼별 세부 props는 패키지 reference에서 확인한다.

`@expo/ui` Picker도 대안이다. 동일한 데이터에 대해 값 변경 이벤트와 선택 상태가 유지되는지 확인한 뒤 전환한다.

## SegmentedControl

`@react-native-segmented-control/segmented-control`은 Android, iOS, 웹을 지원하고 Expo Go에 포함된다. iOS에서는 `UISegmentedControl`을 사용하며 Android와 웹에서는 이를 재현한다. 세 플랫폼이 같은 네이티브 위젯을 사용한다는 뜻은 아니다.

`npx expo install @react-native-segmented-control/segmented-control`로 설치한다. 소수의 상호 배타적 선택지를 한눈에 제시할 때 적합하다. SDK 57 `@expo/ui`의 SegmentedControl 대체 컴포넌트와도 비교할 수 있다.

## PagerView

`react-native-pager-view`는 Android와 iOS에서 페이지 간 스와이프 레이아웃과 제스처를 제공한다. Expo Go에 포함되며 `npx expo install react-native-pager-view`로 설치한다.

```tsx
import { Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';

const Pages = () => (
  <PagerView style={{ flex: 1 }} initialPage={0}>
    <View key="intro"><Text>소개</Text></View>
    <View key="details"><Text>상세</Text></View>
  </PagerView>
);
```

`initialPage`는 초기 페이지를 지정한다. 각 자식 페이지를 구별할 key를 부여한다. 페이지 표시 컴포넌트와 앱의 URL/화면 내비게이션 계약은 구분한다. `@expo/ui`에도 PagerView 대안이 있다.

## 출처

- [Expo Documentation, @react-native-community/datetimepicker](https://docs.expo.dev/versions/latest/sdk/date-time-picker)
- [Expo Documentation, @react-native-community/slider](https://docs.expo.dev/versions/latest/sdk/slider)
- [Expo Documentation, @react-native-picker/picker](https://docs.expo.dev/versions/latest/sdk/picker)
- [Expo Documentation, @react-native-segmented-control/segmented-control](https://docs.expo.dev/versions/latest/sdk/segmented-control)
- [Expo Documentation, react-native-pager-view](https://docs.expo.dev/versions/latest/sdk/view-pager)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
