---
tags: [security, spring-security, authentication, security-context]
status: done
verified_at: 2026-10-01
category: "Security - 인증"
aliases: ["Spring Security Authentication", "Spring Security 인증"]
---

# Spring Security 인증 핵심 구조

Spring Security 인증은 자격증명을 담은 미인증 `Authentication`을 적절한 Provider에 전달하고, 검증된 Principal과 Authority를 담은 인증 결과를 요청 Context에 설치하는 과정이다.

## 핵심 객체

| 객체 | 책임 |
|---|---|
| `Authentication` | 인증 입력 또는 현재 인증된 Principal 표현 |
| `SecurityContext` | 현재 `Authentication` 보관 |
| `SecurityContextHolder` | 현재 실행 Context에서 `SecurityContext` 접근 |
| `AuthenticationManager` | 인증 API 경계 |
| `ProviderManager` | 지원 가능한 `AuthenticationProvider`에 위임 |
| `AuthenticationProvider` | Password, JWT, SAML 같은 한 인증 유형 검증 |
| `GrantedAuthority` | Application 전체 범위의 Role, Scope와 Permission |

`Authentication` 입력의 `principal`과 `credentials`는 아직 검증되지 않았다. 성공 결과는 검증된 Principal과 Authority를 담고, Password 같은 민감한 Credential은 가능한 한 빨리 지운다. `isAuthenticated` Boolean 하나만 신뢰해 임의 Token을 인증 완료로 만들지 않는다.

## Username과 Password 흐름

```text
UsernamePasswordAuthenticationFilter
  -> unauthenticated Authentication
  -> AuthenticationManager
  -> ProviderManager
  -> DaoAuthenticationProvider
  -> UserDetailsService + PasswordEncoder
  -> authenticated Authentication
  -> SecurityContext
```

`UsernamePasswordAuthenticationFilter`는 Login 요청에서 자격증명을 읽어 Token을 만든다. `ProviderManager`는 해당 Token 유형을 지원하는 Provider를 선택한다. `DaoAuthenticationProvider`는 `UserDetailsService`로 계정을 찾고 `PasswordEncoder`로 Password를 검증한다.

계정 없음과 Password 불일치 응답을 지나치게 구분하면 Account Enumeration을 돕는다. 외부 응답은 일관되게 하고 상세 원인은 접근 통제된 Audit Log와 Metric에 남긴다.

## ProviderManager의 Provider 선택

`AuthenticationProvider` 계약은 두 Method다. `supports(Class)`는 이 Token 유형을 처리할 수 있는지, `authenticate(Authentication)`는 실제 검증을 맡는다. `ProviderManager`는 직접 검증하지 않고 7.1 기준 다음 규칙으로 위임한다.

1. `supports`가 false인 Provider는 건너뛴다. Provider가 null을 반환하면 판단 보류로 보고 다음 Provider로 넘어가며, 처음 나온 non-null 결과가 성공 결과다.
2. `AuthenticationException`은 기록하고 다음 Provider를 시도한다. 계정 상태 예외(`AccountStatusException`)와 내부 오류(`InternalAuthenticationServiceException`)만 즉시 중단하며 parent에도 넘기지 않는다.
3. 이 Manager에서 성공 결과가 없으면 parent `AuthenticationManager`를 시도한다. 지원 Provider가 없거나 null만 나온 경우뿐 아니라 일반 `AuthenticationException`으로 거부된 경우도 포함하며, parent가 성공하면 앞의 예외는 버려진다. parent도 실패하면 마지막으로 기록된 예외를 던지고(parent의 `ProviderNotFoundException`은 무시), 기록된 예외가 하나도 없을 때만 `ProviderNotFoundException`으로 실패한다.

공식 문서는 parent를 여러 `SecurityFilterChain`이 공통 인증을 공유하면서 Chain별 인증 방식을 달리하는 구조로 설명한다. 기본 구성도 이 형태다. `HttpSecurity`의 Manager에는 `AnonymousAuthenticationProvider`가, parent인 전역 Manager에는 `DaoAuthenticationProvider`가 있어 Form Login Token은 parent에서 처리된다. 전역 Dao Provider는 전역 Manager가 달리 구성되지 않았고 `UserDetailsService` Bean이 하나일 때만 자동 구성된다. `AuthenticationProvider` Bean을 하나 등록하면 그 Provider가 대신 쓰이고 `UserDetailsService` Bean은 경고 로그와 함께 자동 구성에서 빠진다. JSON Login용 Custom Token처럼 새 Token 유형을 만들고 이를 `supports`하는 Provider를 등록하지 않으면, 검증 로직이 같아도 처리할 Provider가 없어 인증이 실패한다.

