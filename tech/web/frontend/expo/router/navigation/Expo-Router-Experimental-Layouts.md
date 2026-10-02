---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router ExperimentalStack과 SplitView"]
---

# Expo Router ExperimentalStack과 SplitView

## ExperimentalStack

SDK 56 이후 alpha이며 테스트용이다. React Native Screens experimental gamma stack을 사용한다. 네이티브만 새 구현이고 웹에서는 표준 Stack으로 fallback한다.

```tsx
import { ExperimentalStack } from 'expo-router';
<ExperimentalStack>
  <ExperimentalStack.Screen name="index" options={{ title: 'Home', headerShown: true }} />
</ExperimentalStack>;
```

지원 screen options는 title/headerShown/headerTransparent/headerBackVisible 네 가지다. 다른 header styling, custom header, animation/status bar, modal/transparentModal/formSheet와 detents는 개발 warning 후 무시된다. Screen/Protected 구조를 사용할 수 있고 gestureCancel, transitionStart/End(closing boolean) event를 제공한다.

Android predictive back은 app config의 android.predictiveBackGestureEnabled=true도 필요하다. **Android에서 표준 Stack과 ExperimentalStack은 같은 앱에 공존할 수 없다.** 일부 layout만 opt-in 가능하다는 일반 설명보다 이 platform 제한이 우선한다. 필요한 옵션을 지원하지 않으면 표준 Stack을 유지한다.

## SplitView

`expo-router/unstable-split-view`의 SplitView는 SDK 55 이후 iOS alpha이며 production 준비 완료 API가 아니다. 다른 platform에서는 Slot으로 fallback한다. root layout에서 사용해야 하며 Slot 외 navigator 내부, nested SplitView는 허용되지 않는다. direct child는 Column과 Inspector만 받으며 다른 child는 warning과 함께 무시된다.

Column은 main content 앞에 최대 두 열을 추가한다. Inspector는 trailing supplementary panel이고 `showInspector`로 표시를 요청한다. main content는 현재 route로 결정되므로 사이드바 Link와 global URL parameter로 선택을 연결할 수 있다.

```tsx
import { SplitView } from 'expo-router/unstable-split-view';
<SplitView topColumnForCollapsing="primary" showInspector>
  <SplitView.Column><Sidebar /></SplitView.Column>
  <SplitView.Inspector><Details /></SplitView.Inspector>
</SplitView>;
```

iPhone에서는 열이 하나씩 보이는 collapsed 표현이 된다. topColumnForCollapsing은 primary/supplementary/secondary 중 처음 보일 열을 지정하고 생략하면 system default다. ref의 `show('secondary')`는 react-native-screens 4.24 이상이 필요하다. 이전 열로 돌아가는 기본 방식은 system navigation bar back이며 더 세밀한 제어를 보장하지 않는다.

SplitView는 SplitHostProps를 상속하고 Column/Inspector는 children을 받는다. column header customization은 아직 지원하지 않는다. iOS 전용 platform color나 SafeAreaView를 사용하는 예시는 fallback platform을 별도로 처리한다.

## 출처

- [Expo Documentation, Router Experimental Stack](https://docs.expo.dev/versions/latest/sdk/router/experimental-stack)
- [Expo Documentation, Router Split View](https://docs.expo.dev/versions/latest/sdk/router/split-view)

## 관련 문서

- [[Expo-Router]]
