---
tags: [testing, mock, mockbean, testconfiguration, test-fixtures, black-box]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Mock Testing Strategy", "Mock 테스트 설계 전략", "Black Box 격리"]
---

# Mock 테스트 전략: Black Box 격리와 설계 피드백

## Black Box 격리 원칙

Mock의 목적은 **Black Box 전이 차단**.

### 문제

- PartnerClient가 HTTP 통신 + 비즈니스 로직 둘 다 담당 → 책임이 분리되지 않음
- 이를 Mocking하면 비즈니스 로직 테스트까지 영향

### 해결

- **책임 분리**
  - `PartnerClient` — 순수 HTTP 통신
  - `PartnerClientService` — 예외 처리, 도메인 로직
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

여러 팀, 서비스가 공유하는 **Mock 서버 플랫폼**. 해결 문제: 의존 서비스 점검 중 테스트 불가, 외부 협력 필요, 로컬 환경 제약, 부하 테스트 시 외부 영향. 구성: MockServer 오픈소스 + Web UI + API 관리 + 모니터링. 공용(읽기/쓰기) + 성능 테스트용(읽기 전용) 분리 운영. 팀 간 Mock 공유로 통합 플로우 테스트 용이.

## 흔한 실수

- **모든 Bean을 @MockitoBean** → Context 재정의 폭발, CI 속도 급감
- **Mock 위치를 깊숙한 내부에** → Black Box가 안쪽으로 전이, 비즈니스 로직까지 격리됨
- **Mock Server 코드 중복** → 테스트마다 동일 Mocking 반복
- **외부 라이브러리 타입을 반환** — `ResponseEntity`, `Mono`를 그대로 → 의존성 전파
- **테스트 편의로 운영 코드 수정** — 올바른 순서는 운영 코드 설계 → 테스트 쉬워짐

## 면접 체크포인트

- Mock Server, @MockitoBean, @TestConfiguration, java-test-fixtures의 **진화 경로**와 조건
- Black Box 전이 개념과 격리 원칙
- 얇은 어댑터 + 비즈니스 로직 분리
- 외부 라이브러리 의존성 전파 차단
- "테스트 어려움 = 운영 코드 설계 신호"의 실제 적용 사례

## 출처
- [카카오페이 — Mock 테스트 코드 Part 1](https://tech.kakaopay.com/post/mock-test-code/)
- [카카오페이 — Mock 테스트 코드 Part 2](https://tech.kakaopay.com/post/mock-test-code-part-2)
- [카카오페이 — 사내 공통 Mock 서버](https://tech.kakaopay.com/post/how-to-simplify-kakaopay-testing-using-a-common-mock-server)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)

## 관련 문서
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist, Test Double]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Test-Fixture|Test Fixture 전략]], [[Test-Isolation|Test Isolation]]
