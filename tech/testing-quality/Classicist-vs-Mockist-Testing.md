---
tags: [testing, tdd, mockist, classicist, test-double, state, behavior]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Classicist vs Mockist Testing", "Classic TDD vs Mockist TDD", "Test Double"]
---

# Classicist vs Mockist · Test Double

TDD 진영이 두 학파로 나뉜다. **Classicist(고전파·Chicago·Detroit)** 는 실제 객체를 최대한 쓰고 상태로 검증하며 Inside-Out으로 설계한다. **Mockist(런던파)** 는 Test Double로 협력 객체를 분리하고 행위로 검증하며 Outside-In으로 설계한다. 두 접근이 만드는 테스트 특성이 다르고, 상황에 따라 선택이 달라진다.

## 핵심 명제

- **Classicist = Sociable + 상태 검증 + Inside-Out**
- **Mockist = Solitary + 행위 검증 + Outside-In**
- 한쪽이 절대 우위가 아님 — **협력 복잡도와 외부 의존성**이 선택 기준
- Mock을 과도히 쓰면 **깨지기 쉬운 테스트**, 안 쓰면 **긴 셋업**

## 용어

- **SUT** (System Under Test) — 테스트 대상 객체·클래스
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
| **Mock** | 호출·반환·기대 행위를 사전 지정 |

구분은 엄밀하지 않고 실무에서는 섞여 쓰이지만, **"검증 대상이 상태인가 호출인가"** 가 본질 축.

## Classicist (Chicago·Detroit)

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
- 외부 시스템(HTTP·DB) 의존 시 **느리고 불안정**
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

- 네트워크·서드파티 의존 → **Mockist 우위**. 실제 호출은 느리고 불안정

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
- 호출 횟수·순서까지 검증 가능

### 깨지기 쉬운 테스트 회피

- **리팩터링마다 실패하는 테스트**는 행위 검증 남용의 증상
- 상태 검증으로 전환 검토
- "결과가 같다면 과정은 상관없다" 원칙

## 실전 선택 가이드

- **도메인 객체 자체 테스트** → Classicist (상태 검증)
- **외부 시스템 어댑터** → Mockist (행위 검증)
- **복잡한 비즈니스 로직 서비스** → 혼합 — 도메인은 실제, 외부는 Mock
- **레이어 경계(Controller·Adapter)** → Mockist

## 흔한 실수

- **모든 걸 Mock** — 실제 동작과 괴리. 통합 테스트로 보완 필요
- **실제 DB·네트워크를 단위 테스트에 포함** — 느림·불안정
- **상태 검증 시 저장 객체를 그대로 비교** — self-assertion. 하드 코딩 값 권장
- **Mockist 스타일 테스트를 리팩터 후 그대로** → 대량 실패. 상태 검증으로 교체 고려
- **Classic vs Mockist 흑백 논쟁** — 둘 다 도구. 상황에 맞춰

## 면접 체크포인트

- Classicist와 Mockist의 **3가지 축 차이**(Sociable/Solitary, State/Behavior, Inside/Outside)
- Test Double 5종(Dummy·Stub·Fake·Spy·Mock)
- 상태 검증 vs 행위 검증의 트레이드오프
- 깨지기 쉬운 테스트의 원인과 완화
- 본인 프로젝트에서 둘을 **어떻게 혼합**하는가

## 출처
- [dev-monkey-dugi — Test Double vs Real Objects](https://dev-monkey-dugi.tistory.com/140)
- [cl8d — Classic TDD vs Mockist TDD](https://cl8d.tistory.com/43)

## 관련 문서
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Test-Isolation|Test Isolation]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[TDD-BDD|TDD · BDD]]
