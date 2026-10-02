---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS iOS extension target과 credentials"]
---

# EAS iOS extension target과 credentials

## App extension

iOS extension은 앱 밖의 시스템/다른 앱 흐름에 기능을 제공하는 별도 target이다. bundle identifier와 서명 profile도 target별로 필요하다. 앱 본체에 적용한 credential 하나로 모든 extension이 자동 서명된다고 가정하지 않는다.

## CNG 설정

CNG extension 지원은 experimental이다. config plugin으로 Xcode target을 생성하고 app config의 `extra.eas.build.experimental.ios.appExtensions`에 targetName, bundleIdentifier와 entitlements를 선언한다.

이 선언은 native project 생성 전 EAS CLI가 필요한 credential을 준비하도록 알리는 역할이다. 선언만으로 extension 소스와 target 구현이 만들어지지는 않는다. extension 생성 라이브러리의 plugin이 선언까지 해 주는지 확인한다.

## 기존 Xcode 프로젝트

직접 관리하는 프로젝트에서는 EAS가 Xcode target을 감지해 credential을 구성한다. local credentials를 사용하면 target별 .mobileprovision과 certificate를 credentials.json에 지정한다. target 이름, bundle ID, entitlement와 profile 사이의 불일치는 서명 실패 원인이다.

## 출처

- [Expo Documentation, iOS App Extensions](https://docs.expo.dev/build-reference/app-extensions)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
