---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Brownfield iOS Update controller와 root view"]
---

# Brownfield iOS Update controller와 root view

SDK53 이후, SDK57 baseline의 iOS 통합은 ExpoAppDelegate와 ExpoReactNativeFactory를 사용한다. SDK52의 EXAppDelegateWrapper/rootViewFactory 예제는 이전 경로이며 새 문서의 권장 구현으로 복제하지 않는다. EX_UPDATES_CUSTOM_INIT=1 pods 설정과 일반 Update URL/runtime/channel을 먼저 반영한다.

## Factory와 controller 초기화

AppDelegate는 ExpoAppDelegate를 상속하고 shared 접근자, launchOptions와 updatesController 참조를 가진다. CustomReactNativeFactoryDelegate는 ExpoReactNativeFactoryDelegate를 상속한다. bundleURL()은 updatesController.launchAssetUrl()이 있으면 이를, 없으면 main.jsbundle을 반환한다. sourceURL(for:)는 dev client를 위해 bridge.bundleURL ?? bundleURL()을 사용한다.

```swift
override func bundleURL() -> URL? {
  if let url = AppDelegate.shared().updatesController?.launchAssetUrl() {
    return url
  }
  return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
}
```

launch 시 factory delegate에 RCTAppDependencyProvider를 연결하고 ExpoReactNativeFactory를 저장한다. AppController.initializeWithoutStarting()은 controller를 만들되 startup을 미룬다. 기존 native app의 window/navigation을 대체해야만 하는 계약으로 sample의 CustomViewController 전체 root 교체를 해석하지 않는다. open URL는 Expo/RCTLinkingManager 경로와 기존 deep link 처리를 연결한다.

## Start와 render 순서

custom UIViewController는 AppControllerDelegate를 구현한다. appDelegate.updatesController=AppController.sharedInstance를 설정하고 delegate=self를 연결한 뒤 start()한다. appController(_:didStartWithSuccess:)가 update/embedded 준비 완료를 알린 후 저장한 factory.rootViewFactory로 root view를 생성한다.

```swift
let rootView = factory.view(
  withModuleName: "main",
  initialProperties: [:],
  launchOptions: appDelegate.launchOptions
)
```

main은 JS registerRootComponent의 등록 이름이다. AppRegistry로 App을 등록했다면 이 이름도 App이어야 한다. 원문의 설명/App/main 혼용을 그대로 연결하지 않는다. root view를 native controller에 추가하고 auto layout constraints로 safe area를 맞춘다. factory가 없으면 initialization 순서를 점검한다. success flag와 fallback/error를 UX와 telemetry에 반영하고 callback을 모든 상태에서 성공으로 취급하지 않는다.

## Native 수명과 검증 범위

여러 RN 화면을 여는 앱은 singleton controller/delegate의 소유자, 중복 start, screen 폐기와 reload host 재생성 수명을 설계한다. launchAssetUrl은 controller 준비 후 의미가 있다. 오래된 base bundle, signed update, offline/failure와 release reload를 검증한다. 이 문서는 source 계약을 정리한 것이며 Xcode build나 기존 native app 통합을 실행해 검증한 결과는 아니다.

## 출처

- [Expo Documentation, Using EAS Update in an existing native app](https://docs.expo.dev/eas-update/integration-in-existing-native-apps)

## 관련 문서

- [[Expo-EAS-Update-Native-Integration]]
- [[Expo-EAS-Update-Debug]]
