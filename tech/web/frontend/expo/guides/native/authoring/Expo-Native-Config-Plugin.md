---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Config plugin과 native module 연결"]
---

# Config plugin과 native module 연결

## Build-time 설정과 runtime 읽기 분리

config plugin은 Prebuild가 생성하는 Info.plist와 AndroidManifest.xml에 값을 넣는다. Expo module은 설치된 앱의 native 설정을 읽어 JS에 반환한다. app config 옵션을 바꿔도 이미 설치된 binary의 native 값은 바뀌지 않는다.

plugin 함수는 `(ExpoConfig, options) => ExpoConfig`인 동기 함수이며 결과는 mods를 제외하면 직렬화 가능해야 한다. `getConfig`가 설정을 읽을 때 plugin이 실행될 수 있으므로 파일 mutation은 mod에 둔다. mod는 Prebuild syncing phase에서 native 파일을 수정하며 async일 수 있다.

## Plugin 패키지 구조

- `plugin/src/index.ts`: ConfigPlugin 구현.
- `plugin/tsconfig.json`: `expo-module-scripts/tsconfig.plugin`을 확장, outDir `build`, rootDir `src`.
- `app.plugin.js`: `module.exports = require('./plugin/build')` entry.
- 모듈 루트의 `npm run build plugin`: plugin TypeScript watcher.
- example app config의 `plugins`: `["../app.plugin.js", {apiKey: "example-value"}]` 항목.

```ts
import { AndroidConfig, withAndroidManifest, withInfoPlist,
  type ConfigPlugin } from 'expo/config-plugins';
const withApiKey: ConfigPlugin<{ apiKey: string }> = (config, { apiKey }) => {
  config = withInfoPlist(config, mod => {
    mod.modResults.MY_CUSTOM_API_KEY = apiKey;
    return mod;
  });
  return withAndroidManifest(config, mod => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'MY_CUSTOM_API_KEY', apiKey);
    return mod;
  });
};
export default withApiKey;
```

## Native 조회와 검증

Android는 packageManager.getApplicationInfo(GET_META_DATA)의 metaData를 읽는다. iOS는 `Bundle.main.object(forInfoDictionaryKey:) as? String`을 사용한다. 설정이 없을 때 nullable return이 될 수 있으므로 TS를 무조건 string으로 선언하지 말고 누락 정책을 일치시킨다.

example 앱에서 Prebuild 후 생성된 Manifest/Info.plist 값을 확인하고 run:android/run:ios로 재빌드한다. CNG 프로젝트의 clean 재생성 검증은 plugin이 직접 native 수정을 재현하는지 확인하는 방법이다. 기존 native 프로젝트의 수동 수정은 clean 실행 전에 보존한다.

설정 파일에 넣고 runtime으로 반환하는 API key는 앱 binary에서 읽을 수 있다. 원문 tutorial의 secret 이름은 서버 비밀 보관 계약이 아니다. native 설정 주입을 앱이 사용할 공개 설정 또는 제한된 client credential 용도로 이해한다.

## 출처

- [Expo Documentation, Tutorial: Create a module with a config plugin](https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
