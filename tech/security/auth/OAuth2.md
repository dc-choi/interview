---
tags: [security, oauth, oauth2, authorization, sso, token]
status: done
verified_at: 2026-08-31
category: "보안(Security)"
aliases: ["OAuth2", "OAuth 2.0"]
---

# OAuth 2.0

OAuth 2.0은 **접근 권한 위임(access delegation)** 을 위한 개방형 표준. 사용자가 제3자 애플리케이션에게 비밀번호를 주지 않고도 자신의 리소스(Google Drive, GitHub 저장소 등)에 접근할 권한을 **토큰 단위**로 부여할 수 있게 한다. "로그인" 프로토콜이 아니라 **권한 부여 프로토콜**이지만, 그 위에 OIDC를 얹어 로그인 용도로도 쓰인다.

## 핵심 역할 4가지

| 역할 | 설명 |
|---|---|
| **Resource Owner** | 자원의 실제 소유자(=사용자) |
| **Client** | Resource Owner를 대신해 자원에 접근하려는 **제3자 애플리케이션** |
| **Authorization Server** | 인증, 동의를 받고 토큰을 발급하는 서버(예: `accounts.google.com`) |
| **Resource Server** | 실제 보호된 자원을 가진 API 서버(예: `www.googleapis.com/drive`) |

실무에서는 Authorization Server와 Resource Server가 같은 사업자일 수도, 분리될 수도 있다.

## 토큰 종류

- **Access Token** — Resource Server 접근 자격증명. 수명과 형식은 Authorization Server 정책에 따르며, Bearer token은 보통 `Authorization: Bearer ...` 헤더로 보낸다
- **Refresh Token** — 발급된 경우 새 Access Token을 받는 자격증명. 수명, 재발급과 폐기 정책은 Authorization Server마다 다르다
- **ID Token** — OIDC가 OAuth 2.0에 추가한 인증 결과 JWT. 최종 사용자 인증에 관한 claim과, 요청 및 정책에 따라 다른 claim을 담을 수 있다

공개 클라이언트의 Refresh Token은 sender-constrained 방식 또는 [[Refresh-Token-Rotation|Rotation]]으로 replay를 탐지하고 막아야 한다. Rotation은 그중 널리 쓰는 방식이다.

## RFC 6749의 4가지 Grant Type과 현재 선택

RFC 6749는 Authorization Code, Implicit, Resource Owner Password Credentials, Client Credentials의 네 grant를 정의한다. 새 사용자 위임 연동은 Authorization Code + PKCE를 기본으로 하고, 사용자 없는 서비스 자격은 Client Credentials를 쓴다.

### 1. Authorization Code Grant (가장 보편적, 권장)

1. Client가 사용자를 Authorization Server로 리다이렉트(scope, state 포함)
2. 사용자가 로그인 + 동의
3. Authorization Server가 **단기 Authorization Code**를 Client의 `redirect_uri`로 리다이렉트 전달
4. Client가 Token Endpoint에서 code를 교환. 새 구현은 `code_verifier`를 보내고, confidential client는 등록된 방식으로 자신도 인증
5. Access Token으로 Resource Server 호출

- 장점: 브라우저에는 `client_secret`을 두지 않아도 되고, Token Endpoint에서 code와 PKCE를 함께 검증할 수 있음
- 공개 클라이언트(모바일, SPA)는 PKCE가 필수다. confidential client에도 PKCE 사용이 권장된다

### 2. Implicit Grant (현재는 비권장)

- Authorization Server가 Access Token을 Authorization Response의 프래그먼트 같은 front-channel로 반환
- front-channel에 Access Token을 노출하면 leakage와 replay 공격면이 커진다
- 2026-08-31 기준 OAuth 2.1은 Active Internet-Draft이며 이 grant를 제외한다. 현행 보안 BCP인 RFC 9700도 Implicit Grant를 사용하지 말라고 권고한다. 대신 **Authorization Code + PKCE**를 쓴다

### 3. Resource Owner Password Credentials (ROPC)

- 사용자 ID/PW를 Client가 직접 받아 Authorization Server에 전달
- OAuth 2.1 Internet-Draft에는 이 grant가 포함되지 않는다. RFC 9700은 ROPC를 사용해서는 안 된다고 규정한다

### 4. Client Credentials Grant

- Client가 등록된 인증 방식(`client_secret`, private key, mTLS 등)으로 자신을 인증해 토큰 발급
- **Machine-to-Machine(M2M)** 통신 — 사용자 개입이 없는 배치, 서비스 간 호출에 적합

