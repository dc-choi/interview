---
tags: [testing, tdd, bdd, quality, given-when-then]
status: done
verified_at: 2026-10-01
category: "테스트&품질(Testing&Quality)"
aliases: ["TDD", "BDD", "TDD vs BDD", "Given When Then"]
---

# TDD, BDD

**TDD(Test-Driven Development)** 는 실패하는 테스트, 최소 구현, 리팩토링을 반복하는 개발 방식이다. **BDD(Behaviour-Driven Development)** 는 이해관계자가 관찰 가능한 행위를 예제로 합의하고 명세와 검증을 연결하는 접근이다. 두 방식은 함께 사용할 수 있다.

## 핵심 명제

- **TDD** — 작은 검증 단위의 피드백으로 구현과 설계를 발전시킨다
- **BDD** — 기능이 사용자 시나리오를 만족하는지 예제로 함께 합의한다
- TDD는 단위 테스트에서 많이 쓰지만 HTTP 인수 테스트부터 시작할 수도 있다. BDD의 행위 관점도 여러 테스트 수준에 적용할 수 있다
- 테스트 작성 순서만으로 두 방식을 구분하지 않는다. BDD는 시나리오를 합의하는 협업도 포함한다
- 이 Vault의 기본 개발 흐름은 스펙을 먼저 정하고 테스트로 검증하는 것이다. TDD는 선택 가능한 기법이며 테스트 선작성을 의무화하지 않는다

## TDD: Red-Green-Refactor

1. **Red** — 아직 없는 동작을 검증하는 테스트가 의도한 이유로 실패하는지 확인한다. 환경 장애나 잘못된 assertion에 의한 실패를 구분한다
2. **Green** — 테스트를 통과시키는 가장 단순한 구현
3. **Refactor** — 외부 동작을 유지하며 중복과 구조를 개선한다. 개선할 것이 없다면 변경하지 않고 다음 사례로 간다

TDD의 세 법칙은 실패를 드러낼 만큼만 테스트를 작성하고, 그 실패를 통과할 만큼만 운영 코드를 작성하며, 실패하는 테스트 없이 새 동작을 추가하지 않는 연습 규율이다. 컴파일 실패도 Red가 될 수 있지만, 이 규율이 모든 프로젝트의 개발 방식인 것은 아니다.

### 얻는 것

- 모듈의 역할이 **테스트로 먼저 선언**되므로 인터페이스가 명료해짐
- 변경 시 회귀를 즉시 감지 → 리팩터링 자유도↑
- 디자인 감각 훈련(직접 호출하고 검증하기 어려운 의존성과 인터페이스를 발견하는 피드백)

### 함정

- **구현을 깨는 테스트**(implementation detail에 밀착한 mock) — 리팩터링마다 테스트가 줄줄이 깨짐
- **테스트 커버리지를 목표화** — 숫자를 맞추다가 의미 없는 getter/setter 테스트를 양산
- **통합/시스템 결함을 못 잡음** — 단위 테스트만 통과해도 상호작용에서 터짐

### 비용과 회수 시점

테스트를 먼저 쓰면 초기 개발 시간이 늘 수 있다. 대신 코드는 작성보다 유지보수에 드는 시간이 더 긴 경향이 있고, 그 비용은 변경이 반복될 때 회수된다. 사용자 CRUD API를 HTTP 수준 테스트로 먼저 만든 뒤, Router 도입, 컨트롤러 분리, 서버 구동 분리 같은 구조 변경과 메모리 배열 저장소를 ORM과 SQLite로 바꾸는 교체를 같은 테스트로 통과시킨 사례가 회수의 전형이다. 교체 때 테스트 쪽 변경은 스키마 동기화와 샘플 데이터 같은 준비 코드였다.

