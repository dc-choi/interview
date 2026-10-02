---
tags: [expo, expo-sdk, system]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo status bar, navigation bar와 root UI"]
---

# Expo status bar, navigation bar와 root UI

SDK57의 expo-status-bar/expo-navigation-bar는 component와 static imperative method를 제공한다. install 뒤 named StatusBar/NavigationBar를 import한다. 여러 instance는 mount 순서로 props를 merge하므로 화면 blur에도 살아 있는 component가 설정을 소유할 수 있다.

## StatusBar

StatusBar props style(auto/inverted/light/dark, 기본 auto), hidden, animated, hideTransitionAnimation(fade 기본)을 사용한다. style light는 밝은 글자를 뜻하고 auto는 theme에 맞춘다. setHidden(hidden, animation=none), setStyle(style, animated?)는 void다. old setStatusBarHidden/setStatusBarStyle는 deprecated다. tvOS에는 bar가 없고 web은 no-op/no-error라 OS bar를 바꾸지 않는다.

plugin hidden/style은 launch native 설정으로 rebuild한다. handwritten Android expoStatusBarHidden와 iOS UIStatusBarHidden를 구성한다. RN old background/translucent props를 current component 지원으로 추측하지 않는다.

## Android NavigationBar

NavigationBar props hidden와 style(auto 기본)를 사용하고 setHidden/setStyle는 void다. style 변경은 device가 button navigation이며 plugin enforceContrast=false일 때 의미가 있다. enforceContrast 기본 true는 Android10+ contrast translucent를 유지한다. Android15 emulator bug로 안 바뀌면 실기기/다른 OS를 확인한다.

source plugin hidden 설명에는 status bar라는 오기가 있지만 대상은 navigation bar다. style enum prose의 light/dark 배경 설명도 button color 설명과 혼재해 실제 대비를 확인한다. deprecated module methods setVisibilityAsync/getVisibilityAsync/useVisibility/addVisibilityListener는 제거 예정이며 event가 status visibility 변화에도 발생한다. component static setStyle와 같은 이름의 deprecated module function 설명을 import 형태와 구분한다.

```tsx
<StatusBar style="light" animated />
<NavigationBar style="light" hidden={false} />
```

## SystemUI root background

expo-system-ui는 React tree 밖 native root background와 Android userInterfaceStyle을 구성한다. getBackgroundColorAsync→ColorValue|null, setBackgroundColorAsync(color|null)→Promise<void>이며 root file에서 초기화한다. plugin은 Android userInterfaceStyle와 iOS backgroundColor app config를 binary에 반영한다. source의 iOS UIUserInterfaceStyle 예제는 appearance 설정이고 background color 자체의 XML 대체가 아니다. JSON sample의 누락 comma를 그대로 복제하지 않는다. root 배경/OS icon contrast/React component theme는 각각 별 설정이다.

## 출처

- [Expo Documentation, NavigationBar](https://docs.expo.dev/versions/latest/sdk/navigation-bar)
- [Expo Documentation, StatusBar](https://docs.expo.dev/versions/latest/sdk/status-bar)
- [Expo Documentation, SystemUI](https://docs.expo.dev/versions/latest/sdk/system-ui)

## 관련 문서

- [[Expo-Router-Stack]]
- [[Expo-Router-Color]]
- [[Expo-SDK-Gradients]]
