---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native deprecated component를 읽는 기준

React Native 0.87 기준이다. 예제는 계약을 설명하는 코드이며 앱 빌드나 기기 실행을 검증한 결과는 아니다.

deprecated 표시가 있는 컴포넌트는 메뉴에 남아 있어도 새 화면의 기본 선택으로 삼지 않는다. 기존 앱을 이해하는 계약과 신규 대안을 구분한다.

| 기존 component | 기존 역할 | 현재 문서의 대안 |
|---|---|---|
| ImageBackground | Image props를 받아 자식 콘텐츠를 이미지 위에 올린다 | View와 absolute Image 조합 |
| SafeAreaView | iOS 11 이상의 safe area padding | react-native-safe-area-context |
| DrawerLayoutAndroid | Android native drawer wrapper | react-native-drawer-layout |

## 기존 코드의 계약

ImageBackground에는 크기를 주고, wrapper style과 imageStyle을 구분한다. imageRef는 내부 Image node를 가리킨다. background-image라는 CSS 속성을 그대로 쓰는 방식은 아니다.

core SafeAreaView는 padding으로 inset을 반영하므로 사용자 padding이 무시되거나 플랫폼별 차이를 낼 수 있다. Android까지 같은 보호를 제공한다고 가정하지 않는다.

DrawerLayoutAndroid는 renderNavigationView로 drawer, direct children으로 본문을 표시한다. drawerPosition/width와 backgroundColor를 설정하고 openDrawer/closeDrawer로 조작한다. lock mode는 gesture를 막아도 프로그램 호출을 허용할 수 있다. open/close/slide/state callback과 on-drag keyboard dismissal은 기존 앱의 상태 흐름을 읽는 단서다.

대체 라이브러리를 선택할 때는 현재 framework의 navigation과 safe area 구성을 먼저 확인한다. 이미 해결하는 layer가 있다면 같은 역할을 중복 도입하지 않는다.

## 출처

- [React Native, ImageBackground](https://reactnative.dev/docs/imagebackground)
- [React Native, SafeAreaView](https://reactnative.dev/docs/safeareaview)
- [React Native, DrawerLayoutAndroid](https://reactnative.dev/docs/drawerlayoutandroid)

## 관련 문서

- [[RN-Image-Assets]]
- [[RN-Positioning]]
- [[RN-Navigation]]