`DaoAuthenticationProvider`는 `UserDetailsService.loadUserByUsername`으로 계정을 찾고(`UsernameNotFoundException`) `PasswordEncoder.matches`가 실패하면 `BadCredentialsException`을 던진다. 계정 상태 검사까지 통과하면 `UsernamePasswordAuthenticationToken.authenticated(principal, credentials, authorities)`로 인증 완료 Token을 만들고, `ProviderManager`는 기본값(`eraseCredentialsAfterAuthentication=true`)으로 Credential을 지운다. 예외는 인증을 시작한 Filter가 받아 `AuthenticationFailureHandler`로 넘기고, 성공 결과는 Filter가 Context에 저장한 뒤 `AuthenticationSuccessHandler`를 호출한다.

Provider를 직접 구현하면 Built-in 보호가 빠질 수 있다. `AbstractUserDetailsAuthenticationProvider`는 `hideUserNotFoundExceptions` 기본값 true로 계정 없음도 `BadCredentialsException`으로 바꾸고, `DaoAuthenticationProvider`는 계정이 없을 때도 더미 Hash와 비교해 응답 시간 차이를 줄인다. Custom Provider는 두 동작을 다시 구현하거나 Built-in Provider를 확장해 위의 Account Enumeration 원칙을 지킨다.

## Password 저장

- 평문이나 빠른 일반 Hash를 저장하지 않는다. Algorithm 선택은 [[Password-Hashing]]을 따른다.
- `DelegatingPasswordEncoder`는 `{id}encodedPassword` 형식으로 여러 Encoding을 검증하고 이후 Algorithm Upgrade 경로를 제공한다.
- Work Factor는 운영 환경에서 한 번 검증에 걸리는 시간을 측정해 조정하고 Login Rate Limit을 함께 적용한다.
- TypeORM Entity 조회에서 Password Hash를 기본 Projection에서 제외하고 인증 Use Case에서만 명시적으로 가져온다.
- 인증 성공 뒤 반환 Principal에 Password Hash를 포함하지 않는다.

## SecurityContext의 수명

기본 `SecurityContextHolder` 전략은 `ThreadLocal`이다. `FilterChainProxy`가 요청 종료 시 반드시 비워 Thread Pool의 다음 요청으로 Principal이 새지 않게 한다. 새 Thread나 비동기 작업에는 Context가 자동으로 안전하게 전파된다고 가정하지 않는다.

사용자 객체는 `Authentication`에, `Authentication`은 `SecurityContext`에 담기고, `SecurityContextHolder`가 Context의 보관 전략을 관리한다. 같은 실행 Context 안에서는 어디서든 `SecurityContextHolder.getContext().getAuthentication()`으로 현재 인증을 읽는다.

| 전략 | 보관 범위 | 용도 |
|---|---|---|
| `MODE_THREADLOCAL` | Thread마다 독립 | 기본값, Server에 적합 |
| `MODE_INHERITABLETHREADLOCAL` | 자식 Thread 생성 시점에 부모 Context 복사 | 요청 Thread가 직접 만든 Thread |
| `MODE_GLOBAL` | JVM 전체에 Context 하나 | Swing 같은 Standalone Client, Server에는 부적합 |

전략은 JVM 전역 설정이며 `spring.security.strategy` System Property나 사용 전 `SecurityContextHolder.setStrategyName(...)` 호출로 정한다. Legacy 실습에서 기본 전략의 요청 Thread가 만든 자식 Thread는 인증 객체를 읽지 못했고, `MODE_INHERITABLETHREADLOCAL`로 바꾸자 읽었다. 하지만 복사는 Thread 생성 시점에 한 번만 일어나므로 재사용되는 Thread Pool에서는 작업마다 전파되지 않고, 처음 Thread를 만든 요청의 Context가 다른 작업에 남을 수 있다([[Java-ThreadLocal-and-Request-Context|ThreadLocal 전파 경계]]). Executor와 비동기 작업에는 실행 전 Context를 설정하고 끝나면 비우는 `DelegatingSecurityContextRunnable`, `DelegatingSecurityContextExecutor` 같은 공식 Concurrency 통합을 우선한다.

현재 기본 구조는 `SecurityContextHolderFilter`가 `SecurityContextRepository`에서 Context를 읽는다. 인증 Filter는 성공 시 결과를 Context에 넣고 Repository(기본 Session)에 저장해 다음 요청이 읽게 하고, 실패 시 Context를 비운다. Custom Filter나 Controller가 직접 인증을 설치하고 다음 요청에도 유지하려면 Repository에 명시적으로 저장해야 한다. 강의의 `SecurityContextPersistenceFilter` 자동 저장 흐름은 Legacy 동작으로 읽는다.

## Anonymous Authentication

