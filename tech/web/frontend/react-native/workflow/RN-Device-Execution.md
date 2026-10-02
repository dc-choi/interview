---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 실제 기기 실행"]
---

# React Native 실제 기기 실행

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## debug 실행과 출시 검증

사용자에게 배포하기 전 실제 기기에서 앱을 확인한다. emulator/simulator 실행, 개발 서버 연결과 release 바이너리 실행은 서로 다른 검증 단계다. `create-expo-app` 프로젝트는 시작 시 표시되는 QR로 Expo Go에서 실행할 수 있는 경로를 제공하지만, 임의 네이티브 코드가 필요한 앱의 실행 환경은 Development Build 등 프로젝트에 맞게 선택한다.

## Android USB 준비

1. Settings > About phone > Software information의 Build number를 일곱 번 눌러 Developer options를 활성화한다.
2. Developer options에서 USB debugging을 켠다.
3. 개발 컴퓨터에 USB로 연결하고 기기에 표시된 디버깅 허용을 승인한다.
4. `adb devices`에서 대상 장치가 `device` 상태인지 확인한다.
5. 기본 실행 예제에서는 대상 하나만 연결해 선택의 모호함을 없앤다.

`unauthorized`는 기기의 USB debugging 허용 상태를 확인하고 `offline`은 연결 상태를 다시 확인한다. 원문에 나오는 unauthorized 상황의 `adb reverse` 명령만으로 기기 인증 자체가 해결된다고 가정하지 않는다.

```sh
adb devices
npm run android
# 또는 yarn android
```

release 확인용 예제는 `yarn android --mode release`다. 일반 debug 실행 성공과 스토어에 배포할 signed release 검증을 구분한다.

## USB로 Metro 연결

Android 5.0 이상, USB debugging 활성화와 USB 연결 조건에서 `adb reverse`를 사용한다.

```sh
adb -s <device-name> reverse tcp:8081 tcp:8081
```

기기의 8081 요청을 개발 머신의 Metro 8081로 연결한다. `<device-name>`은 `adb devices`에서 확인한다. Metro 포트를 바꿨다면 reverse 설정과 앱의 개발 서버 주소도 일치시킨다. 연결 후 Dev Menu에서 Fast Refresh를 켜면 JavaScript 수정이 반영된다.

## Wi-Fi로 Metro 연결

USB로 앱을 설치한 뒤 개발 머신과 휴대폰을 같은 Wi-Fi에 연결한다. Dev Menu > Dev Settings > Debug server host & port for device에 개발 머신 IP와 포트, 예를 들어 `10.0.1.1:8081`을 넣고 Reload JS를 선택한다.

| 호스트 | IP 확인 경로 |
|---|---|
| macOS | System Settings > Network |
| Windows | `ipconfig` |
| Linux | 페이지 예시 `/sbin/ifconfig`, 장비의 네트워크 도구로 확인 |

같은 SSID에 있다는 사실만으로 장치 간 통신이 보장되지는 않는다. 네트워크의 client isolation과 방화벽도 영향을 준다.

## Linux USB 권한

Linux에서 기기 인식 권한이 없으면 `lsusb`로 장비 vendor ID를 확인하고 해당 기기에 맞는 udev rule을 설정하는 경로가 있다. 예제의 vendor ID 22b8은 특정 제조사의 값이며 자신의 기기 값으로 바꿔야 한다.

```text
SUBSYSTEM=="usb", ATTR{idVendor}=="<vendor-id>", MODE="0666", GROUP="plugdev"
```

페이지는 이 규칙을 `/etc/udev/rules.d/51-android-usb.rules`에 두는 예를 제시한다. 실제 배포판의 그룹, 권한 정책과 기존 규칙을 확인하고 시스템 설정을 수정한다.

## iOS 실제 기기와 서명

macOS에 USB로 기기를 연결한다. CocoaPods 사용 앱은 `.xcworkspace`, 그렇지 않은 앱은 `.xcodeproj`를 연다. Xcode Product > Destination에서 기기를 선택해 개발 대상으로 등록한다.

Apple Developer account/team을 앱 target과 Tests target의 Signing에 지정한다. Xcode의 Devices pane과 build target에 기기가 보이면 Cmd+R로 빌드해 실행한다. 서명 오류는 React 렌더링 문제가 아니라 Apple provisioning 경계에서 확인한다.

## iOS Metro 연결 문제

Mac과 기기가 같은 네트워크에서 서로 도달할 수 있어야 한다. 기기를 흔들어 Dev Menu를 열고 Fast Refresh를 사용할 수 있다. captive portal이나 client isolation이 있는 공용 Wi-Fi라면 Personal Hotspot 또는 Mac의 USB 인터넷 공유 경로를 검토한다.

Xcode Report Navigator의 마지막 Build에서 `IP=` 값을 찾아 앱에 포함된 IP가 현재 개발 머신 IP와 맞는지 확인한다. 오래된 `debugger-proxy`, `RCTWebSocketExecutor.m` 오류 문자열은 역사적 remote debugging 설명이며 0.87의 현행 debugger 설정 절차로 그대로 복사하지 않는다.

Windows/Linux에서 iOS 네이티브 앱을 로컬 빌드하는 것은 지원하지 않는다. Expo client 등 다른 실행 경로와 macOS에서 만드는 바이너리를 구분한다. 출시 단계는 Android 서명과 Play Store, iOS App Store 배포 문서로 이어간다.

## 출처

- [React Native, Running On Device](https://reactnative.dev/docs/running-on-device)

## 관련 문서

- [[RN-Local-Environment]]
- [[RN-Fast-Refresh]]
- [[RN-Troubleshooting]]
- [[Expo]]
