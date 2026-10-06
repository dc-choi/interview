---
tags: [ai, claude-code, agent, workflow, automation, tooling]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Workflows", "클로드 코드 워크플로우", "Claude Code 실전"]
verified_at: 2026-09-03
---

# Claude Code 개발 워크플로우 — 지시, 강제, 확장, 팀 도입

AI 코딩 에이전트를 실무에 태우는 방법론. 방향이 불명확한 작업은 탐색과 계획을 구현에서 분리하고, 범위가 정해진 작업은 완료 조건과 검증 수단을 함께 준다. 지침과 실행을 차단하는 Hook의 역할도 구분한다.

## 개발 워크플로우

### 코드베이스 탐색 — 전체에서 세부로

새 프로젝트 투입 시 질문 순서: 전체 조감도(구조, 아키텍처 패턴, 해결하는 문제) → 진입점과 핵심 파일 5개 → 코드 흐름 추적 → 함수 호출 체인 → 결과를 ONBOARDING.md로 저장해 팀 공유. 세부부터 보면 길을 잃는다. 읽기 전용 탐색은 Auto-Accept 모드로 승인 없이 진행하고, 10만 줄 이상이면 /clear로 세션을 나눠 영역별 분할 탐색.

### 정확한 지시의 3요소

파일(@경로 자동완성) + 위치(함수명) + 원하는 결과를 구체화한다. 인터페이스가 맞물린 파일은 양쪽을 참조한다. 컨텍스트 비용은 파일 수보다 실제로 읽는 내용의 크기에 달려 있으므로 고정 개수로 상한을 정하지 않는다.

### 긴 작업의 완료와 중단 조건

2026-10-06 공식 Opus 5.5 가이드와 Claude Code best practices를 대조한 범위다. 작업 전체를 위임할 때도 허용 범위와 검증 가능한 종료 조건이 필요하다.

- **완료:** 변경할 호출부, 유지할 호환성, 실행할 검사와 기대 결과를 지정한다. 테스트 통과만으로 요청 범위 전체가 충족됐다고 판단하지 않는다.
- **중단:** 필요한 결정이나 접근 권한이 없을 때, 승인 범위를 넘는 파괴적 작업 앞에서 멈출 조건을 둔다. 계속 진행하라는 지시는 권한 확대가 아니다.
- **진행 기록:** 긴 작업은 완료, 남은 일과 미확인 항목을 파일에 갱신한다. 대화 압축 뒤에도 범위를 복원할 수 있지만 파일의 체크 표시 자체가 검증 증거는 아니다.
- **결과 확인:** 에이전트 요약과 diff, 실행 결과를 구분한다. 리뷰 지적에는 위치, 실패 이유와 재현 방법을 요구하고 확인하지 못한 범위도 남긴다.

막연히 더 깊이 생각하라고 반복하기보다 결과와 검증 기준을 구체화한다. 이 권고는 실제 모델의 effort 설정을 낮추라는 뜻이 아니다. 방향이 불명확하면 먼저 계획을 검토하고, 범위가 명확한 작은 변경에까지 매번 별도 계획 단계를 강제하지 않는다.

### 디버깅 — 재현 조건까지 한 번에

파일 + 에러 메시지 + **전체 스택트레이스**(생략 금지) + 재현 조건을 한 프롬프트에. 에러 재현 자체를 시킬 수도 있다 ("서버 실행하고 body 없이 POST 보내 재현해줘"). 수정 후 재발 방지 테스트 작성까지가 한 사이클. 한 번에 버그 하나, 이해하지 못한 수정은 적용하지 않는다.

### TDD — 단계를 분리해야 테스트를 건너뛰지 않는다

- Red: "테스트를 먼저 작성해줘. **구현은 아직 하지 마.**" → 실행해 실패 확인 (처음부터 통과하는 테스트는 아무것도 검증 못 함)
- Green: "테스트를 통과하는 최소한의 구현. 과도한 최적화, 추가 기능 금지"
- Refactor: "테스트 통과를 유지하면서 구조만 개선"

