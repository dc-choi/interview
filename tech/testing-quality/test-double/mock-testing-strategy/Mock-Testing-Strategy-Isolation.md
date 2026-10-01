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

Mock은 외부 의존성을 다루는 얇은 어댑터를 우선 경계로 삼는다. 내부 협력 자체가 중요한 계약이면 선택적으로 호출을 검증한다.

## 레거시 의존성의 Subclass and Override Method

기존 객체가 파일 API나 외부 객체 생성 코드를 직접 호출해 테스트에서 제어하기 어려우면, 그 부분만 메서드로 추출하고 테스트용 하위 클래스에서 대체할 수 있다. **Seam**은 호출 흐름의 일부를 바꾸어 외부 의존성 대신 준비한 값을 넣을 수 있는 지점이다.

1. 변경 대상의 공개 메서드와 그 결과를 관찰할 테스트를 정한다.
2. 파일 목록 조회, 파일 읽기와 쓰기 같은 부작용 경계만 추출한다. 하위 클래스가 대체할 수 있도록 필요한 접근 범위만 연다.
3. 테스트용 하위 클래스는 읽기에 정해진 데이터를 돌려주고, 쓰기는 받은 경로와 내용을 기록한다.
4. 원래 공개 동작을 호출한 뒤 반환값과 기록된 쓰기를 검증한다. 도메인 판단까지 오버라이드하면 검증할 로직을 우회한다.

정적 호출 자체를 상속으로 오버라이드하는 방식이 아니다. 정적 API 호출을 감싼 인스턴스 메서드를 대체한다. 상속 가능 여부, 메서드의 재정의 조건과 생성자 실행 중 부작용은 언어별로 확인한다. 2026-10-01 TypeScript 공식 Handbook 기준으로 `private`는 타입 검사 시의 제약이고 `#private`는 런타임에서도 접근이 제한된다. Java의 재정의 제약을 그대로 적용하지 않는다.

이 기법은 큰 의존성 변경 전에 특성화 테스트를 확보하는 제한된 선택지다. 테스트를 위해 모든 private 메서드를 public으로 열지 않는다. 반복적으로 교체해야 하는 파일 시스템 같은 경계는 생성자에 협력 객체를 주입하는 구조가 더 적합할 수 있다. 서브클래스가 내부 구현에 결합되므로, 안전망을 만든 뒤 책임 분리와 주입으로 전환할지 검토한다([[Legacy-Code-Testing]]).

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
- **테스트 통과만을 위해 업무 동작을 바꾸거나 내부를 무분별하게 공개** — 동작을 보존하며 외부 의존성만 대체하는 최소 seam은 위의 레거시 테스트 기법으로 구분한다.

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
- [Working Effectively with Legacy Code — Michael Feathers](https://www.objectmentor.com/resources/articles/WorkingEffectivelyWithLegacyCode.pdf)
- [TypeScript, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [인프런, 클린 코더스, 레거시코드에 테스트 추가하는 또 하나의 방법 - Subclass and Override Method](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279466)

## 관련 문서
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist, Test Double]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Legacy-Code-Testing|레거시 코드의 특성화, 승인과 변이 테스트]]
- [[Test-Fixture|Test Fixture 전략]], [[Test-Isolation|Test Isolation]]
