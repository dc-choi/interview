---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK System WebBrowser와 인증 Session"]
---

# Expo SDK System WebBrowser와 인증 Session

expo-web-browser는 Android Chrome Custom Tabs, iOS SFSafariViewController/ASWebAuthenticationSession, web popup을 사용한다. `npx expo install expo-web-browser` 후 namespace import한다. 페이지 열기와 인증 redirect 수명을 구분한다. iOS11+ SafariViewController는 system Safari cookies를 공유하지 않아 로그인에는 openAuthSessionAsync를 사용한다.

## Browser 열기와 options

openBrowserAsync(url, options={}):Promise<WebBrowserResult>는 Android에서 열린 직후 resolve한다. iOS는 사용자가 닫으면 cancel, programmatic dismiss면 dismiss다. dismissBrowser()는 {type:'dismiss'}를 반환하고 미지원이면 throw한다. Router는 deep link를 자동 처리한다. Router 없이 일반 browser redirect를 사용하면 미리 Linking listener를 등록하고 dismiss/cleanup한다. iOS native auth session에는 별도 Linking listener가 필요하지 않으며 side effect를 만들 수 있다.

WebBrowserOpenOptions에는 toolbarColor/enableBarCollapsing, Android browserPackage/secondaryToolbarColor/showTitle/enableDefaultShareMenuItem, createTask=true, showInRecents=false, useProxyActivity=true가 있다. proxy는 createTask=true에서 동작하고 recents=true로 취급하며 앱 background 시 browser 파괴를 피한다. iOS controlsColor/dismissButtonStyle(done/close/cancel)/readerMode/presentationStyle, web windowName/windowFeatures를 설정한다. presentationStyle은 AUTOMATIC/CURRENT_CONTEXT/FORM_SHEET/FULL_SCREEN/OVER_CURRENT_CONTEXT/OVER_FULL_SCREEN/PAGE_SHEET/POPOVER다. 원문 default의 OverFullScreen 표기와 enum OVER_FULL_SCREEN을 구분한다.

## Auth session과 redirect

openAuthSessionAsync(url, redirectURL?, options={}):Promise<AuthResult>는 success일 때 url을 반환한다. cancel/dismiss/locked 등 type을 분기한다. Android는 Custom Tabs+AppState+Linking polyfill, iOS는 ASWebAuthenticationSession을 사용한다. 기본 iOS callback은 configured custom scheme이다. SDK57 preferUniversalLinks=true는 Associated Domains entitlement와 iOS17.4+ HTTPS callback을 지원하므로 overview의 custom scheme만 지원한다는 설명은 기본 경로에 해당한다. preferEphemeralSession=false를 true로 바꾸면 cookie 공유를 피하도록 요청하지만 browser가 이를 따르는지는 다르다. native auth에서는 일반 browser options가 무시될 수 있다.

```ts
const result = await WebBrowser.openAuthSessionAsync(loginUrl, callbackUrl);
if (result.type === 'success') consumeVerifiedCallback(result.url);
```

browser success는 token 검증 완료를 뜻하지 않는다. state/PKCE/token flow는 인증 library 계약을 따른다. dismissAuthSession()은 web popup을 닫고 미지원이면 throw한다.

## Web 제약과 completion

localhost/HTTPS의 secure origin에서 사용자 interaction 직후 열어 popup 차단을 피한다. redirect page는 maybeCompleteAuthSession({skipRedirectCheck?})를 호출한다. {type:success|failed, message}는 same-origin localStorage의 초기 session/redirectURL을 검사하며 host/port가 다르면 실패한다. skipRedirectCheck는 개발 진단용이며 production의 origin/state 검증 대체로 사용하지 않는다. parent가 reload되거나 없으면 ERR_WEB_BROWSER_REDIRECT, popup 차단은 ERR_WEB_BROWSER_BLOCKED, crypto 미지원은 ERR_WEB_BROWSER_CRYPTO다. 사용자가 popup을 닫으면 1초 polling으로 dismiss를 감지한다. SSR/node에서는 completion이 failed다.

## CustomTabs warming

getCustomTabsSupportingBrowsersAsync()는 browserPackages/servicePackages/preferredBrowserPackage/defaultBrowserPackage를 반환한다. PackageManager와 기본 browser 영향으로 전체 설치 목록이 아닐 수 있다. warmUpAsync(package?)와 mayInitWithUrlAsync(url, package?)는 service binding/session을 준비하고 ServiceActionResult를 반환한다. coolDownAsync(package?)로 binding을 해제하며 준비 resource도 수명에 맞게 정리한다. 원문 기본 usage의 Constants import 누락을 그대로 복제하지 않는다.

## 출처

- [Expo Documentation, WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser)

## 관련 문서

- [[Expo-SDK-Linking-Intent]]
- [[Expo-Integrations-Authentication]]
