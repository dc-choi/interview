---
tags: [ai, agent, coding-agent, ide, jetbrains, mcp, acp, debugging, spec]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["JetBrains IDE Agent Integration", "JetBrains IDE의 코딩 에이전트 통합", "Air in IDEs", "IntelliJ MCP Server", "ThinkRail"]
---

# JetBrains IDE의 코딩 에이전트 통합 — 에이전트 실행 화면과 IDE 도구 노출

IDE와 코딩 에이전트는 두 방향으로 연결된다. IDE가 에이전트 세션을 띄우고 대화와 변경을 보여 주는 클라이언트가 되기도 하고, 빌드, 심볼 조회, 리팩터링과 디버거 같은 IDE 기능을 에이전트가 부르는 도구로 내놓기도 한다. 앞쪽은 [[Agent-Client-Protocol|ACP]], 뒤쪽은 [[MCP]]와 이어진다. 아래는 2026-10-21 JetBrains, ACP와 Anthropic 공식 문서로 확인한 IntelliJ 계열 IDE의 사례다. EAP 기능은 이름, 위치와 동작이 바뀔 수 있으므로 버전과 상태를 함께 적는다.

## 두 연결 방향

| 방향 | 역할 | IntelliJ 계열의 예 | 확인할 것 |
|---|---|---|---|
| IDE가 에이전트를 실행 | 에이전트 세션의 화면, 대화와 변경 검토 | Air in IDEs 플러그인(EAP) | 에이전트 출처, 인증 방식, 세션별 변경 |
| 에이전트가 IDE 기능을 호출 | 빌드, 심볼과 리팩터링, 디버거 제공 | IntelliJ IDEA 내장 MCP 서버 | 노출한 도구, 확인 없는 실행 설정, 경로 경계 |

## IDE 안에서 에이전트를 실행한다

- **상태**: Air in IDEs는 코딩 에이전트를 시작하고 진행을 따라가며 변경을 검토하는 플러그인이다. Air 자체는 AI 모델을 제공하지 않는다. JetBrains는 이 플러그인을 에이전트와 함께 개발하는(agentic development) 다른 방식을 평가하는 실험이자 EAP 릴리스라고 설명한다. 2026.2 이후 IntelliJ 기반 IDE와 호환되고 AI Assistant를 대체하거나 끄지 않는다. 2026.2 IDE에는 Marketplace에서 설치하고 2026.3 EAP 빌드에는 번들로 들어 있으며, Android Studio를 뺀 JetBrains IDE에서 쓸 수 있다.
- **에이전트 출처**: 이미 설치된 로컬 에이전트를 자동으로 감지하거나 ACP agent registry에서 설치하며, 기본 registry는 JetBrains가 제공한다. 한편 agentclientprotocol.com의 ACP Registry는 인증을 지원하는 에이전트만 담은 선별 목록이고, 클라이언트가 가져오는 registry JSON에 자동 설치용 배포 정보가 들어 있다. 확인한 Air 문서는 기본 registry가 이 목록과 같은지 밝히지 않는다.
- **두 화면**: chat surface는 ACP 에이전트와의 대화를 IDE 안에 보여 주며 진행, 도구 호출과 권한 요청을 구조화해 표시한다. terminal surface는 CLI 에이전트를 전체 화면 editor tab의 터미널로 연다. 세션마다 쓸 에이전트, 모델, effort와 접근 수준은 preset으로 저장할 수 있다.
- **세션과 변경**: Agent Sessions 창은 IDE, 외부 도구와 cloud run에서 시작한 세션을 한 tree로 보여 준다. 세션 시작 뒤 에이전트가 바꾼 파일은 그 세션 아래 묶이고, Show Diff로 변경 전 상태와 비교한다. 어떤 에이전트 도구 호출에도 해당하지 않는 변경은 worktree별 Other changes로 따로 나온다. 세션별 비용은 보기 옵션에서 켰을 때 에이전트나 제공자가 값을 주는 경우에만 표시되며 근삿값일 수 있다.

## 구독 인증은 실행 경로에 따라 달라진다

Air의 에이전트는 에이전트 자체 로그인, JetBrains AI, 직접 설정한 제3자 제공자 가운데 하나로 인증한다. chat surface의 Claude Agent는 SDK 연동으로 실행되므로 Claude 구독으로 인증할 수 없고, JetBrains AI를 고르거나 API 과금의 Anthropic API key 인증을 설정해 쓴다. 구독을 쓰려면 Claude Code CLI를 설치하고 Pro나 Max 요금제로 terminal surface에서 Claude Code를 실행한다. JetBrains는 이 제한의 이유로 SDK 연동과 Anthropic 약관을 든다.

