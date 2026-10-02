---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 앱 variant와 native 설정"]
---

# Expo 앱 variant와 native 설정

## 식별자를 분리하는 이유

같은 기기에 개발/시험/production을 동시에 설치하려면 Android application ID와 iOS bundle identifier가 각각 달라야 한다. profile 이름이나 표시 이름만 바꾸면 기존 앱을 대체할 수 있다.

동적 app.config에서 APP_VARIANT 값에 따라 name과 ID를 선택하고 eas.json의 profile env에서 같은 값을 제공한다. start, local compile과 eas update에도 의도한 variant 환경을 전달한다. Maps/FCM 등 외부 서비스의 앱 등록도 ID별로 맞춘다.

## CNG에서 전환

APP_VARIANT는 예제 코드가 읽는 환경 변수이며 debug/release compile mode를 자동 결정하지 않는다. native 폴더가 이미 있으면 expo run은 기존 내용을 compile하므로 환경 변수만 바꿔도 native ID가 바뀐다고 가정하지 않는다.

CNG를 정본으로 운영하고 수동 native 변경을 입력으로 옮겨 보존한 경우에만 해당 환경으로 clean Prebuild 후 compile한다. gitignore에 들어 있다는 사실만으로 수동 변경을 버려도 안전한 것은 아니다.

Development build의 generated scheme은 dev-client plugin의 `addGeneratedScheme`으로 variant별 제어할 수 있다. 여러 앱이 같은 launcher scheme을 처리해서 엉뚱한 앱이 열리는지 확인한다.

## 직접 관리하는 native 프로젝트

Android는 productFlavor별 명시적 applicationId와 resource/service 설정을 두고 profile의 gradleCommand를 연결한다. EAS CLI의 applicationIdSuffix 해석에는 제한이 있으므로 실제 식별자를 검증한다. flavor는 debug/release build type과 별도 축이다.

iOS는 target별 bundle ID, display name과 icon을 설정하고 profile에 scheme/buildConfiguration을 지정한다. 공유 scheme 파일을 소스에 포함하고 Podfile의 공통 의존성과 각 target을 구성한다. 설정 파일을 공통화할 때 target별 값까지 같아지지 않게 확인한다.

## 출처

- [Expo Documentation, Install app variants on the same device](https://docs.expo.dev/build-reference/variants)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
