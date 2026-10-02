---
tags: [nestjs, cookie, session, http, security]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 쿠키와 세션", "SignedCookies"]
---

# NestJS 쿠키와 세션

NestJS **v12.1부터** cookie 읽기, 서명, 응답 설정을 HTTP adapter 공통 API로 제공한다. 이전 버전의 cookie-parser/@fastify/cookie 경로도 사용할 수 있으며 session 저장소는 쿠키 파싱과 별도다.

## 쿠키 읽기와 응답

- `@Cookies(name?)`는 client 값을 읽는다. cookie가 없으면 undefined, 같은 이름이 여러 번 오면 첫 값이 우선이다. lazy parsing은 request당 한 번 수행한다.
- `@SignedCookies(name?)`는 검증된 값만 반환한다. 이름을 지정하면 미서명, 변조, 미전달은 undefined이고 이름 없이 호출하면 검증된 cookie만 모은다.
- 두 decorator의 pipe metadata는 custom이므로 global ValidationPipe를 적용하려면 `validateCustomDecorators: true`를 확인한다. 서명하지 않은 cookie는 신뢰하지 않는다.
- `HttpAdapterHost.httpAdapter.setCookie(res, name, value, options)`와 `clearCookie()`로 플랫폼을 구분하지 않고 Set-Cookie를 추가한다. controller에서 res는 `@Res({ passthrough: true })`로 받는다. Nest는 req.cookies를 직접 채우지 않는다.
- value는 string이며 percent encoding을 적용한다. `maxAge`는 **초**다. Express res.cookie의 밀리초 값을 그대로 복사하면 수명이 1000배 길어진다.
- clearCookie는 원래 cookie의 path/domain과 맞아야 삭제된다. 기본 path는 `/`이며 여러 cookie header는 append된다.

## 서명과 비밀값

`NestFactory.create(AppModule, { cookies: { secret } })`로 secret을 설정하고 `setCookie(..., { signed: true })`로 서명한다. 배열 secret은 첫 항목으로 발급, 전체로 검증하므로 만료까지 이전 secret을 남겨 rotation할 수 있다.

- 빈 secret은 부팅 오류다. undefined는 설정 없음으로 간주해 부팅할 수 있지만 서명하거나 검증할 때 500이 발생한다. 필수 설정은 부팅 때 검증한다.
- 서명은 integrity를 보호할 뿐 내용을 암호화하지 않는다. cookie 이름도 서명 대상에 포함되지 않아 다른 이름으로 보내도 값의 서명은 검증될 수 있다. 용도별 값의 의미를 따로 확인한다.
- secret이 설정되면 SignedCookies는 raw Cookie header를 직접 검증한다. 없으면 cookie-parser의 req.signedCookies를 사용하며 false인 변조 값은 missing으로 처리한다. Fastify plugin은 req.signedCookies를 만들지 않으므로 built-in 검증에는 Nest secret이 필요하다.
- Nest의 `s:` prefix 형식은 cookie-signature/cookie-parser/express-session과 호환된다. Fastify가 만든 prefix 없는 서명도 Nest에서 검증할 수 있으나 반대 방향은 호환되지 않는다.

## 속성과 실패 계약

credential/session cookie의 `httpOnly`, `secure`, `sameSite`를 명시한다. httpOnly/secure는 기본 false이며 sameSite 기본값도 없다. sameSite none과 partitioned는 secure true가 필요하다.

잘못된 name, domain/path, 비정수 maxAge, invalid Date, 잘못된 옵션 조합은 TypeError로 거부한다. 사용자 입력에서 나온 attribute는 먼저 검증하지 않으면 handler에서 500으로 보일 수 있다. `__Host-`, `__Secure-` 이름만으로 요구 속성이 자동 강제되지는 않는다.

## 세션 저장소와 플랫폼

| 플랫폼 | 기본 연동 | 운영 경계 |
|---|---|---|
| Express | express-session middleware, `@Session()` 또는 req.session | 기본 MemoryStore는 운영용이 아니다. 공유 store, HTTPS cookie, proxy 신뢰 범위와 secret rotation을 설정한다 |
| Fastify | @fastify/secure-session plugin의 get/set API | key/secret 관리와 rotation, cookie 속성과 만료를 설정한다. Express store API와 혼용하지 않는다 |

express-session의 `resave: false`, `saveUninitialized: false`를 명시해 무변경 세션 재저장과 미사용 세션 발급을 줄인다. 세션 ID 서명과 로그인 상태 폐기, 재발급은 서로 다른 책임이다. proxy 뒤 secure cookie는 HTTPS 요청을 올바르게 인식하도록 trust proxy 범위를 맞춘다.

## 관련 문서

- [[NestJS-Middleware|HTTP middleware]], [[NestJS-Platform-Adapter|HTTP adapter]]
- [[NestJS-Configuration|secret의 부팅 검증]], [[Controller-Routing|request decorator]]

## 출처

- [NestJS Documentation, Cookies](https://docs.nestjs.com/http/cookies)
- [NestJS Documentation, Session](https://docs.nestjs.com/http/session)
