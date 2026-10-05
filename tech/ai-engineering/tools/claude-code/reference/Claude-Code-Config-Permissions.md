---
tags: [ai, claude-code, settings, permissions, sandbox]
status: done
verified_at: 2026-09-30
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Config Permissions", "클로드 코드 설정과 권한", "권한 규칙 문법"]
---

# Claude Code 설정과 권한 — 캐스케이드, 규칙 문법, 샌드박스

설정은 CSS처럼 캐스케이드되고 권한은 first-match-wins 규칙 엔진이다. 병합 규칙, 와일드카드 경계, deny의 스코프 같은 정확한 동작을 모르면 막았다고 믿었는데 뚫리는 종류의 사고가 난다.

## 설정 캐스케이드 — 우선순위와 병합

우선순위(높은 순): 관리자(Managed) → CLI 인자 → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`.

- 관리자 계층 내부는 서버 관리 > MDM/OS 정책 > 파일(`managed-settings.json`) 순이다. 기본 `managedSourcesBehavior: first-wins`는 policy key가 있는 첫 소스를 선택하지만 일부 보안 키는 모든 admin source에서 읽는다. v2.1.242+의 `merge`를 선택하면 모든 admin source를 키 종류별 규칙으로 합친다
- 병합 규칙: 배열 설정(`permissions.allow` 등)은 스코프 간 연결 + 중복 제거, 스칼라는 높은 우선순위가 승리
- 핫 리로드: 대부분 키는 즉시 반영한다. `model`은 `/model`, `effortLevel`은 `/effort`로 실행 중 바꿀 수 있고, `outputStyle` 편집은 `/clear` 또는 restart 뒤 적용된다. Claude가 직접 쓰는 `~/.claude.json`만 write 전 최근 5개 backup을 남긴다고 명시돼 있으며 일반 settings file의 자동 backup으로 일반화하지 않는다. 활성 source는 `/status`로 확인
- 스코프 용도: 프로젝트 `.claude/settings.json`(커밋, 팀 공유), 개인 로컬 `.claude/settings.local.json`(gitignore), 사용자 `~/.claude/settings.json`

## 컨텍스트 주입 3계층 — 프로젝트 지침, rules, 스킬

| 계층 | 로드 시점 | 용도 |
|---|---|---|
| 프로젝트 지침 | 시스템 프롬프트 뒤 user message로 전달 | `CLAUDE.md`와 설정에 따른 `AGENTS.md`, 전 작업 공통 규칙, 파일당 200줄 이하 권장 |
| `.claude/rules/` | 매칭 파일을 열 때 (경로 스코프) | 디렉토리별 규칙 |
| 스킬 | 호출 시 (온디맨드) | 작업별 플레이북 |

- `@`임포트는 조직화용일 뿐 토큰 절약이 아니다. cwd에서 위로 올라가며 로드하고 하위 디렉토리 CLAUDE.md는 해당 파일을 읽을 때 온디맨드 로드. 일반 built-in과 custom subagent는 메인 대화에 로드된 CLAUDE.md 계층을 받지만, built-in Explore와 Plan은 CLAUDE.md와 git status를 건너뛴다
- Claude Code 2.1.277의 기본 Project instructions 모드(`claude-md-or-agents-md`)는 프로젝트 루트부터 cwd까지 자체 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`가 하나도 없을 때만 같은 경로의 `AGENTS.md`, `.claude/AGENTS.md`를 읽는다. 사용자 전역, 조직 managed, 추가 디렉토리의 `CLAUDE.md`와 `.claude/rules`는 이 fallback 판정에 포함하지 않는다
- `/config`의 Project instructions는 네 모드다. `CLAUDE.md`만 사용(`claude-md`), 기본 fallback(`claude-md-or-agents-md`), 둘 다 사용(`claude-md-and-agents-md`), 시작 컨텍스트의 project/local/user 지침을 제외하는 `managed-only`다. `managed-only`에서도 managed 지침과 메모는 남고, 현재 mod가 가로채지 못하는 `Read` 기반 하위 `CLAUDE.md`는 계속 전달될 수 있다. 2.1.277 릴리스 당시에는 Bedrock, Vertex AI, Foundry 세션이 제외됐지만, v2.1.281부터 Bedrock, Vertex AI, Foundry, LLM 게이트웨이와 텔레메트리를 끈 세션에서도 `AGENTS.md`를 읽는다(릴리스 노트와 공식 문서 기준, 2026-09-30 확인)
- 두 파일을 함께 쓰는 모드는 경로를 먼저, 내용을 다음으로 비교해 `@` import나 심볼릭 링크가 같은 지침을 두 번 넣지 않게 한다. 하위 디렉토리 `AGENTS.md`는 그 아래 파일을 `Read`할 때 적용되지만, fallback 모드에서 같은 디렉토리의 `CLAUDE.md`가 있으면 그 경로에는 붙지 않는다
- 자동 메모리: MEMORY.md 인덱스는 시작 시 처음 200줄 또는 25KB만 로드, 토픽 파일은 온디맨드. 머신 로컬이며 worktree 간 공유
- `~/.claude` 아래 트랜스크립트와 체크포인트 스냅샷은 **평문 저장** — 도구를 거친 모든 내용이 디스크에 남는다. `cleanupPeriodDays`(기본 30일)로 자동 정리

