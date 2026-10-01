---
tags: [security, spring-security, authentication, api, form-login]
status: done
verified_at: 2026-10-01
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

### 직접 만든 인증 Filter의 배선

`AbstractAuthenticationProcessingFilter`를 상속하면 처리 URL Matcher, Handler 호출, Session 전략과 Context 저장 흐름을 재사용하고 `attemptAuthentication`에서 Body를 읽어 Token을 만든 뒤 `getAuthenticationManager().authenticate(...)`만 호출하면 된다. 대신 `formLogin` 같은 Configurer가 해 주던 배선을 직접 챙겨야 한다. 7.1 기준 누락 증상은 다음과 같다.

| 배선 | 누락 시 증상 |
|---|---|
| `AuthenticationManager` | 기동 검증이나 첫 인증 요청에서 오류 |
| 새 Token을 `supports`하는 Provider | 처리할 Provider가 없어 인증 실패([[Spring-Security-Authentication-Core\|Provider 선택 규칙]]) |
| 성공과 실패 Handler | 기본 성공 Handler가 Browser용 Redirect를 API에 응답 |
| `SecurityContextRepository` | 직접 만든 Filter의 기본값은 요청 범위 저장소라 다음 요청에서 인증이 사라짐 |
| `SessionAuthenticationStrategy` | 기본값이 아무것도 하지 않아 Session Fixation 방어와 동시 Session 제어가 빠짐 |
| CSRF 정책 | 기본 활성 CSRF가 Login POST를 거부 |

Manager와 Provider 누락, CSRF 거부는 Legacy 실습에서도 재현됐다. Repository 누락은 Legacy의 `SecurityContextPersistenceFilter`가 요청 끝에 Context를 자동 저장해 드러나지 않았으므로 강의 코드를 옮길 때 특히 확인한다. `AbstractAuthenticationFilterConfigurer`를 상속한 DSL은 Manager, Handler, Details Source, Session 전략, Remember-Me와 Repository를 `HttpSecurity`의 공유 설정에서 채운다. 위치는 인증 Filter 기준대로 `LogoutFilter` 뒤이며 보통 `addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class)`로 둔다. JSON 성공 Handler는 Redirect 대신 Principal 요약을 Body로 쓰고, 실패 Handler는 `401`과 일반화한 오류 Body를 쓴다. API Chain은 `@Order`와 `securityMatcher("/api/**")`로 먼저 선택되게 하고 Login과 거부 응답 Endpoint까지 같은 Prefix에 두어 Browser Chain과 섞이지 않게 한다.

반복 배선은 `AbstractHttpConfigurer`를 상속한 Custom DSL로 묶는다. 다른 Configurer 추가는 `init`에서 하고, 공유 `AuthenticationManager`는 `configure`에서 `http.getSharedObject(AuthenticationManager.class)`로 꺼내 Filter에 넣은 뒤 `addFilterBefore`한다. `HttpSecurity`는 모든 `init`이 끝나고 `configure` 직전에 이 공유 객체를 설정하므로 `init`에서는 아직 없다. 현재 공식 문서는 DSL을 `http.with(dsl, customizer)`로 적용한다. Filter를 Bean으로 등록하면 Container 중복 등록을 [[Spring-Security-Architecture-and-Configuration|Architecture 문서]]대로 막는다.

## 추가 인증 정보

`WebAuthenticationDetails` 같은 부가 정보에 Tenant, Device나 IP를 넣을 수 있지만 Client가 보낸 값을 곧바로 신뢰하지 않는다. Tenant Membership은 Server DB에서 확인하고, Proxy 뒤 IP는 신뢰한 Proxy가 정규화한 정보만 사용한다. 위험 신호는 Password 검증을 대체하기보다 MFA, 재인증과 감사의 입력으로 사용한다.

인증 Filter는 `AuthenticationManager`에 넘기기 전에 `AuthenticationDetailsSource.buildDetails(request)`로 details를 만들어 Token에 넣는다. 기본 `WebAuthenticationDetails`는 `request.getRemoteAddr()`의 원격 주소와 이미 있는 Session의 ID만 담으므로 Reverse Proxy 뒤에서는 Proxy 주소일 수 있다. `ProviderManager`는 성공 결과에 details가 없으면 요청 Token의 details를 복사하므로 인증 뒤에도 `Authentication.getDetails()`로 읽을 수 있다.

Login Form의 추가 필드를 검증하려면 `WebAuthenticationDetails`를 확장해 값을 읽고, 이를 만드는 `AuthenticationDetailsSource`를 `formLogin(form -> form.authenticationDetailsSource(...))`에 등록한다. Custom Provider는 `authentication.getDetails()`에서 값을 꺼내 기대값과 다르면 `InsufficientAuthenticationException` 같은 `AuthenticationException`을 던지고, 실패 Handler가 예외 유형별 응답을 정한다.

- 일반 `AuthenticationException`으로 거부해도 parent Manager가 같은 Token을 인증하면 거부가 버려진다([[Spring-Security-Authentication-Core#ProviderManager의 Provider 선택|Provider 선택 규칙]]). 추가 요소 Provider를 `http.authenticationProvider(...)`로만 등록하고 `UserDetailsService` Bean이 하나면 전역 parent에 `DaoAuthenticationProvider`가 자동 구성되어, 추가 요소가 틀린 Form Login도 Password만으로 인증되고 실패 Handler는 호출되지 않는다(7.1.1 소스 기준). 추가 요소 Provider를 유일한 `AuthenticationProvider` Bean으로 등록하거나, `http.authenticationManager(new ProviderManager(provider))`로 parent 없는 Manager를 주거나, `UsernamePasswordAuthenticationToken`을 상속하지 않는 전용 Token과 이를 만드는 인증 Filter를 쓴다. Password는 맞고 추가 요소만 틀린 Login이 실패하는지 Test한다.
- 추가 요소를 Password 검증 뒤에 확인하면서 실패 메시지를 원인별로 다르게 주면 Password가 맞았다는 사실이 드러난다. 외부 메시지는 일반화하고 원인은 Audit Log에 남긴다.
- 예외 메시지를 Redirect URL Parameter에 그대로 실어 화면에 출력하지 않는다. 고정된 오류 Code를 넘기고 화면 문구는 Server가 정한다.

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
- 정수원 강사, [7) Ajax 로그인 구현과 CSRF 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29872)
- [Spring Security 7.1, Form Login](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html)
- [Spring Security 7.1, Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
- [Spring Security 7.1, Request Cache](https://docs.spring.io/spring-security/reference/servlet/architecture.html#requestcache)
- [Spring Security 7.1, Java Configuration](https://docs.spring.io/spring-security/reference/servlet/configuration/java.html)
- [Spring Security 7.1 API, AbstractAuthenticationProcessingFilter](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/authentication/AbstractAuthenticationProcessingFilter.html)
- [Spring Security 7.1 API, WebAuthenticationDetails](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/authentication/WebAuthenticationDetails.html)
- [HttpSecurityConfiguration.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/web/configuration/HttpSecurityConfiguration.java)
- [InitializeUserDetailsBeanManagerConfigurer.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/authentication/configuration/InitializeUserDetailsBeanManagerConfigurer.java)
- [InitializeAuthenticationProviderBeanManagerConfigurer.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/authentication/configuration/InitializeAuthenticationProviderBeanManagerConfigurer.java)

## 관련 문서

- [[Spring-Security-Authentication-Core|Spring Security 인증 Core]]
- [[HTTP-Status-Code|401과 403]]
- [[Rate-Limiting|Login Rate Limit]]
- [[NestJS-Guards-Patterns|NestJS Guard Pattern]]
