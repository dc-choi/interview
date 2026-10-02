---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo monorepo workspace와 native 중복 해석"]
---

# Expo monorepo workspace와 native 중복 해석

## workspace 구조

monorepo는 여러 앱과 공유 package를 한 repository에서 관리한다. `apps/`, `packages/`와 root package.json/workspace 설정으로 tool이 경계를 찾는다. 코드 공유 이점과 dependency/native 해석 복잡성을 함께 고려한다.

npm/Yarn/Bun 계열 workspace 구성은 root의 `private:true`, `workspaces:["apps/*","packages/*"]` 형태다. pnpm은 `pnpm-workspace.yaml`의 packages glob을 사용한다. 실제 workspace protocol 지원은 선택한 manager/version을 확인한다. 앱은 공유 package를 dependency로 선언하고 root에서 install한다. hoisting으로 우연히 접근된 미선언 package를 정식 의존성으로 착각하지 않는다.

## SDK57의 Metro 기본

SDK52 이후 `expo/metro-config`는 monorepo를 자동 구성한다. 과거 monorepo 전용 watchFolders, nodeModulesPaths, extraNodeModules, disableHierarchicalLookup을 무조건 유지할 필요는 없다. 기존 수동 설정 제거 뒤 `expo start --clear`로 오래된 cache를 지우고 해석을 검사한다. SDK56 이후 on-demand filesystem은 project 밖 symlink 해석도 지원한다.

과거 SDK 예제의 watchFolders 설정을 현재 필수 setup으로 복사하지 않는다. 예제에 보이는 SDK58/RN0.88/React19.3 조합은 SDK57의 버전 계약이 아니며 SDK57은 해당 최신 reference의 호환 조합을 따른다.

## isolated installation

SDK54부터 pnpm/Bun의 isolated dependency layout을 지원한다. strict layout은 각 package가 선언한 의존성만 접근하게 해 hidden dependency를 드러낸다. third-party native library가 특정 hoist 경로를 가정하면 여전히 실패할 수 있다. pnpm에서 문제를 확인한 경우 root workspace 설정의 `nodeLinker:hoisted`는 fallback 선택지다. 전체 설치 방식을 바꾸기 전에 실패 package의 경로 가정과 dependency 선언을 조사한다.

## 중복 문제

- monorepo의 중복 React Native 버전은 지원하지 않는다.
- 한 앱의 React 중복은 runtime error를 낼 수 있다.
- Expo/Turbo native module 중복은 하나의 native 구현과 JS의 다른 버전이 불일치할 수 있다.
- native가 없어도 React context를 소유한 package의 중복은 서로 다른 context instance를 만들 수 있다.

`npm why react-native`, `yarn why react-native`, `pnpm why --depth=10 react-native`, `bun pm why react-native`로 dependency 경로를 확인한다. peer range가 오래됐으면 manager의 overrides/resolutions로 단일 버전을 강제할 수 있지만 native/API 호환성 검증을 생략하지 않는다.

`experiments.autolinkingModuleResolution`은 SDK54부터 native autolinking과 Metro resolution을 맞추며 SDK55부터 monorepo에 자동 활성화된다. 같은 native module을 두 버전 compile하는 해결책은 아니다. TV project는 별도 React Native dependency 요구를 검토한다.

## native script 경로

Gradle/Podfile의 `../../node_modules/...` hardcode는 hoisting/isolated layout에서 깨질 수 있다. Node `require.resolve('<package>/package.json')`로 package root를 찾고 실제 해당 SDK의 script 경로를 연결한다. 과거 `react.gradle` file path를 현재 Gradle plugin 구조에 그대로 적용하지 않는다. third-party hardcode는 patch 또는 upstream 수정으로 다룬다.

## 출처

- [Expo Documentation, Work with monorepos](https://docs.expo.dev/guides/monorepos)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
