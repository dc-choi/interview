---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native theme 상태와 native color

React Native 0.87 기준이다.

Appearance는 현재 light/dark/null 상태와 변경 구독을 제공한다. React component는 useColorScheme hook으로 구독해 theme가 바뀔 때 다시 렌더한다. module 상단에서 한 번 읽고 영구 cache하면 시간대별 system theme 전환이나 앱 override를 놓칠 수 있다.

## 앱 override와 system preference

setColorScheme은 앱과 해당 native control의 interface style을 바꾸며 OS 전체 설정이나 다른 앱을 바꾸지 않는다. light/dark로 고정하고 auto로 system preference를 다시 따른다. unspecified는 deprecated alias다. native module이 없을 때 null이 반환될 수 있어 fallback UI를 둔다. addChangeListener의 subscription은 수명이 끝나면 remove한다.

Android theme preference는 API 29 이상, iOS는 13 이상에 대응한다. iOS screenshot 과정에서 양쪽 theme snapshot과 비동기 UI 갱신 때문에 잠시 flicker가 생길 수 있다.

## native 색과 앱 색

PlatformColor는 해당 OS에 존재하는 native color/token 이름을 받는다. 여러 이름은 첫 값을 기본으로, 나머지를 fallback으로 시도한다. iOS UIColor 이름과 Android ?attr/@android:color 이름을 플랫폼 분기 안에서 사용해 다른 OS의 이름을 그대로 전달하지 않는다.

DynamicColorIOS는 light/dark 필수 색과 선택적인 highContrastLight/Dark를 받는 iOS 전용 값이다. contrast 값이 없으면 대응 일반 색을 사용한다. system이 runtime appearance/접근성 조건에 맞게 고른다. 브랜드 색을 system 변화에 맞출 때 유용하며 모든 platform의 공통 API로 쓰지 않는다.

## 출처

- [React Native, appearance](https://reactnative.dev/docs/appearance)
- [React Native, usecolorscheme](https://reactnative.dev/docs/usecolorscheme)
- [React Native, platformcolor](https://reactnative.dev/docs/platformcolor)
- [React Native, dynamiccolorios](https://reactnative.dev/docs/dynamiccolorios)

## 관련 문서

- [[RN-Colors]]
- [[RN-Basic-Controls]]
- [[RN-Status-Bar]]
