---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 로컬 debug build와 반복 개발"]
---

# Expo 로컬 debug build와 반복 개발

## 로컬 빌드가 필요한 경우

native 코드의 빠른 반복, 플랫폼 debugger, 직접 credential 관리, 제한된 네트워크 환경, cache provider와 source-built module 확인에 적합하다. Android SDK/Android Studio, iOS용 macOS/Xcode가 필요하다. local build와 EAS cloud build는 병행할 수 있다.

```sh
npx expo install expo-dev-client
npx expo run:android --device
npx expo run:ios --device
```

run command는 native compile, 기기/emulator 설치와 Metro 시작을 수행한다. native 폴더가 없으면 플랫폼별 Prebuild를 먼저 한다. 폴더가 있으면 생성을 생략하므로 config 변경 뒤 자동 동기화한다고 가정하지 않는다. `expo-dev-client`가 포함된 debug build는 launcher/tooling이 있는 development build다.

## 첫 빌드 이후

| 변경 | 명령/조치 |
| --- | --- |
| JS/TS 화면과 로직 | `npx expo start`, A/I로 설치된 앱 실행 |
| native library 추가 | native 재빌드 |
| config plugin/native config 변경 | CNG이면 clean 생성 후 재빌드 |
| Swift/Kotlin source 수정 | native compile과 설치 |

`start`는 native binary를 다시 만들지 않는다. CNG 프로젝트는 `npx expo prebuild --clean`으로 누적 plugin 변경 대신 새 결과를 만들 수 있지만 수동 native 변경을 삭제한다.

## build type와 flavor

- Android `--variant debugOptimized`는 SDK54부터 더 빠른 native development iteration에 사용할 수 있다.
- Android `--variant release`, iOS `--configuration Release`는 release mode를 검사하지만 스토어 제출용 signing 절차를 대신하지 않는다.
- Android product flavor는 camelCase 조합, 예를 들어 `--variant freeDebug` 또는 `paidDebug`로 선택한다.
- flavor의 applicationId가 다르면 `--app-id com.example.store.free`로 실제 설치 앱을 실행하도록 맞춘다.

```sh
npx expo run:android --variant freeDebug --app-id com.example.store.free
```

custom build type를 무심코 production으로 사용하면 Expo가 release를 production으로 가정하는 최적화와 어긋날 수 있다. debug/release variant와 signing은 각각 확인한다.

## release와 cache의 다음 단계

스토어 제출은 signed Android AAB 또는 Xcode archive가 필요하다. fingerprint가 같은 local native binary는 cache provider로 재사용할 수 있다. EAS 실행 절차를 자기 인프라에서 재현하려면 별도 `eas build --local` workflow를 검토하며 Expo `run:*`와 같은 명령으로 취급하지 않는다.

## 출처

- [Expo Documentation, Build locally: Overview](https://docs.expo.dev/guides/local-app-overview)
- [Expo Documentation, Create a debug build locally](https://docs.expo.dev/guides/local-app-development)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
