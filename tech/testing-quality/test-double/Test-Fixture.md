---
tags: [testing, fixture, property-based-testing]
status: done
verified_at: 2026-09-30
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Fixture", "테스트 픽스처"]
---

# Test Fixture 전략

테스트에 필요한 사전 조건(데이터, 환경, 상태)을 일관되게 준비하는 방법이다. 좋은 fixture 전략은 테스트를 읽기 쉽고, 유지보수하기 쉽게 만든다.

## Fixture란

테스트 실행 전에 필요한 모든 준비물:
- **테스트 데이터** — 엔티티 객체, DB 레코드
- **목(Mock) 객체** — 외부 의존성의 대역
- **환경 설정** — 환경변수, 설정값

## Factory 패턴

가장 권장되는 방식. 테스트 데이터를 생성하는 팩토리 함수를 만든다.

**설계 원칙:**
- `createMockAccount()`, `createMockStudent()` 등 엔티티별 팩토리 함수
- 기본값을 제공하되 오버라이드 가능하게 설계
- 자동 증가 ID로 각 호출마다 고유한 데이터 생성 (`let counter = 100; return BigInt(counter++)`)
- `resetIdCounter()` 함수로 테스트 간 ID 카운터 초기화

**장점:**
- 테스트에서 관심 있는 필드만 명시하면 됨
- 엔티티 구조 변경 시 팩토리만 수정

상태가 있는 애그리거트의 상태별 팩토리, 여러 테스트가 공유하는 시나리오 준비 메서드와 중첩 구조의 결과 비교는 [[Test-Fixture-Scenario-Setup|상태별 픽스처와 시나리오 준비]]로 분리했다.

## 무작위 Fixture와 재현성

정적 기본값만 반복하면 우연히 한 입력만 검증하게 된다. 무작위 객체 생성기는 테스트가 관심 없는 필드를 채우고 더 다양한 조합을 통과시키는 데 유용하지만, 실패를 재현할 seed가 반드시 남아야 한다.

- 실패 로그의 seed로 같은 객체 그래프를 다시 생성한다.
- 테스트의 핵심 조건과 경계값은 명시하고 나머지 필드만 생성기에 맡긴다.
- random fixture는 property-based testing이나 명시적인 edge case를 대체하지 않는다.
- Bean Validation 애노테이션을 읽어 유효한 값을 생성해도 도메인 불변식까지 자동으로 만족한다고 가정하지 않는다.

Java에서는 Instancio 같은 도구가 객체 그래프와 seed 재현을 지원한다. JUnit에서는 `InstancioExtension`이 실패 메시지에 seed를 남기고 `@Seed`로 같은 데이터를 다시 만든다. Bean Validation/JPA 애노테이션 기반 생성은 현재 opt-in 실험 기능이므로 설정과 지원 애노테이션을 확인하고, 도메인 전용 generator는 테스트 코드에서 명시적으로 관리한다.

### 테스트 데이터 준비 방식

| 방식 | 데이터 | 강점 | 한계 |
|---|---|---|---|
| 예제 기반 | 미리 정한 값 | 명확하고 항상 같은 조건 | 예제 하나의 성공이 기능 전체를 보장하지 않고, 경계값을 모두 쓰기 번거롭다 |
| 무작위 데이터 | 허용 범위 안의 임의 값 | 관심 없는 필드를 번거로움 없이 다양하게 채운다 | 재현하려면 seed가 필요하다 |
| 프로퍼티 기반 | 생성한 입력 다수 | 코드가 지켜야 할 성질이 모든 입력에서 성립하는지 확인하고, 실패를 최소 입력으로 줄인다 | 성질을 정의하는 설계가 필요하다 |
| 형식 검증 | 데이터 없음 | 조건을 수학적으로 표현하고 항상 참임을 증명해 놓치기 쉬운 edge case까지 다룬다 | 명세와 증명 비용이 크다 |

