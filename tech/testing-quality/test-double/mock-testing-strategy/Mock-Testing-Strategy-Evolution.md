---
tags: [testing, mock, mockbean, testconfiguration, test-fixtures, black-box]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Mock Testing Strategy", "Mock 테스트 설계 전략", "Black Box 격리"]
---

# Mock 테스트 전략: 진화와 선택

외부 의존성이 있는 코드를 테스트할 때 **Mock의 위치, 범위, 성능, 구조**를 어떻게 잡느냐가 테스트 가독성과 실행 속도를 결정한다. 단순 `Mock Server` → `@MockitoBean` → `@TestConfiguration` → `java-test-fixtures` 로 이어지는 **진화 경로**를 이해하면 현재 조직의 적정 단계를 고를 수 있다. 중심 원칙은 **"테스트 불가능한 영역을 격리해 전이되지 않게"**.

## 핵심 명제

- 외부 의존성(HTTP, DB, SDK)은 **Black Box** — 테스트할 수 없음
- Black Box는 **전이**된다 — 의존하는 모든 구간이 테스트 불가 영역이 됨
- Mock은 Black Box를 **격리하는 도구**
- **운영 코드 설계를 테스트 편의로 바꾸지 말 것** — 테스트 의존성은 별도로
- Mock의 위치, 범위는 조직 크기, 멀티 모듈 여부에 따라 진화

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

**적합**: 외부 통신의 직렬화, URL, 메서드까지 검증하고 싶을 때

## 진화 2: @MockitoBean (Spring 수준)

```kotlin
@MockitoBean
private lateinit var partnerClient: PartnerClient

@Test
fun test() {
    given(partnerClient.getPartnerBy("X")).willReturn(PartnerResponse("X","XXX"))
    // ...
}
```

- **장점**: HTTP 설정보다 간결, 여러 케이스 쉽게 작성
- **단점**: 쓸 때마다 **Application Context가 재정의**됨 → 테스트 수가 많아질수록 속도 급감

Spring Boot 4.x에서는 제거된 `@MockBean`, `@SpyBean` 대신 `org.springframework.test.context.bean.override.mockito`의 `@MockitoBean`, `@MockitoSpyBean`을 쓴다. Test class의 non-static field에 붙이거나 `types` 속성으로 type level에 선언할 수 있고 `@Configuration` class에는 사용할 수 없다.

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

- **장점**: Mock을 실제 Bean으로 등록 → **Context 재정의 없음**. 속도, 일관성 확보
- **단점**: **멀티 모듈 환경**에서 import, 설정 까다로움

**적합**: 단일 모듈, Context 부담이 큰 프로젝트

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

**적합**: 멀티 모듈, 마이크로서비스 단일 저장소

## 단계 비교표

| 방식 | 셋업 난이도 | 실행 속도 | 멀티 모듈 | 적합 시점 |
|---|---|---|---|---|
| Mock Server | 높음 | 중간 | O | HTTP 세부까지 검증 필요 |
| @MockitoBean | 낮음 | 낮음 | O | 테스트 수 적음 |
| @TestConfiguration | 중간 | 높음 | 제한 | 단일 모듈, 대규모 테스트 |
| java-test-fixtures | 높음 | 높음 | 최적 | 멀티 모듈 대형 프로젝트 |

## 출처
- [카카오페이 — Mock 테스트 코드 Part 1](https://tech.kakaopay.com/post/mock-test-code/)
- [카카오페이 — Mock 테스트 코드 Part 2](https://tech.kakaopay.com/post/mock-test-code-part-2)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
