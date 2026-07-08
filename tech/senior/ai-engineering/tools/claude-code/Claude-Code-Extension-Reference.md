---
tags: [senior, ai, claude-code, hooks, subagent, skills, plugin, mcp]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code Extension Reference", "클로드 코드 확장 메커니즘", "훅 레퍼런스", "스킬 레퍼런스"]
---

# Claude Code 확장 메커니즘 — 훅, 서브에이전트, 스킬, 플러그인, MCP

여섯 확장 메커니즘은 각각 다른 신호에 대응한다. 어떤 반복이 관찰되면 어떤 메커니즘으로 승격하는지가 선택 기준이다.

| 신호 | 도입할 메커니즘 |
|---|---|
| 같은 실수를 두 번 교정 | CLAUDE.md 규칙 |
| 같은 프롬프트를 반복 입력 | 스킬 |
| 브라우저에서 데이터를 복사해 붙여넣기 반복 | MCP |
| 부가 출력이 대화를 오염 | 서브에이전트 |
| 반드시 항상 실행돼야 하는 동작 | 훅 |
| 두 번째 레포에 같은 설정을 복제 | 플러그인 |

## 훅 — 결정론적 실행 보장

CLAUDE.md 지시는 무시될 수 있지만 훅은 라이프사이클 시점에 실행이 보장된다. 구조는 이벤트-매처-훅 3단.

- 이벤트: 세션당(SessionStart 등), 턴당(UserPromptSubmit, Stop), 도구별(PreToolUse, PostToolUse, PermissionRequest), 기타(PreCompact, Notification, ConfigChange 등)
- 매처: `*`는 전체, 영숫자와 `|`는 정확 문자열 목록, 그 외 문자가 섞이면 unanchored 정규식 — `Edit.*`가 NotebookEdit에도 매칭되는 함정이 있어 `^...$` 앵커 권장. MCP 도구는 `mcp__server__.*` 형식
- 타입 5종: command(셸 없이 spawn하는 exec form 권장), prompt(단일 턴 LLM 판단, 기본 Haiku 30초), agent(도구를 쓰는 다중 턴 검증, 60초), http(웹훅), mcp_tool
- **exit code는 2만 차단한다** — 1은 비차단 에러로 그냥 진행된다 (가장 흔한 실수). PreToolUse의 2는 차단 + stderr가 Claude에 피드백되고, Stop의 2는 종료를 되돌린다(un-stop)
- JSON 출력: permissionDecision(우선순위 deny > defer > ask > allow), updatedInput(도구 인자 교체), updatedToolOutput(결과 교체), additionalContext(컨텍스트 주입 — 명령형이 아니라 사실 진술체로 써야 한다, 명령형은 인젝션 방어에 걸린다). exit 2와 JSON 동시 사용 금지(JSON 무시됨)
- 기본 타임아웃: command 600초, prompt 30초, agent 60초. `@` 파일 참조는 PreToolUse를 발화시키지 않는다 — 파일 차단은 권한 규칙으로

## 서브에이전트 — 컨텍스트 격리 위임

- 정의: `.claude/agents/*.md` 프론트매터 — name, description(위임 판단 기준, "use proactively"로 능동 위임 유도), tools, model(기본 inherit), permissionMode, maxTurns, memory, isolation: worktree 등. 본문이 시스템 프롬프트
- 스코프 우선순위: Managed > CLI > 프로젝트 > 사용자 > 플러그인. 플러그인 에이전트는 hooks, mcpServers, permissionMode가 보안상 무시된다
- 호출: description 기반 자동 위임, `@agent-이름` 강제 지정, `claude --agent`로 메인 스레드 자체를 에이전트화
- 제약: 중첩 최대 5단계, 부모가 bypassPermissions면 프론트매터 permissionMode 무시, 기본 백그라운드 실행. 영구 메모리는 스코프별 agent-memory (첫 200줄/25KB만 로드)
- 포크 서브에이전트(실험적): 대화 전체와 도구를 상속하고 프롬프트 캐시를 공유해 저렴 — 빈 컨텍스트에서 시작하는 격리 서브에이전트와 정반대 트레이드오프
- 에이전트 팀(실험적): 팀원 간 메시징 + 공유 태스크. 일반 세션 대비 약 7배 토큰이고 워크트리 격리가 없어 파일 영역 분담이 필수

## 스킬 — 온디맨드 플레이북

