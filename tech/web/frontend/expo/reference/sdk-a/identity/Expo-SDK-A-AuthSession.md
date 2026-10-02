---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AuthSession browser OAuth request와 redirect"]
---

# AuthSession browser OAuth request와 redirect

## 설치와 redirect 준비

`npx expo install expo-auth-session expo-crypto`, `import * as AuthSession from 'expo-auth-session'`. Android/iOS/web에서 browser OAuth/OIDC를 제공한다. provider-specific native SDK가 있는 경우 그 library가 provider 세부사항을 처리하기 쉽다. Expo Go 포함 표기와 custom scheme OAuth 실제 지원을 구분하며 development build에서 고정 scheme을 검증한다.

app config scheme을 binary에 넣고 provider allowlist에 정확한 redirectUri를 등록한다. scheme은 OTA로 추가되지 않는다. scheme이 없으면 provider 인증은 끝나도 app 복귀에 실패해 cancel처럼 보일 수 있다.

makeRedirectUri는 web location 또는 CNG scheme을 사용한다. existing RN/production은 explicit native URI가 우선이며 native 옵션에는 path를 자동 추가하지 않는다. isTripleSlashed는 scheme:///path, preferLocalhost는 iOS simulator 용이다. production web도 고정 URL을 권장한다. deprecated getDefaultReturnUrl과 legacy auth.expo.io 기반 getRedirectUrl을 새 기본 흐름으로 쓰지 않는다.

## Auth request와 hooks

useAutoDiscovery(issuer)는 nullable discovery를 반환하고 useAuthRequest(config,discovery)는 `[request|null,response|null,promptAsync]`다. request 준비 전 sign-in 버튼을 비활성화한다. web에서는 WebBrowser.maybeCompleteAuthSession을 호출하고 user gesture에서 popup을 연다.

AuthRequestConfig는 clientId/redirectUri 필수, responseType 기본 Code, usePKCE 기본 true, codeChallengeMethod 기본 S256, scopes/state/prompt/extraParams를 받는다. clientId는 공개 식별자이며 clientSecret은 앱 안에 보관하지 않는다. Plain PKCE는 쓰지 않는다.

```ts
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'example', path: 'oauth' });
const [request, response, promptAsync] = AuthSession.useAuthRequest({
  clientId: 'public-client-id', redirectUri,
  scopes: ['openid'], responseType: AuthSession.ResponseType.Code,
}, discovery);
```

AuthRequest class는 getAuthRequestConfigAsync, makeAuthUrlAsync, parseReturnUrl, promptAsync를 제공한다. 원문 일부 예제의 parseReturnUrlAsync보다 실제 method 표의 parseReturnUrl을 기준으로 한다. loadAsync는 issuer/discovery를 해석하고 request를 로드한다. useLoadedAuthRequest/useAuthRequestResult는 request loading과 결과/prompt를 분리한다.

## Result와 lifecycle

success/error는 params/url/authentication 또는 AuthError를 포함한다. cancel은 user close, dismiss는 app.dismiss, locked/opened는 prompt 상태다. success만 token exchange로 진행한다. AuthError/ResponseError는 code/description/params/info/uri를 제공하며 raw params에 민감한 token이 있을 수 있으므로 무분별하게 로그하지 않는다.

state를 request와 맞추고 codeVerifier를 code exchange에 전달한다. app Linking handler가 auth callback을 일반 navigation 으로 중복 처리하지 않도록 filter 한다. +expo-auth-session은 legacy default return marker이며 custom redirect에 는 explicit callback path로 구분한다. React Navigation의 getStateFromPath 등 linking config도 함께 적용한다.

Token operations는 [[Expo-SDK-A-AuthSession-Tokens]]에 분리했다.

## 출처

- [Expo Documentation, AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
