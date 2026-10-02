---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 지도와 WebView 통합"]
---

# Expo 지도와 WebView 통합

## ReactNativeMaps

`react-native-maps`는 Android의 Google Maps와 iOS의 Apple Maps/Google Maps를 제공한다. Expo Go에서는 추가 키 설정 없이 시험할 수 있지만 배포 바이너리의 Google Maps 구성은 별도로 필요하다. `npx expo install react-native-maps`로 설치한다. Expo 자체의 `expo-maps`는 다른 선택지다.

`MapView`는 지도 표시 영역을 갖는 컴포넌트다. 부모와 지도에 실제 높이를 지정해야 보인다. Google provider를 명시하려면 `PROVIDER_GOOGLE`을 import해 `provider`에 전달한다.

## Google Maps 배포 설정

Android는 Maps SDK for Android를 활성화하고 API key를 앱의 package와 서명 인증서 SHA-1로 제한한다. Google Play App Signing 인증서와 개발 빌드 인증서는 다를 수 있다. 실제 배포 대상의 서명 값을 사용한다.

iOS는 Maps SDK for iOS를 활성화하고 key를 `ios.bundleIdentifier`로 제한한다. config plugin의 `androidGoogleMapsApiKey` 또는 `iosGoogleMapsApiKey`에 값을 넣고 바이너리를 다시 빌드한다.

```js
// app.config.js에서 환경 변수를 실제 값으로 평가한다.
export default {
  expo: {
    plugins: [['react-native-maps', {
      androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
    }]],
  },
};
```

정적 app.json에 `"process.env.KEY"`를 넣으면 JavaScript가 실행되지 않고 문자열 그대로 들어간다. 공식 지도 예제의 해당 표현을 환경 변수 평가 문법으로 복사하지 않는다. 빌드 환경에 값이 있는지 확인하며 앱에 포함되는 key는 애플리케이션/API 제한으로 사용 범위를 좁힌다.

## WebView

`react-native-webview`는 Android와 iOS에서 네이티브 View 안에 웹 콘텐츠를 표시하며 Expo Go에 포함된다. 설치는 `npx expo install react-native-webview`다.

```tsx
import { WebView } from 'react-native-webview';

const EmbeddedPage = () => (
  <WebView style={{ flex: 1 }} source={{ uri: 'https://expo.dev' }} />
);
```

`source={{ html: '<h1>Hello</h1>' }}`로 inline HTML도 표시할 수 있다. 공식 inline 예제의 `originWhitelist={['*']}`는 모든 origin을 허용하는 설정이므로 외부 콘텐츠를 넣는 실제 화면에 무심코 확대 적용하지 않는다. 표시할 콘텐츠와 허용할 이동의 범위는 앱에서 정한다.

## 출처

- [Expo Documentation, react-native-maps](https://docs.expo.dev/versions/latest/sdk/map-view)
- [Expo Documentation, react-native-webview](https://docs.expo.dev/versions/latest/sdk/webview)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
