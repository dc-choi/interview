---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 수동 native 프로젝트 upgrade diff"]
---

# Expo 수동 native 프로젝트 upgrade diff

## diff가 필요한 이유

native 폴더를 source로 유지하는 앱은 npm dependency upgrade 외에도 Gradle, pods와 entry code 등의 SDK별 변경을 직접 반영해야 한다. Native project upgrade helper는 Expo modules/tooling을 포함한 bare-minimum template의 from/to SDK 차이를 보여준다. React Native만의 Upgrade Helper와 Expo 포함 범위를 구분한다.

## 적용 순서

1. 현재/target Expo SDK와 대응 React/RN dependency를 정한다.
2. JS dependency와 app config upgrade를 수행한다.
3. helper에서 from/to SDK를 선택해 파일별 diff를 확인한다.
4. app의 custom code를 보존하면서 필요한 native 변화만 통합한다.
5. pods/Gradle과 debug/release runtime을 확인한다.

helper의 template diff는 custom 프로젝트 전체의 자동 migration patch가 아니다. 변경이 없는 파일도 앱의 기존 custom API와 지원 version을 확인한다.

## SDK56에서 57의 예

표시된 template dependency diff는 Expo56에서57, RN0.85.3에서0.86.0을 연결하고 React19.2.3은 유지한다. expo-status-bar와 template package version도 대상 SDK로 바뀐다. 이 값은 표시된 template revision의 값이며 모든 앱의 exact patch version을 고정하라는 계약은 아니다.

CNG를 사용하는 앱은 생성 입력과 plugin을 upgrade한 뒤 native를 재생성해 수동 diff 관리 부담을 줄일 수 있다. native 사용자 정의 이관 없이 기존 폴더를 삭제하면 동작 보존을 입증할 수 없다.

## 출처

- [Expo Documentation, Native project upgrade helper](https://docs.expo.dev/bare/upgrade)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
