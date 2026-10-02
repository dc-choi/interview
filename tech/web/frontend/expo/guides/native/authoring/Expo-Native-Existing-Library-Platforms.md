---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 native library 통합과 Apple 추가 플랫폼"]
---

# 기존 native library 통합과 Apple 추가 플랫폼

## 기존 React Native library에 Modules API 추가

전체 library를 한 번에 다시 쓰지 않고 일부 함수나 lifecycle listener를 Expo Modules API로 통합할 수 있다. package 루트에 expo-module.config.json을 만들고 Gradle에 `implementation project(':expo-modules-core')`, podspec에 `s.dependency 'ExpoModulesCore'`를 추가한다.

package.json의 `expo`는 peer dependency로 둔다. 원문은 `*` 범위를 권장하고 optional peer metadata 예제를 제공한다. expo-modules-core는 development dependency로만 추가해 library를 개발한다. consumer 앱의 Expo SDK에 맞는 core는 expo package에서 제공하므로 별도 runtime core 복사본을 만들지 않는다. optional peer 표기가 실제 Expo API 호출의 runtime dependency를 제거하는 것은 아니다.

native Module subclass를 등록한다. Android modules는 package를 포함한 전체 class name, Apple은 Swift class name이다. Android build는 provider를 생성하며 iOS class/config 변경은 pod install이 필요하다. JS는 requireNativeModule에 module Name을 전달한다.

```json
{
  "platforms": ["apple", "android"],
  "apple": { "modules": ["MyModule"] },
  "android": { "modules": ["my.module.package.MyModule"] }
}
```

## macOS/tvOS 추가

Apple 공통 module config에서는 platforms와 platform key를 `apple`로 둔다. 실제 iOS/tvOS/macOS 지원 판단은 podspec의 supported platforms가 담당한다. 원문의 iOS13.4/tvOS13.4/macOS10.15 숫자는 예시이므로 현재 SDK와 dependency의 최소 OS 요구를 그대로 대체하지 않는다.

```ruby
s.platforms = { :ios => 'target-version', :tvos => 'target-version', :osx => 'target-version' }
```

앱에 react-native-macos 또는 react-native-tvos가 통합되어 있어야 한다. Expo module config만으로 새로운 platform app target이 생성되지 않는다. podspec 변경 후 Pods를 갱신한다.

UIKit 기반 iOS 코드가 AppKit/macOS나 tvOS에서 모두 작동하지 않는다. UIView/UIApplication alias와 polyfill은 일부 API 차이를 줄일 뿐이며 platform API/interaction 차이는 `#if os(iOS)`, `#elseif os(macOS)`, `#elseif os(tvOS)`로 분기한다. Android/iOS는 주 지원 플랫폼이며 추가 Apple 플랫폼은 실제 target compilation과 동작을 별도로 확인한다.

## 출처

- [Expo Documentation, Integrate in an existing library](https://docs.expo.dev/modules/existing-library)
- [Expo Documentation, Additional platform support](https://docs.expo.dev/modules/additional-platform-support)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
