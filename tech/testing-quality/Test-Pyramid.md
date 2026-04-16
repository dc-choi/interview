---
tags: [testing, pyramid, unit-test, integration-test, e2e, contract-test]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Pyramid", "테스트 피라미드", "Practical Test Pyramid"]
---

# Practical Test Pyramid

테스트의 **종류·범위·수량**을 시각화한 고전적 가이드. Mike Cohn이 제안한 3층(Unit·Service·UI)이 원형이며, 이후 Contract·Acceptance·Exploratory 같은 계층이 추가로 논의됐다. **원칙은 단순**: 하위로 갈수록 빠르고 많고, 상위로 갈수록 느리고 적게. 빠른 피드백과 신뢰성의 균형.

## 3층 원형

```
          E2E (소수)
        Integration
      Unit (다수)
```

- **Unit** — 빠름·격리·많음. 코드 단위의 의도 확인
- **Integration** — 외부 의존(DB·API·파일)과의 상호작용 검증
- **E2E** — 배포된 전체 시스템을 사용자 관점으로

**왜 피라미드 모양인가**: 상위로 갈수록 **실행 시간·유지 비용·불안정성**이 증가. 같은 커버리지를 E2E로만 확보하면 CI가 10분→1시간이 된다.

## Unit Test

### 정의

- 코드베이스의 **특정 단위**가 의도대로 작동하는지
- **Arrange · Act · Assert** 구조
- Mock/Stub으로 외부 의존 격리
- 가장 **많은 수량**

### 특징

- **수 ms~수십 ms** 실행
- 하나의 실패 = 하나의 원인 (격리되어 있으므로)
- 리팩터링 안전망의 주력

### 작성 원칙

- **테스트 이름**이 의도를 드러냄 — `shouldReturnEmptyWhenInputIsNull`
- 한 테스트 = 한 개의 단언
- 의존 객체는 Test Double로 ([[Classicist-vs-Mockist-Testing]])
- 도메인 로직 커버리지 **높게** (Service Layer 기준 70~80%)

## Integration Test

### 정의

- **외부 부분**(DB·파일 시스템·메시지 큐·외부 API)과의 상호작용 검증
- 데이터 **직렬화/역직렬화 경계**에서 특히 필요
- Unit보다 **느리고 적음**

### 실행 환경

- **로컬 실제 인스턴스** 권장 (H2 같은 인메모리는 DB 특화 기능 누락)
- [[TestContainers-Integration|Testcontainers]]로 매 실행마다 깨끗한 컨테이너
- Docker Compose로 네트워크 구성도 재현

### 대상

- Repository·DAO·ORM의 실제 쿼리 검증
- HTTP API의 전체 경로(Controller → Service → Repository)
- 메시지 Publish/Consume 흐름
- 외부 API 어댑터 (Wiremock·Mock Server로 감싸기도)

## Contract Test

Unit과 Integration 사이의 **계약 검증**.

- 두 서비스(예: Order Service ↔ Payment Service) 간 **API 계약**이 유지되는지
- **Consumer-Driven Contract** — 소비자 측이 계약을 정의
- Pact·Spring Cloud Contract 같은 도구
- 마이크로서비스에서 E2E 대안으로 자주 사용

### 효과

- E2E 없이도 계약 깨짐을 조기 탐지
- 배포 독립성 확보
- CI 시간 단축

## UI / E2E Test

### 정의

- 배포된 전체 시스템을 **실제 UI로** 검증
- Selenium·WebDriver·Cypress·Playwright

### 특징

- 가장 **느림**, 가장 **불안정**
- 유지 비용 높음 — UI 변경마다 깨짐
- 개수 최소화 — **핵심 사용자 여정**만

### 피해야 할 함정

- **UI 테스트로 모든 것을 검증** — 유지 비용으로 조직 마비
- **Flaky 테스트 방치** — 한두 번 실패해도 넘기는 문화가 되면 붕괴
- **1:1 기능 매핑** — Unit·Integration에서 잡을 수 있는 걸 E2E로

## 그 외 계층

### Acceptance Test

- 비즈니스 요구사항이 충족되는지 검증
- Gherkin(Given-When-Then)으로 기술 ([[TDD-BDD|BDD]])
- 이해관계자·QA가 읽을 수 있는 형태

### Exploratory Test

- 자동화 불가 영역의 **수동 탐색**
- QA 엔지니어·도메인 전문가의 창의적 탐색
- 자동화 이전·자동화 사각지대

## 계층별 비중 가이드

| 층 | 비중 | 실행 속도 | 주 도구 |
|---|---|---|---|
| Unit | 70% | ms | JUnit·Jest·pytest |
| Integration | 20% | 초 | Testcontainers·Wiremock |
| Contract | 5% | 초 | Pact·Spring Cloud Contract |
| E2E | 5% | 분 | Cypress·Playwright |

**이상적 수치는 없다** — 도메인·리스크·팀 성숙도에 따라 조정.

## 테스트 중복 피하기

- 같은 로직을 **여러 층**에서 중복 검증 = 유지 비용만 증가
- Unit에서 이미 검증한 것을 E2E에서 다시 확인 금지
- **계층별 책임** 명확히:
  - Unit: 도메인 로직
  - Integration: 외부 상호작용
  - Contract: 서비스 간 계약
  - E2E: 핵심 사용자 여정

## 깔끔한 테스트 코드

- **이름으로 의도** 표현
- **Arrange · Act · Assert** 구분 (공백 한 줄로)
- **한 테스트 한 목적** — 여러 단언은 관련 있을 때만
- Test Fixture 재사용 ([[Test-Fixture]])
- **테스트 독립성** — 실행 순서 무관 ([[Test-Isolation]])
- Magic Number 대신 이름 있는 상수

## 배포 파이프라인과의 연결

```
PR 생성 → Unit/Integration (2~3분) → Merge
Merge → Contract + Smoke E2E (5~10분) → Staging
Staging → 전체 E2E + 성능 (30분~) → Production
```

빠른 피드백이 필요한 단계엔 **하위 테스트만**, 최종 검증에 E2E.

## 조직별 현실

- **스타트업 초기**: Unit + 일부 Integration. E2E 없거나 최소
- **중견**: 3층 + Contract
- **엔터프라이즈**: 5층 이상 + Exploratory·Performance 별도
- **마이크로서비스 조직**: Contract Test의 비중 高

## 흔한 실수

- **피라미드가 아닌 아이스크림 콘**: E2E 과다, Unit 부족 → CI 지옥
- **아이스하키 스틱**: Unit만 많고 Integration·E2E 없음 → 실제 통합 문제 늦게 발견
- **Flaky E2E 방치** — 신뢰도 붕괴의 시작
- **모든 테스트를 Unit으로** — Mock 남용 → 실제 동작과 괴리
- **계층별 책임 혼동** — 같은 로직 여러 곳 중복

## 면접 체크포인트

- 피라미드 3~5층의 **책임 구분**
- 상위 층이 적어야 하는 **이유**(시간·비용·불안정)
- Contract Test가 등장한 **배경**(마이크로서비스)
- 아이스크림 콘·하키 스틱 **안티패턴**
- 본인 프로젝트의 **실제 비중**과 개선 방향

## 출처
- [integer blog — Practical Test Pyramid](https://www.integer.blog/practical-test-pyramid/)
- Mike Cohn, *Succeeding with Agile* (원전)
- Martin Fowler — Test Pyramid

## 관련 문서
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist · Test Double]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[TDD-BDD|TDD · BDD]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Isolation|Test Isolation]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
