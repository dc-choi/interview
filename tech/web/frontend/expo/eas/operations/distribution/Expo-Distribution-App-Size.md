---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["앱 artifact와 사용자 다운로드 크기"]
---

# 앱 artifact와 사용자 다운로드 크기

## 비교할 크기를 고른다

Universal APK/AAB/IPA 파일 크기는 store에서 특정 device가 다운로드하는 크기와 다르다. 여러 ABI, 해상도와 언어 자원을 한 artifact에 담기 때문이다. Download size와 설치 후 크기도 구분한다.

Android APK는 직접 설치할 수 있고 AAB는 Play가 기기별 APK를 만드는 입력이다. iOS Simulator .app는 실기기에 직접 설치할 수 없다. IPA도 store가 thinning하므로 그대로 사용자 다운로드량이 되지 않는다.

## 측정

Google Play Console의 Android vitals App size, App Store Connect TestFlight의 Build Metadata/App File Sizes로 기기별 추정치를 확인한다. 실제 store에서 physical device로 설치해 최종 크기를 검증한다. 과거 최소 앱의 4MB나 특정 SDK 비교표를 현재 앱 보장값으로 재사용하지 않는다.

## 최적화

APK Analyzer/apktool, IPA ZIP 내부와 Assets.car를 살펴보면 직접 작성한 asset 외 dependency에 포함된 자원도 찾을 수 있다. Expo Atlas는 JS bundle의 큰 dependency를 찾는다. 불필요한 font/icon/video와 native module을 줄인다.

Android native library를 APK에서 uncompressed로 보관하면 APK는 커져도 runtime loading이 빨라지고 Play 다운로드 크기는 같을 수 있다. useLegacyPackaging=true를 단순 크기 숫자만 보고 켜지 않는다.

expo-image를 사용하고 RN Image의 GIF/WebP decoder가 필요 없으면 expo-build-properties의 android.gifEnabled/webpEnabled를 false로 정할 수 있다. Animated WebP가 필요하면 webpEnabled와 webpAnimated를 함께 켠다. 실제 사용하는 image 경로를 먼저 확인한다.

## 출처

- [Expo Documentation, Understanding app size](https://docs.expo.dev/distribution/app-size)

## 관련 문서

- [[Expo-Distribution]]

- [[Expo]]
