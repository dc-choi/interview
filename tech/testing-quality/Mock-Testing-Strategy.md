---
tags: [testing, mock, mockbean, testconfiguration, test-fixtures, black-box]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Mock Testing Strategy", "Mock 테스트 설계 전략", "Black Box 격리"]
---

# Mock 테스트 설계 전략 · Black Box 격리

외부 의존성이 있는 코드를 테스트할 때 **Mock의 위치·범위·성능·구조**를 어떻게 잡느냐가 테스트 가독성과 실행 속도를 결정한다. 단순 `Mock Server` → `@MockBean` → `@TestConfiguration` → `java-test-fixtures` 로 이어지는 **진화 경로**를 이해하면 현재 조직의 적정 단계를 고를 수 있다. 중심 원칙은 **"테스트 불가능한 영역을 격리해 전이되지 않게"**.

## 핵심 명제

- 외부 의존성(HTTP·DB·SDK)은 **Black Box** — 테스트할 수 없음
- Black Box는 **전이**된다 — 의존하는 모든 구간이 테스트 불가 영역이 됨
- Mock은 Black Box를 **격리하는 도구**
- **운영 코드 설계를 테스트 편의로 바꾸지 말 것** — 테스트 의존성은 별도로
- Mock의 위치·범위는 조직 크기·멀티 모듈 여부에 따라 진화

## 단계 0: 의존성 없는 단순 서비스

```kotlin
@Service
class ShopRegistrationService(private val shopRepository: ShopRepository) {
    fun register(brn: String, shopName: String): Shop =
        shopRepository.save(Shop(brn, shopName))
}
```

- 인자만으로 동작, 외부 의존 없음
- 테스트는 단순 입력→출력 확인

## 단계 1: 외부 서비스 의존 추가

```kotlin
@Service
class ShopRegistrationService(
    private val shopRepository: ShopRepository,
    private val partnerClient: PartnerClient  // HTTP 통신
) {
    fun register(brn: String): Shop {
        val partner = partnerClient.getPartnerBy(brn)
        return shopRepository.save(Shop(brn, partner.name))
    }
}
```

여기서부터 **Mock 전략**이 필요해진다. 아래는 같은 문제에 대한 4단계 진화.

## 진화 1: Mock Server (HTTP 레벨)

- 실제 HTTP 통신을 흉내내는 MockRestServiceServer 활용
- **장점**: 실제 통신에 가장 가까움
- **단점**: PartnerClient를 의존하는 **모든 테스트 코드에 Mock 설정**이 필요해짐 → 코드 생산성 저하

```kotlin
mockServer.expect(requestTo("/api/v1/partner/$brn"))
    .andRespond(withStatus(OK).body("""{"brn":"$brn","name":"XXX"}"""))
```

**적합**: 외부 통신의 직렬화·URL·메서드까지 검증하고 싶을 때

## 진화 2: @MockBean (Spring 수준)

```kotlin
@MockBean
private lateinit var partnerClient: PartnerClient

@Test
fun test() {
    given(partnerClient.getPartnerBy("X")).willReturn(PartnerResponse("X","XXX"))
    // ...
}
```

- **장점**: HTTP 설정보다 간결, 여러 케이스 쉽게 작성
- **단점**: 쓸 때마다 **Application Context가 재정의**됨 → 테스트 수가 많아질수록 속도 급감

**적합**: 테스트 수가 적거나 특수 케이스에만 Mock이 필요할 때

## 진화 3: @TestConfiguration (Context 재정의 회피)

```kotlin
@TestConfiguration
class ClientTestConfiguration {
    @Bean
    @Primary
    fun mockPartnerClient() = mock(PartnerClient::class.java)
}
```

- **장점**: Mock을 실제 Bean으로 등록 → **Context 재정의 없음**. 속도·일관성 확보
- **단점**: **멀티 모듈 환경**에서 import·설정 까다로움

**적합**: 단일 모듈·Context 부담이 큰 프로젝트

## 진화 4: java-test-fixtures (멀티 모듈)

Gradle `java-test-fixtures` 플러그인을 써 **테스트 전용 공유 리소스**를 배포 가능한 형태로 만듦.

```
:http-client
  ├── src/main/kotlin/...      # 운영 코드
  └── src/testFixtures/kotlin/  # 테스트 전용 리소스
       └── ClientTestConfiguration.kt
```

다른 모듈의 `build.gradle`:

