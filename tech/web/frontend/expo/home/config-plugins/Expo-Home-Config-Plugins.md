---
tags: [expo, react-native, config-plugins]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo config plugin 구성과 적용"]
---

# Expo config plugin 구성과 적용

## 목적과 실행 단계

CNG에서 Android/iOS native files는 config와 template에서 생성한다. config plugin은 기본 app config로 표현할 수 없는 native 설정을 prebuild에 추가한다. 생성 파일을 직접 수정하는 대신 재생성 가능한 선언으로 보존한다.

```text
withFeature
  -> withAndroidFeature / withIosFeature
  -> withAndroidManifest / withInfoPlist
  -> mods.android.manifest / mods.ios.infoPlist
```

plugin function은 ExpoConfig를 받아 수정한 config를 반환하고 보통 synchronous다. optional 두 번째 인자는 options다. app config evaluation 때 실행되며 native file I/O mod는 prebuild syncing 때 실행된다. app config 자체 변경은 mod 바깥에 둬야 prebuild 외 config 평가에서도 반영된다.

options는 boolean/number/string/null과 정적 array/object처럼 JSON-serializable 값이어야 한다. functions/promises는 전달값 계약에 맞지 않는다. mods는 serialization에서 제외되며 runtime manifest나 `Updates.manifest`에 노출하지 않는다.

## 라이브러리 plugin 사용

```sh
npx expo install expo-camera
```

```json
{
  "expo": {
    "plugins": [["expo-camera", {
      "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera."
    }]]
  }
}
```

string plugin 또는 `[pluginName, options]` tuple은 static JSON에서도 사용한다. dynamic app config가 필요한 것은 함수 reference, import나 조건 계산을 포함할 때다. options가 있다는 이유만으로 app.json을 변환할 필요는 없다.

plugin을 구성한 후 native files를 regenerate/build해야 installed app에 반영된다. CNG의 EAS Build와 native dirs 없는 `expo run:*`는 prebuild 단계에서 적용한다. 이미 native dirs가 있는 프로젝트는 app config만 바꾸고 기존 files를 방치하지 않는다.

## Local plugin 예제

```ts
import { type ConfigPlugin, AndroidConfig, withAndroidManifest, withInfoPlist } from 'expo/config-plugins';

interface MessageOptions { readonly message?: string }

const withMessage: ConfigPlugin<MessageOptions> = (config, options = {}) => {
  const message = options.message ?? 'Hello from Expo';
  config = withAndroidManifest(config, (modConfig) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'HelloWorldMessage', message);
    return modConfig;
  });
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.HelloWorldMessage = message;
    return modConfig;
  });
};
export default withMessage;
```

Android는 parsed manifest의 application meta-data, iOS는 Info.plist key를 수정한다. manifest helper를 사용하면 반복 실행 시 동일 key를 갱신하는 패턴을 적용하기 쉽다. 단순 `push`는 duplicate entry를 만들 수 있으므로 clean 없이 재실행도 확인한다.

TypeScript plugin을 Node가 평가할 수 있도록 build하거나 가이드의 `tsx/cjs` 등록을 사용한다. dynamic app config에서 `import 'tsx/cjs'` 후 local plugin path를 `plugins`에 지정한다. `expo/config-plugins`, `expo/config`의 re-export를 사용해 프로젝트 expo가 사용하는 API/types와 맞춘다.

## 순서와 검증

plugins array는 앞 plugin의 output을 뒤 plugin input으로 전달한다. `withPlugins(config, [[withFoo, options], withBar])`는 명시된 순서의 composition이다. 이 config evaluation 순서와 platform mods의 컴파일 실행 순서는 구분한다.

```sh
npx expo config --type prebuild
npx expo prebuild --clean --no-install
```

prebuild output의 실제 AndroidManifest.xml과 Info.plist를 확인하고 native build까지 검증한다. `--clean`은 기존 native dirs를 지우므로 manual modifications를 보존하지 않는다. config evaluation만 확인한 테스트는 mod results 적용을 증명하지 못한다.

## 출처

- [Expo Documentation, Introduction to config plugins](https://docs.expo.dev/config-plugins/introduction)
- [Expo Documentation, Create and use config plugins](https://docs.expo.dev/config-plugins/plugins)

## 관련 문서

- [[Expo-Home-Config-Mods]]
- [[Expo-Home-Config-Plugin-Debugging]]
