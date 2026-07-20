---
tags: [nestjs, fastify, express, adapter, performance]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Platform Adapter", "FastifyAdapter", "Express vs Fastify"]
---

# NestJS Platform Adapter — Express 기본, Fastify 전환

Nest의 프레임워크 독립성은 **어댑터가 미들웨어와 핸들러를 라이브러리별 구현으로 프록시**하는 구조로 달성된다. 어댑터를 만들 수 있는 조건은 대상 라이브러리가 Express류의 request/response 파이프라인을 제공하는 것.

## 왜 Express가 기본인가

- Express: 가장 널리 쓰이고, **호환 미들웨어 생태계가 거대** — out of the box 활용.
- Fastify: 설계 문제를 Express와 비슷한 방식으로 풀면서 벤치마크상 **약 2배 빠름** — 성능이 최우선이면 선택. `new FastifyAdapter()`를 NestFactory.create 두 번째 인자로.
- 버전 기준: **Nest 11부터 Express v5가 기본** 통합이고 Fastify v5를 지원하며, 런타임은 **Node.js 20 이상**을 요구한다 (v16, v18 지원 종료).

## Fastify 전환 시 실전 차이

- **기본 리슨이 127.0.0.1 전용** — 도커, 외부 접속을 받으려면 `app.listen(3000, '0.0.0.0')`으로 호스트 명시 필수 (전환 후 컨테이너에서 접속 안 되는 단골 원인).
- **Express 의존 레시피는 동작하지 않는다** — cookie-parser 대신 @fastify/cookie, compression 대신 @fastify/compress처럼 등가 패키지로 교체. multer 기반 파일 업로드는 비호환.
- **CORS 기본이 safelisted 메서드만** — @fastify/cors는 PUT/PATCH/DELETE를 기본 허용하지 않아 `enableCors({ methods: ['GET','POST','PUT','PATCH','DELETE'] })`처럼 명시해야 한다 (platform-fastify v11 기준).
- **미들웨어 경로 매칭이 path-to-regexp 최신판** — `(.*)` 전체 매칭 문법 불가, `*splat` 네임드 와일드카드로 쓴다 (라우트 경로 자체는 Fastify v5에서도 기존 `*` 문법 유지).
- **미들웨어는 raw req/res를 받는다** — Fastify 래퍼(FastifyRequest/Reply)가 아니라 `FastifyRequest['raw']` (내부 middie 패키지 동작 방식). NestMiddleware 시그니처 타입을 이에 맞춘다.
- redirect는 `res.status(302).redirect('/login')`처럼 상태 코드와 URL을 함께.
- Fastify 생성자 옵션은 `new FastifyAdapter({ logger: true })`로 전달. `@RouteConfig`, `@RouteConstraints`(버전 제약 등) 같은 Fastify 고유 라우트 기능도 데코레이터로 노출된다.

## 어댑터 접근 — HttpAdapterHost

하부 HTTP 서버 인스턴스가 필요할 때: 앱 컨텍스트 밖에서는 `app.getHttpAdapter()`, 안에서는 **`HttpAdapterHost`를 일반 프로바이더처럼 주입**받아 `adapterHost.httpAdapter.getInstance()`로 플랫폼 네이티브 인스턴스(Express app 등)에 닿는다 — BaseExceptionFilter가 프레임워크 인스턴스화를 요구하는 이유(HttpAdapter 주입 필요)가 이 구조다.

## 플랫폼 추상화 API의 예 — enableCors

`app.enableCors()`는 플랫폼에 따라 내부적으로 Express cors 또는 @fastify/cors 패키지를 쓰는 **어댑터 추상화 API**다. 옵션 객체 외에 **요청 기반 비동기 콜백**도 받아 요청마다 CORS 설정을 동적으로 결정할 수 있고, `NestFactory.create(AppModule, { cors: true | options })`로도 동등하게 켤 수 있다.

인프로세스 TLS 종료가 필요하면 `NestFactory.create(AppModule, { httpsOptions: { key, cert } })` — 다만 관례는 앞단 로드밸런서/프록시에서 TLS를 종료하는 것 ([[HTTPS-TLS]]). 같은 앱에서 HTTP와 HTTPS를 동시에 리슨하려면 http.createServer를 수동 배선한다.

## 관련 문서

- [[NestJS|NestJS 개요 (플랫폼 중립성 계약)]]
- [[NestJS-Middleware|Middleware (Express 호환 계층)]]
- [[NestJS-File-Upload|File Upload (multer — FastifyAdapter 비호환)]]
- [[Hono|Hono (경량 대안 프레임워크 비교)]]

## 출처
- [NestJS — Performance (Fastify)](https://docs.nestjs.com/techniques/performance)
- [NestJS — CORS](https://docs.nestjs.com/security/cors)
- [NestJS — HTTP adapter (FAQ)](https://docs.nestjs.com/faq/http-adapter)
- [NestJS — HTTPS & multiple servers (FAQ)](https://docs.nestjs.com/faq/multiple-servers)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/migration-guide)
