---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo custom native code와 local module"]
---

# Expo custom native code와 local module

## 기존 라이브러리부터 확인

camera, safe area와 서비스 SDK 등 native 기능은 JS binding을 제공하는 라이브러리로 활용한다. Expo Go는 이미 포함된 native 코드만 실행한다. 임의 native 의존성을 설치했다면 앱의 development build에 포함해야 한다.

```sh
npx expo install react-native-localize
npx expo run:android
```

설치 후 plugin이 요구하는 app config를 적용하고 새 바이너리를 만든다. npm 설치와 JS import만으로 기존 binary에 native code가 추가되지는 않는다.

## 직접 작성할 때

플랫폼 기능이 binding에 없거나 native 서비스 SDK를 직접 연결해야 하면 Expo Modules API로 Swift/Kotlin module 또는 native view를 작성할 수 있다. 주로 C++로 작성하는 모듈이면 React Native Turbo Modules API도 비교한다.

앱 하나에서 사용할 코드는 local module로 만든다.

```sh
npx create-expo-module@latest --local
npx expo run:ios
```

local module의 Swift/Kotlin 코드는 프로젝트 `modules/`에 있고 자동 linking된다. npm 공개가 필요하지 않다. 여러 앱에서 공유할 module은 `--local` 없이 standalone package로 만들고 npm 또는 monorepo packages에서 소비한다.

## CNG와 손실 방지

native 폴더는 Prebuild로 다시 만들 수 있으므로 앱 고유 module은 그 밖에 둔다. Manifest/Info.plist 수정은 config plugin으로 표현한다. AppDelegate나 Android lifecycle hook은 subscriber/listener로 연결해 다른 plugin과 entry point 수정을 충돌시키지 않는다.

native 개발은 로컬 Android Studio/Xcode 빌드가 빠른 피드백과 native debugger를 제공한다. cloud build와 병행 가능하며 local native 디렉터리를 생성했다고 CNG를 포기한 것은 아니다. 직접 실험한 native 변경을 유지하려면 재생성 전에 module/plugin으로 옮긴다.

## 출처

- [Expo Documentation, Add custom native code](https://docs.expo.dev/workflow/customizing)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
