---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Android Fragment에서 React Native 호스팅"]
---

# Android Fragment에서 React Native 호스팅

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 먼저 전체 화면 통합을 확인하기

기존 Android 앱의 ReactActivity 통합을 먼저 완료한다. 의존성, Application과 Metro 구성이 동작한 뒤 React Native 화면을 Fragment로 옮기면 새로 생긴 호스팅 문제와 기존 통합 문제를 구분할 수 있다.

ReactFragment는 Activity 안의 일부 영역에 React Native를 넣는 수단이다. 기본 예제는 FrameLayout이지만 앱 구조에 맞게 bottom sheet나 tab layout의 호스트 영역으로 확장할 수 있다.

## FrameLayout 호스트

Activity layout에 id와 크기를 가진 영역을 둔다.

```xml
<FrameLayout
    android:id="@+id/react_native_fragment"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

id는 Fragment transaction이 추가할 대상 container를 식별한다. 실제로 일부 영역에만 표시하려면 전체 화면 크기 예제 대신 해당 layout의 제약을 맞춘다.

## back 버튼의 네이티브 계약

호스트 Activity는 ReactActivity가 아니므로 `DefaultHardwareBackBtnHandler`를 구현한다. `invokeDefaultOnBackPressed()`에서 기본 back 동작을 AndroidX의 `OnBackPressedDispatcher`에 전달한다.

```kotlin
override fun invokeDefaultOnBackPressed() {
    onBackPressedDispatcher.onBackPressed()
}
```

`Activity.onBackPressed()`는 API 33부터 deprecated다. Android 16에서 API 36을 target하는 앱은 그 callback이 호출되지 않으므로 dispatcher를 사용한다. 공식 페이지의 뒤쪽 Fragment 추가 예제에는 다시 `super.onBackPressed()`가 남아 있는데, 앞쪽 deprecation 주의와 충돌하므로 새 코드에 복사하지 않는다.

## ReactFragment 만들기

```kotlin
val fragment = ReactFragment.Builder()
    .setComponentName("HelloWorld")
    .setLaunchOptions(Bundle().apply { putString("message", "example") })
    .build()

supportFragmentManager.beginTransaction()
    .add(R.id.react_native_fragment, fragment)
    .commit()
```

- `setComponentName`은 index.js의 `AppRegistry.registerComponent` 이름과 일치한다.
- `setLaunchOptions`는 root component에 전달할 초기 props이며 불필요하면 생략한다.
- `supportFragmentManager`가 ReactFragment를 host container에 추가한다.
- Java에서도 Builder, Bundle과 Fragment transaction으로 같은 계약을 구성한다.

버튼을 누를 때마다 `add`하는 입문 예제를 제품 코드에 그대로 쓰면 앱의 화면 수명에 따라 Fragment가 중복 추가될 수 있다. 실제 호스트의 Fragment 상태와 재생성 정책에 맞춰 transaction을 구성한다.

## 실행 확인

Metro를 먼저 실행하고 Android Studio에서 앱을 빌드한다. 호스트 화면에서 Fragment를 띄우고 초기 props가 표시되는지, back 동작이 기존 화면으로 적절히 돌아가는지 확인한다. 화면 회전, 재진입과 Activity 재생성은 제품의 실제 수명 조건에서 추가 확인한다.

## 출처

- [React Native, Integration With Android Fragment](https://reactnative.dev/docs/integration-with-android-fragment)

## 관련 문서

- [[RN-Android-Integration]]
- [[RN-Device-Execution]]
- [[RN-Platform-Code]]
