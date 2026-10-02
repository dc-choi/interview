---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["BuildProperties prebuild 설정과 native dependency"]
---

# BuildProperties prebuild 설정과 native dependency

## 적용 시점과 shared precedence

`expo-build-properties`는 Prebuild 시 android/gradle.properties, ios/Podfile.properties.json과 native project 설정을 생성하는 config plugin이다. prebuild를 실행하지 않고 native directory를 수동 관리하는 프로젝트에 app config만 추가하면 적용되지 않는다. install 후 plugins에 `["expo-build-properties", options]`를 넣고 새 binary를 빌드한다. withBuildProperties(config,props)는 config plugin API, resolveConfigValue(config,platform,key)는 platform override를 우선한다.

```json
{"expo":{"plugins":[["expo-build-properties",{
  "android":{"enableMinifyInReleaseBuilds":true,"enableShrinkResourcesInReleaseBuilds":true},
  "ios":{"useFrameworks":"static"},"buildReactNativeFromSource":false
}]]}}
```

shared buildReactNativeFromSource 기본 false는 RN prebuilt dependency/core를 사용할지 정하고 true 면 build 시간이 늘어난다. reactNativeReleaseLevel 기본 stable은 canary/experimental feature flags를 바꾼다. useHermesV1 기본 true이며 RN0.84부터 default engine이다. false로 legacy Hermes를 쓰려면 buildReactNativeFromSource도 true 여야 한다.

## Android 설정

compileSdkVersion,targetSdkVersion,minSdkVersion,buildToolsVersion,kotlinVersion,cmakeVersion을 override 할 수 있다. source의 숫자 예시는 모든 프로젝트의 필수값이 아니므로 SDK57/RN과 dependency 지원 범위를 함께 확인한다. buildArchs 기본 armeabi-v7a/arm64-v8a/x86/x86_64 다. buildFromSource는 deprecated이며 shared buildReactNativeFromSource를 쓴다.

release minify는 R8,resource shrink는 minify와 함께 사용한다. extraProguardRules를 추가할 수 있다. PNG crunch 기본 true 지만 이미 압축한 PNG는 커질 수 있다. enableBundleCompression 기본 false는 APK 크기를 줄이는 대신 startup 비용을 늘릴 수 있다. useLegacyPackaging 기본 false는 native library 압축 방식을 바꾼다. packagingOptions는 doNotStrip/exclude/merge/pickFirst pattern이다.

gifEnabled/webpEnabled 기본 true,webpAnimated 기본 false는 RN Image 용이며 Glide를 쓰는 expo-image에 영향을 주지 않는다. animatedWebP는 webpEnabled도 필요하고 RN iOS Image는 지원하지 않는다. usesCleartextTraffic platform default는 Android8이 하 true,9이 상 false 다. useDayNightTheme,networkInspector(defaulttrue)도 설정한다. usePrecompiledHeaders 기본 false는 experimental C++ compile 최적화이며 EXPO_USE_ANDROID_PRECOMPILED_HEADERS=1로 도 켤 수 있다.

extraMavenRepos는 URL string 또는 repository 객체를 받는다. basic password(username/password),HTTP header(name/value),AWS(accessKey/secretKey/sessionToken) credentials를 구성하며 `System.getenv('ENV_NAME')` 표현으로 build environment에서 읽을 수 있다. secret literal을 공개 config에 남기지 않는다. exclusiveMavenMirror는 다른 모든 repository를 무시하고 단일 mirror만 사용하므로 전체 dependency availability를 확인한다. manifestQueries는 package/provider 또는 intent(action,category,data{scheme,host,mimeType})로 Android package visibility를 정한다.

## iOS 설정과 SDK57 scene

useFrameworks static/dynamic,forceStaticLinking pod 목록,extraPods를 지정한다. extraPods는 name/version,git+branch/tag/commit,path,podspec,source,modular_headers,configurations,testspecs를 받아 모든 target Podfile에 추가한다. forceStaticLinking은 frameworks mode에서 prebuilt RN 등 modular header 문제가 있는 pod를 static 으로 유지한다. ccacheEnabled는 C++ compile cache,privacyManifestAggregationEnabled는 Pod resource의 PrivacyInfo.xcprivacy를 모으는 설정이다. networkInspector 기본 true,usePrecompiledModules 기본 true는 matching Expo XCFramework를 사용한다.

plugin ios.deploymentTarget은 SDK56이 상 deprecated이며 built-in `ios.deploymentTarget`을 쓴다. 원문 usage에 는 이전 prop이 남아 있다. `enableSceneSupport`는 **SDK57.0.23이 상**의 표준 Swift AppDelegate template만 지원한다. true는 factory를 노출하고 RN startup을 scene delegate로 옮기며 scene manifest를 생성한다. false는 되돌린다. iOS27 SDK/Xcode27 scene 요구 대응용이며 SDK58에 는 기본 포함돼 이 prop이 필요 없다는 원문의 미래 버전 조건을 SDK57 기본 동작으로 혼동하지 않는다.

## 출처

- [Expo Documentation, BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