```kotlin
dependencies {
    testImplementation(testFixtures(project(":http-client")))
}
```

- **장점**: 테스트 의존성을 실제 코드와 **명확히 분리**, 여러 모듈이 재사용
- **단점**: 단일 모듈에는 과잉, 빌드 설정 복잡

**적합**: 멀티 모듈·마이크로서비스 단일 저장소

## 단계 비교표

| 방식 | 셋업 난이도 | 실행 속도 | 멀티 모듈 | 적합 시점 |
|---|---|---|---|---|
| Mock Server | 높음 | 중간 | O | HTTP 세부까지 검증 필요 |
| @MockBean | 낮음 | 낮음 | O | 테스트 수 적음 |
| @TestConfiguration | 중간 | 높음 | 제한 | 단일 모듈·대규모 테스트 |
| java-test-fixtures | 높음 | 높음 | 최적 | 멀티 모듈 대형 프로젝트 |

## Black Box 격리 원칙

Mock의 목적은 **Black Box 전이 차단**.

### 문제

- PartnerClient가 HTTP 통신 + 비즈니스 로직 둘 다 담당 → 책임이 분리되지 않음
- 이를 Mocking하면 비즈니스 로직 테스트까지 영향

### 해결

- **책임 분리**
  - `PartnerClient` — 순수 HTTP 통신
  - `PartnerClientService` — 예외 처리·도메인 로직
- `PartnerClient`만 Mock → 비즈니스 로직은 **실제 객체**로 검증
- **외부 라이브러리 의존성을 전파하지 말 것** — `ResponseEntity` 대신 도메인 타입(`Pair<Int, PartnerResponse?>` 등)

### 원칙

```
외부 의존 → 얇은 어댑터 → 비즈니스 로직
         ↑ Mock 지점
```

Mock은 **가장 바깥쪽 얇은 어댑터**에서만. 안쪽은 실제 객체로.

## 구현 코드의 피드백으로서의 테스트

"테스트 코드 작성이 어렵다"는 것은 **운영 코드 설계의 신호**.

### 예: OrderService의 과중한 책임

- 많은 책임이 섞여 테스트가 비대해짐
- `OrderServiceSupport` 같은 **POJO**로 핵심 로직 추출
- Spring 의존성 제거 → 테스트 용이
- 자연스럽게 **더 좋은 설계**로 이어짐

## 사내 공통 Mock 서버 (플랫폼 관점)

여러 팀·서비스가 공유하는 **Mock 서버 플랫폼**. 해결 문제: 의존 서비스 점검 중 테스트 불가, 외부 협력 필요, 로컬 환경 제약, 부하 테스트 시 외부 영향. 구성: MockServer 오픈소스 + Web UI + API 관리 + 모니터링. 공용(읽기/쓰기) + 성능 테스트용(읽기 전용) 분리 운영. 팀 간 Mock 공유로 통합 플로우 테스트 용이.

## 흔한 실수

- **모든 Bean을 @MockBean** → Context 재정의 폭발, CI 속도 급감
- **Mock 위치를 깊숙한 내부에** → Black Box가 안쪽으로 전이, 비즈니스 로직까지 격리됨
- **Mock Server 코드 중복** → 테스트마다 동일 Mocking 반복
- **외부 라이브러리 타입을 반환** — `ResponseEntity`·`Mono`를 그대로 → 의존성 전파
- **테스트 편의로 운영 코드 수정** — 올바른 순서는 운영 코드 설계 → 테스트 쉬워짐

## 면접 체크포인트

- Mock Server·@MockBean·@TestConfiguration·java-test-fixtures의 **진화 경로**와 조건
- Black Box 전이 개념과 격리 원칙
- 얇은 어댑터 + 비즈니스 로직 분리
- 외부 라이브러리 의존성 전파 차단
- "테스트 어려움 = 운영 코드 설계 신호"의 실제 적용 사례

## 출처
- [카카오페이 — Mock 테스트 코드 Part 1](https://tech.kakaopay.com/post/mock-test-code/)
- [카카오페이 — Mock 테스트 코드 Part 2](https://tech.kakaopay.com/post/mock-test-code-part-2)
- [카카오페이 — 사내 공통 Mock 서버](https://tech.kakaopay.com/post/how-to-simplify-kakaopay-testing-using-a-common-mock-server)

## 관련 문서
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist · Test Double]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Isolation|Test Isolation]]
