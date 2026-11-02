---
tags: [kotlin, testing, assertion, lazy-evaluation]
status: done
verified_at: 2026-11-02
category: "CS - Kotlin"
aliases: ["Kotlin 지연 assertion 메시지", "Kotlin Lazy Assertion Messages"]
---

# Kotlin 테스트의 지연 assertion 메시지

테스트 실패 메시지를 문자열로 전달하면 assertion 호출 전에 메시지를 만든다. 실패할 때만 필요한 컬렉션 출력이나 진단 문자열을 람다 안에서 만들면 성공한 assertion에서는 그 작업을 생략할 수 있다.

## 문자열 인자와 메시지 람다

Kotlin 2.4.20 릴리스 문서는 `kotlin.test`에 메시지 생성 람다를 받는 overload를 소개한다. 2026-11-02 확인한 `assertEquals` API에서는 `lazyMessage: () -> String`이며 `@OptIn(ExperimentalKotlinTestApi::class)`가 필요하다. API 레퍼런스의 Since Kotlin 표기는 2.4다. 채택할 프로젝트의 `kotlin.test` 버전과 실험 API 허용 범위를 확인한다.

```kotlin
import kotlin.test.ExperimentalKotlinTestApi
import kotlin.test.assertEquals

@OptIn(ExperimentalKotlinTestApi::class)
fun verifyItems(expectedSize: Int, items: List<String>) {
    assertEquals(expectedSize, items.size) {
        "Unexpected size for items: ${items.joinToString()}"
    }
}
```

위 예제에서 개수 비교는 호출 때 수행하고, `joinToString()`과 문자열 생성은 assertion이 실패할 때 수행한다. 메시지를 먼저 변수에 계산한 뒤 `{ message }`로 넘기면 이미 쓴 계산 비용은 줄지 않는다. 예제는 공식 시그니처에 맞춘 자체 예제이며 로컬 Kotlin 컴파일러로 실행하지 않았다.

## 적용 범위와 비용 판단

- 릴리스 문서는 `assertTrue`와 `assertFalse`, `assertEquals`와 `assertNotEquals`, `assertSame`과 `assertNotSame`, `assertIs`와 `assertIsNot`, `assertNull`, `assertContains`, `assertContentEquals`에 새 overload를 안내한다. 이름이 비슷한 모든 함수에 있다고 추정하지 않는다.
- 지연되는 것은 메시지 생성이다. `expected`, `actual`을 만드는 계산이나 assertion 자체를 생략하는 기능이 아니다.
- 성공하는 테스트가 많고 메시지 포맷 비용이 클수록 피할 수 있는 작업이 늘어난다. 테스트 전체의 속도 향상률은 실제 suite를 측정해야 한다.
- 메시지 람다에는 진단에 필요한 값 읽기만 둔다. 실패할 때만 실행되므로 필수 상태 변경이나 테스트 준비를 넣으면 성공 경로에서 빠진다.
- stdlib의 `kotlin.assert`와 `kotlin.test.assertEquals`는 다른 API다. JVM의 `kotlin.assert`에는 `-ea` 활성화 조건이 있으므로 테스트 assertion을 이름만 보고 대체하지 않는다.

## 도입 확인

실제 프로젝트에서는 성공 case에서 메시지 람다가 호출되지 않는지, 실패 case에서 필요한 맥락이 출력되는지 확인한다. 메시지를 미리 만들던 코드를 옮길 때는 assertion의 비교 값과 성공/실패 결과가 유지되는지도 확인한다.

## 출처

- [Kotlin, What's new in Kotlin 2.4.20](https://kotlinlang.org/docs/whatsnew2420.html#new-overloads-for-kotlin-test-assertion-functions)
- [Kotlin, assertEquals](https://kotlinlang.org/api/core/kotlin-test/kotlin.test/assert-equals.html)
- [Kotlin, assert](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/assert.html)

## 관련 문서

- [[Kotlin-Collection-Equality|Kotlin 컬렉션 동등성과 중복 검사]]
