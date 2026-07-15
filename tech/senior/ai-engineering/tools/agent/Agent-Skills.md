---
tags: [senior, ai, skills, claude-code, codex, hook]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Agent Skills", "에이전트 스킬", "스킬", "Claude vs Codex Skills"]
---

# 에이전트 스킬 (Agent Skills)

스킬은 AI 에이전트에게 특정 작업을 수행하는 방법을 정의해 재사용하는 실행 단위다. 매번 프롬프트로 같은 작업을 설명하는 대신, 폴더 하나(SKILL.md)로 캡슐화해 이름으로 호출한다. Claude Code와 Codex가 사실상 같은 포맷(SKILL.md 폴더 + description 자동 로드)으로 수렴해 있어, 한쪽을 익히면 다른 쪽이 거의 그대로 통한다.

## 스킬이란 — 온디맨드 플레이북

- **정의**: description으로 트리거되고, 본문 지침대로 작업을 수행하는 재사용 가능한 작업 단위. 필요할 때만 로드된다는 점에서 온디맨드 플레이북이다.
- **프롬프트와의 차이**: 프롬프트는 일회성 지시, 스킬은 이름이 붙은 재사용 캡슐. 프롬프트를 반복 입력하고 있다면 스킬로 승격할 신호다.
- **해결하는 문제**:
  - 반복 프롬프트 제거 — 같은 작업을 매번 다시 설명하지 않는다
  - 결과 일관성 — 정의된 절차를 따르므로 실행마다 흔들리지 않는다
  - 복잡 작업 캡슐화 — 여러 단계를 하나의 호출로 묶어 실수를 줄인다
  - 컨텍스트 절약 — 점진적 공개로 필요할 때만 본문을 로드한다

## 구조 — SKILL.md 폴더

Claude Code와 Codex가 공유하는 구조.

    my-skill/
    ├─ SKILL.md      (필수: name, description 프론트매터 + 지침 본문)
    ├─ scripts/      (선택: 결정론적 실행 로직)
    ├─ references/   (선택: 온디맨드로 로드하는 상세)
    └─ assets/       (선택: 템플릿, 데이터)

- 프론트매터 최소 필드는 **name**과 **description**. description이 자동 트리거 판단의 기준이므로, 언제 이 스킬을 써야 하는지를 구체적으로 적는다.
- 본문은 에이전트가 따를 지침(Markdown). 두 도구 모두 **지침 우선, 스크립트는 결정론이나 외부 도구가 필요할 때만** 권장한다.

## 동작 — 점진적 공개(Progressive Disclosure)

컨텍스트 비용을 낮추려고 3단으로 나눠 로드한다.

- **항상 로드**: 이름 + description만 (카탈로그). 모든 스킬의 설명만 상시 노출
- **매칭 시 로드**: 트리거된 스킬의 본문 지침
- **필요 시 로드**: references, scripts 같은 서포팅 파일

트리거 방식은 두 가지다.

- **암묵(implicit)**: 모델이 task와 description을 매칭해 자동 선택
- **명시(explicit)**: 사용자가 직접 호출 (Claude는 `/스킬이름`, Codex는 `/skills` 또는 `$멘션`)

## Claude Code vs Codex — 같은 포맷, 다른 관례

둘 다 **파일 기반 SKILL.md 폴더**다. "Claude는 파일 기반, Codex는 API/플랫폼 기반"이라는 통념은 부정확하다. 실제 차이는 디렉토리 관례와 세부 메타 필드뿐이다.

| 항목 | Claude Code Skills | Codex Skills |
|---|---|---|
| 정의 | SKILL.md 폴더 | SKILL.md 폴더 (동일) |
| 위치 | `.claude/skills/` (프로젝트, 유저, 플러그인 스코프) | `.agents/skills/`(repo), `$HOME/.agents/skills`, `/etc/codex/skills` |
| 자동 트리거 | description 매칭 | description 매칭 (동일) |
| 명시 호출 | `/스킬이름` (슬래시 명령) | `/skills`, `$멘션` |
| 추가 메타 | argument-hint, allowed-tools(사전승인), disable-model-invocation, user-invocable, context:fork, paths | agents/openai.yaml (UI, 호출 정책, 도구 의존성) |
| 스크립트 | 본문 백틱 셸, 서포팅 스크립트 | scripts/ 디렉토리 |

