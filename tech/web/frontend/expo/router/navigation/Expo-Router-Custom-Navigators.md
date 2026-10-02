---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router custom navigator 계약"]
---

# Expo Router custom navigator 계약

기본 Stack/Tabs/Drawer로 표현할 수 없는 UI가 있을 때 navigator content와 routing behavior를 분리한다. SDK 56/57은 `unstable_createStandardRouterNavigator`, `unstable_integrateWithRouter` 이름이며 SDK 58부터 stable 이름을 쓴다.

## content와 state

content component가 받는 계약은 state(index/routes), descriptors(key별 resolved options와 render), actions(navigate(name, params?)/back), emitter(emit)다. route에는 key/name/params/href가 있다. 선택된 route key로 descriptor.render를 호출하고 tab 버튼에서 actions.navigate를 실행한다.

```tsx
import { unstable_createStandardRouterNavigator, TabRouter } from 'expo-router';
function TabsContent({ state, descriptors, actions }) {
  const route = state.routes[state.index];
  return <View>
    {descriptors[route.key].render()}
    {state.routes.map(item => <Pressable key={item.key}
      onPress={() => actions.navigate(item.name)}>
      <Text>{descriptors[item.key].options.title ?? item.name}</Text>
    </Pressable>)}
  </View>;
}
export const AppTabs = unstable_createStandardRouterNavigator(TabsContent, TabRouter);
```

반환 navigator의 Screen을 layout에서 사용하고 name/options로 route를 지정한다. 위 코드는 구조를 보여주는 예시이며 필요한 React Native imports와 type은 앱에서 추가한다. StackRouter/TabRouter를 고르면 content styling과 history 규칙을 별도로 재사용할 수 있다.

SDK 58 NavigatorContentProps 두 번째 generic은 typed event map이다. `{ tabPress: { data: undefined; canPreventDefault: true } }`처럼 선언하면 emitter가 payload를 검사한다. 세 번째 인수 options.createProps는 processed state/raw dispatch로 custom prop을 만들고 네 번째 generic에 반환 props를 선언한다. raw dispatch/state는 internal 변경 위험이 있어 standard actions가 충분하면 사용하지 않는다.

## library 통합

library author는 standard-navigation의 createStandardNavigator로 framework 중립 content를 만들고 framework별 thin entry에서 integrateWithRouter를 호출한다. package exports에 기본 entry와 `/expo-router`, `/react-navigation` subpath를 연결하면 UI 구현을 공유할 수 있다.

SDK 58의 createJSStackProps/js-tabs createJSTabsProps/createNativeStackProps와 createBaseStackProps/createBaseTabProps는 built-in behavior를 전달하는 helper다. SDK 57에 존재한다고 가정하지 않는다.

## SDK 58 router 확장

extendRouterActions는 action을 처리해 result를 반환하거나 null로 거부, undefined로 base router에 위임한다. extendRouter는 actionCreators/getStateForRouteFocus/normalizeState 등의 member를 바꾸고 생략한 member는 base를 상속한다. baseRouter/options/nextKey를 제공하며 새 route를 만들 때 nextKey를 사용한다. raw route identity를 임의 상수로 덮어 history 일관성을 깨뜨리지 않는다.

## 출처

- [Expo Documentation, Custom navigators](https://docs.expo.dev/router/advanced/custom-navigators)

## 관련 문서

- [[Expo-Router]]
