---
tags: [react-native, android, gradle, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Gradle Plugin과 Android 빌드"]
---

# React Native Gradle Plugin과 Android 빌드

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## RNGP 역할

React Native Gradle Plugin은 `react-native`와 함께 설치되는 별도 npm 패키지다. RN template 앱에는 이미 설정되어 있다. 기존 Android 앱에 RN을 넣는 경우에는 integration 절차로 plugin을 연결한다.

앱 `android/app/build.gradle`에서 `com.facebook.react` plugin과 `react { ... }` 블록을 사용한다. 기본 설정을 먼저 사용하고 경로, flavor와 bundling 요구가 다를 때 수정한다.

## 프로젝트 경로 설정

| 키 | 가리키는 위치 | 변경이 필요한 조건 |
| --- | --- | --- |
| `root` | 앱 `package.json`이 있는 RN 프로젝트 루트 | Android 경로와 앱 루트가 기본 구조와 다를 때 |
| `reactNativeDir` | 설치된 `react-native` 패키지 | monorepo/패키지 매니저 설치 경로 차이 |
| `codegenDir` | 설치된 `@react-native/codegen` | Codegen 패키지 경로 차이 |
| `cliFile` | bundling에 사용할 RN CLI entrypoint | CLI가 기본 위치에 없을 때 |

경로 예시는 `root = file("../")`, `reactNativeDir = file("../node_modules/react-native")`, `codegenDir = file("../node_modules/@react-native/codegen")`, `cliFile = file("../node_modules/react-native/cli.js")`다. 실제 해석 기준은 사용하는 Gradle 파일과 설치 구조를 확인한다.

0.87 레퍼런스의 `codegenDir` 설명에는 예전 `react-native-codegen` 패키지명이 남아 있고 코드 예시는 `@react-native/codegen`이다. 설명의 오래된 경로를 그대로 복제하지 않는다.

## JavaScript bundle 설정

| 키 | 기본/역할 |
| --- | --- |
| `nodeExecutableAndArgs` | `["node"]`, 모든 Node script의 실행 명령과 인자 |
| `bundleCommand` | `bundle`, 필요하면 `ram-bundle` 등 선택 |
| `bundleConfig` | bundle 명령에 전달할 `--config` 파일, 기본 없음 |
| `bundleAssetName` | `index.android.bundle`, 생성 bundle 파일 이름 |
| `entryFile` | `index.android.js` 또는 `index.js`를 탐색 |
| `extraPackagerArgs` | bundle 명령에 추가할 옵션, 기본 빈 목록 |
| `hermesCommand` | `hermesc` 경로, 통상 RN에 포함된 compiler 사용 |
| `hermesFlags` | 기본 `-O`, `-output-source-map` |
| `enableBundleCompression` | APK 내부 bundle asset 압축, 기본 비활성 |

bundle 압축을 끄면 bundle을 RAM에 직접 memory-map할 수 있어 시작 시간에 도움이 되지만 설치 크기가 커질 수 있다. 다운로드 APK는 압축되므로 다운로드 크기와 설치 크기를 같은 수치로 취급하지 않는다.

## debug와 release variant 계약

기본 `debuggableVariants`는 `debug`다. 이 목록의 variant는 JS bundle을 앱에 포함하지 않으므로 Metro를 실행해야 한다.

```groovy
react {
    debuggableVariants = ["liteDebug", "prodDebug"]
}
```

Android build type과 flavor의 조합이 variant다. 예를 들어 `debug/staging/release`와 `full/lite`를 조합하면 `fullDebug`, `fullStaging`, `liteRelease` 등 여섯 개가 생긴다.

`fullStaging`을 debuggable로 넣으면 그 variant도 bundle 생성이 생략된다. 해당 binary를 store 배포용으로 사용하면 Metro 없이 JS를 시작하지 못할 수 있다. 이름이 staging/release인지보다 plugin의 실제 목록을 확인한다.

## plugin이 구성하는 작업

- non-debuggable variant마다 `createBundle<Variant>JsAndAssets`를 추가한다.
- 해당 작업이 bundle, `hermesc`, source map 합성 명령을 호출한다.
- 설치된 RN의 `package.json`에서 RN 버전을 읽고 `react-android`, `hermes-android` 의존성 버전을 맞춘다.
- Maven dependency를 가져올 repository를 구성한다.
- New Architecture용 NDK 설정과 runtime 확인용 BuildConfig field를 구성한다.
- Metro DevServer port를 Android resource로 연결한다.
- 앱과 라이브러리의 New Architecture Codegen을 호출한다.

## 확인 항목

monorepo 변경 시 앱 루트, RN 패키지, CLI와 Codegen 경로를 각각 검토한다. 릴리스에서는 bundle 포함 여부, source map 생성, signing과 실제 target variant를 함께 확인한다. plugin 적용만으로 store 배포 설정과 native library의 release 호환 검증까지 끝나지 않는다.

## 출처

- [React Native, React Native Gradle Plugin](https://reactnative.dev/docs/react-native-gradle-plugin)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Android-Publishing]]
- [[RN-Native-Module-Libraries]]
