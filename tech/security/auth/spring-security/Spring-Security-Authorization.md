---
tags: [security, spring-security, authorization, method-security]
status: done
verified_at: 2026-10-01
category: "Security - 인증"
aliases: ["Spring Security Authorization", "Spring Method Security"]
---

# Spring Security Request와 Method 인가

인증 결과는 인가의 입력일 뿐 허용 결정이 아니다. Spring Security의 현재 Request 인가는 `AuthorizationFilter`가 `Authentication`과 요청을 `AuthorizationManager`에 전달하고, Method 인가는 AOP Interceptor가 호출 전후에 같은 판단 모델을 적용한다.

## Request 인가 흐름

```text
AuthorizationFilter
  -> Supplier<Authentication>
  -> AuthorizationManager<RequestAuthorizationContext>
  -> granted: continue FilterChain
  -> denied: AccessDeniedException
  -> ExceptionTranslationFilter
```

현재 `AuthorizationManager`는 Legacy `AccessDecisionManager`와 `AccessDecisionVoter`를 대체한다. `authorizeHttpRequests`를 사용하면 `AuthorizationFilter`가 동작하며, Authentication은 실제 결정에 필요할 때 지연 조회된다.

`AuthorizationManager`는 허용과 거부 외에 null로 기권을 표현한다. `AuthorizationManagers.anyOf`는 첫 허용에서, `allOf`는 첫 거부에서 결정하고, 모두 기권하면 `anyOf`는 거부, `allOf`는 허용이 기본값이다. 6.3부터 이 기본 결정을 인자로 받는 Overload가 있다. 기권한 Manager는 결합에서 빠지므로 기본 결정은 모든 Manager가 기권할 때만 쓰인다. `allOf`에서 한 조건이 허용하고 나머지가 기권하면 기본 결정과 무관하게 허용이다. `AuthorizationFilter`는 최종 결과가 null이면 요청을 통과시키므로 Custom Manager는 정책이 없을 때 명시적 거부를 반환한다.

## 규칙 설계

- `permitAll`: 인증과 무관하게 공개
- `denyAll`: 조건과 무관하게 거부
- `hasAuthority`: 정확한 Authority 문자열 요구
- `hasRole`: 기본 Prefix를 적용하는 `hasAuthority` Shortcut
- `hasAnyAuthority`, `hasAnyRole`: 하나라도 있으면 허용. 7.1 문서 기준 모두 요구하는 `hasAllAuthorities`, `hasAllRoles`도 있다.
- `authenticated`: 익명이 아닌 인증 사용자, Remember-Me 복원 사용자 포함
- `fullyAuthenticated`: 인증 사용자 중 Remember-Me 복원 사용자 제외. 결제와 Password 변경처럼 재인증이 필요한 경로에 쓴다.
- `rememberMe`: Remember-Me로 복원된 사용자만
- `anonymous`: 익명 Token 사용자만 허용하고 이미 Login한 사용자는 거부한다. Login과 가입 화면처럼 익명 전용 경로용이라 `permitAll`과 목적이 다르다.
- `access`: Domain 조건을 평가하는 Custom `AuthorizationManager`. IP 조건은 DSL Method가 없어 `access(IpAddressAuthorizationManager.hasIpAddress("10.0.0.0/8"))`(6.3부터)처럼 쓰며 `request.getRemoteAddr()` 기준이다.

