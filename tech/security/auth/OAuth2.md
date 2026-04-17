---
tags: [security, oauth, oauth2, authorization, sso, token]
status: done
category: "보안(Security)"
aliases: ["OAuth2", "OAuth 2.0"]
---

# OAuth 2.0

OAuth 2.0은 **접근 권한 위임(access delegation)** 을 위한 개방형 표준. 사용자가 제3자 애플리케이션에게 비밀번호를 주지 않고도 자신의 리소스(Google Drive·GitHub 저장소 등)에 접근할 권한을 **토큰 단위**로 부여할 수 있게 한다. "로그인" 프로토콜이 아니라 **권한 부여 프로토콜**이지만, 그 위에 OIDC를 얹어 로그인 용도로도 쓰인다.

## 핵심 역할 4가지

| 역할 | 설명 |
|---|---|
| **Resource Owner** | 자원의 실제 소유자(=사용자) |
| **Client** | Resource Owner를 대신해 자원에 접근하려는 **제3자 애플리케이션** |
| **Authorization Server** | 인증·동의를 받고 토큰을 발급하는 서버(예: `accounts.google.com`) |
| **Resource Server** | 실제 보호된 자원을 가진 API 서버(예: `www.googleapis.com/drive`) |

실무에서는 Authorization Server와 Resource Server가 같은 사업자일 수도, 분리될 수도 있다.

## 토큰 종류

- **Access Token** — 짧은 수명(분~시간). Resource Server에 접근할 때마다 헤더(`Authorization: Bearer ...`)로 첨부
- **Refresh Token** — 긴 수명(일~월). Access Token 만료 시 **사용자 재로그인 없이** 새 Access Token 발급
- **ID Token** — OIDC에서 추가. 사용자의 신원 정보를 JWT로 담음

Refresh Token은 재사용 공격을 막기 위해 [[Refresh-Token-Rotation|Rotation]] 전략과 함께 쓰는 것이 현대 표준.

## 4가지 Grant Type

### 1. Authorization Code Grant (가장 보편적·권장)

1. Client가 사용자를 Authorization Server로 리다이렉트(scope·state 포함)
2. 사용자가 로그인 + 동의
3. Authorization Server가 **단기 Authorization Code**를 Client의 `redirect_uri`로 리다이렉트 전달
4. Client가 **서버 간 요청**으로 code + `client_secret`을 보내고 Access Token/Refresh Token 교환
5. Access Token으로 Resource Server 호출

- 장점: `client_secret`이 브라우저에 노출되지 않음 → **서버 사이드 앱 표준**
- 모바일·SPA는 `client_secret`을 숨길 수 없으므로 **PKCE 확장**(Code Challenge/Verifier) 사용

### 2. Implicit Grant (현재는 비권장)

- Authorization Server가 **Access Token을 즉시 프래그먼트(`#access_token=...`)로** 반환
- `client_secret` 없이 SPA가 사용. 하지만 토큰이 URL·브라우저 이력에 노출
- **OAuth 2.1**에서 사실상 제거 — 대신 **Authorization Code + PKCE**를 쓸 것

### 3. Resource Owner Password Credentials (ROPC)

- 사용자 ID/PW를 Client가 직접 받아 Authorization Server에 전달
- 1st-party 신뢰 앱 외에는 **사용 금지** — OAuth의 "비밀번호 공유 안 함" 철학을 파괴
- OAuth 2.1에서 제거됨

### 4. Client Credentials Grant

- Client 자신의 자격(`client_id` + `client_secret`)만으로 토큰 발급
- **Machine-to-Machine(M2M)** 통신 — 사용자 개입이 없는 배치·서비스 간 호출에 적합

## 일반적인 흐름 (Authorization Code + PKCE)

1. **Client Registration** — Client가 Authorization Server에 사전 등록 → `client_id`, (선택) `client_secret`, `redirect_uri` 할당
2. **Authorization Request** — 사용자를 `/authorize`로 리다이렉트: `response_type=code`, `code_challenge`, `scope`, `state`
3. **Authorization Grant** — 사용자가 로그인·동의 → Authorization Server가 `redirect_uri`에 `code` 첨부
4. **Token Exchange** — Client가 `/token`에 `code` + `code_verifier`(PKCE)를 보내 Access/Refresh Token 수령
5. **API Access** — `Authorization: Bearer <access_token>`으로 Resource Server 호출
6. **Token Refresh** — Access Token 만료 시 Refresh Token으로 새 Access Token 발급

## 핵심 보안 파라미터

- **`state`** — CSRF 방지. 요청 생성 시 난수 → 콜백에서 동일한지 검증
- **`nonce`** — OIDC에서 Replay 방지. ID Token에 포함되어 있어야 검증 통과
- **`PKCE`**(Proof Key for Code Exchange) — 공개 클라이언트(SPA/모바일)의 Authorization Code 탈취 방어. `code_verifier`(clear) + `code_challenge`(SHA-256 해시)
- **`redirect_uri`** — 사전 등록된 정확한 URI만 허용. 와일드카드·오픈 리다이렉트 금지
- **`scope`** — 최소 권한 원칙. 필요한 범위만 요청

## OAuth vs OIDC (OpenID Connect)

- **OAuth 2.0** — 권한 위임 프로토콜. "이 앱에 내 캘린더 읽기 권한을 준다"
- **OIDC** — OAuth 2.0 위에 얹힌 **인증 레이어**. `id_token`(JWT)로 사용자 신원·이메일 등 제공 → "로그인"

"소셜 로그인"은 대부분 OIDC. OAuth만 쓰면 "권한만 있고 누구인지 모르는" 상태가 된다.

## 자주 하는 실수

- Implicit Grant로 SPA 구현 → **Authorization Code + PKCE**로 전환
- Access Token을 `localStorage`에 저장 → XSS 탈취. 가능하면 **HttpOnly 쿠키** + SameSite + CSRF 토큰
- Refresh Token을 평문 보관·장기간 재사용 → Rotation 적용, 탈취 감지 시 체인 무효화
- `state` 검증 생략 → CSRF로 세션 덮어쓰기(Login CSRF)
- `redirect_uri`를 느슨하게 허용 → Authorization Code 탈취 경로
- 토큰 스코프를 최소화하지 않고 모든 권한 요청 → 동의율·보안 모두 악화

## 면접 체크포인트

- OAuth 2.0의 4가지 역할과 분리된 이유
- Authorization Code Grant가 Implicit보다 안전한 이유
- PKCE가 해결하는 공격 시나리오(모바일 deep link 탈취)
- `state`·`nonce`의 역할 차이
- OAuth와 OIDC의 경계(권한 vs 인증)
- Refresh Token Rotation이 필요한 이유

## 출처
- [Tecoble — OAuth2.0 이해하기](https://tecoble.techcourse.co.kr/post/2021-07-10-understanding-oauth/)

## 관련 문서
- [[JWT|JWT]]
- [[Session|Session]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
