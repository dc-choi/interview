---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 개발 루프와 도구의 역할"]
---

# Expo 개발 루프와 도구의 역할

## JavaScript와 네이티브 바이너리

Expo 앱은 Expo 도구를 사용하는 React Native 앱이다. SDK 패키지, Router, CLI, CNG를 모두 채택해야 하는 별도 앱 종류가 아니다. Expo는 오픈 소스 도구이며 EAS는 빌드, 제출, 업데이트와 협업을 제공하는 호스팅 서비스다. Expo 사용이 EAS 사용을 의무화하지 않으며 기존 React Native 프로젝트도 EAS를 선택할 수 있다.

모바일 앱은 두 층으로 구성된다.

| 층 | 책임 | 변경 반영 |
| --- | --- | --- |
| JavaScript | React 화면, 업무 로직, JS 전용 npm 패키지 | 개발 서버의 reload, 호환되는 OTA 업데이트 |
| Android/Xcode 프로젝트 | 앱 시작, native 렌더링, 모듈, 이름/아이콘/권한/associated domain | 네이티브 컴파일과 새 바이너리 |

`create-expo-app`은 보통 `android/`, `ios/`를 먼저 만들지 않는다. 필요할 때 Prebuild가 app config와 의존성에서 생성한다. 클라우드 빌드만 쓰면 개발 머신에서 Xcode나 Android Studio를 설치하지 않고도 바이너리를 만들 수 있다. 네이티브 디버깅을 하려면 플랫폼 개발 도구가 필요하다.

## 실행 환경 선택

Expo Go는 설치된 native 기능 범위 안에서 학습과 실험을 빠르게 수행하는 환경이다. 프로젝트의 임의 native 모듈과 앱별 native 설정을 포함하는 배포용 개발 환경으로 볼 수 없다.

Development build는 `expo-dev-client`를 포함한 앱 자신의 debug 바이너리다. native 라이브러리, config plugin과 앱 설정을 포함해 실제 출시 앱과 가까운 환경에서 JS 변경을 반복한다. EAS Build 또는 로컬 `npx expo run:android`, `npx expo run:ios`로 만든다.

## 변경 종류별 반복 절차

1. 화면과 JS 로직만 바꾸면 개발 서버에서 실행하고 reload한다.
2. 이름, 아이콘, splash, 권한과 같은 app config를 바꾸면 native 영향 여부를 확인한다.
3. Swift/Kotlin 코드나 native 프로젝트 설정을 바꾸면 바이너리를 재빌드한다.
4. native 의존성을 추가하면 autolinking/config plugin 적용 후 development build를 다시 만든다.

CNG를 사용하는 프로젝트에서는 `npx expo prebuild --clean`으로 native 디렉터리를 새로 생성한다. `run:*`은 native 폴더가 없는 첫 실행에 해당 플랫폼을 생성하지만 이후 설정 변경을 매번 자동 재생성하는 계약은 아니다. 수동 native 편집을 유지할 프로젝트에서는 재생성으로 편집이 사라지지 않도록 native 프로젝트를 직접 관리한다.

## 테스트, 출시와 운영

- 내부 배포 빌드, Google Play 테스트 또는 TestFlight로 테스터에게 바이너리를 전달한다.
- 개발, preview, production variant는 앱 식별자를 구분해 같은 기기에 병행 설치할 수 있다.
- 출시 바이너리는 EAS Submit 또는 플랫폼 도구를 통해 스토어에 제출한다.
- crash report와 사용자 분석은 서로 다른 운영 신호다. 오류 추적과 행동 분석을 각각 구성한다.
- `expo-updates`는 JS 업데이트를 제공한다. native 런타임에 없는 기능은 OTA만으로 추가할 수 없으므로 새 바이너리가 필요하다.

## Guides 탐색 기준

Development process는 config, permissions, linking, native code, web과 빌드 루프를 다룬다. Router는 화면별 URL과 navigation, Expo Modules API는 native 기능을 JS에 노출하는 계약을 다룬다. 단계별 학습은 Tutorial, 호스팅 빌드/배포/업데이트는 EAS, push와 외부 서비스 연결은 해당 Guides로 이어진다. 이 구분은 도구별 역할이며 사용자의 현재 설정이나 숙련을 뜻하지 않는다.

## 출처

- [Expo Documentation, Guides: Overview](https://docs.expo.dev/guides/overview)
- [Expo Documentation, Develop an app with Expo](https://docs.expo.dev/workflow/overview)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
