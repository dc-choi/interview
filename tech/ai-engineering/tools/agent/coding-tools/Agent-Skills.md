---
tags: [ai, skills, claude-code, codex, hook]
status: done
verified_at: 2026-09-30
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Skills", "에이전트 스킬", "스킬", "Claude vs Codex Skills"]
---

# 에이전트 스킬 (Agent Skills)

스킬은 AI 에이전트에게 특정 작업을 수행하는 방법을 정의해 재사용하는 실행 단위다. 매번 프롬프트로 같은 작업을 설명하는 대신, 폴더 하나(SKILL.md)로 캡슐화해 이름으로 호출한다. Claude Code와 Codex가 사실상 같은 포맷(SKILL.md 폴더 + description 자동 로드)으로 수렴해 있어, 한쪽을 익히면 다른 쪽이 거의 그대로 통한다.

## 스킬이란 — 온디맨드 플레이북

- **정의**: description으로 트리거되고 본문 지침대로 작업을 수행하는 재사용 가능한 작업 단위. 필요할 때만 로드된다는 점에서 온디맨드 플레이북이다.
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

### 본문을 쓰는 네 가지 원칙

1. description에는 무엇을 하는지가 아니라 **언제 발동해야 하는지**를 쓴다. 트리거 판단의 입력이기 때문이다.
2. 당연한 것은 쓰지 않는다. 모델이 이미 하는 일을 반복하면 본문만 길어지고 트리거 신호는 묽어진다.
3. 절차를 강요하는 대신 **목표와 제약**을 기술한다. 제약을 인코딩한 사례는 아래 diagram-design을 본다.
4. **실패 이력(Gotchas)이 가장 값어치 있는 내용**이다. 이 스킬이 과거에 어떻게 틀렸는지가 다음 실행을 바꾼다.

4번은 같은 실수를 시스템으로 흡수하는 루프의 스킬 판 적용이다 → [[Harness-Adoption-Ladder]].

## 동작 — 점진적 공개(Progressive Disclosure)

컨텍스트 비용을 낮추려고 3단으로 나눠 로드한다.

- **기본 로드**: 스킬별 이름 + description 카탈로그. 목록에 문자 예산이 있어 스킬이 많으면 설명부터 줄어든다
- **매칭 시 로드**: 트리거된 스킬의 본문 지침
- **필요 시 로드**: references, scripts 같은 서포팅 파일

Anthropic 문서의 규모 감각은 1단 메타데이터가 스킬당 약 100토큰, 2단 본문이 5k 토큰 미만, 3단은 읽기 전까지 0토큰이다. 스크립트는 코드가 아니라 실행 출력만 컨텍스트에 들어간다(2026-09-30 확인). 그래서 스킬을 많이 설치했을 때의 상시 비용은 본문이 아니라 카탈로그에서 생긴다. Claude Code는 카탈로그 전체를 모델 컨텍스트 윈도의 1% 예산에 맞추고, 넘치면 스킬 본문을 줄이는 것이 아니라 호출이 드문 스킬의 설명부터 뺀다.

트리거 방식은 두 가지다.

- **암묵(implicit)**: 모델이 task와 description을 매칭해 자동 선택
- **명시(explicit)**: 사용자가 직접 호출 (Claude는 `/스킬이름`, Codex는 `/skills` 또는 `$멘션`)

## Claude Code vs Codex — 같은 포맷, 다른 관례

둘 다 **파일 기반 SKILL.md 폴더**다. "Claude는 파일 기반, Codex는 API/플랫폼 기반"이라는 통념은 부정확하다. 실제 차이는 디렉토리 관례와 세부 메타 필드뿐이다.

| 항목 | Claude Code Skills | Codex Skills |
|---|---|---|
| 정의 | SKILL.md 폴더 | SKILL.md 폴더 (동일) |
| 위치 | `.claude/skills/`(프로젝트), `~/.claude/skills/`(유저), 플러그인 동봉 `skills/` | `.agents/skills/`(repo), `$HOME/.agents/skills`, `/etc/codex/skills` |
| 자동 트리거 | description 매칭 | description 매칭 (동일) |
| 명시 호출 | `/스킬이름` (슬래시 명령) | `/skills`, `$멘션` |
| 추가 메타 | argument-hint, allowed-tools(사전승인), disable-model-invocation, user-invocable, context:fork, paths | agents/openai.yaml (UI, 호출 정책, 도구 의존성) |
| 스크립트 | 본문 백틱 셸, 서포팅 스크립트 | scripts/ 디렉토리 |

