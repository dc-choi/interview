---
tags: [senior, ai, spec, agent]
status: done
category: "시니어역량(SeniorEngineer)"
aliases: ["Agent Spec Writing", "에이전트 스펙 작성법"]
---

# AI 에이전트 스펙 작성법

Software 3.0에서 **잘 쓴 스펙 = 잘 설계된 프로그램**. LLM이 구현을 담당하므로 "무엇을 만들지" 정의하는 능력이 생산성을 가른다. CLAUDE.md·`.cursorrules`·프롬프트 템플릿을 짤 때 적용되는 실무 원칙.

## 5대 원칙

### 1. 큰 그림 먼저, 세부는 에이전트가 확장
- 초기엔 **목표와 핵심 요구사항만** 명시
- 세부 구현은 에이전트의 Plan Mode(읽기 전용 계획 단계)로 먼저 확인 후 실행
- 의도: "지시의 저주" 회피 — 요구사항이 많을수록 에이전트 성능이 오히려 저하됨

### 2. 스펙을 전문적인 PRD처럼 구조화

효과적인 스펙의 **6가지 핵심 영역** (GitHub 2,500+ 에이전트 설정 분석 기반):

| 영역 | 내용 |
|---|---|
| Commands | 프로젝트에서 쓰는 실행 명령어 (빌드·테스트·린트) |
| Testing | 테스트 방법·커버리지 기준·테스트 실행 법 |
| Project Structure | 디렉토리 구조, 주요 파일 위치 |
| Code Style | 네이밍·포맷·예시 코드 |
| Git Workflow | 브랜치 전략·커밋 메시지 규칙·PR 템플릿 |
| Boundaries | **절대 금지 영역** (수정하면 안 되는 파일·외부 API 호출 제한 등) |

`CLAUDE.md` · `AGENTS.md` · `.cursorrules` 모두 이 6영역을 변형해 담는 것.

### 3. 태스크를 모듈화된 작은 단위로 분할
- 대규모 작업을 한 번에 주지 말고 **필요한 컨텍스트만** 제공
- 근거: LLM은 컨텍스트가 길어질수록 **앞부분 지시를 놓칠 확률** 증가 ("Lost in the middle")
- 방법: 상위 태스크 → 하위 단계로 쪼개서 각 단계별 스펙 생성

### 4. 자가 검사와 제약조건 내장

**"Always do / Ask first / Never"** 3단계 경계 시스템:

| 단계 | 의미 | 예시 |
|---|---|---|
| **Always do** | 매번 자동 수행 | 테스트 작성, 린터 통과, 커밋 메시지 포맷 |
| **Ask first** | 실행 전 사용자 확인 | DB 스키마 변경, 프로덕션 설정 파일 수정 |
| **Never** | 절대 금지 | `git push --force`, 환경 변수 파일 편집 |

추가로:
- **적합성 테스트**: 스펙에 "이런 케이스는 이렇게 처리" 예시를 포함
- **LLM-as-a-Judge**: 다른 에이전트가 결과를 평가하도록 이중 체크

### 5. 테스트·반복·진화의 지속적 루프
- 스펙을 **고정 문서가 아니라 진화하는 설계 기준**으로 관리
- 테스트 실패 결과를 피드백으로 삼아 **스펙과 코드를 동시에** 개선
- 에이전트가 같은 실수를 반복하면 그건 **스펙의 빈틈**

## 흔한 실수

### 모호한 지시
- ❌ "이 기능 구현해줘"
- ✅ 입력 형식 + 출력 형식 + 엣지 케이스 + 실패 시 동작을 명시

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
- `src/infrastructure/*`: DB·외부 API 어댑터

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

## 면접·실무 체크포인트

- 에이전트 스펙을 PRD처럼 구조화해야 하는 이유 (일관성·재현성)
- "지시의 저주" 현상과 대응 방법 (태스크 모듈화)
- Always/Ask/Never 3단계 경계 시스템의 역할
- 스펙을 진화시키지 않으면 생기는 문제 (같은 실수 반복)
- LLM-as-a-Judge 패턴이 필요한 상황

## 출처
- [뉴스 Hada — AI 에이전트를 위한 좋은 스펙 작성 방법](https://news.hada.io/topic?id=25949)

## 관련 문서
- [[Software-3-0|Software 3.0]]
- [[Harness-Engineering|하네스 엔지니어링]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
