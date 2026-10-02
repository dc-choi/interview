---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native OS, package version과 surface 식별

React Native 0.87 기준이다.

Platform.OS와 Version은 OS identity다. Version은 Android 숫자(API level)와 iOS 문자열이므로 공통 숫자 비교로 처리하지 않는다. isPad/isTV/isVision과 interfaceIdiom/uiMode는 특정 UI form factor를 판단할 단서다. Vision Pro의 iPad compatibility mode는 isVision=false, isPad=true일 수 있다.

## 분기와 version

Platform.select의 우선순위는 OS key(android/ios), native, default다. style 값, component factory 등 필요한 값만 분기한다. build별 Platform.constants는 native reported version과 device/system 정보를 제공한다.

ReactNativeVersion은 **JS가 resolve한 react-native package version**이고 Platform.constants.reactNativeVersion은 **native가 보고한 RN version**이다. major/minor/patch/prerelease(null 또는 문자열), getVersionString으로 읽는다. OTA 등에서 두 version이 맞는지 확인할 때 서로 다른 출처라는 점이 중요하다.

## RootTag

RootTag는 RN surface의 native root를 가리키는 opaque identifier다. 여러 root screen에서 native navigation/analytics 호출의 소속을 구분할 때 쓴다. 일반 앱 component마다 필요한 값은 아니다.

```tsx
const rootTag = useContext(RootTagContext);
NativeNavigation.setTitle(rootTag, title);
```

NativeNavigation은 앱의 가상 예시 module이며 이 코드는 실행 검증하지 않았다. RootTag가 지금 숫자처럼 보여도 숫자 산술이나 영구 식별 계약에 의존하지 않는다. 이전 legacy context/unstable 이름 대신 RootTagContext를 사용한다.

## 출처

- [React Native, platform](https://reactnative.dev/docs/platform)
- [React Native, reactnativeversion](https://reactnative.dev/docs/reactnativeversion)
- [React Native, roottag](https://reactnative.dev/docs/roottag)

## 관련 문서

- [[RN-Platform-Code]]
- [[RN-Native-Nodes]]
- [[RN-Upgrading]]
