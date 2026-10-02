---
tags: [expo, expo-router, stack]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router Stack 화면과 history"]
---

# Expo Router Stack 화면과 history

Stack은 React Native Screens를 통한 native stack을 구성한다. Android는 기존 화면 위, iOS는 오른쪽에서 들어오는 기본 전환을 사용하며 정확한 표현은 OS와 presentation에 따른다. layout의 `<Stack />`는 파일을 자동 등록하고 Stack.Screen은 선택한 route의 옵션을 조정한다.

## Screen API

| prop | 계약 |
| --- | --- |
| `name` | layout 안에서 필수 route name, 화면 안의 자기 옵션 설정에서는 생략 |
| `options` | 객체 또는 layout 전용 `({ route, navigation }) => options` |
| `initialParams` | layout에서 초기 parameter 설정 |
| `listeners` | layout의 screen별 event callback 객체/함수 |
| `redirect` | layout에서 가까운 sibling으로 이동, 모두 redirect면 layout이 null |
| `getId({ params })` | screen identity를 정하는 string/undefined |
| `dangerouslySingular` | layout에서 기존 screen 재사용/중복 정리 |

화면 안에서는 `<Stack.Screen options={{ title: value }} />`로 동적 옵션을 설정하고 함수형 options는 사용하지 않는다. 공통 옵션은 Stack.screenOptions에 둔다. SDK 55 이후 composition API도 사용할 수 있지만 alpha이며 breaking change 가능성이 있다. Header, Title, BackButton과 Toolbar의 세부 계약은 연결 문서로 분리했다.

## push identity와 dismiss

Stack은 같은 screen의 중복 push를 기본적으로 억제할 수 있다. ID 생성으로 별도 instance를 허용할 수 있지만 guide의 Date.now 예시는 매번 새로운 화면을 만드는 정책이며 사용자 ID별 단일 screen 정책과 다르다. SDK 57 reference의 singular 옵션과 현재 사용 버전의 동작을 확인한다. reference의 dangerouslySingular 설명 아래 deprecated 문장이 자기 이름을 가리키는 오류가 있어 그 문장만으로 옵션 자체가 폐기됐다고 판단하지 않는다.

| imperative API | 결과 |
| --- | --- |
| `dismiss(count = 1)` | 가장 가까운 Stack에서 지정 개수 제거, 하나뿐이면 Stack 자체 dismiss |
| `dismissTo(href)` | history에서 href까지 제거, 없으면 현재 화면을 href로 replace |
| `dismissAll()` | 가장 가까운 Stack 첫 화면만 남김 |
| `canDismiss()` | Stack history가 둘 이상인지 boolean |

back은 현재 navigator, dismiss는 가까운 Stack을 대상으로 하므로 nested navigator에서 결과가 다를 수 있다. history `/one → /two → /three`에서 dismissTo('/one')은 두 screen을 제거하고 dismissTo('/four')는 마지막만 교체한다.

## 화면, gesture와 시스템 옵션

`animation`은 default/fade/fade_from_bottom/flip/simple_push/slide_from_bottom/slide_from_right/slide_from_left/none을 선택한다. `animationTypeForReplace`는 push/pop이며 SDK57 Reference 기본 pop과 guide의 push가 다르다. 명시 설정을 권장한다. iOS `animationDuration`은 SDK57 Reference 기본 500ms, guide 기본 350ms로 불일치하며 일부 animation만 조정한다. default/flip 및 modal/formSheet 등의 duration은 바꿀 수 없다.

`gestureEnabled`는 iOS back gesture, `fullScreenGestureEnabled`는 전체 화면 swipe다. SDK57 Reference는 iOS18 이하 false, iOS26 이상 true 기본값을 표기한다. guide의 일괄 false와 다르다. full-screen은 플랫폼 제약으로 기본 iOS animation을 그대로 재현하지 못한다. Android animation의 ios_from_right/ios_from_left는 iOS와 비슷한 전환을 제공한다. gestureResponseDistance는 gesture 응답 영역이고 keyboardHandlingEnabled 기본 false는 transition 중 keyboard 처리 설정이다. `gestureDirection: 'vertical'`은 full-screen, custom gesture animation과 slide_from_bottom 조합을 설정한다. `animationMatchesGesture`는 modal에 영향이 없고 `fullScreenGestureShadowEnabled`는 full-screen gesture의 그림자이며 iOS26에서는 deprecated다.

`contentStyle`, `orientation`, `autoHideHomeIndicator`, `navigationBarHidden`과 statusBarStyle/Hidden/Animation은 화면과 시스템 UI를 바꾼다. Android SDK 35 이후 edge-to-edge 때문에 navigationBarColor, statusBarBackgroundColor, statusBarTranslucent는 deprecated되어 과거 효과를 보장하지 않는다. iOS status bar 제어에는 view-controller 기반 appearance 설정이 필요하다.

sheetElevation 기본 24는 동적 변경되지 않는다. sheetResizeAnimationEnabled는 fitToContents resize animation, sheetShouldOverflowTopInset은 detent 높이를 full stack 또는 inset 제외 높이로 계산하는 정책이다. 나머지 sheet 계약은 [[Expo-Router-Modals]]에 있다.

`freezeOnBlur`는 inactive render를 멈추며 state/effect cleanup 기반 Activity와는 다르다. `scrollEdgeEffects`는 iOS 26 이상 각 edge에 automatic/hard/soft/hidden을 지정한다. nested navigator는 가장 안쪽 설정을 사용하고 blurEffect와 동시 사용하면 효과가 겹칠 수 있다.

## Liquid Glass와 테마

iOS 26 header는 시스템 Liquid Glass를 사용한다. compatibility infoPlist는 Expo Go에서 사용할 수 없는 임시 global opt-out이며 미래 OS 지원을 영구 가정하지 않는다. JavaScript stack(`expo-router/js-stack`)을 선택하면 header 제어는 늘지만 native controller의 성능 이점을 포기한다.

화면 간 흰 flash와 dark mode toolbar 깜박임은 ThemeProvider를 앱 UI와 맞춰 줄일 수 있다. large title collapse에는 ScrollView/FlatList가 화면의 첫 자식이어야 하며 필요한 wrapper는 collapsable=false로 보존한다.

## 출처

- [Expo Documentation, Stack](https://docs.expo.dev/router/advanced/stack)
- [Expo Documentation, Router Stack](https://docs.expo.dev/versions/latest/sdk/router/stack)

## 관련 문서

- [[Expo-Router-Stack-Header]]
- [[Expo-Router-Stack-Toolbar]]
- [[Expo-Router-Modals]]
