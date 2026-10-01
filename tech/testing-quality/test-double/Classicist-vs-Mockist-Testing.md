---
tags: [testing, tdd, mockist, classicist, test-double, state, behavior]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Classicist vs Mockist Testing", "Classic TDD vs Mockist TDD", "Test Double"]
---

# Classicist vs Mockist, Test Double

TDD의 대표 접근으로 **Classicist(고전파, Chicago, Detroit)** 와 **Mockist(런던파)** 가 있다. 고전파는 실제 객체와 상태 검증을 우선하고, 런던파는 협력 객체의 기대 호출을 대역으로 정의한다. Inside-Out과 Outside-In은 출발 방향이며 학파와 반드시 일치하지는 않는다. 사용자 관점의 인수 테스트부터 시작해 실제 도메인 객체를 만드는 조합도 가능하다.

## 핵심 명제

- **Classicist** — Sociable과 상태 검증을 선호하며 Inside-Out과 조합하기 쉽다
- **Mockist** — Solitary와 협력 검증을 선호하며 Outside-In과 조합하기 쉽다
- 한쪽이 절대 우위가 아님 — **협력 복잡도와 외부 의존성**이 선택 기준
- Mock을 과도히 쓰면 **깨지기 쉬운 테스트**, 안 쓰면 **긴 셋업**

## 용어

- **SUT** (System Under Test) — 테스트 대상 객체, 클래스
- **협력 객체** — SUT가 의존하는 객체
- **Sociable Test** — 협력 객체까지 실제로 호출
- **Solitary Test** — 협력 객체를 Test Double로 대체해 고립

## Test Double 5종

| 종류 | 역할 |
|---|---|
| **Dummy** | 단순 인스턴스. 호출되지 않음 (인자 채우기용) |
| **Stub** | 정해진 값만 반환 |
| **Fake** | 가벼운 실제 구현 (인메모리 DB 등) |
| **Spy** | Stub + 호출 정보 기록 |
| **Mock** | 호출, 반환, 기대 행위를 사전 지정 |

실무에서는 같은 대역이 여러 역할을 맡기도 한다. 검증 대상이 상태인지 호출인지 구분하면 테스트 의도를 설명하기 쉽다.

### 인메모리 저장소 Fake의 계약

Fake는 조회와 저장을 실제로 수행하는 간소한 구현이며, TDD Green 단계의 상수 반환인 Fake It과 구분한다. 인메모리 저장소가 통과한 테스트는 실제 DB의 매핑, 제약, 쿼리와 트랜잭션을 검증하지 않는다.

- 공유할 계약을 정한다: 없는 값 처리, 중복과 오류 정책, 저장 후 조회, 검색과 페이지 순서.
- 도메인 테스트는 Fake로 빠르게 돌리고, 계약 중 두 구현이 공유해야 하는 사례는 실제 저장소에도 실행한다.
- ORM 매핑과 트랜잭션 같은 실제 구현 고유 동작은 별도 통합 테스트로 남긴다.
- Fake에 DB 전체를 재구현하지 않는다. 더 충실한 대역이 너무 복잡하면 실제 DB 테스트를 선택한다.

## Classicist (Chicago, Detroit)

- **실제 객체를 우선** — Test Double은 꼭 필요할 때만
- **상태(State) 검증** — 실행 후 객체의 상태를 단언
- **Inside-Out 설계** — 도메인 중심부터 만들고 점차 바깥으로
- 리팩터링에 강함 — 내부 구조가 바뀌어도 상태만 맞으면 OK

```kotlin
@Test
fun shouldAccumulatePoints() {
    val account = Account()
    account.addPoints(10)
    account.addPoints(20)
    assertEquals(30, account.points) // 상태 검증
}
```

### 장점

- 테스트가 **내부 구현에 덜 의존** → 리팩터링 후에도 그대로 통과
- 실제 협력을 확인 → **통합적 신뢰**
- Test Double 셋업 시간 절약

### 단점

- 협력 객체의 준비가 복잡하면 **테스트도 길어짐**
- 외부 시스템(HTTP, DB) 의존 시 **느리고 불안정**
- 실패 시 원인 격리가 어려움

## Mockist (London)

- **협력 객체는 거의 모두 Mock**
- **행위(Behavior) 검증** — 어떤 메서드가 어떤 인자로 호출됐는지
- **Outside-In 설계** — UI/컨트롤러부터 만들며 아래 레이어를 Mock으로 정의
- 인터페이스 설계가 **테스트에서 먼저** 드러남

```kotlin
@Test
fun shouldSendEmailOnRegistration() {
    val sender = mock<EmailSender>()
    val service = RegistrationService(sender)
    service.register("user@example.com")
    verify(sender).send(eq("user@example.com"), any()) // 행위 검증
}
```

### 장점

- 외부 의존성 제거 → **빠르고 예측 가능**
- 협력 객체와의 **계약**을 테스트가 문서화
- 병렬 팀 개발에 유리 — Mock 인터페이스로 합의

