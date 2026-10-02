---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo brownfield integrated native build 구성"]
---

# Expo brownfield integrated native build 구성

## 프로젝트 경계

JS Expo project와 existing native source를 같은 build에 연결한다. 기본 android/ios 위치로 배치하거나 root workspace로 JS package를 연결해 custom native location을 유지한다. custom structure는 Gradle autolinking root, app projectRoot와 CocoaPods app_path를 모두 실제 JS root에 맞춰야 한다.

source를 이동하는 예제를 기존 repo에 무조건 수행하지 않는다. host build target와 signing, dependency graph를 보존하면서 integration point를 정한다.

## Android Gradle

settings.gradle의 pluginManagement는 Node require.resolve로 RN Gradle plugin과 Expo autolinking plugin 위치를 찾는다. `com.facebook.react.settings`, `expo-autolinking-settings`를 적용하고 ReactSettingsExtension의 autolink command를 Expo의 rnConfigCommand로 연결한다. `expoAutolinking.useExpoModules()`, version catalog와 RN Gradle includeBuild를 구성한다.

root/app build.gradle에 필요한 plugin과 React native bundling을 통합한다. `reactNativeArchitectures`, Hermes와 New Architecture 설정을 SDK template에 맞춘다. SDK57에서 legacy disable을 기대하지 않는다. INTERNET permission과 Debug 전용 cleartext 허용은 Metro HTTP 연결을 위한 것이며 production 전체에 cleartext를 허용하는 기본값으로 확장하지 않는다.

Application에서 RN runtime/host를 초기화한다. RN screen Activity는 `ReactActivity`를 상속하고 `ReactActivityDelegateWrapper`/DefaultReactActivityDelegate로 Expo lifecycle을 전달한다. main component name은 JS registration과 일치해야 한다. Manifest theme는 RN 화면 위에 ActionBar가 중복되지 않도록 선택한다.

## iOS pods와 build phase

Podfile은 Node resolution으로 Expo autolinking과 RN pod script를 찾고 `use_expo_modules!`, Expo react-native-config command와 `use_native_modules!`를 연결한다. `use_react_native!`에는 RN path, Hermes, 실제 app_path와 privacy aggregation을 전달한다. iOS16.4 기준을 현재 SDK/host target에 맞춰 확인하고 기존 pods/post_install을 덮어쓰지 않고 병합한다.

pod install 뒤 xcodeproj 대신 xcworkspace를 연다. template가 요구하는 `ENABLE_USER_SCRIPT_SANDBOXING:NO`와 build phase 위치를 확인한다. JS bundling run script는 Embed Pods Frameworks 이전에 두고 Expo resolveAppEntry, CLI_PATH와 export:embed로 Release JS/assets를 넣는다. `.xcode.env*`의 Node/override 환경도 함께 적용한다.

Debug는 `.expo/.virtual-metro-entry`, Release는 embedded main.jsbundle을 사용한다. Info.plist의 UIViewControllerBasedStatusBarAppearance 설정은 host의 기존 status-bar 정책과 대조한다.

## iOS 화면 생성

ViewController가 `RCTReactNativeFactory`와 delegate를 유지하고 dependencyProvider를 `RCTAppDependencyProvider`로 설정한다. rootViewFactory.view의 moduleName은 실제 등록 이름에 맞춘다. RN factory/delegate가 화면 lifecycle보다 일찍 해제되지 않게 소유한다.

예제의 ReactNativeViewController 정의와 ReactViewController 생성 이름, main/HelloWorld moduleName은 일치하도록 조정한다. source 예제를 그대로 이어 붙이면 이 불일치 때문에 compile/registration 실패가 생길 수 있다.

## debug와 release 검사

JS root에서 Expo Metro를 실행한 뒤 기존 native host를 Android Studio/Xcode로 build한다. RN 화면으로 진입해 Fast Refresh와 URL/back/lifecycle을 검사한다. Release는 Metro 없이 embedded bundle과 asset이 load돼야 한다. Expo-greenfield entry가 아닌 host라서 일반 dev-client/CNG 지침의 모든 기능이 자동 적용되지 않는다.

## 출처

- [Expo Documentation, How to add Expo to a native app using the integrated approach](https://docs.expo.dev/brownfield/integrated-approach)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