테스트와 구현을 함께 요청했다는 이유만으로 테스트가 형식적이라고 단정하지 않는다. 실패 재현과 요구사항에서 도출한 기대값을 확인하고, 테스트가 구현의 잘못을 그대로 복제하지 않았는지 검토한다. 한 사이클에 기능 하나를 다루는 TDD 연습은 [[TDD-Refactoring-Practice|TDD 리팩토링 연습법]]을 따른다.

### 리팩토링 — 복구 지점과 계획 검토

커밋으로 복구 지점 확보 → 중복 패턴 탐색(3회 이상 반복, 파일명 + 줄번호) → **"계획만 세워줘, 코드 수정 금지"** → 검토하고 범위 축소 → 한 파일씩 수정. 리팩토링 커밋은 기능 변경 커밋과 분리한다.

## 강제와 자동화

### Hook — 권장이 아니라 물리적 강제

CLAUDE.md는 무시될 수 있는 가이드라인이고, 반드시 지켜야 하는 것은 Hook이 강제한다 ([[AI-Native-System|부탁 vs 강제]] 프레임의 구현).

- PreToolUse + matcher로 위험 명령(rm -rf, DROP TABLE, force push) 차단 — 차단은 **exit 2** (exit 1은 통과됨) 또는 decision:block JSON
- PostToolUse로 파일 수정 직후 린터 실행 → 출력이 모델에 피드백되어 **자동 수정 루프** 형성
- 보호 파일(.env, lockfile, .git/) 차단, 커밋 전 테스트 강제
- Hook이 느리면 전체 응답이 느려진다 — 무거운 검사는 선별

### Git, PR, CI 연동

- diff 분석 기반 커밋 메시지 생성 — Conventional Commits 같은 규칙은 CLAUDE.md에 명시. 커밋 메시지와 PR 본문은 수락 전 확인, diff의 시크릿 포함 여부 점검
- CI(GitHub Actions)에서 PR 자동 리뷰: 공식 액션 사용, API 키는 Secrets로, 쓰기 permissions 필수, max-turns로 비용 제한. **사람 리뷰어는 설계와 로직에 집중**하는 역할 분담
- 로컬 pre-commit hook(린트 + 타입 + 테스트, 하나라도 실패 시 커밋 차단)과 에이전트 Hook을 이중 배치
- LLM 리뷰의 비용 배치: 커밋마다 자동 실행은 부담 → 커밋 전 수동 실행 + PR 단위는 CI가 담당

### Worktree 병렬 세션

브랜치 전환 없이 독립 디렉토리에서 여러 세션 동시 가동 (`claude -w 브랜치명`). **파일 수정 영역이 겹치지 않는 독립 작업 할당**이 중요하다 — 기능 개발, 버그 수정, 리팩토링을 나눠 맡긴다. 로컬 worktree 여러 개 + 클라우드 세션을 합쳐 10개 이상 병렬 운용하는 패턴도 있다. 머지 전 변경 파일 중복 확인.

## 확장 — Skills, MCP, 서브에이전트, 에이전트 팀, 동적 워크플로우, 플러그인

### Skills

재사용 지시문. 이름이 겹치면 엔터프라이즈 > 개인 전역(`~/.claude/skills/`) > 프로젝트(`.claude/skills/`) 순으로 우선한다. 플러그인 스킬은 `plugin-name:skill-name` 네임스페이스를 사용해 다른 레벨과 충돌하지 않는다.

- SKILL.md: 프론트매터(name, description) + 지시문 + `$ARGUMENTS`/`$0` 인자 치환, 동적 컨텍스트(백틱 셸 실행 결과 삽입)
- `context: fork`로 서브에이전트 실행 (메인 컨텍스트 오염 방지)
- **부작용 있는 스킬(배포, 전송)에는 `disable-model-invocation: true` 필수** — 없으면 일반 대화에서 자동 실행될 수 있다
- 커뮤니티 스킬은 설치 전 SKILL.md 내용 확인 — 스킬은 곧 모델에게 내리는 지시이므로 소스 신뢰성이 보안 문제

