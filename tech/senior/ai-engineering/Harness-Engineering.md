---
tags: [senior, ai, harness, productivity]
status: done
category: "시니어역량(SeniorEngineer)"
aliases: ["Harness Engineering", "하네스 엔지니어링"]
---

# 하네스 엔지니어링 (Harness Engineering)

## 정의

OpenAI가 2026년 초 정의한 개념. **"AI 에이전트가 코드를 올바르게 작성할 수 있는 환경을 설계하는 것."**

핵심은 에이전트 자체가 아니라 에이전트를 감싸는 인프라 — **제약(constraints), 맥락(context), 피드백 루프(feedback loops), 관찰 가능성(observability)** — 를 구축하는 것이다.

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

## 참고 자료
- Harness engineering: leveraging Codex in an agent-first world (OpenAI, 2026)
- Harness Engineering (Martin Fowler, 2026)
- Software 3.0 시대, Harness를 통한 조직 생산성 저점 높이기 (Toss Tech, 2026)

## 관련 문서
- [[RFC-Writing|RFC / PRD 작성 (SDD)]]
- [[Tech-Decision|기술 의사결정]]
- [[Operational-Efficiency|운영 및 생산성 효율화]]
