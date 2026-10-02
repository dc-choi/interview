---
tags: [nestjs, security, csrf, cors, rate-limit]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS HTTP 보안 정책"]
---

# NestJS HTTP 보안 정책

보안 헤더는 browser의 응답 해석을 제한하고, CSRF는 자동 전송 credential을 이용한 타 origin의 상태 변경을 막으며, CORS는 browser JavaScript가 응답에 접근하는 범위를 정한다. rate limiting은 자원을 소모하는 반복 요청을 제한한다.

## 보안 헤더와 CSP

NestJS v12.1의 `app.useSecurityHeaders()`는 Express/Fastify 공통 API로 Helmet 8의 기본 정책을 제공한다. init/listen 전에 한 번 등록하며 옵션을 시작 시 검증한다. 먼저 등록해 app.use에서 끝난 응답, 오류, 404와 SSE에도 적용되게 한다. built-in CSRF 검사보다 보안 헤더가 먼저 기록되는 내부 순서를 제공한다.

기본 CSP는 default/base/form/frame-ancestors self, object none, script self, script-src-attr none, style self/https/unsafe-inline, image self/data, font self/https/data, upgrade-insecure-requests를 포함한다. COOP/CORP는 same-origin, COEP는 기본 비활성화다. HSTS는 1년과 subdomain, nosniff, SAMEORIGIN frame 정책 등을 설정하며 X-Powered-By를 제거하고 X-XSS-Protection은 0이다.

HSTS는 HTTP 응답에서는 브라우저가 무시한다. 로컬 HTTP에서 upgrade-insecure-requests가 HTTPS로 바꾸는 효과를 고려한다. 오래된 XSS auditor를 켜는 헤더를 안전한 기본처럼 되살리지 않는다.

CSP directive는 camelCase/kebab-case를 받을 수 있으나 사용자 값은 해당 directive의 **배열을 교체**한다. self가 필요하면 다시 적는다. true는 값 없는 directive, null/false는 제거다. 기본 정책을 끄면 default-src를 명시하거나 명시적 null을 선택해야 한다. keyword/nonce/hash의 quote와 printable ASCII, 세미콜론/쉼표 검증을 지킨다.

report-only는 위반을 차단하지 않는다. 보고 endpoint도 report-to/report-uri로 따로 구성해야 한다. handler에서 header를 덮어쓸 수 있지만 Fastify removeHeader만으로 built-in header를 제거할 수는 없다. 요청별 nonce function은 built-in API 대신 직접 Helmet 등에서 설정한다.

Swagger custom inline JS, GraphiQL의 CDN/inline script, Apollo Sandbox의 frame은 필요한 origin과 nonce 정책을 별도로 설계한다. 개발용 unsafe-inline/script 예외를 모든 운영 응답에 적용하지 않는다. Express의 Helmet middleware와 Fastify plugin을 직접 쓰는 경우에도 handler 등록 전에 적용한다.

## Built-in CSRF와 실패 경계

v12.1 built-in CSRF는 Fetch Metadata와 Origin/Host를 검사한다. GET/HEAD/OPTIONS는 통과하므로 상태 변경 handler를 이 method에 두면 안 된다.

| 요청 신호 | unsafe method의 기본 판단 |
|---|---|
| Sec-Fetch-Site same-origin/none | 통과 |
| Sec-Fetch-Site same-site/cross-site | 거부 |
| Fetch Metadata 없이 Origin 있음 | Host/:authority와 host 비교 |
| 두 신호 모두 없음 | 기존 browser/비브라우저 호환을 위해 통과 |

Origin/Host 비교는 case와 기본 port를 정규화하지만 scheme을 비교하지 않는다. HTTP에서 HTTPS로 올라오는 동일 host의 경계에는 HSTS/HTTPS 정책이 필요하다. X-Forwarded-Host는 자동 신뢰하지 않으므로 proxy가 공개 Host를 보존하게 하거나 trusted origin을 명시한다.

검사는 body parse, Nest middleware/guard와 route filter보다 먼저 한다. 전역 filter는 ForbiddenException을 처리할 수 있다. 먼저 등록한 app.use가 응답을 끝내면 검사에 도달하지 않는다. WebSocket upgrade는 이 HTTP 보호에 포함되지 않으므로 Origin을 별도로 검사한다.

trusted origin은 정확한 `scheme://host[:port]`이며 wildcard/path/query/fragment/userinfo/trailing slash를 허용하지 않는다. CORS에 추가했다고 CSRF에도 허용되는 것은 아니다. 헤더 없는 browser 호환 경로까지 막아야 하면 token scheme을 적용한다.

