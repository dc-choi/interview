---
tags: [expo, react-native, config-plugins]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 라이브러리의 config plugin 배포"]
---

# Expo 라이브러리의 config plugin 배포

## Library와 plugin 경계

native library의 runtime code와 build-time plugin은 역할이 다르다. `src`는 JavaScript runtime API, `android`/`ios`는 native implementation, `plugin/src`는 configuration transformations, `plugin/build`는 Node가 실행할 compiled plugin으로 구성할 수 있다. root `app.plugin.js`는 plugin build를 export한다.

optional `example` app은 실제 consumer의 prebuild/build output을 검증한다. library tests와 plugin tests는 runtime/API와 configuration의 다른 계약을 확인한다. 기존 build 도구로 해결된다면 plugin 하나 때문에 library 전체 toolchain을 바꿀 필요는 없다.

## Build 설정

```json
{
  "scripts": {
    "build": "expo-module build",
    "build:plugin": "expo-module build plugin",
    "clean": "expo-module clean",
    "test": "expo-module test",
    "prepare": "expo-module prepare",
    "prepublishOnly": "expo-module prepublishOnly"
  }
}
```

`expo-module-scripts`는 Expo module/plugin TypeScript build와 test 도구를 제공한다. plugin tsconfig는 `expo-module-scripts/tsconfig.plugin`을 확장하고 `rootDir: src`, `outDir: build`, tests/mocks exclusion을 설정한다.

```js
module.exports = require('./plugin/build');
```

Expo는 plugin devDependency와 peerDependency로 API/types를 제공하며 non-Expo consumer를 지원한다면 `peerDependenciesMeta.expo.optional: true`를 사용할 수 있다. 현재 Home 예제의 `expo: ^58.0.0`/`>=58.0.0`은 SDK57 지원을 뜻하지 않는다. 실제 지원 SDK 범위와 template 검증에 맞게 version을 선언한다.

기존 library compiler는 `app.plugin.js`에서 `./lib/plugin`을 export할 수 있다. 별도 npm plugin package로 배포할 때는 package.json의 main/files/peerDependencies에 plugin entry, compiled build와 companion library를 포함한다. package.json 내용을 `.js` 실행 code처럼 저장하지 않는다.

## Implementation

entry function은 static options를 검증하고 Android/iOS wrappers를 순서대로 적용한 config를 반환한다. AndroidConfig.Manifest helper로 main application을 찾고 meta-data를 갱신한다. iOS는 withInfoPlist로 key를 merge한다. default options를 제공해 설치 시 유효하게 만들고 필수 props를 문서화한다.

`withFeature`, `withAndroidFeature`, `withIosFeature`로 이름을 정하며 built-in app config/prebuild 기능이 이미 제공하는 설정을 재작성하지 않는다. plugin에서 `sdkVersion`을 변경하면 expo install 등 SDK 기반 tool 동작이 깨질 수 있다.

## 검증과 소비자 지원

pure transformation unit tests는 입력/출력, duplicate update와 error conditions를 확인한다. filesystem이 필요하면 test double 또는 memfs를 쓸 수 있다. 그러나 top-level plugin 호출에서 `result.plugins`가 존재한다는 것만으로 modResults가 적용되었다고 증명하지 못한다.

example app에서 실제 prebuild를 실행하고 parsed native config와 build output을 검증한다. fresh template와 반복 prebuild, 각 platform, 지원 SDK beta/upgrade, 다른 plugins와의 composition을 확인한다. 실패는 field/target/context를 포함해 명확하게 보고한다.

README에는 plugin 설치, options/required/default, 지원 SDK와 수동 native setup을 함께 제공한다. 수동 native 프로젝트도 같은 변경을 적용할 수 있어야 하며 CNG 사용자가 clean regeneration에서 configuration을 재현할 수 있어야 한다.

## 출처

- [Expo Documentation, Plugin development for libraries](https://docs.expo.dev/config-plugins/development-for-libraries)

## 관련 문서

- [[Expo-Home-Config-Plugin-Debugging]]
- [[Expo-Home-Dangerous-Mods-Patches]]
