---
tags: [expo, expo-integrations, authentication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo OAuth와 native 인증 provider"]
---

# Expo OAuth와 native 인증 provider

인증은 사용자 식별, sign-up/sign-in과 여러 실행/기기의 session을 관리한다. provider SDK의 custom native module이 있으면 development build를 사용한다. 클라이언트 인증 상태와 서버 authorization을 함께 설계한다.

## AuthSession 공통 규칙

expo-auth-session은 Android/iOS/web OAuth/OIDC를 연결한다. WebBrowser.maybeCompleteAuthSession()을 top level에서 호출해 웹 popup을 닫고 makeRedirectUri로 platform URI를 구성한다. useAuthRequest는 async request 준비를 맡으며 request가 없을 때 버튼을 disable한다. 웹 promptAsync는 user interaction에서만 호출해야 popup blocker를 피한다. 일반 OAuth 개발은 custom scheme이 없는 Expo Go 대신 development build를 쓴다.

```tsx
WebBrowser.maybeCompleteAuthSession();
const [request, response, promptAsync] = useAuthRequest({
  clientId: '<CLIENT_ID>', scopes: ['openid', 'profile'],
  redirectUri: makeRedirectUri({ scheme: 'example.app', path: 'callback' }),
}, discovery);
// response.type === 'success'의 one-time code를 검증된 exchange 경로로 전달한다.
<Button disabled={!request} title="로그인" onPress={() => promptAsync()} />
```

authorization code exchange에 client secret이 필요한 provider는 API route 등의 server에 secret을 보관한다. public native client의 code+PKCE는 secret 없는 flow로 provider 지원에 따라 client exchange할 수 있다. 원문의 server exchange 설명을 모든 PKCE client의 필수 secret 요구로 읽지 않는다. legacy implicit responseType Token은 지원하지만 token injection 위험 때문에 신규 권장 흐름이 아니다.

GitHub는 manual authorization/token/revocation endpoint, app당 redirect URI 하나와 `://` 두 slash 요구를 설명한다. native/web은 별 app이 필요할 수 있고 revocation URL에 client ID가 들어간다. Okta는 useAutoDiscovery(issuer)와 provider가 지정한 `com.okta.<domain>:/callback` native URI를 사용한다.

makeRedirectUri의 scheme/path/queryParams, isTripleSlashed, native override는 URI 모양을 바꾼다. one/two/three slash를 임의 정규화하지 말고 provider registration과 정확히 일치시킨다. app scheme 변경은 native project 재생성과 rebuild가 필요하다. Android warmUpAsync/coolDownAsync는 effect에서 browser 준비/cleanup에 쓴다. token persistence는 native SecureStore를 사용하며 AsyncStorage와 웹 local storage를 암호화된 token storage로 취급하지 않는다.

## Google native sign-in

react-native-nitro-google-signin과 @react-native-google-signin/google-signin은 native button/auth/Google API authorization을 제공한다. 양쪽 모두 plugin과 native build가 필요하다. 원문은 Nitro의 Android Credential Manager 지원과 다른 library의 paid offering을 구분하고 legacy Google Sign-In Android SDK deprecated를 설명한다. 비용/현재 offering은 provider에서 다시 확인한다.

Android credential에는 EAS/local APK upload certificate SHA1과 Google Play App Signing production certificate SHA1을 각각 등록한다. 테스트 build가 되는 것이 Play-downloaded build의 sign-in을 보장하지 않는다. Firebase 설정의 google-services.json/GoogleService-Info.plist는 build에서 사용할 수 있어야 하고 git에 두거나 EAS secret file로 전달한다. 일반적으로 client config인 이 파일과 private server key를 혼동하지 않는다. Firebase 없이 Cloud Console 직접 구성도 가능하다.

## Facebook native sign-in

react-native-fbsdk-next는 Android/iOS native SDK wrapper라 Expo Go에서 사용할 수 없다. Android provider project에 Package name(android.package), MainActivity class와 key hash를 등록한다. Play Console App signing certificate SHA1의 hex bytes를 Base64로 바꾼 값이 Facebook key hash이며 문자열 자체를 Base64하는 것과 다르다.

Expo guide는 valid Play Store URL/승인된 app을 Android platform 등록 조건으로 설명한다. provider console의 현재 요구와 app review를 확인하고 unpublished app 오류를 debug한다. 공개 app signing certificate와 secret client credential을 구분한다. App Store의 third-party sign-in에는 Sign in with Apple 관련 정책이 적용될 수 있으며 실제 예외와 current guideline을 출시 때 확인한다.

## 출처

- [Expo Documentation, Using authentication SDKs and libraries](https://docs.expo.dev/guides/using-authentication)
- [Expo Documentation, Authentication with OAuth or OpenID providers](https://docs.expo.dev/guides/authentication)
- [Expo Documentation, Using Facebook authentication](https://docs.expo.dev/guides/facebook-authentication)
- [Expo Documentation, Using Google authentication](https://docs.expo.dev/guides/google-authentication)

## 관련 문서

- [[Expo-Integrations-Clerk]]
- [[Expo-Router-Authentication]]
- [[Expo-Router-API-Routes]]