Matcher 규칙은 구체적인 경로부터 배치하고 마지막에 `anyRequest().denyAll()` 또는 `authenticated()` 같은 명시적 기본값을 둔다. 규칙은 선언 순서대로 보고 첫 일치 하나만 적용하므로 `/admin/**`를 `/admin/pay`보다 앞에 두면 좁은 규칙은 쓰이지 않는다. 7.1 기준 어느 규칙에도 일치하지 않는 요청은 거부된다. Public Endpoint도 `web.ignoring`보다 `permitAll`을 우선해 Security Header 같은 Security Filter Chain의 보호를 유지한다([[Spring-Security-Architecture-and-Configuration#Filter를 통째로 우회하지 않는다|ignore가 빼는 보호]]).

Thymeleaf의 `sec:authorize="isAnonymous()"` 같은 화면 표현식은 Login과 Logout 메뉴 노출을 바꿀 뿐이다. 실제 접근 차단은 URL과 Method 인가가 맡는다.

## 401, 403과 예외 번역

| 상태 | 처리 |
|---|---|
| 유효한 인증이 없음 | `AuthenticationEntryPoint`가 Login Redirect 또는 `401`과 Challenge 생성 |
| 인증됐지만 정책이 거부 | `AccessDeniedHandler`가 `403` 생성 |
| Credential 제출 자체가 실패 | 인증 Filter의 `AuthenticationFailureHandler` |

`ExceptionTranslationFilter`는 `AuthenticationException`과 `AccessDeniedException`을 UI나 HTTP 응답으로 바꾸는 Bridge다. 인가 판단 자체를 하지 않으며, API에서 익명 요청을 Login HTML로 Redirect하지 않도록 Entry Point를 분리한다.

인가 계층은 익명 사용자에게도 권한이 부족하면 `AccessDeniedException`을 던진다. `ExceptionTranslationFilter`는 인가 Filter 바로 앞에서 뒤쪽 호출을 감싸고 있다가 7.1 소스 기준 다음처럼 분기한다.

```text
AuthenticationException
또는 AccessDeniedException이면서 현재 인증이 익명이나 Remember-Me
  -> Context 비움 -> RequestCache에 원래 요청 저장 -> AuthenticationEntryPoint
그 밖의 AccessDeniedException
  -> AccessDeniedHandler
```

- 익명 사용자의 거부는 `403`이 아니라 Login Redirect나 `401`이 된다. JSON Chain도 같은 분기로 익명은 `401`, 권한 부족은 `403`을 받는다.
- Remember-Me 사용자가 `fullyAuthenticated` 경로에서 거부되면 `InsufficientAuthenticationException`으로 바뀌어 다시 Login하게 된다. 고위험 작업의 재인증 요구가 이 경로로 집행된다.
- 기본 `HttpSessionRequestCache`는 원래 요청을 `SavedRequest`로 Session에 두고, Login 성공 뒤 `RequestCacheAwareFilter`와 성공 Handler가 꺼내 원래 URL로 보낸다. Open Redirect 주의는 [[Spring-Security-Authentication-Endpoints|인증 Endpoint]]에 둔다.

## Role과 Authority

Role Hierarchy는 상위 Role에 하위 Authority를 부여하는 편의 구조다. 방향과 Cycle을 검증하고 실제 확장된 Authority를 Test한다. Tenant, Resource 소유권과 금액 한도까지 Role 조합으로 만들면 Role Explosion이 생기므로 [[Access-Control-Models|ABAC/PBAC 조건]]과 결합한다.

기본 인가는 Authority를 문자열로만 비교하므로 계층이 없으면 `ROLE_ADMIN` 사용자도 `ROLE_USER` 자원에 접근하지 못해 하위 Role을 모두 직접 부여해야 한다. 계층은 `ROLE_ADMIN > ROLE_MANAGER`처럼 한 줄에 관계 하나를 적는 형식이며, 현재는 `RoleHierarchyImpl.fromHierarchy(String)`나 `RoleHierarchyImpl.withDefaultRolePrefix().role("ADMIN").implies("MANAGER")` Builder로 만들어 `RoleHierarchy` Bean으로 등록한다. 공식 문서 기준 이 Bean은 `authorizeHttpRequests`, `@Secured`와 JSR-250에 적용되고, pre-post 표현식은 `MethodSecurityExpressionHandler`에도 같은 계층을 설정한다.

계층을 정의만 하고 결정 계층이 쓰지 않으면 오류 없이 무시된다. Legacy 실습에서도 `RoleHierarchyVoter`를 Voter 목록에 넣기 전에는 `ROLE_ADMIN`만 가진 사용자가 하위 자원에 접근하지 못했다. `RoleHierarchyVoter`는 deprecated이며 `AuthorityAuthorizationManager.setRoleHierarchy`가 대체한다. Legacy 구현은 `role_hierarchy` 표의 부모와 자식 이름을 이 형식으로 조립해 기동 때 `setHierarchy`로 주입했지만, 7.0부터 `RoleHierarchyImpl`은 불변 객체라 그 방식이 없다. DB 계층을 운영 중에 바꾸려면 검증한 새 `RoleHierarchyImpl`로 참조를 원자적으로 교체하는 `RoleHierarchy` 구현을 두고 반영 시점은 [[Spring-Security-Dynamic-Policy|동적 정책]]의 Snapshot 교체 원칙을 따른다.

`GrantedAuthority`는 Application 전역 Permission에 적합하다. 개별 주문 ID마다 Authority를 만들기보다 요청 Resource를 불러온 뒤 Principal, Action과 Resource 관계를 Policy Service가 판단한다.

## Method Security

`@EnableMethodSecurity`로 Method Security를 켜고 `@PreAuthorize`를 기본 선택으로 사용한다.

- `@PreAuthorize`: Method 실행 전 Argument와 Principal을 검사
- `@PostAuthorize`: 반환값을 포함해 실행 후 검사
- `@PreFilter`, `@PostFilter`: Collection 요소를 걸러내지만 큰 데이터는 Query 단계에서 제한하는 편이 낫다.
- `@Secured`: Legacy Option이며 `@PreAuthorize`가 권장된다.
- `@RolesAllowed`: JSR-250 지원을 명시적으로 켰을 때 사용한다.

상태를 변경하는 Method를 `@PostAuthorize`만으로 보호하면 거부 전에 Side Effect가 이미 발생할 수 있다. Write는 실행 전 검사하고, 반환 객체 검사는 보조층으로 사용한다.

Method Security는 Proxy와 Advisor를 사용한다. Proxy를 거치지 않는 자기 호출, 직접 생성한 객체와 비 Spring Bean 경로가 보호되는지 Test한다. HTTP Controller만 막지 말고 Queue Consumer, Scheduler와 내부 Service 진입점에도 같은 Policy를 적용한다.

활성화 누락은 오류 없이 무보호로 끝난다. `@EnableMethodSecurity`는 `prePostEnabled`만 기본 true이고 `securedEnabled`와 `jsr250Enabled`는 기본 false다. Legacy `@EnableGlobalMethodSecurity`는 세 속성이 모두 기본 false라 실습에서도 `prePostEnabled`를 켜기 전에는 `@PreAuthorize`가 검사되지 않았다(어떤 원천도 켜지 않으면 기동 때 `IllegalStateException`). 지금도 `@Secured`나 `@RolesAllowed`만 붙이고 해당 속성을 켜지 않으면 조용히 무시되므로, 보호할 Method를 권한 없는 Principal로 호출해 거부되는지 Test한다.

`@PreAuthorize("hasRole('USER') and #account.username == authentication.name")`처럼 Argument와 Principal을 비교하면 Service 진입 전에 소유권을 검사할 수 있다. URL 인가를 통과한 요청이 Service Proxy를 부르면 Method Interceptor가 권한 정보를 결정 계층에 넘기고, 허용이면 실제 Method를 호출하고 거부면 `AccessDeniedException`을 던진다. 보호 대상은 Bean을 만들 때 Proxy 적용 여부로 정해지므로 DB 정책으로 대상을 늘리는 문제는 [[Spring-Security-Dynamic-Policy-Legacy|Legacy 동적 인가 구현]]에서 다룬다.

## Legacy 결정 결합 읽기

7.0부터 `AccessDecisionManager`, Voter, `SecurityMetadataSource`와 보안 Interceptor 같은 deprecated Access API는 `spring-security-access` Legacy Module로 옮겨져, 쓰려면 이 의존성을 추가해야 한다. Legacy 인가는 세 입력으로 결정한다. 현재 `Authentication`, 보호 대상(URL은 `FilterInvocation`, Method는 `MethodInvocation`), `SecurityMetadataSource`가 대상에 매핑한 `ConfigAttribute` 목록이다. `FilterSecurityInterceptor`와 `MethodSecurityInterceptor`는 같은 `AbstractSecurityInterceptor`를 상속해 `AccessDecisionManager.decide`에 위임하고, 각 Voter는 `ACCESS_GRANTED`(1), `ACCESS_ABSTAIN`(0), `ACCESS_DENIED`(-1) 중 하나를 낸다.

| Manager | 결정 | 기본값 |
|---|---|---|
| `AffirmativeBased` | Grant가 한 표라도 있으면 허용, Grant 없이 Deny가 있으면 거부 | 모두 기권이면 거부 |
| `ConsensusBased` | 기권을 뺀 다수결 | 동수면 허용(`allowIfEqualGrantedDeniedDecisions=true`), 모두 기권이면 거부 |
| `UnanimousBased` | Deny가 한 표라도 있으면 즉시 거부, Grant가 있어야 허용 | 모두 기권이면 거부 |

모두 기권일 때의 거부는 `allowIfAllAbstainDecisions=false` 기본값에서 나온다. 반면 대상에 매핑된 권한 목록이 비면 Interceptor가 Voter를 부르지 않고 공개 호출로 통과시킨다(`rejectPublicInvocations=false`). Affirmative는 Permit-overrides, Unanimous는 Deny-overrides에 가깝고 Consensus의 동수 허용은 fail-open 기본값이다([[Access-Control-Models|결합 알고리즘]]). DB 정책과 IP Voter에서 이 규칙이 만든 실패는 [[Spring-Security-Dynamic-Policy-Legacy|Legacy 동적 인가 구현]]에 둔다.

## NestJS로 번역

| Spring Security | NestJS |
|---|---|
| `AuthorizationFilter` | Global 또는 Route Guard |
| `AuthorizationManager` | Typed `PolicyService.can(principal, action, resource)` |
| `@PreAuthorize` | Custom Decorator Metadata와 Guard |
| Method AOP 보안 | Service 안의 명시적 Policy 호출 |
| `ExceptionTranslationFilter` | Guard Exception과 Global Exception Filter |

Nest Guard는 HTTP Handler 실행 전에는 강하지만 Service Method, Batch와 Queue 호출을 자동 보호하지 않는다. Controller Guard는 coarse-grained gate로, Domain Service의 Policy Check는 Resource 소유권과 Tenant 같은 fine-grained gate로 둔다.

## Test

- Anonymous, Remember-Me, Fully Authenticated Principal을 구분한다.
- Permit뿐 아니라 Deny, Policy 없음과 평가 오류를 검증한다.
- Handler와 Class Metadata의 Override/Merge 규칙을 Test한다.
- 같은 Service를 HTTP, Queue와 Scheduler에서 호출해 우회가 없는지 확인한다.
- 401 응답에는 적용 가능한 인증 Challenge, 403에는 Credential 재입력을 유도하지 않는 오류를 준다.

## 출처

- 정수원 강사, [11) 권한설정과 표현식](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29837)
- 정수원 강사, [12) 예외 처리 및 요청 캐시 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=30693)
- 정수원 강사, [9) 인가 개념 및 필터 이해](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=31606)
- 정수원 강사, [10) 인가 결정 심의자](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29849)
- 정수원 강사, [11) 인증 거부 처리 - Access Denied](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29863)
- 정수원 강사, [1) 스프링 시큐리티 인가 개요](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29874)
- 정수원 강사, [8) 계층 권한 적용하기](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29881)
- 정수원 강사, [1) Method 방식 개요](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29883)
- 정수원 강사, [3) Annotation 권한 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29885)
- 정수원 강사, [2) AOP Method 기반 DB 연동 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=35392)
- 정수원 강사, [8) 익명사용자 인증 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29833)
- 정수원 강사, [5) Ajax 인증과 인가 예외 처리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29870)
- 정수원 강사, [7) 로그아웃 및 인증에 따른 화면 보안 처리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29859)
- 정수원 강사, [3) 웹 기반 DB 인가 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=34076)
- 정수원 강사, [2) 관리자 시스템 권한 Domain, Service와 Repository](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29876)
- 정수원 강사, [5) MapBasedSecurityMetadataSource 2](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29886)
- [Spring Security 7.1, Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
- [Spring Security 7.1, Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)
- [Spring Security 7.1, Method Security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html)
- [Spring Security 7.1, Authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/index.html)
- [Spring Security 7.1 API, AuthorizationManagers](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/authorization/AuthorizationManagers.html)
- [Spring Security 7.1 API, ExceptionTranslationFilter](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/access/ExceptionTranslationFilter.html)
- [Spring Security 7.1 API, IpAddressAuthorizationManager](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/web/access/IpAddressAuthorizationManager.html)
- [Spring Security 7.1 API, RoleHierarchyImpl](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/hierarchicalroles/RoleHierarchyImpl.html)
- [Spring Security 7.1 API, EnableMethodSecurity](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/config/annotation/method/configuration/EnableMethodSecurity.html)
- [Spring Security 7.1 API, ConsensusBased](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/vote/ConsensusBased.html)
- [Spring Security 7.1 API, AbstractSecurityInterceptor](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/access/intercept/AbstractSecurityInterceptor.html)
- [Spring Security 7.0, What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- [RequestMatcherDelegatingAuthorizationManager.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/web/src/main/java/org/springframework/security/web/access/intercept/RequestMatcherDelegatingAuthorizationManager.java)
- [AuthorizationFilter.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/web/src/main/java/org/springframework/security/web/access/intercept/AuthorizationFilter.java)
- [AuthorizationManagers.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/core/src/main/java/org/springframework/security/authorization/AuthorizationManagers.java)

## 관련 문서

- [[Access-Control-Models|RBAC, ABAC와 PBAC]]
- [[IDOR|Resource 단위 인가]]
- [[Spring-Security-Dynamic-Policy|DB 기반 동적 정책]]
- [[Spring-Security-Dynamic-Policy-Legacy|Legacy 동적 인가 구현]]
- [[NestJS-Guards-Patterns|NestJS Role Guard]]
