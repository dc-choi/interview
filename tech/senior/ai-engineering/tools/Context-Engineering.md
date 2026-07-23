---
tags: [senior, ai, context-engineering, claude-md, productivity]
status: done
verified_at: 2026-07-23
category: "Senior - AI 엔지니어링"
aliases: ["Context Engineering", "컨텍스트 엔지니어링", "CLAUDE.md 최적화", "Context Rot"]
---

# 컨텍스트 엔지니어링 (Context Engineering)

## 정의

컨텍스트 엔지니어링은 모델이 현재 판단에 필요한 정보와 도구를 적절한 시점에 받도록 설계하는 일이다. 목표는 무조건 짧게 만드는 것이 아니라 **관련성, 신뢰도, 시점, 비용**을 함께 관리하는 것이다.

긴 입력이 항상 나쁜 것도, 항상 좋은 것도 아니다. 같은 길이라도 과제, 모델, 정보의 위치와 관련성에 따라 결과가 달라진다. 따라서 컨텍스트 윈도우의 크기를 곧 사용 가능한 품질로 해석하면 안 된다.

## Context Rot

Context Rot은 입력이 길어질 때 정보 활용 성능이 균일하게 유지되지 않는 현상을 가리키는 실무 용어다. 다음은 가능한 위험 패턴이지 모든 모델과 과제에 똑같이 적용되는 확정 원인 목록은 아니다.

| 위험 패턴 | 실무상 의미 |
|---|---|
| 위치 민감도 | 필요한 정보가 놓인 위치에 따라 회수와 추론 결과가 달라질 수 있다 |
| 유사 정보와 방해 요소 | 관련 없어 보이는 정보뿐 아니라 비슷하지만 틀린 정보도 판단을 흐릴 수 있다 |
| 장거리 추론 부담 | 멀리 떨어진 단서를 연결해야 할수록 과제가 어려워질 수 있다 |
| 지시 충돌 | 오래된 상태, 중복 규칙, 상충하는 지시가 많으면 어떤 지시를 따라야 할지 불명확해진다 |

Chroma의 통제 실험은 18개 모델에서 입력 길이에 따른 성능 변화가 비균일하고 과제별 차이가 크다고 보고했다. 별도의 소프트웨어 엔지니어링 벤치마크 연구에서는 LLM이 생성한 파일과 개발자가 커밋한 파일 모두 작업 성공률을 일반적으로 개선하지 않았고 평균 추론 비용을 20% 넘게 늘렸다. 두 결과 모두 특정 실험 조건의 관찰이므로 모든 모델과 저장소에 그대로 일반화하지 않는다.

## 운영 프레임

| 전략 | 목적 | 예시 |
|---|---|---|
| Write | 진행 상태를 컨텍스트 밖의 신뢰 가능한 저장소에 남긴다 | 작업 계획, 결정 기록, 테스트 결과 |
| Select | 현재 질문에 필요한 근거만 찾는다 | 검색, 정확한 파일 경로, 관련 소스 직접 읽기 |
| Compress | 긴 이력과 출력을 핵심 근거 중심으로 줄인다 | 명시적 요약, 도구 출력 필터링, `/compact` |
| Isolate | 무거운 탐색이나 독립 검토의 컨텍스트를 분리한다 | 서브에이전트, 별도 세션 |

이 네 항목은 설계용 프레임이다. 어떤 제품이 보장하는 고정 표준이나 완전한 분류 체계는 아니다.

## Claude Code의 프로젝트 지시와 Skill 로딩

Claude Code 공식 문서 기준으로 프로젝트 지시와 Skill의 로딩 시점을 구분해야 한다. Auto memory는 별도 기능이며, 활성화하면 시작 시 인덱스 일부가 로드된다. 이 vault에서는 해당 기능을 비활성화한다.

### 시작 시점에 로드되는 것

- 운영체제가 정한 위치의 조직 관리 지시
- 사용자 지시인 `~/.claude/CLAUDE.md`
- 사용자 범위의 `~/.claude/rules/` 중 경로 범위가 지정되지 않은 규칙. 사용자 규칙은 프로젝트 규칙보다 먼저 로드된다
- 프로젝트 범위의 `CLAUDE.md` 또는 `.claude/CLAUDE.md`와 작업 디렉터리 및 그 조상 계층에서 발견되는 `CLAUDE.md`, `CLAUDE.local.md`
- 프로젝트의 `.claude/rules/` 중 경로 범위가 지정되지 않은 규칙
- Skill 목록의 이름과 모델 호출에 필요한 설명. 수동 호출 전용 설정 등으로 설명 로딩 방식은 달라질 수 있다

