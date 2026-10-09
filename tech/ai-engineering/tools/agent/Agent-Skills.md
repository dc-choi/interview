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

## 스킬 vs 훅 — 무엇을 할지 vs 언제 실행될지

| 구분 | 훅(Hook) | 스킬(Skill) |
|---|---|---|
| 실행 | 설정한 이벤트와 조건이 맞으면 실행, action은 명령 또는 에이전트 프롬프트 | 필요 시 (모델이나 사용자가 선택) |
| 목적 | 흐름 제어, 자동 검사와 후속 작업 | 작업 수행 (재사용 플레이북) |
| 성격 | 차단 여부는 호스트, 이벤트와 action의 계약에 따름 | 모델이 해석하는 작업 지침 |
| 예 | 커밋 전 린트 차단, 위험 명령 거부 | 코드 포맷, 테스트 실행, 릴리스 노트 작성 |

훅은 실행 시점을, 스킬은 작업 방법을 정의한다. 자동으로 프롬프트를 전달하는 훅과 도구 호출을 차단하는 훅을 구분한다. 이벤트 발생이 결정돼 있어도 에이전트가 생성하는 결과까지 결정론적인 것은 아니다. Claude Code의 종료 코드와 컨텍스트 주입 계약은 [[Claude-Code-Extension-Reference]]를 참고하며 다른 호스트에 그대로 적용하지 않는다.

### Kiro Hooks의 자동 실행과 차단 경계

2026-10-10 Kiro 공식 문서의 부분 검증이다. IDE 1.0과 CLI 3.0의 현재 형식은 `.kiro/hooks/<id>.json`이며 `version: "v1"`, `hooks` 배열, PascalCase `trigger`, 선택적 정규식 `matcher`와 `action`을 사용한다. 이전 IDE의 설정 예제를 현재 형식으로 복사하지 않는다.
- `command`는 셸 명령을 실행하고 `agent`는 현재 대화에 프롬프트를 전달한다. 저장 후 테스트 생성 요청은 결과를 별도로 확인한다.
- 공식 IDE action 안내에서 명령의 0 이외 종료 코드는 오류를 전달한다. `PreToolUse`에서는 도구 실행을, Prompt Submit에서는 프롬프트 제출을 차단한다. Claude Code의 종료 코드 2 규칙과 구분한다.
- 운영 점검 제안: 테스트 실행과 생성 요청을 나누고, 차단이 필요한 검사는 실제 거부 사례로 확인한다. 사후 검사 실패를 이미 수행된 변경의 자동 취소로 해석하지 않는다.

## Kiro Skills: 이식 가능한 형식과 호스트 동작을 구분한다

이 절은 2026-10-10 Kiro 공식 문서의 부분 검증이다. 기존 Claude와 Codex 설명의 검증일은 유지한다.

- `.kiro/skills/`는 프로젝트 범위, `~/.kiro/skills/`는 전역 범위다. 같은 이름이면 프로젝트 스킬이 우선한다. 전역 폴더 지원은 IDE와 CLI 기준이며 Web과 Mobile까지 확대하지 않는다.
- 이름과 description으로 발견하고, 요청에 맞으면 본문을 읽는다. `/스킬이름`으로 직접 호출할 수도 있다. 카탈로그 비용과 실제 활성화된 본문 비용을 구분한다.
- GitHub에서 가져올 때는 저장소 루트가 아닌 스킬 하위 폴더나 `SKILL.md` URL을 사용한다. 가져오기는 스킬 디렉터리로 복사하는 동작이므로 원본의 후속 변경까지 자동 동기화된다고 가정하지 않는다.
- 공통 형식으로 지침을 옮겨도 스크립트의 실행 도구와 네트워크 요구는 남는다. `compatibility`로 환경 요구를 적고 실제 호스트에서 확인한다.

이식 점검 제안: 지침 로드, 필요한 실행 파일의 존재, 스크립트의 실제 성공을 각각 확인한다. 스킬이 목록에 보이거나 활성화됐다는 사실만으로 작업 완료나 권한 부여를 판단하지 않는다.

## Kiro Powers: 도구와 지침을 함께 활성화한다

