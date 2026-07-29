---
tags: [security, oauth2, token-exchange, keycloak, impersonation, delegation]
status: done
verified_at: 2026-07-29
category: "Security - 인증"
aliases: ["OAuth 2.0 Token Exchange", "토큰 교환", "Keycloak Token Exchange"]
---

# OAuth 2.0 Token Exchange와 Keycloak

OAuth 2.0 Token Exchange는 클라이언트가 기존 보안 토큰을 인가 서버에 제출하고, 다른 대상과 권한 범위에 맞는 새 토큰을 받는 Security Token Service 패턴이다. RFC 8693이 grant type과 요청 파라미터를 정의한다.

Authorization Code를 access token으로 바꾸는 일반 로그인 단계도 코드 교환이라고 부르지만, RFC 8693 Token Exchange와는 다른 절차다. Token Exchange는 이미 존재하는 신원이나 권한 증명을 다른 보안 컨텍스트의 토큰으로 바꾼다.

## Mental model

프런트 서비스가 받은 사용자 토큰을 그대로 모든 백엔드에 전달하면 토큰의 대상과 권한이 너무 넓어질 수 있다. 토큰 교환은 호출 대상에 맞는 자격증명을 다시 발급하는 경계이며, 보통 audience와 scope를 좁히는 데 사용한다.

```text
사용자 ── token A, aud=frontend ──> Frontend API
                                      │
                                      ├─ token A + client 인증
                                      v
                                  Authorization Server
                                      │
                                      └─ token B, aud=orders, scope=orders:read
                                                   │
                                                   v
                                               Orders API
```

입력 토큰은 대신 행동할 subject와 권한을 나타내고, 요청 클라이언트의 자격증명은 누가 교환을 요청하는지 증명한다. 출력 토큰에는 필요한 대상과 권한만 담는 것이 설계 목표다.

## RFC 8693 요청 계약

토큰 엔드포인트에 `application/x-www-form-urlencoded`로 요청한다.

| 파라미터 | 의미 |
|---|---|
| `grant_type` | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `subject_token` | 대신 행동할 주체를 증명하는 기존 보안 토큰 |
| `subject_token_type` | 입력 토큰의 형식 |
| `requested_token_type` | 원하는 출력 토큰 형식 |
| `audience` 또는 `resource` | 출력 토큰을 사용할 대상 |
| `scope` | 출력 토큰에 필요한 권한 범위 |
| `actor_token` | 위임에서 실제로 행동하는 주체의 토큰 |

RFC 8693에서 `subject_token`과 `subject_token_type`은 필수다. 사용자 식별자 문자열만으로 토큰을 발급하는 방식은 이 표준 요청이 아니다.

토큰 교환은 입력 토큰을 자동으로 폐기하지 않는다. 입력 토큰과 출력 토큰의 만료와 취소 연결은 인가 서버 구현과 운영 정책에 달려 있다.

## 가장과 위임

| 모델 | 발급 토큰이 표현하는 것 | 감사 관점 |
|---|---|---|
| 가장, impersonation | 행위자가 사용자 본인처럼 동작 | 실제 행위자가 토큰에서 사라질 수 있음 |
| 위임, delegation | 사용자 권한으로 별도 행위자가 동작 | JWT의 `act` claim 등으로 행위자를 추적 가능 |

위임은 사용자와 현재 행위자를 구분할 수 있어 감사와 정책 적용에 유리하다. 가장이 필요한 경우에는 누가, 왜, 어떤 사용자를 가장했는지 별도 감사 로그를 남겨야 한다.

## Keycloak Standard Token Exchange V2

Keycloak 26.6.4 기준 `token-exchange-standard:v2`는 fully supported 상태이며 서버 기능이 기본 활성화된다. 요청 클라이언트는 confidential client여야 하고, 해당 클라이언트의 Standard token exchange 설정과 클라이언트 인증을 구성해야 한다.

V2의 기본 사용 사례는 같은 realm에서 발급된 access token을 다른 내부 대상에 맞는 토큰으로 바꾸는 것이다.

```bash
curl -u 'requester-client:<CLIENT_SECRET>' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=urn:ietf:params:oauth:grant-type:token-exchange' \
  -d 'subject_token=<ACCESS_TOKEN>' \
  -d 'subject_token_type=urn:ietf:params:oauth:token-type:access_token' \
  -d 'requested_token_type=urn:ietf:params:oauth:token-type:access_token' \
  -d 'audience=orders-api' \
  'https://id.example.com/realms/example/protocol/openid-connect/token'
```

### 인가와 다운스코핑

- `subject_token`은 요청 클라이언트를 `aud`에 포함해야 한다. 요청 클라이언트가 자기 토큰을 교환하는 경우는 예외다.
- `audience`는 기존에 계산된 audience와 client role을 필터링한다. 없는 권한을 새로 부여하는 파라미터가 아니다.
- `scope`는 요청 클라이언트의 optional client scope를 추가할 수 있다. 토큰 교환이 항상 다운스코핑만 수행한다고 가정하면 안 된다.
- 입력 토큰보다 넓은 scope를 금지하려면 `downscope-assertion-grant-enforcer` client policy executor를 적용한다.
- 대상 API는 서명, `iss`, `aud`, `exp`, scope와 role을 모두 검증한다.

Keycloak V2는 access token 간 취소 체인을 제공하지 않는다. 입력 access token을 취소해도 이미 발급된 출력 access token이 함께 취소된다고 가정할 수 없으므로 수명을 짧게 제한한다.

## Legacy Token Exchange V1

