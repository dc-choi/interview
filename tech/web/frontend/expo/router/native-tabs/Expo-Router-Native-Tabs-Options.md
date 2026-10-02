---
tags: [expo, expo-router, native-tabs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 네이티브 탭 옵션과 아이콘"]
---

# Expo Router 네이티브 탭 옵션과 아이콘

## NativeTabs props

| 묶음 | 옵션과 계약 |
| --- | --- |
| back | backBehavior: history/initialRoute/none |
| bar | backgroundColor, blurEffect, shadowColor, hidden |
| color | tintColor, iconColor default/selected, labelStyle default/selected |
| badge | badgeBackgroundColor/badgeTextColor |
| Android | indicatorColor/disableIndicator, rippleColor, labelVisibilityMode auto/selected/labeled/unlabeled |
| iOS | titlePositionAdjustment horizontal/vertical, sidebarAdaptable(iPad/macOS) |
| iOS 26 | minimizeBehavior automatic/never/onScrollDown/onScrollUp |
| event | screenListeners tabPress/focus/blur, Trigger.listeners로 화면별 설정 |
| native escape hatch | unstable_nativeProps로 Screens host 전달, minor 변경/제거 가능 |

Trigger는 contentStyle의 제한된 배경/flex/padding 속성, indicator/ripple/label visibility override와 disableTransparentOnScrollEdge 등을 받는다. Trigger.unstable_nativeProps는 screen props를 덮으므로 Router 설정을 의도치 않게 바꿀 수 있다. role은 search/history/bookmarks/contacts/downloads/favorites/featured/more/mostRecent/mostViewed/recents/topRated 시스템 항목이다. iOS role의 localized title은 자유 변경되지 않고 custom icon은 system icon을 대체할 수 있다.

## 아이콘과 label

Icon은 iOS sf/xcasset, Android md/drawable, 공통 src를 사용한다. 단일 값 또는 `{ default, selected }`로 상태별 icon을 지정한다. iOS sf는 src보다 우선하고 Android md/drawable도 fallback src보다 우선한다. Android 별도 selected image는 SDK 56 이상이며 SDK 55는 같은 default icon을 사용한다.

src는 ImageSource 또는 VectorIcon ReactElement가 될 수 있다. iOS renderingMode는 template/original이다. SDK 57 reference는 색을 지정하면 template, 없으면 original로 설명하며 guide의 template 기본이라는 문장과 다르므로 실제 색 설정을 명시하는 편이 안전하다. Android image는 source 색을 유지한다.

iOS default/selected icon은 하나의 rendering mode를 공유한다. 한쪽만 color를 주면 mode가 어긋나 default mode로 맞추고 warning이 생길 수 있다. 양쪽 color 또는 명시적인 renderingMode를 지정한다. SF Symbols는 system tint를 받는다.

xcasset은 다중 해상도, dark/device asset을 쓸 수 있다. 최신 guide는 Render As asset 설정이 mode를 결정하고 renderingMode prop은 무시된다고 설명하지만 SDK 57 reference는 prop 제어를 설명한다. 이 차이는 버전별 구현 확인이 필요하므로 asset catalog 설정과 해당 SDK 실제 동작을 확인한다.

md가 outlined symbol만 제공하는 경우 filled icon은 vector font를 image로 rasterize할 수 있다. getImageSourceSync에는 icon set과 get-image native module을 포함한 development build가 필요하고 module scope에서 한 번 계산한다. NativeTabs.Trigger.VectorIcon은 family/name으로 다른 icon family를 로드하는 helper이며 일반 경우 md/sf를 우선한다.

Label은 string children, hidden과 selectedStyle이다. 생략하면 route name이 label이 된다. Badge는 string children, hidden과 selectedBackgroundColor를 사용한다. 빈 Badge의 표시 예시는 guide와 reference의 설명이 다르므로 SDK 57에서는 badge 문자열을 명시해 의미를 확정한다.

## iOS 26 accessory와 테마

Xcode 26 이상으로 빌드해야 iOS 26 전용 검색 tab, tab bar 최소화와 bottom accessory를 사용할 수 있다. search role tab 내부 Stack에 SearchBar를 두면 tab bar search를 구성할 수 있다.

NativeTabs.BottomAccessory는 mini player 같은 floating control이고 `usePlacement()`가 regular/inline을 반환한다. 두 placement instance가 동시에 렌더링되어 local state를 공유하지 않으므로 state를 parent/context로 올린다.

iOS 26 Liquid Glass bar 배경은 뒤쪽 content에서 결정된다. backgroundColor/blurEffect/shadowColor/disableTransparentOnScrollEdge는 iOS 18 이하 표현에 해당한다. JS color scheme만 바꿔도 bar 배경이 어두워지지 않을 수 있어 ThemeProvider와 Trigger.contentStyle을 실제 UI에 맞춘다. icon/label에는 DynamicColorIOS 또는 PlatformColor를 사용해 dynamic 색에 대응한다.

## 출처

- [Expo Documentation, Native tabs](https://docs.expo.dev/router/advanced/native-tabs)
- [Expo Documentation, Router Native tabs](https://docs.expo.dev/versions/latest/sdk/router/native-tabs)

## 관련 문서

- [[Expo-Router-Native-Tabs]]
- [[Expo-Router-Color]]
