---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Build 없는 EAS Update"]
---

# EAS Build 없는 EAS Update

EAS Update는 다른 CI/build pipeline과 함께 독립 서비스로 사용할 수 있다. expo-updates 설치, URL/runtime 설정과 publish는 같지만 EAS Build가 자동 제공하는 channel native header와 build bookkeeping을 직접 관리한다.

## Manual channel 구성

CNG는 updates.requestHeaders{'expo-channel-name':'production'}와 prebuild, bare는 AndroidManifest/Expo.plist request header를 설정한다. 서버에도 eas channel:create production으로 channel을 만들고 branch pointer를 확인한다. eas.json profile 이름만 넣어 local build header가 자동 생긴다고 가정하지 않는다.

새 native configuration을 포함해 binary를 빌드하고 platform/runtime/channel을 읽어 검증한다. EAS Update publish 예제는 --environment를 명시한다. EAS Build 없이도 update 자체 기능은 사용하지만 Deployments의 build/update 묶음과 build-aware insights 일부는 사용할 수 없다. 빈 Deployments만으로 실패를 판단하지 않는다.

## Environment source

build pipeline에서 native/app config를 평가할 변수와 local EAS Update export의 environment를 맞춘다. SDK57은 --environment로 지정한 EAS 변수에 따라 export하며 secret 가시성의 변수는 local export에서 읽을 수 없다. cloud build에만 존재하는 secret을 client update에 필요한 값으로 사용하지 않는다. --environment 사용 시 update export는 선택한 EAS environment의 plain text/sensitive 값만 사용하며 project .env/.env.local 값을 사용하지 않는다. EXPO_PUBLIC_ 값은 client bundle에 inline되어 공개되므로 sensitive라는 가시성 이름을 client 비밀 보호로 해석하지 않는다. build job은 cloud에서 secret을 사용할 수 있지만 local update export는 secret을 읽지 못한다. channel은 배포 대상, environment는 bundle을 만들 때의 값이라는 책임을 구분한다.

## 출처

- [Expo Documentation, Using EAS Update without other EAS services](https://docs.expo.dev/eas-update/standalone-service)

- [Expo Documentation, Environment variables usage with EAS Update](https://docs.expo.dev/eas/environment-variables/usage#using-environment-variables-with-eas-update)

## 관련 문서

- [[Expo-EAS-Update-Setup]]
- [[Expo-EAS-Update-Debug]]
