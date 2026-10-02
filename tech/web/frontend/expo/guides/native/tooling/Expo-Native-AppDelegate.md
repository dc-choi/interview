---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["iOS AppDelegate subscribers와 결과 합성"]
---

# iOS AppDelegate subscribers와 결과 합성

## 등록 조건

AppDelegate는 ExpoAppDelegate를 상속해야 한다. ExpoAppDelegate는 지원 UIApplicationDelegate method를 subscriber들에게 전달한다. public Swift class가 ExpoAppDelegateSubscriber를 상속하고 expo-module.config.json의 `apple.appDelegateSubscribers`에 이름을 등록한다. pod install 후 app의 ExpoModulesProvider.swift에 연결된다. Objective-C subscriber는 지원되지 않는다.

```swift
import ExpoModulesCore
public class LifecycleSubscriber: ExpoAppDelegateSubscriber {
  public func applicationDidBecomeActive(_ application: UIApplication) {
    // active handling
  }
  public func applicationDidEnterBackground(_ application: UIApplication) {
    // background handling
  }
}
```

app active/inactive, background/foreground, termination, memory warning 등의 callback을 구현할 수 있다. 모든 UIApplicationDelegate callback이 자동 지원되는 것은 아니다. viewControllerWithRestorationIdentifierPath처럼 구현 자체가 side effect를 바꾸는 일부 callback은 지원되지 않는다. 전체 최신 지원 목록은 ExpoAppDelegate의 overridden functions를 기준으로 확인한다.

## 여러 subscriber의 반환값

`application(_:didFinishLaunchingWithOptions:) -> Bool`에서는 하나라도 true면 ExpoAppDelegate도 true를 반환한다. URL/user activity를 처리할 수 있는지라는 Apple 의미를 따르며 remote notification launch에서는 return value가 무시될 수 있다.

`application(_:didReceiveRemoteNotification:fetchCompletionHandler:)`는 subscriber마다 별도의 completion을 전달하고 모두 완료한 뒤 원래 completion을 호출한다.

| 수집된 결과 | 최종 result |
|---|---|
| 하나라도 failed | failed |
| failed 없음, 하나라도 newData | newData |
| 그 외 | noData |

모든 subscriber가 자기 completion을 완료해야 한다. 실패/early return 경로에서 completion을 잊으면 aggregate가 끝나지 않을 수 있다. 나머지 delegate 반환값 합성은 일률적 OR로 가정하지 말고 해당 ExpoAppDelegate 구현을 확인한다. 시스템 callback 처리와 JS event delivery의 준비 시점도 별도로 고려한다.

## 출처

- [Expo Documentation, iOS AppDelegate subscribers](https://docs.expo.dev/modules/appdelegate-subscribers)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
