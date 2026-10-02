---
tags: [expo, expo-sdk, system]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 화면 sleep 방지"]
---

# Expo 화면 sleep 방지

expo-keep-awake는 Android/iOS/tvOS/web와 Expo Go의 screen sleep을 방지한다. `useKeepAwake(tag?, options?)`는 component mount 동안 lock을 유지하고 unmount에 해제한다. 화면이 mount된 채 blur될 수 있어 Router에서 focus와 mount의 차이를 고려한다.

imperative activateKeepAwakeAsync(tag?)와 deactivateKeepAwake(tag?)는 Promise<void>다. deprecated activateKeepAwake 대신 Async를 사용한다. 같은 tag로 해제하며 여러 tag가 있으면 모두 해제해야 screen sleep이 돌아온다. default imperative tag는 ExpoKeepAwakeTag(ExpoKeepAwakeDefaultTag), hook 무인수 tag는 component별 unique ID다.

```tsx
function ReadingScreen() { useKeepAwake('reader'); return <Text>본문</Text>; }
```

isAvailableAsync는 지원 boolean이고 unsupported web browser는 false다. addListener(tagOrListener, listener?)는 web의 active tab/window 변경을 관찰하며 native는 no-op이다. KeepAwakeEvent.state는 release, options.listener는 web-only다. suppressDeactivateWarnings는 원래 Android Activity가 죽은 뒤 deactivate의 unhandled rejection을 억제한다. screen sleep 방지는 background execution/CPU lock이나 network task를 보장하지 않는다. 문서의 alert 직후 활성화 예제는 Promise 완료를 기다리지 않은 UX라 결과를 await/catch한다.

## 출처

- [Expo Documentation, KeepAwake](https://docs.expo.dev/versions/latest/sdk/keep-awake)

## 관련 문서

- [[Expo-SDK-Sensor-Light-Magnetic]]
- [[Expo-Router-Hooks]]
