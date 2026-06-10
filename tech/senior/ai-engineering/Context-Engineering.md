---
tags: [senior, ai, context-engineering, claude-md, productivity]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Context Engineering", "컨텍스트 엔지니어링", "CLAUDE.md 최적화", "Context Rot"]
---

# 컨텍스트 엔지니어링 (Context Engineering)

## 정의

컨텍스트 윈도우에 **무엇을, 얼마나, 언제** 넣을지를 설계하는 것. 정보를 많이 주는 게 아니라 **매 순간 필요한 최소 맥락만 남기는 것**이 목표다. "컨텍스트가 많을수록 성능이 좋다"는 직관은 틀렸다 — 입력이 길어질수록 오히려 성능이 떨어진다(Context Rot). 컨텍스트는 자산이 아니라 **예산(budget)**: 한 토큰을 넣을 때마다 비용과 노이즈도 같이 들어간다.

## Context Rot (컨텍스트 부패)

입력 길이가 길어질수록 모델 성능이 저하되는 현상.

| 원인 | 설명 |
|---|---|
| Lost-in-the-middle | 입력 중간에 놓인 정보가 양 끝보다 무시됨 |
| Attention 분산 | 토큰 수가 늘수록 어텐션이 묽어짐 |
| 위치 인코딩 한계 | 긴 시퀀스에서 위치 정보 신뢰도 하락 |

- **실증**: 최신 모델 다수가 예외 없이 입력 길이 증가에 따라 성능이 저하됐다.
- **역설**: 자동 생성된 무관 컨텍스트를 채우면 **컨텍스트가 아예 없을 때보다도** 성능이 낮아질 수 있다. 반대로 **인간이 큐레이션한 컨텍스트**는 대부분 모델에서 최고 성공률을 냈다.

## 4대 전략 (Write, Select, Compress, Isolate)

| 전략 | 무엇 | 수단 |
|---|---|---|
| **Write** | 작업 상태를 컨텍스트 밖 저장소로 빼기 | PROGRESS.md, decisions.md, 메모리 파일 |
| **Select** | 필요한 청크만 골라 넣기 | RAG, 파일 참조, @import |
| **Compress** | 히스토리, 결과를 요약해 토큰 절감 | /compact, 서브에이전트 요약본 |
| **Isolate** | 컨텍스트를 분리, 격리 | 멀티/서브 에이전트 |

## CLAUDE.md 작성 사양

- **길이**: 200줄 이하. 시스템 프롬프트가 이미 수십 개 지시를 차지하므로, CLAUDE.md가 길어지면 정작 중요한 지시가 묻혀 무시될 위험이 커진다.
- **구성 3축**: WHAT(기술 스택, 구조) / WHY(목적, 왜 만드는가) / HOW(작업 방식).
- **줄 단위 자문**: "이 줄이 없으면 Claude가 실수하나?" — No면 뺀다.
- 매 세션 자동 로드되는 **비용 문서**임을 항상 의식한다(아래 로딩 우선순위).

### 메모리 로딩 우선순위

- **자동 주입(항상 로드)**: ① 사용자 전역 CLAUDE.md(~/.claude) → ② 프로젝트 루트 CLAUDE.md → ③ CLAUDE.local.md → ④ Rules 파일 → ⑤ MEMORY.md(첫 200줄).
- **조건부 주입(온디맨드)**: ⑥ Skills → ⑦ 주제별 파일.
- → 항상 로드되는 칸은 비싸다. **가끔 쓰는 지식은 조건부 칸(Skills)으로 내려야** 한다.

### CLAUDE.md에서 빼야 할 것

| 빼는 것 | 대안 |
|---|---|
| 긴 코드 스니펫 | `file:line` 참조 (예: `src/auth/authenticate.ts:12-54`) |
| 코드 스타일 규칙 | Prettier 등 자동화 + PostToolUse Hook |
| 자주 바뀌는 예제 | @import 포인터 (동기화 비용 회피) |

## 토큰 절약 3대 기법

1. **스타일은 Hook으로** — CLAUDE.md에 스타일 규칙을 적고 매번 검증시키는 건 비싸고 비효율적이다. `.claude/settings.json`의 PostToolUse Hook으로 prettier를 자동 실행하면 토큰 0, 실행 100% 보장.
2. **@import / file:line 포인터** — 파일 내용을 복사하지 말고 `See @path/to/file`로 참조. 모델이 필요할 때만 읽는다.
3. **가끔 쓰는 지식은 Skills로** — CLAUDE.md는 매 세션 로드, Skills는 관련 있을 때만 로드. 결제 플로우, DB 마이그레이션처럼 특정 작업에만 필요한 지식은 `.claude/skills/{name}/SKILL.md`로 분리.

## JIT (Just-In-Time) 원칙

코드 전체를 미리 읽히지 말고 **지도만 줘라**. 디렉토리 구조, 진입점만 알려주고 세부는 필요할 때 파일을 열게 한다. 선(先)적재는 토큰 낭비 + Context Rot를 동시에 부른다.

