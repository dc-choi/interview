---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo CLI 설정 조회, 설치와 환경 옵션"]
---

# Expo CLI 설정 조회, 설치와 환경 옵션

## Config 평가

`npx expo config`는 정적/동적 app config를 평가한다. `--json`은 JSON 출력, `--full`은 전체 설정, `--type`은 아래 결과 종류를 지정한다.

| 종류 | 목적 |
| --- | --- |
| public | 앱/OTA manifest로 공개할 설정 확인 |
| prebuild | async modifier를 포함한 native 생성 설정. 항상 직렬화 가능한 것은 아님 |
| introspect | Info.plist/AndroidManifest 등의 in-memory 변경 일부 확인 |

Introspect 출력은 실제 빌드나 기기 동작 검증과 다르다. `expo customize`는 평소 메모리에서 제공하는 babel/metro/tsconfig 등 파일을 프로젝트에 생성해 커스텀 도구가 읽도록 한다.

## 호환 패키지 설치

`expo install <packages>`는 알려진 호환 조합을 기반으로 패키지 버전을 고르는 best-effort 도구다. `--check`는 권장 버전과 차이를 찾고 로컬에서는 수정 여부를 물을 수 있으며 CI에서는 불일치에 nonzero로 종료한다. `--fix`는 필요한 패키지를 실제로 고친다.

```sh
CI=1 npx expo install --check
npx expo install react-native expo-sms --check
```

`expo.install.exclude`는 특정 검사를 제외한다. 검사에서 빠졌다는 사실은 호환성 증거가 아니다. npm/pnpm/yarn/bun은 lockfile로 감지하고 `--npm` 등의 옵션으로 강제할 수 있다. `--` 뒤의 인자는 underlying package manager로 전달한다.

## Lint

`expo lint`는 Expo용 ESLint 설정과 실행을 지원한다. 기본 대상은 src/app/components이며 파일이나 디렉터리를 지정할 수 있다. `--fix`는 수정 동작이다. 더 세밀한 옵션은 `--`로 전달하거나 eslint를 직접 사용한다. lint 통과와 native 빌드/타입/사용자 동작 검증은 구분한다.

## 환경 옵션

| 목적 | 주요 변수 |
| --- | --- |
| 네트워크 | `HTTP_PROXY`, `EXPO_OFFLINE` |
| 초기 자동 구성 제어 | `EXPO_NO_WEB_SETUP`, `EXPO_NO_TYPESCRIPT_SETUP` |
| CLI 캐시/진단 | `EXPO_NO_CACHE`, `EXPO_DEBUG`, `EXPO_PROFILE` |
| 비대화형 실행 | `CI`는 optional 질문 생략, 필수 질문은 실패 |
| 계측 | `EXPO_NO_TELEMETRY`, `EXPO_NO_TELEMETRY_DETACH` |
| editor | `EXPO_EDITOR`가 `EDITOR`보다 우선 |
| 개발 실행 | `EXPO_NO_REDIRECT_PAGE`, `EXPO_NO_QR_CODE`, `EXPO_ADB_USER` |
| 환경 변수 | `EXPO_NO_DOTENV`, `EXPO_NO_CLIENT_ENV_VARS` |
| Metro 해석 | `EXPO_METRO_NO_MAIN_FIELD_OVERRIDE`, `EXPO_NO_METRO_WORKSPACE_ROOT` |
| Metro runtime | `EXPO_NO_METRO_LAZY`, `EXPO_USE_METRO_REQUIRE`, `EXPO_NO_BUNDLE_SPLITTING` |
| 분석/실험 | `EXPO_ATLAS`, `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH`, `EXPO_UNSTABLE_TREE_SHAKING` |
| 웹 진단 | `EXPO_WEB_DEV_HYDRATE`, `EXPO_PUBLIC_FOLDER` |

`EXPO_NO_GIT_STATUS`는 위험한 명령의 Git 경고를 생략할 뿐 변경 보존을 대신하지 않는다. `EXPO_NO_DEPENDENCY_VALIDATION`도 검사만 끈다. `EXPO_USE_TYPED_ROUTES`보다 app config의 typedRoutes 설정을 사용한다. 오래된 EXPO_UNSTABLE_ATLAS 대신 EXPO_ATLAS를 사용하며 deprecated debugger/inspector/workspace 플래그를 새 기본 구성에 넣지 않는다.

실험 플래그는 이름만 보고 활성화하지 않는다. graph/tree shaking/live binding/LogBox 등의 동작은 SDK와 도구 버전에 따라 달라지므로 실제 기능 가이드와 설치된 CLI help를 대조한다.

## 출처

- [Expo Documentation, Expo CLI](https://docs.expo.dev/more/expo-cli)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
