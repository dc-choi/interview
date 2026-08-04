---
tags: [security, spring-security, authentication, api, form-login]
status: done
verified_at: 2026-08-04
category: "Security - 인증"
aliases: ["Spring Security Login Endpoint", "Spring Security API 인증"]
---

# Spring Security Browser와 API 인증 Endpoint

Form Login과 JSON API Login은 같은 인증 Core를 재사용하지만 입력 형식, 성공 응답, 인증 개시와 오류 표현이 다르다. AJAX라는 호출 방식만으로 별도 신뢰 경계를 만들지 않는다.

## Browser와 API 계약을 분리한다

| 상황 | Browser Form | JSON API |
|---|---|---|
| 보호 Resource에 미인증 접근 | Login Page Redirect | `401`과 인증 Scheme 안내 |
| Login 성공 | Saved Request 또는 안전한 기본 URL로 Redirect | Session 확립 또는 Token 응답 |
| Credential 검증 실패 | Login Page와 일반화한 오류 | `401` Problem 응답 |
| 인증됐지만 권한 부족 | 오류 Page 또는 `403` | `403` Problem 응답 |

API가 Redirect 뒤의 HTML을 `200`으로 받게 만들지 않는다. Client 유형이 다른 경우 `SecurityFilterChain`, `AuthenticationEntryPoint`와 Handler를 명시적으로 나눈다.

## Handler의 책임

- `AuthenticationSuccessHandler`: 인증 완료 뒤 Redirect나 응답 작성, Saved Request 복원
- `AuthenticationFailureHandler`: 제출한 Credential 인증 실패 응답
- `AuthenticationEntryPoint`: 보호 Resource에 인증되지 않은 요청이 왔을 때 인증을 시작
- `AccessDeniedHandler`: 인증된 Principal의 인가 거부 응답
- `RequestCache`: 인증 전 원래 Browser 요청 저장과 복원

`ExceptionTranslationFilter`는 보안 예외를 HTTP 응답 전략으로 번역하지만 접근 결정을 직접 수행하지 않는다. Stateless API에서는 Session 기반 Saved Request가 필요 없으므로 `NullRequestCache` 같은 전략을 검토한다.

## Saved Request와 Open Redirect

Login 성공 뒤 원래 URL로 보내는 기능은 사용자 경험을 개선하지만 Redirect Target을 Client 입력 그대로 신뢰하면 Open Redirect가 된다. Server가 저장한 동일 Origin 요청만 허용하고 Scheme, Host와 경로를 검증한다. State-changing POST를 Login 뒤 자동 재실행하는 설계는 중복 수행과 CSRF 위험을 검토한다.

## JSON 인증 Filter

Custom Filter가 필요하면 다음 경계를 분리한다.

1. `RequestMatcher`로 Method, Path와 Content-Type을 좁힌다.
2. Body 크기와 Schema를 검증해 미인증 `Authentication`을 만든다.
3. `AuthenticationManager`에 검증을 위임한다.
4. 성공 시 Credential을 지우고 Context 저장 전략을 호출한다.
5. 실패 시 Password, Token과 내부 예외를 노출하지 않는 응답을 만든다.

`X-Requested-With`는 Client가 임의로 보낼 수 있어 AJAX 여부를 추정하는 Hint일 뿐 인증이나 CSRF 증거가 아니다. Custom DSL은 반복 설정을 캡슐화할 수 있지만 Framework 내부 Bean Registry를 조작하거나 Built-in 보호를 우회하는 수단으로 쓰지 않는다.

## 추가 인증 정보

`WebAuthenticationDetails` 같은 부가 정보에 Tenant, Device나 IP를 넣을 수 있지만 Client가 보낸 값을 곧바로 신뢰하지 않는다. Tenant Membership은 Server DB에서 확인하고, Proxy 뒤 IP는 신뢰한 Proxy가 정규화한 정보만 사용한다. 위험 신호는 Password 검증을 대체하기보다 MFA, 재인증과 감사의 입력으로 사용한다.

## NestJS로 번역

- `AuthGuard('local')`과 Passport Strategy가 Credential을 검증하고 `request.user`를 만든다.
- Login Controller는 Browser Redirect인지 JSON 응답인지 계약을 명시한다.
- Guard는 `UnauthorizedException`, Policy Guard는 `ForbiddenException`을 구분하고 Exception Filter가 일관된 오류 Body를 만든다.
- DTO Validation, Body Limit, Login Rate Limit과 Account Enumeration 방어를 인증 앞단에 둔다.
- 인증 성공 Handler에 주문 생성 같은 Business Side Effect를 넣지 않는다.
- `@Public()`은 명시적 Metadata로 두고 Global Auth Guard가 기본 거부하도록 한다.

Spring의 Filter Hook을 Nest의 Middleware, Guard와 Interceptor에 이름만 맞춰 옮기지 않는다. 인증과 인가는 Guard, 응답 변환은 Interceptor나 Exception Filter, Business Rule은 Service에 둔다.

## 출처

- 정수원 강사, [6) 커스텀 로그인 페이지 생성하기](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29858)
- 정수원 강사, [8) 인증 부가 기능](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29860)
- 정수원 강사, [9) 인증 성공 핸들러](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29861)
- 정수원 강사, [10) 인증 실패 핸들러](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29862)
- 정수원 강사, [1) Ajax 인증 흐름 및 개요](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29866)
- 정수원 강사, [2) 인증 필터 - AjaxAuthenticationFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29867)
- 정수원 강사, [3) 인증 처리자 - AjaxAuthenticationProvider](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29868)
- 정수원 강사, [4) Ajax 인증 성공과 실패 Handler](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29869)
- 정수원 강사, [5) Ajax 인증과 인가 예외 처리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29870)
- 정수원 강사, [6) Ajax Custom DSL 구현](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29871)
- [Spring Security 7.1, Form Login](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html)
- [Spring Security 7.1, Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
- [Spring Security 7.1, Request Cache](https://docs.spring.io/spring-security/reference/servlet/architecture.html#request-cache)

## 관련 문서

- [[Spring-Security-Authentication-Core|Spring Security 인증 Core]]
- [[HTTP-Status-Code|401과 403]]
- [[Rate-Limiting|Login Rate Limit]]
- [[NestJS-Guards-Patterns|NestJS Guard Pattern]]
