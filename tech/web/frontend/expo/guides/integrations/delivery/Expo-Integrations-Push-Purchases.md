---
tags: [expo, expo-integrations, delivery]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo push provider와 인앱 결제"]
---

# Expo push provider와 인앱 결제

push와 in-app purchase는 OS service와 native 설정에 의존한다. custom native SDK는 Expo Go에서 쓸 수 없어 development build/config plugin/CNG로 구성한다. 원문의 provider overview는 상세 SDK reference와 store 정책 전체를 대신하지 않는다.

## Push service 선택

expo-notifications는 Expo Push Service와 직접 FCM/APNs를 기준으로 설계/시험된다. third-party provider 고급 기능은 자체 SDK가 필요할 수 있으므로 여러 client 구현을 중첩해 등록/handler 충돌을 만들지 않는다. Expo notification에는 web notification이 없고 web은 provider 지원을 따로 확인한다.

Expo service는 통합 token/API, EAS delivery dashboard와 test tool을 제공한다. 원문 throughput은 project당 초당600이다. iOS Notification Service Extension의 image/rich content는 기본 포함되지 않아 custom plugin/native extension을 추가해야 한다. Expo push token과 native device token은 다른 값이며 DB에 종류/platform/project/user를 구분해 관리한다.

OneSignal은 rich media/engagement와 cross-channel, Braze는 personalization/campaign과 Android failed-delivery resend, Customer.io는 visual workflow/device-side metric과 타 provider 공존 가이드, CleverTap은 realtime segmentation/campaign과 Expo plugin을 제공한다. 제공사 SDK를 도입할 때 native registration ownership을 일관되게 정한다.

서버가 직접 FCM/APNs를 호출하면 client는 expo-notifications로 native token을 받을 수 있지만 server payload/auth/error 처리는 platform별로 구현한다. React Native Firebase Messaging은 FCM 하나로 Android/iOS를 연결하나 iOS delivery는 내부적으로 APNs를 통과한다. 전달 provider의 accepted와 기기 수신/화면 표시/사용자 열람을 구분한다.

## In-app purchase 통합

react-native-purchases는 StoreKit/Google Play Billing wrapper와 RevenueCat 서비스를 연결해 product/analytics/receipt validation/backend entitlement를 관리한다. expo-iap는 OpenIAP specification을 따르는 native library다. 둘 모두 native build를 필요로 하며 CNG/config plugin을 사용할 수 있다.

store product 등록, 구매 취소/pending, 복원, 만료/환불과 server entitlement 검증이 실제 purchase lifecycle이다. 이 Expo overview에는 각 method result와 receipt contract가 없으므로 임의의 공통 API로 합치지 않는다. UI flag와 로컬 구매 성공 응답만으로 유료 권한을 영구 부여하지 않는다. store sandbox와 signed release build에서 provider의 실제 lifecycle을 검증한다.

## 출처

- [Expo Documentation, Using in-app purchases](https://docs.expo.dev/guides/in-app-purchases)
- [Expo Documentation, Using push notifications](https://docs.expo.dev/guides/using-push-notifications-services)

## 관련 문서

- [[Expo-Integrations-Firebase]]
- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-Privacy]]
