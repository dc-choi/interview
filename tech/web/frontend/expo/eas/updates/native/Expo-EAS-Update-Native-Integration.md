---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Brownfield 앱의 EAS Update와 Android host"]
---

# Brownfield 앱의 EAS Update와 Android host

이 guide는 native Android/iOS 안에 React Native 화면을 넣는 brownfield용이다. React Native가 앱 entrypoint인 greenfield는 일반 setup을 따른다. 문서의 최소 범위는 SDK52/RN0.76 이후지만 실제 통합은 현재 Expo SDK의 지원 RN 조합을 맞춘다. 여기서는 SDK57/RN0.86 baseline이며 이전 architecture 예제를 그대로 이식하지 않는다.

## 통합 전제와 custom entry

기존 RN root view, Expo modules, expo/metro-config와 babel-preset-expo가 필요하다. 지원 플랫폼별 expo export -p android/ios가 정상이어야 한다. CodePush 등 다른 update loader를 제거하고 debug/release가 정상인 상태에서 시작한다. EAS Update URL/runtime/channel 설정은 [[Expo-EAS-Update-Setup]]을 따른다.

```ts
import App from './App';
import {registerRootComponent} from 'expo';
registerRootComponent(App);
```

native module 이름은 main으로 일치시킨다. AppRegistry를 유지하면 Expo 초기화 import가 필요하지만 원문 getApp()이 element를 반환한 뒤 component provider에 넣는 예제를 그대로 사용하지 않는다. provider는 실제 component를 반환해야 한다. 임의 entry 이름과 native getMainComponentName/root factory 이름은 서로 맞춘다.

## 자동 초기화 해제

brownfield의 custom lifecycle과 greenfield 자동 초기화가 충돌하지 않도록 Android gradle.properties에 아래 값을 설정한다.

```properties
EX_UPDATES_CUSTOM_INIT=true
```

Markdown body에 누락된 값은 공식 MDX가 참조한 eas-update-custom-initialization.diff에서 확인했다. iOS는 EX_UPDATES_CUSTOM_INIT=1로 pods를 설치한다. default greenfield 앱에 이 설정만 넣고 custom host/controller 초기화를 생략하면 update 시작이 연결되지 않는다.

## Android MainApplication와 MainActivity

MainApplication은 ReactApplication을 구현하고 reactHost를 ExpoReactHostFactory.getDefaultReactHost(context=applicationContext, packageList=PackageList(this).packages)로 만든다. onCreate에서 React Native release level을 설정하고 loadReactNative(this), ApplicationLifecycleDispatcher.onApplicationCreate(this)를 호출한다. configuration 변경도 dispatcher에 전달한다.

MainActivity는 ReactActivity를 상속하고 getMainComponentName은 JS 등록 이름과 같게 한다. createReactActivityDelegate는 ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(..., fabricEnabled))로 감싼다. 원문 getMainComponentName='App'은 registerRootComponent의 main과 자동 일치하지 않으므로 선택한 JS 등록을 기준으로 맞춘다.

```kotlin
override fun getMainComponentName(): String = "main"
```

native app의 여러 화면/host 수명, 기존 lifecycle/permission/deep link 흐름을 유지하며 wrapper를 연결한다. sample은 모든 brownfield 구조에 그대로 적용되는 완성 migration이 아니다. release bundle source와 updates launch, reload 후 host 재생성을 실제 device에서 확인해야 한다. iOS factory/controller 절차는 [[Expo-EAS-Update-Native-iOS]]에 있다.

## 출처

- [Expo Documentation, Using EAS Update in an existing native app](https://docs.expo.dev/eas-update/integration-in-existing-native-apps)

- [Expo official source, Android custom initialization diff](https://github.com/expo/expo/blob/main/docs/public/static/diffs/eas-update-custom-initialization.diff)

## 관련 문서

- [[Expo-EAS-Update-Native-iOS]]
- [[Expo-EAS-Update-Migration]]
- [[Expo-EAS-Update-Setup]]
