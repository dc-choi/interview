---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Stripe 네이티브 결제 통합"]
---

# Expo Stripe 네이티브 결제 통합

## StripeReactNative

`@stripe/stripe-react-native`는 Android와 iOS에서 결제 정보 입력 화면과 네이티브 결제 API를 제공한다. Expo SDK마다 호환 버전이 있으므로 `npx expo install @stripe/stripe-react-native`로 설치한다. 웹 결제 SDK와 네이티브 SDK의 지원 범위를 구분한다.

Expo Go에 패키지가 포함되어 있어도 Apple Pay와 Google Pay는 Expo Go에서 지원하지 않는다. 두 기능은 development build로 구성하고 실제 네이티브 바이너리에서 검증한다.

## Config plugin

`plugins`에 `@stripe/stripe-react-native`를 등록하고 설정 변경 후 앱을 다시 빌드한다.

```json
{
  "expo": {
    "plugins": [["@stripe/stripe-react-native", {
      "merchantIdentifier": "merchant.com.example.app",
      "enableGooglePay": true
    }]]
  }
}
```

`merchantIdentifier`는 iOS Apple merchant ID이며 복수 ID 배열도 가능하다. Apple Pay 사용을 위한 merchant 구성을 갖춰야 한다. `enableGooglePay`는 Android용이며 기본값은 false다.

## Redirect와 언어

외부 인증 화면에서 앱으로 돌아오는 흐름은 Stripe 초기화의 `urlScheme`과 앱의 deep link 설정을 맞춘다. `Linking.createURL()`은 실행 환경에 맞는 주소를 만드는 데 사용한다. Expo Go의 `/--/` 경로 구분과 독립 앱의 scheme을 혼동하지 않는다.

PaymentSheet는 Android에서 기기 언어를 감지한다. iOS는 `ios.infoPlist`에 `CFBundleAllowMixedLocalizations: true`와 지원 언어의 `CFBundleLocalizations`를 구성한다. 네이티브 설정 변경이므로 업데이트 배포만으로 반영된다고 가정하지 않는다.

결제 화면 표시 성공과 서버의 결제 확정은 별도 상태다. 이 문서 범위는 Expo의 패키지 호환성과 네이티브 설정이며, 결제 상태 처리와 서버 계약은 Stripe의 해당 API reference를 대조한다.

## 출처

- [Expo Documentation, @stripe/stripe-react-native](https://docs.expo.dev/versions/latest/sdk/stripe)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