### MCP

DB, 외부 API로 접근 범위 확장. 스코프 3종(user 전역, project는 .mcp.json으로 Git 공유, local 개인). **접속 문자열의 비밀번호가 설정에 평문 저장**되므로 project 스코프에서는 읽기 전용 계정 사용 ([[MCP]] 참조).

### 서브에이전트, 에이전트 팀, 동적 워크플로우

- 서브에이전트: 메인 세션 내 독립 컨텍스트, 결과만 반환. **리뷰, 분석 에이전트에는 읽기 전용 도구만 부여**하고 worktree 격리로 의도치 않은 수정 방지
- 에이전트 팀: 독립 인스턴스 병렬 + 상호 통신. 토큰 비용이 커서 필요할 때만
- 에이전트별 memory로 세션 간 지식 축적 가능
- 동적 워크플로우: 대화가 조율할 수 있는 규모를 넘는 대량 fan-out(전체 감사, 대량 마이그레이션)을 스크립트로 오케스트레이션 ([[Claude-Code-Dynamic-Workflows|동적 워크플로우]])

### 플러그인

Skills + Hook + MCP + LSP + 출력 스타일을 묶어 배포하는 단위. 검증(validate) → 로컬 테스트(--plugin-dir) → 마켓플레이스 배포. 커뮤니티 플러그인은 **공식 보안 감사가 없으므로** 설치 전 스크립트 직접 확인. LSP 플러그인은 편집 직후 타입 에러를 자동 감지하지만 대형 프로젝트에서 메모리 주의.

## 개인에서 조직으로 확장하는 4단계

AI 코딩 도구를 배포하는 것과 조직의 개발 역량으로 만드는 것은 다르다. 다음 단계는 기능 목록이 아니라 다음 단계로 넘어가기 전에 확보할 운영 능력을 나타낸다.

| 단계 | 확보할 능력 | 통과 조건 |
|---|---|---|
| 기반 | 인증, model/region, project settings 재현 | 새 구성원이 같은 환경을 재현하고 실제 호출 확인 |
| 개인 | Orchestrator, Architect, Reviewer 역할과 SDD | 의도와 spec이 구현, 검증까지 추적됨 |
| 팀 | Shared spec, 점진적 코드 탐색, harness와 Read/Run 검증 | 누가 작성해도 같은 gate와 review 기준 통과 |
| 조직 | CI 자동화, 정책 배포, Privilege/Data/Audit/Cost 관리 | 사용량, 품질, 비용과 감사 evidence를 팀별로 설명 |

기반 없이 개인 prompt skill부터 가르치면 설정 차이가 결과 차이로 섞인다. 개인 성공을 바로 전사 배포하면 검증과 비용 통제가 뒤늦게 붙는다. 각 단계의 산출물을 다음 단계의 입력으로 사용한다.

```text
재현 가능한 실행 환경
  -> spec으로 통제되는 개인 workflow
  -> 공유 gate를 가진 team workflow
  -> 보안, 데이터, 감사와 비용이 관리되는 조직 운영
```

Model provider는 이 중 기반과 조직 운영의 일부다. 예를 들어 Amazon Bedrock을 사용하면 AWS identity, model/profile, region, billing과 audit 경계를 활용할 수 있지만, Claude Code의 파일과 shell 권한, Hook, MCP와 code quality gate는 별도로 설계해야 한다. 자세한 배포 경계는 [[Claude-Code-Bedrock]]을 참고한다.

### 팀 단계의 공유 계약

- **CLAUDE.md = 팀 표준 문서**: 코드 스타일, Git 규칙, 테스트 기준, 금지 사항을 커밋해 전원 공유. 매 세션 로드되므로 200줄 이하, 길어지면 rules 파일로 분리 ([[Context-Engineering]])
- 설정의 Git 공유가 곧 표준화: skills, agents 정의, .mcp.json까지 커밋하면 리뷰 기준과 도구가 자동 통일 — 단 시크릿은 절대 커밋 금지
- 온보딩: 클론 → 에이전트에게 구조 질문 → 연습 이슈로 PR까지, 첫날부터 팀 규칙대로
- 문서 자동화: 코드 분석 기반 README, API 명세, .env.example 생성 + **"설치 명령이 실제 동작하는지 실행해서 확인"** 검증까지. 생성 문서는 사람 검토 필수

