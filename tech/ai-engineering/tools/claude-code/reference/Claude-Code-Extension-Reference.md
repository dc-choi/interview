---
tags: [ai, claude-code, hooks, subagent, skills, plugin, mcp, mod]
status: done
verified_at: 2026-09-23
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Extension Reference", "클로드 코드 확장 메커니즘", "훅 레퍼런스", "스킬 레퍼런스"]
---

# Claude Code 확장 메커니즘 — 훅, 서브에이전트, 스킬, 플러그인, MCP, mod

일곱 확장 메커니즘은 각각 다른 신호에 대응한다. 어떤 반복이 관찰되면 어떤 메커니즘으로 승격하는지가 선택 기준이다.

| 신호 | 도입할 메커니즘 |
|---|---|
| 같은 실수를 두 번 교정 | CLAUDE.md 규칙 |
| 같은 프롬프트를 반복 입력 | 스킬 |
| 브라우저에서 데이터를 복사해 붙여넣기 반복 | MCP |
| 부가 출력이 대화를 오염 | 서브에이전트 |
| 반드시 실행돼야 하는 동작 | 훅 |
| 두 번째 레포에 같은 설정을 복제 | 플러그인 |
| pane이나 band, Claude 턴 없이 도는 명령, 이벤트 재작성이 필요 | mod |

## 훅 — 결정론적 실행 보장

CLAUDE.md 지시는 무시될 수 있지만 훅은 라이프사이클 시점에 실행이 보장된다. 예외로 설치한 mod는 settings hook 이벤트를 `classic.<Event>`(예: `classic.Stop`)로 받아 훅이 받을 입력을 바꾸거나, 다음 단계로 넘기지 않아 그 이벤트의 settings hook이 돌지 않게 할 수 있다. 도구 호출에서도 mod가 직접 답하면 managed settings 밖의 PreToolUse 훅이 실행되지 않고, `tool.check`를 처리하는 mod는 그런 훅의 차단을 승인으로 바꿀 수 있다. managed settings의 PreToolUse 훅은 모든 mod보다 먼저 돌고 그 차단은 최종이며, 내장 guard가 로드되면 사용자 mod는 managed 훅이 받는 입력과 결정을 바꾸지 못한다(아래 Mod 절). 구조는 이벤트-매처-훅 3단.

- 이벤트: 세션당(SessionStart 등), 턴당(UserPromptSubmit, Stop), 도구별(PreToolUse, PostToolUse, PermissionRequest), 기타(PreCompact, Notification, ConfigChange 등)
- 매처: `*`는 전체, 영숫자와 `|`는 정확 문자열 목록, 그 외 문자가 섞이면 unanchored 정규식 — `Edit.*`가 NotebookEdit에도 매칭되는 함정이 있어 `^...$` 앵커 권장. MCP 도구는 `mcp__server__.*` 형식
- 타입 5종: command(셸 없이 spawn하는 exec form 권장), prompt(단일 턴 LLM 판단, 기본 Haiku 30초), agent(도구를 쓰는 다중 턴 검증, 60초), http(웹훅), mcp_tool
- **exit code는 2만 차단한다** — 1은 비차단 에러로 그냥 진행된다 (가장 흔한 실수). PreToolUse의 2는 차단 + stderr가 Claude에 피드백되고, Stop의 2는 종료를 되돌린다(un-stop)
- JSON 출력: permissionDecision(우선순위 deny > defer > ask > allow), updatedInput(도구 인자 교체), updatedToolOutput(결과 교체), additionalContext(컨텍스트 주입 — 명령형이 아니라 사실 진술체로 써야 한다, 명령형은 인젝션 방어에 걸린다). 한 훅에는 exit code 방식이나 exit 0과 JSON 방식 중 하나만 쓰는 편이 안전하다. Exit 2와 JSON을 섞어도 유효한 stdout JSON은 읽히지만 JSON의 `allow`로 차단을 되돌릴 수 없고, `Elicitation`과 `ElicitationResult`의 `hookSpecificOutput`은 예외다
- 기본 타임아웃: command 600초, prompt 30초, agent 60초. `@` 파일 참조는 PreToolUse를 발화시키지 않는다 — 파일 차단은 권한 규칙으로

## 서브에이전트 — 컨텍스트 격리 위임

