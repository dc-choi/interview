---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Inline native modules와 검색 설정"]
---

# Inline native modules와 검색 설정

## 실험 기능의 범위

SDK56+ inline modules는 app의 Swift/Kotlin 파일을 별도 module package scaffold 없이 검색하고 연결하는 experimental 기능이다. 동일한 Module/Class/View DSL을 쓰며 native 코드가 JS로 변환되어 OTA로 배포되는 기능은 아니다. native 변경은 재빌드한다.

app config의 `experiments.inlineModules: {}`로 활성화한다. 기본/사용자 watchedDirectories 아래 Kotlin/Swift source를 Expo CLI와 autolinking이 검색한다. 한 기능에 Android/iOS 구현이 필요하면 각 언어 파일에 같은 JS contract를 구현한다.

```json
{
  "expo": {
    "experiments": {
      "inlineModules": {"watchedDirectories": ["app", "src"]}
    }
  }
}
```

## watchedDirectories 제약

- directory는 app Node project의 package.json ancestor 안에 있어야 한다.
- `./`로 전체 project를 검색하거나 `../`로 ancestor 전체를 검색하지 않는다.
- parent와 child를 중복 등록하지 않는다. parent는 recursive하므로 `app`과 `app/(tabs)`를 동시에 지정하지 않는다.
- configured path에는 space, 괄호, `$` 등 special character를 사용하지 않는다. Router의 `(tabs)` 하위를 검색하려면 상위 app directory를 등록한다.

이 규칙은 file 이름/Router route 사용 자체를 전부 금지하는 뜻이 아니라 watched directory 지정 계약이다.

## 이름과 Xcode target

파일, Module class와 Name은 예제에서 동일한 이름으로 맞추며 앱 내에서 unique해야 한다. Name을 생략하면 class name을 사용한다. JS는 expo의 requireNativeModule 또는 requireNativeView로 로드한다. function, Constant, View, Props, event는 일반 Modules API와 같은 계약이다.

iOS `xcodeProjectTargets`는 inline source를 연결할 실제 Xcode target 이름 목록이다. `abstract_target` prefix나 Pods의 논리 이름을 사용하지 않는다. 기본은 main app target이며 extension이나 여러 app target에서는 대상이 맞는지 확인한다.

inlineModules config를 바꾸면 Prebuild로 native project 설정을 반영한다. generated types만 바뀌었다고 native target/search 설정이 자동 변경되지 않는다. 별도 package 재사용이나 npm 배포가 목표면 standalone module이 더 적합하다.

## 출처

- [Expo Documentation, Tutorial: Create an inline module](https://docs.expo.dev/modules/inline-modules-tutorial)
- [Expo Documentation, Inline modules reference](https://docs.expo.dev/modules/inline-modules-reference)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
