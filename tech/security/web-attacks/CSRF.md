---
tags: [security, csrf, web-attacks, owasp]
status: done
category: "Security"
aliases: ["CSRF", "XSRF", "Cross-Site Request Forgery"]
verified_at: 2026-08-05
---

# CSRF

사용자가 자신의 의지와 상관없이 공격자가 의도한 행위를 특정 웹 사이트에 요청하게 하는 공격. 사이트가 **신뢰하는 사용자(브라우저에 살아 있는 인증 쿠키)**로부터 unauthorized 명령이 전송되는 구조라, 서버 입장에선 정상 사용자의 요청과 구분되지 않는 것이 핵심 문제다.

방어의 원리는 하나로 수렴한다. **브라우저가 자동으로 붙여주지 않는 무언가를 요청에 요구하는 것.** 쿠키는 크로스 사이트에서도 자동 전송되지만, 공격자가 읽어서 복제할 수 없는 값(토큰)이나 브라우저가 위조할 수 없는 값(Origin 헤더)은 그렇지 않다.

## Synchronizer Token 패턴

서버가 사용자 세션마다 **예측 불가능한 토큰을 생성해 서버 측에 보관**하고, 요청에 담겨 온 값과 대조한다. 서버가 정답을 들고 있다는 점에서 가장 강한 형태다.

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
- **전제**: cookie-parser가 `doubleCsrfProtection`보다 먼저 등록돼 있어야 한다. express-session을 쓴다면 cookie-parser를 그 뒤에 등록하는 편이 낫고, 애초에 세션을 쓰는 구성이면 synchronizer 패턴 구현인 csrf-sync 쪽이 권장된다.
- Fastify는 `@fastify/csrf-protection` 플러그인을 `app.register()`로.

## Origin, Referer 헤더 검증

토큰과 별개로 쓰는 층. 요청의 **출발 출처(source origin)**를 `Origin` 또는 `Referer` 헤더에서 읽고, **목표 출처(target origin)**와 비교해 일치할 때만 통과시킨다. 두 헤더는 브라우저가 붙이고 스크립트가 변조할 수 없어서 신뢰할 수 있다.

주의점은 목표 출처를 알아내는 쪽이다. OWASP도 이를 항상 쉽게 결정할 수 있는 것은 아니라고 짚는다. 애플리케이션이 프록시 뒤에 있으면 `Host` 헤더가 도중에 바뀌기 때문이다. 프록시가 넘겨주는 `X-Forwarded-Host` 같은 값을 신뢰할지, 서버 설정에 고정된 출처를 쓸지 먼저 정해야 한다.

또한 `Origin`이 없는 요청(일부 레거시, 프라이버시 설정)에서 `Referer`도 비어 있으면 판정 불가 상태가 된다. 이때 차단할지 통과시킬지는 명시적 정책으로 결정한다.

## SameSite 쿠키의 한계

`SameSite`는 크로스 사이트 요청에 쿠키를 안 실어 보내는 브라우저 레벨 방어다. MDN 기준 `Strict`는 쿠키 출처 사이트에서 시작된 요청에만, `Lax`는 여기에 더해 **사용자가 쿠키 출처 사이트로 이동(navigate)할 때** 전송한다.

OWASP의 평가는 분명하다. SameSite는 **심층 방어 통제로 유용하지만 대부분의 배포에서 제대로 된 CSRF 방어를 대체하지 않는다.** 이유가 셋이다.

- **`Lax`는 안전하지 않은 메서드만 막는다.** 기본 `Lax` 동작은 안전한 메서드(GET, HEAD, OPTIONS, TRACE)를 쓰는 top-level 내비게이션에서는 여전히 쿠키를 전송한다. 즉 GET으로 상태를 바꾸는 엔드포인트가 하나라도 있으면 `<a href>`나 리다이렉트만으로 뚫린다. GET을 조회 전용으로 유지하는 설계가 SameSite의 전제 조건이다.
- **서브도메인은 same-site로 취급된다.** `app.example.com`에 설정한 쿠키는 `anything.example.com`에서 출발한 요청에도 same-site로 판정된다. 멀티 테넌트나 서브도메인을 외부에 내주는 구성에서 문제가 된다.
- SameSite 단독으로 합리적인 방어가 되는 것은 조건을 모두 충족하는 좁은 배포에 한한다. 그 외에는 CSRF 토큰이나 double-submit 패턴과 **함께** 쓰라는 것이 권고다.

쿠키 속성 전반은 [[Cookie|Cookie]] 참고.

## 관련 방어층

- GraphQL 서버는 simple request를 차단해 CORS preflight를 강제하는 방식으로 CSRF 표면을 없앤다 (Apollo Server v4+ 기본 활성 — [[GraphQL-Security]]).
- XSS가 있으면 CSRF 방어는 무의미하다. 스크립트가 그 출처에서 실행되므로 DOM에 렌더된 토큰을 그대로 읽어간다 ([[XSS]]).

## 면접 포인트

Q. Synchronizer Token과 Double-Submit Cookie의 차이는?
- 전자는 서버가 세션에 토큰을 저장하고 대조한다. 강하지만 서버 상태가 필요하다. 후자는 쿠키와 요청 값의 일치만 보므로 서버 상태가 없지만, 값을 만들어내는 방식에 따라 강도가 갈린다.

Q. Double-Submit이 깨지는 경우는?
- 값 일치만 검사하는 naive 방식이다. 공격자가 서브도메인을 장악하면 부모 도메인 쿠키를 심을 수 있고, 그 값을 파라미터에도 넣어 일치하는 위조 요청을 만든다. 세션에 바인딩한 HMAC 서명 토큰을 쓰면 서명을 위조할 수 없어 막힌다.

Q. SameSite=Lax면 CSRF는 끝난 것 아닌가?
- `Lax`는 GET, HEAD 같은 안전한 메서드의 top-level 내비게이션에서는 쿠키를 그대로 보낸다. GET으로 상태를 바꾸는 엔드포인트가 있으면 뚫린다. 서브도메인도 same-site로 취급된다. OWASP도 심층 방어일 뿐 토큰을 대체하지 않는다고 본다.

## 출처

- [OWASP Cheat Sheet Series — Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [NestJS — CSRF Protection](https://docs.nestjs.com/security/csrf)
- [csrf-csrf README (Psifi-Solutions)](https://github.com/Psifi-Solutions/csrf-csrf)

## 관련 문서
- [[CORS]]
- [[XSS]]
- [[Cookie]]
- [[Spring-Security-Session-and-CSRF|Spring Security CSRF]]
