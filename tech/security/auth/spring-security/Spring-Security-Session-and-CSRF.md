---
tags: [security, spring-security, session, csrf, remember-me]
status: done
verified_at: 2026-08-04
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

## Remember Me의 보안 의미

Remember-Me Cookie는 Session이 끝난 뒤에도 사용자를 복원할 수 있는 장기 Credential이다. 탈취 Window가 길어지므로 짧은 수명, Secure/HttpOnly/SameSite, Server 측 Token 폐기와 Rotation을 적용한다. 결제, Password 변경과 개인정보 Export 같은 고위험 작업은 Remember-Me 인증만으로 허용하지 않고 재인증한다.

## CSRF

Browser가 Session Cookie나 다른 Credential을 자동 첨부하면 공격자가 피해자 Browser로 상태 변경 요청을 보낼 수 있다. Token은 Browser가 자동으로 넣지 않는 Form Field나 Header로 함께 제출하고 Server가 기대값과 비교한다.

Spring Security Servlet의 CSRF 보호는 기본 활성화된다. 현재 Reference는 Token을 필요할 때까지 지연 Load하고 매 요청 난수를 섞어 BREACH 위험을 줄인다. SPA가 Cookie 인증을 사용한다면 Cookie Repository와 Request Handler 계약을 공식 SPA 지침에 맞춘다.

`REST API라서`라는 이유만으로 CSRF를 끄지 않는다. `Authorization` Header의 Bearer Token만 사용하고 Browser가 Credential을 자동 제출하지 않는다는 조건을 검증한 뒤 적용 범위를 결정한다. HTTP Basic이나 Cookie에 담은 JWT도 Browser 자동 전송 특성 때문에 CSRF 표면이 생길 수 있다.

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
- 정수원 강사, [7) 로그아웃 및 인증에 따른 화면 보안 처리](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29859)
- 정수원 강사, [13) CSRF와 CsrfFilter](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=31605)
- 정수원 강사, [7) Ajax 로그인 구현과 CSRF 설정](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29872)
- [Spring Security 7.1, Authentication Persistence and Session Management](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
- [Spring Security 7.1, Remember-Me Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/rememberme.html)
- [Spring Security 7.1, Handling Logouts](https://docs.spring.io/spring-security/reference/servlet/authentication/logout.html)
- [Spring Security 7.1, CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)

## 관련 문서

- [[Session|Session과 Session Hijacking]]
- [[Cookie|Cookie 보안 속성]]
- [[CSRF|CSRF 방어]]
- [[Auth-Method-Selection|인증 방식 선택]]
