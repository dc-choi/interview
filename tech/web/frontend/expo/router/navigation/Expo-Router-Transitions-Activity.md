---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router transition과 Activity"]
---

# Expo Router transition과 Activity

두 기능 모두 SDK 58 이후 실험적 기능이다. SDK 57 reference의 일반 navigation/Screen options와 구분한다.

## navigation transition

React transition 안의 탐색은 다음 화면이 suspend할 동안 현재 화면을 유지할 수 있다. root layout 렌더 전에 router.setTransitionMode를 지정한다.

| mode | 동작 |
| --- | --- |
| preload-only | 기본, preload에 transition 사용 |
| always | 모든 queued navigation에 사용 |
| never | transition 사용 금지, 개별 operation도 override 못함 |

개별 router operation의 `{ inTransition: true/false }`로 선택할 수 있지만 batch에 포함된 모든 operation이 허용해야 transition이 된다. `unstable_useIsNavigating()`은 queued/pending navigation을 boolean으로 알려주며 synchronous navigation과 native back gesture를 보고하지 않는다.

## inactive content의 Activity

Activity는 state를 보존하면서 hidden subtree effect를 cleanup해 resource를 해제한다. navigator의 activityEnabled를 켜고 Screen별 boolean/양의 정수로 override한다. Stack의 true는 위에 화면이 두 개 있을 때 hide하고 `1`은 바로 focus 상실 시, `3`은 화면 세 개가 위에 있을 때다. JS/native/headless tabs와 Drawer는 focus 상실 시 숨긴다.

```tsx
<Stack activityEnabled>
  <Stack.Screen name="music" activityEnabled={false} />
  <Stack.Screen name="editor" activityEnabled={1} />
</Stack>
```

`NavigationAwareActivity hideWhenNestedAtLevel={1}`로 route의 일부만 감쌀 수도 있다. route screen 안에서 렌더링해야 한다. hidden 시 effect cleanup은 실행되지만 component state는 보존하므로 unmount와 구분한다. focus 감지로 content를 조건부 제거하는 패턴과 결과가 다르다.

## 출처

- [Expo Documentation, Configure navigation transitions](https://docs.expo.dev/router/advanced/navigation-transitions)
- [Expo Documentation, Manage inactive routes with React Activity](https://docs.expo.dev/router/advanced/react-activity)

## 관련 문서

- [[React-Activity]]
- [[React-Transitions-and-Animation]]
