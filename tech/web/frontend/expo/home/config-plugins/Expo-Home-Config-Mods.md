---
tags: [expo, react-native, config-plugins]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo mods와 네이티브 파일 계약"]
---

# Expo mods와 네이티브 파일 계약

## Mod compiler

`getPrebuildConfig`는 app config와 core plugin을 읽고 `compileModsAsync`가 base mod를 붙인다. base mod는 file을 읽고 plugin chain에 `modResults`를 전달한 뒤 최종 결과를 쓴다. 반환 config가 mod chain을 손상하면 compiler 검사가 실패할 수 있다.

직접 `mods`를 구성하기보다 `with*` mod plugin wrapper를 사용한다. mod action은 async가 가능하며 `modResults`를 수정하거나 대체한 뒤 config를 반환한다.

| modRequest 필드 | 목적 |
| --- | --- |
| `projectRoot` | universal project root |
| `platformProjectRoot` | Android/iOS native root |
| `platform` | 대상 platform |
| `modName` | 실행 mod 이름 |
| `projectName` | iOS 프로젝트 경로 구성 |
| `introspect` | write 없이 결과 분석하는 mode |
| `ignoreExistingNativeFiles` | template 기반 native config 처리 조건 |

`modResults`는 mod별로 JSON object, properties array, XcodeProject 또는 `{contents, language}` 같은 file 정보다. 전체 config와 target file data를 혼동하지 않는다.

## Android wrapper

| Wrapper | 파일/결과 |
| --- | --- |
| `withAndroidManifest` | AndroidManifest.xml을 parsed XML/JSON으로 |
| `withStringsXml` | res/values/strings.xml |
| `withAndroidColors` | res/values/colors.xml |
| `withAndroidColorsNight` | res/values-night/colors.xml |
| `withAndroidStyles` | res/values/styles.xml |
| `withGradleProperties` | gradle.properties의 PropertiesItem array |
| `withMainActivity`, `withMainApplication` | Activity/Application source contents |
| `withAppBuildGradle` | app/build.gradle text |
| `withProjectBuildGradle` | root build.gradle text |
| `withSettingsGradle` | settings.gradle text |

source filename/language는 current native template의 Java/Kotlin에 따라 다를 수 있다. text wrapper가 있다는 것이 source regex 변환의 안전성을 보장하지 않는다.

## iOS wrapper

| Wrapper | 파일/결과 |
| --- | --- |
| `withInfoPlist` | Info.plist parsed object |
| `withEntitlementsPlist` | app entitlements parsed object |
| `withExpoPlist` | Expo.plist update config |
| `withXcodeProject` | `.xcodeproj`의 parsed XcodeProject |
| `withPodfile` | Podfile text |
| `withPodfileProperties` | Podfile.properties.json |
| `withAppDelegate` | AppDelegate source contents |

기존 plist 설정은 helper/parsed mod에서 merge한다. Podfile/AppDelegate source는 구조 변화와 다른 plugin 충돌에 취약하므로 JSON properties나 native subscribers를 먼저 사용한다.

## Plugin module resolution

project-local JS/TS file path, dynamic app config의 inline function, standalone npm package를 사용할 수 있다. function은 manifest serialization에서 function name으로 표시되며 callable body를 runtime에 전송하지 않는다.

package resolution은 root `app.plugin.js`를 먼저 선택하고 없으면 package.json의 `main`을 따른다. package 내부 `build/index.js`를 직접 지정하면 공식 resolution을 우회하므로 업데이트에 취약하다. plugin은 Node에서 실행되므로 mobile runtime의 Babel preset과 별도 build가 필요할 수 있다.

```js
// 라이브러리 root app.plugin.js
module.exports = require('./plugin/build');
```

native library의 runtime entry와 plugin entry를 분리하면 dependency side effects와 Node module syntax 차이를 관리할 수 있다.

## 출처

- [Expo Documentation, Mods](https://docs.expo.dev/config-plugins/mods)

## 관련 문서

- [[Expo-Home-Config-Plugins]]
- [[Expo-Home-Config-Plugin-Debugging]]
