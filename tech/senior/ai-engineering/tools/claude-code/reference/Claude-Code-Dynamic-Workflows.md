---
tags: [senior, ai, claude-code, workflow, orchestration, subagent]
status: done
verified_at: 2026-08-24
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code Dynamic Workflows", "동적 워크플로우", "Dynamic Workflows"]
---

# Claude Code 동적 워크플로우 — 스크립트 오케스트레이션, ultracode, resume 규칙, 비용 가드

동적 워크플로우는 서브에이전트를 대규모로 오케스트레이션하는 JavaScript 스크립트다. 사용자가 작업을 설명하면 Claude가 스크립트를 작성하고, 별도 런타임이 백그라운드에서 실행하는 동안 세션은 응답 가능한 상태로 남는다. 코드베이스 전체 감사, 수백 파일 마이그레이션, 출처 교차 검증이 필요한 리서치처럼 한 대화가 조율할 수 있는 것보다 많은 에이전트가 필요하거나, 오케스트레이션 자체를 읽고 재실행할 수 있는 산출물로 남기고 싶을 때 쓴다.

Claude Code v2.1.154 이상에서, 유료 플랜과 Anthropic API 접근, Amazon Bedrock, Google Cloud Agent Platform, Microsoft Foundry에서 쓸 수 있다. Pro 플랜은 /config의 Dynamic workflows 행에서 켠다.

## 멘탈 모델 — 계획을 코드로 옮긴다

서브에이전트, 스킬, 에이전트 팀, 워크플로우는 모두 다단계 작업을 실행할 수 있다. 차이는 누가 계획을 쥐는가다. 여기서 워크플로우는 Claude Code의 스크립트 오케스트레이션 기능을 가리킨다 — [[LLM-Workflow-Patterns|체인 워크플로우 vs 에이전트 워크플로우]]의 일반 분류축과는 다른 층이다.

| | 서브에이전트 | 스킬 | 에이전트 팀 | 워크플로우 |
|---|---|---|---|---|
| 정체 | Claude가 띄우는 워커 | Claude가 따르는 지시문 | 피어 세션을 감독하는 리드 | 런타임이 실행하는 스크립트 |
| 다음 실행 결정 | Claude가 턴마다 | Claude가 프롬프트를 따라 | 리드 에이전트가 턴마다 | 스크립트 |
| 중간 결과 위치 | 컨텍스트 윈도우 | 컨텍스트 윈도우 | 공유 태스크 리스트 | 스크립트 변수 |
| 반복 가능한 것 | 워커 정의 | 지시문 | 팀 정의 | 오케스트레이션 자체 |
| 규모 | 턴당 몇 개 위임 | 서브에이전트와 동일 | 소수의 장기 실행 피어 | 실행당 수십~수백 에이전트 |
| 중단 시 | 턴 재시작 | 턴 재시작 | 팀원은 계속 실행 | 같은 세션에서 재개 가능 |

워크플로우는 루프, 분기, 중간 결과를 스크립트가 직접 들고 있어 Claude의 컨텍스트에는 최종 답만 남는다. 계획이 코드가 되면 규모만이 아니라 품질 패턴도 반복 가능해진다 — 독립 에이전트끼리 발견을 적대적으로 상호 검증한 뒤 보고하게 하거나, 여러 각도에서 초안을 만들어 비교 평가하는 구조를 스크립트에 박을 수 있다 (maker와 checker를 분리하는 원리는 [[Agent-Loop-Engineering|루프 엔지니어링]]의 성숙형 합성 절이 정본).

## 실행 방법 3가지

