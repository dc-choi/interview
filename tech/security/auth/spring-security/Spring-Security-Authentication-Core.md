---
tags: [security, spring-security, authentication, security-context]
status: done
verified_at: 2026-08-04
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

## Password 저장

- 평문이나 빠른 일반 Hash를 저장하지 않는다. Algorithm 선택은 [[Password-Hashing]]을 따른다.
- `DelegatingPasswordEncoder`는 `{id}encodedPassword` 형식으로 여러 Encoding을 검증하고 이후 Algorithm Upgrade 경로를 제공한다.
- Work Factor는 운영 환경에서 한 번 검증에 걸리는 시간을 측정해 조정하고 Login Rate Limit을 함께 적용한다.
- TypeORM Entity 조회에서 Password Hash를 기본 Projection에서 제외하고 인증 Use Case에서만 명시적으로 가져온다.
- 인증 성공 뒤 반환 Principal에 Password Hash를 포함하지 않는다.

## SecurityContext의 수명

기본 `SecurityContextHolder` 전략은 `ThreadLocal`이다. `FilterChainProxy`가 요청 종료 시 반드시 비워 Thread Pool의 다음 요청으로 Principal이 새지 않게 한다. 새 Thread나 비동기 작업에는 Context가 자동으로 안전하게 전파된다고 가정하지 않는다.

현재 기본 구조는 `SecurityContextHolderFilter`가 `SecurityContextRepository`에서 Context를 읽는다. Custom Filter나 Controller가 직접 인증을 설치하고 다음 요청에도 유지하려면 Repository에 명시적으로 저장해야 한다. 강의의 `SecurityContextPersistenceFilter` 자동 저장 흐름은 Legacy 동작으로 읽는다.

## Anonymous Authentication

`AnonymousAuthenticationFilter`는 Context가 비어 있을 때 Framework 내부 판단을 단순화하려고 Anonymous Token을 넣을 수 있다. 이것은 실제 Login 성공이 아니며 Servlet API의 Principal은 여전히 null일 수 있다. Public 정책은 `permitAll`로 선언하고 익명 Token의 `isAuthenticated` 값만으로 보호 Resource를 허용하지 않는다.

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
- [Spring Security 7.1, Servlet Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
- [Spring Security 7.1, Form Login](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html)
- [Spring Security 7.1, Authentication Persistence](https://docs.spring.io/spring-security/reference/servlet/authentication/persistence.html)
- [Spring Security 7.1, Password Storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)

## 관련 문서

- [[Password-Hashing|Password Hashing]]
- [[Spring-Security-Authentication-Endpoints|인증 Endpoint와 Handler]]
- [[Spring-Security-Session-and-CSRF|인증 Context 지속]]
- [[NestJS-Guards-Patterns|NestJS AuthGuard와 Passport]]
