---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native와 Bundled Hermes의 버전 계약

Bundled Hermes는 React Native release와 호환되는 Hermes를 함께 빌드하고 배포하는 방식이다. 독립 버전 번호만 보고 엔진을 임의로 맞추던 부담을 줄인다. 앱에서 Hermes를 사용하는 방법과 엔진 자체를 확장/빌드하는 방법은 구분한다.

## 왜 버전을 묶는가

React Native와 Hermes는 JSI 코드를 공유한다. 서로 다른 JSI revision으로 빌드한 바이너리는 ABI가 맞지 않을 수 있다. React Native release에 맞춘 Hermes source/tag와 build artifact를 사용하면 이 경계를 함께 검증할 수 있다.

stable release에서는 해당 release가 선택한 Hermes revision을 따른다. source/main 개발이나 engine 확장은 Hermes source를 직접 빌드하는 경로가 필요할 수 있다. 엔진 버전만 바꾸고 앱 바이너리 호환성이 유지된다고 가정하지 않는다.

## 플랫폼 배포와 source build

Android는 Gradle이 선택한 variant에 맞는 engine artifact를 사용하고, iOS는 CocoaPods의 engine podspec과 build scripts가 source/prebuilt 선택에 참여한다. source build는 첫 빌드 시간, toolchain과 debug symbol 확보에 영향을 준다.

Architecture의 Bundled Hermes 페이지에는 0.69 당시 `hermes-engine` artifact, Windows 설정, source build와 dSYM 경로가 자세히 남아 있다. 이는 도입 배경을 설명하는 예시다. 0.87 앱에 그 Gradle/Podfile 조각이나 모든 New Architecture 앱이 source build한다는 조건을 그대로 적용하지 않는다. 현재 프로젝트의 React Native package, Gradle plugin과 Pod 설정을 기준으로 확인한다.

## 확인 순서

1. 앱의 React Native version과 잠금 파일을 확인한다.
2. package가 선택한 Hermes version과 build artifact를 확인한다.
3. source build나 engine 변경이 필요한 이유를 확인한다.
4. native ABI, debug/release variant와 symbol을 같은 build 기준으로 맞춘다.

JS 실행 engine을 선택하는 결정과 Hermes가 React Native와 함께 배포되는 계약은 서로 다르다.

## 출처

- [React Native, Bundled Hermes](https://reactnative.dev/architecture/bundled-hermes)
- [React Native, Using Hermes](https://reactnative.dev/docs/hermes)

## 관련 문서

- [[React-Native-Hermes]]
- [[RN-Android-Build]]
- [[React-Native-Build-Speed]]
