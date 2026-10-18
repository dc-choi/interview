---
tags: [palantir, foundry, oauth, security, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry OAuth와 외부 애플리케이션 접근 계약"]
---

# Foundry OAuth와 외부 애플리케이션 접근 계약

외부 애플리케이션의 등록, Org enablement와 사용자의 authorization은 별도 상태다. Client ID가 있다는 사실만으로 데이터 접근이 생기지 않는다. 관리에는 Developer Console을 우선 안내하며 Control Panel은 일부 환경의 이전 관리 경로다.

## 등록과 접근의 교집합

등록은 managing Org와 client identity를 만든다. 등록한 Org도 자동 enable되지 않는다. Enablement에는 Manage OAuth2 clients 권한과 Org discovery가 필요하며 다른 Org에서 사용할 때에도 해당 Org의 설정이 필요하다.

Authorization-code 흐름은 사용자에게 허용된 Project와 app에 enable된 Project의 교집합, 사용자 marking eligibility와 app 제한, 요청 scope의 경계에서 동작한다. Unmarked resource가 marking 제한만으로 차단된다고 가정하지 않는다. Client-credentials 흐름은 client ID 이름의 service user를 만들며 처음에는 접근 권한이 없다. 별도로 부여한 service-user 권한으로 실행하고 일반 사용자를 대리하지 않는다.

Org-level consent는 그 Org 사용자들의 개별 consent prompt를 생략할 수 있으며 사용자에게 별도 알림이 가지 않는다고 설명한다. 이를 일반 기본값으로 채택하지 않고 명시한 사용 목적과 권한 경계를 검토한다. Enablement를 껐다 켜면 이전 authorization이 무효가 되어 사용자가 다시 authorize해야 한다.

## Client 종류와 PKCE

Confidential client는 server에서 secret을 보호하며 authorization code와 client credentials를 지원한다. Public browser/native client는 배포된 secret을 보호할 수 없으므로 PKCE를 쓰는 authorization code만 지원하고 client credentials를 사용할 수 없다.

PKCE verifier는 암호학적으로 무작위인 43~128자이며 허용 문자는 영문, 숫자와 `-._~`이다. Challenge는 SHA-256 결과를 padding 없는 base64url로 인코딩하고 method는 S256이다. Public client에는 필수이며 confidential client에도 권장한다.

Authorization endpoint는 `GET /multipass/api/oauth2/authorize`이다. `response_type=code`, client ID, 등록한 redirect URI, space-separated scope와 state를 사용한다. Redirect URI를 생략하면 첫 등록 URI를 쓴다. 돌아온 state를 원래 값과 대조해 CSRF를 방어한다. Authorization code는 10분 후 만료한다.

Token endpoint는 `POST /multipass/api/oauth2/token`이며 form URL encoding을 쓴다. Grant type은 authorization_code, refresh_token, client_credentials이다. Code/refresh token/secret/verifier는 grant와 client 종류에 따라 달라지고 authorization 요청에 redirect URI를 넣었다면 token 교환에도 일치하는 값을 넣어야 한다.

## Token 수명과 갱신

Token 응답은 access_token, token_type, expires_in과 선택적인 refresh_token을 포함한다. expires_in은 수명 초 단위지만 reference는 type을 string으로 표기한다. Refresh token은 authorization-code 요청에 offline_access를 포함해야 받을 수 있다.

Refresh마다 token이 회전하므로 새 access token과 refresh token을 함께 보존한다. 이전 refresh token 재사용의 1분 grace는 일시적인 retry를 위한 것이다. 그 뒤 재사용하면 해당 grant의 access token을 무효화하고 새 authorization이 필요하다고 설명한다. 사용하지 않은 refresh token은 30일 후 invalid가 된다. Reference의 refresh 설명 일부는 access token이라고 부르지만 request table의 refresh_token 입력과 혼동하지 않는다.

Authorization error 중 access_denied는 redirect로 전달하며 다른 오류는 HTML error page로 표시한다고 명시한다. invalid_request, unauthorized_client, unsupported_response_type, invalid_scope, server_error를 일반 성공 callback처럼 처리하지 않는다.

## Secret, 사용자와 데이터의 경계

Client secret은 한 번만 표시한다. 이전 관리 화면의 secret rotation은 기존 client 구성을 무효화해 재설정이 필요하다고 설명한다. 등록 삭제는 되돌릴 수 없고 재등록하면 새 client ID와 사용자 재authorization이 필요하다. 이 문서는 token 발급이나 설정 변경을 실행하지 않았다.

사용자별 token과 데이터를 격리하고 한 사용자의 token으로 읽은 데이터를 다른 사용자에게 쓰거나 보여주지 않는다. 외부 cache/export는 Foundry의 접근 통제와 audit 경계를 벗어날 수 있다. 요청 scope와 consent 설명을 실제 사용 목적에 맞춘다. 개인 token을 공유 repository나 production service credential로 쓰지 않는다.

Disabled token은 일시적인 상태이고 revoked token은 영구 무효 상태다. 사용자 30일 inactive 상태에서 token이 invalid여도 예약 job은 계속 실행될 수 있으며 다시 login하면 token이 활성화될 수 있다고 설명한다. 계정 inactivity를 영구 revoke 또는 모든 처리 중단으로 해석하지 않는다.

## 출처

- [Palantir Third-party Applications, platform-security-third-party](https://www.palantir.com/docs/foundry/platform-security-third-party)
- [Palantir Third-party Applications, 3pa-api-guidance](https://www.palantir.com/docs/foundry/platform-security-third-party/3pa-api-guidance)
- [Palantir Third-party Applications, authorizing-3pa-access](https://www.palantir.com/docs/foundry/platform-security-third-party/authorizing-3pa-access)
- [Palantir Third-party Applications, danger-zone-actions](https://www.palantir.com/docs/foundry/platform-security-third-party/danger-zone-actions)
- [Palantir Third-party Applications, enabling-3pa-access](https://www.palantir.com/docs/foundry/platform-security-third-party/enabling-3pa-access)
- [Palantir Third-party Applications, manage-3pa](https://www.palantir.com/docs/foundry/platform-security-third-party/manage-3pa)
- [Palantir Third-party Applications, register-3pa](https://www.palantir.com/docs/foundry/platform-security-third-party/register-3pa)
- [Palantir Third-party Applications, third-party-apps-overview](https://www.palantir.com/docs/foundry/platform-security-third-party/third-party-apps-overview)
- [Palantir Third-party Applications, user-generated-tokens](https://www.palantir.com/docs/foundry/platform-security-third-party/user-generated-tokens)
- [Palantir Third-party Applications, writing-oauth2-clients](https://www.palantir.com/docs/foundry/platform-security-third-party/writing-oauth2-clients)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation]]
- [[Palantir-Security-Administration-and-Migration]]
