---
tags: [senior, ai, harness, productivity]
status: done
verified_at: 2026-07-15
category: "시니어역량(SeniorEngineer)"
aliases: ["Harness Engineering", "하네스 엔지니어링"]
---

# 하네스 엔지니어링 (Harness Engineering)

## 정의

OpenAI가 2026년 2월 블로그 [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)에서 제시한 개념(공식 원문 확인 2026-07-15). **AI 에이전트가 코드를 올바르게 작성할 수 있는 환경을 설계하는 것.**

핵심은 에이전트 자체가 아니라 에이전트를 감싸는 인프라 — **제약(constraints), 맥락(context), 피드백 루프(feedback loops), 관찰 가능성(observability)** — 를 구축하는 것이다.

## AI 활용의 진화: 프롬프트 → 컨텍스트 → 하네스 → 루프

AI 활용 역량은 단계로 깊어진다.

| 단계 | 설계 대상 | 한계 |
|---|---|---|
| 프롬프트 엔지니어링 | 좋은 질문과 지시 | 1회성, 개인 스킬 의존 |
| 컨텍스트 엔지니어링 | AI가 읽을 배경지식과 자료 | 여전히 단일 에이전트의 단일 호흡 |
| 하네스 엔지니어링 | 여러 에이전트의 역할, 순서, 검증, 피드백 루프 | 설계 비용과 오케스트레이션 복잡도 |
| 루프 엔지니어링 | 에이전트가 관찰→행동→검증→재시도를 스스로 도는 실행 루프 자체 | 루프 종료, 비용, 무한 반복 통제 |

어원(말의 고삐와 마구)대로, 하네스는 강한 모델을 그냥 풀어놓는 게 아니라 목적과 품질 기준 안에서 움직이도록 묶는 설계다. 유능한 직원 한 명에게 다 시키는 방식에서 작은 조직을 설계하는 방식으로의 이동이며, 핵심은 자동화가 아니라 통제된 자동화다. → [[Context-Engineering]]

루프 엔지니어링은 그다음 단계로, 하네스가 짜둔 구조 안에서 에이전트가 한 번에 끝내는 게 아니라 스스로 돌며 회복하게 만드는 데 초점을 둔다. 한 번에 맞히게 만들기보다 틀려도 루프 안에서 다시 맞히게 설계하며, 이는 [[LLM-Eval-Strategy|Pass@k]] 사고, [[Production-Agent-Architecture|Closure-loop]]와 같은 결이다.

## 5대 원칙

| 원칙 | 설명 | 핵심 질문 |
|---|---|---|
| **Constrain** | 에이전트 행동을 제한 | 뭘 하면 안 되는가? |
| **Inform** | 무엇을 해야 하는지 알려줌 | 뭘 알아야 하는가? |
| **Verify** | 작업 결과를 검증 | 제대로 했는가? |
| **Correct** | 실수를 교정 | 틀렸으면 어떻게 고치는가? |
| **Human-in-the-loop** | 고위험 결정에 인간 개입 | 사람이 확인해야 하는가? |

## 하네스 인프라 구성 요소

| 요소 | 역할 | 예시 |
|---|---|---|
| **프로젝트 맥락 문서** | 프로젝트 전체 구조, ERD, 명령어, 코딩 스타일 제공 | CLAUDE.md |
| **도메인별 규칙** | 영역마다 아키텍처 패턴, 금지 사항, 코딩 규칙 명시 | Rules 파일 (API, Web, DB 등) |
| **워크플로우 자동화** | 반복 작업을 구조화된 단계로 자동화 | Skills (SDD, 테스트, 커밋 등) |
| **전문 에이전트** | 역할 기반 검증 (보안, 디자인, 성능, 비즈니스) | Custom Agents |
| **지속 기억** | 대화 간 피드백, 결정, 맥락 보존 | Memory 시스템 |
| **비즈니스 맥락** | "왜 이걸 만드는지"를 에이전트에 전달 | Business docs |
| **개발 프로세스** | 문서→구현→검증의 구조화된 흐름 | SDD 7단계 |