- 회수 조건은 테스트가 내부 구현이 아니라 외부 계약(HTTP 요청과 응답, 저장 결과)에 묶여 있는 것이다. 구현 상세에 밀착한 테스트는 리팩터링마다 함께 고쳐야 해서 비용만 남는다.
- 수명이 짧거나 곧 버릴 코드는 회수 시점이 오지 않을 수 있다. 테스트를 먼저 쓰든 스펙을 먼저 쓰고 구현 뒤 테스트로 검증하든, 판단 기준은 그 코드가 얼마나 오래, 얼마나 자주 바뀌는가다.
- 회수는 자동이 아니다. 외부 동작에 맞춘 테스트와 Refactor 단계가 있어야 변경 안전망이 된다([[HTTP-API-Integration-Testing#API를 한 동작씩 TDD한다|HTTP API 통합 테스트]]).

### Red-Green 루프를 빠르게 돌리기

한 번에 한 동작만 Red에서 Green으로 옮길 때는 작업 중인 테스트만 단독으로 돌리고, 저장할 때마다 다시 실행되게 하면 피드백이 짧아진다. 한 동작이 통과하면 집중 표시를 다음 테스트로 옮기고, 마지막에는 전체 스위트를 돌린다. 아래는 2026-10-01 공식 문서 기준이며, Mocha 12.0.2와 Node.js 26.7의 실행 결과를 함께 적었다.

| 러너 | 집중 실행 | 감시 실행 | 커밋된 집중 표시 차단 |
|---|---|---|---|
| Mocha 12 | `it.only`, `describe.only` | `--watch`(`-w`) | CI 스크립트나 CI용 설정에 `--forbid-only`를 명시한다. 공식 문서는 v12부터 `CI` 환경 변수가 있으면 기본값이 true라고 하지만 12.0.2 실행에서는 `CI=true`에서도 `only`만 돌고 성공 종료했다 |
| Vitest 5 | `test.only` | `vitest`가 개발 환경에서 기본 watch | `allowOnly` 기본값이 `!process.env.CI`라 CI에서는 `only`가 있으면 실패 |
| Node test runner | `only: true`, `--test-only` 또는 격리 비활성화가 있어야 적용 | `node --test --watch` | `--test-only`도 격리 비활성화도 없으면 `only`가 범위를 좁히지 않는다. 격리를 끈 실행(`--test-isolation=none`, 파일 직접 실행)에서는 커밋된 `only`가 다른 테스트를 빼므로 lint나 CI 검색으로 막는다 |
| Jest 30 | `test.only`, `fit` | `--watch`(변경 관련), `--watchAll`(전체) | CLI 옵션은 없다. eslint-plugin-jest의 `no-focused-tests`(recommended 포함)로 막는다 |

커밋된 `only`는 나머지 테스트를 조용히 건너뛰게 해서 CI가 일부만 실행하고도 Green이 될 수 있다. 커밋 전에 집중 표시를 지우고 전체 스위트를 실행하며, CI에서는 러너의 forbid-only 계열 설정이나 lint로 차단한다. Mocha의 exclusive 테스트는 parallel 모드와 함께 쓸 수 없다. Node test runner의 실행 방법은 [[Test-Runner-Basics|테스트 러너 기본]]에 있다.

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
- **When** — 일어나는 사건, 행동
- **Then** — 관찰 가능한 결과

### 얻는 것

- 비개발자(기획, QA, 도메인 전문가)도 **읽고 검증** 가능 → 요구사항 공유 도구
- **외부 행위**에 묶인 테스트이므로 내부 구현 변경에 강함 → TDD의 "깨지는 테스트" 문제 완화
- 시나리오 자체가 **살아있는 문서(living documentation)** — 문서와 실제 동작이 동기화

### 함정

- 지나친 추상화 — Step 정의가 너무 일반화되면 재사용성은 높아지지만 의미 추적 어려움
- 시나리오 폭증 — 에지 케이스를 전부 시나리오로 만들면 유지 비용 급증. 단위 테스트와 역할 분담
- 도구 오버헤드 — Cucumber, Behave 같은 도구의 학습 곡선

## 핵심 차이 표

| 축 | TDD | BDD |
|---|---|---|
| 관점 | 작은 피드백으로 행위와 구조를 발전시킴 | 이해관계자가 예제로 기대 행위를 합의 |
| 단위 | 함수와 클래스부터 인수 테스트까지 | 시나리오와 스토리를 중심으로 여러 수준에 적용 |
| 서술 | 테스트 코드(assert) | Given-When-Then 자연어 |
| 도구 | JUnit, Jest, Vitest, pytest | Cucumber, Reqnroll(SpecFlow 후속), Behave, Jest describe/it |
| 리팩터링 내성 | 공개 계약에 묶이면 강함, 구현 상세에 결합하면 약함 | 행위 명세를 유지하면 강함, Step 구현의 결합은 별도 관리 |
| 비개발자 협업 | 어려움 | 용이 |

## 실무에서의 조합

- **인수 예제와 작은 테스트의 조합** — 핵심 시나리오는 공개 경계에서 확인하고 세부 규칙은 빠른 단위 테스트로 검증한다
- **Given-When-Then 서술** — Jest/Vitest의 `describe`와 `it`로 준비, 행동과 결과를 표현할 수 있다. 별도 Gherkin 도구 없이도 읽기 쉬운 테스트를 만들 수 있지만, 이름만으로 BDD의 협업 과정이 생기지는 않는다
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

- BDD를 Cucumber와 동일시 — 도구와 개념을 혼동한다. Gherkin 없이도 예제에 기반한 협업을 할 수 있다
- BDD를 단위 테스트 대체로 적용 — 요구사항 합의와 테스트 수준의 역할을 구분해야 한다
- TDD가 좋은 설계를 보장 — 자동은 아니다. 리팩토링과 책임 경계 검토가 필요하다
- 구현 후 작성한 테스트는 신뢰할 수 없다고 단정 — 순서보다 명세의 독립성, 실패 경로, 결함 감지 능력을 확인한다
- 커버리지 100%가 안전을 보장 — 실행한 범위만 보여준다. 빠진 요구사항, assertion, 경계값은 [[Legacy-Code-Testing|특성화와 변이 테스트]]로 별도 검토한다

## 면접 체크포인트

- TDD의 Red-Green-Refactor 한 문장
- TDD의 초기 비용이 회수되는 조건과 회수되지 않는 코드
- 커밋된 `only`가 CI를 속이는 방식과 차단 방법
- BDD의 Given-When-Then 형식과 얻는 이점
- TDD와 BDD가 함께 적용되는 이유(개발 피드백 루프와 기대 행위 합의의 조합)
- 구현 디테일에 밀착한 테스트가 왜 해로운가
- Cucumber 없이 Jest, Vitest만으로 BDD 정신을 살리는 방법

## 출처
- [Popit — BDD(Behaviour-Driven Development)에 대한 간략한 정리](https://www.popit.kr/bdd-behaviour-driven-development%EC%97%90-%EB%8C%80%ED%95%9C-%EA%B0%84%EB%9E%B5%ED%95%9C-%EC%A0%95%EB%A6%AC/)
- [mingule — TDD, BDD란?](https://mingule.tistory.com/43)
- [Reqnroll](https://reqnroll.net/)
- [Cucumber, Behaviour-Driven Development](https://cucumber.io/docs/bdd/)
- [The Cycles of TDD — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html)
- [SpecFlow — NuGet](https://www.nuget.org/packages/SpecFlow)
- [Mocha 공식 문서, Exclusive Tests](https://mochajs.org/declaring/exclusive-tests/)
- [Mocha 공식 문서, Command-Line Usage](https://mochajs.org/running/cli/)
- [Vitest 공식 문서, allowOnly](https://vitest.dev/config/allowonly)
- [Vitest 공식 문서, Command Line Interface](https://vitest.dev/guide/cli)
- [Node.js 공식 문서, Test runner](https://nodejs.org/api/test.html)
- [Jest 공식 문서, Jest CLI Options](https://jestjs.io/docs/cli)
- [eslint-plugin-jest 공식 저장소, no-focused-tests](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-focused-tests.md)
- [인프런, 김정환, 테스트 주도 개발이란?](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6194)
- [인프런, 김정환, 라우터 클래스](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6215)
- [인프런, 김정환, 컨트롤러 함수로 분리](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6216)
- [인프런, 김정환, 데이터베이스와 index 컨트롤러 연동 1](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6225)
- [인프런, 김정환, 데이터베이와 show컨트롤러 연동](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6227)
- [인프런, 김정환, 데이터베이와 destroy 컨트롤러 연동](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6228)
- [인프런, 김정환, 데이터베이와 update 컨트롤러 연동](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6230)
- [인프런, 클린 코더스, 클린 코더스 강의 7. TDD 1](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279445)

## 관련 문서
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[TDD-Refactoring-Practice|TDD 리팩토링 연습법 (의식적인 연습, 정량적 제약)]]
- [[Legacy-Code-Testing|레거시 코드의 특성화, 승인과 변이 테스트]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Test-Fixture|Test fixture 전략]]
- [[Test-Isolation|Test isolation]]
