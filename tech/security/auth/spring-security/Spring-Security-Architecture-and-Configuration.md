---
tags: [security, spring-security, servlet, filter-chain]
status: done
verified_at: 2026-08-04
category: "Security - 인증"
aliases: ["Spring Security Architecture", "Spring Security FilterChain"]
---

# Spring Security FilterChain 아키텍처와 설정

Spring Security의 Servlet 지원은 Container Filter와 Spring Bean 사이를 연결하고, 요청마다 하나의 보안 Chain을 골라 인증, 공격 방어와 인가 Filter를 순서대로 실행한다.

## 요청 흐름

```text
Servlet Container FilterChain
  -> DelegatingFilterProxy
  -> FilterChainProxy
  -> first matching SecurityFilterChain
  -> Security Filters
  -> DispatcherServlet
```

- `DelegatingFilterProxy`는 Servlet Container가 관리하는 Filter 호출을 Spring Bean에 위임한다.
- `FilterChainProxy`는 Spring Security의 중앙 진입점이다. `SecurityContext` 정리, `HttpFirewall` 적용과 Chain 선택을 담당한다.
- `SecurityFilterChain`은 `RequestMatcher` 하나와 적용할 Security Filter 목록을 가진다.
- 여러 Chain이 맞아도 처음 일치한 Chain 하나만 실행한다. 좁은 범위를 먼저 두고 마지막에 빠짐없는 fallback Chain을 둔다.
- 인증 Filter는 인가 Filter보다 앞서야 한다. Custom Filter는 필요한 위치를 명시하고 Container에 중복 등록되지 않게 한다.

`securityMatcher`는 이 `SecurityFilterChain`이 담당할 요청 범위를 정한다. Chain 안의 `requestMatchers`는 선택된 요청에 적용할 인가 규칙을 정한다. 둘을 혼동하면 요청이 어떤 Chain에도 들어가지 않거나 예상과 다른 규칙이 적용된다.

## 현재 Java 설정

```java
@Bean
@Order(1)
SecurityFilterChain api(HttpSecurity http) throws Exception {
    http
        .securityMatcher("/api/**")
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

실제 Application은 Browser Session, Resource Server와 관리 Endpoint처럼 보안 요구가 다를 때만 Chain을 나눈다. Chain을 많이 만들기보다 경계, 인증 방식과 상태 정책이 정말 다른지 먼저 확인한다.

## 구형 API를 읽는 법

| 강의와 Legacy API | 현재 기준 |
|---|---|
| `WebSecurityConfigurerAdapter` 상속 | `SecurityFilterChain` Bean 구성 |
| `authorizeRequests` | `authorizeHttpRequests` |
| `antMatchers` | `requestMatchers`와 적절한 `RequestMatcher` |
| `FilterSecurityInterceptor` | 기본 Request 인가는 `AuthorizationFilter` |
| `AccessDecisionManager`, `AccessDecisionVoter` | `AuthorizationManager` |
| `SecurityContextPersistenceFilter` | `SecurityContextHolderFilter`, Custom 인증은 Repository에 명시적 저장 |
| `@EnableGlobalMethodSecurity` | `@EnableMethodSecurity` |
| 정적 Asset `web.ignoring` | 보안 Header를 유지하도록 `permitAll` 우선 |

이 표는 이름만 바꾸라는 뜻이 아니다. 예를 들어 `AuthorizationManager`는 Metadata Source, Config Attribute, Decision Manager와 Voter를 단순 치환한 것이 아니라 판단 API와 Authentication 조회 시점을 재구성한다.

## Filter를 통째로 우회하지 않는다

정적 Asset과 공개 Endpoint도 보통 Chain 안에서 `permitAll`로 허용한다. 그러면 인증 조회는 지연하면서도 Security Header와 Firewall 같은 보호층을 유지할 수 있다. 완전한 ignore는 해당 보호가 필요 없음을 검증한 좁은 범위에만 사용한다.

## NestJS로 번역

| Spring Security | NestJS에서 가까운 책임 |
|---|---|
| Servlet Filter와 `FilterChainProxy` | Middleware 이후 Guard, Interceptor로 이어지는 Request Pipeline |
| `SecurityFilterChain`과 Matcher | Global `APP_GUARD`, Controller/Handler Metadata와 명시적 Public 정책 |
| Authentication Filter | Passport `AuthGuard` 또는 Custom Guard |
| Authorization Filter | Role/Permission/Policy Guard |
| `SecurityContextHolder` | Request의 typed principal, 필요한 경우 제한된 `AsyncLocalStorage` |

두 Framework의 수명주기와 실행 모델은 같지 않다. Java `ThreadLocal`을 Node 전역 변수로 옮기지 않고 `request.user`나 Request-scoped Context를 사용한다. Middleware에는 `ExecutionContext`와 Handler Metadata가 없으므로 Route 인가는 Guard에 둔다.

## 운영 점검

- 시작 시 각 Chain의 Matcher, 순서와 Filter 목록을 관측할 수 있는가?
- 모든 요청이 정확히 한 Chain에 들어가며 fallback이 존재하는가?
- 공개 Endpoint도 Security Header, CSRF와 CORS 정책을 의도대로 거치는가?
- Custom Filter 앞뒤의 인증 Context와 예외 처리 경계를 Test하는가?
- Browser Redirect와 JSON API 401/403 응답 Chain을 분리했는가?

## 출처

- 정수원 강사, [1) 강의소개](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29715)
- 정수원 강사, [2) 실전 프로젝트 예제 미리보기](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=41120)
- 정수원 강사, [1) 프로젝트 구성 및 의존성 추가](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29827)
- 정수원 강사, [2) 사용자 정의 보안 기능 구현](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=34819)
- 정수원 강사, [1) 위임 필터 및 필터 빈 초기화](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29840)
- 정수원 강사, [2) 필터 초기화와 다중 보안 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29841)
- 정수원 강사, [11) 스프링 시큐리티 필터 및 아키텍처 정리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29850)
- 정수원 강사, [1) 실전 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29852)
- 정수원 강사, [2) 정적 자원 관리 - WebIgnore 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29853)
- 정수원 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29906)
- [Spring Security 7.1, Servlet Architecture](https://docs.spring.io/spring-security/reference/servlet/architecture.html)
- [Spring Security 7.1, Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)

## 관련 문서

- [[Spring-Security-Authentication-Core|Spring Security 인증 구조]]
- [[Spring-Security-Authorization|Spring Security 인가]]
- [[NestJS-Guards-Basics|NestJS Guard Pipeline]]
- [[NestJS-Middleware|NestJS Middleware]]
