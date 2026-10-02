---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo native view와 WebView 튜토리얼"]
---

# Expo native view와 WebView 튜토리얼

## Native view 등록과 layout

`ExpoWebView` 모듈의 View definition은 Android WebView와 iOS WKWebView를 ExpoView 안에 감싼다. Kotlin view는 `ExpoView(context, appContext)`를 상속하고 자식 WebView의 LayoutParams를 MATCH_PARENT로 설정한다. Swift view는 init에서 WKWebView를 addSubview하고 `layoutSubviews`에서 frame을 bounds로 맞추며 clipsToBounds를 설정한다.

module의 `Name`, View 이름과 JS loader가 일치해야 한다. tutorial은 `requireNativeViewManager('ExpoWebView')`와 ViewProps wrapper를 사용한다. 최신 inline/API 경로에는 `requireNativeView`도 있으므로 이름과 다중 뷰 지원을 해당 loader 계약에 맞춘다.

## URL prop과 로딩 이벤트

`Prop("url")` setter가 URL을 native view에 전달한다. iOS URL converter와 Android URL converter의 scheme 지원은 다르다. JS 타입을 optional로 선언했다면 native setter도 null을 처리해야 한다. Android에서 nullable URL에 `toString()`을 호출해 문자열 `null`을 로드하거나 Swift nonoptional parameter와 불일치하게 두지 않는다. 같은 URL을 반복 전달할 때 불필요한 reload를 막는 정책도 작성자가 정한다.

| 단계 | Android | iOS |
|---|---|---|
| URL 로드 | `WebView.loadUrl` | `WKWebView.load(URLRequest)` |
| 완료 감지 | WebViewClient.onPageFinished | WKNavigationDelegate.didFinish |
| view 이벤트 | EventDispatcher delegate | EventDispatcher property |
| JS payload | `event.nativeEvent.url` | 동일 |

View block에서 `Events("onLoad")`을 선언하고 native view의 dispatcher 이름도 `onLoad`로 맞춘다. 모듈 전체의 sendEvent와 달리 이벤트는 해당 view instance의 callback으로 전달된다.

```ts
import type { ViewProps } from 'react-native';
type Props = ViewProps & {
  url: string;
  onLoad?: (event: { nativeEvent: { url: string } }) => void;
};
```

## 앱에서 사용할 때의 경계

UI 예제는 입력 중인 URL과 실제 로드할 URL을 분리하고 버튼을 눌렀을 때 로드를 시작한다. onLoad에서 loading 표시를 해제한다. `https://`을 붙이는 간단한 보정은 URL allowlist나 보안 검증을 대신하지 않는다.

이 튜토리얼은 native view plumbing을 설명한다. production WebView의 navigation policy, error event, JS injection, 인증, popup과 content security를 완성하지 않는다. web iframe 구현도 제공하지 않는다. Swift/Kotlin 수정은 native 재빌드가 필요하다.

## 출처

- [Expo Documentation, Tutorial: Create a native view](https://docs.expo.dev/modules/native-view-tutorial)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
