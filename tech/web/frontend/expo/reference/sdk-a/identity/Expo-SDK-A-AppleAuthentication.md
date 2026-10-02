---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Sign in with Apple credential 계약"]
---

# Sign in with Apple credential 계약

## 설치와 native 설정

`npx expo install expo-apple-authentication`, `import * as AppleAuthentication from 'expo-apple-authentication'`. iOS/tvOS와 Expo Go를 지원하며 Android/web 구현은 없다. `ios.usesAppleSignIn: true`, expo-apple-authentication plugin과 실제 bundle ID의 capability/provisioning을 맞춘다. native 직접 관리 시 com.apple.developer.applesignin entitlement(Default), CFBundleAllowMixedLocalizations를 설정한다.

isAvailableAsync가 true 일 때 AppleAuthenticationButton을 렌더링한다. buttonType은 SIGN_IN/CONTINUE/SIGN_UP, buttonStyle은 WHITE/WHITE_OUTLINE/BLACK이다. width/height style이 필요하며 backgroundColor/borderRadius 대신 buttonStyle/cornerRadius를 쓴다. Apple branding과 App Store 요구는 해당 앱의 현재 guidelines 적용 조건을 확인하며 모든 third-party login 앱의 무조건적 규칙으로 확대하지 않는다.

## Sign-in 결과

signInAsync의 requestedScopes는 FULL_NAME/EMAIL이며 사용자가 거부할 수 있다. nonce/state로 요청을 묶는다. identityToken은 JWT, authorizationCode는 짧은 수명의 code, user는 해당 development team 범위의 안정적인 identifier 다. email/fullName은 첫 authorization에서만 전달될 수 있어 nullable을 처리하고 backend에 필요한 프로필을 보관한다. 이후 credential 전체가 항상 없어지는 뜻은 아니다.

```ts
try {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    state: expectedState,
  });
  // backend에서 JWT signature/claims와 state/nonce 검증
} catch (error) {
  // ERR_REQUEST_CANCELED는 사용자 취소로 처리
}
```

Apple public keys로 JWT signature를 검증하고 audience/issuer/expiry/nonce 등 provider 계약을 함께 확인한다. client가 받은 user/email만 으로 server login을 승인하지 않는다. Apple relay email과 null profile을 정상 결과로 다룬다.

## Session와 revocation

getCredentialStateAsync(user)는 REVOKED/AUTHORIZED/NOT_FOUND/TRANSFERRED를 반환한다. simulator에서는 error 여서 실제 기기 테스트가 필요하다. addRevokeListener는 EventSubscription을 반환하며 remove로 정리한다. refreshAsync는 sign-in modal을 표시하며 user/state/scopes를 받는다.

signOutAsync도 modal을 표시해 일반 logout UX로 권장되지 않는다. app session/user cache를 지우고 backend session을 종료하는 정책을 사용한다. formatFullName은 locale-aware formatter이며 fullName 각 field는 null 일 수 있다. realUserStatus의 UNSUPPORTED/UNKNOWN/LIKELY_REAL는 system heuristic이며 인증을 대체하지 않는다.

REQUEST_CANCELED와 FAILED/UNKNOWN/NOT_HANDLED/NOT_INTERACTIVE를 구분한다. INVALID_SCOPE/OPERATION/RESPONSE는 integration input/response를 확인한다. Expo Go의 identifiers는 standalone과 다를 수 있어 production credential proof로 사용하지 않는다.

## 출처

- [Expo Documentation, AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