- **번들 워크플로우**: `/deep-research <질문>` — 여러 각도로 웹 검색을 fan-out하고, 찾은 출처를 교차 검증해 주장마다 표결한 뒤, 통과하지 못한 주장은 걸러낸 인용 리포트를 만든다 (WebSearch 도구 필요). 검증 에이전트가 확인하지 못한 주장(레이트 리밋, API 에러 등)은 반박된 것으로 세지 않고 unverified로 표시한다.
- **프롬프트 opt-in**: 프롬프트에 `ultracode` 키워드를 넣거나 자연어로 요청한다 ("use a workflow"). 키워드는 직접 타이핑한 프롬프트에서만 동작한다 — v2.1.210부터 `-p` 인자, 사람 입력으로 표시되지 않은 Agent SDK 프롬프트, 스케줄 태스크, webhook이나 PR 코멘트 경유로는 트리거되지 않는다. 잘못 트리거했으면 Option+W (macOS) / Alt+W로 해제한다. v2.1.160 이전의 키워드는 `workflow`였다.
- **/effort ultracode**: xhigh 추론 강도와 자동 워크플로우 오케스트레이션을 묶은 설정. 켜면 Claude가 실질적인 작업마다 워크플로우를 스스로 계획한다 — 한 요청이 이해, 변경, 검증 워크플로우의 연쇄가 될 수 있다. 세션 한정이며 settings의 `ultracode`로 영구화한다. v2.1.203 이상, xhigh effort를 지원하는 모델에서만 제공된다.

## 승인과 권한

