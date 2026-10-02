---
tags: [security, auth, selection]
status: done
verified_at: 2026-10-03
category: "Security - 인증"
aliases: ["Auth Method Selection", "인증 방식 선택"]
---

# 인증 방식 선택

HTTP는 Stateless지만 애플리케이션은 로그인 상태를 저장할 수 있다. 보호된 요청의 신원과 권한을 어떻게 검증하고, 자격증명을 어떻게 전달하고 폐기할지 함께 선택한다.

## 선택할 축

1. **전달과 저장** — Authorization 헤더, 보안 속성을 설정한 쿠키, 클라이언트의 저장 위치
2. **자격증명과 상태** — 비밀번호, API key, 세션 ID, JWT나 opaque access token, 만료와 폐기 방식
3. **발급과 위임 절차** — 자체 로그인, OAuth 2.0과 OpenID Connect. 프로토콜과 토큰 형식은 같은 분류가 아니다.

## 쿠키, 세션, JWT의 관계

초기 웹 애플리케이션은 URL에 사용자 식별자를 붙여 요청 사이의 상태를 이어 보기도 했다. URL은 브라우저 기록, 로그와 리퍼러에 노출되고 모든 링크를 오염시키므로 인증 상태를 전달하는 위치로 부적합하다.

| 개념 | 역할 | 서버 상태 |
|---|---|---|
| Cookie | 브라우저가 값을 저장하고 조건에 맞는 요청에 자동 첨부하는 전달 수단 | 쿠키 자체가 결정하지 않음 |
| Session | 불투명한 세션 ID로 서버의 사용자 상태를 조회 | 필요 |
| JWT | 클레임을 서명하거나 암호화해 전달할 수 있는 토큰 형식 | 자체 검증은 가능하지만 폐기와 회전 정책에는 상태가 생길 수 있음 |

쿠키, 세션과 JWT는 순서대로 서로를 완전히 대체한 세대가 아니다. 세션 ID도 쿠키로 전달하고 JWT도 HttpOnly 쿠키에 담을 수 있다. 선택할 때는 자격증명을 어디에 전달할지와 서버가 어느 정도의 상태와 폐기 제어권을 가질지를 나누어 판단한다.

[[Cookie|쿠키]]의 값은 클라이언트가 변조할 수 있다. 사용자 ID, 권한과 결제 금액을 쿠키에서 읽었다는 이유만으로 신뢰하지 않고, 서버 상태와 대조하거나 적절한 무결성 검증을 한다. 기밀성과 무결성은 별도 요구다. 전송 조건에 맞으면 정적 리소스 요청에도 첨부될 수 있으므로 값의 크기와 범위를 최소화한다.

[[Session|세션]]은 쿠키를 없애는 방식이 아니라, 중요한 상태를 서버로 옮기고 쿠키에는 추측하기 어려운 불투명 ID만 남기는 방식이다. 인메모리 세션은 로드 밸런서가 다음 요청을 다른 인스턴스로 보내면 조회에 실패할 수 있다. Sticky Session은 구현이 단순하지만 특정 인스턴스의 장애와 부하 쏠림에 취약하고, Redis나 DB 같은 공유 저장소는 어느 인스턴스에서도 세션을 조회할 수 있는 대신 네트워크 호출과 저장소 운영 비용이 생긴다.

## 자격증명 위치

| 위치 | 특징 |
|---|---|
| **Authorization 헤더** | RFC 6750의 Bearer access token 전달 권장 방식. 공유 캐시는 이 헤더가 있는 요청의 응답을 기본적으로 재사용할 수 없고 `public`, `s-maxage`, `must-revalidate` 같은 명시적 응답 지시자가 필요 |
| **Cookie** | 브라우저 세션 ID 전달에 적합. Domain, Path, Secure, SameSite와 브라우저 정책에 따라 자동 첨부되므로 CSRF 방어를 함께 설계 |
| **쿼리스트링** | 로그, 리퍼러와 기록에 자격증명이 노출될 수 있음. RFC 9700은 OAuth access token의 URI query 전달을 금지 |
| **Request Body** | 일반적으로 POST만 가능한 것은 아님. RFC 6750의 Bearer 전달은 form-encoded, single-part, ASCII, 본문 의미가 정의된 메서드 등의 조건을 모두 요구하며 GET은 금지. 헤더를 사용할 수 없는 제한적 상황 외에는 권장하지 않음 |

Bearer API 요청의 헤더 권장과 브라우저 세션의 쿠키 권장을 구분한다. 헤더에 넣는다는 이유만으로 토큰 저장, XSS와 로그 노출 문제가 해결되지는 않는다.

## 자격증명과 프로토콜 비교

