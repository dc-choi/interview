---
tags: [ai, spec, agent]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Spec Writing", "에이전트 스펙 작성법"]
verified_at: 2026-09-03
---

# AI 에이전트 스펙 작성법

Software 3.0에서 **잘 쓴 스펙 = 잘 설계된 프로그램**. LLM이 구현을 담당하므로 "무엇을 만들지" 정의하는 능력이 생산성을 가른다. CLAUDE.md, `.cursorrules`, 프롬프트 템플릿을 짤 때 적용되는 실무 원칙.

## 5대 원칙

### 1. 큰 그림 먼저, 세부는 에이전트가 확장
- 초기엔 **목표와 핵심 요구사항만** 명시
- 세부 구현은 에이전트의 Plan Mode(읽기 전용 계획 단계)로 먼저 확인 후 실행
- 의도: "지시의 저주" 회피 — 요구사항이 많을수록 에이전트 성능이 오히려 저하됨

### 2. 스펙을 전문적인 PRD처럼 구조화

효과적인 스펙의 **6가지 핵심 영역** (GitHub 2,500+ 에이전트 설정 분석 기반):

| 영역 | 내용 |
|---|---|
| Commands | 프로젝트에서 쓰는 실행 명령어 (빌드, 테스트, 린트) |
| Testing | 테스트 방법, 커버리지 기준, 테스트 실행 법 |
| Project Structure | 디렉토리 구조, 주요 파일 위치 |
| Code Style | 네이밍, 포맷, 예시 코드 |
| Git Workflow | 브랜치 전략, 커밋 메시지 규칙, PR 템플릿 |
| Boundaries | **절대 금지 영역** (수정하면 안 되는 파일, 외부 API 호출 제한 등) |

`CLAUDE.md`, `AGENTS.md`, `.cursorrules` 모두 이 6영역을 변형해 담는 것.

### 3. 태스크를 모듈화된 작은 단위로 분할
- 대규모 작업을 한 번에 주지 말고 **필요한 컨텍스트만** 제공
- 근거: 긴 컨텍스트에서는 앞이나 끝보다 **중간에 놓인 정보**를 놓치기 쉽다 ("Lost in the middle")
- 방법: 상위 태스크 → 하위 단계로 쪼개서 각 단계별 스펙 생성

### 4. 자가 검사와 제약조건 내장

**Always do / Ask first / Never** 3단계 경계 시스템:

| 단계 | 의미 | 예시 |
|---|---|---|
| **Always do** | 매번 자동 수행 | 테스트 작성, 린터 통과, 커밋 메시지 포맷 |
| **Ask first** | 실행 전 사용자 확인 | DB 스키마 변경, 프로덕션 설정 파일 수정 |
| **Never** | 절대 금지 | `git push --force`, 환경 변수 파일 편집 |

추가로:
- **적합성 테스트**: 스펙에 "이런 케이스는 이렇게 처리" 예시를 포함
- **LLM-as-a-Judge**: 다른 에이전트가 결과를 평가하도록 이중 체크

### 5. 테스트, 반복, 진화의 지속적 루프
- 스펙을 **고정 문서가 아니라 진화하는 설계 기준**으로 관리
- 테스트 실패 결과를 피드백으로 삼아 **스펙과 코드를 동시에** 개선
- 에이전트가 같은 실수를 반복하면 그건 **스펙의 빈틈**

## 숨은 결정 드러내기 — 결정 축 인터뷰

AI가 코드의 상당 부분을 작성하면 개발자의 통제 지점은 코드 작성에서 **의도 전달과 검증**으로 옮겨간다. 이때 인지 부하의 구조적 원인은 자연어 요구사항 뒤에 숨은 기술 결정이 드러나지 않은 채 AI의 해석에 맡겨지는 것이다 — 주문이 완료되면 알림을 보낸다는 한 문장 뒤에도 여러 결정이 숨어 있다.

| 결정 축 | 스펙에서 확정해야 하는 질문 |
|---|---|
| Atomicity | 두 동작이 같은 트랜잭션으로 묶여야 하는가 |
| Idempotency | 같은 이벤트가 다시 처리되어도 결과는 한 번만 나가야 하는가 |
| Failure-mode | 부가 동작의 실패가 본 동작의 상태에 영향을 주어야 하는가 |
| Observability | 요청과 실패는 어떤 로그, 이벤트로 추적되어야 하는가 |
| Side-effects | 외부 시스템 호출은 언제, 동기인가 비동기인가 |
| Compatibility | 기존 API나 이벤트 계약이 바뀌지 않는가 |