Claude 쪽에서는 커스텀 슬래시 커맨드도 스킬로 흡수됐다. 사람이 부르는 매크로와 모델이 꺼내 읽는 절차서의 구분은 별도 파일 종류가 아니라 `disable-model-invocation`과 `user-invocable` 플래그로 표현된다 → [[Claude-Code-Extension-Reference]].

두 도구는 Agent Skills라는 사실상 동일한 개방 포맷으로 수렴했다. 폴더 + SKILL.md + description 자동 로드가 공통 뼈대이고, 나머지는 관례 차이다. Claude 쪽 세부 메커니즘(목록 표시용 설명의 when_to_use 합산 1,536자 절삭, allowed-tools가 제한이 아닌 사전 승인, 예산 초과 시 저빈도 스킬부터 설명 제외 등)은 [[Claude-Code-Extension-Reference]]에 있다.

## 슬래시 표기와 실제 명령 등록을 구분한다

부분 검증(2026-10-20): Claude Code의 공식 스킬 안내, 명령 도움말과 Claude 프롬프트 지침을 대조했다. `/이름`이라는 표기만으로 내장 기능임을 판정하지 않는다.

- 내장 명령과 번들 스킬은 제품이 제공한다. 사용자 정의 스킬은 `SKILL.md`의 지침을 불러오며, 기존 `.claude/commands/` 파일도 명령을 만들 수 있다.
- 현재 환경에서 사용할 수 있는 명령은 빈 프롬프트의 `/` 목록과 `/help`로 확인한다. 같은 이름이라도 설치한 스킬이나 플러그인이 다르면 실행할 지침이 달라질 수 있다.
- 일반 대화에서 `/brutal`, `/ELI5`, `/10x` 같은 문자열을 보았다는 사실은 Claude Code에 해당 명령이 등록됐다는 증거가 아니다. 등록 여부를 확인하지 않은 문자열은 원하는 답변을 설명하는 표현과 구분해 다룬다.

공식 프롬프트 지침은 원하는 출력 형식, 제약과 필요한 맥락을 명확히 쓰도록 권한다. 다음은 이를 적용한 지시 예시이며, 특정 문자열의 성능 보장이 아니다.

- 비판 검토: 제안의 취약한 가정, 반례와 추가로 필요한 근거를 구분한다.
- 쉬운 설명: 대상 독자의 배경지식을 정하고 예시 하나와 비유의 한계를 포함한다.
- 개선 요청: 정확성, 누락, 길이처럼 비교할 기준과 유지할 조건을 명시한다.

별칭 한 줄이나 단호한 말투가 정확성을 높였다고 판단하려면 같은 입력과 평가 기준으로 결과를 비교해야 한다. 공식 명령 등록과 작업 품질 평가는 별개다. 이 절만 대조했으므로 문서 전체의 기존 검증일은 유지한다.

## 스킬 vs 훅 — 무엇을 할지 vs 언제 실행될지

| 구분 | 훅(Hook) | 스킬(Skill) |
|---|---|---|
| 실행 | 설정한 이벤트와 조건이 맞으면 실행, action은 명령 또는 에이전트 프롬프트 | 필요 시 (모델이나 사용자가 선택) |
| 목적 | 흐름 제어, 자동 검사와 후속 작업 | 작업 수행 (재사용 플레이북) |
| 성격 | 차단 여부는 호스트, 이벤트와 action의 계약에 따름 | 모델이 해석하는 작업 지침 |
| 예 | 커밋 전 린트 차단, 위험 명령 거부 | 코드 포맷, 테스트 실행, 릴리스 노트 작성 |