### 단점

- **내부 구현에 밀착** — 리팩터링 시 테스트가 자주 깨짐
- 과도한 Mock은 **실제 동작과 괴리** (false green)
- 행위 검증만으로는 상태 오류를 놓치기 쉬움

## 4가지 상황별 선택

### 1. 외부 API 호출

- 네트워크, 서드파티 의존 → **Mockist 우위**. 실제 호출은 느리고 불안정

### 2. 요구사항 추가

- 동일 기능의 확장 → **Classicist 우위**. Mock 설정 수정 최소화

### 3. 버그 발생

- 특정 단위만 격리 필요 → **Mockist 우위**. 실패 범위 명확

### 4. 협력 객체 설계 누락

- 인터페이스를 테스트에서 정의 → **Mockist 우위**. Outside-In의 자연스러운 부산물

## 상태 vs 행위 검증

### 상태 검증

- "작동 후의 **결과**가 올바른가"
- `assertEquals(expected, actual.state)`
- 하드 코딩된 기대값 권장 — 저장한 객체를 재사용하면 **self-assertion** 함정

### 행위 검증

- "올바른 메서드를 올바른 인자로 호출했는가"
- `verify(mock).method(args)`
- 호출 횟수, 순서까지 검증 가능

### 깨지기 쉬운 테스트 회피

- **리팩터링마다 실패하는 테스트**는 행위 검증 남용의 증상
- 상태 검증으로 전환 검토
- "결과가 같다면 과정은 상관없다" 원칙

## 실전 선택 가이드

- **도메인 객체 자체 테스트** → Classicist (상태 검증)
- **외부 시스템 어댑터** → Mockist (행위 검증)
- **복잡한 비즈니스 로직 서비스** → 혼합 — 도메인은 실제, 외부는 Mock
- **레이어 경계(Controller, Adapter)** → Mockist

## 흔한 실수

- **모든 걸 Mock** — 실제 동작과 괴리. 통합 테스트로 보완 필요
- **실제 DB, 네트워크를 단위 테스트에 포함** — 느림, 불안정
- **상태 검증 시 저장 객체를 그대로 비교** — self-assertion. 하드 코딩 값 권장
- **Mockist 스타일 테스트를 리팩터 후 그대로** → 대량 실패. 상태 검증으로 교체 고려
- **Classic vs Mockist 흑백 논쟁** — 둘 다 도구. 상황에 맞춰
- **실제 구현보다 관대한 Fake** — 예를 들어 실제 구현은 문맥 앵커가 있어야 매칭하는데 페이크는 대상 문자열만 보이면 치환하는 식이면, 그 시나리오를 정확히 겨냥한 회귀 테스트도 초록불만 켠다. Fake는 성공 결과만 흉내 내지 말고 **실제 구현의 실패 조건까지** 흉내 내야 한다

## 면접 체크포인트

- Classicist와 Mockist의 **3가지 축 차이**(Sociable/Solitary, State/Behavior, Inside/Outside)
- Test Double 5종(Dummy, Stub, Fake, Spy, Mock)
- 상태 검증 vs 행위 검증의 트레이드오프
- 깨지기 쉬운 테스트의 원인과 완화
- 본인 프로젝트에서 둘을 **어떻게 혼합**하는가

## 출처
- [dev-monkey-dugi — Test Double vs Real Objects](https://dev-monkey-dugi.tistory.com/140)
- [cl8d — Classic TDD vs Mockist TDD](https://cl8d.tistory.com/43)
- [Mocks Aren't Stubs — Martin Fowler](https://martinfowler.com/articles/mocksArentStubs.html)
- [인프런, 클린 코더스, Presenting TDD](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279467)
- [인프런, 클린 코더스, Vertical Slice 방식으로 GraphQL 어플리케이션을 TDD로 구현하기](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279469)
- [테스트는 다 초록불이었다 — 아무도 안 읽는 값이었고, 마스킹도 안 걸릴 뻔했다 — velog](https://velog.io/@donghoong2/OCR-WORKER-%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8A%94-%EB%8B%A4-%EC%B4%88%EB%A1%9D%EB%B6%88%EC%9D%B4%EC%97%88%EB%8B%A4-%EA%B7%BC%EB%8D%B0-%EC%95%84%EB%AC%B4%EB%8F%84-%EC%95%88-%EC%9D%BD%EB%8A%94-%EA%B0%92%EC%9D%B4%EC%97%88%EA%B3%A0-%EB%A7%88%EC%8A%A4%ED%82%B9%EB%8F%84-%EC%82%AC%EC%8B%A4-%EC%95%88-%EA%B1%B8%EB%A6%B4-%EB%BB%94%ED%96%88%EB%8B%A4)

## 관련 문서
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Isolation|Test Isolation]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[TDD-BDD|TDD, BDD]]
