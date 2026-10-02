---
tags: [nestjs, authentication, session, jwt]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 인증과 credential"]
---

# NestJS 인증과 credential

`@nestjs/authentication`은 credential provider, 전역 인증 guard와 로그인 상태를 연결한다. 아래 계약은 2026-10-01에 확인한 공식 문서 기준이다. 기존 Passport/JWT guard 구현에 새 패키지의 decorator나 저장소 계약을 그대로 적용하지 않는다.

## 등록과 실행 경계

`AuthenticationModule.forRoot()`에는 일반 설정값을 넣고, provider와 handler, store는 자신의 singleton module에서 등록한다. 환경값은 `forRootAsync()`의 factory에서 읽어 import 시점 평가를 피한다. async의 `isGlobal`, `globalGuard`는 최상위 옵션이다. 누락된 필수값, 알 수 없는 옵션과 잘못된 duration은 시작 시 거부된다.

credential provider는 생성자에서 `AuthenticationRegistry`에 등록한다. SessionCookieProvider/JwtBearerProvider/ApiKeyProvider를 확장할 수 있다. 명시한 `order`의 오름차순으로 평가해 처음 사용자를 반환한 provider가 선택되며, 같은 order는 시작 오류다. 생성자 등록이 끝나면 registry가 잠긴다.

| 선언 | 인증 계약 |
|---|---|
| 기본 route | credential이 없거나 유효하지 않으면 401 |
| `@Public()` | 인증 자체를 건너뛴다. 유효한 token을 보내도 guest다 |
| `@Authenticate({ optional: true })` | credential 없음은 guest, 잘못된 credential은 401 |
| `mfa: true` | 확인된 2차 인증 필요 |
| `verifiedEmail: true` | 미검증 이메일은 403 `email_unverified` |
| `providers` | 허용한 provider와 그 subclass만 평가 |

애플리케이션은 credential provider의 `validate()`에서 현재 사용자를 조회해 삭제/차단 상태를 적용하고, 비밀번호 해시 등 민감 필드를 제외한 안전한 User만 반환해야 한다. 프레임워크가 임의의 사용자 객체에서 민감 필드를 자동 제거한다고 가정하지 않는다. JWT에 들어 있는 과거 정보만으로 사용자의 현재 상태를 판단하지 않는다.

## 요청 주체와 AsyncLocalStorage

`@CurrentUser(key?)`, `@CurrentSession()`과 `AuthenticationContext`로 현재 주체를 읽는다. context는 handler 실행을 둘러싸는 AsyncLocalStorage에 놓여 그 안의 await/service 호출을 따라간다. middleware, guard, filter, cron과 queue 작업에서는 자동 제공되지 않는다. 별도 작업은 `context.run(result, fn)`처럼 주체를 명시한다.

`requireUser()`의 `AuthenticationError`는 handler에서 401로 변환된다. type augmentation은 context의 사용자 필드 타입을 보강하며 parameter의 모든 타입을 자동 추론하지 않는다. WebSocket/GraphQL에서는 연결 객체에 남은 마지막 사용자를 읽지 말고 현재 message/operation의 decorator와 context를 사용한다.

## 서버 세션과 쿠키

세션 ID는 256비트 난수이고 서버에는 SHA-256 해시를 저장한다. 기본 cookie는 `__Host-sid`, secure/httpOnly, SameSite=Lax, path `/`이다. HTTPS가 아닌 개발에서는 `sid`를 쓰는 설정을 확인한다. SameSite=None에는 secure가 필요하다.

로그인 때 이전 ID를 무효화하고 새 ID를 발급해 fixation을 막는다. absolute TTL 기본 7일, idle TTL 1일, touch 간격 1분이다. touch는 idle보다 작아야 하며 0으로 비활성화할 수 있다. 조회에서 만료를 즉시 적용하고 touch로 폐기된 세션을 되살리지 않는다.

cookie credential은 cross-site unsafe 요청과 WebSocket handshake에서 Sec-Fetch-Site/Origin/Host로 제한된다. 허용할 외부 origin은 `trustedOrigins`에 정확히 지정하고 CSRF의 신뢰 범위와 맞춘다. 관련 헤더가 없는 비브라우저 요청을 허용하는 경계가 있으므로 이를 token 기반 CSRF 보호 전체를 대체하는 것으로 해석하지 않는다. 로그인 자체의 cross-site 시도도 403으로 막는다.

`rotateSession()`은 권한 변경 시 사용할 수 있다. 동시 폐기/rotation에서 패배하면 null을 반환하고 cookie를 발급하지 않는다. 다른 세션만 폐기할 때 현재 세션을 제외한다. 사용자별 목록과 revoke는 소유자를 확인하며 타인 ID는 404다. 목록에 raw secret을 노출하지 않는다.

