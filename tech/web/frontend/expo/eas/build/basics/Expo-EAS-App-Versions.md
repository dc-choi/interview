---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 앱 버전과 빌드 번호 관리"]
---

# EAS 앱 버전과 빌드 번호 관리

## 두 종류의 버전

`version`은 사용자에게 표시하는 versionName/CFBundleShortVersionString이다. android.versionCode와 ios.buildNumber는 스토어가 build를 구별하는 값이다. runtimeVersion은 OTA 호환성이므로 셋을 혼동하지 않는다.

앱 안에서 설치 바이너리의 버전을 표시하려면 expo-application의 `nativeApplicationVersion`, `nativeBuildVersion`을 사용한다. app config/manifest 값은 native 값과 달라질 수 있다.

## Remote source

`cli.appVersionSource: remote`와 build profile의 `autoIncrement: true`를 설정하면 EAS가 build 번호를 관리한다. 최초 remote 값은 로컬 번호에서 시작하며 로컬 값이 없으면 첫 build에서 1로 초기화한다. 이후 app config의 번호는 무시되고 자동 수정되지 않으며 build 때 native project에 remote 값을 반영한다.

기존 스토어 앱은 `eas build:version:set`으로 마지막 번호를 먼저 맞춘다. 로컬 IDE build에 같은 번호를 사용하려면 `eas build:version:sync`를 사용한다. Android multi-flavor native 프로젝트의 sync는 지원 제한이 있다.

Remote의 autoIncrement는 표시용 version 변경을 지원하지 않는다. EAS Update의 nativeVersion runtime policy와도 지원 제약이 있으므로 appVersion 등 적합한 policy를 함께 검토한다. 표시 버전은 release 의도에 따라 직접 갱신한다.

## Local source

`cli.appVersionSource: local`은 로컬 source가 정본이다. native 프로젝트가 있으면 native 값이 우선한다. autoIncrement를 쓰면 증가한 변경을 보존해야 다음 build에도 이어진다. 여러 CI 작업이 각자 번호를 올리는 방식은 충돌을 조정해야 한다.

Android multi-flavor Gradle은 EAS의 로컬 번호 읽기/수정과 autoIncrement에 제한이 있다. 원격/로컬 설정만 바꾸고 번호 연속성을 확인하지 않으면 중복 번호로 스토어가 거부할 수 있다.

## 출처

- [Expo Documentation, App version management](https://docs.expo.dev/build-reference/app-versions)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