### 작업 중 조건부로 로드되는 것

- 하위 디렉터리의 파일을 읽을 때 발견되는 그 경로의 `CLAUDE.md`와 `CLAUDE.local.md`
- 사용자 또는 프로젝트 범위의 `.claude/rules/` 중 현재 다루는 파일과 경로 조건이 맞는 규칙
- 호출된 Skill의 전체 본문. Skill을 미리 주입하도록 설정한 서브에이전트는 시작 시점에 본문을 받을 수 있다
- 도구로 직접 읽은 소스와 문서

`CLAUDE.md`의 `@path/to/file` import는 단순 포인터가 아니다. 해당 지시 파일이 로드될 때 import한 내용도 확장되어 함께 로드된다. 온디맨드 참조가 필요하면 import 대신 백틱으로 감싼 파일 경로나 `file:line`을 적고, 실제 작업 때 필요한 파일만 읽게 한다.

> 이 vault는 Claude Code auto memory를 사용하지 않는다. 지속 규칙은 루트 또는 가장 가까운 도메인의 `CLAUDE.md`에 두고, 반복 절차는 Skills에 둔다.

## 지시 파일 설계

Anthropic은 각 `CLAUDE.md`를 200줄보다 짧게 유지하는 것을 목표로 제안한다. 이는 제품의 하드 제한이 아니라 중요한 지시가 묻히지 않도록 하는 작성 지침이다.

- 루트 `CLAUDE.md`: 저장소 전체에 적용되는 불변 규칙과 도메인 라우팅
- 중첩 `CLAUDE.md`: 해당 경로에서만 유지할 불변 규칙
- Skills: 특정 요청에서 수행할 반복 절차와 출력 계약
- 소스와 상세 문서: 경로를 알려 주고 필요할 때 직접 읽기

줄마다 없으면 실제 오류가 늘어나는지, 더 가까운 경로나 Skill로 옮길 수 있는지 확인한다. 긴 설명, 자주 바뀌는 예제, 이미 자동화로 검증되는 규칙은 상시 지시에서 뺀다.

## Advisory와 강제 검증

| 수단 | 적합한 역할 | 한계 |
|---|---|---|
| `CLAUDE.md` | 판단 원칙, 저장소 맥락, 작업 경계 | 자연어 지시라 항상 준수된다고 보장할 수 없다 |
| Skill | 특정 작업의 절차와 출력 형식 | 호출 여부와 본문 품질에 영향을 받는다 |
| Hook | 일치하는 수명주기 이벤트에서 명령 실행 | 설정, 권한, 명령 성공 여부에 따라 실패할 수 있다 |
| 테스트, 린터, CI | 결과물의 기계적 검증과 병합 차단 | 작성하지 않은 검증 규칙은 잡지 못한다 |

Hook은 자연어 지시보다 실행 시점이 결정적이지만 성공률을 고정된 비율로 보장하지 않는다. `PreToolUse`는 도구 실행 전에 검사하거나 차단할 수 있다. `PostToolUse`는 도구 실행 후 동작하므로 이미 일어난 변경을 예방할 수는 없다. 반드시 막아야 하는 조건은 가능한 범위에서 사전 Hook, 테스트, 린터나 CI로 검증한다.

## 토큰과 품질을 함께 관리하는 방법

1. 루트에는 전역 불변 규칙만 두고 경로별 규칙을 가까운 `CLAUDE.md`로 내린다.
2. 긴 코드를 지시 파일에 복사하지 않고 정확한 경로와 필요한 심볼을 알려 준다.
3. 반복 워크플로우는 Skill로 분리하되 Skill 설명도 짧고 구체적으로 쓴다.
4. 도구 출력은 현재 판단에 필요한 부분만 반환하고, 최종 결론은 원본 파일과 테스트로 다시 검증한다.
5. 서브에이전트는 탐색이나 독립 검토를 격리할 때 사용하고, 메인에는 결론과 근거 위치를 전달한다.
6. 긴 대화에서는 `/context`로 사용량을 확인하고 `/compact`에 보존할 결정과 미완료 작업을 명시한다.
7. 이전 대화의 잡음이 큰 경우에는 새 세션에 작업 상태, 결정, 검증 결과만 넘기는 방안도 고려한다.