- 정의: `.claude/agents/*.md` 프론트매터 — name, description(위임 판단 기준, "use proactively"로 능동 위임 유도), tools, model(기본 inherit), permissionMode, maxTurns, memory, isolation: worktree 등. 본문이 시스템 프롬프트
- 스코프 우선순위: Managed > CLI > 프로젝트 > 사용자 > 플러그인. 플러그인 에이전트는 hooks, mcpServers, permissionMode가 보안상 무시된다
- 호출: description 기반 자동 위임, `@agent-이름` 강제 지정, `claude --agent`로 메인 스레드 자체를 에이전트화
- 제약: 중첩 기본 한도는 메인 대화 아래 3계층이다. `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`로 조정하고 `1`이면 중첩을 끈다. 부모가 `bypassPermissions`면 프론트매터 `permissionMode`는 무시된다. 영구 메모리는 스코프별 agent-memory를 사용하고 첫 200줄 또는 25KB만 로드한다
- 포크 서브에이전트(실험적): 대화 전체와 도구를 상속하고 프롬프트 캐시를 공유해 저렴 — 빈 컨텍스트에서 시작하는 격리 서브에이전트와 정반대 트레이드오프
- 에이전트 팀(실험적): 리드 에이전트가 피어 세션을 감독하며 팀원 간 메시징 + 공유 태스크로 조율. 팀원이 plan 모드로 돌면 일반 세션 대비 약 7배 토큰이고, 토큰은 활성 팀원 수와 각 팀원의 실행 시간에 비례해 증가. 팀원끼리 같은 파일을 편집하면 덮어쓰기가 나므로 파일 영역 분담이 필수 (워크트리 격리는 별도 수동 방식). 대화가 조율할 규모를 넘는 대량 fan-out은 [[Claude-Code-Dynamic-Workflows|동적 워크플로우]]

## 커맨드 — 슬래시 호출은 스킬로 흡수됐다

- 2026-09-16 공식 문서 기준, 커스텀 슬래시 커맨드는 스킬로 만든다. 디렉터리 이름이 곧 명령어라 `.claude/skills/deploy/SKILL.md`가 `/deploy`가 되고, 개인 범위는 `~/.claude/skills/`다
- 스킬에 콜론이 붙는 경우는 둘뿐이다. 저장소 하위 경로의 `<subdir>/.claude/skills/` 스킬이 이름 충돌을 일으키면 `apps/web/.claude/skills/deploy/SKILL.md`가 `/apps/web:deploy`로 노출되고(경로의 슬래시는 그대로 남는다), 플러그인 스킬은 `/플러그인명:스킬명`이 된다
- 레거시 `.claude/commands/deploy.md` → `/deploy`도 하위 호환으로 동작하지만, 공식 문서는 서포팅 파일과 프론트매터 제어를 이유로 새 작업에는 스킬을 권한다. 커맨드 쪽은 하위 디렉터리 경로의 `/`가 `:`로 바뀌어 `.claude/commands/frontend/component.md`가 `/frontend:component`가 된다 — 스킬 폴더를 중첩해도 같은 결과가 나오지는 않는다
- 사람이 부르는 매크로와 모델이 꺼내 읽는 절차서라는 구분은 이제 별도 파일 종류가 아니라 **프론트매터 플래그**로 표현된다. `disable-model-invocation: true`면 사람만 `/이름`으로 호출하고(배포, 커밋처럼 부작용 있는 작업), `user-invocable: false`면 메뉴에서 감춰져 모델만 자동 호출한다(배경지식용). 기본값은 양쪽 다 가능
- 인자 치환은 `$ARGUMENTS`(전체), `$ARGUMENTS[N]`과 `$N`(위치), 그리고 프론트매터 `arguments: [a, b]`로 선언한 이름 인자 `$a`를 지원한다. 자동완성 힌트는 `argument-hint`

## 스킬 — 온디맨드 플레이북