## 5대 원칙별 실천 방법

### 1. Constrain (제약) — 에이전트가 하면 안 되는 것을 명시

- 도메인별 Rules 파일로 아키텍처 패턴과 금지 사항 분리
- 예: "Repository 패턴 제거 → UseCase에서 Prisma 직접 사용", "무료 표현 사용 금지"
- 문서 크기 제한(190줄)으로 문서 비대화 방지
- 커밋 컨벤션, 브랜치 네이밍, 코딩 스타일 규정

### 2. Inform (맥락) — 에이전트가 알아야 할 것을 구조화

- CLAUDE.md: 프로젝트 개요, ERD, 명령어, 코딩 스타일
- Rules: 디렉토리 구조, 주요 패턴, 주의사항
- Business docs: 가치 제안, 수익 모델, GTM, 사용자 피드백
- SDD의 PRD/기능 설계: "왜 만드는가", "어떻게 동작하는가"

### 3. Verify (검증) — 에이전트 작업을 자동으로 검증

- SDD 5단계에 테스트 포함 (구현 후 자동 lint/typecheck/build/test)
- 서브에이전트(security-reviewer, design-reviewer, performance-analyzer)가 PR 전 자동 리뷰
- CI/CD 파이프라인으로 PR 시 자동 검증 게이트

### 4. Correct (교정) — 같은 실수를 반복하지 않도록

- Memory 시스템의 feedback 타입으로 사용자 피드백 저장
- 에이전트가 다음 대화에서 이전 피드백을 참조
- 이상적: 자동 롤백, diff 리뷰 메커니즘

### 5. Human-in-the-loop — 고위험 결정에 인간이 개입

- 브레인스토밍 → 사용자 결정 없이 로드맵에 반영하지 않음
- SDD 전환 시 체크리스트로 인간 확인
- PR 리뷰 → 머지 결정은 사용자

## 멀티 에이전트 오케스트레이션

하네스의 실행 모델은 단일 에이전트가 혼자 생각하고 쓰고 검토하는 1인 체제가 아니라, 역할을 나눈 에이전트 팀이다. 주문부터 손질, 조리, 설거지를 혼자 하는 1인 주방은 일이 조금만 늘어도 병목이 된다. 셰프, 재료, 플레이팅, 검수로 나눈 분업 주방이 더 복잡한 일을 더 안정적으로 처리한다.

- **역할 분리**: 조사, 작성, 검증, 편집처럼 작업을 잘게 나눠 각 에이전트에 명확한 책임을 준다
- **병렬 처리**: 독립적인 하위 작업을 동시에 진행해 처리량을 높이고, 결과를 다시 검토하며 개선한다
- **검증의 우선성**: 가장 위험한 것은 그럴듯하지만 틀린 결과다. QA, 오류 검증, 일관성 점검 에이전트가 생성물을 재확인한다. 정확성이 중요한 작업일수록 생성보다 검증 설계가 더 중요하다. 좋은 하네스는 많이 만드는 시스템이 아니라 틀린 결과를 걸러내는 구조까지 포함한 시스템이다

이는 5대 원칙의 Verify와 Correct를 별도 에이전트로 분리해 구현한 형태다. 한 에이전트가 생성하고 다른 에이전트가 평가하는 LLM-as-Judge 패턴이 여기 속한다 → [[Agent-Spec-Writing]].

### 템플릿화 (반복 업무의 하네스)

자주 하는 업무(사업계획서, 콘텐츠 기획, 소프트웨어 개발, 데이터 분석)는 에이전트 역할과 절차를 미리 정의한 템플릿으로 묶는다. 가치는 속도다. 매번 처음부터 오케스트레이션을 설계하지 않고 새 목표만 갈아끼워 실행한다. 작게 시작해도 된다. 한 작업에 작성자 에이전트와 검토자 에이전트 둘만 붙여도 하네스적 사고의 시작이다.

