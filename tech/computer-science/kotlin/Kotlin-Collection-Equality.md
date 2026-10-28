---
tags: [kotlin, collections, equality, validation]
status: done
verified_at: 2026-10-28
category: "CS - Kotlin"
aliases: ["Kotlin Collection Equality", "Kotlin 컬렉션 동등성과 중복 검사"]
---

# Kotlin 컬렉션 동등성과 중복 검사

컬렉션의 모든 값이 같은지와 중복이 없는지는 서로 다른 조건이다. Kotlin 2.4.20의 공식 변경 문서는 이를 검사하는 네 함수를 소개한다. 2026-10-28 확인 기준 실험 API이므로 `@OptIn(ExperimentalStdlibApi::class)` 또는 `-opt-in=kotlin.ExperimentalStdlibApi`가 필요하다. [도입과 opt-in 조건](https://kotlinlang.org/docs/whatsnew2420.html#new-functions-to-check-collection-elements-for-equality-and-uniqueness)

## 검사 기준을 먼저 고른다

| 함수 | 참이 되는 조건 | 예시 |
|---|---|---|
| `allEqual()` | 모든 원소가 서로 같음 | 같은 처리 상태인지 |
| `allEqualBy { ... }` | 선택한 값이 모두 같음 | 모든 항목의 통화 코드가 같은지 |
| `allDistinct()` | 서로 같은 원소가 없음 | 코드 목록에 중복이 없는지 |
| `allDistinctBy { ... }` | 선택한 값에 중복이 없음 | 객체의 식별자가 중복되지 않는지 |

네 함수는 컬렉션, 배열과 시퀀스에 사용할 수 있다. `By` 함수는 객체 전체의 동등성 대신 선택 함수가 반환하는 값을 비교한다. 객체 내용이 달라도 식별자가 같으면 식별자 기준 중복이다.

## 빈 입력과 동등성

`allEqual()`과 `allDistinct()`는 빈 입력과 원소 하나인 입력에서 모두 `true`다. 두 함수는 서로의 부정이 아니다. 예를 들어 `[1, 1, 2]`는 두 조건 모두 거짓이다. 빈 입력을 업무 오류로 다루려면 비어 있지 않다는 조건을 따로 검사한다. `By` 변형도 빈 입력에서는 `true`다.

비교는 참조 동일성이 아니라 구조적 동등성을 따른다. `allEqual()`은 첫 원소를 이후 원소들과 순서대로 비교한다. `allDistinct()`는 중복을 찾는 즉시 `false`를 반환한다. [동등성 검사](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-equal.html), [중복 검사](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-distinct.html)

부동소수점 원소에는 `Double.equals`와 `Float.equals`에 맞는 규칙이 적용된다. `NaN`끼리는 같고 `-0.0`과 `0.0`은 다르다. 수치 비교의 기대와 다른지 확인한다. 선택 함수의 결과가 부동소수점인 경우도 같은 주의가 필요하다.

## 적용 예와 검증 경계

다음은 API 문서의 계약에 맞춘 자체 예제다. 실제 Kotlin 컴파일러로 실행한 결과는 아니다.

```kotlin
@OptIn(ExperimentalStdlibApi::class)
fun main() {
    val codes = listOf("A1", "A2", "B1")
    check(codes.allDistinct())
    check(!codes.allDistinctBy { it.first() })
    check(!codes.allEqual())
    check(codes.allEqualBy { it.length })
    check(emptyList<String>().allDistinct())
    check(emptyList<String>().allEqual())
}
```

시퀀스의 `allDistinct()`는 terminal operation이다. 중복을 찾지 못하면 끝까지 읽어야 하므로 무한 입력의 성공 판정을 기대하면 안 된다(종료 계약에서 도출한 적용 주의). [시퀀스 API](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.sequences/all-distinct.html)

인메모리 목록의 중복 검사는 동시 요청이나 이후 저장까지 보호하지 않는다. 저장소 수준의 유일성이 필요하면 별도 제약과 충돌 처리를 설계한다. 실험 API를 적용할 때는 프로젝트의 컴파일러와 표준 라이브러리 버전, opt-in 정책을 먼저 확인한다.

## 출처

- [What's new in Kotlin 2.4.20 — Kotlin](https://kotlinlang.org/docs/whatsnew2420.html)
- [Kotlin, allEqual](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-equal.html)
- [Kotlin, allEqualBy](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-equal-by.html)
- [Kotlin, allDistinct](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-distinct.html)
- [Kotlin, allDistinctBy](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/all-distinct-by.html)
- [Kotlin, Sequence.allDistinct](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.sequences/all-distinct.html)

## 관련 문서

- [[CS&프로그래밍(CS&Programming)|CS와 프로그래밍]]
- [[Java-Generics-and-Collections-Set|Set과 중복]]
