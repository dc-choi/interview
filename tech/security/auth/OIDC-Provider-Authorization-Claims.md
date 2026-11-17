---
tags: [security, auth, oidc, oauth2, jwt, authorization, platform]
status: done
verified_at: 2026-11-17
category: "보안(Security)"
aliases: ["사내 OIDC Provider", "OIDC 인가 claim 설계", "n3r OIDC"]
---

# 사내 플랫폼을 OIDC Provider로 열 때의 인가 claim 설계

사용자, 프로젝트와 역할을 이미 관리하는 사내 플랫폼은 자신을 OpenID Provider(OP)로 열어 내부 도구가 로그인 화면과 권한 체계를 따로 만들지 않게 할 수 있다. 로그인 절차는 OIDC 표준을 그대로 따르면 되지만, 사용자가 어느 프로젝트에서 무엇을 할 수 있는지는 표준이 정하지 않으므로 별도 설계가 필요하다. 이 문서는 NAVER 사내 Kubernetes 플랫폼 n3r의 OIDC 발표(2026-11 공개)를 사례로, 표준을 따른 부분과 표준이 비워 둔 인가 설계의 결정과 대가를 정리한다. n3r의 동작과 수치는 발표 기준이며 표준 조항은 아래 출처와 대조했다.

## 플랫폼이 로그인을 제공하는 이유

앱마다 로그인을 붙이면 로그인 화면, 세션, 비밀번호 재설정, 사용자 키(사번, 이메일, UUID 중 무엇을 쓸지와 매핑 테이블), 권한 판정, 역할 변경의 동기화를 매번 다시 만든다. 이 기능은 앱의 본질이 아니고 사람마다 구현이 달라 재사용도 어렵다. 발표가 든 상황은 다음과 같다.

- **로그인 없는 내부 도구**: AI 도구로 빠르게 만든 대시보드를 인증 없이 띄우면 주소를 아는 누구나 본다.
- **공유 계정**: 팀이 기본 계정의 비밀번호를 나눠 쓰면 업무가 바뀐 사람도 계속 접근하고, 누가 무엇을 했는지 기록이 남지 않는다. 플랫폼 계정으로 로그인하면 프로젝트 멤버에서 빠진 뒤에는 로그인되지 않는다.
- **사내 인증 플러그인 종료**: 오픈소스의 OpenID Connect 플러그인에 discovery 주소와 클라이언트 정보만 넣어 전환한다. 발표 시점에 Jenkins 플러그인 같은 연동은 지원하려는 계획으로 소개됐다.
- **사용자 대신 API를 부르는 도구**: AI 에이전트나 CLI가 서비스 계정 토큰을 복사해 쓰면 감사 로그에 실제 사람이 남지 않는다. 사용자가 위임한 access token을 쓰면 사용자 권한만큼만 호출하고 감사 로그에 본인이 남는다.

OAuth 2.0은 권한 위임을, OIDC는 그 위에서 ID Token으로 로그인한 사용자가 누구인지를 전달한다. 기본 개념은 [[OAuth2|OAuth 2.0]]에 있다.

## 표준대로 둔 부분

표준이 정한 선택지 안에서 고른 부분이라 discovery 문서를 읽는 라이브러리와 오픈소스는 설정만으로 연동할 수 있다. 발표자는 이 부분이 어떤 OP를 써도 같을 것이라고 설명했지만, 지원 response type, 서명 알고리즘과 클라이언트 인증 방식은 OP마다 discovery 메타데이터로 달리 알리는 값이다.

