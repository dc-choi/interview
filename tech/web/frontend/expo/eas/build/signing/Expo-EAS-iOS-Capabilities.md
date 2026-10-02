---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS iOS capability 동기화"]
---

# EAS iOS capability 동기화

## Entitlement와 원격 기능

Entitlement 파일에 기능을 선언하는 것과 Apple Developer에서 해당 앱에 capability를 허용하는 것은 연결되어야 한다. EAS Build는 지원하는 항목을 build 때 동기화한다. CNG는 introspected app config, 직접 관리하는 앱은 ios 아래 entitlements 파일을 입력으로 사용한다.

지원 entitlement가 있으면 remote capability를 켜고 이미 켜진 항목은 재사용한다. remote에만 있고 local에서 빠진 capability는 꺼질 수 있다. `EXPO_NO_CAPABILITY_SYNC=1`은 자동화를 끄므로 이 경우 직접 일치를 관리한다.

## 지원 범위

주요 지원 항목은 Wi-Fi Information, App Groups, Apple Pay, Associated Domains, Sign In with Apple, Push Notifications, iCloud, HealthKit, HomeKit, NFC, Network Extensions, Siri, Wallet, WeatherKit 등이다. 세부 entitlement 문자열과 Apple 별도 승인이 필요한 기능은 해당 기능 reference 및 공식 capability 표에서 확인한다.

모든 Apple capability를 EAS가 자동 구성하는 것은 아니다. 지원하지 않는 항목은 Portal 또는 Xcode에서 구성하고 profile을 다시 생성한다. Merchant ID, App Group과 CloudKit Container 등록/할당은 Apple cookie 인증이 필요하며 ASC API key만으로 같은 작업이 가능하다고 가정하지 않는다.

## Broadcast push

Broadcast는 별도 entitlement가 없는 Push Notifications의 옵션이다. `ios.usesBroadcastPushNotifications: true`와 aps-environment가 필요하다. Apple의 broadcast push는 iOS 18 이상 Live Activities에 한정된다.

Portal에서만 Broadcast를 켜고 앱 설정에 반영하지 않으면 다음 capability sync가 옵션을 되돌려 APNs channel 관리에서 `FeatureNotEnabled`가 발생할 수 있다. 실제로 EAS가 Push Notifications를 켜는 시점에 옵션이 반영되는지 확인한다.

## 진단

`expo config --type introspect`로 ios.entitlements를 확인하고 EXPO_DEBUG로 EAS 동기화 로그를 본다. bundle ID에 연결된 remote capability와 profile 내용을 비교한다. capability를 수동 변경했다면 이를 쓰는 profile을 다시 생성해야 한다. 단순히 Xcode UI에 기능이 보인다는 것만으로 서버 서명 자료까지 맞다고 결론 내리지 않는다.

## 출처

- [Expo Documentation, iOS capabilities](https://docs.expo.dev/build-reference/ios-capabilities)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
