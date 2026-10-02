---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["배포 방식과 스토어 점검"]
---

# 배포 방식과 스토어 점검

## 배포 경로 선택

EAS Build는 signed native binary를 만들고 Submit은 Google Play/App Store Connect에 업로드한다. eas build --auto-submit은 두 작업을 연결한다. Internal distribution은 tester 설치용이며 App Store 공개와 다르다. Web export/hosting과 OTA update도 별도 경로다.

Native entitlement와 config plugin으로 capabilities를 구성할 수 있지만 각 서비스의 계정 설정과 심사 조건까지 자동 승인되는 것은 아니다. Submit 성공 뒤 처리, 심사, release 상태를 확인한다.

## Store 확인

Version/build number, permissions와 설명문, icon/splash, screenshot, localization과 개인정보 처리 정보를 실제 binary와 맞춘다. 작은 화면/큰 화면/tablet에서 버튼, text field와 keyboard 가림을 확인한다. ios.supportsTablet=false여도 iPad에서 phone resolution으로 실행 가능하므로 iPad usability 점검을 생략하지 않는다.

Privacy policy와 App Store privacy 응답은 사용하는 SDK의 실제 수집 동작을 근거로 작성한다. Expo 가이드의 expo-updates/Crash Data 예시는 출발점이며 앱의 전체 data practice를 대신하지 않는다. 정책은 제출 시점 Apple/Google 공식 요구를 다시 확인한다.

## 출처

- [Expo Documentation, Distribution: Overview](https://docs.expo.dev/distribution/introduction)
- [Expo Documentation, App stores best practices](https://docs.expo.dev/distribution/app-stores)

## 관련 문서

- [[Expo-Distribution]]

- [[Expo]]
