---
tags: [security, oauth, oauth2, par, authorization, fapi]
status: done
verified_at: 2026-10-12
category: "보안(Security)"
aliases: ["PAR", "Pushed Authorization Requests", "OAuth 2.0 PAR", "푸시 인가 요청"]
---

# OAuth 2.0 PAR (Pushed Authorization Requests)

PAR(RFC 9126, 2021-09, Standards Track)은 인가 요청 파라미터를 브라우저 리다이렉트 URL에 싣지 않고, 클라이언트가 인가 서버의 PAR 엔드포인트에 사용자 에이전트를 거치지 않는 직접 요청으로 먼저 등록한 뒤 돌려받은 일회용 참조값 `request_uri`만 브라우저로 넘기는 방식이다. [[OAuth2|Authorization Code 흐름]]에서 바뀌는 것은 인가 요청의 전달 경로다. 사용자 로그인과 동의, `redirect_uri`로 돌아오는 인가 응답과 토큰 교환은 기존 흐름을 따른다.

## 브라우저를 지나는 인가 요청의 약점

일반 인가 요청은 `scope`, `redirect_uri`, `state`, `code_challenge` 같은 파라미터를 URL query에 담아 사용자 에이전트를 거쳐 보낸다. RFC 9126은 이 방식의 약점을 세 가지로 든다.

- **암호학적 무결성과 진위 보호가 없다.** 공격자가 요청한 접근 범위(scope)를 바꾸거나, scope 값을 바꿔 결제 거래의 맥락을 뒤바꿀 수 있다. 클라이언트나 사용자가 일부 변경을 감지할 수단이 있어도 요청 초기에 변조를 막는 편이 더 견고하다.
- **기밀성을 보장할 수단이 없다.** 요청 데이터가 사용자 에이전트를 평문으로 지나므로 로그나 referrer로 새어 나갈 수 있다. 개인정보나 규제 대상 데이터가 요청에 들어 있으면 영향이 크다.
- **URL이 커진다.** 세분화된 권한 데이터가 필요한 경우처럼 요청 URL이 커지면 처리 오류가 날 수 있다.

PAR은 요청을 HTTPS POST로 인가 서버에 직접 보낸다. 인증 자격이 있는 클라이언트라면 인가 서버가 사용자와 상호작용하기 전에 클라이언트를 인증하고 잘못된 요청을 일찍 거절할 수 있다.

## 흐름

1. **Push**: 클라이언트가 PAR 엔드포인트(`https` 필수)에 평소의 인가 요청 파라미터를 `application/x-www-form-urlencoded` POST로 보낸다. 클라이언트 인증은 token endpoint와 같은 규칙을 따른다. 이 요청에는 `request_uri` 파라미터를 넣을 수 없고, 넣으면 인가 서버가 거부한다.
2. **검증과 응답**: 인가 서버는 클라이언트를 인증하고, 인가 엔드포인트에서 하던 것과 같은 검증(등록된 redirect URI와의 일치 등)을 한 뒤 `201 Created`와 JSON의 `request_uri`, `expires_in`을 돌려준다. `request_uri`는 그 요청을 보낸 클라이언트에 묶이고, 수명은 보통 짧다(RFC 예시 범위 5~600초).
3. **Redirect**: 클라이언트는 사용자를 인가 엔드포인트로 보내면서 `client_id`와 `request_uri`를 싣는다. 인가 서버는 참조값으로 저장한 요청을 찾아 일반 인가 요청처럼 처리한다.

```http
POST /as/par HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

response_type=code&client_id=CLIENT1234&state=<무작위 값>
&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
&scope=<필요한 범위>
&code_challenge=<S256 challenge>&code_challenge_method=S256
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer
&client_assertion=<클라이언트가 서명한 JWT>
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"request_uri": "urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c", "expires_in": 60}
```

```http
GET /authorize?client_id=CLIENT1234&request_uri=urn%3Aietf%3Aparams%3Aoauth%3Arequest_uri%3A6esc_11ACC5bwc014ltc14eY22c HTTP/1.1
Host: as.example.com
```

위 예시는 RFC 9126 §1.1, §2.2, §4의 예시를 바탕으로 `scope`와 PKCE 파라미터를 더해 하나의 흐름으로 재구성한 것이다. `urn:ietf:params:oauth:request_uri:`는 RFC 9126이 IANA에 등록한 URN 하위 네임스페이스이며, 인가 서버는 이 형식을 쓸 수 있다(MAY). 참조값으로 실제 요청 데이터를 찾는 방법도 인가 서버가 정한다.

## 인가 서버가 지킬 규칙

