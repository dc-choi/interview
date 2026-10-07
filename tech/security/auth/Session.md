---
tags: [security, auth, session, cookie, stateless, session-hijacking]
status: done
verified_at: 2026-10-07
category: "Security - 인증"
aliases: ["Session", "세션", "세션 하이재킹", "Session Hijacking"]
---

# Session — Stateless HTTP 위의 로그인 상태

일정 시간 동안 같은 사용자로부터 들어오는 일련의 요청을 하나의 상태로 보고 그 상태를 유지시키는 기술. HTTP 자체는 상태를 기억하지 않으므로, 로그인 상태는 프로토콜 기능이 아니라 **쿠키와 세션으로 웹 애플리케이션이 만들어낸 논리적 상태**다.

## HTTP는 기억하지 않는다 (Stateless)

HTTP의 Stateless는 각 요청 메시지의 의미를 다른 요청이나 연결 이력 없이 해석할 수 있다는 뜻이다. 서버 애플리케이션이 이전 요청이나 로그인 상태를 저장하지 못한다는 뜻은 아니다. 같은 연결을 쓴다는 이유만으로 같은 사용자라고 가정하지 않고, 요청에 실린 자격증명으로 사용자를 판단한다.

따라서 로그인 상태 유지는 별도 장치가 필요하다 — 그 장치가 세션 ID이고, 보통 쿠키로 전달된다.

## 쿠키 = 클라이언트의 기억, 세션 = 서버의 기억

| 축 | 쿠키 | 세션 |
|---|---|---|
| 저장 위치 | 브라우저 | 서버 (메모리, Redis, DB) |
| 내용 | 세션 ID 같은 이름-값 쌍 | 세션 ID ↔ 사용자 매핑, 상태 정보 |
| 노출 위험 | 클라이언트에 있으므로 탈취 대상 | 브라우저로 직접 전달하지 않지만 서버, 저장소 침해와 로그 노출은 별도로 방어 |

로그인 성공 흐름:

1. 사용자가 아이디, 비밀번호 입력 → 서버가 DB에서 계정 확인
2. 서버가 **예측하기 어려운 긴 세션 ID**를 발급하고, 서버 쪽에 "이 세션 ID는 이 사용자"라는 매핑을 저장
3. `Set-Cookie`로 세션 ID를 클라이언트에 전달
4. 이후 브라우저는 같은 사이트 요청마다 `Cookie` 헤더로 세션 ID를 회신

**로그인 상태 = 브라우저가 가진 쿠키 값과 서버가 가진 세션 정보가 맞아떨어질 때 성립한다.**

user_id 같은 식별자를 쿠키에 직접 담지 않고 추측 불가능한 세션 ID로만 간접 참조한다 — 쿠키 값은 클라이언트가 편집할 수 있기 때문이다. 상세는 [[Cookie]].

## 매 요청의 로그인 판단

서버는 매 요청마다 쿠키를 확인한다. 유효한 세션 ID가 있으면 로그인 사용자로, 없거나 값이 틀리거나 만료됐으면 비로그인으로 처리한다. HTTP는 Stateless지만 웹 서비스는 이 구조로 Stateful처럼 동작한다.

비유: HTTP는 기억력이 없는 배달원이고, 쿠키는 매번 들고 가는 회원증이다. 서버는 회원증 번호로 사용자를 알아본다.

## 세션 하이재킹 — 쿠키 탈취가 위험한 이유

세션 쿠키는 로그인 상태를 증명하는 **열쇠**다. 공격자가 세션 쿠키를 훔치면 아이디, 비밀번호를 몰라도 해당 사용자인 것처럼 요청할 수 있고, 서버는 정상 브라우저의 요청과 탈취 쿠키의 요청을 구분하기 어렵다. 그래서 세션 쿠키 값은 단순 데이터가 아니라 **비밀번호급 민감 정보**로 다뤄야 한다.

### 방어

- **HTTPS 전 구간** — 공공 와이파이 같은 신뢰할 수 없는 네트워크에서 평문 노출 차단
- **쿠키 보안 속성** — `HttpOnly`는 JavaScript의 쿠키 읽기를 막지만 XSS의 인증된 요청 전송까지 막지 않는다. `Secure`로 HTTPS 전송을 제한하고 `SameSite`를 명시한다. `Lax`는 안전한 메서드의 최상위 교차 사이트 이동에 쿠키를 보낼 수 있으므로 [[CSRF]] 방어를 함께 둔다. → 속성 상세는 [[Cookie]]
- **세션 만료 관리** — 유휴 타임아웃과 절대 만료를 서버에서 집행한다. 로그아웃 때 쿠키를 지우는 것과 서버 세션을 무효화하는 것을 함께 처리한다.
- **로그인과 권한 변경 시 세션 ID 재발급** — 세션 고정(session fixation)을 막고 이전 ID를 무효화한다.
- **민감 작업 재인증** — 비밀번호 변경, 결제, 개인정보 조회에서 비밀번호 재확인이나 2단계 인증을 요구하는 이유: 세션 쿠키만으로는 처음 비밀번호를 입력한 실제 사용자와 세션 탈취자를 구분할 수 없기 때문

