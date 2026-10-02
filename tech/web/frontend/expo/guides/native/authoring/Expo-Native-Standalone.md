---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Standalone module 공유와 패키지 배포"]
---

# Standalone module 공유와 패키지 배포

## 앱과 분리할 조건

한 앱에만 필요한 모듈은 local module이 기본 출발점이다. 별도 lifecycle/version을 유지하거나 여러 앱에 공유할 때 standalone package를 선택한다. source가 별도 repository에 있다는 이유만으로 npm 공개 배포가 필수는 아니다.

## Workspace 연결

monorepo의 `apps/`와 `packages/` 구조에서 `npx create-expo-module packages/expo-settings --no-example`으로 package를 만든다. 사용하는 각 앱의 package.json dependencies에 package를 추가한다. 원문 Yarn workspace 예시는 `"expo-settings": "*"`이며 다른 package manager는 해당 workspace linking 규칙을 따른다.

모듈 경로에서 `npm run build`로 JS output을 감시한다. 각 consumer 앱의 native autolinking이 module을 찾는지 확인하고 native 프로젝트/Pods를 갱신한 후 native build한다. CNG 앱에서는 Prebuild가 설정을 재현한다. source가 바뀌었다고 이미 빌드된 다른 앱 binary가 자동 변경되지는 않는다.

## Registry와 tarball

standalone scaffold의 example로 Android/iOS를 검증한 뒤 배포한다. package 이름, public export, build output과 native sources, podspec, Gradle, module config가 실제 publish artifact에 들어가는지 확인한다.

| 방식 | 사용 조건 |
|---|---|
| npm registry | 외부 consumer가 versioned dependency로 사용 |
| `npm pack` tarball | publish 이전 consumer 설치 검증, registry 없는 전달 |
| 사설 registry | 내부 패키지 관리 |
| private package + EAS Build | build 환경이 registry credential을 읽을 수 있게 설정 |

원문의 npm login/publish는 배포 절차 설명이다. package 설치는 `npx expo install expo-settings`, native regeneration/build 순서로 검증한다. JS import 예제의 `hello()`가 실행됐다는 사실 외에 native view, 이벤트, 두 플랫폼 기능도 실제 앱에서 확인해야 한다. native package 추가는 Expo Go나 OTA만으로 사용 가능해지지 않는다.

## 출처

- [Expo Documentation, How to use a standalone Expo module](https://docs.expo.dev/modules/use-standalone-expo-module-in-your-project)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