## 일반적인 흐름 (Authorization Code + PKCE)

1. **Client Registration** — Client가 Authorization Server에 사전 등록 → `client_id`, (선택) `client_secret`, `redirect_uri` 할당
2. **Authorization Request** — 사용자를 `/authorize`로 리다이렉트: `response_type=code`, `code_challenge`, `scope`, `state`
3. **Authorization Grant** — 사용자가 로그인, 동의 → Authorization Server가 `redirect_uri`에 `code` 첨부
4. **Authorization Code 교환** — Client가 `/token`에 `code` + `code_verifier`(PKCE)를 보내고, confidential client는 등록된 방식으로 인증. Authorization Server는 정책에 따라 Access Token과 선택적 Refresh Token을 발급
5. **API Access** — `Authorization: Bearer <access_token>`으로 Resource Server 호출
6. **Token Refresh** — Refresh Token이 발급되어 유효하면 새 Access Token을 요청

여기서 Authorization Code를 토큰으로 바꾸는 단계는 RFC 8693의 [[OAuth2-Token-Exchange|OAuth 2.0 Token Exchange]]와 다르다. RFC 8693은 이미 존재하는 보안 토큰을 다른 대상과 권한 범위의 토큰으로 바꾸는 별도 grant다.

## 서버 사이드 웹 클라이언트의 구현 관점

Authorization Code 흐름은 브라우저를 거치는 front-channel과 Token Endpoint의 back-channel을 분리한다. 실제 리다이렉트와 HTTP 요청 수는 제공자와 사용자의 로그인 상태에 따라 달라진다.

1. **front-channel (브라우저 리다이렉트)** — Client는 사용자를 인가 서버의 `/authorize`로 보낸다 (`response_type=code&client_id=...&redirect_uri=...&scope=...`). 로그인과 동의는 인가 서버 화면에서 일어나므로 Client는 비밀번호를 보지 않는다. 인가 서버는 승인 결과와 `state`를 Client의 `redirect_uri`로 돌려보낸다.
2. **back-channel (서버 간)** — Client 서버가 redirect_uri로 돌아온 code를 `POST /token`으로 교환한다. 본문은 `application/x-www-form-urlencoded`이고 PKCE면 `code_verifier`를 포함한다. confidential client 인증 방식과 토큰 종류는 제공자 등록 및 정책에 따른다. 이후 access_token을 `Authorization: Bearer`로 리소스 API에 첨부한다.

### 토큰 엔드포인트의 클라이언트 인증

| 방식 | 자격 전달 위치 | 비고 |
|---|---|---|
| client_secret_basic | HTTP Basic 방식으로 `client_id`와 `client_secret` 전달 | RFC 6749 §2.3.1이 인가 서버에 지원을 요구하는 기본 |
| client_secret_post | form body의 `client_id`, `client_secret` 필드 | RFC상 차선(NOT RECOMMENDED), 다른 방식이 불가능할 때만 사용 |

제공자마다 지원 방식이 다르므로 연동 시 해당 제공자 문서를 확인한다.

### 학습용 코드에서 흔히 생략되는 것 (프로덕션 전 체크)

- `state` 검증 생략 → Login CSRF에 노출
- PKCE 생략 → 공개 클라이언트의 code 탈취 방어 없음
- access_token을 화면과 로그에 노출 → 실서비스는 토큰을 서버 세션 뒤로 숨기거나 HttpOnly 쿠키로 관리

인가 서버 쪽 구현(Spring 기준 등록부, 동의 화면, 토큰 서명)은 [[Spring-Authorization-Server]].

## 핵심 보안 파라미터

- **`state`** — 사용자 에이전트 세션에 묶은 일회용 값을 요청과 콜백에서 대조해 CSRF를 막는다
- **`nonce`** — OIDC에서 Client 세션과 ID Token을 연결하고 replay를 완화한다. 요청에 넣었다면 ID Token의 같은 값을 검증한다
- **`PKCE`**(Proof Key for Code Exchange) — Authorization Code 탈취와 injection을 막는다. 새 구현은 난수 `code_verifier`로부터 `S256` 방식의 `code_challenge`를 만들고, Token Endpoint에서 verifier를 증명한다
- **`redirect_uri`** — 사전 등록한 URI와 exact string matching한다. native app의 `localhost` 포트 예외 외에는 와일드카드와 오픈 리다이렉트를 허용하지 않는다
- **`scope`** — 최소 권한 원칙. 필요한 범위만 요청

