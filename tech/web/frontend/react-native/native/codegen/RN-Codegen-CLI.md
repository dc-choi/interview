---
tags: [react-native, native, codegen, library]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Codegen CLI와 생성 코드 배포"]
---

# React Native Codegen CLI와 생성 코드 배포

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## CLI 호출 계약

Codegen CLI는 Gradle과 개별 Node 스크립트 대신 프로젝트의 `@react-native/codegen` 실행을 묶어 준다. 먼저 설치된 React Native와 호환되는 Community CLI를 사용한다.

```sh
npx @react-native-community/cli codegen --help
npx @react-native-community/cli codegen
npx @react-native-community/cli codegen --platform ios
```

| 옵션 | 의미/기본값 |
| --- | --- |
| `--path <path>` | `package.json`을 읽을 RN 프로젝트 루트, 기본은 현재 작업 디렉터리 |
| `--platform <string>` | `android`, `ios`, `all`, 기본 `all` |
| `--outputPath <path>` | 생성 산출물의 출력 경로 |
| `--verbose` | 상세 로그 |
| `-h`, `--help` | 명령 도움말 |

특정 라이브러리에서 Android 코드만 생성하는 예시는 다음과 같다.

```sh
npx @react-native-community/cli codegen \
  --path third-party/some-library \
  --platform android \
  --outputPath third-party/some-library/android/generated
```

생성 인터페이스를 먼저 열어 보면 네이티브 구현에서 어떤 메서드와 타입을 구현해야 하는지 확인할 수 있다.

## 기본 배포 모델

통상 라이브러리는 Spec과 구현을 배포하고, 라이브러리를 사용하는 앱이 빌드할 때 Codegen을 실행한다. 따라서 생성 코드는 앱의 RN 버전에 맞춰 만들어진다.

`codegenConfig.includesGeneratedCode: true`는 생성 코드까지 라이브러리에 포함하는 별도 배포 방식이다. 파일을 저장소에 추가하는 것만으로 활성화되지 않는다.

## 생성 코드 포함 절차

1. 라이브러리의 `package.json`에서 `codegenConfig.includesGeneratedCode`를 `true`로 설정한다.
2. Codegen CLI를 로컬에서 실행한다.
3. npm 패키지에 생성 출력이 포함되도록 `package.json` 파일 목록을 수정한다.
4. iOS podspec이 생성 코드도 컴파일하도록 구성한다.
5. Android `build.gradle`이 해당 생성 코드를 포함하도록 구성한다.
6. `react-native.config.js`의 `cmakeListsPath`를 생성 출력의 `CMakeLists.txt`로 맞춘다. 기본 build 디렉터리를 찾게 두지 않는다.

생성 경로를 바꾸면 npm 파일 목록, CocoaPods와 Gradle/CMake가 같은 위치를 가리키는지 확인한다.

## 장점과 버전 제한

- 앱이 Codegen을 실행해 주지 않아도 생성 코드가 존재한다.
- 라이브러리 구현과 생성 인터페이스를 같은 버전으로 유지할 수 있다.
- Android에서 두 아키텍처용 파일 집합을 따로 보관할 필요를 줄이는 배포 경로를 제공한다.
- 네이티브 부분을 prebuilt 형태로 배포할 기반이 된다.

생성 결과는 **라이브러리가 사용한 RN 버전**에 묶인다. 예를 들어 0.76으로 생성한 코드를 0.75 앱이 사용하면 호환되지 않을 수 있다. 생성 코드 포함을 RN 모든 버전에 대한 호환 보장으로 해석하지 않는다. 라이브러리의 `peerDependencies`와 지원 버전을 명시하고 실제 앱 조합으로 검증한다.

## 출처

- [React Native, The Codegen CLI](https://reactnative.dev/docs/the-new-architecture/codegen-cli)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Native-Module-Libraries]]