- 프론트매터 핵심: description(자동 로드 판단 기준, 목록 표시는 when_to_use와 합산 1,536자에서 절삭 — `skillListingMaxDescChars`로 조정, name은 Agent Skills 스펙 기준 64자), disable-model-invocation(수동 전용 — 배포나 전송처럼 부작용 있는 스킬에 필수), user-invocable: false(메뉴 숨김, 배경지식용), allowed-tools(**사전 승인이지 제한이 아니다**), context: fork + agent(격리 실행), paths(파일 패턴 자동 활성)
- 치환: `$ARGUMENTS`, `$N`(위치 인자), 동적 컨텍스트는 백틱 셸 실행 — 정책상 차단하려면 disableSkillShellExecution
- 예산: 스킬 목록은 이름을 유지한 채 모델 컨텍스트 윈도의 1%를 기본값으로 하는 문자 예산으로 관리된다(`skillListingBudgetFraction`, `SLASH_COMMAND_TOOL_CHAR_BUDGET`로 조정, 스킬별 `skillOverrides` name-only로 설명 제외 가능). 초과 시 호출 빈도 낮은 스킬부터 설명이 제외되어 최다 사용 스킬은 전문을 유지한다 — `/doctor`로 확인
- 라이프사이클: 호출된 본문은 세션 내내 컨텍스트에 남는다 — 500줄 이하로 유지하고 상세는 서포팅 파일로 분리해 온디맨드 로드. 압축 시 최근 스킬은 총 25,000토큰 예산으로 재부착
- 접근 제어는 권한 규칙 `Skill(name)`. 트리거가 안 되면 description 키워드를, 과다 트리거면 description 구체화나 disable-model-invocation을 점검

## 플러그인 — 배포 단위

- 스킬 + 에이전트 + 훅 + mod + MCP/LSP 서버 + `bin/` + 설정을 하나로 묶은 설치 단위. `.claude/`에서 실험하고 검증되면 플러그인으로 변환하는 것이 권장 경로. 스킬은 플러그인명으로 자동 네임스페이싱되어 충돌이 없다
- 경로는 `${CLAUDE_PLUGIN_ROOT}`(업데이트 시 변경됨), 영구 데이터는 `${CLAUDE_PLUGIN_DATA}`(업데이트 후 유지)
- LSP 플러그인(12개 언어): 편집 직후 자동 진단으로 같은 턴에서 수정하고, 정의/참조 네비게이션으로 grep 기반 파일 읽기를 절감
- 팀 배포는 extraKnownMarketplaces + enabledPlugins를 프로젝트 설정에 커밋. 마켓플레이스 등급과 무관하게 훅, mod, MCP와 LSP 서버, `bin/`을 설치 전에 검토한다. Anthropic은 플러그인에 어떤 MCP 서버, 파일과 그 밖의 소프트웨어가 들어가는지 통제하지 않고, 의도대로 동작하거나 바뀌지 않는다고 검증할 수 없다고 경고한다. 마켓플레이스 자동 업데이트가 켜져 있으면 검토한 파일이 나중에 바뀔 수 있다

## Mod — Claude Code 안에서 도는 함수 훅

