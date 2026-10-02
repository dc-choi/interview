---
tags: [security, csrf, web-attacks, owasp]
status: done
category: "Security"
aliases: ["CSRF", "XSRF", "Cross-Site Request Forgery"]
verified_at: 2026-10-02
---

# CSRF

사용자가 자신의 의지와 상관없이 공격자가 의도한 행위를 특정 웹 사이트에 요청하게 하는 공격. 사이트가 **신뢰하는 사용자(브라우저에 살아 있는 인증 쿠키)**로부터 unauthorized 명령이 전송되는 구조라, 서버 입장에선 정상 사용자의 요청과 구분되지 않는 것이 핵심 문제다.

방어의 핵심은 **자동 전송된 인증 쿠키만으로 요청을 신뢰하지 않는 것**이다. 공격자가 알 수 없는 토큰을 요구하거나, 브라우저가 제공하는 출처 신호를 서버에서 검증한다. 쿠키의 크로스 사이트 전송 여부는 SameSite, 요청의 credentials 설정과 브라우저의 쿠키 정책에 따라 달라진다.

2026-10-02 부분 검증: 토큰 패턴, 출처 헤더, SameSite와 API preflight 방어의 조건, 아래 패키지 계약을 공식 출처와 대조했다. 브라우저별 공격 재현이나 특정 애플리케이션의 배선은 검증하지 않았다.

## Synchronizer Token 패턴

서버가 사용자 세션마다 **예측 불가능한 토큰을 생성해 서버 측에 보관**하고, 요청에 담겨 온 값과 대조한다. OWASP가 상태를 가진 애플리케이션에 권장하는 패턴이다. 무상태 애플리케이션의 signed double-submit과 비교해 무조건 더 강하다고 서열을 정하기보다 세션 저장 구조와 구현 조건으로 선택한다.

- 토큰 전달: HTML 응답이나 JSON 응답 페이로드에 실어 내려보낸다.
- 토큰 반환: 폼의 hidden 필드, 커스텀 헤더, JSON 페이로드 중 하나로 되돌려 받는다.
- OWASP는 **이 synchronizer 패턴에 한해 CSRF 토큰을 쿠키로 전송해서는 안 된다**고 명시한다. 쿠키는 브라우저가 자동으로 붙여주므로 그 자체로는 증거가 되지 않는다. 뒤의 double-submit은 쿠키를 의도적으로 저장 수단으로 쓰되 쿠키가 아닌 경로로 되돌려 받아 대조하는 별개 패턴이라 이 권고의 대상이 아니다.

비용은 서버 상태다. 세션 저장소에 토큰을 들고 있어야 해서 무상태 API나 다중 인스턴스 환경에서 부담이 생긴다.

## Double-Submit Cookie 패턴

CSRF 토큰을 **쿠키와 요청 값(헤더나 폼 필드) 양쪽에 실어 서버가 일치를 검증**하는 패턴. 공격자는 피해자 브라우저의 쿠키를 자동 전송시킬 순 있어도 그 값을 읽어 요청 본문에 복제할 수는 없다(SOP). 서버가 토큰을 저장하지 않아도 되는 것이 장점이다.

### naive 방식이 깨지는 지점

단순히 랜덤 값을 쿠키와 파라미터 양쪽에 넣고 같은지만 보는 형태를 OWASP는 naive double-submit이라 부르며, **쿠키 주입 공격에 여전히 취약**하다고 경고한다. 특히 공격자가 서브도메인이나 네트워크 환경을 통제해 쿠키를 심거나 덮어쓸 수 있을 때다.

성립하는 이유는 쿠키의 범위 규칙이 동일 출처 정책보다 느슨하기 때문이다. 쿠키는 도메인 단위로 공유되므로, DNS takeover 등으로 장악한 서브도메인에서 부모 도메인용 쿠키를 심으면 공격자가 값을 아는 쿠키가 피해자 브라우저에 자리 잡는다. 그러면 같은 값을 요청 파라미터에도 넣어 **일치하는 위조 요청**을 만들 수 있다. 서버는 두 값이 같은지만 보므로 통과시킨다.

### signed(HMAC) 방식

그래서 권장형은 토큰을 **세션에 종속된 값과 묶어 서명**하는 것이다. 서명 키는 서버만 알고, 토큰은 특정 세션에 바인딩된다. 공격자가 서브도메인에서 쿠키를 심어도 피해자 세션에 대해 유효한 서명을 만들어낼 수 없다.

### NestJS, Express 배선

csrf-csrf 패키지:

