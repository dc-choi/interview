---
tags: [security, spring-security, session, csrf, remember-me]
status: done
verified_at: 2026-09-30
category: "Security - 인증"
aliases: ["Spring Security Session", "Spring Security CSRF"]
---

# Spring Security Session, Logout, Remember Me와 CSRF

인증 결과를 다음 요청에 복원하는 전략, Session 생명주기와 CSRF 방어는 한 묶음으로 설계한다. 일반적인 Cookie와 Session 원리는 [[Cookie]], [[Session]]을, 공격 원리는 [[CSRF]]를 정본으로 삼는다.

## Context 지속 전략

| 전략 | Context 복원 | 주의점 |
|---|---|---|
| Stateful Session | `HttpSessionSecurityContextRepository` | Session ID 보호, 만료, 분산 Store와 폐기 |
| Stateless | 요청마다 Credential 재검증 | Server Session이 없어도 Token 폐기와 권한 신선도 문제는 남음 |
| Remember Me | 장기 Cookie로 제한된 인증 복원 | Session 연장이 아니라 별도 장기 Credential |

현재 기본 구조에서 `SecurityContextHolderFilter`는 Repository에서 Context를 읽고, 직접 만든 인증은 다음 요청에 유지하려면 명시적으로 저장한다. `SecurityContextPersistenceFilter`의 자동 저장과 `SessionManagementFilter` 중심 설명은 Legacy 동작이다. Spring Security 6부터 이 두 Legacy Filter는 기본 설정에 포함되지 않으며, Holder Filter와 Persistence Filter를 동시에 구성하지 않는다.

## SessionCreationPolicy

- `ALWAYS`: Session을 적극 생성한다.
- `IF_REQUIRED`: 필요할 때만 생성한다.
- `NEVER`: Spring Security가 만들지는 않지만 이미 존재하는 Session은 사용할 수 있고 다른 Component가 만들 수 있다.
- `STATELESS`: 인증 Context를 Session에 저장하지 않고 Saved Request에도 Session을 쓰지 않는다.

`NEVER`와 `STATELESS`를 같은 의미로 보지 않는다. Token API가 정말 Stateless라면 Request Cache, CSRF Credential 전달 방식과 다른 Framework의 Session 생성도 함께 확인한다.

## Session 생명주기

- Login 성공 시 Session ID를 바꿔 Session Fixation을 막는다. 최신 Servlet Container의 기본 전략은 `changeSessionId`다.
- Idle Timeout과 Absolute Timeout을 따로 정하고 민감 작업은 최근 인증을 요구한다.
- 동시 Session 수를 제한할 때 기존 Session 만료와 새 Login 거부 중 제품 정책을 정한다.
- 분산 환경에서는 Session Store뿐 아니라 동시 Session Registry와 만료 Event도 Node 사이에서 일관돼야 한다.
- Logout은 Security Context, Server Session, Remember-Me Token과 Cookie를 함께 폐기한다.
- Password 변경, 계정 잠금과 권한 회수 시 기존 Session을 어떻게 폐기할지 계약한다.

Logout을 GET Side Effect로 만들면 Link Prefetch와 CSRF에 취약하다. CSRF가 켜진 Browser Application은 검증된 POST Logout을 기본으로 사용하고, Cookie 제거만 성공했다고 Server Session이 폐기됐다고 가정하지 않는다.

### Logout 처리 경로

`LogoutFilter`는 인증 Filter보다 앞에서 요청이 Logout Matcher에 맞는지 보고, 맞으면 현재 `Authentication`을 `CompositeLogoutHandler`에 넘긴 뒤 `LogoutSuccessHandler`를 호출하고 Chain을 끝낸다. 7.1 기본 Matcher는 `/logout`이고 CSRF가 켜져 있으면 `POST`만, 꺼져 있으면 `GET`, `POST`, `PUT`, `DELETE`를 받는다. CSRF를 끄면 `<a href="/logout">` Link와 Prefetch도 바로 Logout을 실행한다.

