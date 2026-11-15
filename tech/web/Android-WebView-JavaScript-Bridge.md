---
tags: [web, android, webview, hybrid-app, security]
status: done
verified_at: 2026-11-16
category: "웹&네트워크(Web&Network)"
aliases: ["Android WebView JavaScript Bridge", "WebView 브리지", "웹뷰 네이티브 브리지"]
---

# Android WebView와 JavaScript 브리지

WebView는 Android 앱 화면 안에 웹 콘텐츠를 표시하는 View다. 주소창이나 탐색 버튼 같은 브라우저 기능은 기본으로 없고 웹 페이지를 보여 주는 일만 하므로, 뒤로 가기, 공유 같은 주변 UI는 앱이 네이티브로 만든다. 웹 코드는 Android API를 직접 호출할 수 없다. 카메라 같은 일부 기능은 웹 표준 API와 앱의 권한 승인(`WebChromeClient.onPermissionRequest`)으로 쓸 수 있지만, 생체 인증처럼 웹 표준 API가 제공하지 않거나 앱이 네이티브로 처리하기로 한 기능은 앱과 미리 약속한 작은 API인 브리지를 거친다.

## 왜 WebView를 쓰는가

| 얻는 것 | 치르는 비용 |
| --- | --- |
| 이미 만든 웹 화면과 비즈니스 로직을 다시 구현하지 않고 재사용한다 | 첫 진입 때 HTML, CSS, JS를 받아야 해서 캐시가 없거나 네트워크가 느리면 첫 화면이 늦다 |
| 웹 영역 수정은 웹 서버 배포만으로 다음 접속부터 반영된다. 네이티브 화면은 앱 빌드, 스토어 심사와 사용자 업데이트를 거친다 | Compose나 Material 컴포넌트를 그대로 쓸 수 없어 화면 전환, 키보드 처리, 뒤로 가기 동작을 웹 기술로 다시 맞춰야 한다 |
| 같은 웹 화면을 Android와 iOS가 함께 쓴다 | 플랫폼마다 사용자가 기대하는 동작이 달라 한쪽에서 어색할 수 있다 |
| | 웹 표준 API로 안 되는 기기 기능은 브리지를 거쳐야 하고, 브리지가 곧 공격 표면이 된다 |

자주 바뀌는 화면은 웹으로, 성능이나 기기 연동이 중요한 기능은 네이티브로 나누는 하이브리드 구성이 흔하다. 앱 밖의 일반 웹 탐색이 목적이면 WebView보다 사용자의 기본 브라우저가 맞다. Android의 WebView 클래스 문서도 대부분의 콘텐츠 전달에는 Chrome 같은 표준 브라우저를 권하고, WebView 가이드는 앱 소유가 아닌 링크를 기본 브라우저로 열게 한다. 앱 안에서 외부 웹을 보여 줘야 하면 Custom Tabs도 후보다.

## 브리지 방식 비교

Android WebView 문서 기준(2026-11 확인)이다. JavaScript 실행은 기본으로 꺼져 있어 `setJavaScriptEnabled(true)`를 켜야 어느 방식이든 웹 코드가 동작한다.

| 방식 | 호출 성격 | 접근 범위 | 권장 여부 |
| --- | --- | --- | --- |
| `addJavascriptInterface` | 동기. JS는 네이티브 메서드가 반환할 때까지 멈추고, 메서드는 백그라운드 스레드에서 실행된다 | iframe을 포함한 모든 프레임, origin 제한 없음 | 아주 오래된 Android를 지원할 때만 |
| `WebViewCompat.addWebMessageListener` | 비동기. 콜백은 메인(UI) 스레드에서 실행된다 | `allowedOriginRules`에 맞는 프레임만 | 권장 |
| `postWebMessage`, `WebMessagePort` | 비동기 | 메인 프레임만, `targetOrigin`으로 대상 지정 | 권장하지 않음. addWebMessageListener를 지원하지 않는 구버전(WebView 45, Webkit 1.1.0 이상)의 문자열 채널 대안 |

### addJavascriptInterface

Java 또는 Kotlin 객체를 지정한 이름으로 웹에 주입한다. `targetSdkVersion`이 17 이상이면 웹에 공개할 public 메서드에 `@JavascriptInterface`를 붙여야 하고, 붙이지 않은 메서드는 호출되지 않는다.

- 주입한 객체는 iframe을 포함한 모든 프레임에 보이므로, 광고나 외부 위젯처럼 신뢰하지 않는 프레임도 브리지를 호출할 수 있다.
- 메서드가 백그라운드 스레드에서 돌아 공유 상태에는 동기화가 필요하다.
- 넘길 수 있는 값이 제한된다. JS 객체 리터럴은 Java에서 `null`이 되고 Java 배열 반환은 지원되지 않으며, 오버로드는 인자 개수로만 고른다. 실무에서는 JSON 문자열로 직렬화해 주고받는다.
- 구버전에서는 JS가 리플렉션으로 주입 객체의 public 필드에 접근할 수 있었다. 경계는 공식 문서끼리 다르다. WebView 클래스 문서는 Android 4.2(API 17) 미만, 네이티브 브리지 보안 위험 문서는 API 21 미만으로 적는다.
- 신뢰하지 않는 콘텐츠를 불러오기 전에는 `removeJavascriptInterface`로 걷어낸다.

### addWebMessageListener

AndroidX Webkit의 API로, 허용 origin 규칙을 등록 시점에 받는다. http, https 규칙은 scheme, host, port를 맞추고 경로는 보지 않으며, 와일드카드는 host 앞에만 쓸 수 있다. `https://*.example.com`은 `https://example.com`과 일치하지 않는다. 이와 별도로 모든 origin과 일치하는 단독 `*` 규칙과 host 없이 쓰는 사용자 정의 scheme 규칙(`my-app-scheme://`)이 있으며, 단독 `*`는 피한다.

