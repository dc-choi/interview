---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["create-expo-module 생성과 플랫폼 확장"]
---

# create-expo-module 생성과 플랫폼 확장

## 모듈 종류

Local module은 한 앱 안의 커스텀 native 코드다. `npx create-expo-module@latest --local`로 만들며 기본 위치는 modules, `expo.autolinking.nativeModulesDir`가 있으면 그 경로를 사용한다. 앱의 의존성과 도구를 사용하고 별도 example 앱이나 모듈 의존성을 설치하지 않는다.

Standalone module은 여러 앱에서 재사용하거나 패키지로 배포하는 단위다. `npx create-expo-module@latest my-module`은 package metadata, TypeScript/native 소스와 example 앱을 만든다. 기존 Git 저장소 밖이면 새 Git 저장소와 초기 commit을 만들 수 있다. example 생성 과정에서 설치와 Prebuild가 실행되고 macOS에서는 CocoaPods도 설치한다.

## 개발과 옵션

Standalone의 `build`, `clean`, `test`, `prepare` script는 각각 컴파일, 산출물 정리, 테스트, 배포/pack 준비를 맡는다. `open:android`, `open:ios`로 example native project를 열고 example 안에서 `npx expo start`를 실행한다. iOS 도구는 macOS/Xcode가 필요하다. native 코드 변경은 앱 재빌드가 필요하며 JS/TS 변경은 개발 서버가 반영한다.

| 옵션 | 의미 |
| --- | --- |
| `[path]`, `--local` | 생성 위치와 앱 내부 모듈 여부 |
| `--platform android apple web` | 생성할 플랫폼 선택 |
| `--features` | Constant, Function, AsyncFunction, Event, View, ViewEvent, SharedObject 예제 선택 |
| `--features all`, `--full-example` | 모든 기능 예제 포함 |
| `--package-manager` | standalone의 npm/pnpm/yarn/bun 선택 |
| `--no-example` | standalone example 생성 생략 |
| `--barrel` | local module의 index.ts 생성. 기본은 src 직접 import |
| `--source` | npm template 대신 로컬 template 디렉터리 사용 |
| `--with-readme`, `--with-changelog` | standalone 문서 파일 포함 |
| `--name`, `--package` | native module 이름과 Android package 이름 |
| `--description`, `--repo`, `--license`, `--module-version` | 패키지 metadata 설정. license 기본 MIT, 초기 버전 기본 0.1.0 |
| `--author-name`, `--author-email`, `--author-url` | 배포 metadata 입력 옵션 |

Features는 시작 예제의 선택이며 모듈이 구현할 수 있는 기능을 제한하지 않는다. ViewEvent는 View 예제도 포함한다. Apple framework와 native 이름이 충돌하면 이름을 조정한다.

## 비대화형 생성

CI, `EXPO_NONINTERACTIVE` 또는 stdin이 TTY가 아닌 환경에서는 질문 없이 기본값을 채우고 경고를 출력한다. 안정적으로 재현하려면 이름, package, platform과 feature를 명시한다. local module도 비대화형에서는 `--platform`이 없으면 모든 플랫폼이 기본이다.

Standalone은 최신 template, local은 앱 SDK에 맞는 template을 시도하며 SDK 감지에 실패하면 최신 template으로 돌아간다. `EXPO_BETA=1`은 다음 template 버전, `EXPO_DEBUG`는 진단 로그, `EXPO_NO_TELEMETRY`는 telemetry 비활성화에 사용한다.

## 플랫폼 추가

```sh
npx create-expo-module@latest add-platform-support ./packages/my-module --platform android
```

기존 `expo-module.config.json`에 없는 플랫폼 파일과 설정을 추가하고 기존 native 디렉터리는 덮어쓰지 않는다. native module은 Expo Modules API DSL을 사용해야 하며 오래된 module 형식은 지원하지 않는다.

기능 감지는 best effort이므로 분산되거나 생성된 복잡한 구현에서는 `--features`로 명시한다. `--source`로 template을 바꿀 수 있다. 비대화형 add-platform-support에는 `--platform`이 필수다. 생성된 예제 파일이 기존 다른 플랫폼의 동작을 자동 구현했다는 뜻은 아니므로 직접 완성하고 테스트한다.

## 출처

- [Expo Documentation, create-expo-module](https://docs.expo.dev/more/create-expo-module)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