도구(2026-09-30 공식 사이트 기준):

- Instancio: 중첩 객체, 컬렉션, 배열까지 채우는 객체 그래프 자동 생성(6.1).
- Datafaker: 이름, 이메일 같은 형식 있는 값을 만든다. 250개가 넘는 provider가 있고 데모 데이터 준비에도 쓴다.
- Fixture Monkey: 네이버가 만든 Java, Kotlin 객체 무작위 생성 라이브러리.
- jqwik: JUnit Platform 위의 프로퍼티 기반 테스트. README가 순수 maintenance mode를 밝힌다. 후원이 없는 한 새 기능 개발은 하지 않고 JUnit Platform 같은 의존성 갱신과 치명적 버그 수정만 한다.
- TypeScript에서는 fast-check가 프로퍼티 기반 테스트를, Faker(`@faker-js/faker`)가 형식 있는 가짜 값을 맡는다.

### Instancio 기본 API

```java
Model<User> pendingUser = Instancio.of(User.class)
    .ignore(field(User::getId))                              // 신규 엔티티 전제 유지
    .generate(field(User::getEmail), gen -> gen.net().email())
    .set(field(User::getStatus), UserStatus.PENDING)         // 시나리오가 요구하는 값 고정
    .supply(field(User::getNickname), () -> "tester")        // 사용자 정의 공급
    .toModel();

User user = Instancio.of(pendingUser).create();
String email = Instancio.gen().net().email().get();
```