## 사례 — 창시자의 워크플로우

Claude Code를 만든 엔지니어의 실사용 패턴. 위 원칙들의 극단적 적용례다.

- **1순위 팁 = 검증 피드백 루프**: 테스트, 스크린샷, 기대 출력 같은 검증 수단을 주면 최종 품질이 2~3배. 모든 변경을 Claude가 스스로 검증하게 한다
- **병렬이 기본값**: 터미널 탭 5개 + 웹 세션 5~10개 + worktree 3~5개 동시 가동, 셸 별칭으로 한 키 이동. 모바일에서 시작한 세션을 데스크톱으로 이어받는다
- **모델은 최상위 + Thinking 고정**: 크고 느려도 덜 조종해도 되고 도구 사용이 뛰어나 전체적으로는 거의 항상 더 빠르다
- **복리 엔지니어링**: 실수마다 CLAUDE.md에 규칙을 추가해 Git 커밋하고, PR 리뷰 태그로 CLAUDE.md를 자동 갱신하는 Action까지 연결. 단 코드에서 추론 가능한 스타일 규칙은 넣지 않는다 — 실제 CLAUDE.md에는 빌드 명령과 순서만 있다
- **워크플로우를 스킬로 만들고 루프에 태운다**: PR을 프로덕션까지 관리하는 스킬을 몇 분 간격 루프로 주기 실행 — 반복 업무 자동화의 종착점

## 관통하는 원칙

1. **불확실성에 맞춘 계획** — 방향이 불명확하면 계획을 먼저 검토하고, 정해진 작업은 완료 조건과 검증 수단을 함께 위임한다
2. **권장은 CLAUDE.md, 강제는 Hook** — 물리적 보장이 필요한 것을 가이드라인에 맡기지 않는다
3. **최소 권한** — 읽기 전용 도구, disable-model-invocation, 읽기 전용 DB 계정이 기본값
4. **컨텍스트는 명시적, 경제적으로** — @파일 지정, 전체 스택트레이스, fork 격리, 200줄 제한, 병렬 분할
5. **설정의 Git 공유 = 팀 표준화** — 시크릿만 빼고 전부 커밋

## 출처

- [Getting the most out of Opus 5.5 in Claude and Claude Code — claude.dev, Addy Osmani](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/)
- [Claude Code — Best practices](https://code.claude.com/docs/en/best-practices)
- [Claude Code — Skills](https://code.claude.com/docs/en/skills)
- [클로드 코드 가이드 (개발 파트 17챕터, 별첨 1 창시자의 워크플로우) — WikiDocs](https://wikidocs.net/book/19104)
- [개인 생산성에서 조직 생산성으로, Claude Code on Amazon Bedrock 학습 플랜 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/claude-code-on-amazon-bedrock-training/)
- [Claude Code on Amazon Bedrock 온라인 교육 프로그램 — AWS](https://dtlpyb0rtvxql.cloudfront.net/)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초 (권한 모드, 컨텍스트, CLAUDE.md)]]
- [[Claude-Code-Dynamic-Workflows|동적 워크플로우 (대규모 서브에이전트 오케스트레이션)]]
- [[Claude-Code-Bedrock|Claude Code on Amazon Bedrock 배포와 운영]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain→Inform→Verify→Correct)]]
- [[AI-Native-Org|AI 네이티브 조직 (공용 실행 계층)]]
- [[AX-Transformation|AX 조직 전환 (도구 도입과 조직 전환의 차이)]]
- [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (CLAUDE.md 200줄)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
- [[MCP|MCP (Model Context Protocol)]]
- [[TDD-Refactoring-Practice|TDD 리팩토링 연습법]]
- [[Code-Review-Culture|생산적 코드 리뷰 문화]]
