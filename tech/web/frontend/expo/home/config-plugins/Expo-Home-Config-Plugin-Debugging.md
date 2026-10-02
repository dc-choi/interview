---
tags: [expo, react-native, config-plugins]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo config plugin 개발과 introspection"]
---

# Expo config plugin 개발과 introspection

## 안정적인 수정 수단

`expo/config-plugins`와 `expo/config`를 expo package에서 import하면 사용자의 SDK가 의존하는 버전과 일치하기 쉽다. 별도 내부 package import는 hoisting/Plug'n'Play 구조에서 version mismatch나 import 실패를 만들 수 있다. Config types도 `expo/config`에서 가져온다.

native source regex 대신 static configuration을 우선한다. Android package의 필수 permission은 Manifest merge로 build 때 적용할 수 있다. 이 방식은 prebuild 누락을 줄이지만 introspection에서 보이지 않을 수 있다. optional/user-configurable 설정에는 plugin을 사용한다.

- Android Gradle toggle은 `gradle.properties`에 기록하고 native build code가 읽게 한다. `property()`는 없으면 오류, `findProperty()`는 fallback을 줄 수 있다.
- iOS Podfile 설정은 `Podfile.properties.json`과 autolinking을 사용한다. Ruby source의 regex는 composition이 취약하다.
- iOS AppDelegate 동작은 Expo module AppDelegate subscribers를 우선한다.
- Android startup 동작은 ReactActivity lifecycle listener와 static resource를 사용한다.

## Native lifecycle와 static 값

ReactActivityLifecycleListener는 JS engine 시작 전 Activity onCreate 등 native event에 반응할 수 있다. config plugin은 `withStringsXml`로 `expo_custom_value` 같은 non-translatable 값을 쓰고 module은 resource를 읽어 초기화한다. library에 default resource를 제공하면 manual native consumer도 같은 이름으로 override할 수 있다.

이 방식은 MainActivity Java/Kotlin source를 치환하지 않고 native behavior와 configuration을 분리한다. SingletonModule 같은 공유 native interface는 실제 필요할 때 사용한다. 오래된 sample package/lifecycle API는 사용 SDK의 module reference와 확인한다.

## 개발 환경과 재현

monorepo의 package와 example app을 연결하거나 `npm pack`으로 tgz를 만들고 test app에 설치한다. tgz를 업데이트할 때 package version과 consumer dependency도 갱신해 stale package를 피한다. VS Code Expo Tools의 modifier preview는 static output을 빠르게 확인하는 보조 수단이다.

mods에 network request, dependency install, interactive prompt를 넣지 않는다. 같은 파일 read/parse는 built-in mod로 공유하고 XML parser도 prebuild가 쓰는 구조를 따른다. file create/move/delete는 dangerous mod에서 처리한다.

## 명령별 확인 범위

```sh
EXPO_DEBUG=1 npx expo prebuild
EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS=1 npx expo config --type prebuild
npx expo config --type introspect
EXPO_PROFILE=1 npx expo prebuild
```

debug는 plugin/mod stack과 실행 순서, verbose errors는 기본 숨겨진 resolution error, profile은 CLI timing을 조사한다. `config --type prebuild`는 mods가 unevaluated인 config이며 native code를 생성하지 않는다. `prebuild --clean`은 native dirs를 제거하고 새로 생성한다.

## Introspection 계약

introspection은 safe mod를 평가하되 disk에 write하지 않고 `_internal.modResults`에 결과를 저장한다. 현재 지원 목록은 Android manifest/gradleProperties/strings/colors/colorsNight/styles, iOS infoPlist/entitlements/expoPlist/podfileProperties다. Xcode project나 arbitrary source change 전체를 검증하는 수단이 아니다.

EAS는 최종 iOS entitlements를 분석해 Apple Developer Portal과 sync할 때 이 결과를 사용할 수 있다. custom modifier는 introspect에서 file change를 하지 않아야 한다.

custom base mod는 filePath/read/write provider를 만들고 `BaseMods.withGeneratedBaseMods`와 `withMod`로 공개할 수 있다. target mod를 쓰는 plugins 다음에 base mod를 마지막으로 추가해 최종 write를 책임지게 한다. AppDelegate.h sample을 Swift template에도 존재한다고 가정하지 않고 target existence/language를 확인한다.

## 중복 실행과 legacy plugins

`createRunOncePlugin(plugin, packageName, version)`은 `_internal.pluginHistory`에 기록해 같은 plugin의 중복 등록을 방지한다. 파일 수정이 반복 실행에도 안전하다는 idempotency 증명과는 다르다.

legacy 자동 plugin은 설치한 package의 plugin이 없으면 CLI의 `UNVERSIONED` fallback을 사용할 수 있다. explicit plugins가 자동 설정보다 우선한다. `pluginHistory`에서 실제 version/entry를 확인하고 UNVERSIONED가 설치 native library와 호환되는지 검증한다.

## expo install 자동 등록의 경계

static app config는 plugin auto-add가 가능하지만 mandatory props를 탐지/채우는 기능은 없다. dynamic config는 CLI가 안전하게 쓰지 못해 수동 plugins 추가를 안내한다. 실제 package의 `app.plugin.js`와 설치 output을 확인한다. 개발 가이드의 root `app.config.js` 자동 탐지 서술은 resolution 문서의 `app.plugin.js`와 일치하지 않으므로 전자의 파일명만으로 plugin entry를 만들지 않는다.

## 출처

- [Expo Documentation, Developing and debugging a plugin](https://docs.expo.dev/config-plugins/development-and-debugging)

## 관련 문서

- [[Expo-Home-Config-Mods]]
- [[Expo-Home-Config-Plugin-Libraries]]