훅은 실행 시점을, 스킬은 작업 방법을 정의한다. 자동으로 프롬프트를 전달하는 훅과 도구 호출을 차단하는 훅을 구분한다. 이벤트 발생이 결정돼 있어도 에이전트가 생성하는 결과까지 결정론적인 것은 아니다. Claude Code의 종료 코드와 컨텍스트 주입 계약은 [[Claude-Code-Extension-Reference]]를 참고하며 다른 호스트에 그대로 적용하지 않는다.

## Kiro 훅, 스킬과 Powers

Kiro Hooks의 현재 형식과 차단 경계, Kiro Skills의 범위와 이식 점검, 도구와 지침을 함께 활성화하는 Kiro Powers와 API 명세 연동 점검 순서는 [[Agent-Skills-Kiro|Kiro 훅, 스킬과 Powers]]로 분리했다.

## 언제 프롬프트를 스킬로 승격하나

- 같은 프롬프트를 반복 입력할 때 → 스킬로 캡슐화
- 배포, 전송처럼 부작용이 있는 작업은 자동 호출을 끄고 수동 전용으로 (Claude disable-model-invocation, Codex 호출 정책)
- 본문이 길어지면(대략 500줄 초과) 상세를 references로 분리해 온디맨드 로드 — 호출된 스킬 본문은 세션 내내 컨텍스트에 남기 때문

### 사례 — 절차가 아니라 제약을 인코딩하는 스킬

스킬에는 작업 절차만이 아니라 산출물의 품질 제약을 넣을 수 있다. 한 다이어그램 생성 스킬(diagram-design)은 accent 색 1개, 글꼴 3종, 1px hairline, 모든 좌표와 간격이 4의 배수라는 비협상 규칙과 그림자, 임의 팔레트, 자동 레이아웃 금지를 SKILL.md에 박아 생성물의 분산을 줄이고, 라벨과 노드의 겹침과 렌더 결과의 잘림을 검사하는 검증 스크립트를 함께 배포해 에이전트가 자기 산출물을 CI 게이트로 검사하게 한다. 언제 쓰지 말아야 하는지(목록, before와 after 비교, 도형 하나짜리 다이어그램)를 스킬 안에 명시해 무분별한 발동을 줄이고, 색을 값이 아니라 역할 토큰(paper, ink, accent)으로 참조하게 해 브랜드 온보딩 한 번으로 전체가 바뀐다. 일상 작업은 SKILL.md와 타입 레퍼런스 하나만 읽는 점진적 공개 구조다. 효과를 측정한 수치는 공개되지 않았다.

## 스킬 수명주기 — 카탈로그도 비용이다

점진적 공개의 1단인 카탈로그 노출은 공짜가 아니다. 스킬이 많으면 예산에 맞추느라 설명이 단축되어 트리거에 필요한 키워드가 깎일 수 있고, 목록이 예산을 넘치면 호출 빈도가 낮은 스킬부터 설명이 제외된다(기본 예산과 조정 수단은 [[Claude-Code-Extension-Reference]]). 죽은 스킬은 Claude 기준 설명이 먼저 제외될 뿐 이름 줄은 남으므로, 승격만 있고 퇴역이 없으면 목록 비용은 스킬 수를 따라 자란다. 실제 사용 여부는 기억이 아니라 로컬 세션 로그(transcript) 집계로 판단한다. 관찰 기간을 정해 집계하면 스킬이 네 상태로 나뉜다.

| 상태 | 정의 | 조치 |
|---|---|---|
| 활성 | 설치됨, 기간 내 호출됨 | 유지 |
| 죽은 스킬 | 설치됨, 기간 내 무호출 | 제거 후보 — 호출 없이 카탈로그 자리만 차지한다 |
| 미등록 호출 | 설치 목록에 없는 이름인데 오류 없이 호출됨 | 프로젝트 스코프나 외부 등록 스킬 — 인벤토리 누락 점검 |
| 환각 호출 | 미설치 이름 호출에서 오류 발생 | 내장 도구 이름과 스킬 이름의 혼동이 대부분으로 보고된다 — 스킬 쪽 조치는 없고, 오타형과 미분류 건만 호출 지점을 점검한다 |

