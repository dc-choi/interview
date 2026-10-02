---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo iOS Simulator 설정과 한계"]
---

# Expo iOS Simulator 설정과 한계

## 설치와 실행

Simulator는 macOS의 Xcode에서 제공한다. Windows/Linux의 iOS 개발에는 실기기 또는 별도 Mac build 환경이 필요하다. Xcode를 설치하고 Settings/Locations의 Command Line Tools, Components의 iOS runtime을 선택한다. SDK55 이전과 달리 SDK56 이후에는 Watchman을 필수 설치 전제로 삼지 않는다.

Expo CLI에서 `expo start` 후 I로 실행하고 Shift+I로 Simulator를 선택한다. Expo Orbit은 메뉴바에서 build 실행과 device 관리를 돕는 선택지다. Xcode license 오류는 해당 설치의 license 상태를 확인한다.

```sh
xcrun simctl list devices available
xcrun simctl boot 'iPhone 17'
```

Xcode27 문서는 Device Hub(`open -a DeviceHub`), Xcode26은 Simulator(`open -a Simulator`)를 구분한다. 현재 설치 Xcode 이름/버전을 먼저 확인한다. 여러 simulator가 있을 때 CLI의 선택 대상을 명시적으로 확인한다.

## 하드웨어 검증 범위

camera, barometer, accelerometer/gyroscope와 audio input 등 실제 하드웨어 기능은 Simulator의 지원 범위가 제한된다. background process도 실기기와 다를 수 있다. 화면과 JS가 Simulator에서 동작한 것을 device API, background 작업과 실제 사용 성능까지 검증했다고 보고하지 않는다.

## 장애 대응

CLI가 launch에서 멈추면 device를 수동 boot한 뒤 다시 실행한다. 첫 Expo Go install은 system prompt에 응답해야 한다. 대응 SDK 프로젝트를 열거나 `expo-go download ios <sdk-or-latest>`로 특정 Expo Go artifact를 받을 수 있다.

xcrun 문제는 설치 앱 재설치, Xcode tool selection과 available runtime부터 확인한다. Reset/Erase All Content and Settings는 virtual device 전체 상태를 지우므로 앱 데이터 보존 여부를 확인한 뒤 최후 조치로 사용한다.

## 출처

- [Expo Documentation, iOS Simulator](https://docs.expo.dev/workflow/ios-simulator)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
