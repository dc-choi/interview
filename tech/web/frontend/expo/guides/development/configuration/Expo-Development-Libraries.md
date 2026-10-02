---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 라이브러리 호환성과 설치"]
---

# Expo 라이브러리 호환성과 설치

## 세 종류의 의존성

React Native core의 `View`, `Text`, `TextInput`, `ScrollView` 등은 `react-native`에서 import한다. Expo SDK는 camera, media, device, OAuth, updates 등 추가 플랫폼 기능을 제공한다. npm의 일반 JS 패키지는 Node/browser API를 전제로 할 수 있으므로 npm에 있다는 사실만으로 React Native 호환성을 판단하지 않는다.

```sh
npx expo install expo-device
npx expo install @react-navigation/native
```

`expo install`은 가능한 경우 현재 SDK와 호환되는 버전을 골라 프로젝트의 package manager로 설치하고 알려진 비호환성을 경고한다. 설치 성공이 플랫폼별 native 구성 완료를 뜻하지는 않는다.

## 확인 순서

1. SDK API reference의 플랫폼과 Expo Go 지원 태그를 확인한다.
2. Expo SDK에 없으면 React Native Directory에서 플랫폼, New Architecture와 Expo Go 호환성을 찾는다.
3. package source/README에서 native 디렉터리, linking 요구와 Manifest/Podfile/Info.plist 수정을 확인한다.
4. config plugin 존재와 추가 설치 단계를 확인한다.
5. development build를 생성해 실제 native 구성에서 검증한다.

`android/ios`를 포함하거나 linking, native 파일 수정, config plugin을 요구하는 의존성은 native 바이너리에 영향을 줄 가능성이 있다. native 기능을 추가했으면 기존 development build를 재사용하는 JS reload만으로 완료할 수 없다.

## 실행 환경과 plugin

React Native 호환 라이브러리는 그 native 코드를 포함한 development build에서 사용할 수 있다. Expo Go는 사전 포함된 native 코드 범위로 제한되므로 Expo Go 미지원이 Expo 전체 미지원은 아니다.

CNG에서는 라이브러리 plugin 또는 검증한 외부 config plugin으로 native 설정을 생성한다. Prebuild를 쓰지 않는 기존 앱에서는 각 라이브러리의 수동 native 설치 지침을 따른다. `expo` 패키지가 없는 React Native 프로젝트는 먼저 Expo Modules 통합을 완료한다.

## 버전 검사 예외

특정 의존성 버전을 의도적으로 유지해야 한다면 `package.json`의 `expo.install.exclude`에 패키지를 등록할 수 있다. 이 설정은 `expo install`, `expo-doctor`, `expo start`의 버전 검사 예외이며 해당 버전의 호환성을 만들어 주는 기능이 아니다. 제외 사유와 native/JS 버전의 실제 조합을 별도로 확인한다.

## 출처

- [Expo Documentation, Using Expo SDK, React Native, and third-party libraries](https://docs.expo.dev/workflow/using-libraries)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
