---
tags: [senior, ai, codex, cli, skills, agents-md, mcp]
status: done
verified_at: 2026-07-24
category: "Senior - AI 엔지니어링"
aliases: ["Codex CLI", "코덱스 CLI", "Codex 슬래시 명령", "AGENTS.md"]
---

# Codex CLI — 슬래시 명령, 스킬, AGENTS.md

Codex CLI는 터미널에서 동작하는 OpenAI의 AI 코딩 에이전트다. macOS와 Linux용 공식 스탠드얼론 설치 스크립트는 `curl -fsSL https://chatgpt.com/codex/install.sh | sh`이며, npm(`npm i -g @openai/codex`)과 Homebrew 설치도 사용할 수 있다(공식 문서 확인 2026-07-15). 실행은 `codex`. 인증은 ChatGPT 계정 또는 OpenAI API 키를 사용한다. 제어 표면은 세 축으로 나뉜다 — 세션 안에서 즉시 쓰는 슬래시 명령, 반복 작업을 캡슐화하는 스킬, 프로젝트 규칙을 고정하는 AGENTS.md.

## 슬래시 명령

### 작업 평가 (개발 루프의 핵심)

- **/plan** — 수정 전에 접근법과 변경 전략을 먼저 세운다. 구조 변경, 리팩터링에 유용
- **/review** — 현재 워크트리의 품질 문제와 예기치 않은 부작용을 점검
- **/diff** — Git 기반 변경 표시 (staged, unstaged, untracked)

### 제어, 설정

- **/permissions** — 승인 정책 조정 (작업 민감도에 맞춰)
- **/agent** — 에이전트 스레드, 서브에이전트 관리
- **/model** — 모델 전환, **/fast** — 속도 우선 모드 토글, **/personality** — 응답 스타일(friendly, pragmatic, none)
- **/status** — 활성 모델, 승인 정책, 쓰기 가능 루트, 토큰 사용량
- **/debug-config** — 실제 적용된 설정 진단, **/experimental** — 실험 기능
- **/mcp** — 현재 세션의 MCP 도구, **/apps** — 연결된 앱, 커넥터 (`$app-slug`로 접근)

### 세션 관리

- **/new** (CLI 유지한 채 새 대화), **/clear** (터미널, 히스토리 클리어), **/compact** (긴 대화 요약으로 컨텍스트 축소)
- **/archive** (현재 세션 transcript를 보존한 채 archive하고 종료), **/delete** (현재 transcript와 하위 세션을 영구 삭제하고 종료)
- **/ps** — 백그라운드 터미널 상태와 최근 출력, **/statusline** — 하단 상태바 커스터마이즈
- **/mention** — 특정 파일, 디렉토리를 컨텍스트에 명시 추가
- **/fork** — 대안 접근을 위해 현재 대화 분기, **/resume** — 이전 대화 복원
- **/copy** (최근 출력 클립보드 복사), **/logout**, **/feedback**, **/quit** 또는 **/exit**

## 스킬 시스템

스킬은 재사용 가능한 작업 단위(SKILL.md 폴더)다. 포맷과 동작 원리는 [[Agent-Skills]]. Codex 고유 사항만 정리하면.

- **발견 경로**: `.agents/skills`(레포, 여러 레벨), `$HOME/.agents/skills`(유저), `/etc/codex/skills`(admin), 번들 시스템 스킬
- **호출**: 명시는 `/skills` 또는 `$스킬이름`, 암묵은 description 매칭 자동 트리거
- **시스템 스킬**: openai-docs(공식 문서 참조), skill-creator(팀 전용 스킬 생성), skill-installer(추가 공식 스킬 설치)
- **추천 스킬**: figma, figma-implement-design, playwright, playwright-interactive, gh-address-comments, gh-fix-ci, linear, pdf, spreadsheet, vercel-deploy

## AGENTS.md

프로젝트 지침 파일. 전역, 프로젝트, 디렉토리별로 **계층 적용**되어 대상에 가까운 파일 규칙이 우선한다. 담을 내용은 레포 구조, 빌드와 테스트 절차, PR 기대사항, 금지 행위, 완료 기준. `/init`으로 초기 생성한다.

Claude Code의 CLAUDE.md에 대응하며, 성격은 강제가 아닌 **권장(advisory) 계층**이다 — 반드시 실행돼야 하는 동작은 권한 정책이나 훅으로 강제한다. 권장과 강제의 분리는 [[Context-Engineering]] 참조.

## 고급 기능

- **셸, 에디터**: `!명령`(셸 직접 실행), Ctrl+G(외부 에디터로 프롬프트 작성), Ctrl+L(화면 클리어, 대화 보존), Ctrl+C(현재 작업 중단)
- **비대화형 모드**: `codex exec`로 스크립트 자동화 — CI, 파이프라인에서 무인 실행
- **MCP**: 외부 도구와 컨텍스트를 연결하는 계층. 외부 리소스를 소비하는 것과 Codex 자신을 다른 MCP 클라이언트의 도구로 노출하는 것 양방향. 상세는 [[MCP]]

## 세션 저장소 운영

`CODEX_HOME`은 Codex 로컬 상태의 루트이며 기본 경로는 `~/.codex`다. 세션 transcript는 `$CODEX_HOME/sessions`, archive된 세션은 `$CODEX_HOME/archived_sessions`에 저장된다. transcript에는 대화, 도구 입출력, 경로처럼 민감할 수 있는 정보가 들어갈 수 있으므로 운영 데이터로 취급한다.

### 보존, 정리와 일회성 실행

