---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo brownfield isolated artifact 통합"]
---

# Expo brownfield isolated artifact 통합

## producer Expo 프로젝트

별도 Expo project에서 `expo-brownfield`를 설치한다. config plugin은 native library target과 publishing을 생성한다. iOS targetName/bundleIdentifier, Android libraryName/group/package/version을 지정할 수 있다. default는 scheme/slug 등 app config에서 파생된다.

```sh
npx expo install expo-brownfield
npx expo-brownfield build:android
npx expo-brownfield build:ios --release --package CatalogArtifacts
```

Android는 AAR를 생성해 기본 local Maven `~/.m2` 또는 설정한 remote repo에 publish한다. Maven coordinate는 실제 group/libraryName/version과 맞춘다. 예제 coordinate를 custom plugin 옵션과 다른 값으로 복사하지 않는다.

iOS는 device/simulator architecture를 XCFramework로 묶고 Hermes framework를 포함해 기본 `artifacts/`에 출력한다. `--package [name]`은 Package.swift와 필요한 XCFramework들을 가진 self-contained Swift Package로 만든다. 이름 생략 시 TargetNameArtifacts를 사용한다. debug/release는 host configuration과 맞는 artifact를 선택한다.

## Android host

Gradle에 Maven repository와 정확한 coordinate dependency를 추가한다. local artifact면 mavenLocal()을 연결한다. 생성 package의 `BrownfieldActivity`를 상속한 Activity에서 `showReactNativeFragment()`를 호출해 RN 화면을 연다. 이 wrapper는 AppCompatActivity 기반이며 config change 전달/back handling을 연결한다.

Manifest에는 새 activity, NoActionBar theme와 keyboard/orientation/screenSize/uiMode 등 필요한 configChanges를 선언한다. host의 native navigation에서 Intent로 연다. 파일 import의 package는 plugin의 generated package와 맞춘다.

## iOS host

기본 XCFramework는 앱 target의 Embed & Sign으로 추가한다. Swift Package 출력은 Xcode local package dependency로 넣고 aggregate library product로 linking한다. app lifecycle 초기에 `ReactNativeHostManager.shared.initialize()`를 호출한다.

```swift
let screen = ReactNativeViewController(
  moduleName: "main",
  initialProps: ["itemId": "42"],
  launchOptions: [:]
)
```

UIKit은 ViewController push/present, SwiftUI는 `ReactNativeView(moduleName:"main")`을 sheet/fullScreenCover 등에 넣는다. initialProps와 launchOptions는 초기 bridge 입력이며 계속 공유되는 native state로 가정하지 않는다.

## 생성 native code와 debug/release

Prebuild를 실행하면 Android library module의 HostManager, Activity/Fragment/ViewFactory/Messaging과 iOS framework target의 HostManager/ViewController/SwiftUI View/Delegate/Messaging을 조사할 수 있다. native 디버깅용 generated code와 producer의 유지할 소스를 구분한다.

Debug artifact는 Expo project에서 Metro를 실행하고 native host에서 RN 화면을 열어 load한다. Release artifact는 embedded JS bundle로 실행하므로 Metro가 없어야 한다. release artifact version, native/JS 호환, host의 missing framework와 lifecycle forwarding을 실제 기기에서 확인한다. artifact 생성 성공만으로 host 통합 성공을 판단하지 않는다.

## 출처

- [Expo Documentation, How to add Expo to a native app using the isolated approach](https://docs.expo.dev/brownfield/isolated-approach)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
