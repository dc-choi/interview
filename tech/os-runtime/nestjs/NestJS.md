---
tags: [runtime, nestjs]
status: index
category: "OS & Runtime"
aliases: ["NestJS"]
---

# NestJS (nestjs 폴더 인덱스)

효율적이고 확장 가능한 Node.js 서버 프레임워크. TypeScript로 만들어져 완전 지원하고(순수 JS도 가능), OOP, FP, FRP 요소를 결합한다. 내부적으로 Express(기본)를 쓰며 Fastify로 바꿀 수 있고, 이들 위의 추상층이면서 하부 API도 직접 노출해 플랫폼의 서드파티 모듈 생태계를 그대로 쓸 수 있다. 이 중립성은 코드 계약으로 드러난다 — `NestFactory.create()`는 기본으로 플랫폼 중립 INestApplication을 주고, NestExpressApplication 같은 플랫폼 타입을 제네릭으로 명시할 때만 하부 고유 API가 열린다 (MVC/SSR의 `useStaticAssets`, `setViewEngine`이 대표 사례 — 템플릿은 `@Render('view')` 데코레이터에 핸들러 반환 객체가 변수로 들어가는 구조). 어댑터만 만들면 어떤 Node HTTP 프레임워크와도 동작하는 구조다. 이 플랫폼 중립성은 HTTP를 넘어선다 — 같은 빌딩 블록(모듈, 프로바이더, 가드 등)이 마이크로서비스 전송층과 WebSocket 위에서도 재사용되고, application context 기능으로 HTTP 서버 없는 앱(CRON 작업, CLI)도 Nest DI 위에 세울 수 있다. 현행 문서 기준 Node.js 20 이상을 요구한다.

출발점은 Node 생태계에 훌륭한 라이브러리는 많아도 아키텍처 문제를 푸는 것이 없었다는 것 — 테스트 가능하고 느슨하게 결합된, 유지보수 가능한 구조를 out of the box로 제공한다. 아키텍처는 Angular에서 강하게 영감을 받았다.

### 특징
1. TypeScript를 기본적으로 지원하여 타입 안정성 보장
2. 모듈화된 구조로 코드의 재사용성과 유지보수성 향상
3. Dependency Injection을 통한 느슨한 결합도
4. 데코레이터를 활용한 선언적 프로그래밍

## 핵심 개념
- [x] [[NestJS-Core-Concepts|핵심 개념 — DI 컨테이너, Provider 종류와 Scope, 모듈 시스템, 파이프라인, 클린 아키텍처 적용]]

## 하위 폴더 인덱스 (6개)
- [[fundamentals|기본기 — Custom Provider, Injection Scopes, ModuleRef, Validation]]
- [[request-pipeline|요청 파이프라인 — Middleware, Guards, Interceptor, Pipes, Exception Filter]]
- [[architecture|아키텍처 — 클린 아키텍처, 순환 의존성, vs Spring, Dynamic Module, Plugin]]
- [[integrations|통합 — GraphQL, Microservices, WebSocket, 캐시]]
- [[NestJS-Lifecycle|lifecycle — 부팅과 생명주기 훅, Graceful Shutdown]]
- overview — [[Controller]], [[Provider]] (입문 노트)

## 루트 문서
- [x] [[NestJS-Cold-Start-Optimization|Cold Start 최적화 (의존성 그래프, Lazy Module, 서버리스)]]
- [x] [[NestJS-Logging|Logging (내장 Logger, JSON 로깅, bufferLogs + useLogger)]]

## 현장사례
- [[TS-Backend-Meetup-3#NestJS DI Deep Dive|DI Deep Dive]] — 메타데이터, 프로바이더 토큰, 의존성 처리 과정

## 출처
- [NestJS — Introduction](https://docs.nestjs.com/)
- [NestJS — First steps](https://docs.nestjs.com/first-steps)
- [NestJS — Platform agnosticism](https://docs.nestjs.com/fundamentals/platform-agnosticism)
- [NestJS — Model-View-Controller](https://docs.nestjs.com/techniques/mvc)
- [NestJS — Encryption and Hashing](https://docs.nestjs.com/security/encryption-and-hashing) (자체 래퍼 없음 — Node crypto, bcrypt/argon2 직접 사용이 공식 입장)
