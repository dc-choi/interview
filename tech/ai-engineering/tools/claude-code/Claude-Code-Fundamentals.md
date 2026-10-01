---
tags: [ai, claude-code, cli, context, permissions]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Fundamentals", "클로드 코드 기초", "권한 모드", "Effort"]
verified_at: 2026-09-30
---

# Claude Code 기초 — 설치, 세션, 모델, 권한, 컨텍스트

AI 코딩 에이전트를 쓰기 전에 알아야 할 운영 기본기. 관통하는 사고는 두 가지다 — **자율권은 신뢰 수준에 맞춰 단계적으로 올리고**, **컨텍스트는 크기가 정해진 작업 노트로 관리**한다.

## 설치 환경 선택

목적에 따라 5가지 중 고른다: 개발 → 터미널 CLI 필수, 일반 업무 → Desktop 앱, 체험 → 웹(claude.ai/code), IDE 통합 → VS Code/JetBrains, 이동 중 → 모바일. CLI 설치는 `curl -fsSL https://claude.ai/install.sh | bash`, 확인은 `claude --version`.

Desktop 앱의 3탭 구분이 핵심: **Chat**(파일 접근 없음, 첨부만), **Cowork**(클라우드 VM에서 자율 실행, 앱을 닫아도 계속되지만 로컬 파일, 브라우저, 컴퓨터를 쓰는 작업은 Desktop 앱이 열려 있어야 함), **Code**(로컬 파일 직접 읽기/수정, 승인 필요).

### 요금제와 Windows 준비 (2026-09-30 공식 문서 확인)

- **플랜**: Claude Code는 Pro, Max, Team, Enterprise나 Console(API) 계정이 필요하고 무료 플랜에는 들어 있지 않다(Amazon Bedrock, Google Cloud, Microsoft Foundry 경유도 가능). Cowork도 유료 플랜 전용이다. 개인 가격은 Pro 월 $20(연간 결제 시 월 $17), Max 월 $100부터(Pro 대비 5배 또는 20배 사용량)이며 표시 가격은 세금 별도다
- **Windows 설치**: PowerShell `irm https://claude.ai/install.ps1 | iex`, CMD용 `install.cmd` 스크립트, 또는 `winget install Anthropic.ClaudeCode`. 관리자 권한은 필요 없다. WinGet과 Homebrew 설치는 기본으로 자동 업데이트되지 않으므로 `winget upgrade Anthropic.ClaudeCode`를 주기적으로 돌리거나 `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE=1`로 맡긴다
- **Git for Windows는 선택**: 설치하면 Git Bash로 Bash 도구를 쓰고, 없으면 PowerShell 도구로 셸 명령을 실행한다. 샌드박스가 필요하면 WSL 2에서 쓴다
- **Node.js는 npm 설치 경로에서만**: 네이티브 설치는 Node.js가 필요 없다. npm 패키지는 v2.1.198부터 Node.js 22 이상을 요구하지만 설치되는 바이너리는 실행할 때 Node를 쓰지 않는다
- **Python 같은 런타임은 공식 요구사항이 아니다**: 에이전트는 기존 도구로 안 되는 일을 즉석 스크립트로 풀려고 하므로 런타임이 있으면 할 수 있는 일이 넓어진다. 그만큼 실행 범위도 넓어지므로 아래 권한 모드와 짝지어 둔다

## 대화와 세션

- `claude`는 항상 새 세션이다. 세션끼리는 대화를 공유하지 않고, 다음 세션으로 이어지는 것은 CLAUDE.md와 auto memory 같은 파일뿐이다
- 재개: `claude -c`(직전 이어하기), `/rename`으로 이름 붙인 뒤 `claude -r "이름"`, `/resume`(목록 선택)
- 파일 참조: `@경로`(자동완성). 기본 탐색은 파일 패턴과 정규식 검색으로 후보를 찾아 필요한 파일만 읽는 방식이라 빠르고 토큰을 아끼지만, 이름이 다른 관련 파일은 놓칠 수 있다. 핵심 파일은 `@경로`로 직접 짚어 준다 ([[Agent-Code-Search|에이전트 코드 검색]])
- 중단: `Esc`는 진행 중인 응답과 도구 호출을 멈추고 그때까지 한 작업은 남긴다. `Ctrl+C`도 실행 중이면 중단하고, 아무것도 실행 중이 아니면 첫 번째는 입력을 지우고 두 번째는 종료한다
- 되돌리기(체크포인트): 입력창이 빈 상태의 `Esc Esc`(입력이 있으면 초안을 지운다) 또는 `/rewind` → Restore code(파일만 되돌리고 대화 유지, 가장 자주 씀). 단 **체크포인트는 Claude의 편집 도구가 수정한 파일에만, 약 30일간** 적용 — bash로 실행한 `rm`, `mv`나 DB, API, 배포처럼 원격 시스템에 남긴 변화는 못 되돌리고, 서브에이전트 편집도 대부분 대상이 아니다. 장기 버전 관리는 Git