- 정의: JavaScript나 TypeScript 이벤트 핸들러로 된 플러그인이다. 도구 호출, 제출한 프롬프트, 화면 일부를 그리는 일 같은 이벤트가 생기면 Claude Code가 핸들러를 부르고, 핸들러는 이벤트를 지켜보거나(observe), 바꿔서 넘기거나(rewrite), 직접 응답해 원래 동작을 대신한다(answer). mods 문서는 mod의 핸들러를 hook, 설정 파일의 기존 훅을 settings hook이라 부른다. 이 문서의 `## 훅` 절은 settings hook을 다룬다
- settings hook, 스킬과 MCP는 Claude Code 밖에서 동작한다(스크립트 실행, 텍스트나 도구 제공). mod는 프로세스 안에서 돌기 때문에 transcript 옆 pane과 프롬프트 위 band를 그리고, 도구 행이나 spinner처럼 Claude Code가 그리는 화면을 바꾸고, 도구 호출을 붙잡아 두거나 대신 답하고, Claude 턴 없이 바로 실행되는 `/command`를 더하고, 같은 파일의 변수로 hook끼리 데이터를 나눈다. `/diff` pane과 `AGENTS.md` 로딩도 내장 mod다
- 버전과 실행 위치: 설치한 mod는 v2.1.287 이상에서 기본으로 켜진다. hook은 그 플러그인을 로드한 세션에서 돌지만 그리는 요소는 터미널과 Desktop 앱 Code 탭에만 보인다(Desktop은 터미널 전용 요소를 그리지 않고, 플러그인을 쓸 수 없는 Desktop의 WSL 세션에서는 hook도 돌지 않는다). VS Code 확장의 채팅 패널, `claude -p`와 Agent SDK에서는 hook만 돌고, 클라우드 세션은 그 세션까지 전달된 플러그인에 한해 hook만 돈다
- 신뢰 경계: mod는 사용자 권한으로 Claude Code 안에서 도는 코드이고 샌드박스가 없다. 사용자 계정이 닿는 파일 읽기와 쓰기, 프로세스 실행과 네트워크 요청, 환경 변수와 설정 파일(그 안의 API 키 포함) 읽기, 모든 프롬프트와 도구 호출의 관찰과 재작성, 사용자가 입력한 것처럼 프롬프트를 제출하거나 다른 세션에 메시지 보내기, 사용자 대신 도구 호출 승인, 사용자의 요금제나 API 키로 모델 호출을 할 수 있다. sandbox를 켜도 격리되는 것은 Claude가 실행하는 Bash 명령이고 mod가 띄운 프로세스는 밖에서 돈다. 다만 권한 프롬프트 화면은 바꾸지 못한다
- 권한 규칙과의 순서: `tool.check`를 처리하는 mod는 규칙과 PreToolUse 훅이 결정한 뒤에 답해 그 결정을 바꿀 수 있다. `ask` 규칙이 물을 호출과 managed settings 밖 PreToolUse 훅이 막은 호출을 승인할 수 있고, auto 모드에서 mod가 승인한 호출은 분류기 검사를 거치지 않는다. deny 규칙은 managed settings가 있는 기기나 Team, Enterprise 로그인에서 내장 guard가 로드될 때만 기본으로 mod보다 우선한다. 그 밖의 환경이나 조직이 guard 옵션 `allowModsToOverrideDenyRules`를 켠 경우, managed `prependPlugins`에서 guard를 빼 guard가 로드되지 않는 경우에는 mod가 deny 규칙이 거부한 호출도 승인할 수 있다. deny 규칙과 managed 훅은 mod 자신의 `$.fs`, `$.process` 호출에는 적용되지 않는다
- 설치 전 점검: 플러그인 파일을 받아 `claude plugin validate <경로>`를 실행하면 코드를 돌리지 않고 `hooks:`(처리하는 이벤트)와 `calls:`(호출하는 mods API 메서드)를 보여 준다. hook은 mods API를 거쳐야만 자기 코드 밖의 일을 할 수 있어서 이 목록이 가능하고, 이 명령이 읽을 수 없는 방식으로 API를 쓰는 mod는 로드되지 않는다. 다만 목록은 메서드 이름이라 `$.process.run`으로 띄운 프로그램의 동작까지 보여 주지는 않는다
- 끄기: 플러그인 단위로 비활성화하거나, 한 세션은 `--safe-mode`, 모든 세션은 `~/.claude/settings.json`의 `"disableAllHooks": true`를 쓴다(내 settings hook과 커스텀 상태표시줄도 멈추고, 조직이 관리하는 것은 계속 돈다). `--safe-mode`, `--bare`, `disableAllHooks`는 내장 mod를 멈추지 않는다. 조직은 managed settings의 `pluginConfigs`에서 내장 guard(`cc-plugin-sec-default@builtin`)의 `allowManagedModsOnly` 옵션을 켜 조직 것으로 인정되는 mod(관리 설정이 가리키는 기기 안 디렉터리 마켓플레이스에서 켠 mod)와 내장 mod만 로드하게 한다. 조직이 켠 원격 마켓플레이스의 mod도 사용자 mod로 분류돼 막히고, 이 옵션은 guard가 로드되는 환경에서만 적용된다

## MCP — 외부 경계 확장

