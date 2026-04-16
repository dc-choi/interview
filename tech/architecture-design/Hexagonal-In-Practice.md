---
tags: [architecture, hexagonal, port-adapter, ddd, nodejs, typescript]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Hexagonal In Practice", "헥사고날 실전 적용", "Port and Adapter Pattern", "Ports & Adapters"]
---

# Hexagonal Architecture 실전 적용

Alistair Cockburn의 **Ports & Adapters 패턴**을 Node.js/TypeScript 환경에서 코드 구조로 풀어내는 방법. 기존 [[Layered-Clean-Hexagonal|Layered/Clean/Hexagonal 비교]]의 심화 자료.

## 핵심 명제

GUI·HTTP·데이터베이스 같은 외부 의존성을 비즈니스 로직과 철저히 분리한다. **비즈니스 로직 = Application + Domain**, 그 외(HTTP, DB, 큐, 메일, CLI…)는 모두 **교체 가능한 어댑터**로 본다. 의존성 방향: **모든 것이 application을 향하고, application은 아무것도 모른다.**

## Port와 Adapter

| 용어 | 정의 | 위치 |
|---|---|---|
| **Port** | 비즈니스 로직과 외부의 경계에 놓인 **인터페이스** | application 계층 내부 |
| **Adapter** | 포트를 구현하는 구체 클래스 (HTTP·DB·파일 등 실제 기술) | application 계층 바깥 |

핵심 원칙: **port는 application이 정의하고, adapter가 구현한다.** application이 외부 라이브러리를 import 하지 않는 것이 합격선.

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

**상태를 바꾸는 메서드(Command)와 값을 반환하는 메서드(Query)를 분리.** 같은 클래스에 두면 사이드 이펙트 추적이 어려워지고, 캐시·읽기 복제본·이벤트 소싱 적용 시 분리 비용이 커진다.

서비스 단위로 `ArticleCommandService` / `ArticleQueryService`를 나누면 자연스럽게 CQRS로 발전 가능.

### 2. ISP (Interface Segregation)

`getArticle()`과 `listArticles()`를 한 인터페이스에 묶지 말 것. **호출자가 필요한 것만 의존**하도록 잘게 쪼갠다 (`ArticleGetUseCase`, `ArticleListUseCase`). 테스트 더블도 가벼워진다.

### 3. SRP (Single Responsibility)

유스케이스 = 비즈니스 기능 1개. `CreateArticleUseCase`, `PublishArticleUseCase`처럼 동사 단위로 끊는다. "Service에 메서드 30개" 패턴을 끊어내는 가장 효과적인 방법.

### 4. 데이터 캐리어로 도메인을 가두기

도메인 엔티티(`ArticleImpl`)를 **application 바깥으로 노출하지 않는다.** 입출력은 `ArticleRequest` / `ArticleResponse` 같은 **데이터 캐리어**(=DTO, behavior 없음)로 변환해서 넘긴다. 이렇게 해야:
- 도메인 모델이 외부 직렬화 포맷(JSON 키, 날짜 형식)에 오염되지 않음
- 컨트롤러가 도메인 메서드를 우회 호출하는 사고 방지
- API 변경이 도메인을 흔들지 않음

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

## 흔히 만나는 실수

- **port를 application 바깥에 둔다** → adapter가 port를 정의하면 의존 방향이 반대로 뒤집힘
- **도메인 엔티티를 컨트롤러 응답으로 그대로 반환** → 외부 변경이 도메인을 흔들고, 보안 필드가 새 나감
- **application이 ORM 어노테이션을 직접 사용** → 인프라가 도메인에 침투. ORM은 adapter 안에서만
- **port가 너무 굵다** → ISP 위반. 1 유스케이스 1 인터페이스 원칙
- **모든 외부 호출에 port를 만든다** → 단순한 cross-cutting(로깅, 메트릭)까지 인터페이스화하면 보일러플레이트 폭발. **교체 가능성·테스트 필요성**이 분명한 곳에만

## 트레이드오프

장점만 있는 패턴이 아니다. 도입 전 인지해야 할 비용:
- **클래스 수가 2~3배** 늘어남 (port + adapter + impl)
- **CRUD만 있는 작은 서비스에는 과한 구조** — 헥사고날은 도메인 복잡도가 어느 정도 있을 때 빛난다
- **팀 학습 비용**: Port/Adapter, Driving/Driven 용어와 import 방향 규약 합의 필요
- **DDD와 결합 시 폭발적 학습 곡선** — Aggregate, Value Object까지 함께 도입하면 진입 장벽 높음

작은 서비스에는 [[Layered-Clean-Hexagonal|Layered]]로 시작해서, 도메인이 복잡해지는 시점에 헥사고날로 옮기는 것이 현실적.

## 면접 체크포인트

- **Port와 Adapter의 차이**, **port가 어디에 위치해야 하는지** (application 안)
- **Driving / Driven**의 의미와 예시
- **의존성 역전**이 헥사고날에서 어떻게 실현되는가 (port는 인터페이스, adapter가 구현)
- **CQS / ISP / SRP**가 헥사고날 구조에서 자연스럽게 따라오는 이유
- 헥사고날과 **클린 아키텍처·DDD**의 관계
- **데이터 캐리어(DTO)** 가 왜 필요한가
- 이 패턴의 **단점·과잉 설계** 위험을 말할 수 있는가

## 출처
- [Node.js 모노레포 튜토리얼 — 2. 육각형 아키텍처](https://nodejs.myeongjae.kim/pages/002-hexagonal-architecture/)

## 관련 문서
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험 (멀티 컨텍스트, ACL, 트레이드오프)]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal 비교]]
- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[Elegant-OOP-Design|우아한 객체지향]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
- [[VO-DTO|VO와 DTO]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