## 모델과 Effort

작업 난이도에 품질과 토큰 비용을 맞추는 두 손잡이:

- `/model`: 플래그십(장기 계획, 아키텍처) ~ 저비용 고속(단순 변환) 중 선택 ([[LLM-Model-Tiers|모델 티어]]). 2026-09-30 기준 Pro, Max, Team, Enterprise와 Anthropic API의 기본값은 Opus 5.5이고, Anthropic API에서는 1M 컨텍스트로 돌며 약 967K 토큰에서 자동 압축한다. 별칭 `opusplan`은 plan 모드에서 Opus, 실행에서 Sonnet을 써서 계획과 구현의 모델을 나눈다
- `/effort [low~max|auto]`: 사고만이 아니라 응답 전체(텍스트, 도구 호출, 사고)에 쓸 토큰의 성향이다. 엄격한 예산이 아니라 행동 신호라 낮춰도 어려운 문제에서는 생각한다. Claude Code 기본값은 Opus 5.5와 Sonnet 5.5가 medium, 그 밖의 지원 모델은 대체로 high다. 오타 수정은 low, 아키텍처 분석은 high 이상. `/model` 선택기에서도 ←/→로 effort를 바꾸며, 슬라이더와 선택기 모두 `Enter`로 확정하면 이후 세션의 기본값이 되고 `s`로 확정하면 이번 세션에만 적용된다(v2.1.257+). max는 현재 세션만. 워크플로우 자동 오케스트레이션을 켜는 `ultracode`는 v2.1.284부터 `/effort`의 별도 토글(슬라이더에서 `Tab`, 또는 `/effort ultracode`와 `/effort ultracode off`)이라 xhigh를 강제하지 않고 어느 effort에서나 유지되며, xhigh를 지원하는 모델에서만 켤 수 있다 (버전 등 조건은 [[Claude-Code-Dynamic-Workflows|동적 워크플로우]]가 정본)
- `ultrathink` 키워드를 메시지에 넣으면 그 턴만 더 깊이 추론 (in-context 지시, "think hard"류는 인식 안 됨)

높을수록 좋지만 토큰 = 비용이므로 업무별로 조절하는 것이 요점. 비용은 호출 단가에 재작업까지 더해 본다. 정답 조건이 복잡한 코드를 낮은 모델이나 effort로 시작하면 초기 오류를 고치는 디버깅 루프에서 토큰을 더 쓴다는 실무 경험이 있다(측정 수치는 없다). 스펙이 확정된 반복 구현은 낮은 설정으로 충분한지 같은 과업으로 비교해 정한다.

## 자율권과 안전 — 단계적 권한

권한 모드를 신뢰 수준에 따라 올린다: **plan → default(매번 승인) → acceptEdits → auto(분류기 백그라운드 검사) → bypassPermissions(위험)**. `Shift+Tab`은 Manual(`default`) → Auto-accept(`acceptEdits`) → Plan → Manual 순으로 순환한다. `auto`에서 시작하면 첫 입력은 `default`로 가고, `bypassPermissions` 같은 선택 모드는 Plan 뒤에 들어간다.

