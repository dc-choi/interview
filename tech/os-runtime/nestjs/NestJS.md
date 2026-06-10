---
tags: [runtime, nestjs]
status: index
category: "OS & Runtime"
aliases: ["NestJS"]
---

# NestJS (nestjs 폴더 인덱스)

Node.js의 프레임워크. 내부적으로 Express를 사용하며, 선택적으로 Fastify도 사용할 수 있다.

### 특징
1. TypeScript를 기본적으로 지원하여 타입 안정성 보장
2. 모듈화된 구조로 코드의 재사용성과 유지보수성 향상
3. Dependency Injection을 통한 느슨한 결합도
4. 데코레이터를 활용한 선언적 프로그래밍

## 핵심 개념
- [x] [[NestJS-Core-Concepts|핵심 개념 — DI 컨테이너, Provider 종류와 Scope, 모듈 시스템, 파이프라인, 클린 아키텍처 적용]]

## 하위 폴더 인덱스 (5개)
- [[fundamentals|기본기 — Custom Provider, Injection Scopes, ModuleRef, Validation]]
- [[request-pipeline|요청 파이프라인 — Middleware, Guards, Interceptor, Pipes, Exception Filter]]
- [[architecture|아키텍처 — 클린 아키텍처, 순환 의존성, vs Spring, Dynamic Module, Plugin]]
- [[integrations|통합 — GraphQL, Microservices, WebSocket, 캐시]]
- overview — [[Controller]], [[Provider]] (입문 노트)

## 루트 문서
- [x] [[NestJS-Lifecycle|Lifecycle (Bootstrap 단계, 생명주기 훅 실행 순서)]]
- [x] [[NestJS-Cold-Start-Optimization|Cold Start 최적화 (의존성 그래프, Lazy Module, 서버리스)]]

## 현장사례
- [[TS-Backend-Meetup-3#NestJS DI Deep Dive|DI Deep Dive]] — 메타데이터, 프로바이더 토큰, 의존성 처리 과정
