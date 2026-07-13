---
tags: [senior, ai, codex, cli, skills, agents-md, mcp]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Codex CLI", "코덱스 CLI", "Codex 슬래시 명령", "AGENTS.md"]
---

# Codex CLI — 슬래시 명령, 스킬, AGENTS.md

Codex CLI는 터미널에서 동작하는 OpenAI의 AI 코딩 에이전트다. 설치는 macOS, Linux에서 스탠드얼론 설치 스크립트(`curl -fsSL https://chatgpt.com/codex/install.sh | sh`)가 공식 권장이고, npm(`npm i -g @openai/codex`)과 Homebrew도 대안으로 제공된다(공식 문서 확인 2026-07-13). 실행은 `codex`. 인증은 ChatGPT 계정(Plus, Pro, Business, Edu, Enterprise 포함) 또는 OpenAI API 키. 제어 표면은 세 축으로 나뉜다 — 세션 안에서 즉시 쓰는 슬래시 명령, 반복 작업을 캡슐화하는 스킬, 프로젝트 규칙을 고정하는 AGENTS.md.

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

- [코덱스 Codex CLI 커맨드 스킬 완벽가이드 — Litmers](https://litmers.com/blog/%EC%BD%94%EB%8D%B1%EC%8A%A4-codex-cli-%EC%BB%A4%EB%A7%A8%EB%93%9C-%EC%8A%A4%ED%82%AC-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C)
- [Codex Docs — OpenAI](https://developers.openai.com/codex)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (SKILL.md 포맷, Claude vs Codex 비교, 스킬 vs 훅)]]
- [[MCP|MCP (외부 경계 확장)]]
- [[Claude-Code-Fundamentals|Claude Code 기초 (CLAUDE.md, 권한 모드 — 대응 개념)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (AGENTS.md = 권장 계층)]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한 (승인 정책 대응)]]
