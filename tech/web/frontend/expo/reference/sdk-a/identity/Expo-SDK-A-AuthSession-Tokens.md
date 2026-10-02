---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AuthSession discovery와 token operations"]
---

# AuthSession discovery와 token operations

## Discovery

fetchDiscoveryAsync/useAutoDiscovery는 HTTPS issuer의 well-known OIDC metadata를 읽는다. issuer에 는 query/fragment가 없어야 한다. resolveDiscoveryAsync는 URL/object를 받아 resolved document를 반환한다. authorizationEndpoint는 code request, tokenEndpoint는 exchange/refresh, userInfoEndpoint는 user info, revocationEndpoint는 revoke에 필요하다. endSessionEndpoint는 provider logout이며 local app session 삭제와 다르다.

ProviderMetadata는 jwks_uri, issuer/endpoints, scopes/response/grant types, code_challenge_methods, token endpoint auth methods, signing alg와 logout/claims capabilities를 포함한다. metadata가 존재한다고 provider가 모든 선택 기능을 지원하지는 않는다. 필요한 endpoint와 supported method를 먼저 확인한다.

## Request classes와 helpers

| API/class | 결과 |
|---|---|
| exchangeCodeAsync / AccessTokenRequest | code→TokenResponse, 같은 redirectUri와 PKCE verifier |
| refreshAsync / RefreshTokenRequest | refreshToken→새 TokenResponse |
| revokeAsync / RevokeTokenRequest | Promise<boolean>, endpoint 없거나 실패하면 reject |
| fetchUserInfoAsync | accessToken 으로 userInfoEndpoint 조회 |
| TokenRequest/Request | getHeaders/getQueryBody/getRequestConfig/performAsync 기반 request |
| requestAsync | endpoint와 FetchRequest로 typed response |

TokenRequestConfig는 clientId/scopes/extraHeaders/extraParams와 optional clientSecret이다. secret이 필요한 exchange는 backend에서 수행한다. code exchange에 사용한 redirect는 authorization request와 정확히 같아야 한다. refresh token은 provider가 발급한 경우만 쓸 수 있으며 rotation 된 token을 원래 값으로 계속 쓰지 않는다.

## TokenResponse

accessToken, expiresIn(seconds), issuedAt(seconds), refreshToken, idToken, tokenType, scope와 rawResponse를 제공한다. provider의 snake_case wire response와 JS camelCase fields를 구분한다. fromQueryParams는 implicit result를 TokenResponse로 변환하지만 신규 기본은 code+PKCE 다.

isTokenFresh(token,secondsMargin), instance.shouldRefresh와 instance.refreshAsync로 갱신 판단을 돕는다. expiresIn이 없으면 helper는 만료 없음으로 가정할 수 있지만 실제 provider만 료 정책까지 증명하지 않는다. getCurrentTimeInSeconds는 epoch 초 helper 다.

```ts
const token = await AuthSession.exchangeCodeAsync({
  clientId, code, redirectUri,
  extraParams: { code_verifier: request.codeVerifier! },
}, discovery);
```

request.codeVerifier가 준비됐는지 확인하며 non-null assertion 으로 runtime 누락을 숨기지 않는다. refresh/concurrent requests에서 한 번만 갱신하고 새 토큰의 atomic persistence를 고려한다.

## OAuth options와 logout

Prompt.Login/Consent/SelectAccount는 재인증/동의/계정선택이며 None은 UI 없이 기존 session을 확인하고 조건이 안 맞으면 login_required/interaction_required 등 오류다. provider cookie를 임의로 지우는 대안이 아니다.

TokenTypeHint는 access_token/refresh_token, ResponseType은 code/id_token/token, GrantType은 authorization_code/refresh_token/implicit/client_credentials 다. enum에 존재하는 client_credentials를 모바일 secret 저장 흐름으로 사용하지 않는다. Google/Facebook provider config helpers는 deprecated이며 해당 provider 권장 library를 검토한다.

## 출처

- [Expo Documentation, AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