- `codex archive SESSION`은 세션 선택기에서 숨기되 transcript를 보존한다. `codex delete SESSION`은 저장된 transcript와 하위 세션을 영구 제거한다. 두 동작을 같은 정리 수단으로 취급하지 않는다.
- 일회성 자동화에서 transcript 보존이 필요 없으면 `codex exec --ephemeral "작업"`을 사용한다. 이 옵션은 session rollout 파일을 디스크에 저장하지 않는다.
- 파일 시스템에서 JSONL을 직접 지우는 절차를 일반 운영책으로 두지 않는다. 저장된 세션은 재개와 조사에 필요할 수 있고, 실행 중인 writer가 있을 수 있다.

### Subagent 컨텍스트 범위

- subagent가 부모 대화 전체를 필요로 하지 않으면 `fork_turns: "none"`으로 시작한다. 최근 제약만 필요하면 `fork_turns: "3"`처럼 필요한 턴 수로 제한한다.
- `fork_turns`를 생략하면 전체 부모 이력이 전달될 수 있다. 긴 resume 세션에서 반복 subagent를 만들 때는 전달 범위를 명시해 child의 초기 컨텍스트와 저장 상태를 불필요하게 키우지 않는다.
- 이 제한은 상태와 입력 범위를 줄이는 완화책이다. 특정 session-store 결함의 원인이나 수정 여부를 증명하지는 않는다.

### 공개 이슈의 관측과 불확실성

2026-07-24에 확인한 `openai/codex#34061`은 Open 상태였다. 이슈 작성자는 하나의 resume된 부모 세션이 2,393개 child session 파일과 약 731.5 GiB의 논리 크기를 만들었다고 보고했다. 이는 공개 사례의 관측 근거이며 모든 환경에서 재현되는 수치가 아니다.

- **관측된 현상**: 원 보고와 독립 재현에서는 legacy history의 전체 이력 fork가 child 파일 앞부분에 물리적으로 복제됐다. 한 재현에서는 child 고유 작업 전 prefix가 파일 레코드와 바이트의 99.72%를 차지했다. 큰 `compacted`, tool output과 인라인 이미지의 반복 저장도 사례별 증폭 요인으로 관측됐다.
- **확인 경계**: 현재 V2 스키마에서 `fork_turns` 생략은 `"all"`이며 공개 소스 경로 분석도 전체 이력 materialization을 뒷받침한다. 다만 이슈가 Open 상태인 동안에는 OpenAI 유지보수자가 확정한 전체 RCA, 영향 버전과 수정 완료 여부로 확대하지 않는다.

### 개인정보를 보존하는 진단

- 전체 세션 디렉터리의 용량과 파일 수, 날짜별 증가량처럼 내용 없는 집계부터 확인한다.
- 필요할 때도 첫 `session_meta`의 CLI 버전, originator, source, history mode처럼 최소 metadata만 추출하고 사용자명과 경로는 가린다.
- 전체 JSONL, 프롬프트, 도구 인자와 결과를 외부 이슈에 첨부하지 않는다. 공유 전에는 민감 정보와 재개에 필요한 이력을 분리해 검토한다.

## App vs CLI

- **Codex App**: 병렬 작업 관리와 시각적 Git 워크플로우 조율에 강함
- **Codex CLI**: 명령 수준 정밀 제어와 스킬 기반 작업에 강함

## 실전 패턴

- 큰 수정 전에 /plan으로 작업 단위를 정리한다
- 구현 직후 /review로 품질을 검증하고, /review와 /diff를 함께 써 변경 전체를 평가한다
- 반복 작업은 프롬프트 재입력 대신 스킬로 캡슐화한다
- AGENTS.md로 일관된 프로젝트 동작을 확립한다
- 작업 민감도에 맞춰 /permissions를 설정한다
- 긴 세션에선 /status로 토큰 사용량을 주기적으로 확인한다

## 면접 체크포인트

- 작업 평가 3종(/plan, /review, /diff)의 역할과 개발 루프에서의 배치
- 반복 작업을 스킬로 캡슐화하는 이유, 시스템 스킬(skill-installer로 공식 스킬 확장)
- AGENTS.md의 계층 적용과 CLAUDE.md 대응 관계 (권장 계층, 강제는 권한/훅)
- 비대화형 `codex exec`로 CI 자동화가 가능한 점
- App vs CLI 선택 기준 (병렬, 시각 vs 명령 정밀, 스킬)

## 출처

- [Codex 환경 변수와 스탠드얼론 설치 스크립트 — OpenAI](https://learn.chatgpt.com/docs/config-file/environment-variables.md)
- [Codex Manual — OpenAI](https://developers.openai.com/codex/codex-manual.md)
- [Insane Codex Disk Usage from Subagents, Issue #34061 — openai/codex](https://github.com/openai/codex/issues/34061)
- [Codex CLI의 Subagent 세션 로그가 수백 GB까지 증가해 디스크를 소진하는 문제 — GeekNews](https://news.hada.io/topic?id=31618)
- [코덱스 Codex CLI 커맨드 스킬 완벽가이드 — Litmers](https://litmers.com/blog/%EC%BD%94%EB%8D%B1%EC%8A%A4-codex-cli-%EC%BB%A4%EB%A7%A8%EB%93%9C-%EC%8A%A4%ED%82%AC-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C)
- [Codex Docs — OpenAI](https://developers.openai.com/codex)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (SKILL.md 포맷, Claude vs Codex 비교, 스킬 vs 훅)]]
- [[MCP|MCP (외부 경계 확장)]]
- [[Claude-Code-Fundamentals|Claude Code 기초 (CLAUDE.md, 권한 모드 — 대응 개념)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (AGENTS.md = 권장 계층)]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한 (승인 정책 대응)]]
