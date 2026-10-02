---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo CLI 로컬 빌드와 export"]
---

# Expo CLI 로컬 빌드와 export

## Native compile

`expo run:ios`와 `expo run:android`는 native runtime을 로컬에서 컴파일한다. 대응 native 디렉터리가 없으면 해당 플랫폼의 Prebuild를 먼저 수행한다. iOS 로컬 빌드는 macOS/Xcode, Android는 Android Studio/Java가 필요하다.

| 옵션 | 의미 |
| --- | --- |
| `--device [name/id]` | 실기기/가상 기기 선택. 값 생략 시 목록 |
| `--device generic` | 특정 기기에 설치하지 않는 build-only 흐름 |
| `--output <path>` | 빌드 바이너리를 지정 위치에 복사 |
| `--binary <path>` | 빌드를 생략하고 기존 바이너리 설치. 기기 종류가 맞아야 함 |
| `--no-build-cache` | native cache 정리 |
| `--no-install` | 의존성 설치 생략, iOS pod 설치도 영향 |
| `--no-bundler` | 개발 서버 시작 생략 |
| `--port` | 개발 서버 port 지정 |

Android `--variant debugOptimized`는 C++를 release처럼 최적화해 개발 성능을 개선하지만 C++ debugging을 끄고 crash stack 가독성을 낮출 수 있다. product flavor는 variant와 `--app-id`를 함께 맞춘다.

iOS는 `--scheme`으로 Xcode scheme, `--configuration Release`로 release 구성을 고른다. `--device generic --output ./build`는 simulator용 .app 산출물을 얻는 데 사용할 수 있다. Simulator와 실기기 바이너리를 구분한다.

Android release variant나 iOS Release compile은 스토어 제출용 서명을 자동 완성하지 않는다. iOS device development signing도 배포 서명과 다르다. native breakpoint/profile이 필요하면 Android Studio/Xcode에서 프로젝트를 연다.

## Export

`expo export`는 JS와 asset을 production용으로 bundle해 기본 dist로 출력한다. public 디렉터리는 그대로 복사된다. native binary 컴파일과 export는 별도 단계다. 웹 server 출력이 있는 경우 dist 전체를 단순 정적 파일로만 호스팅할 수 있다고 가정하지 않는다.

주요 옵션은 `--platform`, `--output-dir`, `--max-workers`, `--clear`, `--dev`, `--no-minify`다. max-workers 0은 변환을 한 process에서 실행해 Babel 진단에 쓴다. `--no-bytecode`는 native bundle 크기 분석용으로 제한하고 Hermes bytecode를 생략한 결과의 시작 성능을 구분한다. `--no-ssg`는 웹 route의 정적 HTML 생성을 건너뛰어 서버 코드만 필요한 경우에 쓴다.

## Subpath 배포

`experiments.baseUrl: '/my-root'`는 production 웹의 resource/link prefix를 지정한다. output 파일을 같은 상대 구조로 해당 subpath에서 서비스해야 한다. Router의 Link/router와 import/require asset은 prefix를 반영하지만 직접 작성한 a, Linking, resource URL에는 수동 반영이 필요하다.

값을 바꾸면 다시 export한다. 개발 서버와 production 배포의 경로 차이를 직접 확인한다. `expo export:web`은 deprecated Webpack 경로이며 현재 Metro export와 구분한다.

## Native 생성

`expo prebuild`는 native 프로젝트를 생성하는 단계다. `--clean`을 포함한 재생성은 수동 native 수정에 영향을 줄 수 있으므로 앱의 native source 관리 방식을 먼저 확인한다. compile 실패를 해결하려고 변경을 보존하지 않은 채 native 디렉터리를 재생성하지 않는다.

## 출처

- [Expo Documentation, Expo CLI](https://docs.expo.dev/more/expo-cli)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