- `ignore`는 생성하지 않을 대상, `generate`는 내장 생성기 설정, `set`은 고정값, `supply`는 사용자 정의 공급이다. 같은 설정은 `toModel()`로 만든 Model로 재사용하고, 단독 값은 `Instancio.gen()`으로 만든다.
- 애노테이션 연동은 `instancio.properties`의 `bean.validation.enabled=true`(jakarta.validation, Hibernate Validator 제약)와 `jpa.enabled=true`(`@Column`)로 켠다.
- 기본 설정은 값을 setter가 아니라 필드에 직접 넣고(`ASSIGNMENT_TYPE=FIELD`), 호출한 생성자가 검증 예외를 던지면 생성자 없이 객체를 할당해 채운다(`ON_CONSTRUCTOR_ERROR=BYPASS_CONSTRUCTOR`, 값 전달 생성자를 도입한 6.x User Guide 기준). 이렇게 만든 엔티티는 생성 메서드의 불변식 검사를 거치지 않으므로, 상태가 있는 엔티티는 생성한 입력으로 도메인 메서드를 호출해 만든다([[Test-Fixture-Scenario-Setup#상태별 픽스처는 전이 메서드로 만든다|상태별 픽스처]]).

### 무작위 fixture 도입 때 깨지는 테스트

무작위 fixture로 바꾸면 테스트에 숨어 있던 전제가 드러난다. 실패하면 고정값으로 되돌리기보다 원인을 찾아 전제를 테스트에 명시한다.

| 증상 | 원인 | 고치는 법 |
|---|---|---|
| 이메일 형식 검증 실패 | 설정 없는 문자열 생성은 형식을 지키지 않는다 | `generate`나 `supply`로 규칙을 주거나 Bean Validation 연동을 켠다 |
| 신규 엔티티 전제(ID null) 실패 | 생성기가 ID까지 채운다 | `ignore`로 제외한다 |
| 비밀번호 일치 검증 실패 | 리터럴 기대값과 비교한다 | fixture가 생성한 요청 객체를 보관하고 그 값과 비교한다 |
| 중복 이메일 테스트가 중복을 못 만든다 | 요청을 두 번 생성해 값이 달라진다 | 같은 요청 객체를 두 번 쓴다 |
| 뒤 단계의 상태 전이 실패 | 선택 필드가 무작위로 비어 다음 단계의 필수 조건(예: 검수 신청 시 소개 필수)을 깨뜨린다 | 시나리오가 요구하는 필드는 명시하고 관심 없는 필드만 무작위에 맡긴다 |

매핑 정보를 엔티티 애노테이션 대신 `orm.xml`로 옮긴 모델에서는 `@Column`을 읽는 JPA 연동이 쓸 정보가 없다. 매핑 분리와 애노테이션 기반 생성 사이의 트레이드오프다.

## Mock 계층 구성

외부 의존성을 계층별로 모킹한다.

**DB 계층 Mock:**
- ORM(Prisma) 클라이언트의 모든 모델별 CRUD 메서드를 mock
- Query Builder(Kysely)는 체이닝 가능한 mock 객체로 구성
- `execute()` 호출 시 큐에 넣어둔 결과를 반환하는 방식

**인프라 Mock:**
- 메일 서비스, 외부 API 클라이언트 등 사이드이펙트가 있는 인프라를 mock
- 환경변수를 테스트용 값으로 교체 (예: `JWT_SECRET=test-secret`)
- 로거는 에러/fatal 수준만 출력하도록 제한

## tRPC Caller Factory

HTTP 서버를 띄우지 않고 tRPC 프로시저를 직접 호출하는 패턴이다.

- `createPublicCaller()` — 비인증 프로시저 테스트
- `createAuthenticatedCaller(accountId, name)` — 인증된 사용자 컨텍스트
- `createScopedCaller(accountId, name, orgId, orgName)` — 조직 스코프 컨텍스트
- Mock Express Request/Response 객체로 HTTP 없이 테스트

**장점:** 네트워크 오버헤드 없이 빠르게 테스트, 컨텍스트를 자유롭게 조작 가능

## Setup 파일 구성

Vitest의 `setupFiles`로 모든 테스트 전에 공통 mock을 설정한다.

**setup에서 처리하는 것:**
- 전역 mock 설정 (`vi.mock()`)
- 환경변수 오버라이드
- 로거 설정
- ORM 클라이언트 mock 주입

## 면접 포인트

Q. 테스트 데이터는 어떻게 관리하는가?
- Factory 패턴으로 엔티티별 생성 함수, 자동 증가 ID로 고유성 보장
- 기본값 제공 + 오버라이드 가능하여 테스트에서 관심 필드만 명시

Q. 외부 의존성은 어떻게 처리하는가?
- DB: ORM 클라이언트 전체를 mock하여 실제 DB 없이 테스트
- 인프라: 메일, 외부 API 등을 mock하여 사이드이펙트 제거

Q. 특정 상태의 도메인 객체는 어떻게 준비하는가?
- 상태 필드를 직접 넣지 않고 도메인 전이 메서드를 거치는 상태별 팩토리(`createActiveInstructor`)로 만들고, 반복되는 시나리오 준비는 이름 있는 준비 메서드로 모은다

## 관련 문서

- [[Test-Isolation|Test isolation]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Test-Fixture-Scenario-Setup|상태별 픽스처와 시나리오 준비]]

## 출처

- [Instancio 공식 User Guide — Seed, Bean Validation, Assignment Settings](https://www.instancio.org/user-guide/)
- [Instancio 공식 저장소 — 6.0.0 릴리스 노트](https://github.com/instancio/instancio/releases/tag/instancio-parent-6.0.0)
- [Datafaker 공식 사이트](https://www.datafaker.net/)
- [Fixture Monkey 공식 문서](https://naver.github.io/fixture-monkey/)
- [jqwik 공식 저장소 — README Maintenance Mode](https://github.com/jqwik-team/jqwik)
- [fast-check 공식 문서 — Introduction](https://fast-check.dev/docs/introduction/)
- [Faker 공식 사이트](https://fakerjs.dev/)
- [토비 강사 — 랜덤 테스트 픽스처](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458027)
- [토비 강사 — 테스트 픽스처에 Instancio 적용](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=460612)
- [토비 강사 — 강의 도메인 개발 (2)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=464143)