| Handler | 들어가는 조건 | 역할 |
|---|---|---|
| 사용자 Handler | `addLogoutHandler` | 사용자 정의 정리 작업 |
| `CookieClearingLogoutHandler` | `deleteCookies` | 지정한 이름의 Cookie 만료 |
| `CsrfLogoutHandler` | CSRF 활성 | 저장된 CSRF Token 삭제 |
| `RememberMeServices` | `rememberMe()` | Remember-Me Cookie 취소, Persistent 방식은 그 사용자의 Token 행 삭제 |
| `SecurityContextLogoutHandler` | 항상, 끝에서 두 번째 | Session 무효화, `SecurityContextHolderStrategy` 비움, Repository에 빈 Context 저장 |
| `LogoutSuccessEventPublishingLogoutHandler` | 항상, 마지막 | `LogoutSuccessEvent` 발행 |

그 뒤 기본 `SimpleUrlLogoutSuccessHandler`가 Login Page에 `?logout`을 붙인 URL(기본 `/login?logout`)로 보내며 `logoutSuccessUrl`이나 `logoutSuccessHandler`로 바꾼다. `JSESSIONID`는 Session 무효화로 쓸모가 없어져 `deleteCookies`에 넣지 않아도 되지만, Session 밖에 남는 Cookie는 이름을 지정해야 지워진다. 기본 생성 Login Page를 쓰면 GET `/logout`은 확인 Page를 보여 주고 그 Form이 CSRF Token과 함께 POST한다. Custom Login Page만 쓰면 이 Page가 등록되지 않으므로 Logout 메뉴는 Token을 담은 POST Form Button으로 만든다.

Legacy 강의는 GET Link를 받는 Controller에서 `new SecurityContextLogoutHandler().logout(...)`을 호출해 Logout을 구현했다. 공식 문서도 Custom Endpoint는 최소한 이 Handler를 호출해야 Context가 다음 요청에 남지 않는다고 경고하지만, 이 방식은 표의 `SecurityContextLogoutHandler` 하나만 실행한다.

- Remember-Me Cookie와 Persistent Token, `deleteCookies` 대상, Cookie 저장소에 둔 CSRF Token이 남고 Logout Event도 발행되지 않는다.
- Remember-Me를 켰다면 다음 요청에서 `RememberMeAuthenticationFilter`가 남은 Cookie로 다시 인증해 Logout이 무효가 된다.
- 직접 `new`로 만든 Handler는 기본 `HttpSessionSecurityContextRepository`를 쓰므로 Custom `SecurityContextRepository`를 쓰는 애플리케이션은 같은 Repository를 주입한다.

정리 작업은 Controller를 따로 만들기보다 `addLogoutHandler`로 `LogoutFilter`에 등록하는 편이 공식 권장이다.

### Session Fixation 전략

공격자가 자신이 받은 Session ID를 피해자 Browser에 심고 피해자가 그 ID로 Login하면, 공격자도 같은 ID로 인증된 Session을 공유한다. Legacy 실습에서 `sessionFixation().none()`이면 이 공격이 성공했고 기본값에서는 Login 때 ID가 바뀌어 막혔다.

| 전략 | 동작 |
|---|---|
| `changeSessionId` | Session은 유지하고 Container의 `changeSessionId()`로 ID만 바꾼다. Servlet 3.1 이상의 기본값 |
| `migrateSession` | 새 Session을 만들고 기존 속성을 모두 복사한다. Servlet 3.0 이하의 기본값 |
| `newSession` | 깨끗한 새 Session을 만들되 Spring Security 관련 속성은 복사한다 |
| `none` | 아무것도 바꾸지 않아 고정 공격에 취약하며 공식 문서도 권장하지 않는다 |

### 동시 Session 제어의 집행

`maximumSessions(n)`은 계정당 Session 수를 제한하고(-1은 무제한), `maxSessionsPreventsLogin`이 초과 시 동작을 정한다.

- `false`(기본값): 새 Login을 허용하고 가장 오래 쓰지 않은 기존 Session을 만료 표시한다. 표시만 할 뿐 연결을 끊지 않으므로, 그 Session의 다음 요청에서 `ConcurrentSessionFilter`가 Logout 처리하고 `expiredUrl`로 보낸다.
- `true`: 새 Login을 `SessionAuthenticationException`으로 거부한다. Form Login은 실패 Handler로 가고 Remember-Me 같은 비대화형 인증은 `401`을 받는다.