- 트랜스포트 4종: HTTP(권장, OAuth 지원), SSE(레거시), Stdio(로컬 프로세스), WebSocket. 스코프는 local > project(`.mcp.json`, 대화형 세션에서는 사용 전 승인 필요. `claude -p`, Agent SDK, 클라우드 세션과, `bypassPermissions` 모드로 시작하면서 사용자 설정이나 관리 설정에 `skipDangerousModePermissionPrompt`를 둔 세션에서는 묻지 않고 로드) > user — 동일 이름이면 상위 스코프 항목이 통째로 쓰이고 필드 병합은 없다. 예외로 조직이 `managedMcpServers`로 제공한 서버는 이 스코프들보다 우선하고(v2.1.259 이상), Desktop 앱 Code 탭의 로컬 세션은 같은 이름의 stdio 서버가 `~/.claude.json` 최상위(user)와 `.mcp.json`에 함께 있으면 `~/.claude.json` 정의를 쓴다
- Tool Search: 기본 설정에서 도구 이름과 서버 `instructions`만 먼저 로드하고 도구 정의 전체는 필요할 때 불러온다 (MCP 도구가 많을 때의 컨텍스트 비용 방어). 서버 instructions는 Claude가 지연된 도구를 언제 검색할지 판단하는 단서가 된다. 환경 변수, 제공자와 모델에 따라 처음부터 로드하는 예외가 있고, 서버 설정의 `alwaysLoad: true`는 `ENABLE_TOOL_SEARCH` 값과 관계없이 그 서버의 도구를 처음부터 로드한다
- 출력 제한: 10,000토큰을 넘으면 경고하고(경고 기준은 고정), 기본 상한은 25,000토큰이다. 상한은 `MAX_MCP_OUTPUT_TOKENS`로 올릴 수 있고, 도구가 `anthropic/maxResultSizeChars`를 선언하면 텍스트 결과는 그 값(최대 500,000자)을 따른다. 이미지가 없는 결과가 상한을 넘으면 잘라내지 않고 세션의 `tool-results` 디렉터리에 파일로 저장한 뒤 대화에는 파일 경로를 남긴다 — [[Tool-Output-Filtering|도구 출력이 컨텍스트를 채우는 문제]]에 대한 내장 방어선
- 관리자 통제의 함정: serverName 허용 목록은 라벨일 뿐 보안 통제가 아니다 — 같은 이름으로 다른 서버를 등록할 수 있으므로 serverCommand(정확 일치)나 serverUrl로 잠가야 한다
- `claude mcp serve`로 Claude Code 자체를 다른 클라이언트의 MCP 서버로 노출할 수 있다

## 체크포인트

- 일곱 신호와 일곱 메커니즘의 매핑을 설명할 수 있는가
- mod가 settings hook과 다른 점, deny 규칙이 mod보다 우선하는 조건과 설치 전에 `claude plugin validate`로 확인할 것
- 훅 exit 1과 2의 차이, additionalContext를 사실 진술체로 쓰는 이유
- allowed-tools가 제한이 아니라 사전 승인인 이유
- 포크 서브에이전트와 격리 서브에이전트의 트레이드오프 (캐시 공유 vs 오염 차단)
- MCP serverName 허용 목록이 보안 통제가 아닌 이유

## 출처

2026-10-06에는 mods, 플러그인 보안과 권한 문서로 Mod 절과 훅, 플러그인 절의 mod 관련 문장을 대조했다(mod는 v2.1.287 이상 기준). 기존 훅 절의 exit code와 타임아웃 서술처럼 남은 버전 민감 주장이 최신 Hooks 문서와 맞는지는 이번에 다시 확인하지 않았으므로 frontmatter 검증일은 유지한다.

- [클로드 코드 가이드 (레퍼런스 08 MCP, 09 훅, 10 서브에이전트, 11 스킬, 18 플러그인) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code Docs, Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Docs, Hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code Docs, Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Docs, Manage costs (agent team token costs)](https://code.claude.com/docs/en/costs)
- [Claude Code Docs, Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [Claude Code Docs, Slash commands](https://code.claude.com/docs/en/slash-commands)
- [Claude Code Docs, Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code Docs, Mods overview](https://code.claude.com/docs/en/plugins/mods/overview)
- [Claude Code Docs, React to events with a mod](https://code.claude.com/docs/en/plugins/mods/events)
- [Claude Code Docs, Manage mods for your organization](https://code.claude.com/docs/en/plugins/mods/admin)
- [Claude Code Docs, Mods reference](https://code.claude.com/docs/en/plugins/mods/reference)
- [Claude Code Docs, Plugin security and trust](https://code.claude.com/docs/en/plugins/security)
- [Claude Code Docs, Configure permissions (Extend permissions with hooks)](https://code.claude.com/docs/en/permissions)
- [Agent Skills, Specification](https://agentskills.io/specification)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (스킬 개념, Claude vs Codex 포맷 비교, 스킬 vs 훅, 수명주기 감사)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, MCP, 서브에이전트 활용)]]
- [[Claude-Code-Dynamic-Workflows|동적 워크플로우 (스크립트 오케스트레이션, 대규모 fan-out)]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]
- [[MCP|MCP (Model Context Protocol)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (경계 명세)]]
- [[Tool-Output-Filtering|도구 출력 필터링]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain→Inform→Verify→Correct)]]
- [[Harness-Gate-Placement|게이트 배치 (훅을 어디에 걸 것인가, exit 2가 아니면 경고로 끝나는 이유)]]
- [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (Stop 훅으로 완료 선언을 막는 응용)]]