## OAuth vs OIDC (OpenID Connect)

- **OAuth 2.0** — 권한 위임 프로토콜. "이 앱에 내 캘린더 읽기 권한을 준다"
- **OIDC** — OAuth 2.0 위에 얹힌 인증 레이어. `id_token`(JWT)으로 사용자 인증 사실을 전달하고, 요청 scope와 제공자 정책에 따라 profile, email 같은 claim을 제공한다

OIDC 기반 로그인에서는 access token만으로 로그인을 판단하지 않고 ID Token의 서명, issuer, audience와 시간 claim을 검증하며, 요청에 `nonce`를 보냈다면 같은 값인지 대조한다. OAuth 2.0만으로는 Client가 소비할 표준 인증 assertion인 ID Token을 정의하지 않는다.

## 위임 범위 설계 — 조직 전체 위임 vs 사용자별 토큰

내부 도구가 구성원의 리소스(캘린더, 메일)를 다룰 때 두 가지 위임 모델이 있다.

- **도메인 전체 위임(Domain-Wide Delegation)** — Google Workspace에서 관리자가 서비스 계정 Client ID에 허용 scope를 부여하면, 서비스 계정이 그 범위 안에서 지정한 도메인 사용자를 가장해 접근할 수 있다. 자격증명이 유출되면 허용 scope와 가장 가능한 사용자 범위가 곧 피해 범위가 된다
- **사용자별 Authorization Code 플로우** — 각 사용자가 직접 동의하고 자신의 리소스에만 접근. 최소 권한 원칙에 부합하고 행위 주체가 실제 사용자로 기록

사용자별 토큰을 쓸 때의 수명주기 설계: 스코프는 필요한 것만 요청하고, 토큰은 암호화해 보관하며, 퇴사와 오프보딩 시 제공자별 폐기 정책을 프로세스에 포함한다.

## 자주 하는 실수

- Implicit Grant로 SPA 구현 → **Authorization Code + PKCE**로 전환
- Access Token을 `localStorage`에 저장 → XSS 탈취. 가능하면 **HttpOnly 쿠키** + SameSite + CSRF 토큰
- Refresh Token을 평문 보관, replay 대책 없이 장기간 재사용 → Rotation 또는 sender-constrained token을 적용하고 탈취 대응 정책 정의
- `state` 검증 생략 → CSRF로 세션 덮어쓰기(Login CSRF)
- `redirect_uri`를 느슨하게 허용 → Authorization Code 탈취 경로
- 토큰 스코프를 최소화하지 않고 모든 권한 요청 → 동의율, 보안 모두 악화

## 면접 체크포인트

- OAuth 2.0의 4가지 역할과 분리된 이유
- Authorization Code Grant가 Implicit보다 안전한 이유
- PKCE가 해결하는 공격 시나리오(모바일 deep link 탈취)
- `state`, `nonce`의 역할 차이
- OAuth와 OIDC의 경계(권한 vs 인증)
- Refresh Token Rotation이 필요한 이유
- 도메인 전체 위임의 리스크와 사용자별 토큰 + 최소 스코프 설계

## 출처
- [RFC 6749 — The OAuth 2.0 Authorization Framework (§2.3.1 클라이언트 인증)](https://www.rfc-editor.org/rfc/rfc6749)
- [IETF Internet-Draft — The OAuth 2.1 Authorization Framework](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [IETF, RFC 7636: Proof Key for Code Exchange by OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636)
- [OpenID Foundation, OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Google for Developers, Using OAuth 2.0 for Server to Server Applications](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Tecoble — OAuth2.0 이해하기](https://tecoble.techcourse.co.kr/post/2021-07-10-understanding-oauth/)
- [GA가 AI와 함께 만든 오피스 좌석 배치도 — 아임웹 기술 블로그](https://tech.imweb.me/posts/ga-built-office-seatmap/)
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)
- [dingco-web-security — dingcodingco (GitHub, 강의 실습 소스)](https://github.com/dingcodingco/dingco-web-security)

## 관련 문서
- [[JWT|JWT]]
- [[Session|Session]]
- [[Spring-Authorization-Server|Spring Authorization Server (인가 서버 구현)]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[OAuth2-Token-Exchange|OAuth 2.0 Token Exchange]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[HTTPS-TLS|HTTPS, TLS Handshake]]
