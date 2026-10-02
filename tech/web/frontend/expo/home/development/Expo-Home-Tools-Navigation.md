---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 개발 도구와 내비게이션 선택"]
---

# Expo 개발 도구와 내비게이션 선택

## Expo CLI와 EAS CLI

Expo CLI는 프로젝트의 `expo` 패키지에 포함된다. 프로젝트 SDK에 맞는 local CLI를 `npx expo`로 호출한다. EAS CLI는 계정, cloud build/update/submit, credentials와 iOS device 등록을 관리한다.

| 명령 | 기능 |
| --- | --- |
| `npx expo start` | Expo Go/development build의 Metro 개발 서버 |
| `npx expo prebuild` | Android/iOS native 디렉터리 생성 |
| `npx expo run:android`, `run:ios` | 로컬 native 컴파일과 실행 |
| `npx expo install <package>` | SDK 호환 패키지 설치 |
| `npx expo install --fix` | 호환 버전에 맞게 의존성 보정 |
| `npx expo lint` | ESLint 설정이 없으면 준비하고 있으면 lint |
| `npx expo-doctor` | 프로젝트 설정/의존성 건강 진단 |

Expo Doctor는 app config, package.json, dependency compatibility와 React Native Directory 정보를 검사한다. native 디렉터리가 존재할 때 app config가 native 파일과 동기화되는지도 확인한다. `reactNativeDirectoryCheck`, `appConfigFieldsNotSyncedCheck`를 package.json에서 조정할 수 있다. Doctor 통과가 native 실행이나 deployment 성공의 증거는 아니다.

## Orbit, 편집기와 프로토타입

Orbit는 macOS/Windows/Linux에서 EAS build, updates, Snack 또는 local files의 설치/실행을 돕는다. Android APK, Simulator용 iOS `.app`, ad hoc signed 앱을 처리한다. Android SDK가 필요하고 iOS 기기 관리는 macOS의 `xcrun`/Xcode가 담당한다. pinned EAS projects도 볼 수 있다.

Expo Tools VS Code extension은 app/EAS/store/module config의 autocomplete와 intellisense, debugger 연동을 제공한다. Snack은 브라우저에서 코드와 플랫폼 결과를 공유하는 작은 프로토타입 환경이다. Expo Go의 제한을 넘어서는 native 기능과 production 프로젝트는 development build를 사용한다.

## Expo Go 버전

```sh
npx expo-go download android latest
npx expo-go url ios latest
```

SDK 버전을 `latest` 대신 지정할 수 있다. download는 현재 디렉터리에 binary를 저장하고 `~/.expo`에 cache한다. Android 실기기/Emulator와 iOS Simulator가 대상이며 iPhone에 오래된 Go를 sideload하는 경로를 제공하지 않는다. SDK mismatch가 나면 대상 platform에 맞는 compatible Go 설치 또는 앱 SDK upgrade를 선택한다.

## React Navigation과 Expo Router

React Native core에는 navigation이 포함되지 않는다. React Navigation은 code로 Stack/Tab/Drawer를 조합하는 방식이며 custom flow/transition과 앱별 UX를 제어하기 좋다. mobile/web routing, deep link, static config의 typed route를 제공한다.

Expo Router는 파일 기반 경로를 Expo CLI/bundler와 통합한다. dynamic/typed routes, automatic deep linking, 개발 lazy bundling과 web static rendering이 주요 기능이다. 새 Expo 기본 템플릿에 포함되며 native UI 자체를 web DOM으로 바꾸는 도구는 아니다.

파일 기반 경로를 원하는 새 Expo 앱은 Router를 출발점으로 삼을 수 있다. 이미 Navigator 구성이 있는 프로젝트는 해당 계약과 화면 전환 요구부터 확인한다. layout 파일과 화면 경로의 변경은 deep link/web URL에도 영향을 줄 수 있다.

## UI 구현 다음 확인

TypeScript로 설정과 컴포넌트 계약을 확인하고, 아이콘은 vector/custom font/image 방식의 loading과 platform 제약을 구분한다. ESLint/Prettier는 일관된 코드 스타일과 오류 발견에 사용한다. React Native Directory는 후보 라이브러리 탐색용이며 development build 지원, SDK 버전과 실제 native setup을 별도로 검증한다.

## 출처

- [Expo Documentation, Tools for development](https://docs.expo.dev/develop/tools)
- [Expo Documentation, Navigation in Expo and React Native apps](https://docs.expo.dev/develop/app-navigation)
- [Expo Documentation, Next steps](https://docs.expo.dev/develop/user-interface/next-steps)

## 관련 문서

- [[Expo-Home-Project]]
- [[Expo-Home-Development-Builds]]
- [[Expo-Home-Debugging-Tools]]
