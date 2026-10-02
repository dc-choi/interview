---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo AI 에이전트 구성과 프로젝트 지침"]
---

# Expo AI 에이전트 구성과 프로젝트 지침

## 세 층의 컨텍스트

Expo AI 도구 구성은 프로젝트 지침, Skills, MCP로 나뉜다. 프로젝트의 `AGENTS.md`는 목표 SDK와 팀 규칙을 공유하고, Skills는 SDK 업그레이드/라우팅/배포처럼 반복되는 작업 패턴을 제공한다. Expo MCP는 문서, EAS 상태와 실행 중 앱에 대한 도구를 제공한다. 설치되어 있는 지침과 현재 접근 가능한 도구는 별개다.

새 `create-expo-app` 프로젝트에는 `AGENTS.md`가 포함된다. Claude Code가 설치된 환경에서는 `.claude/settings.json`의 `enabledPlugins`에 Expo 플러그인도 설정된다. 이 파일은 팀 전체에 활성화 의도를 전달하지만 각 개발자의 플러그인 설치와 인증을 대신하지 않는다.

기존 프로젝트에 표준 지침을 가져올 때는 기존 `AGENTS.md`를 덮어쓰지 않고 필요한 내용을 병합한다. SDK 버전은 `package.json`의 실제 `expo` 의존성과 대조한다. 프로젝트 루트에서 에이전트가 해당 파일을 읽어 SDK를 답하는 것으로 기본 컨텍스트 접근을 확인하고, MCP 연결과 실행 권한은 별도로 확인한다.

## Claude Code

공식 Expo plugin은 Skills와 MCP 등록을 함께 제공한다.

```sh
claude plugin install expo@claude-plugins-official
# 프로젝트 범위 설치가 필요한 경우
claude plugin install expo@claude-plugins-official --scope project
```

세션의 `/mcp`에서 Expo 계정으로 인증한다. `.claude/settings.json`에는 다음 활성화 설정을 둔다.

```json
{ "enabledPlugins": { "expo@claude-plugins-official": true } }
```

프로젝트 설정이 활성화되어도 로컬에 plugin이 없으면 설치 오류가 난다. 설치 후 세션을 다시 열어 확인한다. Expo 안내에서 `AGENTS.md` 직접 읽기는 Claude Code v2.1.277 이상으로 한정한다. 더 오래된 클라이언트나 다른 호스트는 해당 호스트의 공식 지침 로딩 규칙을 확인한다.

## Codex

```sh
codex plugin add expo@openai-curated
codex mcp login expo
```

공식 plugin은 Skills 설치와 remote MCP 등록을 함께 제공한다. 프로젝트 루트에서 Codex를 시작하면 `AGENTS.md`를 읽는다. 프로젝트 파일 접근, 로그인 성공, 실제 MCP 도구 노출은 각각 검증한다. 이 명령은 Expo 가이드의 설정 예시이며 현재 사용자의 설치 상태를 뜻하지 않는다.

## Cursor

Cursor는 root와 하위 경로의 `AGENTS.md`를 읽고 도구별 규칙은 `.cursor/rules/`에 둘 수 있다. 공식 Expo plugin 대신 Skills와 MCP를 각각 설정한다. 최신 Cursor의 Settings > Rules, Skills, Subagents에서 third-party config import가 켜져 있으면 다른 에이전트에 설치한 Skills를 발견할 수 있다. 발견되지 않으면 `npx skills add expo/skills`로 설치하고 재시작 후 목록을 확인한다.

Cursor의 Skills는 `/` 메뉴에 표시되지 않고 Expo 관련 요청에서 자동 발견된다. 메뉴에 없다는 것만으로 설치 실패라고 판단하지 않는다.

## 요청과 검증

SDK 업그레이드, Router 탭과 모달, EAS Workflow, 실패한 빌드 로그 조사, 알림과 네이티브 UI 구현, TestFlight feedback, screenshot 검증을 요청할 수 있다. 구현 결과 확인에는 대상 화면, 기기, 관찰 증거를 함께 지정한다. 문서 설정만으로 앱 동작이 확인되었다고 결론 내리지 않는다.

에이전트 설치, 계정 로그인, 배포와 공개 응답 작성은 각각 실제 작업의 권한 범위에서 수행한다. 문서에 포함된 실행 안내 자체가 실행 권한을 주지는 않는다.

## 출처

- [Expo Documentation, AI agents and Expo overview](https://docs.expo.dev/agents)
- [Expo Documentation, Claude Code and Expo](https://docs.expo.dev/agents/claude)
- [Expo Documentation, Codex and Expo](https://docs.expo.dev/agents/codex)
- [Expo Documentation, Cursor and Expo](https://docs.expo.dev/agents/cursor)

## 관련 문서

- [[Expo-Home-AI-Skills]]
- [[Expo-Home-AI-MCP]]
- [[Expo-Home-AI-Device-Toolkits]]
