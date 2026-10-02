---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 iOS 앱에 React Native 통합"]
---

# 기존 iOS 앱에 React Native 통합

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 통합 구조와 의존성

기존 iOS 앱에 일부 React Native 화면을 넣으려면 JavaScript 의존성, CocoaPods 구성, runtime factory와 UIKit 화면 수명을 연결한다. 기존 프로젝트를 루트의 `ios/`에 두고 루트에 package.json, Gemfile, index.js와 App.tsx를 둔다. UIViewController와 Podfile 작업에 대한 이해가 전제다.

0.87-stable Community Template의 package.json, Gemfile과 ios/Podfile을 비교해 필요한 구성을 병합한다. 기존 파일을 그대로 덮어써 다른 의존성을 잃지 않는다. `node_modules/`는 Git에서 제외한다.

- package.json은 JavaScript와 React Native 의존성을 정한다.
- Gemfile은 Ruby gem 조합을 정한다.
- Podfile은 iOS 네이티브 의존성을 연결한다. 앱 target 이름을 기존 앱에 맞춘다.
- Xcode Command Line Tools와 CocoaPods가 준비돼 있어야 한다.

```sh
cd ios
bundle install
bundle exec pod install
```

Pods 설치 후에는 생성된 `.xcworkspace`를 사용한다. Xcode 16 프로젝트의 별도 주의사항으로 페이지는 CocoaPods 1.16.2와 xcodeproj 1.27.0 조합을 제시한다. 이는 해당 예제 조건이며 실제 버전은 사용하는 Xcode와 템플릿 Gemfile을 대조한다.

## JavaScript 화면과 등록 계약

```js
import {AppRegistry} from 'react-native';
import App from './App';

AppRegistry.registerComponent('HelloWorld', () => App);
```

`index.js`는 JS 진입점이며 App.tsx의 root component를 등록한다. native factory가 요청하는 module name도 `HelloWorld`여야 한다. iOS 통합 페이지의 이전 key concepts에는 `RCTRootView`가 남아 있지만 실제 최신 절차는 `RCTReactNativeFactory`를 사용한다.

예제의 오래된 `react-native/Libraries/NewAppScreen` import는 0.87 Strict TypeScript API의 public root 계약에 맞지 않는다. 새로운 화면은 공개 Core Components로 구성한다.

## runtime factory와 UIViewController

`RCTReactNativeFactory`는 React Native 초기화와 lifecycle을 관리한다. UIWindow에 시작하거나 rootViewFactory에서 UIView를 만들어 UIViewController에 배치할 수 있다. 특정 AppDelegate에 초기화를 고정할 필요 없이 기존 앱의 적절한 화면 경계에서 사용한다.

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

class ReactViewController: UIViewController {
  var factory: RCTReactNativeFactory?
  var factoryDelegate: RCTReactNativeFactoryDelegate?

  override func viewDidLoad() {
    super.viewDidLoad()
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    factoryDelegate = delegate
    factory = RCTReactNativeFactory(delegate: delegate)
    view = factory!.rootViewFactory.view(withModuleName: "HelloWorld")
  }
}
```

factory와 delegate는 화면이 사용하는 동안 보관한다. Objective-C에서는 RCTReactNativeFactory, RCTDefaultReactNativeFactoryDelegate와 RCTAppDependencyProvider를 import해 같은 관계를 구성한다.

## debug와 release bundle URL

`RCTDefaultReactNativeFactoryDelegate`를 상속해 bundle URL을 제공한다.

```swift
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
```

debug는 Metro 서버의 index bundle을 요청하고 release는 앱에 포함된 main.jsbundle을 읽는다. 이 두 경로를 설정했다고 release bundle이 자동으로 만들어지는 것은 아니므로 build phase를 함께 구성한다.

## 기존 UIKit 화면에서 표시

기존 UIViewController의 버튼 등에서 ReactViewController를 생성하고 `present(..., animated: true)`로 표시할 수 있다. 필요하면 한 인스턴스를 보관해 재사용한다. 앱의 navigation과 화면 수명에 맞춰 호스팅 방식을 정한다.

통합 예제는 Xcode의 User Script Sandboxing을 `NO`로 설정해 Hermes debug/release 전환 script가 동작하게 하고, Info.plist의 `UIViewControllerBasedStatusBarAppearance`를 `NO`로 추가하는 구성을 제시한다. 기존 앱의 status bar 정책과 build script 동작에 미치는 영향을 확인한 뒤 병합한다.

## Metro 개발 실행

루트 `metro.config.js`는 `@react-native/metro-config`의 `getDefaultConfig(__dirname)`을 사용한다. `.watchmanconfig`는 빈 JSON 객체 `{}`로 둔다. Metro를 `npm start`/`yarn start`로 실행한 뒤 기존 iOS 앱을 빌드해 React Native 화면을 연다.

## release의 JS와 이미지 packaging

Xcode Build Phases에 `Bundle React Native code and images` Run Script Phase를 추가한다. 위치는 `[CP] Embed Pods Frameworks`보다 앞이다.

```sh
set -e
WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

실제 `REACT_NATIVE_PATH`가 프로젝트에서 올바르게 결정되는지 확인한다. release 앱을 Metro 없이 실행해 번들과 이미지가 포함됐는지 검증해야 한다.

## initialProperties로 초기 데이터 전달

`view(withModuleName:initialProperties:)`의 dictionary가 root component의 props로 전달된다. Objective-C는 `viewWithModuleName:initialProperties:`를 사용한다.

```swift
view = factory!.rootViewFactory.view(
  withModuleName: "HelloWorld",
  initialProperties: ["userID": "example-user"]
)
```

JavaScript/TypeScript 화면은 해당 props를 받아 사용한다. initialProperties는 초기 데이터 전달 경계이며 지속적인 양방향 동기화 API와 같지 않다. 페이지의 사용자 ID/token 예제는 전달 방법의 설명이고 민감 token을 화면에 그대로 표시하는 제품 패턴으로 사용하지 않는다.

## 출처

- [React Native, Integration With Existing Apps](https://reactnative.dev/docs/integration-with-existing-apps)

## 관련 문서

- [[RN-Local-Environment]]
- [[RN-Android-Integration]]
- [[RN-Metro]]
- [[RN-Strict-TypeScript-API]]
