---
tags: [nestjs, fastify, express, adapter, performance]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Platform Adapter", "FastifyAdapter", "Express vs Fastify"]
---

# NestJS Platform Adapter — Express 기본, Fastify 전환

Nest의 프레임워크 독립성은 **어댑터가 미들웨어와 핸들러를 라이브러리별 구현으로 연결**하는 구조로 달성된다. 플랫폼별 HTTP 서버와 라우팅 기능은 어댑터 뒤에 둔다.

## 왜 Express가 기본인가

- Express: 가장 널리 쓰이고, **호환 미들웨어 생태계가 거대** — out of the box 활용.
- Fastify: Nest 공식 안내가 인용한 단순 benchmark에서는 Express보다 거의 두 배 빠른 결과를 보인다. 실제 서비스 처리량은 middleware, serialization과 downstream I/O에 따라 달라지므로 같은 workload로 측정한 뒤 선택한다. `new FastifyAdapter()`를 NestFactory.create 두 번째 인자로 전달한다.
- 버전 기준: **Nest 11부터 Express v5가 기본** 통합이고 Fastify v5를 지원한다. 2026-08-28 공식 First Steps 기준 애플리케이션 runtime은 Node.js 20.19 이상이 필요하고 22.x에서는 22.12 이상이어야 한다.

## Fastify 전환 시 실전 차이

- **기본 리슨이 127.0.0.1 전용** — 도커, 외부 접속을 받으려면 `app.listen(3000, '0.0.0.0')`으로 호스트 명시 필수 (전환 후 컨테이너에서 접속 안 되는 단골 원인).
- **Express 의존 레시피는 동작하지 않는다** — cookie-parser 대신 @fastify/cookie, compression 대신 @fastify/compress처럼 등가 패키지로 교체. multer 기반 `@nestjs/platform-express` 업로드 인터셉터는 비호환이고, NestJS 12.1부터는 `@nestjs/platform-fastify/multipart`가 `@fastify/multipart` 기반으로 같은 업로드 API를 제공한다([[NestJS-File-Upload]]).
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

## MVC와 SPA serving

MVC는 Express의 `setBaseViewsDir()`/`setViewEngine()` 또는 Fastify의 `@fastify/view` 설정을 사용한다. `@Render()`의 handler 반환 객체가 template 변수이며, Fastify는 view 이름에 확장자를 포함한다. 동적 view를 선택해 `@Res()`를 사용하면 해당 adapter의 render/view 응답 계약을 직접 책임진다.

SPA에는 `ServeStaticModule`의 `rootPath`, `serveRoot`, `renderPath`를 설정한다. 기본 renderPath는 client routing을 위해 index.html로 fallback한다. Fastify에서 Express와 같은 fallback을 원하면 `serveStaticOptions.fallthrough: true`를 지정한다. controller API route와 정적 파일 공개 경로를 함께 확인한다.

## Parser, view와 readiness의 API 경계

Express의 `useBodyParser('json', options)`와 Fastify의 `useBodyParser(contentType, options, parser)`는 인자 계약이 다르다. Express의 `NestExpressBodyParserOptionsFor<Parser>`는 parser별 옵션을 좁히며 `verify`는 raw-body 보존을 위해 Nest가 소유한다. custom parser를 붙일 때도 request 크기와 content type을 명시하고 `rawBody` 보존 여부를 확인한다.

`getHttpServer<TServer>()`는 native server, `getHttpAdapter().getInstance()`는 Express/Fastify application 객체다. generic으로 지정한 타입은 실제 adapter를 바꾸지 않는다. `HttpAdapterHost.init$`와 `listen$`도 서로 다르며 DI 초기화, route/plugin 준비와 network listening을 하나의 상태로 취급하지 않는다.

Fastify `setViewEngine()`은 engine/templates 옵션 객체를 받는다. 타입 호환을 위해 남아 있는 string overload를 Express처럼 사용하면 예외가 난다. `ServeStaticModule`의 `exclude`는 Fastify에서 지원하지 않아 `renderPath`의 정규식 같은 지원 계약으로 API 경로와 SPA fallback을 분리한다. Express용 설정을 adapter 이름만 바꿔 재사용하지 않는다.

## 관련 문서

- [[NestJS|NestJS 개요 (플랫폼 중립성 계약)]]
- [[NestJS-Middleware|Middleware (Express 호환 계층)]]
- [[NestJS-File-Upload|File Upload (multer, 12.1부터 Fastify multipart 지원)]]
- [[Hono|Hono (경량 대안 프레임워크 비교)]]

## 출처
- [NestJS, First steps](https://docs.nestjs.com/first-steps)
- [NestJS — Performance (Fastify)](https://docs.nestjs.com/http/performance)
- [NestJS — CORS](https://docs.nestjs.com/security/cors)
- [NestJS — HTTP adapter (FAQ)](https://docs.nestjs.com/faq/http-adapter)
- [NestJS — File upload, Fastify](https://docs.nestjs.com/http/file-upload#fastify)
- [NestJS — HTTPS & multiple servers (FAQ)](https://docs.nestjs.com/faq/multiple-servers)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/v11/migration-guide)

- [NestJS — MVC](https://docs.nestjs.com/http/mvc)
- [NestJS — Serve static](https://docs.nestjs.com/recipes/serve-static)
- [NestJS API, NestExpressApplication](https://api-references-nestjs.netlify.app/api/platform-express/NestExpressApplication)
- [NestJS API, NestFastifyApplication](https://api-references-nestjs.netlify.app/api/platform-fastify/NestFastifyApplication)
- [NestJS API, ServeStaticModuleOptions](https://api-references-nestjs.netlify.app/api/serve-static/ServeStaticModuleOptions)
- [NestJS sample, Fastify view options](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/17-mvc-fastify/src/main.ts)
