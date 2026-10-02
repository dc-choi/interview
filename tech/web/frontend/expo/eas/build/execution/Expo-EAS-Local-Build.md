---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS local build 실행 경계"]
---

# EAS local build 실행 경계

## Local build

`eas build --platform android --local` 또는 ios는 cloud의 build 절차를 자체 환경에서 실행한다. 특정 플랫폼 하나만 선택하며 all은 지원하지 않는다. Expo 인증이 필요하고 프로젝트 존재 확인 및 관리형 credential 다운로드를 위해 EAS와 통신할 수 있다. 완전한 offline 명령이 아니다.

일반 개발 compile의 `expo run:android|ios`, IDE build와 EAS local은 목적이 다르다. cloud 실패 절차 재현이나 자체 인프라 요구에는 local build를, native debugging 반복에는 개발 compile/IDE를 사용한다.

## 환경 책임

Node/package manager, Android SDK/NDK와 iOS의 Fastlane/CocoaPods/Xcode 등은 직접 준비한다. eas.json의 node/yarn/fastlane/cocoapods/ndk/image 값은 local 도구 버전을 설치/선택하지 않는다. cloud cache와 Secret visibility 환경 변수도 자동 제공되지 않으므로 로컬 환경에 필요한 값을 준비한다.

macOS/Linux가 지원 대상이다. Windows WSL에서 시도할 수 있지만 공식 local build 시험/지원 대상과 같지 않다. iOS toolchain의 OS 조건도 별도로 적용된다.

## 실패 보존

`EAS_LOCAL_BUILD_SKIP_CLEANUP=1`은 임시 working directory를 남긴다. `EAS_LOCAL_BUILD_WORKINGDIR`로 위치, `EAS_LOCAL_BUILD_ARTIFACTS_DIR`로 성공 artifact 복사 위치를 정한다. iOS working directory의 logs에서 Xcode 출력을 조사할 수 있다.

보존한 폴더에는 소스와 민감한 빌드 자료가 있을 수 있다. 진단 후 보관 범위를 정하고 통째로 공개 artifact에 올리지 않는다. 같은 절차를 실행했다고 cloud image까지 같아진 것은 아니므로 도구 버전도 비교한다.

## 출처

- [Expo Documentation, Run EAS Build locally with local flag](https://docs.expo.dev/build-reference/local-builds)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