Anthropic의 Claude Code 문서는 OAuth 인증이 Claude Free, Pro, Max, Team, Enterprise 구독 구매자만을 위한 것이며, Claude Code와 Anthropic 자체 앱의 일반적인 사용을 지원하도록 설계됐다고 적는다. 같은 문서는 Claude의 기능을 쓰는 제품이나 서비스를 만드는 개발자에게, Agent SDK를 쓰는 경우를 포함해 Claude Console이나 지원 클라우드 제공자를 통한 API key 인증을 쓰도록 한다. 제3자 개발자가 자기 앱에 Claude.ai 로그인을 제공하거나 사용자 대신 Free, Pro, Max 요금제 자격 증명으로 요청을 보내는 것은 허용하지 않는다. 반면 수정하지 않은 Claude Code 실행 파일에 최종 사용자가 자기 구독으로 로그인하는 것은 막지 않는다. 같은 모델을 쓰더라도 SDK 기반 대화 화면과 원래 CLI 실행은 인증 조건이 다르다. 제공자 정책 전반은 [[LLM-Provider-Usage-Policy|LLM 제공자 이용 정책]]에서 다룬다.

## IDE 기능을 MCP 도구로 내놓는다

아래 설정과 도구 이름은 IntelliJ IDEA 2026.2 Help 기준이다.

- **활성화**: IntelliJ IDEA는 2025.2부터 MCP 서버를 내장한다. Settings | Tools | MCP Server에서 Enable MCP Server를 선택하면, 열린 프로젝트에 제3자 앱이 접근하는 범위를 검토하라는 확인 창이 뜬다.
- **연결**: Junie, VS Code, Claude Code, Codex, Air, GitHub Copilot CLI처럼 감지된 외부 클라이언트는 Clients Auto-Configuration으로 자동 설정한다. 목록에 없는 클라이언트에는 SSE, Stdio, HTTP Stream 설정을 복사해 넣는다.
- **도구**: `build_project`, `get_symbol_info`, `rename_refactoring`과 `xdebug_` 접두어의 디버거 도구가 있고, Exposed Tools 탭에서 도구별로 노출을 켜고 끈다. 에이전트가 문자열 치환 대신 코드 구조를 이해하는 IDE의 심볼 정보와 리팩터링을 쓸 수 있다는 점은 [[Agent-Code-Search|에이전트 코드 인텔리전스]]의 심볼 계층과 이어진다.
- **router 모드**: Router-only로 지정한 도구는 도구 목록에 직접 노출하지 않고 router 도구를 통해서만 부른다. 적용 대상은 Enable router-only mode for 설정으로 정하며, 문서는 모든 에이전트와 ACP 에이전트만을 예로 든다. 필요 없는 도구 설명이 컨텍스트에 들어가지 않는다. 디버거를 이 모드로 쓰면 디버거 도구를 따로 노출하지 않고 범용 `execute_tool` 하나로 부르게 하며, 에이전트가 디버거 스킬을 필요할 때 불러온다(2026.2 이후).
- **경계**: Brave mode는 연결된 클라이언트가 터미널 명령이나 run configuration을 매번 확인 없이 실행하게 한다. `apply_patch`의 경로는 프로젝트 디렉터리 안이어야 하지만, 이 제한을 모든 도구가 격리된다는 뜻으로 확대 해석하지 않는다. 로컬 MCP 서버의 실행 권한은 [[MCP-Security-Boundaries|MCP 보안 경계]]의 기준으로 점검한다.

## 디버거를 에이전트의 관찰 도구로 쓴다

로그포인트는 실행을 멈추지 않고 걸릴 때마다 콘솔에 디버그 메시지를 쓰는 breakpoint다. 실행 가능한 두 줄 사이의 gutter를 클릭해 만들거나 기존 breakpoint의 Suspend를 해제해 바꾼다. Breakpoint hit 메시지, 현재 frame의 stack trace와 지정한 식의 평가 결과를 남길 수 있고, 조건식을 두면 그 식이 true일 때만 기록한다. 코드와 라이브러리에 출력문을 넣지 않고 실행 중 값을 확인하는 방법이다.

