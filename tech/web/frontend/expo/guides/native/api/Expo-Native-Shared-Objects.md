---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["SharedObject와 native 자원 수명"]
---

# SharedObject와 native 자원 수명

## 참조로 native instance 공유

SharedObject를 상속한 Swift/Kotlin instance를 Class DSL로 노출하면 JS 참조가 같은 native 상태에 연결된다. JS와 native 어느 쪽에도 참조가 없을 때 자동 deallocation된다. 파일 path/숫자 ID만 넘기고 각 모듈이 다시 읽고 decode하는 일을 줄일 수 있다.

SharedRef<T>는 image와 같은 native value를 모듈 간 넘기는 특수 참조다. 호환되는 native type과 consumer contract가 있어야 하므로 임의 bitmap wrapper가 모든 image consumer에 그대로 맞는다고 가정하지 않는다. expo-image, image-manipulator, sqlite, expo/fetch는 이러한 수명 모델을 실제 API에 사용한다.

## Class definition 계약

| Component | JS 호출 |
|---|---|
| Class(name,type) | native class를 module에 노출 |
| Constructor(args) | `new ClassName(args)`으로 instance 생성 |
| Function/AsyncFunction | instance method, native 첫 argument는 instance |
| StaticFunction | `ClassName.method()` 동기 호출, instance argument 없음 |
| StaticAsyncFunction | class static Promise 함수, Kotlin Coroutine 가능 |
| Property | instance getter/setter, native에 instance 전달 |

Constructor가 없으면 native 함수가 반환하는 instance만 얻을 수 있다. StaticFunction은 JS class 자체에 붙는 API이며 instance method로 가정하지 않는다. 원문의 prototype이라는 표현보다 제시된 ClassName.functionName 호출 계약을 따른다.

```swift
Class("Player", Player.self) {
  Constructor { (source: String) in Player(source: source) }
  Property("volume")
    .get { (player: Player) in player.volume }
    .set { (player: Player, volume: Float) in player.volume = volume }
  Function("play") { (player: Player) in player.play() }
}
```

## Image manipulation 흐름

picker는 disk URI를 반환한다. custom native module이 파일을 읽고 decode해 context를 만든다. rotate/flip은 memory image를 바꾸며 renderAsync가 SharedRef를 반환한다. saveAsync 같은 명시적 export를 호출하기 전에는 disk write가 필요하지 않다. 결과를 Image consumer에 넘겨 반복 decode를 줄인다.

원문의 최소 예제는 설명용 골격이다. `BitmapFactory.decodeFile`은 filesystem path를 기대하지만 ImagePicker는 file URI를 반환할 수 있으므로 URI를 path로 변환하거나 content resolver 처리가 필요하다. Swift rotated helper는 예제에 구현되어 있지 않다. Kotlin ImageRef constructor/import도 실제 SDK signature에 맞춰야 한다.

## 자원 해제와 성능의 조건

Android sharedObjectDidRelease는 JS 참조 해제에 대응하는 cleanup 기회다. decoder/player/database statement 같은 자원을 release한다. 반환한 SharedRef가 bitmap을 계속 참조하는데 context cleanup에서 bitmap을 recycle하면 consumer가 아직 쓰는 메모리가 무효화될 수 있다. context와 result 사이 ownership을 명확히 하며 한 소유자가 다른 참조가 살아 있는 자원을 해제하지 않는다.

Shared objects는 decode/I/O 반복을 줄이지만 rotation 자체가 새 bitmap을 만들 수 있다. 항상 하나의 allocation만 존재하거나 transform이 무료라는 뜻은 아니다. 큰 CPU 작업을 동기 Function에 넣으면 JS를 막으므로 workload에 맞는 async/queue를 사용한다. 원문의 즉시 renderAsync 예제는 실제 copy/composition queue 정책을 대신하지 않는다.

## 출처

- [Expo Documentation, Using shared objects](https://docs.expo.dev/modules/shared-objects)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
