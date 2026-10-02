---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["create-expo-app 옵션과 패키지 관리자"]
---

# create-expo-app 옵션과 패키지 관리자

## create-expo-app

`npx create-expo-app@latest`는 앱 이름을 물어 프로젝트를 생성한다. 이름은 app config의 `name`에도 사용된다. 프로젝트 생성은 의존성 설치와 설정 파일 생성을 수반한다.

| 옵션/템플릿 | 동작 |
| --- | --- |
| `--yes` | 기본 선택으로 생성 |
| `--no-install` | npm 의존성과 CocoaPods 설치 생략 |
| `--no-agents-md` | AGENTS.md와 .claude/settings.json 생성 생략 |
| `--template default` | Expo CLI, Router와 TypeScript를 포함한 다중 화면 기본 구성 |
| `--template blank` | 내비게이션 없는 최소 의존성 |
| `--template blank-typescript` | blank에 TypeScript 적용 |
| `--template tabs` | Router 기반 파일 라우팅과 TypeScript |
| `--template bare-minimum` | Prebuild로 android/ios 디렉터리 생성 |
| `--example <name>` | expo/examples의 특정 통합 예제로 생성 |
| `--version`, `--help` | CLI 버전 또는 옵션 출력 |

기본 생성의 AGENTS.md는 프로젝트 SDK에 맞는 문서를 안내한다. Claude Code가 설치된 경우 skills plugin용 .claude/settings.json도 생성한다. 이는 프로젝트 파일 생성 동작이며 기존 저장소 전체의 에이전트 규칙을 자동 대체할 권한을 뜻하지 않는다.

## 패키지 관리자

npm은 package-lock.json, Yarn Classic은 yarn.lock, pnpm은 pnpm-lock.yaml을 기준으로 EAS에서 지원된다. 생성기가 해 주는 초기 구성과 기존 프로젝트의 관리자 전환은 다르므로 전환 시 lockfile과 빌드 환경 설정을 직접 정리한다.

Yarn Modern의 PnP는 React Native와 맞지 않아 `nodeLinker: node-modules`를 사용한다. EAS에서는 eas.json의 build profile에 `corepack: true`를 설정하고 package.json `packageManager`로 Yarn 버전을 고정한다.

pnpm 생성 기본값은 `pnpm-workspace.yaml`의 `nodeLinker: hoisted`다. SDK 57은 isolated 설치도 지원하므로 프로젝트 의존성 호환성을 확인한 뒤 hoisted 설정을 제거할 수 있다. 기존 프로젝트 전환을 단순히 설치 명령만 바꾸는 작업으로 보지 않는다.

```sh
npx create-expo-app@latest my-app --template blank-typescript
npx create-expo-app@latest my-app --example with-router
```

위 명령은 서로 다른 생성 선택지다. 동일 폴더에 연달아 실행하는 절차가 아니다. Bun은 별도 Expo Bun 가이드의 설치와 EAS 구성을 따른다.

## 출처

- [Expo Documentation, create-expo-app](https://docs.expo.dev/more/create-expo)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