## 트레이드오프

- 짧음과 충분함: 지나치게 줄이면 필수 제약과 예외가 빠진다.
- 선택과 누락: JIT 로딩은 비용을 줄이지만 라우팅이 틀리면 필요한 규칙을 놓친다.
- 자동화와 유연성: 기계적 검증은 강하지만 맥락 판단까지 대신하지 못한다.
- 격리와 비용: 서브에이전트는 컨텍스트를 분리하지만 추가 호출과 검토 비용이 든다.
- 압축과 원본성: 요약은 싸지만 세부 근거를 잃을 수 있으므로 중요한 결론은 원본과 대조한다.

## 실전 체크리스트

- [ ] 현재 작업에 필요한 지시 체인만 로드했는가
- [ ] 루트 규칙, 도메인 규칙, Skill의 역할이 중복되지 않는가
- [ ] `@import`를 온디맨드 포인터로 오해하지 않았는가
- [ ] 절대적인 성공률이나 모든 모델에 대한 일반화를 쓰지 않았는가
- [ ] Hook의 실행 시점과 실패 가능성을 구분했는가
- [ ] 요약에서 나온 결론을 원본 소스, 호출부, 테스트나 설정으로 확인했는가

## 면접 포인트

Q. 컨텍스트를 많이 주면 항상 더 잘하지 않나?

- 아니다. 길이 자체보다 관련성, 위치, 상충 여부와 과제 난도가 함께 작용한다. 긴 컨텍스트에서 성능이 비균일해질 수 있으므로 필요한 근거를 선택하고 원본으로 검증한다.

Q. `CLAUDE.md`와 Skill은 어떻게 나누나?

- 루트에는 전역 불변 규칙과 라우팅, 중첩 파일에는 경로 불변 규칙, Skill에는 요청별 반복 절차를 둔다. 상세 소스는 경로로 안내하고 필요할 때 읽는다.

Q. 반드시 지켜야 할 규칙은 Hook에만 두면 되나?

- 아니다. Hook도 설정과 명령 실패 가능성이 있다. 실행 전 차단은 `PreToolUse`, 결과 검증은 테스트, 린터와 CI를 조합하고 사람이나 에이전트가 이해할 판단 원칙은 지시 파일에도 남긴다.

## 출처

- [Claude Code memory and instruction loading - Anthropic](https://code.claude.com/docs/en/memory)
- [Claude Code best practices - Anthropic](https://code.claude.com/docs/en/best-practices)
- [Extend Claude with skills - Anthropic](https://code.claude.com/docs/en/slash-commands)
- [Automate actions with hooks - Anthropic](https://code.claude.com/docs/en/hooks-guide)
- [Create custom subagents - Anthropic](https://code.claude.com/docs/en/sub-agents)
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance - Chroma](https://www.trychroma.com/research/context-rot)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988)
- [NoLiMa: Long-Context Evaluation Beyond Literal Matching](https://arxiv.org/abs/2502.05167)
- [효율적인 CLAUDE.md 관리 및 컨텍스트 최적화 전략 - Hancom Tech](https://tech.hancom.com/claude-md-context-optimization/)

## 관련 문서

- [[Tool-Output-Filtering|도구 출력 필터링 (컨텍스트를 채우는 도구 출력을 사전 필터링, Select 전략의 도구 응답 적용판)]]
- [[Agentic-Context-Platform|Context Provider / 에이전트 컨텍스트 플랫폼 (공급 측, 조직 자산을 모아 신뢰 가능한 맥락 풀로)]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain, Inform, Verify, Correct, HITL, 컨텍스트는 Inform 축)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (지시의 저주, 3단계 경계)]]
- [[Agent-Coding-Guardrails|LLM 코딩 가드레일 (실패 패턴별 원칙, 판정 테스트, 배포 경로)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Lazy Load, 분업)]]
- [[Software-3-0|Software 3.0]]