## Advisory vs Deterministic (규칙을 어디에 둘 것인가)

판단 질문: **"이게 반드시 매번 일어나야 하는가?"**

| 답 | 위치 | 보장 수준 |
|---|---|---|
| YES (반드시) | Hook / settings.json — 코드로 강제 | **100% 실행** |
| 상황 판단 필요 | CLAUDE.md — 자연어 지시 | 약 **80% 준수** |

→ 결정적 규칙을 자연어로 적으면 **20% 누락 + 매 세션 토큰**. 결정적인 건 코드로 내린다.

## 서브에이전트 격리

무거운 탐색, 분석은 전문 서브에이전트가 **격리된 컨텍스트**에서 수행하고, 메인에는 **1,000~2,000 토큰 요약본**만 돌려준다. 메인 컨텍스트를 깨끗하게 유지하는 게 핵심. 트레이드오프: 추가 토큰 비용이 발생한다.

## 대화 장기화 처리

- `/compact`는 **보존할 항목을 명시적으로 지정**해서 사용.
- 더 나은 선택은 **새 세션 시작** — git 커밋 + PROGRESS.md / decisions.md로 핵심만 넘기면 누적된 비효율 컨텍스트를 한 번에 털 수 있다. (Compress보다 Fresh Start가 노이즈 제거 측면에서 종종 낫다.)
- `/context`로 주기적 토큰 점검.

## 부정형 규칙 (Karpathy 스타일, 65줄)

코딩 작업은 모델의 디폴트 행동이 강해서, "해야 할 것"보다 **"하지 말 것"을 명시**하는 게 더 효율적이다. 차단할 대표 실패 패턴:

- **Don't hide confusion** — 모르면서 자신 있게 답하지 말 것.
- **No abstractions for single-use code** — 한 번 쓸 코드에 인터페이스 과설계 금지.
- **Don't improve adjacent code** — 요청 안 한 범위를 건드리지 말 것.
- **Define success criteria, loop until verified** — 검증 없는 "완료" 선언 금지.

기법:

- **검증 가능한 목표로 치환**: "Add validation" → "잘못된 입력에 대한 테스트를 쓰고 통과시켜라".
- **자기 점검 질문 심기**: "시니어 엔지니어가 이걸 과설계라고 할까?"
- **자체 평가 지표 명시**: "이 가이드가 작동하는 신호 = 불필요한 변경이 줄고, 구현 전에 명확한 질문이 나올 때."

## 트레이드오프

- **길이 vs 명확성**: 200줄 초과 시 중요 지시가 묻힌다.
- **포함 vs 성능**: 관련 낮은 컨텍스트 = 토큰 낭비 + Context Rot.
- **자동생성 vs 큐레이션**: 자동 생성 컨텍스트는 오히려 해로울 수 있다 — 인간 큐레이션이 이긴다.
- **격리 vs 비용**: 서브에이전트는 메인을 깨끗이 하지만 추가 토큰을 쓴다.
- **Compress vs Fresh Start**: `/compact`보다 새 세션이 노이즈 제거에 종종 유리.

## 실전 체크리스트

- `/context`로 주기적 토큰 점검
- CLAUDE.md 줄마다 "없으면 실수하나?" 자문 → No면 삭제
- 스타일 = Hook, 가끔 쓰는 도메인 지식 = Skills, 코드 = @import/`file:line`
- 결정적 규칙은 자연어(CLAUDE.md) 말고 코드(Hook)로
- 무거운 탐색은 서브에이전트 격리 + 요약본만 수령

## 면접 포인트

Q. 컨텍스트를 많이 줄수록 AI가 잘하지 않나?
- 아니다. **Context Rot** — 입력이 길수록 성능 저하(lost-in-the-middle, 어텐션 분산). 자동 생성 컨텍스트는 무(無)컨텍스트보다 나쁠 수 있고, **인간 큐레이션**이 최고 성공률.

Q. CLAUDE.md를 어떻게 관리하나?
- 200줄 이하 WHAT/WHY/HOW. 줄마다 "없으면 실수하나" 자문. **스타일=Hook, 가끔 쓰는 지식=Skills, 코드=file:line 참조**로 내려 매 세션 로드 비용을 줄인다.

Q. 규칙을 CLAUDE.md에 둘지 Hook에 둘지?
- "반드시 매번?"이면 **Hook(100% 보장)**, "상황 판단"이면 **CLAUDE.md(~80%)**. 결정적인 걸 자연어로 적으면 누락 + 토큰 낭비.

## 출처

- [효율적인 CLAUDE.md 관리 및 컨텍스트 최적화 전략 — Hancom Tech](https://tech.hancom.com/claude-md-context-optimization/)

## 관련 문서

- [[Harness-Engineering|하네스 엔지니어링 (Constrain, Inform, Verify, Correct, HITL — 컨텍스트는 Inform 축)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (지시의 저주, 3단계 경계)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Lazy Load, 분업)]]
- [[Software-3-0|Software 3.0]]