- 프론트매터 핵심: description(자동 로드 판단 기준, 1,536자 제한), disable-model-invocation(수동 전용 — 배포나 전송처럼 부작용 있는 스킬에 필수), user-invocable: false(메뉴 숨김, 배경지식용), allowed-tools(**사전 승인이지 제한이 아니다**), context: fork + agent(격리 실행), paths(파일 패턴 자동 활성)
- 치환: `$ARGUMENTS`, `$N`(위치 인자), 동적 컨텍스트는 백틱 셸 실행 — 정책상 차단하려면 disableSkillShellExecution
- 예산: 스킬 설명 총량은 컨텍스트의 1%(폴백 8,000자), 초과 시 호출 빈도 낮은 스킬부터 설명이 제외된다 — `/doctor`로 확인
- 라이프사이클: 호출된 본문은 세션 내내 컨텍스트에 남는다 — 500줄 이하로 유지하고 상세는 서포팅 파일로 분리해 온디맨드 로드. 압축 시 최근 스킬은 총 25,000토큰 예산으로 재부착
- 접근 제어는 권한 규칙 `Skill(name)`. 트리거가 안 되면 description 키워드를, 과다 트리거면 description 구체화나 disable-model-invocation을 점검

## 플러그인 — 배포 단위

- 스킬 + 에이전트 + 훅 + MCP/LSP 서버 + 설정을 하나로 묶은 설치 단위. `.claude/`에서 실험하고 검증되면 플러그인으로 변환하는 것이 권장 경로. 스킬은 플러그인명으로 자동 네임스페이싱되어 충돌이 없다
- 경로는 `${CLAUDE_PLUGIN_ROOT}`(업데이트 시 변경됨), 영구 데이터는 `${CLAUDE_PLUGIN_DATA}`(업데이트 후 유지)
- LSP 플러그인(12개 언어): 편집 직후 자동 진단으로 같은 턴에서 수정하고, 정의/참조 네비게이션으로 grep 기반 파일 읽기를 절감
- 팀 배포는 extraKnownMarketplaces + enabledPlugins를 프로젝트 설정에 커밋. **Anthropic은 커뮤니티 플러그인의 MCP와 훅을 감사하지 않는다** — 설치 전 소스 검토가 사용자 책임

## MCP — 외부 경계 확장

- 트랜스포트 4종: HTTP(권장, OAuth 지원), SSE(레거시), Stdio(로컬 프로세스), WebSocket. 스코프는 local > project(`.mcp.json`, 사용 전 승인 필요) > user — 동일 이름이면 상위 스코프 항목이 통째로 쓰이고 필드 병합은 없다
- Tool Search: 기본으로 도구 이름만 로드하고 전체 스키마는 지연 로드 (MCP 도구가 많을 때의 컨텍스트 비용 방어)
- 출력 제한: 10,000토큰 경고, 25,000토큰 잘림 — [[Tool-Output-Filtering|도구 출력이 컨텍스트를 채우는 문제]]에 대한 내장 방어선
- 관리자 통제의 함정: serverName 허용 목록은 라벨일 뿐 보안 통제가 아니다 — 같은 이름으로 다른 서버를 등록할 수 있으므로 serverCommand(정확 일치)나 serverUrl로 잠가야 한다
- `claude mcp serve`로 Claude Code 자체를 다른 클라이언트의 MCP 서버로 노출할 수 있다

## 체크포인트

- 여섯 신호와 여섯 메커니즘의 매핑을 설명할 수 있는가
- 훅 exit 1과 2의 차이, additionalContext를 사실 진술체로 쓰는 이유
- allowed-tools가 제한이 아니라 사전 승인인 이유
- 포크 서브에이전트와 격리 서브에이전트의 트레이드오프 (캐시 공유 vs 오염 차단)
- MCP serverName 허용 목록이 보안 통제가 아닌 이유

## 출처

- [클로드 코드 가이드 (레퍼런스 08 MCP, 09 훅, 10 서브에이전트, 11 스킬, 18 플러그인) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (스킬 개념, Claude vs Codex 포맷 비교, 스킬 vs 훅)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, MCP, 서브에이전트 활용)]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]
- [[MCP|MCP (Model Context Protocol)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (경계 명세)]]
- [[Tool-Output-Filtering|도구 출력 필터링]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain→Inform→Verify→Correct)]]