- 죽은 스킬 판정은 관찰 창에 상대적이다. 분기에 한 번 쓰는 스킬이 30일 창에서 억울하게 죽지 않도록 창 크기를 용도에 맞춘다.
- 감사는 관찰 창 기반 분류와 제거 계획을 산출물로 남긴다. 프로젝트 스코프 스킬은 의도적 산출물로 보고 정리 대상에서 제외하는 보수적 접근이 안전하다.
- 세션 로그를 여는 파서는 프롬프트와 경로가 든 transcript를 읽고, 재개나 fork된 세션이 부모 기록을 replay하면 호출 수가 부풀 수 있다. 신뢰 경계와 집계 규칙은 [[AI-Coding-Agent-Usage-Telemetry]]를 따른다.
- Claude Code는 v2.1.252부터 `/skill-doctor`로 스킬별 컨텍스트 비용과 호출 빈도를 보고하고 한 번도 호출되지 않은 스킬과 오래 안 쓴 플러그인을 표시한다(번들, 엔터프라이즈 스킬 제외). 관찰 창과 상태 분류를 직접 통제해야 할 때만 위의 세션 로그 집계를 따로 돌린다.

## 설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저

- **표면별 저장소**: claude.ai(Desktop 앱의 Chat, Cowork 포함)의 커스텀 스킬은 설정에서 zip으로 올리는 사용자 개인 자산이고, API 스킬은 워크스페이스 공유, Claude Code 스킬은 파일 시스템(`~/.claude/skills/`, `.claude/skills/`)에 있다. 올린 스킬은 표면 사이에 자동으로 동기화되지 않는다. 예외로 Claude Code는 claude.ai 계정으로 로그인한 터미널 세션에서 계정 스킬을 `~/.claude/skills/synced/`로 한 방향만 내려받고(v2.1.273+), Cowork와 클라우드 세션은 로컬 `~/.claude/skills/`를 읽지 않는다. 한 곳에 설치했다고 다른 곳에서 쓸 수 있다고 가정하지 않는다
- **스킬 설치는 소프트웨어 설치와 같다**: 스킬은 지시와 코드로 도구 호출을 이끌 수 있어서, 공식 문서는 직접 만들었거나 Anthropic에서 받은 스킬만 쓰고 그 밖의 스킬은 SKILL.md, 스크립트, 리소스 전체를 감사하라고 권한다. 외부 URL에서 내용을 가져오는 스킬은 의존 대상이 바뀌면 믿었던 스킬도 오염될 수 있다
- **스킬을 찾아 설치하는 스킬**: 필요한 스킬을 에이전트가 검색해 설치하게 하는 메타 스킬은 편하지만 공급망 경로를 에이전트에게 여는 셈이다. 추천까지만 자동으로 받고 설치는 사람이 출처와 파일을 확인한 뒤 승인한다. 전문가의 절차를 빌려 쓸 수 있다는 것이 스킬의 이점이지만 그 품질은 설치 전에 알 수 없으므로, 공식 문서가 권하는 대로 같은 프롬프트를 스킬을 켠 새 세션과 끈 새 세션에서 돌려 결과를 비교한다
- **디렉터리 순위는 적합성 판단이 아니다**: Vercel이 운영하는 skills.sh는 스킬을 설치 수 순으로 보여 준다. 같은 생태계의 find-skills 스킬은 설치 수(1K 이상 선호, 100 미만 주의), 공식 출처와 GitHub 별 수로 후보를 거른 뒤 `npx skills add <owner/repo@skill> -g -y`(전역 설치, 확인 생략)를 제시한다(2026-10-12 확인). 이 기준은 인기와 발행처를 볼 뿐 내 의도와 스택에 맞는지는 보지 않는다. Google의 gke-inference처럼 벤더 공식 스킬은 그 벤더 서비스를 배포 대상으로 전제하므로, 인프라를 정하기 전이라면 벤더 중립 대안과 함께 비교한다. 에이전트가 이미 설치된 스킬에 맞춰 계획을 짜거나 아직 없는 스킬을 찾은 것처럼 제시할 수 있으므로 추천은 디렉터리 링크로 실재와 내용을 확인하고, `-y` 명령은 승인 뒤에만 실행하게 한다. skills.sh 감사 페이지는 Gen Agent Trust Hub, Socket, Snyk의 판정을 함께 보여 주지만 같은 스킬도 도구마다 판정이 다를 수 있다