### HTTP Basic
```
Authorization: Basic base64(username:password)
```
- Base64는 암호화가 아니다. TLS 없이 비밀번호의 기밀성을 보장하지 못한다.
- 재사용 비밀번호를 요청에 반복 전달하므로 노출과 폐기 범위를 고려한다. 내부망이라는 이유로 안전한 것은 아니다.
- 기존 연동이 요구하는 경우 프로토콜 조건과 TLS를 확인하고, 신규 사용자 로그인에는 세션이나 단기 토큰 등도 비교한다.

### Bearer Token (JWT, Opaque Token)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```
- 토큰 자체가 자격증명이다. 사용자 로그인 외에 클라이언트 자격증명 등으로도 발급될 수 있다.
- **JWT**: self-contained 검증이 가능해 매 요청 저장소 조회를 줄일 수 있음. 서명뿐 아니라 만료, issuer와 audience 등 애플리케이션 검증도 필요
- **Opaque Token**: 랜덤 문자열, 서버에서 조회 필요 → 취소 가능
- **사용처**: 대부분의 모던 API

### API Key
```
Authorization: Bearer <api-key>
  또는
X-API-Key: <api-key>
```
- 서비스간, 파트너 API에 주로 사용
- 식별하는 주체와 권한 범위는 발급 정책에 따른다. 브라우저나 배포 앱에 내장한 공통 키를 비밀이나 최종 사용자 신원의 증거로 취급하지 않는다.
- **사용처**: 외부 파트너, B2B API, 레이트 리밋 키

### OAuth 2.0 / OpenID Connect
- OAuth 2.0은 보호된 리소스에 대한 위임 인가 프레임워크다.
- 사용자 로그인과 신원 확인은 OAuth 2.0 위에 OpenID Connect를 사용한다. 브라우저와 SPA에는 Authorization Code + PKCE를 적용한다.
- Client Credentials는 사용자 로그인이 아니라 클라이언트가 자기 권한으로 리소스 접근 토큰을 받는 grant다.
- 액세스 토큰은 JWT일 수도 opaque token일 수도 있으며 OAuth 2.0이 형식을 고정하지 않는다.

### Session Cookie
```
Cookie: session=abc123
```
- 서버가 세션 ID를 쿠키로 발급, 세션 저장소(Redis, DB)에서 조회
- **서버가 세션 상태 유지** — 취소, 만료 제어 쉬움
- **CSRF 방어 필요** (SameSite=Strict, Lax, CSRF 토큰)
- **사용처**: 전통 웹사이트, 관리자 페이지

## 선택 가이드

### 웹 브라우저 + 자체 백엔드
같은 사업자가 브라우저와 백엔드를 운영하면 보안 속성을 설정한 세션 쿠키를 우선 비교할 수 있다.
- 인증 자격증명을 `localStorage`나 `sessionStorage`에 두지 않는다. HttpOnly는 JS의 쿠키 읽기를 막지만 XSS의 인증된 요청 실행은 별도 방어가 필요하다.
- HttpOnly, Secure와 흐름에 맞는 SameSite를 설정한다. 상태 변경 요청에 CSRF 방어를 적용하고 SameSite만으로 충분하다고 가정하지 않는다.

### 모바일 앱 + 자체 백엔드
네이티브 클라이언트가 헤더에 명시적으로 보내는 access token은 JWT나 opaque token 중 검증과 폐기 요구에 맞게 고른다. OS의 안전한 저장소를 사용한다. 모바일이라는 이유로 CSRF가 사라지지는 않으며, WebView나 쿠키를 사용하는 경로는 자동 전송과 외부 요청 유도 가능성을 별도로 확인한다.

### SPA (React, Vue) + 자체 백엔드
두 선택:
- **HttpOnly 쿠키 + 세션 또는 토큰** — JS의 직접 토큰 탈취를 줄이지만 XSS가 인증된 요청을 실행하는 것까지 막지는 못한다. CSRF와 XSS 방어를 별도로 적용한다.
- **Access token in Memory** — JWT나 opaque token 모두 가능. 새로고침 뒤 재인증 또는 갱신 절차가 필요하며, refresh token의 보관과 보호를 별도로 설계한다. 메모리 저장도 실행 중인 악성 JS로부터 완전히 격리되지는 않는다.

### 서드파티 로그인 (Google, Kakao)
**OpenID Connect Authorization Code + PKCE**를 사용한다.

### 서비스 간 통신 (MSA, 서버→서버)
- mTLS, OAuth Client Credentials나 제한된 API key를 신뢰 경계, 수명과 폐기 요구에 맞춰 비교한다. Client Credentials가 JWT 형식을 요구하지는 않는다.
- mTLS의 인증서와 access token은 함께 사용할 수도 있다. 내부와 외부라는 위치만으로 사용자/서비스별 권한 검사를 생략하지 않는다.

### 공개 API + 많은 클라이언트
API key와 키별 제한으로 사용량을 관리할 수 있다. 민감 자원의 사용자/객체 인가를 공통 키 하나로 대체하지 않는다. 익명 공개 데이터와 인증이 필요한 API도 구분한다.

