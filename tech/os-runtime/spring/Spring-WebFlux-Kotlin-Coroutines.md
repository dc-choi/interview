---
tags: [spring, webflux, kotlin, coroutines, reactor, r2dbc, mockk]
status: done
verified_at: 2026-11-17
category: "OS & Runtime"
aliases: ["Spring WebFlux Kotlin Coroutines", "WebFlux 코루틴 점진 도입", "Kotlin Coroutines with Reactor"]
---

# Spring WebFlux에 Kotlin 코루틴을 점진적으로 도입하기

WebFlux는 non-blocking I/O를 Reactor의 `Mono`와 `Flux` 연산자 체인으로 표현한다. Kotlin 코루틴은 같은 Reactor 실행 위에서 `suspend` 함수와 `Flow`로 코드를 순차 코드처럼 읽히게 한다. 실행 모델이 blocking으로 바뀌는 것이 아니라 비동기 경계를 표현하는 문법이 바뀐다. Kotlin과 Java는 한 프로젝트에 공존할 수 있으므로 기존 Java WebFlux 코드를 한 번에 다시 쓰지 않고 계층별로 바꿔 볼 수 있다.

## 시그니처 대응

Spring Framework 7.0 문서(2026-11-17 확인)는 Reactor 반환형과 코루틴 시그니처를 다음처럼 대응한다.

| Reactor | 코루틴 |
|---|---|
| `fun handler(): Mono<Void>` | `suspend fun handler()` |
| `fun handler(): Mono<T>` | `suspend fun handler(): T` 또는 Mono가 비어 있을 수 있으면 `T?` |
| `fun handler(): Flux<T>` | `fun handler(): Flow<T>` |

`Flow`는 push 기반이고 `Flux`는 push와 pull의 혼합이며, `Flow`의 backpressure는 suspending 함수로 구현된다. 둘을 같은 동작으로 보지 않고, 요청량 조절에 기대던 코드는 변환 뒤 다시 확인한다. Backpressure 일반은 [[Backpressure]]에서 다룬다.

Spring Framework는 `kotlinx-coroutines-core`와 `kotlinx-coroutines-reactor`가 classpath에 있으면 코루틴 지원을 켠다(1.4.0 이상). Spring Data의 코루틴 repository는 `kotlinx-coroutines-reactive`까지 classpath 조건으로 적고 1.7.0 이상을 지원한다(Spring Data Commons 4.1 문서 기준). reactive 모듈은 reactor 모듈의 의존성으로 함께 들어오므로 보통 따로 선언하지 않아도 된다. 기존 Java 프로젝트는 Kotlin Gradle plugin을 더해 Java와 Kotlin 혼합 빌드로 바꾸고, Spring의 Kotlin 지원이 요구하는 `kotlin-stdlib`, `kotlin-reflect`와 Spring용 compiler plugin(`kotlin-spring`)을 함께 둔다.

## Mono와 Flux를 코루틴으로 잇는 함수

`kotlinx-coroutines-reactor`와 `kotlinx-coroutines-reactive`가 연결 함수를 제공한다.

- `Mono<T>.awaitSingle()`: thread를 막지 않고 값을 기다린다. 값 없이 끝나면 `NoSuchElementException`을 던진다. 항상 값이 있는 생성과 수정 결과에 쓴다.
- `Mono<T>.awaitSingleOrNull()`: 값 없이 끝나면 `null`을 반환한다. 단건 조회의 `defaultIfEmpty`나 `switchIfEmpty` 분기를 일반 `if`나 Elvis 연산자(`?:`)로 바꿀 수 있다. `Mono<Void>`는 값이 없으므로 이 함수로 완료만 기다리고 반환값을 버린다.
- `Publisher.asFlow()`: `Flux`를 `Flow`로 바꾼다. 반대 방향은 `Flow.asFlux()`다.
- `mono { ... }`: 구독 시점에 코루틴을 시작하는 cold `Mono`를 만든다. `suspend` 구현을 `Mono` 반환 API로 다시 감쌀 때 쓴다. context에 dispatcher를 주지 않으면 `Dispatchers.Default`에서 실행되므로, bridge한 코드는 호출한 thread가 아닌 Default pool로 옮겨 갈 수 있다.

두 await 함수는 취소 가능하다. 코루틴의 Job이 취소되면 Subscription을 취소하고 `CancellationException`으로 재개한다.

```kotlin
@GetMapping("/visits/{id}")
suspend fun findVisit(@PathVariable id: Int): ResponseEntity<Visit> {
    val visit = visitService.findVisitById(id).awaitSingleOrNull()
    return visit?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()
}

@GetMapping("/visits")
fun findAllVisits(): Flow<Visit> = visitService.findAllVisits().asFlow()
```

## 계층별 순서와 Java 호출자 보존