결정 축은 작업 성격에 따라 달라지므로, AI가 먼저 요구사항과 코드베이스를 읽고 **이번 작업에서 갈리는 축만** 골라내게 한다. 그리고 축마다 인터뷰로 확정한다.

- **한 번에 하나의 질문**, 결정이 갈리는 순서대로
- **추상적으로 묻지 않고 코드 옵션과 함께** — 예: 트랜잭션 안 동기 발송(A) vs commit 후 outbox 발행(B)을 코드로 보여주고, 코드베이스에 이미 outbox worker가 있다는 근거와 함께 추천안을 제시
- 판단을 사용자에게 떠넘기는 것이 아니라 AI가 선택지를 좁히고 추천하면, 사용자는 중요한 결정만 확정한다

효과는 리뷰 시점에 분명해진다 — 리뷰가 코드 전체를 처음부터 해석하며 숨은 결정을 역추적하는 일에서, **합의된 결정이 코드에 반영됐는지 확인하는 일**로 바뀐다. 자연어는 출발점일 뿐이고, 요구사항의 분량이 아니라 숨은 결정이 논의 가능한 형태로 드러나는 구조가 중요하다.

## 스펙 산출물과 승인 지점을 분리한다

스펙 파일이 생겼다는 사실만으로 사람이 내용을 검토했다고 판단하지 않는다. 요구사항, 설계와 작업 목록을 나누는 구조와 각 단계에서 승인을 기다리는 실행 흐름은 별개다.

Kiro의 공식 문서를 2026-10-07에 대조한 사례는 다음과 같다. 이 절만 부분 검증했으며 기존 원칙 전체의 검증일을 갱신하지 않았다.

| 산출물 | 확인할 내용 |
| --- | --- |
| `requirements.md` | 사용자 요구와 수용 기준. 조건이나 사건이 발생했을 때 시스템이 해야 할 행동을 명시 |
| `design.md` | 요구를 구현할 구조, 구성요소 간 상호작용과 제약 |
| `tasks.md` | 구현할 작업 단위와 진행 상태 |

- **Feature Specs:** 원하는 행동에서 출발하면 Requirements-First, 기술 설계나 제약에서 출발하면 Design-First를 선택한다. 두 흐름 모두 요구사항, 설계와 작업 목록으로 이어진다.
- **Quick Spec:** 범위와 제약을 먼저 질문한 뒤 세 파일을 단계 사이 승인 없이 생성한다. 생성 후 파일을 검토하고 수정할 수 있으며, 요구사항을 바꾸면 Sync Files로 작업 목록을 다시 생성할 수 있다.
- **선택 기준:** 요구와 설계를 반복해서 검토해야 하거나 낯선 영역이면 단계별 검토가 있는 Feature Specs가 적합하다. 이미 이해한 기능의 빠른 시제품에는 Quick Spec을 고려한다.

적용 제안: 주문 알림 작업이라면 생성 전에 알림 실패가 주문을 취소하는지, 재시도해도 한 번만 발송하는지를 정한다. 생성 뒤에는 그 결정이 수용 기준, 설계와 구현 작업에 일관되게 남았는지 확인한다. 문서 생성 완료와 테스트 통과, 실제 운영 결과는 각각 따로 확인한다.

## 스펙을 팀의 변경 기록으로 유지한다

스펙에는 원하는 기능뿐 아니라 합의한 제약과 설계 판단을 남기고, 설명하는 코드와 같은 저장소에서 버전 관리한다. 개인 대화에만 남은 결정을 다음 작업자도 검토하고 재사용할 수 있게 하는 방식이다.

Kiro의 공식 Best practices를 2026-10-10에 대조한 변경 절차는 다음과 같다. 이 절의 부분 검증이며 기존 원칙 전체의 검증일은 유지한다.

- Requirements-First는 요구사항을 수정한 뒤 설계 갱신을 요청하고, `tasks.md`의 Sync Files로 새 요구에 대응하는 작업을 생성한다.
- Design-First는 설계를 바꾼 뒤 요구사항의 타당성 검토와 재생성을 요청하고 작업 목록을 동기화한다.
- 버그 수정에서는 바뀌어야 하는 동작과 계속 유지해야 하는 동작을 함께 기록한다.