Keycloak 26.6.4 기준 `token-exchange:v1`은 preview이면서 deprecated 상태이고 기본 비활성화된다. 이 기능의 권한 모델에는 deprecated된 `admin-fine-grained-authz:v1`, 즉 FGAP v1도 필요하다. 표준 V2와 달리 외부 토큰 교환과 사용자 가장 같은 확장 기능을 제공하지만, 새 내부 시스템의 일반 토큰 교환은 V2를 우선한다.

### Direct Naked Impersonation

V1은 `subject_token` 없이 `requested_subject`에 username이나 user ID만 넣어 토큰을 발급하는 Direct Naked Impersonation을 지원한다. 요청 클라이언트는 confidential client여야 하고 다음 권한을 받아야 한다.

- 지정한 사용자를 가장할 권한
- `audience`를 지정했다면 해당 target client로 교환할 권한

이 권한을 가진 클라이언트의 자격증명이 유출되면 허용 범위의 사용자를 가장할 수 있다. Direct Naked Impersonation은 클라이언트에 큰 신뢰를 부여하는 예외이며 일반 SSO의 기본 흐름으로 사용하지 않는다.

## 사용자 ID만 전달받는 연동

사용자 ID는 식별자이지 인증 증명이 아니다. 외부 시스템이 문자열 하나를 보냈다는 사실만으로 해당 사용자가 로그인했다고 판단할 수 없다.

| 외부 시스템이 제공할 수 있는 것 | 우선 검토할 흐름 |
|---|---|
| OIDC Authorization Code | Authorization Code + PKCE 또는 일반 OIDC federation |
| 서명된 단기 JWT나 SAML assertion | issuer, audience, 만료와 replay를 검증하는 federation, identity broker 또는 authorization grant |
| 외부 access token | Identity Broker나 JWT Authorization Grant로 내부 Keycloak 토큰을 만든 뒤 표준 V2 적용 |
| 사용자 ID만 있는 서버 요청 | 사용자 인증이 아닌 파트너 시스템 신뢰에 기반한 고위험 가장 |
| 사용자 컨텍스트가 없는 M2M 호출 | Client Credentials |

사용자 ID만 가능한 경우 mTLS나 client credentials는 파트너 시스템을 인증할 뿐 최종 사용자를 증명하지 않는다. 파트너가 사용자 인증 결과에 책임진다는 신뢰 계약과 기술적 통제가 별도로 필요하다.

## 레거시 가장을 피할 수 없을 때

- 외부 식별자를 내부 사용자 ID로 서버에서 매핑하고, 요청자가 내부 ID를 직접 선택하지 못하게 한다.
- 관리자와 고권한 계정은 가장 대상에서 제외하고 허용 사용자와 target을 최소화한다.
- requester client를 용도별로 분리하고 secret을 시크릿 저장소에서 보관, 회전한다.
- 가능하면 mTLS와 네트워크 접근 제어를 함께 사용하되 사용자 인증의 대체물로 보지 않는다.
- access token은 단일 audience, 최소 role과 scope, 짧은 만료를 사용하고 refresh token은 발급하지 않는다.
- 토큰을 URL, 리다이렉트 쿼리, 브라우저 영속 저장소나 로그에 노출하지 않는다.
- 브라우저 전달이 필요하면 BFF의 HttpOnly 세션이나 짧은 일회용 code를 우선 검토한다.
- requester, partner identity, requested subject, target, 근거, 결과와 request ID를 감사 로그에 남긴다.
- 발급량 급증, 고권한 사용자 시도, 반복 실패를 탐지하고 즉시 client 자격증명을 폐기할 절차를 둔다.
- V1 제거에 대비해 사용 지점, 권한과 대체 프로토콜을 마이그레이션 계획에 포함한다.

## 선택 체크리스트

토큰 교환을 도입하기 전에 다음 질문에 답한다.

1. 기존 토큰을 대상별로 좁혀야 하는가, 아니면 일반 로그인이나 M2M 인증 문제인가?
2. `subject_token`이 실제 사용자 인증을 증명하며 issuer, audience와 만료를 검증할 수 있는가?
3. 가장과 위임 중 무엇이며 실제 행위자를 감사할 수 있는가?
4. 출력 토큰이 입력보다 넓은 scope나 audience를 얻지 않는가?
5. 입력 토큰 취소 후 출력 토큰이 살아 있어도 감당할 수 있는 수명인가?
6. requester 자격증명이 유출됐을 때 가장 가능한 사용자와 서비스 범위는 어디까지인가?

## 면접 체크포인트

- Authorization Code 교환과 RFC 8693 Token Exchange의 차이
- `subject_token`, `actor_token`, `audience`, `scope`의 역할
- 가장과 위임의 감사 가능성 차이
- 사용자 ID가 인증 증명이 아닌 이유
- Keycloak V2와 V1 Direct Naked Impersonation의 지원 상태와 위험
- token exchange가 항상 다운스코핑인 것은 아닌 이유
- 입력 access token 취소가 출력 access token 취소를 보장하지 않는 이유

## 출처

- [RFC 8693 - OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html)
- [Keycloak 26.6.4 - Configuring and using token exchange](https://github.com/keycloak/keycloak/blob/26.6.4/docs/guides/securing-apps/token-exchange.adoc)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [넥스트리 - Keycloak 토큰 교환으로 인증 시스템 구축](https://www.nextree.io/keycloak-tokeun-gyohwaneuro-injeung-siseutem-gucug/)

## 관련 문서

- [[OAuth2|OAuth 2.0과 OIDC]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[JWT|JWT]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Secret-Management|Secret Management]]