## 권한 규칙 — 평가 순서가 곧 보안 모델

Allow, Ask, Deny 3종. **deny → ask → allow 순으로 첫 매칭 규칙이 적용**(first match wins)되고 **deny는 어느 스코프에서 매칭되든 차단**(deny-at-any-level)된다. 예외로 설치한 mod가 `tool.check`를 처리하면 규칙과 managed settings 밖 PreToolUse 훅이 정한 결과를 바꿀 수 있다(managed PreToolUse 훅의 차단은 최종). deny 규칙은 managed settings가 있는 기기나 Team, Enterprise 로그인에서 내장 guard가 로드될 때만 기본으로 mod보다 우선하고, 그 밖의 환경이나 조직이 guard 옵션 `allowModsToOverrideDenyRules`를 켠 경우에는 mod가 deny 규칙이 거부한 호출까지 승인할 수 있다(2026-10-06 공식 권한 문서 기준, [[Claude-Code-Extension-Reference#Mod — Claude Code 안에서 도는 함수 훅|Mod]]). 매칭이 없으면 프롬프트. 읽기 전용 도구(Read, Grep, Glob)는 작업 디렉터리와 추가 디렉터리 안에서는 승인이 필요 없고, 그 밖의 경로는 프롬프트를 띄운다. 2026-09-30 공식 도구 레퍼런스 기준 macOS, Linux와 WSL에서는 Glob과 Grep이 기본 도구 목록에서 빠지고 `find`, `grep`이 `Bash` 호출로 실행되므로, 이 검색에는 `Bash` 권한 규칙이 적용된다([[Agent-Code-Search|에이전트 코드 검색]]).

### 권한 모드 6종

| 모드 | 동작 |
|---|---|
| default (=manual) | 매번 승인 |
| acceptEdits | 파일 편집 + mkdir, rm, mv 등 자동 승인 (작업 디렉토리 내부만) |
| plan | 읽기와 탐색만(auto를 쓸 수 있으면 탐색 명령은 분류기가 검토). 계획을 승인하기 전에는 소스 편집 차단(bypass 권한을 켠 인터랙티브 터미널은 차단 없이 지시로만 동작). `Shift+Tab`, 프롬프트 앞 `/plan`, `--permission-mode plan`으로 들어간다. 기본 설정에서는 Claude가 복잡한 구현 요청이라고 판단하면 `EnterPlanMode` 도구로 전환을 요청하고, 사용자가 승인하면 plan으로 바뀐다(v2.1.285 도구 설명 기준). auto 권한 모드가 요청의 읽기와 쓰기를 보고 plan을 골라 주지는 않는다 |
| auto | 백그라운드 AI 분류기가 액션 평가. 권한 모드를 설정하지 않은 인터랙티브 터미널과 VS Code 세션의 기본 시작 모드다. 릴리스 노트 기준 v2.1.283에서 서드파티 제공자와 텔레메트리를 끈 세션으로, v2.1.284에서 모든 플랜과 제공자로 넓어졌다(v2.1.282 이하는 Pro, Max, Team 한정. 권한 모드 문서는 모든 플랜과 제공자 확대를 v2.1.283으로 적어 릴리스 노트와 다르다, 2026-09-30 확인). 지원 모델이 아니거나 조직이 끄거나 사용할 수 없으면 Manual로 시작. 확인 질문 없이 진행하도록 유도되므로 민감한 작업의 검토를 대신하지 않는다 |
| dontAsk | allow 규칙 + 읽기 전용만 실행, 나머지 자동 거부 (CI용) |
| bypassPermissions | 전부 통과 — `rm -rf /` 급만 서킷브레이커, root에선 시작 거부 |

### 문법과 함정

- **bare deny(`Bash`)는 도구를 컨텍스트에서 제거**해 모델이 존재 자체를 모르게 하고 scoped deny(`Bash(rm *)`)는 매칭 호출만 차단한다
- 와일드카드 경계: `Bash(ls *)`는 `lsof`에 매칭되지 않고 `Bash(ls*)`는 매칭된다. 단일 `*`는 여러 인자에 걸쳐 매칭 (`Bash(git * main)`이 `git push origin main`에 매칭)
- 경로 접두사(gitignore 사양): `//` 절대 경로, `~/` 홈, `/` 프로젝트 루트, 무접두사는 현재 디렉토리. bare 파일명 `Read(.env)`는 `**/.env`처럼 전 깊이 매칭. `Edit` allow는 같은 경로의 Read도 함께 부여
- 복합 명령(`&&`, `;`, `|`)은 각 하위 명령이 독립적으로 매칭돼야 하고 `timeout`, `nohup` 같은 래퍼는 자동 제거 후 매칭된다
- **Read deny는 인식 가능한 Bash 파일 명령도 차단** — 내장 Read뿐 아니라 `cat`, `head`, `tail`, `sed` 같은 Bash 파일 읽기도 차단한다. Python이나 Node 스크립트처럼 파일을 직접 여는 임의의 서브프로세스는 막지 못하므로 그 영역은 OS 수준 샌드박싱이 맡는다
- deny `Bash(rm *)`는 `/bin/rm`이나 `find -delete`를 못 막고(리터럴 매칭), allow `Bash(find *)`가 `-exec`를 자동 승인하지도 않는다
- 심볼릭 링크는 비대칭: allow는 링크와 대상 둘 다 매칭돼야 하고 deny는 둘 중 하나만 매칭돼도 차단 (안전한 쪽으로 기움)

### 보호 경로

`.git`, `.claude`(일부 하위 제외), `.vscode`, 셸 시작 파일(.bashrc 등), `.gitconfig`, `.mcp.json`은 기본 보호. acceptEdits 모드도 빌드 도구 설정(`.npmrc` 등)은 예외적으로 프롬프트를 띄운다. 단 bypassPermissions는 보호 경로도 통과한다.

## 샌드박싱 — 승인 피로의 구조적 해결

권한 프롬프트를 줄이려고 allow를 늘리는 대신, OS 수준 격리(macOS Seatbelt, Linux와 WSL2 bubblewrap)로 Bash command와 child process의 filesystem, network 접근을 제한한다. Built-in Read, Edit, Write와 computer use에는 같은 sandbox boundary가 적용되지 않는다. 기본 read policy는 credential file도 읽을 수 있고, broad domain allowlist, Unix socket, weaker nested mode와 unsandboxed retry는 격리를 약화할 수 있다. Hard gate가 필요하면 managed setting에서 sandbox를 켜고 실패 시 비격리 실행을 막는다.

```json
{"sandbox": {"enabled": true, "failIfUnavailable": true, "allowUnsandboxedCommands": false}}
```

`excludedCommands`는 비격리 예외이므로 hard gate에서 두지 않는다. filesystem/network 허용 범위와 credential deny, 권한 규칙도 managed scope에서 같이 고정한다.

## 체크포인트

- 관리자 소스의 기본 first-wins, merge 모드와 모든 admin source에서 읽는 보안 키 예외
- 권한 평가 순서 (deny → ask → allow, first match wins, deny-at-any-level)와 설치한 mod가 그 결과를 바꿀 수 있는 조건
- bare deny와 scoped deny의 차이 (컨텍스트 제거 vs 호출 차단)
- Read deny가 인식 가능한 Bash 파일 명령까지 막지만 임의 서브프로세스는 못 막는 경계와 샌드박스의 역할
- 와일드카드, 복합 명령, 심볼릭 링크 매칭의 경계 사례

## 출처

- [Anthropic, Configure the sandboxed Bash tool](https://code.claude.com/docs/en/sandboxing)
- [Anthropic, Permissions](https://code.claude.com/docs/en/permissions)
- [Anthropic, Tools reference](https://code.claude.com/docs/en/tools-reference)
- [Anthropic, Permission modes](https://code.claude.com/docs/en/permission-modes)
- [Anthropic, Claude Code settings](https://code.claude.com/docs/en/settings)
- [Anthropic, Deploy managed settings](https://code.claude.com/docs/en/managed-settings)
- [Anthropic, How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Anthropic, Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code v2.1.277 release — Anthropic](https://github.com/anthropics/claude-code/releases/tag/v2.1.277)
- [Claude Code CHANGELOG — Anthropic](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [agents-md built-in mod — Anthropic](https://github.com/anthropics/claude-code/tree/main/mods/agents-md)
- [Claude Code, 이제 AGENTS.md도 지원 — GeekNews](https://news.hada.io/topic?id=33925)
- [클로드 코드 가이드 (레퍼런스 04 설정 시스템, 05 권한 시스템) — WikiDocs](https://wikidocs.net/book/19104)
- [전역, 디렉터리별, 테스트용 CLAUDE.md 나누기 — Threads, think.5x](https://www.threads.com/@think.5x/post/DQ61BDsiR6O)
- [CLAUDE.md 금지 지시와 @ 참조 규칙 파일 — Threads, catlovessubakba](https://www.threads.com/@catlovessubakba/post/DN1t6m6ZCfy)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초 (권한 모드 입문, CLAUDE.md)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Hook 강제)]]
- [[Claude-Code-Cloud-Security|Claude Code 클라우드 실행과 보안 (다층 방어)]]
- [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제, 결정론적 제어)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (CLAUDE.md 200줄)]]