적용 제안: 재시도 정책을 바꾸면 수용 기준, 설계와 작업 목록을 함께 대조한다. 스펙 동기화는 구현이나 회귀 검증의 완료를 뜻하지 않으므로 실제 코드와 테스트 결과를 별도로 확인한다.

## 흔한 실수

### 모호한 지시
- ❌ "이 기능 구현해줘"
- ✅ 입력 형식 + 출력 형식 + 엣지 케이스 + 실패 시 동작을 명시
- 한국어 문장은 주어와 목적어를 자주 생략한다. 사람은 맥락으로 채우지만 에이전트는 대상을 추측해 엉뚱한 파일이나 범위에 손댈 수 있으므로 누가 무엇을 어디에 하는지 쓴다. 맥락을 모르는 동료가 읽어도 헷갈리지 않을지가 Anthropic 프롬프트 가이드의 판정 기준이다
- 순서가 중요한 작업은 나열하지 말고 번호 붙은 단계로 쓴다. 읽기, 분석, 산출물 생성처럼 앞 단계 결과가 다음 단계 입력이 되는 인과 순서를 드러내고, 산출물 형식과 저장 위치까지 적는다

### 무차별 대량 컨텍스트
- 관련 파일을 몽땅 주는 건 역효과
- **계층적 요약**: 상위 개요 + 필요 시 sub-agent가 세부 파일 로드

### 인간 검토 생략
- 에이전트 출력 속도에 속아 검토를 건너뛰면 **핵심 코드 경로에 버그 심음**
- 속도와 검증 능력의 균형 — 의식적으로 "읽고 넘어갈 라인"을 정해둘 것

### 스펙을 문서로만 취급
- 스펙은 살아 있어야 함. 매 스프린트 단위로 뭐가 안 먹혔는지 돌아보고 갱신

## 프로젝트별 스펙 예시 골격

```markdown
# 프로젝트 컨텍스트 (CLAUDE.md)

## Commands
- `npm test`: Jest 기반 유닛 테스트
- `npm run lint`: ESLint + Prettier

## Project Structure
- `src/modules/*`: 각 기능 모듈. 하나의 모듈 = 하나의 bounded context
- `src/infrastructure/*`: DB, 외부 API 어댑터

## Code Style
- 변수는 camelCase, 클래스는 PascalCase, 상수는 UPPER_SNAKE
- import 순서: 외부 → 내부 → 상대경로

## Git Workflow
- main 직접 커밋 금지. feature/* 브랜치 + PR
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `docs:`)

## Boundaries
- NEVER: .env, prisma/migrations 수정 금지
- ASK FIRST: 의존성 추가, DB 스키마 변경
- ALWAYS: 테스트 작성, 타입 체크 통과
```

## 면접, 실무 체크포인트

- 에이전트 스펙을 PRD처럼 구조화해야 하는 이유 (일관성, 재현성)
- "지시의 저주" 현상과 대응 방법 (태스크 모듈화)
- Always/Ask/Never 3단계 경계 시스템의 역할
- 스펙을 진화시키지 않으면 생기는 문제 (같은 실수 반복)
- LLM-as-a-Judge 패턴이 필요한 상황

## 출처
- [Kiro Docs, Best practices](https://kiro.dev/docs/specs/best-practices/)
- [Kiro Docs, Quick Spec](https://kiro.dev/docs/specs/quick-spec/)
- [Kiro Docs, Feature Specs](https://kiro.dev/docs/specs/feature-specs/)
- [Lost in the Middle: How Language Models Use Long Contexts — Liu et al.](https://arxiv.org/abs/2307.03172)
- [뉴스 Hada — AI 에이전트를 위한 좋은 스펙 작성 방법](https://news.hada.io/topic?id=25949)
- [AI와 개발하기: 숨은 결정을 드러내기 — NHN Cloud Meetup](https://meetup.nhncloud.com/posts/419)
- [Anthropic Platform Docs, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [인프런, 널널한 개발자, 대화를 넘어! 행동하는 Cowork](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498593)
- [인프런, 널널한 개발자, 하네스, 루프 엔지니어링](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498601)

## 관련 문서
- [[Software-3-0|Software 3.0]]
- [[Harness-Engineering|하네스 엔지니어링]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
- [[Simplified-Technical-English|Simplified Technical English (출력 문체 제약, 한 문장 한 지시)]]