## JWT의 함정

- **보호 형식 구분** — JWS JWT의 Payload는 Base64URL 인코딩이며 기밀성이 없다. JWE 암호화도 가능하지만 용도와 설계가 다르다
- **프로필 전체 검증** — 허용 알고리즘과 키, 서명, issuer, audience, 시간과 필수 claim을 검증하고 서명을 요구하는 프로필에서는 `none`을 거부
- **만료 시간 짧게** — 서비스 위험과 재인증 UX에 맞춰 제한하고 필요하면 Refresh Token으로 갱신
- **폐기와 최신 권한** — 자체 검증만으로는 즉시 회수가 반영되지 않는다. denylist, 버전이나 세션 상태를 검증 경로에 연결하거나 짧은 만료로 노출 시간을 제한
- **크기** — 쿠키와 헤더의 브라우저/서버별 크기 제한 및 전송 비용을 확인

자세히는 [[JWT]] 참고.

## Refresh Token Rotation

Access Token(짧은 수명) + Refresh Token(긴 수명) 조합. Refresh 시 **새 refresh token 발급 + 이전 것 즉시 무효**.

- 사용한 refresh token의 재제출을 감지할 수 있다. 탈취 자체가 자동 탐지되거나 기존 access token이 자동 폐기되는 것은 아니다.
- "로그인 7일 유지" 같은 UX 지원하면서 탈취 리스크 완화

상세는 [[Refresh-Token-Rotation]].

## 비밀번호 저장

절대 평문 금지. 해시도 단순 SHA 금지.

알고리즘 우선순위는 다음과 같다.

1. **Argon2id**: 신규 시스템의 우선 선택
2. **scrypt**: Argon2id를 사용할 수 없을 때의 대안
3. **bcrypt**: Argon2id와 scrypt를 쓸 수 없는 레거시 환경에서만 조건부 사용. work factor는 최소 10으로 두고, 대부분의 구현이 입력을 72바이트까지만 처리하므로 그보다 긴 입력이 잘리지 않도록 길이 제한을 명시적으로 검증

모든 방식은 사용자마다 **고유한 salt**를 적용한다.

상세는 [[Password-Hashing]].

## HTTPS 필수

자격증명을 주고받는 로그인과 보호 API, 세션 전체에 HTTPS를 적용한다. TLS 종료 이후의 전달 구간도 보호한다. HTTPS는 전송 중 노출과 변조를 막는 통제이며 XSS, 권한 검사 누락이나 안전하지 않은 저장을 대신하지 않는다.

## 흔한 실수

- **비밀번호를 쿼리스트링에** → 로그, 리퍼러 유출
- **JWS JWT에 비밀 담기** — Payload를 디코딩해 읽을 수 있음
- **알고리즘 검증 없이 JWT 수락** → `alg: none` 취약점
- **세션을 in-memory에만** → 서버 재시작 시 전원 로그아웃
- **HTTPS 미적용** — 전송 중 자격증명 노출과 변조 위험

## 면접 체크포인트

- Bearer의 헤더 전달과 브라우저 세션의 쿠키 전달을 구분하는 이유
- Basic과 Bearer의 노출 범위, TLS와 폐기 정책의 차이
- 세션 vs JWT 선택 기준 (쿠키, 서버 상태, 취소 가능성)
- OAuth 2.0이 "인증"이 아니라 "인가" 프레임워크인 이유
- JWT의 형식과 보호 방식, 상태를 통한 폐기, 크기와 검증 프로필의 구분

## 출처

2026-10-03 부분 검증: RFC 6750/9700의 전달과 OAuth 경계, OWASP의 세션/API key 통제, RFC 7519의 JWS/JWE 구분을 대조했다. 선택 가이드는 이를 적용한 판단 기준이며 특정 앱과 모든 라이브러리의 동작을 검증한 기록은 아니다.

- [IETF, RFC 6750: OAuth 2.0 Bearer Token Usage, §2](https://www.rfc-editor.org/rfc/rfc6750.html#section-2)
- [IETF, RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)
- [IETF, RFC 7617: The Basic HTTP Authentication Scheme](https://www.rfc-editor.org/rfc/rfc7617.html)
- [OWASP Cheat Sheet Series, REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP MASVS, MASVS-STORAGE-1](https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-1/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 9111 — HTTP Caching, Authorization](https://www.rfc-editor.org/rfc/rfc9111.txt)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [쿠키, 세션, JWT HTTP 상태관리 변천사 — 코딩하는기술사](https://www.youtube.com/watch?v=lggnXKm-RyY)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 5. 사용자 인증 방식 결정](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-5.-%EC%82%AC%EC%9A%A9%EC%9E%90-%EC%9D%B8%EC%A6%9D-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95)

## 관련 문서
- [[Session|Session]]
- [[JWT|JWT]]
- [[OAuth2|OAuth2]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Password-Hashing|Password Hashing]]
