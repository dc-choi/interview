---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 버전 업그레이드"]
---

# React Native 버전 업그레이드

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 세 프로젝트를 함께 바꾼다

일반 React Native 앱은 Android, iOS와 JavaScript 프로젝트를 함께 포함한다. package.json의 `react-native`만 바꾸면 native 설정과 template 변경이 빠질 수 있다. 출발 버전과 목표 버전의 dependency, project files와 빌드 도구 변화를 함께 적용한다.

## Expo 프로젝트

Expo 앱의 업그레이드는 `expo`, `react-native`, `react`의 대응 버전을 함께 맞춘다. Expo는 SDK를 한 단계씩 순차적으로 올리는 방식을 권장한다. 여러 단계의 breaking change를 한 번에 섞지 않으면 어느 단계에서 문제가 생겼는지 확인하기 쉽다.

실제 SDK별 명령과 지원 버전은 Expo SDK upgrade guide를 따른다. 최신 React Native 번호만 보고 Expo SDK가 아직 지원하지 않는 조합을 만들지 않는다.

## Upgrade Helper 사용

1. Upgrade Helper에서 현재 버전과 목표 버전을 선택한다.
2. Show me how to upgrade로 버전 간 변경을 확인한다.
3. package.json의 React Native, React와 관련 dependency 버전을 먼저 반영한다.
4. 이후 나오는 Android/iOS와 template 파일 변경을 프로젝트에 수동 병합한다.
5. 자신의 기존 customization을 보존하면서 새 template 계약을 반영한다.
6. 변경 후 두 플랫폼을 rebuild한다.

큰 변경의 useful content 영역과 각 파일의 설명도 확인한다. diff는 template 간 차이이므로 실제 프로젝트의 모든 필요 변경을 자동으로 보장하는 도구는 아니다.

```sh
npm install react-native@<target-version>
npm install react@<matching-react-version>
```

placeholder 값은 Upgrade Helper와 목표 release의 조합으로 선택한다. dependency 변경이 없거나 project file 변화가 없다면 필요한 rebuild를 수행한다. 변화가 있으면 package 설치만으로 완료하지 않는다.

## 0.87에서 추가로 확인할 계약

0.87은 Strict TypeScript API가 기본이므로 deep imports, component refs와 오래된 타입 이름을 확인한다. 타입 변경과 `src/private/*` runtime exports 제거는 별개다. integration 예제의 과거 demo deep import와 custom Jest 초기화도 놓치지 않는다.

## 바뀐 버전이 반영되지 않을 때

설치가 끝났는데 앱에서 예전 버전이 보이면 dependency 설치 결과와 lockfile, native build 산출물과 캐시를 구분한다. 공식 페이지는 `react-native-clean-project`로 cache를 정리하는 방법을 제시한다. 이를 모든 업그레이드의 필수 새 dependency로 추가하지 말고 실제 남은 캐시를 확인한 뒤 필요한 범위를 정리한다.

## 완료 확인

- package.json/lockfile이 목표 조합인지 확인한다.
- 버전 사이의 native template 변경을 병합했는지 확인한다.
- TypeScript와 test setup을 검사한다.
- Android/iOS debug와 release 경로를 각각 확인한다.
- 실제 기기에서 핵심 기능과 native 의존성의 호환성을 확인한다.

이 문서는 절차를 설명하며 특정 앱의 업그레이드 성공이나 실행 검증을 주장하지 않는다.

## 출처

- [React Native, Upgrading](https://reactnative.dev/docs/upgrading)

## 관련 문서

- [[RN-Strict-TypeScript-API]]
- [[RN-Libraries]]
- [[RN-Device-Execution]]
- [[Expo]]