| 항목 | n3r 발표 기준 동작 | 표준 근거 |
|---|---|---|
| 흐름 | Authorization Code + PKCE(S256). `response_type`은 `code`만 지원. public client(CLI, SPA)는 PKCE 필수 | [[OAuth2#RFC 6749의 4가지 Grant Type과 현재 선택\|OAuth 2.0 grant 선택]] |
| 설정 발견 | issuer 하나로 `/.well-known/openid-configuration`을 읽어 엔드포인트와 지원 값을 얻음 | Discovery §4. 문서의 `issuer`는 그 issuer가 발급한 ID Token의 `iss`와 같아야 함(§3) |
| 서명 | RS256. JWKS에 여러 키를 노출하고 토큰의 `kid`로 고르므로 키를 교체해도 앱 설정을 바꾸지 않음 | Discovery §3은 `id_token_signing_alg_values_supported`에 RS256 포함을 요구 |
| 클라이언트 인증 | secret을 Basic 헤더나 본문으로 전달, public client는 `none` | [[OAuth2#토큰 엔드포인트의 클라이언트 인증\|토큰 엔드포인트 클라이언트 인증]] |
| 토큰 | ID Token과 access token은 JWT, refresh token은 난수이며 서버에는 해시만 저장. refresh token은 쓸 때마다 새로 발급하고 이전 것을 폐기 | [[Refresh-Token-Rotation\|Refresh Token Rotation]] |
| 로그인 세션 | 기존 플랫폼 세션을 그대로 확인하고 없으면 통합 로그인 화면으로 보낸 뒤 복귀 | |
| 엔드포인트 | discovery, authorize, token, userinfo, JWKS, revoke | Discovery §3의 필수 메타데이터는 issuer, authorization endpoint, token endpoint(Implicit Flow만 쓰면 제외), JWKS, 지원 response type, subject type, ID Token 서명 알고리즘이고 userinfo는 권장. revoke는 Discovery 메타데이터가 아니라 별도 토큰 폐기 엔드포인트 |

발표 기준으로 introspection, dynamic client registration, device flow, 로그아웃 전파와 동의(consent) 화면은 지원하지 않는다. 이 중 동의 화면, 로그아웃 전파와 introspection은 아직 제공할 예정이 없다고 했다.

## 표준이 비워 둔 인가 정보

OIDC Core는 사용자가 누구인지까지만 정의한다. JWT access token 프로파일인 RFC 9068 §2.2.3.1은 인가 속성을 넣으려면 SCIM User 스키마의 `groups`, `roles`, `entitlements`를 쓰라고 권하지만, `roles`와 `entitlements`의 어휘는 정하지 않는다. 리소스 서버가 이 값으로 어떻게 판정할지도 §4에서 프로파일 범위 밖으로 둔다. 그래서 여러 프로젝트에 속한 사용자의 권한을 담는 방식은 OP가 정해야 한다.

### 결정 1: 프로젝트별 인가 정보를 토큰에 싣는다

- **방식**: `groups` scope를 요청하면 프로젝트 접두사를 붙인 `groups` claim을(발표는 프로젝트, 그룹, 그룹명 순서라고 설명했고 구분자는 확인하지 못했다), 플랫폼 전용 scope를 요청하면 프로젝트별 역할 맵을 담은 커스텀 claim을 넣는다. 역할 맵에는 그룹을 통해 받은 역할까지 펼쳐 넣는다. 사번 claim은 사번이 있는 사용자라면 scope와 관계없이 들어간다.
- **이유**: 토큰에 권한이 있어야 앱이 매번 OP를 다시 부르지 않는다. 발표는 Grafana, Jenkins 같은 오픈소스가 `groups` claim으로 역할을 매핑하고, 플랫폼 내부 서비스는 그룹이 아니라 역할을 필요로 해서 두 claim을 따로 두었다고 설명했다. 표준 `groups`, `roles`만으로는 어느 프로젝트의 그룹이나 역할인지 알 수 없다.
- **보완**: 토큰을 짧게 유지해야 하거나 항상 최신 권한이 필요한 앱은 userinfo 엔드포인트로 실시간 조회한다.
- **대가**: 토큰이 길어진다.

### 결정 2: 클라이언트를 등록한 주체로 토큰의 범위를 나눈다

OIDC Core가 로그인 access token으로 접근하는 Protected Resource로 정의한 것은 UserInfo 엔드포인트다(§5.3). 다른 API가 그 토큰을 받을지는 OP와 리소스 서버가 정한다. n3r은 플랫폼 API가 이 토큰을 받게 해 앱이 `Authorization` 헤더로 사용자 권한의 API 호출을 하게 했다. 플랫폼 API는 토큰을 OP에 넘겨 서명, 발급자, 만료, 토큰 종류와 audience를 검증하고 감사 로그에 사용자와 OIDC 클라이언트를 남긴다. 발표 시점에는 일부 플랫폼 API만 이 토큰을 받고 대상을 넓히는 중이었다.

문제는 한 프로젝트의 관리자가 등록한 클라이언트로 받은 토큰이 사용자의 모든 프로젝트 권한을 가지면 안 된다는 점이다. 발표는 표준에서 앱이 요청하고 사용자가 동의 화면에서 허락한 scope가 권한 범위를 정한다고 설명했는데, n3r에는 동의 화면이 없고 권한이 프로젝트 단위로 나뉘어 있다. 발표 시점에 프로젝트 관리자의 클라이언트 등록 화면은 준비 중이었다.

| 클라이언트 | 등록 주체 | `aud` | 담기는 역할과 그룹 |
|---|---|---|---|
| 글로벌(플랫폼 전용) | 플랫폼 IAM 관리자 | 플랫폼 전체 | scope에 따라 모든 프로젝트 |
| 프로젝트 | 프로젝트 관리자 | 그 프로젝트 | 그 프로젝트 것만 |

제한을 `aud`에 둔 이유는 인증 단계에서 거부해야 인가를 확인하지 않는 API까지 막을 수 있기 때문이다. RFC 9068 §4도 `aud`에 현재 리소스 서버의 식별자가 없으면 토큰을 거부하라고 하고, §5는 리소스마다 다른 `aud` 값을 쓰라고 한다. 대가로 프로젝트 클라이언트 토큰은 항상 그 프로젝트로 제한된다.

### 결정 3: 인가는 토큰에 실린 역할만으로 판정한다

기존 방식처럼 호출자의 현재 권한 전체로 판정하면, 프로젝트로 제한한 토큰도 `aud` 검사를 통과하는 순간 사용자의 모든 프로젝트 권한을 갖게 된다. 그래서 OIDC access token은 토큰의 역할 claim만으로 판정하고 사용자가 그 역할을 아직 가졌는지 다시 확인하지 않는다.

- 토큰에는 역할 이름만 두고, 그 역할이 어떤 리소스에 어떤 작업을 할 수 있는지는 정책을 가진 권한 시스템에 질의한다. 요청마다 사용자 역할을 다시 조회하지 않아 권한 시스템 호출이 줄어든다.
- 역할이나 정책 자체를 지우면 그 역할에 권한을 줄 정책이 없어져 토큰이 바로 거부된다.
- **대가**: 역할이 발급 시점에 고정된다. 새로 받은 역할은 재발급 전까지 쓸 수 없고, 잃은 역할은 토큰 만료까지 유효하다.

### 결정 4: introspection 대신 짧은 수명과 재발급으로 권한 변경을 전파한다

RFC 7662의 introspection은 리소스 서버가 토큰의 현재 유효성을 OP에 묻는 방식이다. 응답의 `active`가 필수 값이고, 응답을 캐시하면 부하는 줄지만 그동안 폐기된 토큰이 쓰일 수 있다고 §4가 경고한다. 즉시 반영하려면 요청마다 물어야 한다.

n3r은 introspection 엔드포인트를 두지 않고 access token 수명을 짧게 잡아, 재발급 때 권한 시스템에서 현재 역할과 그룹을 다시 읽고 프로젝트 필터를 적용해 claim을 갱신한다.

- **이유**: 토큰만 보고 판정하는 앱과 오픈소스까지 요청마다 introspection을 부르게 하면 권한 서버 부하와 통신량이 커진다. 발표는 대부분의 오픈소스와 토큰만 보고 판정하는 리소스 서버가 introspection을 호출하지 않으므로, 모든 리소스 서버에 변경을 전파하는 수단은 결국 재발급뿐이라고 설명했다.
- **반영 지연**: 발표 기준 권한 변경은 access token 기준 최대 5분, ID Token 기준 최대 10분 늦게 반영될 수 있다.
- **대가**: 권한 회수가 즉시 차단으로 이어지지 않는다. ID Token으로 만든 세션에 권한을 저장하는 앱은 세션이 끝날 때까지 이전 권한으로 동작할 수 있다.

## 연동하는 앱의 체크리스트

| 항목 | 확인할 것 |
|---|---|
| redirect URI | 등록한 값과 정확히 일치시키고 토큰 교환 때도 같은 값을 보낸다 |
| 요청 보호 | `state`와 `nonce`를 쓰고 PKCE는 `code_challenge_method=S256`으로 명시한다 |
| ID Token | 서명, `iss`, `aud`에 자기 `client_id`가 있는지, `exp`, 보낸 `nonce`와의 일치를 검증한다(OIDC Core §2, §3.1.3.7) |
| access token을 직접 받는 API | `typ`(`at+jwt`), `iss`, `aud`, 서명(`alg: none` 거부), `exp`를 검증한다(RFC 9068 §4) |
| 사용자 키 | `sub`를 쓴다. OIDC Core §5.7은 `iss`와 `sub`의 조합만 사용자의 유일한 식별자로 보장하고 email 같은 claim을 식별자로 쓰지 말라고 한다. 다른 사내 시스템과 이어야 하면 별도 claim(n3r은 사번)을 쓴다 |
| 권한 판단 | `groups`나 역할 claim으로 하되 위의 반영 지연을 감안한다 |
| refresh | 같은 refresh token으로 동시에 갱신하면 하나만 성공하므로 인스턴스가 여럿이면 한 곳에서만 갱신한다(발표 기준) |

## 적용 판단

아래는 발표의 결정을 일반화한 제안이며 조직의 위협 모델에 맞춰 다시 판단한다.

- 사내에 프로젝트와 역할 체계가 이미 있으면 앱별 로그인보다 OP 제공이 중복 구현과 공유 계정을 줄인다.
- 동의 화면이 없으면 scope 대신 클라이언트 등록 주체와 `aud`로 토큰 범위를 제한하고, 판정도 토큰에 실린 claim으로만 해야 제한이 실제로 지켜진다.
- 권한 회수를 즉시 반영해야 하는 시스템(결제, 운영 권한)은 짧은 수명만으로 부족할 수 있다. 그 리소스 서버만 introspection이나 권한 재조회를 쓰고, 앱 세션에 권한을 오래 저장하지 않는 방안을 함께 검토한다.
- 토큰에 권한을 많이 실을수록 헤더 크기 제한에 걸릴 수 있으므로 userinfo 조회 같은 대체 경로를 남긴다.

## 출처

- [로그인 화면, 이제 만들지 마세요 - n3r OIDC — NAVER D2](https://www.youtube.com/watch?v=8Qewc762FuE)
- [IETF, RFC 9068: JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
- [IETF, RFC 7662: OAuth 2.0 Token Introspection](https://www.rfc-editor.org/rfc/rfc7662.html)
- [OpenID Foundation, OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [OpenID Foundation, OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

## 관련 문서

- [[OAuth2|OAuth 2.0과 OIDC]]
- [[JWT|JWT]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[OAuth2-Token-Exchange|OAuth 2.0 Token Exchange]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[Spring-Authorization-Server|Spring Authorization Server]]