- **참조값 생성**: `request_uri`에는 암호학적으로 강한 의사난수로 만든 부분이 들어가야 한다(MUST). 공격자가 유효한 값을 추측해 재사용하면서 클라이언트를 가장하려 할 수 있으므로, 인가 서버는 JAR(RFC 9101 §10.2)의 request URI 엔트로피 고려사항을 반영해야 한다(MUST).
- **일회용**: 클라이언트는 `request_uri`를 한 번만 써야 한다(MUST). 인가 서버는 일회용으로 다루는 것이 권장되며(SHOULD), 사용자의 새로고침 같은 중복 요청은 허용할 수 있다. 만료된 값은 거부한다(MUST). 일회용 처리는 Request Object replay의 여지도 줄인다.
- **검증의 이월**: push 단계에서 하지 못한 검사는 인가 엔드포인트에서 반드시 한다. push 이후 클라이언트 정책이 바뀌었을 수 있으므로 인가 요청을 처리할 때 정책을 다시 대조하는 것이 권장된다.
- **Request Object와 함께 쓰기**: 더 높은 보증, 특히 암호학적으로 확인되는 부인 방지가 필요하면 서명한 Request Object(JAR, RFC 9101)를 `request` 파라미터로 push한다. 클라이언트 인증 방식에 필요한 파라미터는 form 요청에 그대로 두고, 인가 요청 자체의 파라미터는 JWT의 claim에 넣어야 한다(MUST). 인증 자격이 있는 클라이언트라면 인증된 `client_id`와 Request Object의 `client_id` claim이 다를 때 거부한다.
- **오류 응답**: token endpoint의 오류 형식(RFC 6749 §5.2)을 따르고, 코드는 §5.2나 §4.1.2.1의 적절한 값을 쓴다. redirect URI의 누락, 무효나 불일치처럼 §4.1.2.1이 자동 리다이렉트를 금지해 코드를 정의하지 않는 경우에는 `invalid_request`를 기본 코드로 쓸 수 있다. `consent_required`처럼 사용자 상호작용에 관한 오류는 반환하지 않는다. POST가 아닌 요청에는 405, 너무 큰 요청에는 413, 요청 한도 초과에는 429를 쓸 수 있다.
- **메타데이터**: 인가 서버는 `pushed_authorization_request_endpoint`로 엔드포인트를 알리고, `require_pushed_authorization_requests: true`로 PAR로 보낸 요청만 받겠다고 선언할 수 있다. 클라이언트 메타데이터의 같은 이름 필드는 그 클라이언트가 PAR로만 인가 요청을 시작한다는 뜻이다. 생략하면 둘 다 `false`다.

## redirect URI 완화는 인증된 클라이언트에만

인가 서버는 인증 자격을 가진 클라이언트에 한해 PAR 요청에서 redirect URI의 exact matching을 완화하고, 미리 등록하지 않은 redirect URI를 받을 수 있다. URI prefix를 강제하거나 query 파라미터만 바뀌게 하는 식으로 범위를 좁힐 수 있다. 새 redirect URI는 인증된 클라이언트의 push에서만 받아야 한다(MUST). 그렇지 않으면 open redirect 경로가 된다.

RFC 9126이 내세우는 이점 가운데 사용자 상호작용 전 클라이언트 인증과 redirect URI 완화는 클라이언트가 인증 자격을 가진 경우를 전제로 한다.

## PAR이 막지 못하는 것