인증 직후 Session 전략은 동시 Session 검사, 고정 방어, Session 등록 순으로 실행된다. Spring Security 6부터는 인증 수단이 이 전략을 직접 호출하므로 Custom 인증 Filter에는 동시 Session 제어를 명시적으로 구성한다([[Spring-Security-Authentication-Endpoints|인증 Endpoint]]). `invalidSessionUrl`은 무효 Session ID로 들어온 요청을, `expiredUrl`은 동시 제어로 만료 표시된 Session을 처리한다. 둘 다 설정하면 만료 처리 뒤의 Redirect 요청이 다시 무효 Session 처리에 걸릴 수 있으므로(Legacy 강의는 `invalidSessionUrl`이 우선한다고 설명) 실제 이동 경로를 Test한다.

- `HttpSessionEventPublisher`를 등록해야 Session Registry가 Session 종료를 알고 기록을 지운다. 빠지면 Logout이나 만료 뒤에도 Session 수가 줄지 않아 `maxSessionsPreventsLogin(true)`에서 다시 Login하지 못한다.
- 기본 Registry는 Principal의 `equals()`와 `hashCode()`로 사용자를 식별하므로 Custom `UserDetails`는 두 Method를 구현한다. 기본 Registry는 Process Memory에 있으므로 여러 Node에서는 위의 분산 Registry 원칙을 따른다.

## Remember Me의 보안 의미

Remember-Me Cookie는 Session이 끝난 뒤에도 사용자를 복원할 수 있는 장기 Credential이다. 탈취 Window가 길어지므로 짧은 수명, Secure/HttpOnly/SameSite, Server 측 Token 폐기와 Rotation을 적용한다. 결제, Password 변경과 개인정보 Export 같은 고위험 작업은 Remember-Me 인증만으로 허용하지 않고 재인증한다.

### Remember-Me 동작과 두 구현

7.1 기본값은 요청 Parameter와 Cookie 이름 `remember-me`, 유효기간 14일(1,209,600초), `alwaysRemember=false`다. 두 구현 모두 Cookie의 사용자로 계정을 다시 조회하므로 `UserDetailsService`가 필요하다.

- 발급과 폐기: 대화형 Login이 성공하고 사용자가 요청했거나 `alwaysRemember`가 켜져 있으면 Cookie를 발급한다. Login 실패와 Logout 때는 Cookie를 지운다.
- 복원 조건: `RememberMeAuthenticationFilter`는 앞선 Filter가 Context를 채우지 못했고(Session 만료, Browser 종료, Session Cookie 삭제) 요청에 Remember-Me Cookie가 있을 때만 동작한다. 이미 인증된 요청에서는 아무것도 하지 않는다.
- 검증 경로: `RememberMeServices`가 Cookie를 해석하고 계정을 조회해 `RememberMeAuthenticationToken`을 만들면, `AuthenticationManager`의 `RememberMeAuthenticationProvider`가 Key를 확인하고 Filter가 Context를 Repository에 저장한다. 새 Session이 생기므로 재Login 없이 접근이 이어진다.

| 구현 | Cookie 내용 | 특성 |
|---|---|---|
| `TokenBasedRememberMeServices` | `base64(username:만료시각:algorithm:hex(username:만료시각:password:key))`, 기본 SHA-256 | Server 저장이 없다. Username, Password와 Key가 그대로인 동안 유효해 Password를 바꾸면 발급된 Token이 모두 무효가 된다. 탈취된 Token은 만료까지 어느 Client에서나 쓰인다 |
| `PersistentTokenBasedRememberMeServices` | series와 token | `persistent_logins(username, series, token, last_used)`에 저장한다. 사용할 때마다 같은 series에 새 token을 발급하고, series는 맞는데 token이 다르면 탈취로 보고 그 사용자의 Token을 모두 지운다(`CookieTheftException`) |

Hash 기반 Cookie에는 평문 Password가 아니라 Password와 Server Key로 만든 서명이 들어간다. 다만 Username은 Base64로만 감싸져 드러나므로 Persistent 방식은 Cookie에서 Username을 뺐다. 고위험 경로는 [[Spring-Security-Authorization|인가 문서]]의 `fullyAuthenticated`로 Remember-Me 사용자를 재인증시킨다.

## CSRF