IntelliJ IDEA 2026.1.3 이후는 내장 MCP 서버로 디버거를 외부 AI 에이전트에 노출한다. 번들 스킬 `ij-debugger`는 AI Assistant 플러그인이 설치되고 켜져 있을 때 제공된다. 기본으로 켜져 있지만 IDE 안의 에이전트에만 적용되므로, IDE 밖의 Claude Code나 Codex에서 쓰려면 Skills 설정에서 Claude Agent(Global)나 Codex(Global)를 골라 따로 설치한다. 이 스킬은 에이전트가 로그포인트로 실행 증거를 먼저 모으게 하고, 실행을 멈추는 breakpoint, stepping이나 식 평가로는 필요할 때만 넘어가게 한다. 또 에이전트가 둔 breakpoint와 사용자가 직접 둔 breakpoint를 추적하는 방법도 안내한다. 에이전트가 표준 디버거를 조작하는 동안 사용자는 Debug 창에서 세션을 따라가고 언제든 넘겨받을 수 있다.

운영 제안: 실패한 테스트를 맡길 때는 원인을 확인하기 전에 코드를 바꾸지 말고 로그포인트로 실행 증거를 먼저 모으도록 지시한다. 에이전트가 둔 breakpoint와 수정 diff를 세션 기록과 함께 검토하고, 원인 설명이 테스트 결과와 맞는지 확인한다.

## 스킬과 로컬 모델의 위치

- **스킬**: Settings | Tools | AI Assistant | Skills에서 관리하고 GitHub 저장소 URL로 외부 registry를 더한다. 여기서 관리하는 스킬은 Claude Agent와 Codex에서 쓰며, 설치 수준은 IDE 내부 저장소, 프로젝트의 `.agents/skills`, Claude Agent의 `.claude/skills`와 `~/.claude/skills`, Codex용 `.codex/skills`와 `~/.codex/skills`이다(AI Assistant 2026.2 Help 기준). JetBrains가 Codex용으로 쓰는 `.codex/skills`와 `~/.codex/skills`는 [[Agent-Skills|에이전트 스킬]]에 정리한 Codex 탐색 경로에 없으므로, IDE 밖 Codex에 설치한 스킬이 실제로 목록에 나타나는지 확인한다.
- **로컬 모델**: 확인한 Air 문서에는 로컬 모델 설정이 나오지 않으므로 로컬 모델은 실행할 에이전트의 문서에서 지원 여부를 확인한다. 예를 들어 Junie CLI는 `/account`에서 Ollama endpoint(기본값 `http://localhost:11434`)를 등록하면 endpoint를 조회해 발견한 모델을 선택 목록에 더한다. Junie IDE 플러그인은 Ollama와 로컬 모델 선택을 지원하지 않는다.

## 에이전트를 엔진으로 둔 IDE: ThinkRail

기존 IDE에 에이전트를 붙이는 대신, 코딩 에이전트를 엔진으로 두고 그 둘레에 편집기, 터미널과 검토 도구를 얹는 형태도 있다. 2026-10-27 JetBrains 공식 저장소 README(main 797702a003, Apache-2.0, incubator 프로젝트) 기준 ThinkRail은 pi 코딩 에이전트를 프로세스 안에서 실행하는 얇은 호스트다. 모델, 스킬, 맥락 압축, 비용과 세션 상태는 pi가 맡고, 앱은 작업 공간, 편집기와 통신만 맡으며 사용자 모르게 프롬프트를 조립하지 않는다고 밝힌다. 데스크톱 앱과 브라우저에서 여는 `thinkrail` CLI가 같은 엔진 호스트를 쓴다.

