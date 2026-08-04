---
tags: [architecture, hexagonal, port-adapter, ddd, nodejs, typescript]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Hexagonal In Practice", "헥사고날 실전 적용", "Port and Adapter Pattern", "Ports & Adapters"]
verified_at: 2026-08-04
---

# Hexagonal Architecture 실전 적용

Alistair Cockburn의 **Ports & Adapters 패턴**을 Node.js/TypeScript 환경에서 코드 구조로 풀어내는 방법. 기존 [[Layered-Clean-Hexagonal|Layered/Clean/Hexagonal 비교]]의 심화 자료.

## 핵심 명제

GUI, HTTP, 데이터베이스 같은 외부 기술을 비즈니스 로직과 분리한다. **비즈니스 로직 = Application + Domain**, 그 외(HTTP, DB, 큐, 메일, CLI 등)는 어댑터로 본다. 핵심은 모든 클래스를 인터페이스로 감싸는 것이 아니라 **외부 기술을 향한 컴파일 의존성을 포트로 역전**하는 것이다.

## Port와 Adapter

| 용어 | 정의 | 위치 |
|---|---|---|
| **Port** | 코어가 외부와 상호작용하는 목적과 규약 | 코어가 소유 |
| **Adapter** | 포트를 구현하는 구체 클래스 (HTTP, DB, 파일 등 실제 기술) | application 계층 바깥 |

코드에서는 포트를 주로 인터페이스로 표현한다. 제공 포트는 코어가 외부에 제공하는 기능이고, 요구 포트는 코어가 외부에 요구하는 기능이다. 요구 포트를 코어가 정의하고 어댑터가 구현하면 의존성 역전이 성립한다.

## Driving (Primary) vs Driven (Secondary)

방향에 따라 두 종류의 어댑터가 있다.

| 종류 | 다른 이름 | 역할 | 예시 |
|---|---|---|---|
| **Driving** | Primary, Incoming | 유스케이스를 **호출하는** 쪽 | HTTP Controller, gRPC handler, CLI command, Cron trigger |
| **Driven** | Secondary, Outgoing | 유스케이스에 **호출당하는** 쪽 | DB Repository, 외부 API 클라이언트, 메일 발송기, 메시지 발행자 |

application 안의 port도 두 방향으로 나뉜다.

- `port/incoming/` — 유스케이스 인터페이스 (Driving Adapter가 호출)
- `port/outgoing/` — 의존성 인터페이스 (Driven Adapter가 구현)

## TypeScript 디렉토리 구조 예시

```
src/
  domain/
    Article.ts                     # 인터페이스 + 구현(ArticleImpl)
  application/
    port/
      incoming/
        ArticleCreateUseCase.ts    # 유스케이스 인터페이스 (Driving용)
        ArticleListUseCase.ts
      outgoing/
        ArticleSavePort.ts         # 저장 포트 (Driven용)
        ArticleLoadPort.ts
    ArticleCommandService.ts       # incoming 구현 + outgoing 의존
    ArticleQueryService.ts
  adapter/
    incoming/
      http/ArticleController.ts    # Driving Adapter
      cli/ArticleCli.ts
    outgoing/
      persistence/
        ArticlePersistenceAdapter.ts   # Driven Adapter
        ArticleInMemoryRepository.ts
```

import 방향: `adapter/* → application/* → domain/*`. 절대 역방향 import 없음. ESLint `no-restricted-imports`로 강제 가능.

## 4가지 핵심 설계 원칙

### 1. CQS (Command Query Separation)

**상태를 바꾸는 메서드(Command)와 값을 반환하는 메서드(Query)를 분리.** 같은 클래스에 두면 사이드 이펙트 추적이 어려워지고, 캐시, 읽기 복제본, 이벤트 소싱 적용 시 분리 비용이 커진다.

서비스 단위로 `ArticleCommandService` / `ArticleQueryService`를 나누면 자연스럽게 CQRS로 발전 가능.

### 2. ISP (Interface Segregation)

