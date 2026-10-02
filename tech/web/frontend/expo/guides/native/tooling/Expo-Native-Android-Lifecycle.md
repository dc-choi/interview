---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Android Activity와 Application listeners"]
---

# Android Activity와 Application listeners

## Package discovery

별도 Package class가 `expo.modules.core.interfaces.Package`를 구현하고 createReactActivityLifecycleListeners 또는 createApplicationLifecycleListeners를 반환한다. Autolinking은 연결된 모듈 Android source의 `*Package.java`/`*Package.kt`에서 해당 interface 구현을 찾아 generated ExpoModulesPackageList에 넣는다. MainApplication에 수동 등록하거나 Android 지원 module config에 Package class를 다시 넣을 필요가 없다.

```kotlin
class MyLibPackage : Package {
  override fun createReactActivityLifecycleListeners(context: Context) =
    listOf(MyActivityListener())
}
class MyActivityListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity, state: Bundle?) {
    // activity setup
  }
}
```

## Callback 계약

| Listener | 지원 callback |
|---|---|
| ReactActivityLifecycleListener | onCreate, onResume, onPause, onDestroy, onNewIntent, onBackPressed |
| ApplicationLifecycleListener | onCreate, onConfigurationChanged |

ReactActivity hooks는 ReactActivityDelegate를 거친다. delegate가 onStart/onStop을 제공하지 않아 이 interface에 해당 callbacks가 없다. onNewIntent의 true는 처리했다고 표시하며 onBackPressed의 true는 default back behavior를 막는다. 실제 처리하지 않은 intent까지 무조건 true를 반환하지 않는다.

필요한 callback만 override한다. interface는 Java8 default methods를 사용하고 SDK release마다 새 interface/deprecated 변화가 있을 수 있다. 모든 method를 형식적으로 구현하면 유지보수 부담을 늘린다.

## JS event로 전달하는 flow

lifecycle listener는 Expo module instance와 독립적인 lifetime을 가진다. native intent를 캡처하고 singleton/observer 경로로 module에 전달하며 module.sendEvent가 JS event를 전송한다. module을 strong reference로 영구 보관하지 않도록 WeakReference를 사용한다.

1. onCreate는 cold-start intent data를 보관한다.
2. onNewIntent는 실행 중 app URL을 캡처한다.
3. module은 getInitialUrl을 노출하고 OnStartObserving(eventName)에서 observer를 추가한다.
4. OnStopObserving과 destruction cleanup에서 같은 observer를 제거한다.
5. JS hook은 initial URL과 최신 event를 보관하고 subscription.remove로 정리한다.

URI의 scheme/host/path는 nullable일 수 있으므로 JS optional 또는 null 계약을 맞춘다. 원문의 Java module chaining 예제는 Kotlin 중심 Modules DSL와 package/import 형태가 섞여 있으므로 현재 core Java signature를 확인 없이 그대로 컴파일 가능한 코드로 사용하지 않는다. cold-start initial URL과 마지막 URL을 구분하고 여러 intent 처리 시 overwrite/중복 정책을 정한다.

## 출처

- [Expo Documentation, Android lifecycle listeners](https://docs.expo.dev/modules/android-lifecycle-listeners)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