## 면접 체크포인트

- 스킬을 재사용 가능한 작업 단위(온디맨드 플레이북)로 정의하고 일회성 프롬프트와의 차이를 말할 수 있는가
- SKILL.md 구조(name, description 프론트매터 + 지침 본문)와 description 기반 자동 트리거를 설명할 수 있는가
- 점진적 공개로 컨텍스트를 절약하는 원리(카탈로그 → 본문 → 서포팅 파일)
- Claude와 Codex 스킬이 같은 파일 기반 포맷으로 수렴했다는 점 (파일 vs API 오해 교정)
- 훅 vs 스킬 — 언제(강제) vs 무엇(작업)의 구분과 상보성
- 카탈로그 비용의 실체(목록 문자 예산, 저빈도 설명부터 제외, 스킬이 많을수록 산 스킬 설명까지 단축)와 세션 로그 집계 기반 수명주기 감사를 설명할 수 있는가
- 스킬이 어느 표면에 설치됐고 어느 방향으로 동기화되는지, 외부 스킬을 감사하고 켠 세션과 끈 세션으로 비교하는 이유를 설명할 수 있는가

## 출처

- [Claude Help Center, Claude Code cheatsheet](https://support.claude.com/en/articles/14553413-claude-code-cheatsheet)
- [Claude Platform Docs, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Kiro Docs, Hooks](https://kiro.dev/docs/hooks/)
- [Kiro Docs, Hook actions](https://kiro.dev/docs/hooks/actions/)
- [Claude Code Skills vs Codex Skills: 구조와 차이 완전 정리 — AlienCoder](https://aliencoder.tistory.com/243)
- [skill-graveyard — sfrangulov](https://github.com/sfrangulov/skill-graveyard)
- [diagram-design — cathrynlavery](https://github.com/cathrynlavery/diagram-design)
- [Claude Docs, Agent Skills](https://code.claude.com/docs/ko/skills)
- [OpenAI Codex Docs, Skills](https://developers.openai.com/codex/skills)
- [Level 9 하네스 엔지니어링과 Evaluator 제어 — 클로드 코드 마스터 활용편 발표 자료(한빛미디어), 빌런 (2026-09)](https://run-ai.kr/learn/carve-harness)
- [Claude Code Docs, Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [Claude Platform Docs, Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [인프런, 널널한 개발자, Claude for Desktop 주요기능 소개](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498592)
- [인프런, 널널한 개발자, 스킬과 플러그인](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498598)
- [The Agent Skills Directory — skills.sh](https://skills.sh/) — 설치 수 순위, [Security Audits](https://skills.sh/audits)의 감사 도구별 판정, [gke-inference](https://www.skills.sh/google/skills/gke-inference)의 사용 대상
- [find-skills SKILL.md — vercel-labs/skills](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md) — 후보 검증 기준과 설치 명령
- [YouTube, 양실장의 바이브코딩대학, 1시간 압축) AI 기술 1도 모르는 초심자가 전문 AI SaaS 구축하는 모든 과정](https://www.youtube.com/watch?v=JK1S6FvAdZQ) — 2026-08-24, 03:00~16:00과 42:39~46:00의 find-skills 사용 시연

## 관련 문서

- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (스킬, 훅 세부 메커니즘)]]
- [[Codex-CLI|Codex CLI (슬래시 명령, 스킬 시스템, AGENTS.md)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, MCP, 서브에이전트 활용)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (권장 vs 강제 분리)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (스킬 Catalog-First 로딩)]]
- [[MCP|MCP (외부 경계 확장)]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리 (로컬 세션 로그 집계와 신뢰 경계)]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동 (스킬 본문 길이의 재읽기 비용, 튜토리얼형 스킬의 한계)]]
- [[Hermes-Agent|Hermes Agent (에이전트가 경험에서 스킬을 만들고 고치는 사례, 쓰기 승인 대기열)]]
