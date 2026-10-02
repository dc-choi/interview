---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Constants app config와 실행 환경"]
---

# Constants app config와 실행 환경

## 설치와 source of truth

`npx expo install expo-constants`, `import Constants from 'expo-constants'`. Android/iOS/tvOS/web/Expo Go에서 app environment metadata를 제공한다. 업데이트 가능한 manifest 설정과 native binary 고정값을 구분한다.

| Property | 용도 |
|---|---|
| expoConfig | embedded/remote classic/modern 모두의 Expo config 접근, nullable |
| easConfig | EAS project configuration, nullable |
| expoGoConfig | Expo Go configuration, nullable |
| manifest2 | modern Expo Updates manifest, config는 expoConfig 사용 |
| executionEnvironment | bare/standalone/storeClient |
| expoRuntimeVersion | runtime version, web nullable |
| expoVersion | Expo Go version, 기존 RN/web null |
| debugMode | __DEV__와 같은 debug flag |
| isHeadless | headless execution |
| sessionId | launch 마다 다른 session 식별자 |
| statusBarHeight | default 높이, 전화/location 등 동적 변화 제외 |
| systemFonts | system font names |

ExecutionEnvironment.StoreClient는 Expo Go와 expo-dev-client development build를 모두 포함한다. 값 하나로 Expo Go를 고유 판별한다고 가정하지 않는다. Standalone은 EAS 여부와 무관한 release build 다. Bare는 native project를 직접 유지하는 환경 분류다.

## Native와 manifest 비교

IOSManifest.buildNumber는 embedded Info.plist의 고정값이며 expoConfig.ios.buildNumber는 update로 달라질 수 있다. AndroidManifest.versionCode는 deprecated이고 Application.nativeBuildVersion을 사용한다. Constants의 model/platform/systemVersion/deviceYearClass 등 device metadata는 expo-device의 modelName/modelId/osVersion/deviceYearClass로 이동했다. appOwnership도 deprecated이며 executionEnvironment를 사용한다.

```ts
const projectId = Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.easConfig?.projectId;
```

extra 값은 client에서 읽을 수 있으므로 서버 secret을 넣지 않는다. config가 null 일 수 있는 환경은 fallback/오류 상태를 명시한다. getWebViewUserAgentAsync는 WebView의 user agent이며 JS fetch request의 실제 agent와 같다는 보장이 없다. linkingUri/experienceUrl/platform manifests 같은 legacy fields는 현재 linking/update API보다 우선하지 않는다.

## 출처

- [Expo Documentation, Constants](https://docs.expo.dev/versions/latest/sdk/constants)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
