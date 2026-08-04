---
tags: [spring, mvc, authentication, cookie, session, security]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Session Authentication", "Spring MVC 세션 로그인"]
---

# Spring MVC Cookie와 Session 로그인

Login은 credential을 확인해 principal을 session에 연결하고 이후 요청에서 그 principal을 복원하는 보안 흐름이다. Cookie에 사용자 ID를 그대로 넣는 실습은 취약성을 보여 주는 단계일 뿐 production 인증 방식이 아니다.

## 계층과 흐름

```text
POST /login
  -> form validation
  -> credential verification
  -> session ID rotation/create
  -> principal reference 저장
  -> Cookie 발급
  -> allowlisted destination으로 redirect
```

Domain/account layer는 web Cookie/Session API에 의존하지 않고 credential 검증과 account 상태를 다룬다. Controller/security adapter가 form, session과 redirect를 맡는다. Password는 검증된 password hashing algorithm과 parameter 정책으로 저장/검증하며 평문/단순 hash를 쓰지 않는다.

## Client Cookie에 identity를 직접 넣지 않는다

`memberId=1` 같은 Cookie만 보고 로그인 사용자를 정하면 client가 값을 바꿔 다른 사용자로 가장할 수 있다. Signed token을 쓴다고 모든 문제가 사라지는 것도 아니다. 만료, audience/issuer, key rotation, revocation과 browser 보관/CSRF를 설계해야 한다.

Server-side session은 보통 opaque하고 충분히 예측 불가능한 session ID만 Cookie로 전달하고 실제 principal/state는 server store에 둔다. 그러나 ID를 훔치면 공격자가 같은 권한을 사용할 수 있으므로 탈취 문제를 “해결”한 것이 아니다.

## HttpSession 핵심

- `request.getSession()`/`getSession(true)`는 없으면 생성한다.
- 조회만 할 때 `getSession(false)`를 사용해 anonymous request마다 불필요한 session을 만들지 않는다.
- `setAttribute`/`getAttribute`로 최소한의 principal reference를 저장한다.
- Logout/credential compromise에는 `invalidate()`와 관련 token/session 폐기를 수행한다.
- Authentication/권한 상승 직후 session ID를 교체해 fixation을 방지한다.
- `maxInactiveInterval`, last accessed time과 absolute lifetime 요구를 구분한다.

Session attribute의 mutable object는 같은 사용자의 병렬 request에서도 동시 접근할 수 있다. Entity 전체/대용량 graph를 저장하지 않고 stable user ID와 필요한 최소 상태를 둔다.

## Cookie와 session 보안

- HTTPS와 `Secure`, JavaScript 접근이 불필요하면 `HttpOnly`, 목적에 맞는 `SameSite`를 적용한다.
- Domain/Path를 필요한 범위로 좁히고 session ID를 URL에 전달하지 않는다.
- State-changing request는 CSRF token과 Origin/SameSite 정책을 위협 모델에 맞춰 적용한다.
- Session/auth Cookie, password와 token을 log에 남기지 않는다.
- Idle timeout, absolute timeout, logout/revocation과 account security event를 운영 정책으로 둔다.

URL rewriting으로 session ID를 URL에 붙이는 fallback은 log, history와 referrer 유출 위험이 크다. Cookie 기반만 지원한다면 Container의 URL session tracking을 비활성화하고 unsupported client 정책을 명시한다.

## Custom SessionManager의 한계

Map과 UUID로 session create/read/expire를 직접 구현하는 연습은 opaque ID와 server state 원리를 이해하는 데 유용하다. Production에는 다음이 더 필요하다.

- Cryptographically secure identifier와 rotation
- Concurrent access, eviction, idle/absolute expiry
- Multi-instance shared store와 consistency
- Serialization/version migration
- Metrics, cleanup, incident-wide revocation

Servlet `HttpSession`, Spring Session 또는 검증된 security framework를 우선하고 직접 구현을 인증 기반으로 쓰지 않는다.

## Redirect와 접근 제어

미인증 사용자를 login으로 보내고 성공 후 원래 경로로 돌려보낼 수 있다. Return URL은 same-origin relative path allowlist로 제한해 open redirect를 막는다. Login page를 보여 주는 것과 resource authorization은 별개이며 모든 보호 endpoint에서 server-side 정책을 적용한다.

Spring Security는 authentication/session fixation/CSRF/security context/filter chain을 통합한다. 교육용 Controller/Interceptor 로그인 코드를 production security의 완성본으로 보지 않는다.

## 확장

여러 application instance에서는 sticky routing만 의존할지 Spring Session/Redis 같은 외부 store를 사용할지 장애/latency/일관성 기준으로 선택한다. Server session은 모든 request에 DB user query를 없애는 cache가 아니며 권한 변경 반영 전략을 둔다.

## 출처

- [Jakarta Servlet 6.1, HttpSession](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpsession), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Spring Security, session management](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
- Login/session: [요구사항](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83324), [프로젝트/계층](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83325), [home](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83326), [회원 가입](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83327), [credential 확인](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83328), [Cookie login](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83329), [Cookie 보안](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83330), [Session 원리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83331), [SessionManager](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83332), [custom session 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83333), [HttpSession 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83334), [HttpSession 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83335), [정보/timeout](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83336), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83337)

## 관련 문서

- [[Session|HTTP Session]]
- [[Cookie|HTTP Cookie]]
- [[Spring-MVC-Filters-and-Interceptors|Filter와 Interceptor]]
- [[Password-Hashing|Password hashing]]
- [[CSRF|CSRF]]
