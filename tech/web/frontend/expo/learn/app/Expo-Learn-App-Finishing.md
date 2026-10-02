---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 앱 마무리 설정과 후속 학습"]
---

# Expo 앱 마무리 설정과 후속 학습

## Status bar와 native assets

root layout의 Stack 옆에 `<StatusBar style="light" />`를 두면 tutorial의 dark background에 밝은 system text/icon을 쓴다. React Fragment로 형제를 묶으며 navigator를 제거할 필요는 없다.

app icon은 `expo.icon`의 PNG path, splash는 `expo-splash-screen` plugin의 image/background를 구성한다. example assets의 icon은1024x1024이며 generated build가 device별 sizes를 만들 수 있다. download asset와 config 경로가 실제로 일치하는지 확인한다.

Go에서 developer menu icon이 보이는 것은 production launcher icon을 검증한 것이 아니다. Splash screen은 preview 또는 production binary에서 검증한다. Go/dev-client의 자체 launch UI가 결과를 바꿀 수 있다.

## 다음 학습을 기능과 연결

| 확인할 이해 | 연결할 자료와 적용 |
| --- | --- |
| React state/render와 hooks | selection/modal/gesture 상태의 수명과 dependency 설명 |
| React Native View/Text/Platform | DOM 차이, input/permission와 platform code 분기 |
| Width/Height/Flexbox | 고정 tutorial 치수를 다양한 device로 바꾸기 |
| FlatList | stable key, list virtualization와 data update |
| Gesture Handler/Reanimated | gesture composition, shared values와 thread 경계 |
| Expo Router | root/nested layout, links와 not-found 이후 auth/deep link |
| App config/Plugins | JS 설정과 native build 적용 시점 |
| Development build | Go 밖 native code 검증과 runtime compatibility |
| EAS build/submit/update | own binary, review/production과 OTA 구분 |
| Debugging | JS/native logs, 최소 재현과 production symbols |

관련 문서를 읽는 것과 실제 기능을 설명/수정할 수 있는 것은 다르다. 예제에서 picker 취소, modal back, reset semantics, native/web 저장 실패를 설명하고 실제 재현해 이해를 확인한다. 후속 학습은 필요한 기능과 아직 이해하지 못한 경계부터 선택한다.

## 출처

- [Expo Documentation, Configure status bar, splash screen and app icon](https://docs.expo.dev/tutorial/configuration)
- [Expo Documentation, Learning resources](https://docs.expo.dev/tutorial/follow-up)

## 관련 문서

- [[Expo-Home-Splash-Icons]]
- [[Expo-Home-Safe-Areas-Bars]]
- [[Expo-Learn-EAS-Setup]]
