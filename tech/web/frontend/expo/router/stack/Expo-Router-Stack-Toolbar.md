---
tags: [expo, expo-router, stack]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router Stack Toolbar API"]
---

# Expo Router Stack Toolbar API

Stack.Toolbar는 alpha API다. iOS SDK 55, Android SDK 56부터 사용 가능하며 web에는 native toolbar를 렌더링하지 않는다. header placement left/right와 기본 bottom이 있고 bottom은 page component 안에만 둘 수 있다. Toolbar 중첩은 허용되지 않는다.

```tsx
<Stack.Toolbar placement="right" tintColor="#155eef">
  <Stack.Toolbar.Button icon="star" onPress={toggleFavorite} accessibilityLabel="즐겨찾기" />
  <Stack.Toolbar.Menu icon="ellipsis.circle" title="Actions">
    <Stack.Toolbar.MenuAction onPress={removeItem} destructive>Delete</Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
</Stack.Toolbar>
```

위 SF Symbol 예시는 iOS용이다. Android에서는 `icon={require('./star.png')}` 또는 Material Symbols XML ImageSource로 바꾼다.

## Toolbar와 공통 items

Toolbar의 tintColor/backgroundColor는 전체 item과 menu 기본값이다. `asChild`는 left/right의 custom 영역에만 적용한다. `disableImePadding`은 Android bottom의 자동 keyboard padding을 끈다. left/right Toolbar나 SearchBar를 넣으면 headerShown이 true가 된다.

Button은 onPress, disabled, hidden, selected, accessibilityLabel/Hint와 children을 받는다. icon이 있으면 label은 시각 표시 대신 접근성 용도로 쓰일 수 있다. variant는 plain/done/prominent, tintColor/style은 개별 표현이다. separateBackground/hidesSharedBackground는 인접 항목의 Liquid Glass 배경 정책이다.

Icon은 `sf`, `src`, `xcasset`과 renderingMode를 받는다. Label은 string children, Badge는 string children과 font/color/background style이다. Badge는 left/right에서만 표시하고 Android Button의 Label primitive는 렌더링되지 않는다. Android에 text UI가 필요하면 Toolbar.View를 사용한다.

## image와 tint

Android icon은 ImageSourcePropType만 지원한다. SF Symbol 문자열을 넘겨도 원하는 icon이 생기지 않는다. `@expo/material-symbols/star.xml` 같은 개별 subpath는 사용하는 asset만 bundle하는 Android 선택지다. `process.env.EXPO_OS` 조건은 Metro가 compile-time으로 치환해 다른 platform branch를 제거할 수 있다.

iOS header icon은 SF Symbol 또는 image source, bottom SF Symbol은 icon, custom bottom image는 expo-image의 useImage 결과 SharedRef를 `image`로 준다. 이 bottom image API는 임시다. iOS image는 tintColor가 있으면 template, 없으면 original이 기본이고 Android는 template이다. `iconRenderingMode="original"`로 source 색을 보존한다.

header submenu image에는 react-native-screens 4.24.0 이상이 필요하며 SDK 55 기본 4.23에서는 별도 upgrade가 필요했다. SDK 57은 해당 이전 버전 제약과 구분한다.

## 메뉴

Menu는 children에 MenuAction 또는 nested Menu를 받으며 title/icon/image/tintColor/style/variant, disabled/hidden/destructive, accessibilityLabel/Hint를 가진다. `inline`은 submenu를 펼쳐 표시, `palette`는 한 줄 palette이며 모두 submenu용이다. elementSize(small/medium/auto/large)는 bottom menu용이다.

MenuAction의 onPress, isOn, destructive/disabled/hidden, children/icon/image, subtitle와 discoverabilityLabel은 실행과 의미를 표현한다. `unstable_keepPresented`는 선택 후 유지하지만 iOS에서 menu를 재생성해 submenu와 scroll 위치를 초기화하므로 이름 그대로 불안정한 계약이다. Android menu root/action에는 image source를 사용하고 iOS 전용 menu 표현 prop이 Android에서 같은 효과를 내는지 가정하지 않는다.

## Spacer, View와 검색

Spacer는 width/hidden/sharesBackground를 받는다. Android 모든 placement와 header에서는 고정 width를 주고 iOS bottom에서 width를 생략하면 flexible space다. View는 React Native custom component를 품고 hidden/separateBackground/hidesSharedBackground를 설정한다. reference의 View prop 블록에는 Toolbar prop이 중복되어 있으므로 직접 custom view 계약에 필요한 prop을 구분한다.

SearchBarSlot은 iOS bottom에서 Stack.SearchBar를 배치한다. hidden/separateBackground/hidesSharedBackground가 있고 separateBackground는 integratedButton 표현을 유도한다. 인접 item도 separateBackground 또는 Spacer로 분리해야 한다. Android에서는 Slot을 쓰지 않고 Stack.SearchBar를 사용한다.

테마 불일치로 iOS 26 dark mode 버튼이 깜박이거나 흰 배경이 flash하면 ThemeProvider의 DarkTheme/DefaultTheme을 실제 color scheme과 맞춘다. 큰 title collapse는 첫 ScrollView와 wrapper collapsable 조건을 확인한다.

## 출처

- [Expo Documentation, Stack Toolbar](https://docs.expo.dev/router/advanced/stack-toolbar)
- [Expo Documentation, Router Stack](https://docs.expo.dev/versions/latest/sdk/router/stack)

## 관련 문서

- [[Expo-Router-Stack]]
- [[Expo-Router-Stack-Header]]