이 절은 2026-10-07 Kiro 공식 문서로 확인한 범위다. 기존 Claude와 Codex 설명 전체를 재검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

Powers는 MCP 도구, 스킬과 지식을 함께 설치하고 작업 맥락에 따라 활성화하는 패키지다. 스킬이 작업 방법을 설명한다면 Power는 그 지침과 연결 도구를 함께 묶는다. 대화의 키워드에 맞는 Power를 로드하므로 모든 연동 문서를 처음부터 넣을 필요가 줄어든다. 실제 토큰 절감과 결과 품질은 작업별로 측정한다.

| 구성 | 역할 |
|---|---|
| `plugin.json` | 필수 manifest, 패키지 식별 정보와 활성화 `keywords` |
| `skills/<작업>/SKILL.md` | 선택한 작업의 지침, 필요하면 scripts와 references 포함 |
| `mcp.json` | 선택적 MCP 서버 연결 설정 |
| `dev.kiro/` | steering 같은 Kiro 전용 확장 |

과거 `POWER.md` 중심 예제를 현재 생성 규격으로 그대로 사용하지 않는다. 현재 공식 생성 가이드는 `plugin.json`을 요구하며 MCP 없는 스킬 전용 Power도 허용한다. 키워드 활성화는 지침을 선택하는 수단이며 생성 코드의 정확성을 보증하지 않는다.

### API 명세 연동에 적용하는 점검 순서

다음은 명세 조회와 코드 생성을 연결할 때의 설계 점검안이다. Power 설치만으로 자동 충족되는 기능은 아니다.

1. 필요한 API의 공식 명세 위치와 버전을 식별한다.
2. 조회 도구로 요청 경로, 필드, 인증과 오류 응답을 확인하고 관련 부분만 사용한다.
3. 지침에는 추측한 필드 사용 금지, 오류 처리와 검증할 응답을 적는다.
4. 생성 코드는 명세와 테스트 응답으로 대조한다. 명세 읽기와 실제 데이터 변경 권한은 구분한다.

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

## 면접 체크포인트

- 스킬을 재사용 가능한 작업 단위(온디맨드 플레이북)로 정의하고 일회성 프롬프트와의 차이를 말할 수 있는가
- SKILL.md 구조(name, description 프론트매터 + 지침 본문)와 description 기반 자동 트리거를 설명할 수 있는가
- 점진적 공개로 컨텍스트를 절약하는 원리(카탈로그 → 본문 → 서포팅 파일)
- Claude와 Codex 스킬이 같은 파일 기반 포맷으로 수렴했다는 점 (파일 vs API 오해 교정)
- 훅 vs 스킬 — 언제(강제) vs 무엇(작업)의 구분과 상보성
- 카탈로그 비용의 실체(목록 문자 예산, 저빈도 설명부터 제외, 스킬이 많을수록 산 스킬 설명까지 단축)와 세션 로그 집계 기반 수명주기 감사를 설명할 수 있는가
- 스킬이 어느 표면에 설치됐고 어느 방향으로 동기화되는지, 외부 스킬을 감사하고 켠 세션과 끈 세션으로 비교하는 이유를 설명할 수 있는가

## 출처

- [Kiro Docs, Hooks](https://kiro.dev/docs/hooks/)
- [Kiro Docs, Hook actions](https://kiro.dev/docs/hooks/actions/)
- [Kiro Docs, Agent Skills](https://kiro.dev/docs/skills/)
- [Kiro Docs, Powers](https://kiro.dev/docs/powers/)
- [Kiro Docs, Create powers](https://kiro.dev/docs/powers/create/)
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

## 관련 문서

- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (스킬, 훅 세부 메커니즘)]]
- [[Codex-CLI|Codex CLI (슬래시 명령, 스킬 시스템, AGENTS.md)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (Skills, MCP, 서브에이전트 활용)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (권장 vs 강제 분리)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (스킬 Catalog-First 로딩)]]
- [[MCP|MCP (외부 경계 확장)]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리 (로컬 세션 로그 집계와 신뢰 경계)]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동 (스킬 본문 길이의 재읽기 비용, 튜토리얼형 스킬의 한계)]]