1. **Controller**: framework와 HTTP 수준 테스트만 handler를 호출하면 시그니처를 바로 `suspend`와 `Flow`로 바꾸기 쉽다. 기존 HTTP 테스트로 동작이 같은지 확인한다. Java 테스트가 handler 메서드를 직접 부르면 아래 service처럼 bridge를 둔다.
2. **Service**: Java 호출자(기존 Java 단위 테스트 포함)가 남아 있으면 `Mono`, `Flux` 시그니처를 `suspend`나 `Flow`로 바꾸는 순간 호출 코드가 깨진다. 새 `suspend` 함수나 `Flow` 반환 함수를 추가하고 기존 `Mono` 메서드는 `mono { newSuspendFun() }`로 새 구현에 위임한다. 외부 계약이 없는 private 함수는 바로 바꿀 수 있지만, 이를 부르는 non-suspend 코드는 `mono { }`로 감싸야 컴파일된다.
3. **Repository**: Spring Data는 `CoroutineCrudRepository`를 상속한 repository만 코루틴 repository로 발견한다. 이 repository는 reactive repository 위에 만들어지며 사용자 정의 메서드도 `suspend` 함수(단건, 비어 있을 수 있으면 nullable)나 `Flow` 반환으로 선언한다. `suspend` 없이 엔티티를 직접 반환하는 메서드는 thread를 막으므로 피한다.

Repository까지 바꾸면 service에서 `asFlow()`, `awaitSingle()` 같은 변환 호출이 줄어든다. 아직 바꾸지 않은 repository는 그대로 `Mono`를 반환하므로 한 service 안에 두 방식이 섞이는 기간을 전제로 한다.

## 테스트의 mock 전환

Java 테스트의 Mockito `when`과 argument captor로 `suspend` 함수를 mock하기는 번거롭다. 계기 영상의 시연은 해당 테스트를 Kotlin으로 옮기고 MockK로 바꾸는 방법을 택했다.

- `suspend` 함수의 stub은 `coEvery`, 검증은 `coVerify`로 한다. 일반 함수는 `every`, `verify`다.
- 아직 reactive로 남은 의존성의 mock은 계속 `Mono`나 `Flux`를 반환하게 둔다.
- Spring test context에 MockK mock을 넣을 때는 SpringMockK의 `@MockkBean`과 spy용 annotation을 쓴다. 5.x는 Spring Framework 7과 호환되며 spy는 `@MockkSpyBean`이다. Spring Boot 3.x용 4.x에서는 같은 역할의 이름이 `@SpykBean`이다(README 기준).

```kotlin
coEvery { visitRepository.findById(1) } returns sampleVisit
every { visitRepository.findByPetId(7) } returns flowOf(sampleVisit)

runTest {
    service.createVisitSuspend(newVisit) // bridge 대상인 suspend 구현
    coVerify { visitRepository.save(match { it.petId == 7 }) }
}
```

## 판단 기준

- 계기 영상이 내세운 도입 이유는 가독성과 리뷰 부담이다. 연산자 체인이 길고 팀이 Spring MVC의 순차 코드에 익숙할수록 효과가 크다는 주장이며, 에이전트가 생성한 코드가 늘어 병목이 작성보다 리뷰로 옮겨 간 팀에서 더 중요해진다고 본다. 이 문서의 판단으로는 성능 개선을 기대하는 근거로 삼지 않는다.
- 언어 전환의 위험은 계층 하나에서 시험하고 테스트로 동작을 고정한 뒤 넓히는 방식으로 줄인다. Java 호출자가 있는 공개 API는 bridge를 두고, 모든 호출자가 Kotlin으로 옮겨진 뒤에 정리한다.
- `suspend` 함수 안에서 blocking 호출을 하면 코루틴만 멈추는 것이 아니라 그 코드를 실행하는 thread가 막히고, WebFlux에서는 event loop thread가 막힐 수 있다. JDBC 같은 blocking 저장소는 그대로 두지 않는다. 이 항목은 일반 원칙이며 아래 검증 범위의 문서에서 직접 확인한 내용은 아니다.
- `awaitSingle()`을 비어 있을 수 있는 `Mono`에 쓰면 이전에는 빈 응답이던 경로가 예외로 바뀐다. 빈 결과의 의미를 계층마다 확인한다.

검증 범위는 Spring Framework와 Spring Data의 코루틴 문서, kotlinx.coroutines API 문서와 SpringMockK README의 계약이다. 위 예제는 그 계약에 맞춘 자체 예제이며 컴파일하거나 실행하지 않았다.

## 출처

- [Spring Framework, Coroutines](https://docs.spring.io/spring-framework/reference/languages/kotlin/coroutines.html)
- [Spring Data Commons, Coroutines](https://docs.spring.io/spring-data/commons/reference/kotlin/coroutines.html)
- [kotlinx.coroutines, kotlinx-coroutines-reactor](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-reactor/)
- [kotlinx.coroutines, kotlinx-coroutines-reactive](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-reactive/)
- [MockK](https://mockk.io/)
- [SpringMockK — Ninja Squad](https://github.com/Ninja-Squad/springmockk)
- [Spring WebFlux | Add Kotlin Coroutines to an Existing Java App | Hands-On Demo — Kotlin by JetBrains](https://www.youtube.com/watch?v=U0HJBXSLHLY) — 2026-11-09 공개, 음성 전사 기반의 계기 자료. 화면의 코드는 확인하지 않았다. Flow가 Flux와 같은 backpressure 방식을 쓴다는 설명은 Spring 문서의 표현으로 바로잡았다.

## 관련 문서

- [[Spring|Spring]]
- [[Backpressure]]
- [[Spring-Testing-Essentials|Spring test 경계]]
- [[Kotlin-JS-Suspend-Lambda-Export|Kotlin/JS suspending 람다 내보내기]]
