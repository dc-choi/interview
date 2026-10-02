---
tags: [react-native, native, legacy, library]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 npm과 로컬 라이브러리 구성"]
---

# React Native 레거시 npm과 로컬 라이브러리 구성

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## npm package 구성

legacy native module의 npm package는 일반 JS 파일과 함께 Android/iOS native 소스, platform build와 링크 설정을 포함한다. 기존 구현 유지보수용 구조이며 새 확장은 [[RN-Native-Module-Libraries]]의 TurboModule/Fabric 경로를 먼저 검토한다.

```sh
npx create-react-native-library@latest react-native-example-module
```

tool이 생성한 package에서 의존성을 설치하고 example 앱을 시작할 수 있다. 레거시 setup 페이지의 예는 다음과 같다.

```sh
yarn
yarn example android
yarn example ios
```

이 script 이름은 생성 template의 `package.json`에서 확인한다. `@latest`로 받은 도구의 현재 prompt가 예전 template과 같다고 가정하지 않는다. 사용할 architecture와 platform 종류를 명시하고 생성 source를 검토한다.

## 앱 내부 로컬 library

로컬 library는 앱에 속하지만 npm registry에 publish하지 않는 View/module 묶음이다. 앱의 `android/`와 `ios/` 밖에서 별도 package로 관리하고 autolinking으로 연결한다.

```text
MyApp/
  modules/
    example-module/
  android/
  ios/
  src/
  package.json
```

이 분리는 native implementation을 앱 template 변경과 덜 얽히게 하고 다른 앱에 옮길 수 있게 한다. 앱 내부에 있다고 module 등록 없이 접근 가능한 것은 아니다.

## 생성과 dependency 연결

앱 루트에서 `npx create-react-native-library@latest example-module`을 실행하고 local library 구성을 선택한다. local setup 가이드의 생성 결과는 `modules/` 아래 package와 앱 dependency다.

npm 예시:

```json
{"dependencies": {"example-module": "file:./modules/example-module"}}
```

Yarn 예시:

```json
{"dependencies": {"example-module": "link:./modules/example-module"}}
```

설치 과정에서 `node_modules`의 로컬 연결을 만들고 autolinking이 이를 탐색한다. `npm install` 또는 `yarn install`을 실행한 뒤 package 이름으로 import한다.

```js
import {multiply} from 'example-module';
```

package manager 버전에 따른 `file:`/`link:` 처리, local library 위치와 template 지원 상태는 실제 설치 결과로 확인한다. 문서의 symlink 설명만으로 모든 npm 버전이 같은 방식으로 연결한다고 일반화하지 않는다.

## native 변경 반영

iOS native dependency에는 pods 반영이 필요하고 native 앱을 다시 빌드해야 한다. package 설치 성공, autolinking 탐색 성공, platform source 컴파일과 JS에서 module 접근은 서로 다른 확인 단계다.

Codegen을 사용하는 새 local library에는 Spec 탐색/생성 계약도 추가된다. 레거시 local setup 페이지의 폴더 분리 개념과 새 architecture 구현 계약을 구분한다.

## 출처

- [React Native, Native Modules NPM Package Setup](https://reactnative.dev/docs/legacy/native-modules-setup)
- [React Native, Local libraries setup](https://reactnative.dev/docs/legacy/local-library-setup)
- [React Native, Create a Library for Your Module](https://reactnative.dev/docs/the-new-architecture/create-module-library)

## 관련 문서

- [[RN-Legacy-Native-Modules]]
- [[RN-Native-Module-Libraries]]
- [[RN-iOS-Simulator-and-Linking]]