`AnonymousAuthenticationFilter`는 Context가 비어 있을 때 Framework 내부 판단을 단순화하려고 Anonymous Token을 넣을 수 있다. 이것은 실제 Login 성공이 아니며 Servlet API의 Principal은 여전히 null일 수 있다. Public 정책은 `permitAll`로 선언하고 익명 Token의 `isAuthenticated` 값만으로 보호 Resource를 허용하지 않는다.

기본 익명 Token은 Principal `anonymousUser`와 Authority `ROLE_ANONYMOUS`를 가진다. Legacy `AbstractSecurityInterceptor`는 권한 속성이 붙은 자원에서 인증 객체가 없으면 `AuthenticationCredentialsNotFoundException`을 던졌으므로 `permitAll` 자원에도 익명 Token이 필요했다. 현재 `AuthorizationFilter`는 인증 객체를 필요할 때만 조회해 `permitAll`과 `denyAll`에서는 읽지 않고, 읽었는데 없으면 같은 예외를 던진다. 익명 Context는 `HttpSessionSecurityContextRepository`가 Session에 저장하지 않는다. `AuthenticationTrustResolver`가 익명과 Remember-Me Token을 구분하며, 인가 거부를 Login 유도로 바꾸는 경로는 [[Spring-Security-Authorization|인가 문서]]에 둔다.

## NestJS와 TypeORM으로 번역

| Spring Security | NestJS/TypeORM |
|---|---|
| Authentication Filter | `AuthGuard('local')`, `AuthGuard('jwt')` 또는 Custom Guard |
| `AuthenticationProvider` | Passport Strategy와 Domain `AuthService` |
| `UserDetailsService` | TypeORM Repository를 사용하는 Account 조회 Port |
| `SecurityContextHolder` | `request.user`와 typed `@CurrentUser()` |
| `GrantedAuthority` | Principal의 좁은 Role/Permission Claim, 필요 시 DB 정책 조회 |

NestJS에서 인증 결과는 작은 Principal로 정규화한다. Controller와 Guard가 TypeORM Entity 전체를 공유하지 않고 `userId`, Tenant, Authentication Method와 필요한 Authority만 전달한다. Background Job과 Queue Consumer는 HTTP Guard를 통과하지 않으므로 별도 Authentication과 Policy 경계를 둔다.

## 출처

- 정수원 강사, [3) Form Login 인증](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29831)
- 정수원 강사, [4) Form Login 인증 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=30315)
- 정수원 강사, [3) 인증 개념 이해 - Authentication](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29919)
- 정수원 강사, [4) 인증 저장소 - SecurityContextHolder, SecurityContext](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29842)
- 정수원 강사, [5) 인증 저장소 필터 - SecurityContextPersistenceFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29843)
- 정수원 강사, [6) 인증 흐름 이해](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29845)
- 정수원 강사, [7) 인증 관리자 - AuthenticationManager](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=31716)
- 정수원 강사, [8) 인증 처리자 - AuthenticationProvider](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29846)
- 정수원 강사, [3) 사용자 DB 등록 및 PasswordEncoder](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29855)
- 정수원 강사, [4) DB 연동 인증 처리 - CustomUserDetailsService](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29856)
- 정수원 강사, [5) DB 연동 인증 처리 - CustomAuthenticationProvider](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=32763)
- 정수원 강사, [8) 익명사용자 인증 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29833)
- 정수원 강사, [3) 인증 처리자 - AjaxAuthenticationProvider](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29868)
- [Spring Security 7.1, Servlet Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
- [Spring Security 7.1, Concurrency Support](https://docs.spring.io/spring-security/reference/servlet/integrations/concurrency.html)
- [Spring Security 7.1, Anonymous Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/anonymous.html)
- [Spring Security 7.1 API, SecurityContextHolder](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/core/context/SecurityContextHolder.html)
- [Spring Security 7.1 API, ProviderManager](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/authentication/ProviderManager.html)
- [ProviderManager.java 7.1.1 — spring-security GitHub](https://github.com/spring-projects/spring-security/blob/7.1.1/core/src/main/java/org/springframework/security/authentication/ProviderManager.java)
- [Spring Security 7.1 API, AbstractUserDetailsAuthenticationProvider](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/authentication/dao/AbstractUserDetailsAuthenticationProvider.html)
- [Spring Security 7.1, Form Login](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html)
- [Spring Security 7.1, Authentication Persistence](https://docs.spring.io/spring-security/reference/servlet/authentication/persistence.html)
- [Spring Security 7.1, Password Storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)

## 관련 문서

- [[Password-Hashing|Password Hashing]]
- [[Spring-Security-Authentication-Endpoints|인증 Endpoint와 Handler]]
- [[Spring-Security-Session-and-CSRF|인증 Context 지속]]
- [[NestJS-Guards-Patterns|NestJS AuthGuard와 Passport]]