## Access token과 refresh token

서명 key는 HS256의 32바이트 이상 secret 또는 RS256/ES256/EdDSA의 private PEM/KeyObject다. DER/JWK는 key object로 먼저 가져온다. key 없이 implicit fallback하지 않는다. issuer/audience와 만료를 검증한다.

access TTL 기본은 15분이다. 이 패키지의 duration 숫자는 **밀리초**이며, 발급 결과 `expiresIn`은 **초**다. 기존 JWT 라이브러리의 초 단위를 복사한 `3600`은 한 시간이 아니라 3.6초가 된다.

외부 issuer의 JWKS는 localhost 예외를 제외하고 HTTPS를 사용한다. issuer/audience를 지정한다. audience 검증을 false로 끄면 필요한 client claim 검증을 직접 수행한다. clock tolerance도 명시적 duration이다.

refresh token은 256비트 opaque secret의 해시를 저장하고 한 번만 사용한다. 기본 token TTL은 30일, family 최대 수명은 90일이다. 재사용을 탐지하면 그 family 전체를 폐기한다. 재사용과 동시에 만들어진 후속 token까지 막는 저장소 원자성이 필요하다.

발급 claim은 family에 남아 refresh 때 이어진다. 동적으로 바뀌는 role을 오래된 claim으로 고정하지 말고 현재 사용자/인가 상태를 확인한다. sign-out/password reset으로 refresh를 폐기해도 이미 발급한 access JWT는 만료까지 암호학적으로 유효하다. 사용자 삭제를 매 요청 조회하는 검증은 별도 효과다.

## API key

key는 lower-case prefix(1~16자), 공개 ID(16진수 16자), 256비트 secret을 조합한다. 저장값은 전체 key의 SHA-256이며 원문은 발급 때 한 번만 보여준다. prefix는 provider realm을 구분한다. 검증은 일정 시간 비교와 unknown-key dummy 경로를 사용하고 만료와 현재 소유자를 확인한다.

Bearer의 JWT(점 두 개)와 opaque API key를 구분하는 dispatch가 있다. `currentSession`은 api-key method와 keyId를 알려주지만 MFA를 충족하지 않는다. API key scope는 별도의 인가 규칙이다.

key 생성/조회/폐기 route는 session provider만 허용해 key로 추가 key를 발급하지 못하게 한다. 소유자와 함께 DB 삭제하면 다음 요청부터 무효다. 세션/refresh 전체 로그아웃, password reset은 애플리케이션 DB의 API key를 자동 폐기하지 않는다. 별도 폐기 정책과 audit가 필요하다. API key 요청의 모든 audit를 auth event가 대신해 주지는 않는다.

## Passport를 사용하는 기존 구성

PassportStrategy의 super options와 validate가 credential 검증을 정의하고 AuthGuard가 validate 결과를 req.user에 전달한다. JWT 서명/만료 검증만으로 현재 계정 상태나 서버의 token 폐기가 증명되지는 않으므로 validate에서 필요한 조회를 수행한다.

strategy 자체를 Scope.REQUEST로 만들면 Passport에 등록되지 않는다. singleton strategy의 passReqToCallback을 켜고 ContextIdFactory.getByRequest(req), ModuleRef.resolve로 요청 dependency만 해결한다. GraphQL guard는 GqlExecutionContext에서 req를 반환하고 local 로그인 argument를 req.body에 전달하는 경계를 맞춘다.

Passport 0.6+의 req.logout(callback)는 express-session과 passport initialize/session middleware를 사용하는 구성의 세션 로그아웃이다. JWT 폐기 API로 사용하지 않는다.

## 운영 판단

- 인증 guard는 전역 적용을 기본으로 두고 공개/선택 인증 route를 명시한다.
- secret과 issuer, duration은 시작 시 검증하고, store는 [[NestJS-Authentication-Storage]]의 동시성 계약을 만족시킨다.
- MFA 완료와 세션 rotation은 [[NestJS-Account-Recovery-and-MFA]]의 pending 상태를 보존한다.
- 인증 실패, 로그인과 폐기의 audit에는 secret/token 원문을 남기지 않는다.

## 출처

- [NestJS Documentation, Authentication](https://docs.nestjs.com/security/authentication)

- [NestJS Documentation, Passport](https://docs.nestjs.com/recipes/passport)

## 관련 문서

- [[NestJS-Security]]
- [[NestJS-Cookies-and-Sessions]]
- [[NestJS-Authorization]]