Browser가 Session Cookie나 다른 Credential을 자동 첨부하면 공격자가 피해자 Browser로 상태 변경 요청을 보낼 수 있다. Token은 Browser가 자동으로 넣지 않는 Form Field나 Header로 함께 제출하고 Server가 기대값과 비교한다.

Spring Security Servlet의 CSRF 보호는 기본 활성화된다. 현재 Reference는 Token을 필요할 때까지 지연 Load하고 매 요청 난수를 섞어 BREACH 위험을 줄인다. SPA가 Cookie 인증을 사용한다면 Cookie Repository와 Request Handler 계약을 공식 SPA 지침에 맞춘다.

`REST API라서`라는 이유만으로 CSRF를 끄지 않는다. `Authorization` Header의 Bearer Token만 사용하고 Browser가 Credential을 자동 제출하지 않는다는 조건을 검증한 뒤 적용 범위를 결정한다. HTTP Basic이나 Cookie에 담은 JWT도 Browser 자동 전송 특성 때문에 CSRF 표면이 생길 수 있다.

### Token 전달 경로와 거부 증상

`CsrfFilter`는 `GET`, `HEAD`, `TRACE`, `OPTIONS`를 뺀 모든 Method에서 요청의 Token을 저장된 Token과 비교한다. `csrf(csrf -> csrf.disable())`는 이 Filter를 Chain에서 빼고 앞의 Logout Matcher가 GET도 받게 만든다. Legacy 강의의 `csrf().disable()` 같은 인자 없는 DSL은 7.1 `HttpSecurity`에 없고 `csrf(Customizer)`만 있다.

| Client | 전달 방법 |
|---|---|
| Thymeleaf, Spring Form Tag | Thymeleaf는 `th:action`을 처리할 때, Form Tag는 렌더링할 때 unsafe Method Form에 hidden `_csrf`를 넣는다 |
| JSP 일반 Form | `<sec:csrfInput/>`이나 `${_csrf.parameterName}`, `${_csrf.token}` hidden input을 직접 넣는다 |
| Server가 렌더링한 Page의 AJAX | `<sec:csrfMetaTags/>`나 `_csrf`, `_csrf_header` meta tag에서 값과 Header 이름(기본 `X-CSRF-TOKEN`)을 읽어 요청 Header로 보낸다 |
| Cookie를 읽는 SPA | 7.0부터 `csrf.spa()`가 JavaScript로 읽을 수 있는 `XSRF-TOKEN` Cookie를 쓰고 `X-XSRF-TOKEN` Header를 받는다 |

Page에는 요청 속성 `_csrf`의 값을 쓴다. 기본 `XorCsrfTokenRequestAttributeHandler`는 BREACH 대응으로 매 요청 다른 Masked 값을 내주고 제출 값을 풀어 원문과 비교하므로, Cookie의 원문 Token을 Header로 보내는 Client가 기본 Handler를 만나면 계속 거부된다. `csrf.spa()`의 Handler는 Header 값은 원문으로, Form Parameter는 Masked 값으로 해석한다. Legacy 강의의 AJAX Login이 CSRF Header와 함께 보낸 `X-Requested-With`는 강의 Custom Filter의 AJAX 판별 조건일 뿐 CSRF 요건이 아니다.

검증에 실패하면 `CsrfFilter`는 `exceptionHandling`에 설정한 것과 같은 `AccessDeniedHandler`를 직접 호출하고 처리를 끝낸다. 그래서 기본 응답은 인가 거부와 같은 `403`이고, `ExceptionTranslationFilter`를 거치지 않으므로 익명 요청도 Login Redirect나 `401`이 아닌 `403`을 받는다. 새 POST 경로나 직접 만든 Login Filter([[Spring-Security-Authentication-Endpoints|인증 Endpoint]])가 `403`을 받으면 인가 규칙보다 Token 전달을 먼저 확인하고, Handler에서 예외 유형을 나눠 기록한다.