## 현장 적용: school-manage

CLAUDE.md(86줄) + 13개 Rules(1,577줄) + 7개 Skills + 5개 Custom Agents + Memory + SDD 7단계 + Business docs 7개

**자체 평가: 72%**

| 원칙 | 점수 | 강점/약점 |
|---|---|---|
| Constrain | 90% | 13개 Rules 도메인별 분리 |
| Inform | 90% | CLAUDE.md + Rules + Business docs |
| Verify | 55% | SDD 테스트 포함, 자동 게이트 부족 |
| Correct | 45% | Memory feedback 있음, 자동 롤백 없음 |
| Human-in-loop | 75% | 브레인스토밍 가드레일, PR 리뷰 |

**특히 잘하는 것:**
- 도메인별 Rules 분리 (대부분의 프로젝트가 CLAUDE.md 하나에 다 넣는 것과 대비)
- Custom Agents 역할 기반 검증 (biz-critic, security-reviewer 등)
- 비즈니스 맥락 통합 ("왜 이걸 만드는지"까지 에이전트에 전달)

**다음 성장 포인트:**
- 자동 검증 파이프라인 (PR 시 자동 lint→typecheck→test→빌드)
- 에이전트 출력 자동 리뷰 메커니즘
- 에이전트 작업 Observability (성공/실패율, 컨텍스트 사용량)
- 실패 시 자동 롤백 + 알림

## 면접 포인트

Q. AI 시대에 엔지니어링 생산성을 어떻게 높이는가?
- 하네스 엔지니어링: 에이전트를 감싸는 제약/맥락/검증/교정/인간 개입 인프라 설계
- CLAUDE.md + 13개 도메인별 Rules + 5개 전문 에이전트 + SDD 7단계 워크플로우로 실제 구축
- 자체 평가 72%: Constrain/Inform은 90%로 강하고, Verify/Correct가 다음 성장 포인트

Q. 단순히 AI를 사용하는 것과 하네스를 설계하는 것의 차이는?
- AI 사용: 프롬프트를 잘 쓰는 것 (개인 스킬)
- 하네스 설계: 누가 쓰든 일정 수준 이상의 결과가 나오는 환경을 만드는 것 (조직 역량)
- 하네스는 개인의 생산성 저점을 높이는 것이 목표 (토스 테크 블로그 참고)
- 진화 사다리로: 프롬프트 → 컨텍스트 → 하네스. 단일 호흡에서 에이전트 팀 오케스트레이션으로

Q. 멀티 에이전트로 나누면 뭐가 좋고, 검증은 왜 별도 에이전트로 두나?
- 역할 분리(조사, 작성, 검증, 편집)와 병렬 처리로 처리량과 품질 관리가 올라감
- 가장 위험한 건 그럴듯하게 틀린 결과 → 생성보다 검증 설계가 중요. QA와 일관성 에이전트로 Verify와 Correct를 분리
- 좋은 하네스는 많이 만드는 게 아니라 틀린 결과를 걸러내는 구조까지 포함한 시스템

## 참고 자료
- [Harness engineering: leveraging Codex in an agent-first world — OpenAI (2026년 2월)](https://openai.com/index/harness-engineering/)
- Harness Engineering (Martin Fowler, 2026)
- Software 3.0 시대, Harness를 통한 조직 생산성 저점 높이기 (Toss Tech, 2026)
- [Claude Code Harness와 멀티 에이전트 오케스트레이션 강연 — YouTube](https://www.youtube.com/live/iqoPgoYBVaM)

## 관련 문서
- [[Context-Engineering|컨텍스트 엔지니어링 (Inform 축의 토큰 경제학 — Context Rot, CLAUDE.md 200줄, Hook vs Advisory)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (분업, Lazy Load, Defense in Depth)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법]]
- [[RFC-Writing|RFC / PRD 작성 (SDD)]]
- [[Tech-Decision|기술 의사결정]]
- [[Operational-Efficiency|운영 및 생산성 효율화]]
