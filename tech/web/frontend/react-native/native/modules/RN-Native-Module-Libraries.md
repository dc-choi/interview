---
tags: [react-native, native, library, npm]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 네이티브 모듈 라이브러리화"]
---

# React Native 네이티브 모듈 라이브러리화

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 라이브러리 추출이 필요한 조건

여러 앱에서 재사용하거나 npm 패키지로 배포할 모듈은 앱의 `android/ios` 코드에서 분리한다. 앱 전용 구현을 재사용 목적 없이 반드시 라이브러리로 만들 필요는 없다.

`create-react-native-library`는 플랫폼 파일, package 설정, Codegen과 example 앱을 준비한다.

```sh
npx create-react-native-library@latest <library-name>
```

패키지명은 유효한 npm 이름으로 지정한다. 입문 흐름에서는 Turbo module을 선택하고 Kotlin/Objective-C 구현 또는 Android/iOS 공유 C++ 구현을 선택한 다음 Test App을 구성한다. CLI의 실제 prompt는 사용하는 도구 버전에 따라 확인한다.

## 생성 구조

| 디렉터리 | 내용 |
| --- | --- |
| `src/` | JS/TS API와 Spec |
| `android/` | Android 구현과 빌드 설정 |
| `ios/` | iOS 구현과 podspec |
| `cpp/` | 공유 C++ 구현을 선택한 경우의 소스 |
| `example/` | 라이브러리에 연결된 RN 테스트 앱 |

생성 package 설정의 예는 `name: RN<module>Spec`, `type: all`, `jsSrcsDir: src`, `outputDir.ios: ios/generated`, `outputDir.android: android/generated`와 Android Java package 이름이다. 출력 경로는 실제 생성 파일 포함 정책과 함께 확인한다.

## 앱에서 코드를 옮기는 절차

1. 앱의 `specs/` 내용을 라이브러리 `src/`로 옮긴다. 레거시 확장은 typed Codegen Spec이 전제인 단계가 아니다.
2. 라이브러리 `src/index.ts`에서 공개 API를 export한다.
3. Android 구현을 라이브러리 package 경로로 옮긴다.
4. iOS 구현을 `ios/`, 공유 C++를 `cpp/`로 옮긴다.
5. 이전 `codegenConfig.name`을 참조한 헤더와 생성 클래스명을 새 라이브러리 Spec 이름으로 바꾼다.
6. library 설정, podspec, Gradle과 autolinking이 새 구조를 가리키는지 확인한다.
7. 앱에 남은 직접 등록과 복사된 구현이 중복되지 않게 정리한다.

Spec 이름이 `AppSpecs`에서 `RNExampleSpec`으로 바뀌면 코드 include와 renderer 생성 경로를 함께 바꿔야 한다. JavaScript 조회명과 Spec 묶음 이름을 같은 값으로 취급하지 않는다.

## example 앱 검증

`example/`에서 의존성을 설치하고 Android/iOS를 빌드한다. iOS에는 CocoaPods 설치도 필요하다.

```sh
yarn install
yarn android
yarn ios
```

실제 테스트에는 모듈 접근, native 결과와 Promise 실패, native 이벤트 구독 해제, 두 플랫폼의 설치와 생성 과정이 포함된다. 이 문서 작성에서는 example 앱을 생성하거나 실행하지 않았다.

## npm 없이 형제 앱에 연결

다음 구조에서는 Metro의 앱 루트 밖에 라이브러리가 있다.

```text
Development/
  App/
  Library/
```

앱에서 `yarn add ../Library`로 의존성을 추가하고 iOS pods를 설치한다. 라이브러리 JS를 직접 참조하는 예제에서는 Metro에 앱 루트 밖 디렉터리 접근을 허용해야 한다.

```js
const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  watchFolders: [path.resolve(__dirname, '../Library')],
  resolver: {
    extraNodeModules: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

`watchFolders`는 외부 소스 탐색을, `extraNodeModules.react-native`는 라이브러리가 앱의 RN 패키지를 참조하도록 하는 경로를 제공한다. 상대 경로와 workspace 구성은 실제 설치 방식에 맞춰 확인한다.

## npm 배포 흐름

생성된 라이브러리의 배포 설정을 확인한 후 의존성 설치, 패키지 빌드, release를 수행한다.

```sh
yarn install
yarn prepare
yarn release
npm view <package-name>
```

배포 후 앱에서 패키지를 설치한다. iOS에서 native 코드가 포함된 새 의존성을 추가하면 `bundle exec pod install`을 다시 실행한다. 위 명령은 생성 template의 script 계약을 전제로 한다. publish 권한과 버전 정책은 해당 패키지 설정에서 확인한다.

생성 코드를 배포물에 포함할지는 [[RN-Codegen-CLI]]의 `includesGeneratedCode` 제한을 먼저 검토한다.

## 출처

- [React Native, Create a Library for Your Module](https://reactnative.dev/docs/the-new-architecture/create-module-library)

## 관련 문서

- [[RN-Turbo-Native-Modules]]
- [[RN-Cxx-Native-Modules]]
- [[RN-Codegen-CLI]]
- [[RN-Legacy-Libraries]]