- `InvalidCsrfTokenException`: 저장된 Token이 있는데 요청 값이 없거나 다르다. Meta tag, Header 이름과 Masked 값 계약을 확인한다.
- `MissingCsrfTokenException`: 저장된 Token이 없다. 기본 저장소가 `HttpSession`이라 Session 없이 보낸 첫 POST나 Session 만료 뒤 제출한 Form에서 생기고, `invalidSessionUrl`을 설정하면 무효 Session 처리로 넘어간다.
- 둘 다 `CsrfException`(`AccessDeniedException` 하위)이다. Test를 위해 CSRF를 끄지 말고 MockMvc에서는 `.with(csrf())`나 `.with(csrf().asHeader())`로 Token을 넣는다.

## NestJS로 번역

- Session 방식은 `express-session` 또는 Fastify Session Adapter와 공유 Store를 사용하고 Login 성공 시 ID를 재생성한다.
- Logout Transaction은 Session Store 폐기 성공 여부를 확인하고 Cookie를 만료시킨다.
- 동시 Login 제한은 Redis나 DB의 사용자별 Session Registry를 원자적으로 갱신한다.
- CSRF Middleware는 Cookie/Session Parser 뒤, State-changing Route 앞에 둔다.
- API가 Cookie Session을 쓰면 CORS와 CSRF를 별도 통제로 적용한다.
- Queue와 WebSocket은 HTTP Session Middleware가 자동 적용된다고 가정하지 않는다.

## 출처

- 정수원 강사, [5) Logout 처리, LogoutFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29915)
- 정수원 강사, [6) Remember Me 인증](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29832)
- 정수원 강사, [7) Remember Me 인증 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=30314)
- 정수원 강사, [9) 동시 세션 제어, 세션 고정 보호, 세션 정책](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29834)
- 정수원 강사, [10) 세션 제어 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29835)
- 정수원 강사, [11) 스프링 시큐리티 필터 및 아키텍처 정리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29850)
- 정수원 강사, [7) 로그아웃 및 인증에 따른 화면 보안 처리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29859)
- 정수원 강사, [13) CSRF와 CsrfFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=31605)
- 정수원 강사, [7) Ajax 로그인 구현과 CSRF 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29872)
- 정수원 강사, [2) 인증 필터 - AjaxAuthenticationFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29867)
- [Spring Security 7.1, Authentication Persistence and Session Management](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
- [Spring Security 7.1, Remember-Me Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/rememberme.html)
- [Spring Security 7.1, Handling Logouts](https://docs.spring.io/spring-security/reference/servlet/authentication/logout.html)
- [Spring Security 7.1, CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
- [Spring Security 7.1, FAQ](https://docs.spring.io/spring-security/reference/servlet/appendix/faq.html)
- [Spring Security 7.1 API, AbstractRememberMeServices](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/authentication/rememberme/AbstractRememberMeServices.html)
- [Spring Security 7.1 API, PersistentTokenBasedRememberMeServices](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/authentication/rememberme/PersistentTokenBasedRememberMeServices.html)
- [Spring Security 7.1 API, ConcurrentSessionControlAuthenticationStrategy](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/authentication/session/ConcurrentSessionControlAuthenticationStrategy.html)
- [Spring Security 7.1, JSP Tag Libraries](https://docs.spring.io/spring-security/reference/servlet/integrations/jsp-taglibs.html)
- [Spring Security 7.1, Testing with CSRF Protection](https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html)
- [Spring Security 7.1 API, LogoutConfigurer](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/config/annotation/web/configurers/LogoutConfigurer.html)
- [Spring Security 7.1 API, CsrfFilter](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/csrf/CsrfFilter.html)
- [Spring Security 7.1 API, InvalidCsrfTokenException](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/csrf/InvalidCsrfTokenException.html)
- [Spring Security 7.1 API, MissingCsrfTokenException](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/csrf/MissingCsrfTokenException.html)
- [CsrfConfigurer.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/web/configurers/CsrfConfigurer.java)
- [DefaultLoginPageConfigurer.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/config/src/main/java/org/springframework/security/config/annotation/web/configurers/DefaultLoginPageConfigurer.java)
- [Thymeleaf 3.1, Tutorial: Thymeleaf + Spring](https://www.thymeleaf.org/doc/tutorials/3.1/thymeleafspring.html)

## 관련 문서

- [[Session|Session과 Session Hijacking]]
- [[Cookie|Cookie 보안 속성]]
- [[CSRF|CSRF 방어]]
- [[Auth-Method-Selection|인증 방식 선택]]
