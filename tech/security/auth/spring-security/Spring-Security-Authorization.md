---
tags: [security, spring-security, authorization, method-security]
status: done
verified_at: 2026-08-04
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

## 규칙 설계

- `permitAll`: 인증과 무관하게 공개
- `denyAll`: 조건과 무관하게 거부
- `hasAuthority`: 정확한 Authority 문자열 요구
- `hasRole`: 기본 Prefix를 적용하는 `hasAuthority` Shortcut
- `access`: Domain 조건을 평가하는 Custom `AuthorizationManager`

Matcher 규칙은 구체적인 경로부터 배치하고 마지막에 `anyRequest().denyAll()` 또는 `authenticated()` 같은 명시적 기본값을 둔다. Public Endpoint도 `web.ignoring`보다 `permitAll`을 우선해 Security Header와 Firewall을 유지한다.

## 401, 403과 예외 번역

| 상태 | 처리 |
|---|---|
| 유효한 인증이 없음 | `AuthenticationEntryPoint`가 Login Redirect 또는 `401`과 Challenge 생성 |
| 인증됐지만 정책이 거부 | `AccessDeniedHandler`가 `403` 생성 |
| Credential 제출 자체가 실패 | 인증 Filter의 `AuthenticationFailureHandler` |

`ExceptionTranslationFilter`는 `AuthenticationException`과 `AccessDeniedException`을 UI나 HTTP 응답으로 바꾸는 Bridge다. 인가 판단 자체를 하지 않으며, API에서 익명 요청을 Login HTML로 Redirect하지 않도록 Entry Point를 분리한다.

## Role과 Authority

Role Hierarchy는 상위 Role에 하위 Authority를 부여하는 편의 구조다. 방향과 Cycle을 검증하고 실제 확장된 Authority를 Test한다. Tenant, Resource 소유권과 금액 한도까지 Role 조합으로 만들면 Role Explosion이 생기므로 [[Access-Control-Models|ABAC/PBAC 조건]]과 결합한다.

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
- [Spring Security 7.1, Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
- [Spring Security 7.1, Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)
- [Spring Security 7.1, Method Security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html)

## 관련 문서

- [[Access-Control-Models|RBAC, ABAC와 PBAC]]
- [[IDOR|Resource 단위 인가]]
- [[Spring-Security-Dynamic-Policy|DB 기반 동적 정책]]
- [[NestJS-Guards-Patterns|NestJS Role Guard]]
