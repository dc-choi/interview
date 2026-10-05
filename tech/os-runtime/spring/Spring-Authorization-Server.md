---
tags: [spring, security, oauth2, authorization-server, oidc]
status: done
verified_at: 2026-10-06
category: "OS & Runtime"
aliases: ["Spring Authorization Server", "스프링 인가 서버", "OAuth2 Authorization Server"]
---

# Spring Authorization Server

Spring Security 팀이 만드는 OAuth2 인가 서버 프레임워크. 인가 서버 모듈(`spring-security-oauth2-authorization-server`)을 Spring Boot 웹 앱에 추가하면 `/oauth2/authorize`, `/oauth2/token`, `/oauth2/jwks` 같은 표준 엔드포인트를 갖춘 인가 서버를 직접 띄울 수 있다. 이 모듈용 스타터는 Spring Boot 3.1부터 있었고, 작은 모듈로 나뉜 Spring Boot 4에서는 서드파티 의존성만으로 동작하던 기능도 스타터가 필요할 수 있으므로 스타터로 추가한다(아래 절). EOL된 구 Spring Security OAuth 프로젝트의 후속이며, Spring Security 7.0부터는 별도 프로젝트가 아니라 Spring Security의 모듈이다.

카카오, 구글 소셜 로그인에서 제공자 쪽이 무엇을 하는지 로컬에서 재현할 수 있어 OAuth 학습용으로 좋고, 실무에서는 사내 IdP나 서비스 간 토큰 발급(M2M) 구축에 쓰인다. 프로토콜 자체는 [[OAuth2]] 참조. 아래 구성 요소와 흐름의 코드는 Spring Boot 3.3 + Authorization Server 1.3 기준이며, 현재 버전의 설정 방식과 지원 기간은 바로 아래 절을 따른다.

## 버전과 프로젝트 위치

2026-10-06에 Spring 공식 블로그, Spring Security 레퍼런스와 API 문서, 인가 서버 1.5 API 문서, Spring Boot 릴리스 노트와 마이그레이션 가이드, spring.io 프로젝트 API, GitHub 저장소와 소스로 확인한 내용이다.

- **Spring Security 7.0부터 Spring Security의 모듈이다.** 2025-09-11 발표에 따르면 인가 서버가 충분히 성숙해 OAuth2 Client와 인가 서버를 한 프로젝트에서 다루도록 옮겼다. 소스, javadoc, 레퍼런스 문서와 OAuth2 관련 이슈, PR은 Spring Security 저장소에서 관리한다. Spring Security 7.0의 What's New도 Modules 항목에 같은 변경을 적는다. 독립 저장소의 README는 1.5.x를 마지막 세대로 적는다. 저장소는 2026-08-26에 보관(archived)돼 읽기 전용이 됐고 지금은 `spring-attic` 조직으로 옮겨졌다.
- **모듈 좌표는 버전만 바뀐다.** groupId와 artifactId는 그대로(`org.springframework.security:spring-security-oauth2-authorization-server`)이고 버전이 Spring Security 버전을 따른다(7.0.0부터). 클래스 이름과 패키지 위치는 대부분 유지되지만 일부 패키지가 옮겨졌으므로 업그레이드 때 깨진 import부터 확인한다. 스타터는 다르다. Spring Boot 4.0 마이그레이션 가이드에 따르면 스타터 이름은 `spring-boot-starter-security-oauth2-authorization-server`로 바뀌었고 기존 `spring-boot-starter-oauth2-authorization-server`는 deprecated로 남는다. 7.1 레퍼런스의 시작 예시는 아직 기존 이름을 쓰므로 Boot 문서의 새 이름과 함께 확인한다. 인가 서버 버전은 Spring Security 버전과 함께 움직이므로 고정할 때도 `spring-authorization-server.version` 대신 `spring-security.version`을 쓴다.
- **설정 방식이 바뀌었다.** 아래 표의 `applyDefaultSecurity(http)`는 1.5.x API 문서에서 2.0 제거 예정으로 표시됐고, 그 문서는 1.4에 추가된 `http.with(OAuth2AuthorizationServerConfigurer.authorizationServer(), ...)`를 대안으로 안내했다. 7.x에서는 둘 다 쓸 수 없다. `OAuth2AuthorizationServerConfiguration`은 `org.springframework.security.config.annotation.web.configuration` 패키지로 옮겨지며 `applyDefaultSecurity`가 없어졌고, `OAuth2AuthorizationServerConfigurer`도 `org.springframework.security.config.annotation.web.configurers.oauth2.server.authorization` 패키지로 옮겨져 정적 `authorizationServer()`가 없다(7.1.1 API). 1.x 설정을 그대로 두고 올리면 컴파일 오류가 나므로, Spring Security 7.1 레퍼런스의 시작 예시처럼 `http.oauth2AuthorizationServer(...)`로 인가 서버 엔드포인트만 매칭하는 체인을 만든다.

