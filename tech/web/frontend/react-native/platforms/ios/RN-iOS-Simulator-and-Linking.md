---
tags: [react-native, ios, simulator, linking]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native iOS Simulator와 라이브러리 링크"]
---

# React Native iOS Simulator와 라이브러리 링크

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Simulator 실행

RN 프로젝트와 Xcode 환경, iOS dependencies가 준비된 상태에서 앱 루트의 script를 실행한다.

```sh
npm run ios
```

사용 가능한 device 목록을 먼저 확인한다.

```sh
xcrun simctl list devices
```

0.87 가이드에는 기본 device가 iPhone 14로 표시되어 있다. 설치된 Xcode runtime과 CLI가 실제로 선택할 device가 같은지는 로컬 목록과 명령 출력으로 확인한다. 문서의 예제 device를 모든 개발 환경에 존재한다고 가정하지 않는다.

## device, runtime과 UDID 선택

```sh
npm run ios -- --simulator="iPhone SE (3rd generation)"
npm run ios -- --simulator="iPhone 14 Pro (16.0)"
npm run ios -- --udid="AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"
```

- `--simulator` 이름은 설치된 Xcode device 목록과 맞춘다.
- 같은 device 이름이 여러 iOS runtime에 있으면 괄호에 runtime version을 지정한다.
- `--udid`는 `simctl` 결과의 고유 ID로 특정 device를 선택한다.
- npm script에 option을 전달할 때 추가 `--`를 사용한다.
- Yarn은 `yarn ios --simulator "..."`, `yarn ios --udid "..."` 형태다.

Simulator 성공은 실제 기기의 권한, 메모리, 네트워크와 native 하드웨어 검증을 대신하지 않는다.

## JS 라이브러리와 native 라이브러리

순수 JS 라이브러리는 import로 사용할 수 있지만 native 코드가 포함된 라이브러리는 iOS binary에 링크되어야 한다. npm 설치만 하고 native app을 다시 빌드하지 않으면 native 구현을 찾지 못할 수 있다.

RN의 기본 기능 일부를 독립 static library로 분리한 배경은 모든 앱에 쓰지 않는 native 기능을 넣어 binary가 커지는 일을 줄이려는 것이다.

## 자동 링크

`package.json`의 `dependencies` 또는 `devDependencies`에 등록된 native library를 autolinking이 탐색한다.

```sh
npm install <native-library>
```

0.87 linking 가이드는 설치 후 다음 native build에 자동 연결된다고 설명한다. iOS에서 native dependency를 추가한 뒤에는 현재 RN 앱의 CocoaPods 흐름대로 `bundle exec pod install`을 수행하고 `.xcworkspace`에서 빌드한다. JS dependency 설치, pods 반영과 native rebuild는 서로 다른 단계다.

## 수동 링크가 필요한 기존 library

자동 링크를 제공하지 않는 기존 library는 Xcode 구조를 확인한다.

1. library의 `.xcodeproj`를 앱 Xcode 프로젝트의 Libraries 그룹에 추가한다.
2. 앱 target의 Build Phases에서 library Products의 static library를 Link Binary With Libraries에 연결한다.
3. 앱 native 코드에서 library header를 직접 사용하는 경우에만 Header Search Paths를 추가한다.

JS에서만 접근한다면 추가 header 탐색 경로가 필요하지 않을 수 있다. recursive header path는 CocoaPods와 충돌하거나 미묘한 build 실패를 만들 수 있어 권장하지 않는다.

자동 링크가 이미 처리한 library를 다시 수동으로 중복 링크하지 않는다. Pods와 target 연결, header path를 현재 package 문서와 대조한다.

## 출처

- [React Native, Running On Simulator](https://reactnative.dev/docs/running-on-simulator-ios)
- [React Native, Linking Libraries](https://reactnative.dev/docs/linking-libraries-ios)
- [React Native, Create a Library for Your Module](https://reactnative.dev/docs/the-new-architecture/create-module-library)

## 관련 문서

- [[RN-iOS-Publishing]]
- [[RN-Native-Module-Libraries]]
- [[RN-Codegen]]