- **인가 응답 단계**: 인가 응답(`code`, `state`)은 여전히 `redirect_uri`로 브라우저를 거쳐 돌아온다. code 탈취와 주입, Login CSRF 방어는 [[OAuth2#핵심 보안 파라미터|PKCE와 state 검증]]으로 계속 한다. FAPI 2.0 Security Profile(Final, 2025-02-22)도 PAR과 PKCE(`S256`)를 함께 요구한다.
- **발급된 토큰의 재사용**: access token 탈취와 replay는 별도 문제다. FAPI 2.0은 인가 서버가 sender-constrained access token(mTLS 또는 [[OAuth2#DPoP: access token을 클라이언트 키에 묶기|DPoP]])만 발급하도록 요구한다.
- **request_uri 바꿔치기**: 공격자가 한 요청의 `request_uri`를 가로채 다른 인가 요청에 끼워 넣을 수 있다. 예를 들어 높은 인증 보증을 요구하는 요청을 낮은 보증의 요청으로 바꿀 수 있다. 클라이언트는 push하는 요청에 PKCE, 고유한 `state`나 OIDC `nonce`를 넣어 막는다(SHOULD, RFC 9126 §7.5).

## FAPI 2.0에서의 위치

FAPI 2.0 Security Profile(Final, 2025-02-22)은 OAuth 2.0을 기반으로 한 OpenID Foundation의 API 보안 프로파일이다. 금융 분야를 중심으로 개발됐지만 e-health, e-government처럼 가치가 높은 데이터를 다루는 API 전반에 적용하도록 설계됐다. PAR에 관해서는 다음을 요구한다.

- 인가 서버는 클라이언트 인증을 거친 PAR을 지원하고, PAR 없이 들어온 인가 요청과 클라이언트 인증이 없는 PAR 요청을 거부한다.
- PAR 요청에 `redirect_uri`를 필수로 요구하고, `request_uri`의 `expires_in`을 600초 미만으로 발급한다.
- 클라이언트는 PAR을 쓰고 인가 엔드포인트에는 `client_id`와 `request_uri`만 보낸다.

다음은 RFC 9126이 든 위험을 일반 서비스의 도입 판단에 옮긴 기준이다. 결제처럼 scope나 요청 맥락이 바뀌면 피해가 큰 흐름, 인가 요청에 개인정보나 규제 대상 데이터가 들어가는 흐름, 세분화된 권한 데이터로 요청 URL이 커지는 흐름이 우선 후보이고, 인가 서버가 PAR을 지원하는지 함께 확인한다.

## 구현 지원

Spring Authorization Server는 1.5에서 PAR 지원을 추가했다(2025-05-20 1.5 GA 발표). Spring Security 7.1.x 소스 기준으로 PAR 엔드포인트는 기본 구성에 들어 있지 않아 `OAuth2AuthorizationServerConfigurer`의 `pushedAuthorizationRequestEndpoint(...)`를 호출해야 켜진다. 켰을 때의 경로 기본값은 2026-10-12 확인한 1.5.8 레퍼런스와 Spring Security 7.1.1 레퍼런스 모두 `/oauth2/par`이고, `AuthorizationServerSettings`의 `pushedAuthorizationRequestEndpoint("...")`로 바꾼다. 기본 검증기는 `redirect_uri`와 `scope`를 검사한다. 버전 이동과 설정 방식은 [[Spring-Authorization-Server]]를 따른다.

## 면접과 운영 체크포인트

- 인가 요청을 브라우저로 보낼 때 생기는 무결성, 기밀성과 URL 길이 문제를 PAR이 어떻게 줄이는지 흐름으로 설명할 수 있는가.
- PAR을 써도 PKCE와 `state` 검증이 여전히 필요한 이유(인가 응답은 브라우저를 지나고, `request_uri` 바꿔치기도 이 값들로 막는다)를 말할 수 있는가.
- `request_uri`의 일회용, 짧은 수명, 클라이언트 바인딩과 만료 거부를 인가 서버가 실제로 검사하는가.
- 인증된 클라이언트에만 새 redirect URI를 허용하고, 그 범위를 prefix나 query 변경으로 제한했는가.
- `require_pushed_authorization_requests`로 PAR을 강제하면 PAR을 지원하지 않는 기존 클라이언트가 실패하므로 클라이언트별 전환 순서를 계획했는가.

## 출처

- [IETF, RFC 9126: OAuth 2.0 Pushed Authorization Requests](https://www.rfc-editor.org/rfc/rfc9126.html)
- [IETF, RFC 9101: The OAuth 2.0 Authorization Framework: JWT-Secured Authorization Request (JAR)](https://www.rfc-editor.org/rfc/rfc9101.html)
- [OpenID Foundation, FAPI 2.0 Security Profile (Final)](https://openid.net/specs/fapi-security-profile-2_0-final.html)
- [Spring Authorization Server 1.5 goes GA — spring.io blog](https://spring.io/blog/2025/05/20/spring-authorization-server-1-5-goes-ga)
- [Spring Authorization Server 1.5.8, Protocol Endpoints](https://docs.spring.io/spring-authorization-server/reference/protocol-endpoints.html) — 2026-10-12 확인 시 current가 1.5.8
- [Spring Authorization Server 1.5.8, Configuration Model](https://docs.spring.io/spring-authorization-server/reference/configuration-model.html) — 2026-10-12 확인 시 current가 1.5.8
- [Spring Security 7.1.1, Authorization Server Configuration Model](https://docs.spring.io/spring-security/reference/servlet/oauth2/authorization-server/configuration-model.html) — 2026-10-12 확인 시 current가 7.1.1
- [OAuth2AuthorizationServerConfigurer.java (7.1.x) — GitHub, spring-projects/spring-security](https://github.com/spring-projects/spring-security/blob/7.1.x/config/src/main/java/org/springframework/security/config/annotation/web/configurers/oauth2/server/authorization/OAuth2AuthorizationServerConfigurer.java) — 기본 configurer 목록과 PAR configurer 추가 조건

## 관련 문서

- [[OAuth2|OAuth 2.0 (Authorization Code와 PKCE, DPoP)]]
- [[Spring-Authorization-Server|Spring Authorization Server]]
- [[OAuth2-Token-Exchange|OAuth 2.0 Token Exchange]]
- [[JWT|JWT]]
