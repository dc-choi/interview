---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 로컬 release signing과 제출 산출물"]
---

# Expo 로컬 release signing과 제출 산출물

## Android signing 흐름

Android release는 upload key로 서명한 AAB를 만든다. OpenJDK의 `keytool`과 생성/관리 중인 `android/` 프로젝트가 필요하다. 기존 EAS Build credential이 있으면 `eas credentials -p android`에서 credentials JSON과 keystore를 내려받아 기존 upload identity를 유지한다.

새 key 생성 예시는 다음과 같다. key 파일, alias와 password를 보관할 운영 절차도 필요하다.

```sh
keytool -genkey -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

keystore를 `android/app/`에 참조하게 할 수 있으나 Git에 넣지 않는다. signing 변수는 `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_KEY_ALIAS`, `MYAPP_UPLOAD_STORE_PASSWORD`, `MYAPP_UPLOAD_KEY_PASSWORD`다. native 폴더를 커밋하는 프로젝트에서는 비밀값을 프로젝트 gradle.properties 대신 머신의 `~/.gradle/gradle.properties` 등 로컬 credential 경로에서 제공한다.

## Gradle 산출물

`android/app/build.gradle`의 release signingConfig가 해당 keystore/alias/password를 사용하도록 구성한다. 변수만 선언하고 release build type에 signing을 연결하지 않으면 제출용 signed artifact가 되지 않는다. signing DSL은 현재 프로젝트의 Gradle 구조를 대조해 수정한다.

```sh
cd android
./gradlew app:bundleRelease
```

산출물은 `android/app/build/outputs/bundle/release/app-release.aab`다. Play Console에 수동 업로드하거나 `eas submit --platform android --path <aab>`로 로컬 binary를 제출할 수 있다. 앱 최초 등록과 Play signing 구분은 별도 제출 지침을 따른다.

## iOS archive

Xcode에서 Release scheme/configuration과 signing team, bundle ID, provisioning을 맞춘 뒤 archive를 만들어 App Store Connect에 업로드한다. Expo run의 Release 실행 성공과 스토어 업로드용 archive/signing 검증은 같은 작업이 아니다.

CNG clean 생성은 native signing 수정 파일을 삭제할 수 있다. 유지해야 할 native 설정은 plugin 또는 재현 가능한 build 단계로 표현하고 credential은 source와 분리한다. 이 문서는 절차 reference이며 계정 signing, binary 생성과 업로드를 실행한 기록이 아니다.

## 출처

- [Expo Documentation, Create a release build locally](https://docs.expo.dev/guides/local-app-production)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
