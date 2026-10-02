---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AI agent로 Expo 앱을 만드는 검증 흐름"]
---

# AI agent로 Expo 앱을 만드는 검증 흐름

## 작업 분담과 반복 단위

AI tutorial은 프로그래밍 입문 문법 대신 요구 설명, 구현, 실제 화면 확인, 수정 요구의 반복으로 StickerSmash를 만든다. Android/iOS/web에서 사진 선택, emoji overlay, drag/resize, 합성 저장까지 구현한다. 사람은 제품 요구와 실제 사용자 동작의 검증을 맡고 agent는 code와 도구 작업을 맡는다.

각 단계는 작은 관찰 가능한 결과로 끝낸다. 첫 화면 배경/text, tabs 전환, 사진 선택 취소, modal 열기/닫기, sticker drag, 최종 저장 파일을 순서대로 확인한다. 같은 prompt도 agent마다 code와 pixel layout이 달라질 수 있으므로 screenshot과 똑같은 코드가 아니라 요구와 실제 결과를 비교한다.

오류는 추측한 원인보다 실제 관찰을 전달한다. 예를 들어 배경만 흰색으로 남음, drag가 시작 위치로 돌아감, 저장 확인은 나오지만 gallery에 파일 없음처럼 입력, 기대, 실제 결과를 적는다. red screen/terminal 오류는 원문 전체를 전달한다. agent에게 방금 변경을 검토해 원인을 찾게 하고, reload와 server restart는 일시적인 UI 문제와 구현 문제를 구분하는 보조 수단이다.

## 도구 준비의 의미

Node.js LTS는 Expo CLI와 package manager 실행 기반이다. AI agent는 file edit와 command 실행이 가능한 도구면 사용할 수 있다. 원문은 Claude Code/Codex terminal 도구와 Cursor editor를 예시로 든다. 설치 경로와 로그인 절차는 해당 제품 공식 문서의 현재 지침을 따른다.

Node/npm 설치 뒤 새 terminal에서 `node --version`, `npm --version`을 확인한다. 설치 완료 메시지만으로 PATH와 새 process의 사용 가능 상태를 보장하지 않는다. 별도 Expo account와 선택한 agent service account도 역할이 다르다.

Skills는 Expo 구조/library/흔한 실수를 설명하는 instruction이고 MCP는 docs search, package 도구와 project inspection 같은 실제 호출 경로다. 둘을 설치했다는 사실과 현재 agent가 읽거나 인증되어 tool을 호출한다는 사실을 구분한다. 원문의 smoke test는 MCP로 expo-image-picker 문서를 검색하고 기능을 설명하는 것이다.

local MCP capabilities는 screenshot/tap 등 simulator 제어를 별도 설정으로 제공한다. 이 tutorial은 실제 phone 검증을 사람이 수행하며, iOS simulator는 macOS가 필요하다. Agent가 source를 읽었다는 사실로 gesture 느낌과 저장 결과를 확인했다고 볼 수 없다.

## SDK57 project와 연결

전용 project folder에서 SDK57 template을 선택하고 reset-project script로 minimal `src/app`을 만든다. reset script가 남긴 example folder 삭제는 tutorial 선택 사항이므로 기존 source가 있는 project에서는 삭제 대상을 먼저 확인한다. agent와 dev server는 별도 terminal에서 실행하면 server 상태와 command 작업을 분리하기 쉽다.

```sh
npx create-expo-app@latest --template default@sdk-57
npx expo start
```

이 command는 SDK57을 명시하는 재현 예시다. 생성 CLI의 실제 template 지원과 설치 lockfile을 확인한다. server QR를 Android Expo Go scanner 또는 iOS camera로 연다. 같은 Wi-Fi가 기본이고 network 연결이 안 되면 `npx expo start --tunnel`을 사용할 수 있다.

physical iOS는 Expo CLI와 Expo Go가 같은 Expo account로 signed in 되어야 한다. 현재 SDK57 physical iOS Go 배포 경로는 Home 환경 문서의 TestFlight/eas go 조건을 따른다. AI setup 원문의 App Store 설치 일반 설명만으로 최신 SDK57 iOS 접근 조건을 판단하지 않는다.

첫 변경은 `#25292e` 배경, 흰색 Home screen text의 중앙 정렬이다. Fast Refresh 후 즉시 보이는 결과로 edit/server/device 경로를 확인한 뒤 feature를 추가한다.

## 출처

- [Expo Documentation, Tutorial: Build an app with an AI agent](https://docs.expo.dev/tutorial/build-with-ai/introduction)
- [Expo Documentation, Set up your tools](https://docs.expo.dev/tutorial/build-with-ai/set-up-your-tools)
- [Expo Documentation, Create your first app](https://docs.expo.dev/tutorial/build-with-ai/create-your-first-app)

## 관련 문서

- [[Expo-Home-AI-Skills]]
- [[Expo-Home-AI-MCP]]
- [[Expo-Home-Environment]]
- [[Expo-Learn-App-Setup]]