- **기본 시작 모드는 이미 auto다**: 권한 모드를 설정하지 않으면 인터랙티브 터미널과 VS Code 세션이 auto로 시작한다. 릴리스 노트 기준 v2.1.283에서 서드파티 제공자와 텔레메트리를 끈 세션으로, v2.1.284에서 모든 플랜과 제공자로 넓어졌다(권한 모드 문서는 전체 확대를 v2.1.283으로 적어 릴리스 노트와 다르다). 지원 모델이 아니거나 조직이 끄면 Manual로 시작한다. 분류기가 행동을 검토하는 동안 확인 질문 없이 계속 진행하도록 유도되므로, 방향이 정해지지 않은 작업은 plan에서 시작하고 민감한 작업은 `--permission-mode default`로 연다
- **plan으로 들어가는 길**: `Shift+Tab`, 프롬프트 앞 `/plan`, `--permission-mode plan`. 요청에 따라 plan으로 옮겨 가는 동작도 있지만 기준은 읽기와 쓰기가 아니다. 기본 설정에서는 Claude가 복잡한 구현 요청이라고 판단하면 `EnterPlanMode` 도구로 전환을 요청하고, 사용자가 승인하면 plan으로 바뀐다. auto 권한 모드가 요청의 읽기와 쓰기를 보고 plan을 골라 주지는 않는다
- **Plan Mode 워크플로우**: Plan 전환 → 계획 요청 → 피드백 → 승인(auto로 진행하거나 편집마다 직접 승인) → "계획대로 실행". plan에서는 파일을 읽고 탐색 명령을 돌려 계획을 쓰지만 승인 전에는 소스 편집이 막힌다(bypass 권한을 켜 둔 인터랙티브 터미널에서는 막지 않고 지시로만 동작). **AI 작업의 최대 비용은 코딩 시간이 아니라 방향 수정 시간** — 10분 계획이 2시간 삽질을 막는다
- **acceptEdits의 범위**: 작업 디렉터리 안에서는 파일 편집과 함께 `rm`, `mv`, `cp`, `sed` 같은 파일 명령도 묻지 않고 실행한다. Bash로 바뀐 파일은 체크포인트로 되돌릴 수 없으므로 에이전트에게 맡길 폴더의 원본은 Git 커밋이나 복사본으로 먼저 보호한다
- `/permissions` 규칙(`Bash(npm run *)` 형식), 우선순위 **Deny > Ask > Allow**
- **민감 정보 봉쇄**: `.env`, `secrets/`는 Read, Edit, Bash(cat)를 전부 deny해야 확실. deny는 1차 방어선이고 sandbox, hooks가 다층 방어 ([[Claude-Code-Workflows|Hook 강제]])

## 컨텍스트 관리

컨텍스트 윈도우는 크기가 정해진 작업 노트다.

- 매 턴 모델에 가는 것은 이번 프롬프트만이 아니라 지금까지의 대화 전체와 프로젝트 컨텍스트다. 성격이 다른 주제를 한 세션에 섞으면 용어가 섞이고 매 메시지 비용도 커지므로, 공식 도움말은 작업 사이의 `/clear`를 품질과 비용 양쪽의 가장 큰 레버로 꼽는다 (원리는 [[LLM-Generation-Mechanics-Context-and-Agent|대화 누적]])
- `/clear`(작업 전환 시 완전 초기화) vs `/compact`(같은 작업 지속 시 압축, `/compact API 변경에 집중`처럼 보존 지정)
- 압축 시 CLAUDE.md와 Auto Memory는 디스크에서 재주입되지만 **대화로만 한 지시는 유실될 수 있다** — 반복 규칙은 파일로
- `/context`로 사용량 확인(70% 넘으면 compact 고려), `/mcp`로 서버별 토큰 비용 확인 후 안 쓰는 것 해제. 70~80% 선을 넘기지 않는 경험칙을 자동화하려면 `/autocompact 500k`처럼 자동 압축 시점을 앞당긴다. 사용률을 상시 보려면 상태표시줄에 `context_window.used_percentage`를 띄운다(로컬 실행이라 토큰을 쓰지 않는다. Desktop Code 탭은 모델 선택기 옆 사용량 링)
- 신호: 같은 문제를 두 번 이상 고치게 했다면 실패 시도가 컨텍스트를 오염시킨 것 → `/clear` 후 배운 것을 반영한 새 프롬프트가 낫다 (도구 출력이 컨텍스트를 채우는 원리는 [[Tool-Output-Filtering]])

## 프로젝트 지침 파일 — CLAUDE.md와 AGENTS.md

세션마다 자동 주입되는 규칙 파일.

