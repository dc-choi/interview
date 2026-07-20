---
tags: [security, csrf, web-attacks]
status: done
category: "Security"
aliases: ["CSRF", "XSRF", "Cross-Site Request Forgery"]
---

# CSRF

사용자가 자신의 의지와 상관없이 공격자가 의도한 행위를 특정 웹 사이트에 요청하게 하는 공격. 사이트가 **신뢰하는 사용자(브라우저에 살아 있는 인증 쿠키)**로부터 unauthorized 명령이 전송되는 구조라, 서버 입장에선 정상 사용자의 요청과 구분되지 않는 것이 핵심 문제다.

## 방어 — Double-Submit Cookie 패턴

CSRF 토큰을 **쿠키와 요청 값(헤더나 폼 필드) 양쪽에 실어 서버가 일치를 검증**하는 패턴. 공격자는 피해자 브라우저의 쿠키를 자동 전송시킬 순 있어도 그 값을 읽어 요청 본문에 복제할 수는 없다(SOP).

NestJS/Express 배선은 csrf-csrf 패키지:

- `doubleCsrf(options)`가 4요소를 반환 — 기본 보호 미들웨어 `doubleCsrfProtection`(전역 `app.use`), 라우트에서 토큰과 토큰 쿠키를 발급하는 `generateToken`, 커스텀 미들웨어용 `validateRequest`와 `invalidCsrfTokenError`.
- **전제**: 세션 미들웨어 또는 cookie-parser가 먼저 초기화돼 있어야 한다.
- Fastify는 `@fastify/csrf-protection` 플러그인을 `app.register()`로.

## 관련 방어층

- 쿠키 `SameSite` 속성 — 크로스 사이트 요청에 쿠키 자체를 안 실어 보내는 브라우저 레벨 방어 ([[Cookie]]).
- GraphQL 서버는 simple request를 차단해 CORS preflight를 강제하는 방식으로 CSRF 표면을 없앤다 (Apollo Server v4+ 기본 활성 — [[GraphQL-Security]]).

## 관련 문서
- [[CORS]]
- [[XSS]]
- [[Cookie]]

## 출처
- [NestJS — CSRF Protection](https://docs.nestjs.com/security/csrf)