**호출자가 필요한 기능만 의존**하도록 포트를 나눈다. 기준은 메서드 개수나 유스케이스 수가 아니라 **상호작용 의도, 변경 이유, 소비자 집합**이다. `getArticle()`과 `listArticles()`가 늘 따로 변한다면 나누고, 같은 소비자가 하나의 조회 계약으로 사용한다면 함께 둘 수 있다.

### 3. SRP (Single Responsibility)

애플리케이션 서비스는 하나의 응집된 변경 이유를 가진다. `CreateArticle`, `PublishArticle`처럼 동사 단위로 분리할 수 있지만, 기계적으로 클래스와 인터페이스를 하나씩 만들 필요는 없다.

### 4. 외부 계약과 도메인 모델 구분

도메인 엔티티를 JSON 응답으로 직접 직렬화하지 않는다. HTTP 요청과 응답은 `ArticleRequest` / `ArticleResponse` 같은 외부 계약으로 변환하는 편이 안전하다.

- 도메인 모델이 외부 직렬화 포맷(JSON 키, 날짜 형식)에 오염되지 않음
- 컨트롤러가 도메인 메서드를 우회 호출하는 사고 방지
- API 변경이 도메인을 흔들지 않음

다만 **애플리케이션 포트가 애그리거트를 반환하는 것**과 **컨트롤러가 이를 그대로 전송하는 것**은 다르다. 포트의 소비자가 같은 애플리케이션 내부이고 도메인 행위가 필요하다면 애그리거트 반환도 유효하다. 외부 계약, 읽기 전용 프로젝션, 보안 필드 통제가 필요할 때 DTO를 둔다.

## 애플리케이션 컴포넌트와 수직 슬라이스

코어가 커지면 기능 단위 애플리케이션 컴포넌트로 나눈다. 각 컴포넌트는 제공 포트, 내부 구현, 요구 포트를 소유하고 다른 컴포넌트의 공개 포트만 사용한다.

```text
member  <-  instructor  <-  course  <-  enrollment
```

- 의존 관계는 가능한 한 단방향 비순환 그래프로 유지한다.
- 순환이 생기면 공유 엔티티부터 만들지 말고, 상위 정책이 요구 포트를 소유하도록 의존성을 역전한다.
- 패키지 규칙은 합의만으로 끝내지 않고 ArchUnit이나 Spring Modulith 검증으로 고정한다.
- 애그리거트는 일관성 경계이고, 애플리케이션 컴포넌트는 기능과 의존성의 모듈 경계다. 둘을 같은 크기로 맞출 필요는 없다.

## NestJS에서의 자연스러운 매핑

NestJS는 헥사고날과 매우 잘 맞는다.

| 헥사고날 개념 | NestJS 구현 |
|---|---|
| Driving Adapter | `@Controller` (HTTP), `@MessagePattern` (큐), `@Cron` |
| Incoming Port | `interface XxxUseCase` + `@Injectable` 서비스가 구현 |
| Outgoing Port | `interface XxxRepository` + `@Inject(TOKEN)`으로 주입 |
| Driven Adapter | TypeORM Repository, Axios HTTP 클라이언트, BullMQ 발행자 |
| 의존성 역전 | NestJS DI 컨테이너가 인터페이스 토큰으로 구현 주입 |

핵심 트릭: outgoing port는 TS 인터페이스인데 NestJS DI는 인터페이스 토큰을 못 잡으므로 **`Symbol` 또는 `string` 토큰**으로 등록한다.

## Spring에서의 구현 메모

- `@Component`를 메타 애노테이션으로 사용해 `@ApplicationService` 같은 합성 스테레오타입을 만들 수 있다.
- `@Transactional`, Bean Validation 같은 프레임워크 애노테이션을 애플리케이션 서비스에 쓰는 것은 실용적 선택이다. 아키텍처의 목적은 프레임워크 이름을 0개로 만드는 것이 아니라 비즈니스 규칙이 기술 세부사항에 끌려가지 않게 하는 것이다.
- Spring Modulith의 모듈 검증은 순환 의존, 내부 패키지 접근, 허용하지 않은 모듈 의존을 검사할 수 있다.

