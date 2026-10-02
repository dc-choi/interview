---
tags: [expo, expo-integrations, observability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 분석 서비스와 feature flag"]
---

# Expo 분석 서비스와 feature flag

분석 SDK는 화면과 사용자 행동을 event로 수집해 기능 개선의 근거를 만든다. custom native code가 필요한 SDK는 Expo Go에 넣을 수 없으므로 development build와 config plugin을 선택한다. 제공사의 이름만으로 Expo Go 지원을 추정하지 않는다.

## 분석 provider 선택

Expo의 목록은 Firebase Analytics, Segment, Amplitude, AWS Amplify, Aptabase, Astrolytics, PostHog와 Supabase 연계 Dreambase를 소개한다. Aptabase/Astrolytics/PostHog의 product analytics는 Expo Go에서 사용할 수 있다. Firebase의 native analytics는 React Native Firebase 영역이며 Firebase JS SDK의 모든 제품이 지원되는 것은 아니다.

수집 단위를 URL/page, business action, session과 release로 나누고 익명 distinct identifier와 개인정보를 구분한다. 분석 SDK 설치가 개인정보 동의, 보관 기간과 권한 정책까지 정하는 것은 아니다. session replay가 포함되면 화면/입력 masking을 provider 설정에서 별도 확인한다.

## Feature flag의 실행 경계

feature flag는 이미 배포된 code path를 원격으로 켜고 끈다. A/B test, gradual rollout과 kill switch를 제공하지만 앱에 없는 native module을 원격으로 추가할 수 없다. flag가 UI를 숨겨도 서버 authorization은 별도 검사해야 한다. offline/startup에서 사용할 default나 bootstrap value를 준비한다.

| 서비스 | 원문의 특징 |
| --- | --- |
| PostHog | analytics/replay/experiment와 통합, user segmentation, multivariate, bootstrap flag |
| Statsig | 통계 분석과 gradual rollout, dynamic config, 자동 event/성능 metric |
| LaunchDarkly | context identification/modification, React hooks, private attributes, environment와 relay proxy |
| Firebase Remote Config | app version/user/custom attribute targeting, JS API로 적용 시점 제어, realtime updates |

CNG와 config plugin을 지원하는 SDK도 build에 native 설정을 포함해야 한다. 초기값과 network result가 다른 경우 UI 깜빡임이나 side effect의 이중 실행을 피하도록 flag 읽기와 효과 실행을 구분한다. 각 provider의 가격이나 current plan quota는 이 문서에서 확인하지 않았다.

## 출처

- [Expo Documentation, React Native analytics SDKs and libraries](https://docs.expo.dev/guides/using-analytics)
- [Expo Documentation, React Native feature flag services](https://docs.expo.dev/guides/using-feature-flags)

## 관련 문서

- [[Expo-Integrations-PostHog]]
- [[Expo-Integrations-Firebase]]
- [[Expo-Integrations-Privacy]]
