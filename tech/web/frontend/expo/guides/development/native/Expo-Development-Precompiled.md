---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo precompiled native module과 source build"]
---

# Expo precompiled native module과 source build

## 기본 linking

Android는 AAR, iOS는 XCFramework를 Expo npm package에서 제공해 복잡한 module의 반복 native compile을 줄인다. precompiled가 없는 package는 source build로 fallback하며 같은 앱 안에서 공존한다.

Android는 SDK53부터 기본 활성화다. iOS는 SDK56 이후 기본 활성화이며 SDK55는 EAS에서 기본, local은 `EXPO_USE_PRECOMPILED_MODULES=1` opt-in이었다. SDK57 앱에 SDK55의 local opt-in 절차를 현재 필수 조건처럼 적용하지 않는다.

## source build가 필요한 경우

native source patch, module 코드 수정과 native compile dependency를 바꾸는 옵션은 source build가 필요할 수 있다. 예를 들어 Android camera의 `barcodeScannerEnabled` 같은 옵션은 기본 옵션으로 만들어진 binary의 dependency를 사후 변경하지 못한다.

```json
{
  "expo": { "autolinking": {
    "android": { "buildFromSource": ["expo-camera"] },
    "ios": { "buildFromSource": ["react-native-reanimated", "react-native-worklets"] }
  } }
}
```

`package.json`의 platform별 `buildFromSource`는 package 이름/패턴 배열이다. `[".*"]`는 전체 module opt-out이다.

## iOS 전체 비활성화

`expo-build-properties` plugin의 `ios.usePrecompiledModules:false`를 설정하고 Prebuild를 다시 수행한다. 또는 pod install이 읽는 `EXPO_USE_PRECOMPILED_MODULES=0`을 local shell/EAS build 환경에 제공한다. 변수 수정만으로 이미 설치된 pods/binary가 재컴파일된다고 가정하지 않는다.

## Reanimated와 Worklets

EAS iOS는 일부 제3자 package의 precompiled XCFramework를 내려받지만 local pod install은 기본적으로 source build하므로 EAS에서만 문제가 드러날 수 있다. Reanimated는 Worklets를 native에서 link하므로 source build로 전환할 때 둘을 함께 전환한다. 하나만 전환하면 mixed linkage의 framework mismatch가 발생할 수 있다.

`worklets.staticFeatureFlags`, `reanimated.staticFeatureFlags`는 precompiled artifact에 이미 고정돼 있어 override가 적용되지 않는다. custom flag가 필요하면 source build를 사용한다. `Unable to recognize flag: <NAME>` 같은 EAS-only runtime 오류는 pinned package와 artifact flag 목록의 불일치를 조사한다. local success가 EAS precompiled path의 성공을 증명하지 않는다.

## 출처

- [Expo Documentation, Precompiled Expo Modules](https://docs.expo.dev/guides/prebuilt-expo-modules)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
