---
tags: [expo, expo-router, stack]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router Stack 헤더와 검색"]
---

# Expo Router Stack 헤더와 검색

## 옵션과 composition

SDK 57 Stack의 options API와 SDK 55 이후 alpha composition API를 함께 사용할 수 있다. 같은 screen에 composition instance가 여러 번 렌더링되면 tree의 마지막 instance가 우선한다.

```tsx
<Stack.Screen name="details">
  <Stack.Title large largeStyle={{ color: '#111' }}>Details</Stack.Title>
  <Stack.Header transparent blurEffect="systemMaterial" />
  <Stack.Screen.BackButton displayMode="minimal" />
</Stack.Screen>
```

Stack.Header는 `hidden`, `transparent`, `blurEffect`, `style`(backgroundColor/color/shadowColor), `largeStyle`(backgroundColor/shadowColor)을 받는다. backgroundColor가 transparent이거나 blurEffect가 있으면 transparent가 자동 활성화된다. `asChild`는 전체 custom header를 사용하므로 native large title와 search 등 기능이 없어질 수 있다.

Stack.Title은 string children, `asChild` custom title, `large`, style/largeStyle을 제공한다. style은 color/fontFamily/fontSize/fontWeight/textAlign, largeStyle에는 정렬을 제외한 글꼴 속성을 지정한다. custom title은 native title animation을 제공하지 못할 수 있다.

## header options

| option | 계약과 제약 |
| --- | --- |
| `headerShown` | 기본 표시, false로 숨김 |
| `header` | navigation/route/options/back를 받는 custom render |
| `title`, `headerTitle` | 문자열 fallback 또는 custom function, tintColor/children 전달 |
| `headerStyle`, `headerTintColor`, `headerTitleStyle` | 배경, title/back tint, 글꼴 |
| `headerBackground` | 배경 ReactElement render |
| `headerTransparent` | content 위 absolute header, inset 직접 처리 |
| `headerBlurEffect` | iOS translucent blur, transparent 필요 |
| `headerShadowVisible` | Android elevation/iOS border |
| `headerTitleAlign` | Android left/center, iOS center 고정 |
| `headerLargeTitleEnabled` | iOS 큰 제목, scrollable content와 automatic content inset 필요 |
| `headerLargeStyle`, `headerLargeTitleStyle`, `headerLargeTitleShadowVisible` | large title 배경, font와 shadow |
| `headerLeft`, `headerRight` | tintColor/canGoBack 등 callback props로 button render |
| `unstable_headerLeftItems`, `unstable_headerRightItems` | iOS 실험적 배열 items, 일반 Left/Right보다 우선 |
| `unstable_headerInsets` | Android top/left/right/bottom inset, 부모가 false면 자식이 복원 못함 |

SDK 58의 iOS `headerUserInterfaceStyle: light/dark`는 theme와 독립적인 header style이며 visible 중 변경이 지원되지 않는다. SDK 57 지원 옵션으로 혼동하지 않는다.

## back button

BackButton은 `children` title, `displayMode`, `hidden`, `src`, `style` fontFamily/fontSize, `withMenu`를 제공한다. 대응 options는 headerBackTitle/TitleStyle/Icon/Visible/ButtonMenuEnabled/ButtonDisplayMode다.

iOS displayMode default는 공간에 따라 이전 title, generic Back, icon을 선택하고 generic은 generic/icon, minimal은 icon만 사용한다. iOS 13 이하, custom font/size, long-press menu 비활성에서는 공간 기반 선택이 제한된다. headerLeft가 back을 대체하므로 함께 필요하면 headerBackVisible을 켠다. Stack의 첫 screen에는 뒤로갈 route가 없어 표시를 강제하지 못한다.

## 검색

Stack.SearchBar는 native header의 SearchBarProps를 사용하고 header를 자동 표시한다. option 기반은 `headerSearchBarOptions`다. ref methods는 focus/blur/setText/clearText/cancelSearch와 iOS toggleCancelButton이다.

입력 정책은 autoCapitalize(systemDefault/none/words/sentences/characters), autoFocus 기본 false, inputType(text/phone/number/email), placeholder다. onChangeText/onSearchButtonPress에서 `event.nativeEvent.text`를 읽고 onBlur/onCancelButtonPress로 lifecycle을 처리한다. barTintColor/tintColor/textColor/hintTextColor/headerIconColor와 shouldShowHintSearchIcon으로 표현을 바꾼다.

hideNavigationBar/obscureBackground는 system default, hideWhenScrolling은 기본 true다. disableBackButtonOverride는 back으로 search를 닫는 동작을 제어한다. iOS ScrollView는 contentInsetAdjustmentBehavior=automatic이 필요하며 scrollable이 없으면 headerTransparent=false를 사용한다.

placement는 automatic/stacked/inline/integrated/integratedButton/integratedCentered다. iOS 26 allowToolbarIntegration은 기본 true이고 stacked면 false로 처리된다. cancelButtonText는 iOS 26부터 deprecated다. bottom toolbar의 SearchBarSlot은 iOS 26에서 연결하며 Android에서는 렌더링하지 않는다.

SDK57 headerBackIcon은 `{ type: 'image', source }` object다. 예전 headerBackImageSource는 deprecated이며 headerLargeTitle도 새 large title 구성에 비해 deprecated다. 오래된 direct image source 예제를 현재 headerBackIcon 값으로 그대로 옮기지 않는다.

## 출처

- [Expo Documentation, Router Stack](https://docs.expo.dev/versions/latest/sdk/router/stack)
- [Expo Documentation, Stack](https://docs.expo.dev/router/advanced/stack)

## 관련 문서

- [[Expo-Router-Stack]]
- [[Expo-Router-Stack-Toolbar]]
