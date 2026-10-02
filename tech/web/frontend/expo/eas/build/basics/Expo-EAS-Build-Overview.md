---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build 시작과 산출물"]
---

# EAS Build 시작과 산출물

## EAS Build

EAS Build는 Expo/React Native 프로젝트의 Android와 iOS 바이너리를 만드는 호스팅 서비스다. SDK나 Router 사용 여부와 별개로 native 프로젝트의 빌드에도 사용할 수 있다. 서명 자료를 맡기거나 직접 제공하고, internal distribution과 EAS Submit/Update를 연결할 수 있다.

동일한 원격 환경, 팀의 개발 build 재사용과 자동화에 적합하다. native breakpoint를 사용해 원인을 추적하는 작업에는 로컬 IDE 빌드를 병행한다. Android runner는 Linux, iOS runner는 macOS다.

## 첫 빌드

Expo 계정과 프로젝트를 준비하고 EAS CLI로 프로젝트를 연결한다. 전역 설치 대신 `npx eas-cli@latest`를 사용할 수 있다. 아래 eas 명령은 EAS CLI가 준비된 경우의 예시다.

```sh
eas whoami
eas build:configure
eas build --platform android --profile production
```

`build:configure`가 만드는 eas.json, 앱 package/bundle ID, 환경 변수, private package와 도구 버전을 검토한다. development build에는 expo-dev-client를 설치한다. 스토어 배포에는 각 스토어 계정과 서명 자료가 필요하며 Android 직접 설치 APK와 iOS Simulator 빌드는 다른 조건이다.

CLI 기본 대기는 build 종료까지지만 터미널을 닫았다고 원격 build 결과가 사라지는 것은 아니다. dashboard 또는 `eas build:list`에서 로그와 최종 상태를 확인한다. build 요청 성공, compile 성공, 설치 성공과 스토어 제출은 서로 다른 단계다.

## 산출물 선택

Android AAB는 Play 배포용이며 직접 설치용 APK와 다르다. iOS Simulator .app, ad hoc 실기기 build와 App Store/TestFlight build도 서로 바꿔 설치할 수 없다. profile 이름만 보고 판단하지 말고 distribution, simulator, buildType과 실제 artifact를 확인한다.

서비스 요금제에 따라 동시 실행, 우선순위와 timeout이 달라질 수 있다. 무료 계정 사용 가능성과 무제한 build 보장은 다르다. 계정 요금과 스토어 개발자 비용은 별도이며 실제 결제 시점의 공식 정책을 확인한다.

## 출처

- [Expo Documentation, EAS Build](https://docs.expo.dev/build/introduction)
- [Expo Documentation, Create your first build](https://docs.expo.dev/build/setup)

## 관련 문서

- [[Expo-EAS-Build-Basics]]

- [[Expo]]