exclude는 path/RouteInfo의 method/version을 사용할 수 있고 global prefix와 URI version 계약을 따른다. 기본 version이 자동으로 모두 채워지지는 않는다. query는 제외하고 path를 정확하고 case-sensitive하게 맞춘다. trailing slash, router의 case 무시 설정과 optional path를 별도로 확인한다.

비정상 path의 //, dot segment, 세미콜론, fragment, backslash와 encoded dot/backslash는 fail-closed로 다룬다. Fastify에서는 rewrite 전 URL이 기준이다. raw URL predicate의 단순 startsWith 제외는 우회 위험이 있어 명시적 path 목록을 우선한다.

## Token CSRF와 CORS

Express의 csrf-csrf는 cookie/session middleware가 먼저 있어야 하고 secret과 session identifier를 제공한다. Fastify CSRF plugin도 사용하는 storage plugin을 먼저 등록한다. CORS는 browser의 cookie 자동 전송 자체를 차단하는 CSRF 방어가 아니다.

`enableCors()`는 object 또는 요청별 callback을 받는다. Express 기본 allowed method는 GET/HEAD/PUT/PATCH/POST/DELETE이고 Fastify 기본은 GET/HEAD/POST다. PUT/PATCH/DELETE를 사용하면 허용 method를 명시해 adapter 변경 시 preflight 계약을 유지한다.

built-in CSRF 이후 CORS가 실행되면 CSRF 403에는 CORS 응답 header가 없을 수 있다. browser에서 단순 CORS 실패로 보이는 결과와 서버의 실제 CSRF 거부를 구분한다. credential 사용 시 허용 origin과 credential 설정을 함께 좁힌다.

## Inbound throttling

`@nestjs/throttler`의 현재 ttl 숫자는 밀리초다. 예전 초 단위 설정과 구분한다. `seconds()`/`minutes()` helper로 의도를 드러낼 수 있다. 여러 named window를 설정하고 v5 이후 `@Throttle({ default: { limit, ttl, blockDuration } })`, `@SkipThrottle({ default: true })`처럼 이름별 override를 사용한다.

global APP_GUARD를 인증보다 먼저 두면 잘못된 credential 반복도 제한한다. 기본 tracker는 IP이고 IPv6는 기본 /64 subnet으로 묶는다. custom tracker는 이 IP 정규화 책임도 갖는다. 로그인은 IP와 계정 기준을 함께 써 한 계정을 여러 IP로 공격하는 경로를 막는다. 계정 하나만 제한하면 타인이 정상 사용자를 잠글 수 있는 경계도 판단한다.

proxy 뒤에서는 신뢰 가능한 proxy/hop만 설정한다. 임의 X-Forwarded-For를 직접 믿으면 tracker를 바꿔 limit을 우회한다. ignoreUserAgents/skipIf는 신뢰 가능한 신원 판별이 아니다.

기본 메모리 storage는 인스턴스별이며 restart 때 사라진다. 다중 인스턴스에는 atomic shared storage가 필요하다. community Redis adapter를 core 패키지의 기본 기능으로 적지 않는다. custom storage의 `increment(key, ttl, limit, blockDuration, throttlerName)`은 window 이름마다 독립된 key를 유지해야 한다.

blockDuration은 기본 ttl이다. `getTracker`/`generateKey`/`skipIf`와 context-dependent limit/ttl은 요청별 정책을 만들지만, 중복 호출이 과금/로그인을 반복해도 안전한지는 [[NestJS-Idempotency]]가 다룬다.

WebSocket은 connection의 실제 peer 주소를 읽는 별도 guard가 필요하며 WS용 handleRequest를 HTTP 전역 APP_GUARD처럼 적용하지 않는다. GraphQL은 req/res를 context에서 꺼내도록 override한다. transport별 rejection event/error 계약도 확인한다.

## 출처

- [NestJS Documentation, Helmet](https://docs.nestjs.com/security/helmet)
- [NestJS Documentation, CSRF](https://docs.nestjs.com/security/csrf)
- [NestJS Documentation, CORS](https://docs.nestjs.com/security/cors)
- [NestJS Documentation, Rate limiting](https://docs.nestjs.com/security/rate-limiting)

## 관련 문서

- [[NestJS-Security]]
- [[CSRF]]
- [[CORS]]
- [[NestJS-Guards]]
- [[NestJS-Authentication]]