실행 전 승인 프롬프트는 권한 모드에 따라 다르다 (모드 정의는 [[Claude-Code-Config-Permissions|권한 모드 6종]], 공식 표는 아래 세 묶음만 다룬다). auto는 첫 실행만 묻고 (ultracode가 켜져 있으면 생략), default(=manual)와 acceptEdits는 매번 묻고 (워크플로우+프로젝트 단위 don't ask again 선택 가능), bypassPermissions와 `claude -p`와 Agent SDK는 묻지 않고 즉시 실행한다.

권한 모드가 통제하는 것은 실행 승인뿐이다. **워크플로우 런타임이 띄우는 서브에이전트는 세션 모드와 무관하게 항상 acceptEdits 모드로 실행되고 세션의 도구 allowlist를 상속한다** — 파일 편집은 자동 승인되고 (acceptEdits의 보호 경로와 작업 디렉토리 예외는 [[Claude-Code-Config-Permissions|설정과 권한]]이 정본), allowlist에 없는 셸 명령, 웹 fetch, MCP 도구는 실행 중에도 프롬프트를 띄울 수 있다. 긴 실행이 중간에 멈추지 않게 하려면 에이전트가 쓸 명령을 시작 전에 allowlist에 넣는다. 프론트매터 `permissionMode`로 정의하는 일반 서브에이전트의 모드 규칙은 별개다 ([[Claude-Code-Extension-Reference|확장 메커니즘]] 소관).

## 스크립트 구조

저장된 스크립트는 `meta` 블록과 plain JavaScript 본문(top-level await 가능)으로 구성된다.

```javascript
export const meta = {
  name: 'audit-routes',
  description: 'Audit every route handler for missing auth checks',
}

const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } },
})

const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)

return audits.filter(Boolean)
```

- `agent()`는 서브에이전트 하나를 띄운다. 예시처럼 `schema` 옵션으로 출력 구조를 지정할 수 있다.
- `pipeline()`은 리스트 항목당 에이전트를 하나씩 붙여 실행한다 (항목 수만큼 fan-out).
- 실행 중 중단됐거나 복구 불가능한 API 에러를 만난 `agent()` 호출은 null로 끝나고, `pipeline()`은 그 null을 결과 배열에 그대로 남긴다 — 마지막의 `.filter(Boolean)`이 그것을 걷어내는 관용구다.

## 실행 모델과 제한

- 런타임은 스크립트를 대화와 분리된 격리 환경에서 실행하고, 중간 결과는 스크립트 변수에 남는다. 모든 실행은 스크립트를 `~/.claude/projects/` 아래 세션 디렉토리에 파일로 남긴다 — 열어서 읽고, 이전 실행과 diff하고, 수정한 버전으로 재실행을 요청할 수 있다.
- 제한: 실행 중 사용자 입력 불가 (단계 사이 사인오프가 필요하면 단계마다 별도 워크플로우로 나눈다), 스크립트 자체는 파일시스템과 셸 접근 불가 (읽기, 쓰기, 명령 실행은 에이전트가 하고 스크립트는 조율만 한다), `import()` 같은 모듈 로딩 금지, 동시 에이전트 최대 16 (가용 CPU가 적으면 더 줄어든다), 실행당 총 1,000 에이전트.
- **fan-out 프롬프트 캐시 공유**: 모델, effort, 에이전트 타입, 도구, 출력 스키마, 작업 디렉토리가 같은 에이전트는 같은 도구+시스템 프롬프트 prefix를 만든다. 여러 에이전트를 한꺼번에 시작하면 첫 에이전트의 응답이 시작될 때까지 나머지를 잡아뒀다가 함께 풀어, 첫 요청들이 캐시를 읽게 한다 (대기 상한 기본 5초. v2.1.229 이상에서는 `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS`로 조정하고 0이면 비활성이며, `DISABLE_PROMPT_CACHING`이 켜져 있으면 대기하지 않는다).

## 재개(Resume) — 무엇이 살아남는가

중단한 실행은 같은 세션 안에서 재개할 수 있다 (/workflows에서 p, 또는 같은 스크립트로 재실행 요청). Claude Code를 종료하면 다음 세션은 처음부터 다시 시작한다. 어떤 결과가 캐시로 살아남는지는 두 규칙이 결정한다.

1. 중단 시점에 실행 중이던 에이전트는 저장되지 않는다 — 재개하면 처음부터 다시 실행된다.
2. 재생은 에이전트 시작 순서를 따른다. 캐시 반환은 첫 미완료 에이전트에서 멈추고, **그보다 늦게 시작한 에이전트는 완료됐더라도 다시 실행된다**.

A, B, C, D 순서로 시작하고 B 실행 중에 멈추면 A만 캐시로 돌아오고, B는 미완료라서, C와 D는 완료됐어도 B보다 늦게 시작해서 다시 실행된다. 그래서 소수의 긴 에이전트보다 **다수의 작은 에이전트로 fan-out하는 쪽이 중단 시 진행을 더 보존한다**.

## 비용 통제

- 큰 작업 전에 작은 슬라이스(전체 레포 대신 디렉토리 하나, 넓은 질문 대신 좁은 질문)로 먼저 돌려 지출을 가늠한다. /workflows가 에이전트별 토큰 사용량을 보여주고 언제든 중단할 수 있다.
- **Large workflow 경고**: 스케줄된 에이전트가 25개를 넘거나 예상 토큰 총량이 150만을 넘으면 태스크 패널의 진행 줄에 경고가 뜬다. 자문 성격이라 실행을 막거나 멈추지는 않는다. size guideline을 직접 고르면 그 값의 에이전트 수가 25 임계값을 대체하고, ultracode 세션에서는 이미 대규모 실행에 opt-in한 것으로 보아 경고가 뜨지 않는다.
- **Size guideline** (v2.1.202 이상): Claude가 워크플로우를 쓸 때 목표로 삼는 에이전트 수에 대한 조언이며 강제 상한이 아니다 — 다른 규모를 요구하는 프롬프트가 우선한다. unrestricted, small(5 미만), medium(15 미만), large(50 미만)이고 기본은 medium (v2.1.219 이상; 이전 버전 기본은 unrestricted). /config에서 고르거나 v2.1.219 이상에서는 settings 파일의 `workflowSizeGuideline` 키로 지정한다 (settings 값이 /config보다 우선). 어느 값을 골라도 런타임 에이전트 상한(동시 16, 실행당 1,000)은 그대로 적용된다.
- 모델: 모든 에이전트가 세션 모델을 쓰되, 스크립트가 스테이지별로 다른 모델을 지정할 수 있고, `CLAUDE_CODE_SUBAGENT_MODEL` 환경 변수는 둘 다 오버라이드한다. 조직의 availableModels 허용 목록이 요청된 모델을 막으면 서브에이전트 대체 규칙에 따라 다른 모델로 실행되고 /workflows 진행 화면에 요청 모델과 대체 모델이 함께 표시된다.

## 저장, 배포, 입력

- 실행이 원하는 대로 됐으면 /workflows에서 s로 커맨드로 저장한다. 위치는 프로젝트 `.claude/workflows/` (레포를 클론한 전원과 공유) 또는 `~/.claude/workflows/` (전 프로젝트, 개인 전용) 중 선택하고, 이후 `/<이름>`으로 실행한다. 프로젝트와 개인에 같은 이름이 있으면 프로젝트 쪽이 실행된다.
- 모노레포에서는 작업 디렉토리와 레포 루트 사이에 이미 존재하는 가장 가까운 `.claude/workflows/`에 저장되고 (하나도 없으면 레포 루트), 경로상의 모든 `.claude/workflows/`에서 로드되며 같은 이름은 작업 디렉토리에 가까운 쪽이 실행된다 (v2.1.178 이상).
- 플러그인 배포: 플러그인 루트의 `workflows/` 디렉토리에 두면 플러그인 이름으로 네임스페이스된다 — `acme-tools` 플러그인의 `release-audit`는 `/acme-tools:release-audit`로 실행.
- 저장된 워크플로우는 호출 시 입력을 받을 수 있다 — 스크립트가 전역 `args`로 읽고, 구조화 데이터로 전달되므로 파싱 없이 배열과 객체 메서드를 바로 쓸 수 있다. 생략하면 `args`는 undefined다.

## 끄기

/config의 Dynamic workflows 토글, `~/.claude/settings.json`의 `"disableWorkflows": true`, 또는 시작 시 읽는 `CLAUDE_CODE_DISABLE_WORKFLOWS=1`. 조직 단위로는 managed settings의 `disableWorkflows` 또는 Claude Code admin 설정 페이지. 끄면 번들 워크플로우 커맨드, ultracode 키워드 트리거, /effort 메뉴의 ultracode가 모두 비활성화된다.

## 체크포인트

- 서브에이전트, 스킬, 에이전트 팀, 워크플로우를 가르는 축 — 누가 계획을 쥐고, 중간 결과가 어디에 남는가
- 계획을 코드로 옮기면 규모 외에 무엇이 반복 가능해지는가 (적대적 상호 검증, 다각도 초안 같은 품질 패턴)
- resume의 두 규칙과 fan-out 설계에 주는 함의 — 작은 에이전트 다수가 중단 시 진행을 보존
- 서브에이전트가 항상 acceptEdits로 도는 것, allowlist 사전 등록이 필요한 이유
- 비용 가드 — 슬라이스 먼저, Large workflow 경고 임계값, size guideline
- fan-out 캐시 공유가 성립하는 조건 (모델, effort, 에이전트 타입, 도구, 스키마, 작업 디렉토리 일치)

## 출처

- [Orchestrate subagents at scale with dynamic workflows — Claude Code Docs](https://code.claude.com/docs/en/workflows)

## 관련 문서

- [[Claude-Code-Extension-Reference|확장 메커니즘 (훅, 서브에이전트, 스킬, 플러그인, MCP)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (방법론 — 단계 분리 지시, Hook 강제)]]
- [[Claude-Code-Operations|운영 (헤드리스, CI 안전장치, 비용 정량)]]
- [[Claude-Code-Config-Permissions|설정과 권한 (권한 모드 6종, allowlist)]]
- [[Claude-Code-Fundamentals|Claude Code 기초 (모델과 Effort, 세션 관리)]]
- [[Agent-Loop-Engineering|루프 엔지니어링 (위임 4분류, 정지 조건)]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (체인 vs 에이전트)]]
