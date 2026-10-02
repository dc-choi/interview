---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["expo-module.config.json 등록 계약"]
---

# expo-module.config.json 등록 계약

## 파일의 역할

package.json 옆의 expo-module.config.json은 Expo Autolinking이 패키지를 Expo module로 인식하고 provider에 native class를 등록하는 근거다. app config의 plugins와 달리 모듈 패키지 자체의 metadata다.

| Property | 값/기능 |
|---|---|
| platforms | android, apple 또는 granular ios/macos/tvos, web, devtools |
| apple.modules | Swift Module class names |
| apple.appDelegateSubscribers | Swift ExpoAppDelegateSubscriber class names |
| android.modules | package를 포함한 Kotlin Module class names |

```json
{
  "platforms": ["android", "apple"],
  "apple": {"modules": ["SettingsModule"], "appDelegateSubscribers": ["LifecycleSubscriber"]},
  "android": {"modules": ["expo.modules.settings.SettingsModule"]}
}
```

지원하지 않는 platform은 검색 결과에서 제외된다. `apple`은 Apple 플랫폼 공통 discovery를 허용하며 실제 target support는 podspec supported platforms와 native API availability가 결정한다. web 값을 넣었다고 자동 web 구현이 생기지 않는다. devtools platform은 dev tools plugin 용도다.

JS requireNativeModule에 쓰는 Name과 등록하는 native class name은 구분한다. 등록 이름이 올바른 class를 가리키는지, native module의 Name이 loader identifier와 일치하는지 확인한다. iOS class/subscriber 변경 후 pod install로 generated provider를 갱신하며 Android provider는 build 중 생성된다.

짧은 공식 reference는 기본 module/platform 등록 항목을 소개한다. advanced autolinking, binary dependency나 inline 설정은 해당 별도 문서의 계약을 함께 확인한다.

## 출처

- [Expo Documentation, expo-module.config.json](https://docs.expo.dev/modules/module-config)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