```java
http
    .oauth2AuthorizationServer(authorizationServer -> {
        http.securityMatcher(authorizationServer.getEndpointsMatcher());
        authorizationServer.oidc(Customizer.withDefaults());
    })
    .authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
    .exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
        new LoginUrlAuthenticationEntryPoint("/login"),
        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)));
```

- **PKCE가 기본값이 됐다.** Spring Security 7.0의 What's New는 인가 서버에서 PKCE를 기본으로 켰다고 적고, 7.1.1 API의 `ClientSettings.isRequireProofKey()` 기본값도 `true`다. 기본 설정에서는 PKCE가 필수이므로, 아래 흐름처럼 `code_challenge`와 `code_verifier` 없이 인가 코드를 교환하던 클라이언트는 7.x로 올리기 전에 PKCE를 보내게 하거나 그 클라이언트의 `ClientSettings`에서 `requireProofKey(false)`로 명시적으로 끈다. 기본값은 `ClientSettings.builder()`로 만드는 설정에 들어간다. `JdbcRegisteredClientRepository`는 저장된 설정을 `ClientSettings.withSettings(...)`로 다시 만들고 이 경로는 기본값을 넣지 않으므로, 저장소에 `requireProofKey`가 false로 저장된 클라이언트는 그 값을 유지한다.
- **1.x 지원 기간:** 마지막 세대인 1.5.x는 OSS 지원이 2026-06-30에 끝났고 상용 지원은 2032-06-30까지다. 1.4.x의 상용 지원은 2026-12-31에 끝나고, 아래 코드의 기준인 1.3.x는 OSS(2025-06-30)와 상용(2026-06-30) 지원이 모두 끝났다. spring.io 세대 API에서 Spring Security 7.0.x는 Spring Boot 4.0.x, 7.1.x는 4.1.x와 짝을 이루므로 7.x 전환은 Boot 4 전환과 함께 계획한다([[Java-Spring-Stack-Migration|Java와 Spring 스택 마이그레이션]]).
- **DPoP:** 1.5에서 OAuth 2.0 DPoP 지원이 추가됐다(2025-05-20 1.5 GA 발표). 토큰을 클라이언트 키에 묶는 프로토콜 동작은 [[OAuth2#DPoP: access token을 클라이언트 키에 묶기|OAuth2의 DPoP]]에 정리했다. nonce 같은 선택 기능의 지원 여부는 사용하는 버전의 문서로 확인한다.

## 최소 구성 요소

| 빈 | 역할 |
|---|---|
| SecurityFilterChain (@Order 1) | 인가 서버 엔드포인트 보안 — 1.3 기준 `OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http)`, 현재 방식은 위 절 |
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

- client_secret도 사용자 비밀번호처럼 PasswordEncoder(bcrypt 등)로 해시해 저장한다 — [[Password-Hashing]]과 같은 원리. Authorization Code 교환 때 Client가 보낸 평문 secret을 해시 비교로 검증한다
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
- Spring Security 7.0 이후 인가 서버가 어느 프로젝트에 있고, 1.5.x에 남은 서비스의 OSS 지원이 언제 끝났는지, 7.x에서 PKCE 기본값이 바뀌어 기존 클라이언트에 무엇을 확인해야 하는지

## 출처

- [dingco-web-security — dingcodingco (GitHub, 강의 실습 소스)](https://github.com/dingcodingco/dingco-web-security)
- [Spring Authorization Server Reference — spring.io](https://docs.spring.io/spring-authorization-server/reference/index.html)
- [Spring Security OAuth Reaches End of Life — spring.io blog](https://spring.io/blog/2022/06/01/spring-security-oauth-reaches-end-of-life)
- [Spring Authorization Server moving to Spring Security 7.0 — spring.io blog](https://spring.io/blog/2025/09/11/spring-authorization-server-moving-to-spring-security-7-0/)
- [Spring Authorization Server 1.5 goes GA — spring.io blog](https://spring.io/blog/2025/05/20/spring-authorization-server-1-5-goes-ga)
- [What's New in Spring Security 7.0 — spring.io](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- [OAuth 2.0 Authorization Server, Getting Started (7.1) — spring.io](https://docs.spring.io/spring-security/reference/7.1/servlet/oauth2/authorization-server/getting-started.html)
- [OAuth2AuthorizationServerConfiguration, Spring Security 7.1.1 API — spring.io](https://docs.spring.io/spring-security/reference/7.1/api/java/org/springframework/security/config/annotation/web/configuration/OAuth2AuthorizationServerConfiguration.html)
- [OAuth2AuthorizationServerConfigurer, Spring Security 7.1.1 API — spring.io](https://docs.spring.io/spring-security/reference/7.1/api/java/org/springframework/security/config/annotation/web/configurers/oauth2/server/authorization/OAuth2AuthorizationServerConfigurer.html)
- [ClientSettings, Spring Security 7.1.1 API — spring.io](https://docs.spring.io/spring-security/reference/7.1/api/java/org/springframework/security/oauth2/server/authorization/settings/ClientSettings.html)
- [OAuth2AuthorizationServerConfigurer, Spring Authorization Server 1.5.3 API — spring.io](https://docs.spring.io/spring-authorization-server/docs/current/api/org/springframework/security/oauth2/server/authorization/config/annotation/web/configurers/OAuth2AuthorizationServerConfigurer.html)
- [Spring Authorization Server API, Deprecated List — spring.io](https://docs.spring.io/spring-authorization-server/docs/current/api/deprecated-list.html)
- [Spring Authorization Server generations — spring.io API](https://api.spring.io/projects/spring-authorization-server/generations)
- [Spring Security generations — spring.io API](https://api.spring.io/projects/spring-security/generations)
- [spring-attic/spring-authorization-server README — GitHub](https://github.com/spring-attic/spring-authorization-server)
- [ClientSettings.java (7.1.x) — GitHub](https://github.com/spring-projects/spring-security/blob/7.1.x/oauth2/oauth2-authorization-server/src/main/java/org/springframework/security/oauth2/server/authorization/settings/ClientSettings.java)
- [JdbcRegisteredClientRepository.java (7.1.x) — GitHub](https://github.com/spring-projects/spring-security/blob/7.1.x/oauth2/oauth2-authorization-server/src/main/java/org/springframework/security/oauth2/server/authorization/client/JdbcRegisteredClientRepository.java)
- [Spring Boot 3.1 Release Notes — GitHub Wiki](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.1-Release-Notes)
- [Spring Boot 4.0 Migration Guide — GitHub Wiki](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)

## 관련 문서

- [[OAuth2|OAuth2 / OIDC]]
- [[JWT|JWT]]
- [[Password-Hashing|패스워드 해싱]]
- [[Spring-Boot-Essentials|Spring Boot Essentials]]
- [[Spring-Security|Spring Security]]
