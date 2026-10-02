---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo New Architecture 버전과 dependency 검증"]
---

# Expo New Architecture 버전과 dependency 검증

## SDK57의 계약

SDK55 이후는 New Architecture만 지원하며 `newArchEnabled:false`로 legacy를 되살릴 수 없다. 이는 React Native0.82 이후의 계약이다. SDK54는 disable 가능한 마지막 SDK이며 SDK53/54는 기본 enabled, SDK52 신규 앱은 기본 enabled였다. 과거 enable/disable 지침은 현재 SDK57 설정 옵션으로 제시하지 않는다.

New Architecture는 RN 내부의 재구성과 Suspense 등 새로운 React/native 기능의 기반이다. Expo SDK의 expo-*와 Expo Modules API는 New Architecture 지원을 제공하지만 앱의 모든 third-party dependency가 검증됐다는 뜻은 아니다.

## Expo Doctor

```sh
npx expo-doctor@latest
```

React Native Directory 데이터로 unmaintained, incompatible/untested와 unknown package를 조사한다. package.json의 `expo.doctor.reactNativeDirectoryCheck`에는 enabled, exclude(정확한 이름/regex), listUnknownPackages를 설정할 수 있다. enabled는 SDK52 이후 기본 true이며 `EXPO_DOCTOR_ENABLE_DIRECTORY_CHECK`로 override한다. 제외는 경고를 숨기는 설정이며 호환성 수정이 아니다.

## migration 검증

이전 SDK를 유지하는 앱의 opt-in은 app config 또는 native gradle/Podfile properties를 바꾸고 새 binary를 만든다. 현재 SDK로 upgrade할 때는 기존 false 설정을 제거하고 native library/view/runtime 기능을 실제 실행한다. compile 성공만으로 missing native view와 lifecycle 문제가 없다는 결론을 내리지 않는다.

## library 문제

interop layer는 legacy module 일부를 실행할 수 있지만 모든 library의 새 architecture 동작을 보장하지 않는다. maps, animation, payment 등 native 의존 package의 지원 version을 현재 SDK matrix에서 확인한다. 과거 SDK53 maps1.20/Stripe0.45 예제를 현재 최신으로 제시하지 않는다.

오래된 masked-view/clipboard 이름은 유지 중인 package로, rn-fetch-blob은 blob-util, filesystem은 Expo FileSystem 또는 유지 중인 대안, geolocation은 Expo Location, datepicker는 유지 중인 picker를 검토한다. 각각 API/권한 계약과 migration 차이를 확인한다.

build 실패는 로그에서 package를 특정하고 Directory/official source를 대조한다. 최소 재현으로 native compile failure와 runtime failure를 분리한다. 알려진 issue가 없다는 문장도 앱 전체에 문제가 없다는 보장은 아니다.

## 출처

- [Expo Documentation, React Native's New Architecture](https://docs.expo.dev/guides/new-architecture)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