- `/init`으로 생성(기존 파일은 개선안만 제안)
- **실수 기반 운영**: Claude가 실수할 때마다 "CLAUDE.md에 이 규칙 추가". 판단 기준은 "이걸 빼면 Claude가 실수할까?" — 자명한 지시나 코드에서 추론 가능한 것은 뺀다
- 넣을 것: 추측 불가한 빌드/테스트 명령, 비표준 스타일, 저장소 관례, 응답 언어와 팀 어휘. 파일당 200줄 이하가 목표로, 길수록 컨텍스트를 더 쓰고 준수율이 떨어진다. 일부 경로에만 필요한 규칙은 `paths`를 단 `.claude/rules/`로 옮기고, `@import`는 정리용일 뿐 시작 시 함께 로드되므로 컨텍스트를 줄이지 않는다
- **세션이 아니라 디렉터리 단위**: CLAUDE.md는 실행한 디렉터리와 그 상위에서 로드되므로 같은 폴더에서 연 세션은 모두 같은 지침과 파일을 공유한다. 지침이 서로 다른 업무는 폴더를 나누고, 같은 저장소를 병렬로 고칠 때는 worktree로 분리한다 ([[Claude-Code-Workflows|Worktree 병렬 세션]])
- 3범위: 프로젝트(./CLAUDE.md, Git 공유 — **API 키 절대 금지**), 사용자(~/.claude/CLAUDE.md), 관리 정책. Auto Memory는 Claude가 스스로 적는 MEMORY.md (처음 200줄/25KB만 로드)로, 기본으로 켜져 있고 사용자 정보, 교정 피드백, 진행 중인 일, 외부 참조 위치를 적는다. `/memory`에서 로드된 지침과 메모리 파일을 열어 고치고 auto memory를 끌 수 있다. 상세 원칙은 [[Context-Engineering]]
- Claude Code 2.1.277부터 기본 설정은 프로젝트 경로에 자체 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`가 없을 때 해당 경로의 `AGENTS.md`를 프로젝트 지침으로 사용한다. 이미 `CLAUDE.md`를 쓴 프로젝트의 동작은 바뀌지 않는다
- `/config`의 Project instructions에서 `CLAUDE.md`만 사용, 기본 fallback, 두 파일 함께 사용, managed-only를 선택할 수 있다. 두 파일을 함께 읽는 모드에서는 같은 파일 경로나 같은 내용의 import 또는 심볼릭 링크를 중복 주입하지 않는다. 정확한 범위와 지원 환경은 [[Claude-Code-Config-Permissions]]를 따른다

## 체크포인트

- 권한 모드를 작업 신뢰도에 맞게 올리되 민감 파일은 deny로 봉쇄하는가
- 기본 auto 모드에서도 복잡한 작업에 Plan Mode를 선행하는가 (방향 수정 비용 > 실행 비용)
- /clear와 /compact를 작업 전환/지속으로 구분하는가
- 반복 규칙을 대화가 아니라 CLAUDE.md에 적어 압축 후에도 유지하는가
- 체크포인트가 되돌리지 못하는 Bash 변경과 원격 부작용 앞에서 원본을 따로 보호했는가

## 출처

- [Claude Code — Permission modes](https://code.claude.com/docs/en/permission-modes)
- [Claude Code v2.1.277 release — Anthropic](https://github.com/anthropics/claude-code/releases/tag/v2.1.277)
- [Claude Code CHANGELOG — Anthropic](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [클로드 코드 가이드 (클래스 101 기초 트랙) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code — Advanced setup](https://code.claude.com/docs/en/setup)
- [Claude Code — Model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code — Interactive mode](https://code.claude.com/docs/en/interactive-mode)
- [Claude Code — Tools reference](https://code.claude.com/docs/en/tools-reference)
- [Claude Code — Checkpointing](https://code.claude.com/docs/en/checkpointing)
- [Claude Code — How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code — Explore the context window](https://code.claude.com/docs/en/context-window)
- [Claude Code — Customize your status line](https://code.claude.com/docs/en/statusline)
- [Claude Platform Docs — Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Claude Help Center — Models, usage, and limits in Claude Code](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)
- [Claude — Plans and pricing](https://claude.com/pricing)
- [인프런, 널널한 개발자, 학습안내 및 필수 소프트웨어 설치](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498056)
- [인프런, 널널한 개발자, AI도구 설치](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498586)
- [인프런, 널널한 개발자, Claude Code 소개 및 작업모드](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498595)
- [인프런, 널널한 개발자, 핵심만 간단히! 주요 명령어](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498596)
- [인프런, 널널한 개발자, 대화세션 관리와 Effort Control](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498597)

## 관련 문서

- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[Claude-Code-Customization|Claude Code 커스터마이즈]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택]]
- [[LLM-Generation-Mechanics-Context-and-Agent|LLM Context와 대화 누적]]
- [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제)]]
