---
tags: [kotlin, swift, native, interop, dependency-injection]
status: done
verified_at: 2026-11-09
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Kotlin Swift Interface Interop", "Swift의 Kotlin 인터페이스 구현", "Kotlin reverse import", "Swift export sealed types"]
---

# Kotlin 계약과 Swift 구현을 연결하기

Reverse import는 Kotlin에 계약을 정의하고 Swift에서 플랫폼 구현을 만들어 Kotlin으로 전달하는 패턴이다. 공통 로직은 인터페이스를 호출하고, Swift 구현은 Apple 플랫폼 API나 순수 Swift 라이브러리를 사용할 수 있다. 반대 방향으로 Swift가 Kotlin의 sealed 계층을 소비하는 Swift export 기능도 함께 다룬다.

## 두 export 경로를 구분한다

| 경로 | 연결 방식 | 확인할 조건 |
|---|---|---|
| Objective-C를 거치는 상호운용 | Kotlin 인터페이스가 protocol로 노출된다 | 순수 Swift 모듈을 Kotlin에 직접 import하는 기능과 다르다. Objective-C 노출 여부와 생성된 API를 확인한다 |
| Swift export | Kotlin API를 Swift에서 사용하도록 내보낸다 | Kotlin 2.4.20에서 cross-language inheritance가 추가됐다. 공식 예제는 Kotlin의 `open` 기반 클래스를 함께 선언한다 |

2026-11-04 확인한 Swift export는 Alpha이며 호환성을 깨는 변경이 예상된다. Kotlin 인터페이스를 Swift에서 구현하는 모든 경로가 2.4.20에서 처음 생겼다는 뜻은 아니다.

## Swift export의 호출 흐름

1. Kotlin에 필요한 메서드만 가진 인터페이스와 이를 받는 함수를 정의한다.
2. Kotlin에 `open class SwiftBase` 같은 기반 클래스를 선언한다. `SwiftBase`는 예제에서 정한 이름이다.
3. Swift 클래스가 export된 기반 클래스를 상속하고 인터페이스를 구현한다.
4. Swift 객체를 Kotlin 함수에 전달한다. Kotlin의 인터페이스 호출이 Swift 구현으로 돌아간다.

예를 들어 공통 로직에 플랫폼 기능이 필요하면 그 기능의 계약만 Kotlin에 두고 Swift 쪽에서 실제 라이브러리를 호출한다. Swift 모듈 전체가 Kotlin에서 직접 보이는 구조는 아니다. 공통 계약을 작게 유지하면 플랫폼 의존성이 드러나는 지점을 줄일 수 있다(설계 적용).

## Swift export에서 sealed 계층을 소진 검사하기

Kotlin 2.4.20은 Swift export에 sealed class와 sealed interface 지원을 더했다. Swift export는 각 sealed 타입에 `sealedType()` 메서드를 생성하고, 이 메서드는 sealed 계층의 직접 하위 클래스를 case로 가진 Swift enum을 반환한다. 공식 문서는 이 호출을 중첩해 더 깊은 단계까지 맞출 수 있다고 설명하지만 중첩 예시는 싣지 않는다.

```swift
let shape = createCircle()
let name = switch shape.sealedType() {
case let .circle(type): "It's a \(type.value)"
case let .rectangle(type): "It's a \(type.value)"
}
```

이전에는 sealed 타입을 `switch`로 다룰 때 `default` case가 필요했다. Enum으로 매핑되면 Swift 컴파일러가 모든 case를 알기 때문에 `default` 없이 소진 검사를 할 수 있고, Kotlin 쪽 sealed 계층에 하위 클래스가 추가되면 컴파일러가 처리하지 않은 case를 알린다. 공식 문서의 표현은 warns이며 실제 진단 수준은 빌드로 확인하지 않았다. `default`를 남겨 두면 이 경고를 받을 수 없으므로 계층 변경을 Swift에서 놓치지 않으려면 소진형 `switch`를 쓴다(설계 적용).

이 기능은 릴리스 문서의 pre-stable 기능 목록에 속한 Swift export 신규 기능으로 소개된다. 2026-11-09 확인한 해당 절은 별도 컴파일러 옵션을 언급하지 않는다.

## 적용 점검

- 프로젝트가 사용하는 export 경로를 먼저 확인하고 서로 다른 경로의 설정과 생성 타입을 섞지 않는다.
- Swift export 문서는 현재 Xcode direct integration을 전제로 한다. 실제 프로젝트의 빌드 연결을 확인한다.
- 반환 타입, 오류 표현과 호출 시점은 계약에 맞게 확인한다. 컴파일 성공만으로 플랫폼 동작까지 검증했다고 보지 않는다.
- 이 문서는 공식 예제의 구조를 대조한 기록이다. Xcode 빌드와 실제 장비 실행은 수행하지 않았다.

## 출처

- [Kotlin, What's new in Kotlin 2.4.20](https://kotlinlang.org/docs/whatsnew2420.html#cross-language-inheritance-in-swift-export)
- [Kotlin, What's new in Kotlin 2.4.20, New Swift export features](https://kotlinlang.org/docs/whatsnew2420.html#new-swift-export-features)
- [Kotlin, Interoperability with Swift using Swift export](https://kotlinlang.org/docs/native-swift-export.html#cross-language-inheritance)
- [Kotlin, Interoperability with Swift/Objective-C](https://kotlinlang.org/docs/native-objc-interop.html)
- [Kotlin, C, Objective-C, and Swift library import](https://kotlinlang.org/docs/native-lib-import-stability.html#swift-library-import)

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]
- [[Kotlin-Collection-Equality|Kotlin 컬렉션 동등성과 중복 검사]]
