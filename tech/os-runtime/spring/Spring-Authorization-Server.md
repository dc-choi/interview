---
tags: [spring, security, oauth2, authorization-server, oidc]
status: done
category: "OS & Runtime"
aliases: ["Spring Authorization Server", "스프링 인가 서버", "OAuth2 Authorization Server"]
---

# Spring Authorization Server

Spring Security 팀이 만드는 OAuth2 인가 서버 프레임워크. Spring Boot 웹 앱에 핵심 의존성 하나(`spring-security-oauth2-authorization-server`)를 추가하면 `/oauth2/authorize`, `/oauth2/token`, `/oauth2/jwks` 같은 표준 엔드포인트를 갖춘 인가 서버를 직접 띄울 수 있다. EOL된 구 Spring Security OAuth 프로젝트의 후속이다.

카카오, 구글 소셜 로그인에서 제공자 쪽이 무엇을 하는지 로컬에서 재현할 수 있어 OAuth 학습용으로 좋고, 실무에서는 사내 IdP나 서비스 간 토큰 발급(M2M) 구축에 쓰인다. 프로토콜 자체는 [[OAuth2]] 참조. 아래 코드는 Spring Boot 3.3 + Authorization Server 1.3 기준.

## 최소 구성 요소

| 빈 | 역할 |
|---|---|
| SecurityFilterChain (@Order 1) | 인가 서버 엔드포인트 보안 — `OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http)` |
| SecurityFilterChain (@Order 2) | 나머지 요청 보안 — formLogin 등 Resource Owner 로그인 |
| RegisteredClientRepository | Client 등록부 — client_id/secret, grant type, redirect_uri, scope |
| UserDetailsService | Resource Owner 계정 저장소 |
| JWKSource | 토큰 서명 키 — RSA 키쌍으로 JWT access_token/id_token 서명 |
| AuthorizationServerSettings | issuer, 엔드포인트 경로 등 서버 설정 (기본값으로 시작 가능) |

### 필터 체인이 두 개인 이유

인가 서버 엔드포인트(`/oauth2/**`)와 일반 애플리케이션 보안(로그인 폼 등)은 요구 사항이 다르다. `@Order`로 인가 서버 체인을 먼저 매칭시키고, 미인증 사용자가 인가 요청을 보내면 `LoginUrlAuthenticationEntryPoint`가 로그인 페이지로 보낸다. 로그인에 성공하면 중단됐던 authorize 요청이 이어진다.

### RegisteredClient — 프로토콜 개념과 1:1 대응

```java
RegisteredClient.withId(UUID.randomUUID().toString())
    .clientId("dingco-web")
    .clientSecret(encoder.encode("dingco-secret"))
    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
    .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
    .redirectUri("http://127.0.0.1:9000/callback")
    .scope(OidcScopes.OPENID).scope(OidcScopes.PROFILE).scope("read")
    .clientSettings(ClientSettings.builder().requireAuthorizationConsent(true).build())
    .build();
```

- client_secret도 사용자 비밀번호처럼 PasswordEncoder(bcrypt 등)로 해시해 저장한다 — [[Password-Hashing]]과 같은 원리. 토큰 교환 때 Client가 보낸 평문 secret을 해시 비교로 검증한다
- redirect_uri는 사전 등록된 값만 허용된다 — code 탈취 경로 차단 ([[OAuth2]] 핵심 보안 파라미터)
- `requireAuthorizationConsent(true)`면 로그인 뒤 동의(consent) 화면을 거쳐야 code가 발급된다
- 데모는 `InMemoryRegisteredClientRepository`, 운영은 JDBC 구현으로 교체한다

### 동의(consent) 화면 커스터마이징

`.authorizationEndpoint(a -> a.consentPage("/oauth2/consent"))`로 자체 화면을 지정한다. 컨트롤러는 쿼리 파라미터로 client_id, scope, state를 받아 scope 목록을 체크박스로 보여주고, 승인 결과를 client_id, state와 함께 `/oauth2/authorize`로 다시 POST한다. state가 hidden 필드로 왕복하는 것을 코드에서 직접 볼 수 있다.

### OIDC와 토큰 발급

`.oidc(Customizer.withDefaults())` 한 줄로 OpenID Connect가 활성화되어, scope에 openid가 있으면 토큰 응답에 id_token이 포함된다. 응답 구성: access_token(JWT), id_token, (grant에 REFRESH_TOKEN이 있으면) refresh_token.

서명 키는 JWKSource 빈으로 공급한다. 데모에서는 부팅 시 RSA 2048 키쌍을 생성하는데, 재시작하면 키가 바뀌어 이전에 발급한 토큰의 서명 검증이 실패한다. 운영에서는 키를 영속화하고 회전(rotation)을 설계해야 하며, 검증 측은 `/oauth2/jwks`로 공개키를 가져간다.

## 전체 흐름 (로컬 재현)

1. 브라우저: `GET /oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid profile` → 미로그인이면 /login으로
2. Resource Owner 로그인 (formLogin, UserDetailsService 검증)
3. 동의 화면에서 scope 승인 → `POST /oauth2/authorize`
4. redirect_uri로 authorization_code 발급 (`/callback?code=...`)
5. Client 서버: `POST /oauth2/token` — `Authorization: Basic base64(client_id:client_secret)` 헤더 + `grant_type=authorization_code&code=...&redirect_uri=...` 폼
6. access_token(JWT), id_token, refresh_token 응답
7. id_token의 payload는 base64url 디코드로 클레임 확인 ([[JWT]] 구조 — 일반 Base64가 아니라 `Base64.getUrlDecoder()`)

## 면접 체크포인트

- 인가 서버가 기본 제공하는 엔드포인트와, Client/Resource Owner/인가 서버의 역할 분리
- SecurityFilterChain을 @Order로 나누는 이유
- client_secret을 해시로 저장하는 이유 (사용자 비밀번호와 같은 원리)
- 토큰 서명 키(JWKS)를 영속화하지 않으면 생기는 일 (재시작 시 기존 토큰 전부 검증 실패)
- 동의 화면에서 state가 왕복하는 이유 (CSRF 방지 — [[OAuth2]])

## 출처

- [dingco-web-security — dingcodingco (GitHub, 강의 실습 소스)](https://github.com/dingcodingco/dingco-web-security)
- [Spring Authorization Server Reference — spring.io](https://docs.spring.io/spring-authorization-server/reference/index.html)
- [Spring Security OAuth Reaches End of Life — spring.io blog](https://spring.io/blog/2022/06/01/spring-security-oauth-reaches-end-of-life)

## 관련 문서

- [[OAuth2|OAuth2 / OIDC]]
- [[JWT|JWT]]
- [[Password-Hashing|패스워드 해싱]]
- [[Spring-Boot-Essentials|Spring Boot Essentials]]