핵심은 두 도구가 Agent Skills라는 사실상 동일한 개방 포맷으로 수렴했다는 것이다. 폴더 + SKILL.md + description 자동 로드가 공통 뼈대이고, 나머지는 관례 차이다. Claude 쪽 세부 메커니즘(description 1,024자 제한, allowed-tools가 제한이 아닌 사전 승인, 예산 초과 시 저빈도 스킬부터 설명 제외 등)은 [[Claude-Code-Extension-Reference]]에 있다.

## 스킬 vs 훅 — 무엇을 할지 vs 언제 실행될지

| 구분 | 훅(Hook) | 스킬(Skill) |
|---|---|---|
| 실행 | 라이프사이클 시점에 자동, 결정론적 | 필요 시 (모델이나 사용자가 선택) |
| 목적 | 흐름 제어, 강제 (반드시 실행) | 작업 수행 (재사용 플레이북) |
| 성격 | 무시 불가한 강제 | 무시 가능한 지침 |
| 예 | 커밋 전 린트 차단, 위험 명령 거부 | 코드 포맷, 테스트 실행, 릴리스 노트 작성 |

훅은 언제 실행될지를, 스킬은 무엇을 할지를 정의한다. 둘은 상보적이라 함께 쓰면 강해진다 — 훅으로 실행 흐름을 강제하고, 스킬로 작업을 자동화한다. 이는 권장(CLAUDE.md, AGENTS.md)과 강제(Hook)를 분리하는 원칙과 같은 축이다([[Context-Engineering]]). 훅의 세부(exit code 2만 차단, additionalContext 주입 등)는 [[Claude-Code-Extension-Reference]].

## 언제 프롬프트를 스킬로 승격하나

- 같은 프롬프트를 반복 입력할 때 → 스킬로 캡슐화
- 배포, 전송처럼 부작용이 있는 작업은 자동 호출을 끄고 수동 전용으로 (Claude disable-model-invocation, Codex 호출 정책)
- 본문이 길어지면(대략 500줄 초과) 상세를 references로 분리해 온디맨드 로드 — 호출된 스킬 본문은 세션 내내 컨텍스트에 남기 때문

## 면접 체크포인트

- 스킬을 재사용 가능한 작업 단위(온디맨드 플레이북)로 정의하고, 일회성 프롬프트와의 차이를 말할 수 있는가
- SKILL.md 구조(name, description 프론트매터 + 지침 본문)와 description 기반 자동 트리거를 설명할 수 있는가
- 점진적 공개로 컨텍스트를 절약하는 원리(카탈로그 → 본문 → 서포팅 파일)
- Claude와 Codex 스킬이 같은 파일 기반 포맷으로 수렴했다는 점 (파일 vs API 오해 교정)
- 훅 vs 스킬 — 언제(강제) vs 무엇(작업)의 구분과 상보성

## 출처

- [Claude Code Skills vs Codex Skills: 구조와 차이 완전 정리 — AlienCoder](https://aliencoder.tistory.com/243)
- [Agent Skills — Claude Docs](https://code.claude.com/docs/ko/skills)
- [Skills — OpenAI Codex Docs](https://developers.openai.com/codex/skills)

## 관련 문서

- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (스킬, 훅 세부 메커니즘)]]
- [[Codex-CLI|Codex CLI (슬래시 명령, 스킬 시스템, AGENTS.md)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, MCP, 서브에이전트 활용)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (권장 vs 강제 분리)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (스킬 Catalog-First 로딩)]]
- [[MCP|MCP (외부 경계 확장)]]