## 흔히 만나는 실수

- **port를 application 바깥에 둔다** → adapter가 port를 정의하면 의존 방향이 반대로 뒤집힘
- **도메인 엔티티를 컨트롤러 응답으로 그대로 반환** → 외부 변경이 도메인을 흔들고, 보안 필드가 새 나감
- **ORM 모델 통합/분리를 원칙 하나로 고정** → 도메인과 저장 모델의 간극 및 매핑 비용을 함께 비교해야 함
- **port가 너무 굵다** → 서로 다른 소비자와 변경 이유를 한 계약에 묶어 ISP 위반
- **port를 유스케이스마다 기계적으로 생성** → 같은 상호작용 의도를 잘게 찢어 탐색 비용과 보일러플레이트 증가
- **모든 외부 호출에 port를 만든다** → 단순한 cross-cutting(로깅, 메트릭)까지 인터페이스화하면 보일러플레이트 폭발. **교체 가능성, 테스트 필요성**이 분명한 곳에만

## 트레이드오프

장점만 있는 패턴이 아니다. 도입 전 인지해야 할 비용:
- **클래스 수가 2~3배** 늘어남 (port + adapter + impl)
- **CRUD만 있는 작은 서비스에는 과한 구조** — 헥사고날은 도메인 복잡도가 어느 정도 있을 때 빛난다
- **팀 학습 비용**: Port/Adapter, Driving/Driven 용어와 import 방향 규약 합의 필요
- **DDD와 결합 시 큰 학습 곡선** — Aggregate, Value Object까지 함께 도입하면 진입 장벽 높음

작은 서비스에는 [[Layered-Clean-Hexagonal|Layered]]로 시작해서, 도메인이 복잡해지는 시점에 헥사고날로 옮기는 것이 현실적.

## 면접 체크포인트

- **Port와 Adapter의 차이**, **port가 어디에 위치해야 하는지** (application 안)
- **Driving / Driven**의 의미와 예시
- **의존성 역전**이 헥사고날에서 어떻게 실현되는가 (port는 인터페이스, adapter가 구현)
- **CQS / ISP / SRP**가 헥사고날 구조에서 자연스럽게 따라오는 이유
- 헥사고날과 **클린 아키텍처, DDD**의 관계
- 애플리케이션 포트 반환 타입과 외부 응답 DTO를 구분하는 이유
- 이 패턴의 **단점, 과잉 설계** 위험을 말할 수 있는가

## 출처

- [Alistair Cockburn — Hexagonal Architecture 원문](https://alistair.cockburn.us/hexagonal-architecture/)
- [Node.js 모노레포 튜토리얼 — 2. 육각형 아키텍처](https://nodejs.myeongjae.kim/pages/002-hexagonal-architecture/)
- [NestJS 공식 문서 — Custom Providers와 런타임 토큰](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS 공식 문서 — TypeORM Repository](https://docs.nestjs.com/techniques/database)
- [Spring Framework 공식 문서 — 합성 애노테이션과 컴포넌트 스캔](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
- [Spring Modulith 공식 문서 — 애플리케이션 모듈](https://docs.spring.io/spring-modulith/reference/fundamentals.html)
- [Spring Modulith 공식 문서 — 모듈 구조 검증](https://docs.spring.io/spring-modulith/reference/verification.html)
- [토비 강사 — 포트 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453033)
- [토비 강사 — 애플리케이션 컴포넌트](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=454900)
- [토비 강사 — 애그리거트와 애플리케이션 컴포넌트 의존 관계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458026)
- [토비 강사 — ArchUnit을 이용한 슬라이스 의존 관계 검증](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=461995)
- [토비 강사 — 애플리케이션 서비스 합성 애노테이션](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458025)
- [토비 강사 — DIP를 이용한 양방향 의존관계 해결](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471511)
- [토비 강사 — Entity vs DTO](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=264324)

## 관련 문서
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험 (멀티 컨텍스트, ACL, 트레이드오프)]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal 비교]]
- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[Elegant-OOP-Design|우아한 객체지향]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
- [[VO-DTO|VO와 DTO]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
