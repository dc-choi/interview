---
tags: [expo, expo-integrations, authentication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Clerk 세션과 인증 UI"]
---

# Expo Clerk 세션과 인증 UI

@clerk/expo는 sign-up/sign-in/MFA/social/organization과 hosted user database를 React hook으로 연결한다. 원문은4.x와 SDK54+를 대상으로 하지만 prerequisite에는 Core3의 expo>=53<56이 남아 있다. SDK57을 쓸 때 실제 @clerk/expo peer dependency를 확인하며 오래된 Core3 범위를 그대로 적용하지 않는다.

## 접근 방식과 설치

| 방식 | 실행 조건 |
| --- | --- |
| Hosted | browser Account Portal, Expo Go 가능, provider의 web OAuth 사용 |
| Custom flow | useSignUp/useSignIn으로 직접 form, Expo Go 가능 |
| Native UI | @clerk/expo/native AuthView/UserButton/UserProfileView, beta Compose/SwiftUI, development build 필요 |

Clerk Dashboard Native API를 켜고 `plugins: ["expo-secure-store", "@clerk/expo"]`처럼 두 config plugin을 각각 등록한다. token-cache는 SecureStore로 session을 restart 사이 유지한다. plugin은 Apple sign-in entitlement(appleSignIn:false로 해제), Android callback intent/packaging을 추가한다. production callback을 검증하도록 Dashboard Native applications에 Android package/iOS bundle identifier를 일치시킨다.

Hosted는 expo-auth-session/expo-crypto/expo-web-browser, custom native Google은 @clerk/expo-google-signin/expo-crypto와 해당 plugin, native Apple은 expo-apple-authentication/expo-crypto가 필요하다. AuthView는 social flow를 내부에서 처리해 별 native hook package가 필요 없지만 provider console credential은 여전히 필요하다.

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY는 공개 client key다. secret key를 이 prefix로 넣지 않는다. node_modules 안의 env는 production RN build에서 inline되지 않아 publishableKey를 provider prop으로 직접 전달한다.

```tsx
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
<ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
  tokenCache={tokenCache}><Slot /></ClerkProvider>
```

## Hosted와 native UI lifecycle

useHostedAuth().startHostedAuth({ mode:'sign-up' })는 기본 sign-in 또는 sign-up을 열고 완료 뒤 browser를 닫고 앱 session을 활성화한다. 취소는 createdSessionId=null로 resolve, 실패는 throw이므로 둘을 구분한다. Expo Go의 development callback 예외는 일반 AuthSession OAuth의 Expo Go 지원을 뜻하지 않는다. binary callback identifier 변경 뒤 rebuild한다.

AuthView.mode는 signIn/signUp/signInOrUp(default), isDismissible과 onDismiss를 받는다. 필수 인증은 fullscreen isDismissible=false로 표현한다. UserButton은 prop 없이 profile과 UserProfileView를 연다. native session을 JS useAuth/useUser에 동기화한다. pending task는 useAuth({ treatPendingAsSignedOut:false })로 signed-out 처리하지 않는다. AuthView Modal을 signed-out branch 안에만 두면 pending session에서 너무 일찍 unmount되므로 같은 level에 계속 mount한다.

## Custom form과 완료 단계

useSignUp의 signUp.password({emailAddress,password}) → verifications.sendEmailCode() → verifyEmailCode({code}) → finalize() 순서다. Core3 validation error는 throw 대신 `{ error }` result라 각 단계를 검사한다. 웹 sign-up form에는 nativeID=clerk-captcha View가 필요하고 Android/iOS는 browser CAPTCHA를 생략한다.

signIn.password 후 status=complete일 때 finalize({navigate})를 호출한다. callback의 session.currentTask가 남으면 redirect하지 않고 task layer가 처리하게 한다. decorateUrl을 거친 URL을 Router로 이동한다. Google/Apple native hook은 startGoogleAuthenticationFlow/startAppleAuthenticationFlow에서 createdSessionId/setActive를 반환하고 취소/실패/활성화 단계를 처리한다.

useUser/useAuth는 identity, useClerk.signOut은 session 종료, Show when=signed-in/signed-out 또는 role/permission 조건은 UI 보호다. Show는 legacy SignedIn/SignedOut/Protect를 대체한다. 서버 resource에 대한 permission validation을 UI condition에만 맡기지 않는다. 문서 작성 중 계정 연결과 로그인 요청은 실행하지 않았다.

## 출처

- [Expo Documentation, Using Clerk](https://docs.expo.dev/guides/using-clerk)

## 관련 문서

- [[Expo-Integrations-Authentication]]
- [[Expo-Router-Authentication]]
- [[Expo-Integrations-Privacy]]
