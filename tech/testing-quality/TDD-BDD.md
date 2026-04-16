---
tags: [testing, tdd, bdd, quality, given-when-then]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["TDD", "BDD", "TDD vs BDD", "Given When Then"]
---

# TDD · BDD

**TDD(Test-Driven Development)** 는 테스트를 먼저 작성하고 그에 맞춰 구현을 채워 나가는 개발 방식. **BDD(Behaviour-Driven Development)** 는 TDD의 파생으로, **"사용자가 관찰 가능한 행위"** 를 기준으로 시나리오를 기술하여 비개발자와도 공유 가능한 명세를 테스트로 쓴다. 배타적이지 않고 보완 관계다.

## 핵심 명제

- **TDD = 구현 품질 중심** — "이 함수가 기대대로 동작하는가"
- **BDD = 요구사항 중심** — "이 기능이 사용자 시나리오를 만족하는가"
- TDD는 **단위**, BDD는 **기능/스토리** 수준을 주로 다룸
- 둘 다 **테스트가 먼저**라는 점은 같지만, 테스트의 **시점·주체·서술 방식**이 다르다

## TDD: Red-Green-Refactor

1. **Red** — 실패하는 테스트를 먼저 작성. 아직 구현이 없으므로 당연히 실패
2. **Green** — 테스트를 통과시키는 가장 단순한 구현
3. **Refactor** — 중복 제거·가독성 개선. 테스트가 안전망 역할

### 얻는 것

- 모듈의 역할이 **테스트로 먼저 선언**되므로 인터페이스가 명료해짐
- 변경 시 회귀를 즉시 감지 → 리팩터링 자유도↑
- 디자인 감각 훈련(테스트 가능한 설계 = 느슨한 결합)

### 함정

- **구현을 깨는 테스트**(implementation detail에 밀착한 mock) — 리팩터링마다 테스트가 줄줄이 깨짐
- **테스트 커버리지를 목표화** — 숫자를 맞추다가 의미 없는 getter/setter 테스트를 양산
- **통합/시스템 결함을 못 잡음** — 단위 테스트만 통과해도 상호작용에서 터짐

## BDD: Given-When-Then

인간이 읽을 수 있는 **시나리오 문장**으로 테스트를 서술한다.

```gherkin
Feature: 쿠폰 발급
  Scenario: 선착순 범위 안에서 쿠폰을 받는다
    Given 이벤트 "BLACK_FRIDAY"에 쿠폰 한도가 100개 남아 있고
     And 사용자 "alice"가 참여한 적이 없을 때
    When 사용자 "alice"가 쿠폰 발급을 요청하면
    Then 쿠폰 발급이 성공하고
     And 남은 쿠폰 수가 99가 된다
```

- **Given** — 초기 상태(전제)
- **When** — 일어나는 사건·행동
- **Then** — 관찰 가능한 결과

### 얻는 것

- 비개발자(기획·QA·도메인 전문가)도 **읽고 검증** 가능 → 요구사항 공유 도구
- **외부 행위**에 묶인 테스트이므로 내부 구현 변경에 강함 → TDD의 "깨지는 테스트" 문제 완화
- 시나리오 자체가 **살아있는 문서(living documentation)** — 문서와 실제 동작이 동기화

### 함정

- 지나친 추상화 — Step 정의가 너무 일반화되면 재사용성은 높아지지만 의미 추적 어려움
- 시나리오 폭증 — 에지 케이스를 전부 시나리오로 만들면 유지 비용 급증. 단위 테스트와 역할 분담
- 도구 오버헤드 — Cucumber·Behave 같은 도구의 학습 곡선

## 핵심 차이 표

| 축 | TDD | BDD |
|---|---|---|
| 관점 | 개발자(내부 구조) | 사용자/이해관계자(외부 행위) |
| 단위 | 함수·클래스 | 시나리오·스토리 |
| 서술 | 테스트 코드(assert) | Given-When-Then 자연어 |
| 도구 | JUnit·Jest·Vitest·pytest | Cucumber·SpecFlow·Behave·Jest describe/it |
| 리팩터링 내성 | 약함(구현 결합 쉬움) | 강함(행위 결합) |
| 비개발자 협업 | 어려움 | 용이 |

## 실무에서의 조합

- **피라미드의 위층을 BDD, 아래층을 TDD** — 시나리오 테스트는 핵심 유즈케이스만, 나머지는 단위 테스트
- **BDD 문법 + TDD 구조** — Jest/Vitest의 `describe("when ...", () => { it("then ...", ...) })` 네이밍 자체로 Given-When-Then 정신을 살릴 수 있음. 별도 Gherkin 도구가 과하다면 이걸로 충분
- **계약 테스트(Contract Test)와 연계** — BDD 시나리오로 외부 API의 기대 동작 고정

## 테스트 서술 스타일 비교

### TDD 스타일(결과 중심)

```typescript
test("calculateDiscount applies 10% when amount >= 10000", () => {
  expect(calculateDiscount(10000)).toBe(1000);
});
```

### BDD 스타일(행위 중심)

```typescript
describe("주문 할인 정책", () => {
  describe("주문 금액이 1만원 이상일 때", () => {
    it("10% 할인이 적용된다", () => {
      expect(calculateDiscount(10000)).toBe(1000);
    });
  });
});
```

서술이 기능 요구사항을 거의 그대로 옮긴 형태가 된다.

## 흔한 오해

- "BDD = Cucumber" — 도구와 개념을 혼동. Gherkin 없이도 BDD 정신은 살릴 수 있다
- "BDD는 느리고 번거롭다" — 단위 테스트 대체가 아니라 **상위 레이어 추가**. 역할 분담이 핵심
- "TDD 하면 디자인이 좋아진다" — 자동은 아님. 리팩터 스텝을 건너뛰면 오히려 오염된다
- "커버리지 100%면 안전하다" — 커버리지는 충분 조건이 아니라 필요 조건. 분기·경로·상호작용 검증 필요

## 면접 체크포인트

- TDD의 Red-Green-Refactor 한 문장
- BDD의 Given-When-Then 형식과 얻는 이점
- TDD와 BDD가 **배타적이지 않은** 이유(피라미드 층위 다름)
- 구현 디테일에 밀착한 테스트가 왜 해로운가
- Cucumber 없이 Jest·Vitest만으로 BDD 정신을 살리는 방법

## 출처
- [Popit — BDD(Behaviour-Driven Development)에 대한 간략한 정리](https://www.popit.kr/bdd-behaviour-driven-development%EC%97%90-%EB%8C%80%ED%95%9C-%EA%B0%84%EB%9E%B5%ED%95%9C-%EC%A0%95%EB%A6%AC/)
- [mingule — TDD, BDD란?](https://mingule.tistory.com/43)

## 관련 문서
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Test-Fixture|Test fixture 전략]]
- [[Test-Isolation|Test isolation]]