- v4 기준 `doubleCsrf(options)`가 4요소를 반환 — 기본 보호 미들웨어 `doubleCsrfProtection`(전역 `app.use`), 라우트에서 토큰을 발급하는 `generateCsrfToken`, 커스텀 미들웨어용 `validateRequest`와 `invalidCsrfTokenError`.
- 필수 옵션은 `getSecret`과 `getSessionIdentifier`다. 서버의 HMAC 비밀 키와 로그인 세션마다 달라지는 식별값으로 토큰을 바인딩한다. 토큰을 되돌려 받는 경로는 헤더나 본문으로 정하고 자동 전송되는 쿠키 값만 읽어 검증하지 않는다.
- **전제**: cookie-parser가 `doubleCsrfProtection`보다 먼저 등록돼 있어야 한다. express-session을 쓴다면 cookie-parser를 그 뒤에 등록하는 편이 낫고, 애초에 세션을 쓰는 구성이면 synchronizer 패턴 구현인 csrf-sync 쪽이 권장된다.
- Fastify는 cookie/session 저장 플러그인 다음에 `@fastify/csrf-protection`을 등록하고 보호할 라우트의 hook에 `fastify.csrfProtection`을 연결한다. 등록만으로 모든 라우트가 보호되는 것은 아니다. 본문에서 토큰을 읽으면 body parsing 이후의 `preValidation`/`preHandler`를 사용한다.
- Fastify의 쿠키 기반 저장에서도 cookie tossing을 고려한다. `getUserInfo`로 사용자 정보를 바인딩하면 토큰 발급 시 `userInfo`를 제공해야 하며, `@fastify/cookie` 조합에서는 `csrfOpts.hmacKey`도 필수다. 플러그인 기본값만으로 쿠키 주입까지 해결됐다고 가정하지 않는다.

NestJS v12.1+에는 Fetch Metadata와 Origin/Host를 확인하는 `enableCsrfProtection()` 내장 방어도 있다. 신호가 없는 요청은 허용하고 GET/HEAD/OPTIONS도 검사에서 제외하므로, 지원 클라이언트와 상태 변경 메서드를 확인해 토큰 방식의 필요성을 판단한다 ([[NestJS-HTTP-Security]]).

## Origin, Referer 헤더 검증

요청의 **출발 출처(source origin)**를 `Origin` 또는 `Referer`에서 읽고, **목표 출처(target origin)** 또는 명시적으로 신뢰한 출처와 정확히 비교한다. `scheme + host + port` 전체를 비교하며 `example.org.attacker.com` 같은 접미사나 부분 문자열을 허용하지 않는다.

이 신호의 신뢰는 브라우저 전제다. 웹 페이지는 임의의 `Origin`을 설정할 수 없고, `Referer`는 fetch 옵션으로 생략하거나 같은 출처의 URL로 바꿀 수 있지만 타 출처로 위조할 수는 없다. 비브라우저 클라이언트는 두 헤더를 직접 보낼 수 있으므로 인증과 인가를 대체하지 않는다.

목표 출처는 서버 설정에 고정하거나 신뢰한 프록시에서 전달받는다. 프록시 뒤에서는 `Host`가 바뀔 수 있으며, `X-Forwarded-Host`는 신뢰한 프록시가 외부 입력을 덮어쓰도록 구성한 경우에만 사용한다.

`Origin`이 없으면 `Referer`를 확인한다. 둘 다 없거나 `Origin: null`처럼 출처를 확정할 수 없으면 기본적으로 차단하거나 별도의 CSRF 토큰으로 검증한다. 호환성 때문에 허용할 예외는 범위와 잔여 위험을 명시한다.

## SameSite 쿠키의 한계

`SameSite`는 크로스 사이트 요청에서 쿠키 전송을 제한하는 브라우저 방어다. `Strict`는 same-site 요청에만 전송하고, 명시적인 `Lax`는 여기에 더해 **안전한 메서드의 top-level 내비게이션**에도 전송한다. 교차 사이트 fetch, iframe 내비게이션이나 이미지 요청까지 허용한다는 뜻은 아니다. `None`은 이 제한을 풀며 `Secure`가 필요하다.

OWASP는 SameSite를 **대부분의 배포에서 다른 CSRF 방어와 함께 쓰는 심층 방어층**으로 본다. 다음 조건을 구분해야 한다.

- **안전한 메서드는 상태를 바꾸면 안 된다.** 명시적인 `Lax`도 GET 같은 안전한 메서드의 top-level 내비게이션에는 쿠키를 보낸다. GET으로 상태를 바꾸는 엔드포인트가 있으면 `<a href>`나 리다이렉트로 공격할 수 있다.
- **미지정 기본값과 명시적인 `Lax`는 다를 수 있다.** 일부 브라우저는 SameSite를 생략했을 때 완화된 기본 Lax를 적용해, 설정한 지 2분 이내인 쿠키를 교차 사이트 top-level POST에도 보낸다. 명시적으로 `SameSite=Lax`를 설정한 경우와 혼동하지 않는다.
- **same-site와 same-origin은 다르다.** 현재 SameSite 판정은 scheme과 등록 가능 도메인을 사용한다. 같은 HTTPS의 `app.example.com`과 `anything.example.com`은 same-site이고 포트는 구분하지 않는다. HTTP와 HTTPS는 cross-site다. 공격자가 같은 사이트의 서브도메인을 통제하면 대상 호스트로 보내는 요청에 쿠키가 실릴 수 있다. 이 판정이 host-only 쿠키를 형제 호스트에도 공유한다는 뜻은 아니다.
- 토큰 없이 SameSite를 주된 방어로 삼는 좁은 구성은 같은 등록 가능 도메인의 모든 호스트를 통제하고, 안전한 메서드에 상태 변경이 없으며, `SameSite=Strict` 또는 `SameSite=Lax`와 `__Host-` prefix의 조합을 사용하고, 상태 변경 요청의 Origin/Referer도 확인하는 경우다. 이를 강제하지 않는 브라우저의 위험도 별도로 받아들여야 한다. 그 외에는 CSRF 토큰이나 signed double-submit과 함께 쓴다.