- **작업 공간 격리:** 저장소를 프로젝트로 열고 작업 공간을 `git worktree`로 만들어 브랜치와 작업 디렉터리를 나눈다. PR이 병합되거나 닫히면, 또는 일주일 동안 활동이 없으면 보관 선반으로 옮긴다. PR을 연 뒤에는 CI 검사와 리뷰 결정을 보여 주고 실패한 검사나 갈라진 브랜치의 처리를 에이전트에게 넘길 수 있다. worktree가 나누는 것과 공유하는 것은 [[Agent-Terminal-Workspaces#Worktree가 나누는 것과 공유하는 것|에이전트 작업 공간]]을 따른다.
- **명세를 세션 밖에 둔다:** 코드 옆에 연결된 `SPEC.md` 그래프를 두고 에이전트가 전용 `spec_*` 도구로 읽고 검색하고 고친다. ThinkRail 저장소 자체도 모듈마다 `SPEC.md`를 두고, 경계, 계약이나 결정이 바뀌면 같은 변경에서 명세를 고치는 명세 우선 방식으로 개발한다. 다른 코딩 에이전트용으로 둔 Agent Skills는 원래 위치에서 읽는다.
- **MCP 승인:** 서버가 읽기 전용으로 표시하지 않은 호출은 채팅에서 묻고, 저장소가 정의한 서버는 사용자가 승인하기 전까지 꺼 둔다. 읽기 전용 표시는 서버가 스스로 붙이는 정보이므로 서버 자체의 신뢰는 [[MCP-Security-Boundaries|MCP 보안 경계]]의 기준으로 따로 확인한다(운영 제안).
- **인증과 수집:** 자체 계정 없이 JetBrains AI나 pi의 제공자 인증을 쓴다. 기본 사용 이벤트와 오류 보고는 무작위 설치 ID와 함께 항상 전송되며, 프롬프트, 코드, 파일과 자격 증명은 넣지 않는다고 밝힌다. 추가 사용 정보 공유만 설정이나 `--no-analytics`로 끈다.

명세 파일을 에이전트의 장기 기억으로 쓰는 방식은 [[Agent-Spec-Writing|에이전트 스펙 작성]]과 이어진다. 설치와 실행은 하지 않았다.

## 도입 점검

다음은 위 공식 문서의 내용을 도입에 적용한 이 문서의 점검 제안이다.

- 에이전트를 어디서 설치했는지와 어떤 인증 방식으로 실행하는지 기록한다.
- MCP 서버에서 노출한 도구 목록과 Brave mode 사용 여부를 확인한다.
- 세션별 diff와 Other changes를 나눠 검토하고, 비용 표시는 제공자 값이 있는지 확인한 뒤 쓴다.
- EAP 기능은 IDE 버전을 올릴 때마다 위치와 동작을 다시 확인한다.

## 출처

- [JetBrains, IntelliJ IDEA MCP Server](https://www.jetbrains.com/help/idea/mcp-server.html) — 2026.2 Help
- [JetBrains, IntelliJ IDEA Agentic debugging](https://www.jetbrains.com/help/idea/agentic-debugging.html)
- [JetBrains, IntelliJ IDEA Logpoints](https://www.jetbrains.com/help/idea/logpoints.html)
- [JetBrains, IntelliJ IDEA Air in JetBrains IDEs](https://www.jetbrains.com/help/idea/air-in-jetbrains-ides.html) — 2026-09-30
- [JetBrains, Air in IDEs Overview](https://www.jetbrains.com/help/air-ides/air-overview.html) — 2026-10-15
- [JetBrains, Air in IDEs Key concepts](https://www.jetbrains.com/help/air-ides/air-key-concepts.html) — 2026-10-15
- [JetBrains, Air in IDEs Configure authorization](https://www.jetbrains.com/help/air-ides/air-configure-authorization.html) — 2026-10-15
- [JetBrains, Air in IDEs Manage agent sessions](https://www.jetbrains.com/help/air-ides/air-manage-agent-sessions.html) — 2026-10-15
- [JetBrains, Air in IDEs Use Claude subscription](https://www.jetbrains.com/help/air-ides/air-use-claude-subscription.html) — 2026-10-15
- [JetBrains, AI Assistant Agent skills](https://www.jetbrains.com/help/ai-assistant/agent-skills.html) — 2026.2 Help
- [JetBrains, Junie Ollama](https://junie.jetbrains.com/docs/custom-llm-ollama.html) — 2026-10-20
- [Agent Client Protocol, Registry](https://agentclientprotocol.com/get-started/registry)
- [Claude Code Docs, Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) — 인증과 자격 증명 사용
- [ThinkRail — GitHub, JetBrains](https://github.com/JetBrains/thinkrail) — 2026-10-27 README(main 797702a003)로 엔진과 호스트의 책임, worktree 작업 공간, SPEC.md 그래프, MCP 승인과 사용 데이터 수집 대조
- [JetBrains Thinkrail - 명세로 프로젝트 지식을 유지하는 에이전트 IDE — GeekNews](https://news.hada.io/topic?id=35994) — 학습 계기

## 관련 문서

- [[Agent-Coding-Tools|코딩 에이전트 작업 도구]]
- [[Agent-Client-Protocol|ACP]]
- [[MCP|MCP와 도구 연결]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Code-Search|에이전트 코드 인텔리전스]]
- [[Agent-Skills|에이전트 스킬]]
- [[LLM-Provider-Usage-Policy|LLM 제공자 이용 정책]]
- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]
- [[Agent-Spec-Writing|에이전트 스펙 작성]]
