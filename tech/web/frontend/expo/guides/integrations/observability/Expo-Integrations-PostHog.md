---
tags: [expo, expo-integrations, observability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo PostHog 설정과 release 관찰"]
---

# Expo PostHog 설정과 release 관찰

PostHog는 Android/iOS product analytics, session replay, feature flag와 error tracking을 연결한다. product analytics는 Expo Go에서 동작하고 replay/native crash symbolication은 development build가 필요하다.

## 연결과 environment

`eas integrations:posthog:connect`는 US/EU region을 선택해 project/org를 생성하거나 재사용하고 Analytics/Replay/Error tracking을 선택한다. region은 data residency이며 연결 뒤 변경할 수 없다. 기존 계정은 browser 승인으로 연계한다. static config는 posthog-react-native/expo plugin을 자동 추가하지만 dynamic config는 출력된 설정을 직접 넣어야 한다.

EXPO_PUBLIC_POSTHOG_API_KEY/HOST는 .env.local과 EAS Production/Preview/Development에 기록되는 client 값이다. Source map upload preset을 가진 personal key는 POSTHOG_CLI_API_KEY(sensitive), project/host는 POSTHOG_CLI_PROJECT_ID/HOST로 분리한다. 비대화형 연결에는 --region을 반드시 주고 --session-replay/--no-session-replay, --error-tracking/--no-error-tracking, --posthog-cli-api-key, --overwrite를 명시한다. re-connect는 기존 project를 재사용하며 덮어쓰기를 확인한다.

```tsx
<PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
  options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    enableSessionReplay: false,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } }
  }}><Slot /></PostHogProvider>
```

`usePostHog()?.capture('test_event')`를 실제 빌드에서 호출해 region dashboard 수신을 확인한다. disabled:__DEV__면 dev event를 보내지 않는다. 새 EXPO_PUBLIC 값을 dev server가 읽도록 Fast Refresh만 하지 말고 full reload한다.

## JS source map과 native symbol

Metro의 getPostHogExpoConfig(__dirname) 반환 config 위에 기존 customization을 적용한다. 별도 getDefaultConfig로 wrapper를 덮어쓰면 chunk ID injection을 잃을 수 있다. build plugin은 Gradle/Xcode 단계에서 JS map을 upload한다. OTA는 native symbol이 변하지 않으므로 `eas update --platform ios --environment production` 등 단일 native platform export 뒤 `posthog-cli hermes upload --directory dist`로 그 map을 upload한다. web bundle을 섞으면 Hermes upload가 거부한다.

native crash는 별도 opt in `uploadNativeSymbols:true`와 provider native crash autocapture, PostHog project exception-autocapture 설정 세 가지가 필요하다. dSYM과 ProGuard/R8 mapping upload는 JS map의 대체가 아니다.

## Release tag와 flag

Provider 안에서 register로 eas/update_id/channel/runtime_version/project_id/account를 super property에 넣으면 이후 event에 붙는다. updates 값은 expo-updates, project/account는 Constants.expoConfig에서 읽는다. owner 미설정이면 account가 없고 Expo Go/dev build의 update_id/channel은 null이다.

앱의 eas/update_id는 개별 platform update ID, workflow의 값은 update group ID다. build_id/workflow_id는 앱에서 얻을 수 없고 workflow output/context에서 온다. feature flag는 provider 뒤 추가 구성 없이 사용할 수 있으며 bootstrap으로 startup round trip을 줄인다. dashboard 명령은 linked project를 열고 disconnect는 Expo-side link만 삭제해 PostHog data를 남긴다.

No events는 build profile 환경과 disabled 확인, replay 실패는 native build 확인, symbolication 실패는 Metro wrapper/CLI 변수와 해당 OTA map upload 확인이 우선이다. SDK setup와 계정 연결만으로 모든 telemetry가 운영에서 수신된다고 단정하지 않는다.

## 출처

- [Expo Documentation, Using PostHog](https://docs.expo.dev/guides/using-posthog)

- [Expo Documentation, Using environment variables](https://docs.expo.dev/eas/environment-variables/usage)

## 관련 문서

- [[Expo-Integrations-PostHog-Workflows]]
- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-Privacy]]