## 비밀번호 변경과 재인증 상태

로그인한 사용자가 현재 비밀번호를 아는 상태에서 변경하는 흐름과, 비밀번호를 잊어 복구하는 흐름은 구분한다. 일반적인 비밀번호 변경에서는 유효한 세션과 현재 비밀번호 검증이 필요하다. 현재 입력은 [[Password-Hashing|패스워드 해시 검증 함수]]로 확인하며, 새 비밀번호 두 칸이 같다는 사실로 현재 사용자 인증을 대신하지 않는다.

현재 비밀번호 확인과 실제 변경을 두 요청으로 나눌 때는 화면 이동이 아니라 서버가 상태 전이를 집행해야 한다. 다음은 OWASP의 서버 인가, 단계 생략 방지와 제한된 승인 수명 원칙을 적용한 설계 제안이다.

- **변경 대상:** 요청 본문의 사용자 ID를 그대로 신뢰하지 않고 인증된 계정에 변경을 한정한다.
- **확인 상태:** `passwordVerified = true`만 오래 남기지 않는다. 서버에서 계정, 세션, 허용 작업과 확인 시각을 연결하고 짧은 유효기간을 정책으로 정한다. 평문 비밀번호는 이 상태에 저장하지 않는다.
- **최종 요청:** 변경 화면을 열 때뿐 아니라 실제 저장 요청에서도 유효한 세션과 재인증 상태를 검사한다. 쿠키 인증이면 [[CSRF]] 방어도 별도로 적용한다.
- **완료와 재사용:** 성공한 변경의 승인 상태를 소비한다. 로그아웃, 계정 전환과 만료 뒤에는 사용할 수 없게 한다. 중복 요청이 같은 승인을 동시에 소비하지 못하도록 저장과 소비의 원자성도 검토한다.
- **기존 로그인:** 현재 세션 ID 교체와 이전 ID 무효화, 다른 기기 세션의 폐기 범위를 명시한다. 비밀번호 해시 갱신만으로 기존 [[JWT]]가 자동 폐기되지는 않으므로 토큰 폐기 정책도 연결한다.

확인 상태 없이 변경 API를 직접 호출하는 경우, 만료된 확인 상태, 계정 전환, 성공 뒤 재사용과 동시 요청을 점검한다. 승인 상태를 따로 유지할 필요가 없다면 하나의 변경 요청에서 현재 비밀번호를 다시 검증하는 구조도 비교한다.

## 확장성 — 서버가 기억하는 것의 비용

서버가 클라이언트 상태를 유지해야 하므로 사용자 수에 따라 메모리, DB 부하가 증가한다. 다중 서버 환경에서는 어느 서버로 요청이 가도 로그인이 유지되어야 하므로:

- 세션 저장소를 **Redis 같은 외부 저장소로 분리** ([[Load-Balancer|Load Balancer]]의 세션 분산 문제)
- 또는 **[[JWT]]**를 자체 검증해 access 요청의 세션 조회를 줄인다. 즉시 폐기와 refresh token 회전이 필요하면 서버 상태는 여전히 필요하다 (선택 기준은 [[Auth-Method-Selection|인증 방식 선택]]).

## 면접 체크포인트

- Stateless HTTP에서 로그인 상태가 성립하는 구조를 한 문장으로 — 서버가 발급한 세션 ID를 클라이언트가 쿠키로 회신하고 서버가 확인한다
- 쿠키와 세션의 구분 (클라이언트의 기억 vs 서버의 기억)
- 세션 하이재킹의 원리와 방어 조합 (HTTPS, HttpOnly, Secure, SameSite, 만료, ID 재발급)
- 민감 작업에서 비밀번호를 다시 묻는 이유
- 세션 방식의 확장성 한계와 대안 (외부 세션 저장소, JWT)

## 출처

2026-10-07에는 비밀번호 변경과 재인증 절을 아래 OWASP 자료와 대조했다. 상태 필드와 원자적 소비는 이를 적용한 설계 제안이며 특정 프레임워크의 기본 동작을 뜻하지 않는다.

- [OWASP Cheat Sheet Series, Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series, Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

2026-10-02에는 HTTP Stateless의 정의와 세션 수명, 쿠키 방어 범위를 아래 공식 자료로 대조했다. 강의 전체를 다시 검증한 기록은 아니다.

- [IETF, RFC 9110: HTTP Semantics, §3.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.3)
- [OWASP Cheat Sheet Series, Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [HTTP Stateless 로그인 판단 원리 — YouTube 강의](https://www.youtube.com/watch?v=K00xh3zsof0&list=PLXvgR_grOs1DEoZFABFCjo7dsXt1BhVih&index=36)
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)
- [인프런, Spring MVC 세션과 쿠키](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13734)

## 관련 문서

- [[Cookie|Cookie (보안 속성, 쿠키 종류)]]
- [[JWT]]
- [[OAuth2]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Load-Balancer|Load Balancer (세션 분산)]]
- [[Spring-Security-Session-and-CSRF|Spring Security Session과 CSRF]]