- 메시지마다 보낸 프레임의 `sourceOrigin`과 메인 프레임 여부가 함께 온다.
- 응답은 콜백이 받은 `JavaScriptReplyProxy`로 그 프레임에 보낸다. 프레임이 이미 다른 페이지로 이동했으면 메시지는 조용히 버려진다.
- 데이터는 문자열이나 `byte[]`만 오가므로 구조가 있는 값은 JSON으로 직렬화한다.
- WebView 82 이상, Jetpack Webkit 1.3.0 이상이 필요하고 `WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)`로 먼저 확인한다. 페이지를 불러오기 전에 등록한다.

```kotlin
if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
    WebViewCompat.addWebMessageListener(
        webView,
        "AppBridge",
        setOf("https://app.example.com"),
    ) { _, message, sourceOrigin, isMainFrame, replyProxy ->
        // getData()는 TYPE_STRING일 때만 호출한다. byte[] 메시지에서 부르면 예외가 난다.
        if (message.type != WebMessageCompat.TYPE_STRING) return@addWebMessageListener
        val request = parseBridgeRequest(message.data) ?: return@addWebMessageListener
        if (!isMainFrame || request.type !in allowedTypes) return@addWebMessageListener
        // replyProxy는 @UiThread다. handle이 다른 스레드에서 끝나면 메인 스레드로 돌아와 응답한다.
        handle(request) { result -> replyProxy.postMessage(result.toJson()) }
    }
}
webView.loadUrl("https://app.example.com/")
```

```javascript
const pending = new Map();
let nextRequestId = 0;
if (window.AppBridge) {
  AppBridge.onmessage = (event) => {
    const { requestId, ok } = JSON.parse(event.data);
    pending.get(requestId)?.(ok);
    pending.delete(requestId);
  };
}
const requestBiometric = () => new Promise((resolve, reject) => {
  if (!window.AppBridge) return reject(new Error("bridge unavailable"));
  const requestId = String(++nextRequestId);
  pending.set(requestId, resolve);
  AppBridge.postMessage(JSON.stringify({ type: "biometric", requestId }));
});
```

### 요청과 응답의 짝 맞추기

생체 인증이나 카메라처럼 사용자 동작을 기다리는 기능은 비동기라, 웹이 보낸 요청과 나중에 돌아오는 결과를 이어 줄 식별자가 필요하다. 웹은 요청마다 `requestId`를 만들어 대기 중인 Promise와 묶어 두고, 앱은 결과에 같은 `requestId`를 실어 돌려준다. 웹은 그 값으로 대기 중인 요청을 찾아 완료한다. 기능 이름(`type`), 입력 형식과 결과 형식은 웹과 앱이 함께 정한 계약이므로 버전과 함께 관리한다.

## 보안 체크리스트

브리지는 서버를 거치지 않고 웹의 JavaScript를 앱 권한으로 곧장 잇는다. 페이지에 악성 스크립트가 들어오면 그 취약점이 카메라, 생체 인증 같은 기기 기능 호출로 번진다.

- 허용한 origin에서만 브리지를 쓰게 하고 전체 와일드카드 `*`는 피한다. 외부 페이지로 이동하면 브리지가 닿지 않게 하고, 앱 소유가 아닌 링크는 기본 브라우저로 연다.
- HTTPS 콘텐츠만 불러오고 cleartext 트래픽을 막는다.
- 앱이 미리 정한 기능 목록만 실행하고, 웹이 보낸 값은 형식과 범위를 앱에서 다시 검증한다.
- 인증 토큰이나 개인정보를 웹에 넘기지 않고 성공, 실패 같은 필요한 결과만 돌려준다.
- 결제, 인증처럼 중요한 작업은 웹 요청만으로 실행하지 않고 사용자가 확인하는 네이티브 화면을 한 번 더 거친다.
- origin 규칙은 신뢰한 도메인 안의 XSS까지 막지 못한다. 웹 쪽 입력 처리와 CSP는 따로 지킨다.

## 운영 체크포인트

- 브리지 방식이 `addJavascriptInterface`라면 iframe과 외부 이동 뒤에도 객체가 노출되는지 확인했는가?
- 웹과 앱이 따로 배포될 때 브리지 메시지의 `type`과 형식이 바뀌면 구버전 앱이 어떻게 반응하는가?
- 응답이 오지 않는 요청(사용자 취소, 페이지 이동)에 타임아웃과 정리 경로가 있는가?
- 첫 화면 지연을 캐시나 미리 불러오기로 줄일 수 있는가, 아니면 그 화면은 네이티브가 맞는가?

## 출처

- [10분 테코톡 볼트의 Android 앱 속 WebView는 어떻게 앱과 통신할까? — 우아한테크](https://www.youtube.com/watch?v=MbQmF-Nkf5g)
- [Android Developers, Build web apps in WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [Android Developers, Access native APIs with JavaScript bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge)
- [Android Developers, WebView – Native bridges](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- [Android Developers, WebView](https://developer.android.com/reference/android/webkit/WebView)
- [Android Developers, WebViewCompat](https://developer.android.com/reference/androidx/webkit/WebViewCompat)
- [Android Developers, WebMessageCompat](https://developer.android.com/reference/androidx/webkit/WebMessageCompat)
- [Android Developers, PermissionRequest](https://developer.android.com/reference/android/webkit/PermissionRequest)

## 관련 문서

- [[Mobile-App-Architectures|모바일 앱 개발 방식 4유형]]
- [[Desktop-App-Runtime-Choices|데스크톱 앱 런타임 선택]]
- [[Response-Correlation|응답 매칭]] — 요청 식별자로 비동기 응답을 짝짓는 일반 패턴
