---
tags: [security, auth, session, cookie, stateless, session-hijacking]
status: done
verified_at: 2026-11-19
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

## MFA를 통과한 뒤의 세션 탈취

MFA는 로그인 순간의 인증을 강화한다. 그러나 로그인 결과로 발급된 세션 쿠키를 빼앗기면 서버는 쿠키만 보고 요청을 받는다. 공격 경로는 둘로 나눠 본다.

- **AiTM(adversary-in-the-middle) 피싱**: 피싱 사이트가 사용자와 실제 사이트 사이에서 요청을 중계하는 프록시로 동작한다. 사용자가 넣은 비밀번호와 OTP를 실제 사이트에 그대로 넘기고, 인증이 끝나면 발급된 세션 쿠키를 가로챈다. 공격자는 이 쿠키를 자기 브라우저에 넣어 MFA가 켜져 있어도 인증 단계를 건너뛴다. MFA의 취약점이 아니라 인증의 결과물을 훔치는 공격이다.
- **기기 감염(인포스틸러)**: 사용자 기기의 악성코드가 브라우저에 저장된 세션 쿠키를 빼내고, 공격자가 다른 환경에서 재생(replay)한다. 로그인 과정에 끼어들지 않으므로 인증 수단을 강화해도 막지 못한다.

브라우저만의 문제가 아니다. 메신저나 게임 런처 같은 데스크톱 앱도 로그인 뒤 받은 토큰을 기기에 두고, 메시지를 보낼 때마다 비밀번호와 2차 인증을 다시 묻지 않는다. 출처를 확인하지 않은 게임 모드, 확장 프로그램과 실행 파일은 이런 토큰을 빼내는 악성코드가 들어오는 경로가 될 수 있고, 모르는 사람이 보낸 링크는 AiTM 피싱의 입구가 된다. 2차 인증을 켠 계정이 광고 메시지를 뿌리는 데 쓰였다면 인증이 뚫렸다고 보기보다 토큰이 나갔다고 먼저 의심한다. 탈취가 의심될 때의 순서는 다음과 같다(해석). 감염된 기기에서 비밀번호만 바꾸면 새 토큰도 다시 나갈 수 있으므로 기기부터 정리하고, 깨끗한 기기에서 비밀번호를 바꾸면서 모든 기기의 세션을 끊고, 연결된 앱 권한을 확인한다. 비밀번호 변경이 기존 세션을 끊는지는 서비스마다 다르므로 [[#비밀번호 변경과 재인증 상태|비밀번호 변경과 재인증 상태]]의 기준으로 확인한다.

| 층 | 수단 | 막는 것 | 남는 한계 |
|---|---|---|---|
| 로그인 | 피싱 저항 인증([[FIDO-WebAuthn\|FIDO2 패스키]], 인증서 기반) | 사람이 도메인을 눈으로 확인하는 데 기대지 않으므로 비밀번호와 OTP를 중계하는 AiTM이 통하지 않는다. 패스키는 자격증명이 RP ID에 묶이고 브라우저가 origin과 RP ID를 대조하며 RP가 서명된 origin을 검증한다 | 이미 발급된 쿠키의 탈취, 비밀번호와 OTP 같은 피싱 가능한 대체 로그인 경로, MFA 재설정 같은 복구 경로 |
| 세션 | 기기 바인딩(DBSC) | 기기에서 빼낸 쿠키를 다른 기기에서 계속 쓰는 재생 | 공격자가 기기에 머무는 동안의 로컬 사용, 등록 시점에 공격자가 끼어든 세션 |
| 세션 이후 | 지속 평가와 교차 앱 폐기(CAEP, 전역 토큰 폐기) | IdP가 위험을 감지한 뒤에도 연동 앱에 남은 세션 | 수신 앱이 신호를 받아 실제로 끊어야 효과가 있다 |

### 기기 바인딩: DBSC

Device Bound Session Credentials(DBSC)는 세션을 기기에 보관한 키 쌍에 묶는다. 등록 때 브라우저가 키 쌍을 만들고, 서버는 공개키를 세션 식별자와 함께 저장한다. 이후 서버는 이 세션에 묶인 쿠키를 발급하며, 쿠키 수명은 서버가 정한다. 쿠키가 만료되면 브라우저가 서버의 최근 challenge를 개인키로 서명해 갱신 endpoint로 보내고, 서버는 저장한 공개키로 검증한 뒤에만 새 쿠키를 준다. 명세는 오래된 challenge의 서명을 거부하라고 권한다(should). 빼돌린 쿠키는 만료 뒤 개인키 없이는 갱신할 수 없으므로, 보호 창은 서버가 쿠키 수명을 짧게 잡는 것을 전제로 한다. 개인키를 어떻게 보호할지는 브라우저 구현이 정한다. Chrome은 Windows의 TPM, macOS의 Secure Enclave처럼 키를 밖으로 내보낼 수 없는 보안 하드웨어를 쓴다.

명세는 비목표도 밝힌다. 공격자가 사용자 기기에 상주하는 동안의 세션 접근은 막지 않으며, 같은 사용자로 실행되는 프로그램은 서명 기능을 쓸 수 있다. 세션 등록 시점에 이미 감염된 기기도 보호하지 못한다. 서버는 세션이 어느 기기에 등록됐는지나 그 기기의 상태에 대한 보증을 받지 못한다. 키 보호가 구현 의존이고 Google은 세션별 공개키 외에 기기 식별자나 attestation을 보내지 않는다고 밝히므로, 서버가 키의 하드웨어 결합을 직접 확인할 수도 없다. 목표는 악성코드가 기기 안에서만 움직이게 만들어 탐지와 대응을 쉽게 하는 것이다.

2026-11-19 확인 기준 W3C 게시본은 WebAppSec WG의 First Public Working Draft(2025-08-21)이고, 이 절은 최신 Editor's Draft(2026-11-09판)를 따랐다. Google은 2026-04-09 글에서 Chrome 146의 Windows 공개와 macOS 확대 예정을 밝혔다. Chrome Enterprise 릴리스 노트는 Windows는 Chrome 145, macOS는 Chrome 147부터 점진 배포한다고 적는다. Google Workspace 사용자에게는 Windows Chrome의 기본 적용(관리자 해제 불가)을 2026-05-25부터 최대 60일에 걸쳐 점진 배포했고, 개인 Google 계정도 제공 대상에 들어간다. 모든 사용자에게 배포가 끝났는지는 확인하지 않았다. 보안 하드웨어가 없는 기기는 소프트웨어 키 지원을 검토 중이라고만 밝혔다. 사이트가 등록과 갱신 endpoint를 구현해야 하므로, 브라우저가 지원한다는 사실만으로 자기 서비스의 세션이 보호된다고 보지 않는다.

### 지속 평가와 교차 앱 폐기

SSO로 로그인하면 IdP 세션과 각 앱의 세션이 따로 생긴다. 로그아웃 전파를 구현하지 않았다면 IdP 세션을 끊거나 계정을 정지해도 앱이 이미 발급한 세션과 refresh token은 남는다. 로그아웃 전파에는 OpenID Connect Back-Channel Logout 1.0처럼 OP가 RP에 직접 알리는 규격도 있다. 다만 이 규격은 offline_access로 발급한 refresh token은 보통 폐기하지 않는 것(SHOULD NOT)을 기본으로 둔다. 여기서는 위험 신호 공유와 전체 토큰 폐기를 다루는 둘을 본다.

- **OpenID Shared Signals Framework(SSF) 1.0과 CAEP 1.0**: 2025-08-29 게시본이 Final Specification으로 승인됐다(2025-09-16 발표). SSF는 Transmitter가 Receiver에게 보안 이벤트를 SET(RFC 8417)으로 push(RFC 8935)나 poll(RFC 8936) 방식으로 전달하는 틀이다. CAEP는 그 위의 이벤트 종류를 정의한다. `session-revoked`, `credential-change`, `device-compliance-change`, `assurance-level-change`, `token-claims-change`, `risk-level-change` 등이다. CAEP는 Receiver가 이벤트를 받은 뒤 할 일을 강제하지 않고, SSF는 정보 참고부터 강제 집행까지 배포마다 정하게 둔다. `session-revoked`를 수신한다고 세션이 끊긴다고 가정하지 말고 수신 앱의 처리 규칙을 따로 정의하고 시험한다.
- **Global Token Revocation(IETF 개인 초안 `draft-parecki-oauth-global-token-revocation`)**: Okta Universal Logout 개발자 문서 기준, IdP가 앱이 정한 endpoint에 서명한 JWT와 사용자 식별자를 POST하면 앱은 그 사용자의 refresh token과 세션 쿠키를 모두 폐기한다. Okta 문서는 access token 폐기를 기대하지 않는다고 적고, 초안 -06 본문은 무효화를 권하되(SHOULD) 기술적으로 어려울 수 있다고 인정한다. 어느 쪽이든 이미 발급된 access token은 만료 때까지 남을 수 있다. 성공 응답은 폐기를 시도하고 있다는 뜻이라 즉시 완료를 보장하지 않는다. 2026-11-19 datatracker 기준 이 초안은 -06(2026-02-25)이 2026-08 말 만료된 개인 초안이며 WG 채택본이 없다. 표준으로 확정된 규격이 아니라 벤더 구현이 참조하는 초안으로 본다.

설계 제안으로, 자체 개발 앱이 이런 신호를 처리하려면 서버가 사용자별 세션 목록을 찾아 일괄 무효화할 수 있어야 한다. 세션 ID만 저장하고 사용자 기준 조회 경로가 없거나 자체 검증만 하는 장수명 [[JWT]]에 기대면, 신호를 받아도 끊을 대상을 찾지 못한다. 수신 endpoint 자체도 서명 검증과 재전송 방지가 필요한 공격 표면이다.

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
- MFA를 통과한 세션이 탈취되는 두 경로(AiTM, 기기 감염)와 층별 대응(피싱 저항 인증, DBSC, CAEP와 전역 토큰 폐기)의 한계
- 세션 방식의 확장성 한계와 대안 (외부 세션 저장소, JWT)

## 출처

2026-11-19에는 MFA 이후 세션 탈취 절을 아래 자료와 대조했다. DBSC 명세는 Editor's Draft라 바뀔 수 있다. 피싱 저항 인증 행의 메커니즘은 WebAuthn Level 3와 대조했다. 계기가 된 Okta와 토크아이티 웨비나의 제품 기능과 효과 주장은 검증하지 않았다.

- [From cookie theft to BEC: Attackers use AiTM phishing sites as entry point to further financial fraud — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2022/07/12/from-cookie-theft-to-bec-attackers-use-aitm-phishing-sites-as-entry-point-to-further-financial-fraud/)
- [W3C WebAppSec WG, Device Bound Session Credentials (Editor's Draft)](https://w3c.github.io/webappsec-dbsc/)
- [W3C, Device Bound Session Credentials publication history](https://www.w3.org/standards/history/dbsc/)
- [Protecting Cookies with Device Bound Session Credentials — Google](https://blog.google/security/protecting-cookies-with-device-bound-session-credentials/)
- [Prevent account takeovers with Device Bound Session Credentials (DBSC), now generally available in the Chrome browser for Windows — Google Workspace Updates](https://workspaceupdates.googleblog.com/2026/05/prevent-account-takeovers-with-DBSC-now-generally-available-in-the-Chrome-browser-for-Windows.html)
- [Previous release notes, Chrome 147 (Device Bound Session Credentials) — Google Chrome Enterprise and Education Help](https://support.google.com/chrome/a/answer/10314655?hl=en)
- [IETF Datatracker, draft-parecki-oauth-global-token-revocation](https://datatracker.ietf.org/doc/draft-parecki-oauth-global-token-revocation/)
- [Global Token Revocation, draft-parecki-oauth-global-token-revocation-06 — IETF](https://www.ietf.org/archive/id/draft-parecki-oauth-global-token-revocation-06.txt)
- [W3C, Web Authentication: An API for accessing Public Key Credentials Level 3](https://www.w3.org/TR/webauthn-3/)
- [AI 시대, 기업 Identity 보안의 새로운 전략, 인증을 넘어 계정, 권한, 세션까지 — 토크아이티, Okta 웨비나](https://www.youtube.com/watch?v=XP_2i3tzcjQ) — 공격 경로 구분의 계기로만 사용
- [2차 인증이 무적이 아니라고요???? 아니 왜?!!! — YouTube, Normaltic Place](https://www.youtube.com/watch?v=riE7FtkR-7k) — 2026-11-23 업로드, 2026-11-23 음성 인식 전사 전체 확인. 2차 인증을 켠 메신저 계정의 토큰 탈취와 링크, 게임 모드 경로의 계기로만 사용. 링크 클릭의 예로 든 CSRF는 토큰을 빼내는 공격이 아니어서 옮기지 않았고, 개별 서비스의 세션 폐기 동작은 확인하지 않음
- [OpenID Foundation, OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OpenID Foundation, OpenID Shared Signals Framework Specification 1.0](https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html)
- [OpenID Foundation, OpenID Continuous Access Evaluation Profile 1.0](https://openid.net/specs/openid-caep-1_0-final.html)
- [OpenID Foundation finalizes global standards for real-time identity security — OpenID Foundation](https://openid.net/press-release-openid-foundation-finalizes-global-standards-for-real-time-identity-security/)
- [Okta Developer, Build Universal Logout for your app](https://developer.okta.com/docs/guides/oin-universal-logout-overview/)

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
- [[FIDO-WebAuthn|FIDO2, WebAuthn]]
- [[OAuth2]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Load-Balancer|Load Balancer (세션 분산)]]
- [[Spring-Security-Session-and-CSRF|Spring Security Session과 CSRF]]