쿠키 속성 전반은 [[Cookie|Cookie]] 참고.

## 관련 방어층

- **API의 필수 커스텀 헤더와 엄격한 CORS 허용 목록**도 방어가 된다. 상태 변경 요청에서 헤더가 없으면 서버가 실행 전에 거부하고, preflight에는 직접 통제하는 출처만 허용한다. 헤더 값 자체를 비밀 토큰으로 만들 필요는 없지만 폼/simple 요청의 대체 경로가 없어야 한다. 모든 Origin을 반사하거나 공격자가 장악할 수 있는 서브도메인을 허용하면 이 전제가 깨진다 ([[CORS]]).
- Apollo Server v4+의 기본 CSRF prevention은 simple request에서 GraphQL operation을 실행하지 않도록 요구 헤더를 검사한다. 교차 출처 요청은 preflight를 거치게 되며, 그 허용 목록도 좁혀야 한다. 모든 GraphQL 서버가 자동으로 보호되거나 XSS까지 막는다는 뜻은 아니다 ([[GraphQL-Security]]).
- 현대 브라우저 대상에서는 Fetch Metadata의 `Sec-Fetch-Site`로 cross-site 상태 변경 요청을 차단하는 방안도 있다. 헤더가 없는 클라이언트의 Origin 검증이나 토큰 fallback, same-site 서브도메인의 신뢰 범위를 함께 정한다.
- XSS로 보호할 출처에서 스크립트가 실행되면 토큰을 읽거나 정상 요청 경로를 호출해 CSRF 방어를 우회할 수 있다. 따라서 XSS를 별도로 막아야 하지만 CSRF 방어를 제거할 이유는 아니다 ([[XSS]]).

## 면접 포인트

Q. Synchronizer Token과 Double-Submit Cookie의 차이는?
- 전자는 서버가 세션에 토큰을 저장하고 대조한다. 후자는 서버에 CSRF 토큰을 저장하지 않는 방식이며, 권장형은 값 일치뿐 아니라 세션에 바인딩된 HMAC 서명도 검증한다. 상태 저장 구조와 쿠키 주입 위협으로 선택한다.

Q. Double-Submit이 깨지는 경우는?
- 값 일치만 검사하는 naive 방식이다. 공격자가 서브도메인을 장악하면 부모 도메인 쿠키를 심을 수 있고, 그 값을 파라미터에도 넣어 일치하는 위조 요청을 만든다. 세션에 바인딩한 HMAC 서명 토큰을 쓰면 서명을 위조할 수 없어 막힌다.

Q. SameSite=Lax면 CSRF는 끝난 것 아닌가?
- 명시적인 `Lax`도 안전한 메서드의 top-level 내비게이션과 same-site 요청에는 쿠키를 보낸다. GET의 상태 변경과 같은 scheme의 악성 서브도메인이 문제다. SameSite 생략 시 일부 브라우저의 2분 POST 예외도 구분한다. OWASP는 좁은 배포 조건을 모두 만족하지 않으면 다른 CSRF 방어와 함께 쓰도록 권고한다.

## 출처

- [OWASP Cheat Sheet Series — Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN — Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [MDN — Site](https://developer.mozilla.org/en-US/docs/Glossary/Site)
- [MDN — Forbidden request header](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header)
- [WHATWG Fetch Standard — Request class](https://fetch.spec.whatwg.org/#request-class)
- [NestJS — CSRF Protection](https://docs.nestjs.com/security/csrf)
- [csrf-csrf README (Psifi-Solutions)](https://github.com/Psifi-Solutions/csrf-csrf)
- [fastify/csrf-protection — README](https://github.com/fastify/csrf-protection)
- [Apollo Server — Configuring CORS, Preventing CSRF](https://www.apollographql.com/docs/apollo-server/security/cors#preventing-cross-site-request-forgery-csrf)

## 관련 문서
- [[CORS]]
- [[XSS]]
- [[Cookie]]
- [[Spring-Security-Session-and-CSRF|Spring Security CSRF]]
