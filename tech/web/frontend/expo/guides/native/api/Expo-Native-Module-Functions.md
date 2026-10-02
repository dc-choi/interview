---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Modules API 함수와 속성 계약"]
---

# Modules API 함수와 속성 계약

## Definition DSL

Module subclass는 `definition()`에 DSL component를 반환한다. Kotlin은 ModuleDefinition builder, Swift는 ModuleDefinition return을 사용한다. `Name("MyModule")`은 JS loader 식별자이며 class 이름에서 추론할 수 있지만 명시를 권장한다.

| Component | JavaScript 계약 | 주의점 |
|---|---|---|
| Constant(name, closure) | 처음 조회할 때 계산하고 이후 cached value | live state에는 Property 사용 |
| Constants(dictionary/closure) | 다수 constant 선언 | deprecated, 개별 Constant로 전환 |
| Function(name, body) | 동기 native function | JS 실행 thread를 막음 |
| AsyncFunction(name, body) | 항상 Promise 반환 | default native dispatch는 JS runtime thread와 다름 |
| Property(name, getter) | read-only accessor | 조회마다 native getter 실행 |
| Property(name).get/.set | writable 또는 setter-only accessor | 변환과 동기 처리 비용 고려 |

Function과 AsyncFunction은 최대 8개 native argument를 받는다. explicit Promise argument도 이 개수에 포함된다. body parameter type이 JS 입력 conversion contract를 결정한다.

## Async completion과 queue

AsyncFunction의 마지막 argument가 Promise이면 작성자가 resolve/reject할 때 JS 결과가 완료된다. Promise argument가 없으면 반환값으로 resolve되고 throw는 reject가 된다. Android Promise는 `expo.modules.kotlin.Promise`를 사용하며 legacy `expo.modules.core` 타입과 혼동하지 않는다.

```swift
AsyncFunction("readAsync") { (path: String) in
  try readFile(path)
}
AsyncFunction("focusAsync") { () in
  // UI operation
}.runOnQueue(.main)
```

```kotlin
AsyncFunction("loadAsync") Coroutine { path: String ->
  loadSuspending(path)
}
AsyncFunction("focusAsync") { ->
  // UI operation
}.runOnQueue(Queues.MAIN)
```

Kotlin suspend body는 `AsyncFunction(...) Coroutine { ... }` infix 형태다. Coroutine body는 Promise argument를 함께 받을 수 없다. default coroutine scope는 module lifecycle에 연결되며 module deallocation 시 미완료 suspend 작업이 취소된다. 호출하는 suspend function도 같은 scope를 따르므로 결과 callback이 항상 올 것이라고 가정하지 않는다.

I/O, 긴 연산, UI thread 작업은 AsyncFunction과 적절한 queue를 사용한다. async API로 노출했다는 이유만으로 내부 native SDK가 thread-safe해지는 것은 아니다.

## Native context

Module의 appContext는 한 Expo app instance를 가리킨다. appContext의 constants/permissions는 legacy registry interface, Android activityProvider/reactContext는 nullable일 수 있다. Android hasActiveReactInstance는 alive RN instance 존재를 검사한다. iOS utilities 역시 optional interface다. 앱 재생성이나 context destruction 후 참조를 영구 보관하지 않는다.

이 페이지의 나머지 API는 [[Expo-Native-Module-Types|argument conversion]], [[Expo-Native-Module-Views|views]], [[Expo-Native-Module-Events-Lifecycle|events/lifecycle]]에 분리했다.

## 출처

- [Expo Documentation, Module API Reference](https://docs.expo.dev/modules/module-api)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
