---
tags: [expo, react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 프로젝트 생성과 기본 구조"]
---

# Expo 프로젝트 생성과 기본 구조

## 프로젝트 생성

Node.js LTS가 필요하며 macOS, Windows PowerShell/WSL 2, Linux를 지원한다. `create-expo-app` 기본 템플릿에는 TypeScript, Expo Router, 샘플 화면과 개발 시작 설정이 포함된다.

```sh
npx create-expo-app@latest
# 이름을 지정한 예제에서 시작
npx create-expo-app@latest --example with-widgets
# 목록을 대화형으로 선택
npx create-expo-app@latest --example
```

다른 패키지 매니저에서는 `yarn create expo-app`, `pnpm create expo-app`, `bun create expo`를 사용한다. `--template`은 템플릿 선택, `--example`은 기능별 공식 예제 선택이다. 예제 프로젝트의 구조는 기본 템플릿과 다를 수 있으므로 이후 안내의 경로를 그대로 가정하지 않는다.

## 개발 서버와 첫 변경

```sh
npx expo start
# LAN에서 기기에 연결할 수 없을 때
npx expo start --tunnel
```

터미널 QR 코드를 기기에서 열거나 `A`로 Android Emulator, `I`로 iOS Simulator를 연다. 컴퓨터와 기기가 같은 Wi-Fi에 있어야 LAN 연결이 쉽다. 공용 네트워크의 라우터가 연결을 차단하면 tunnel을 고려하되 reload 속도가 느려질 수 있다.

iOS 실기기 Expo Go는 Expo CLI와 같은 Expo 계정으로 로그인해야 개발 서버 프로젝트를 열 수 있다. `npx expo login`과 기기 앱 로그인 상태를 각각 확인한다. 이 조건은 Simulator 안내와 구분한다.

SDK57 기본 프로젝트는 `src/app/index.tsx`, `src/app/explore.tsx`에 화면을 둔다. `src/app/_layout.tsx`의 플랫폼별 `AppTabs`는 Android/iOS에서 네이티브 탭, 웹에서 Expo Router UI 탭을 구성한다. 화면 파일을 변경하면 Fast Refresh로 반영된다.

반영되지 않을 때는 개발 모드, 실행 중인 프로젝트/서버, Fast Refresh 설정을 확인하고 앱을 다시 연다. 기기를 흔들거나 개발 메뉴 단축키로 메뉴를 열어 refresh 상태를 확인한다. 네이티브 구성을 바꿨다면 Fast Refresh만으로 충분하지 않다.

## 샘플 코드 초기화와 다음 단계

```sh
npm run reset-project
```

reset 스크립트는 샘플 코드를 예제 디렉터리로 옮기고 빈 앱 진입점을 만든다. 초기화 설명에는 `app`에서 `app-example`으로 이동한다고 되어 있지만 현재 기본 템플릿의 개발 안내는 `src/app`을 사용한다. 생성된 프로젝트의 `package.json`과 reset 스크립트에서 실제 경로와 보존 대상을 확인한 뒤 사용한다.

초기화 후 UI, 테스트, 네이티브 모듈과 config plugin을 추가하고 팀 리뷰, 빌드, 스토어 제출로 진행한다. 샘플을 제거하는 것은 프레임워크나 필수 설정을 제거하는 일과 다르다.

## 프로젝트 컨텍스트

새 프로젝트는 SDK에 맞는 문서를 안내하는 `AGENTS.md`를 생성한다. Claude Code가 설치된 환경에서는 Expo 플러그인을 활성화하는 `.claude/settings.json`도 추가된다. 공유 지침은 기존 지침과 합쳐 관리하고 사용자 도구에 이미 플러그인이 설치되었다고 단정하지 않는다.

## 출처

- [Expo Documentation, Create a project](https://docs.expo.dev/get-started/create-a-project)
- [Expo Documentation, Start developing](https://docs.expo.dev/get-started/start-developing)
- [Expo Documentation, Next steps](https://docs.expo.dev/get-started/next-steps)

## 관련 문서

- [[Expo-Home-Environment]]
- [[Expo-Home-AI-Agents]]
