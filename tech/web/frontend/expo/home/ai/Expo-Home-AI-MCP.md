---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo MCP 연결과 서버 및 로컬 기능"]
---

# Expo MCP 연결과 서버 및 로컬 기능

## 연결 계약

Expo MCP는 Streamable HTTP 서버 `https://mcp.expo.dev/mcp`에 OAuth로 연결한다. Expo 계정, remote MCP를 지원하는 클라이언트와 가이드가 요구하는 최신 Expo 프로젝트가 필요하다. Claude web/desktop/mobile은 Expo Connector로 연결할 수 있다.

공식 Expo plugin을 사용했다면 서버가 이미 등록되므로 중복 등록하지 않는다. 수동 등록 예시는 다음과 같다.

```sh
claude mcp add --transport http expo https://mcp.expo.dev/mcp
codex mcp add expo --url https://mcp.expo.dev/mcp
codex mcp login expo
```

Claude Code는 `/mcp`에서 인증하고 Cursor는 MCP 등록 기능을 사용한다. VS Code는 Command Palette의 MCP: Add Server > HTTP에서 URL과 이름을 등록한다. OAuth 인증으로 access token이 생성되며 연결된 Expo 계정의 접근 범위에서 기능을 사용한다.

## 로컬 기능 설정

SDK54 이상에서 `expo-mcp` 개발 의존성과 local dev server를 통해 앱 제어 기능을 노출한다.

```sh
npx expo install expo-mcp --dev
npx expo whoami
# 미로그인 상태라면 expo login으로 같은 계정 인증
EXPO_UNSTABLE_MCP_SERVER=1 npx expo start
```

CLI와 remote MCP는 같은 Expo 계정을 사용해야 한다. 개발 서버를 시작하거나 종료하면 클라이언트의 MCP 연결을 재연결/재시작해 capability 목록을 갱신한다. remote 연결만 했다고 local screenshots나 DevTools를 사용할 수 있는 것은 아니다.

## 서버 도구의 주요 계약

| 기능 | 도구와 조건 |
| --- | --- |
| 호환 라이브러리 | `add_library`, Expo install과 사용 안내 |
| 문서 읽기 | `read_documentation`, 약 5000 tokens까지, offset으로 긴 문서 분할 |
| 문서 검색/학습 | `search_documentation`은 EAS 유료 plan 요구, `learn`은 주제별 안내 |
| Workflow 생성/검증 | `workflow_create`, 생성 후 `workflow_validate` |
| Workflow 조회 | `workflow_list`, `workflow_info`, `workflow_logs` |
| Workflow 실행/취소 | `workflow_run`은 지정 git ref에 파일 필요, `workflow_cancel`은 run ID 사용 |
| Build 조회 | `build_list`, `build_info`, `build_logs`는 finished/errored 완료 후 logs |
| Build 실행/취소 | `build_run`은 연결된 GitHub repo와 build profile 요구, `build_cancel` |
| 스토어 제출 | `build_submit`, 완료 build와 적절한 distribution type 필요 |
| TestFlight | `testflight_crashes`는 crashId 없으면 목록, 있으면 stack; `testflight_feedback`은 screenshot와 metadata |
| App Store | `appstore_reviews`, `appstore_reply_review`, `appstore_delete_review_response` |
| Google Play | `playstore_crashes`, `playstore_reviews`, `playstore_reply_review` |

프로젝트 조회/실행 도구는 `extra.eas.projectId`의 appId 또는 `@owner/my-app` 형식 appFullName을 사용한다. workflow logs는 먼저 phase/section 목록을 읽고 필요한 sectionIndex 또는 phase를 요청한다. 빌드/Workflow 실행과 취소, store 제출은 외부 상태를 바꾸는 작업이다.

App Store review response는 공개되며 기존 단일 응답을 교체한다. 삭제는 기존 응답이 없으면 no-op으로 처리된다. Play review reply도 단일 공개 응답을 교체하며 350자 제한이 있다. Play reviews 조회는 대략 최근 일주일의 production 텍스트 리뷰로 제한된다는 공식 가이드 조건이 있다. beta feedback과 production reviews를 섞지 않는다.

## 로컬 도구의 주요 계약

- `expo_router_sitemap`: `expo-router`가 있는 프로젝트의 실제 경로 조회. 지원 클라이언트에는 같은 이름의 MCP prompt도 제공한다.
- `open_devtools`: 실행 중 Metro와 앱에 React Native DevTools를 연다.
- `collect_app_logs`: 짧은 시간 범위에서 Android logcat/iOS syslog 또는 JS console을 수집한다.
- `automation_find_view`: React Native `testID`로 위치, 크기, visibility를 확인한다.
- `automation_tap`: `x`와 `y` 둘 다 또는 `testID`를 지정한다. layout 변화에 강한 testID를 우선한다.
- `automation_take_screenshot`: 전체 화면 또는 testID에 대응하는 뷰를 캡처한다.

## 제한과 데이터 흐름

현재 가이드의 local 기능은 한 번에 하나의 dev server 연결을 지원한다. iOS local 기능은 macOS host의 Simulator에 한정되고 iOS 실기기를 지원하지 않는다. capability 목록은 package/server 업데이트로 바뀔 수 있으므로 실제 런타임 목록으로 확인한다.

Expo MCP 자체는 AI 모델을 실행하지 않으며 전송 데이터를 모델 학습에 사용하지 않는다고 명시한다. 그러나 local screenshot/log 등의 데이터는 개발 서버에서 Expo MCP를 거쳐 연결된 클라이언트로 전달된다. 이후 클라이언트와 model provider의 보관/ZDR/학습 정책은 별도다. 민감 프로젝트에서는 이 전체 흐름을 확인한다.

## 출처

- [Expo Documentation, Using Model Context Protocol (MCP) with Expo](https://docs.expo.dev/mcp)

## 관련 문서

- [[Expo-Home-AI-Agents]]
- [[Expo-Home-AI-Device-Toolkits]]
