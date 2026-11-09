---
tags: [ai, agent, architecture, guardrails]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Guardrails", "에이전트 4겹 안전망과 루프 가드레일"]
---

# 프로덕션 에이전트 아키텍처: 다층 안전망과 루프 가드레일

LLM의 비결정성을 단계별로 차단하는 4겹 안전망과, 운영 도구에 넣은 에이전트의 프롬프트 계층과 루프를 코드로 통제하는 장치, 권한 프롬프트 대신 환경 단위로 접근 범위를 정하는 실행 환경 경계를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## Defense in Depth (4겹 안전망)

LLM의 비결정성은 단일 가드로 막을 수 없다. 단계별 차단을 쌓는다.

| 레이어 | 위치 | 차단 대상 |
|---|---|---|
| **Role** | 워커 선언 단계 | 권한 외 도구 호출 (분석 워커가 Confluence 쓰기 불가) |
| **Gate** | 요청 처리 진입 | 컨텍스트 부족 → 재확인으로 분기 |
| **Rule** | 워커 내부 정책(자연어) | 읽기 전용 쿼리, 스캔 한도, 취소분 처리 규칙 |
| **Hook** | 실행 직전(코드) | 쓰기 명령, 스캔 비용 초과, PII 컬럼, 파티션 누락 차단 |

**Hook는 마지막 방어선**이다. 자연어 Rule이 무시되더라도 코드 레벨에서 SQL을 가로채 거절한다. 자연어 정책에만 의존하면 LLM이 "잠깐, 이번엔 예외야"로 빠져나갈 수 있다.

## 프롬프트 계층화와 루프 가드레일

운영 도구에 에이전트를 넣을 때는 자연어 질의 자체보다 **에이전트의 행동을 운영 환경에 맞게 통제할 수 있는 제어권**이 중요하다.

- **시스템 프롬프트 3계층 분리** — (1) 전역 행동 정책: 도구 호출 순서, 위험 작업 안전 규칙, 결과가 비거나 잘렸을 때의 폴백 전략. 관리자만 수정한다. (2) 환경 메타데이터: 어떤 데이터소스를 우선 쓰고 어떤 라벨 후보를 시도할지 — 숙련자의 머릿속에만 있던 운영 지식을 LLM이 쓸 수 있는 형태로 명문화한 계층. 이 계층이 없으면 에이전트가 매번 라벨 탐색부터 시작해 호출 라운드를 낭비하고, 올바른 데이터소스를 골라도 결과가 0건으로 돌아온다. (3) 사용자 개인화: 담당 서비스, 응답 선호. 개인화는 공통 정책 위에 덧붙을 뿐 덮어쓰지 못하게 해 계층별 책임 주체를 분리한다.
- **프롬프트 합성은 백엔드 단일 책임** — 프런트엔드가 시스템 프롬프트를 조립하면 사용자가 정책을 우회할 여지가 생긴다.
- **에이전트 루프의 코드 레벨 가드레일** — 도구 호출 라운드 상한, 같은 도구를 같은 인자로 반복 호출하는 것의 차단(호출 해시), 도구별 재시도 제한, 개별 도구 결과 크기 제한(잘렸다는 사실을 명시), 누적 히스토리 절단(툴 호출과 결과의 짝이 깨지지 않게 호출 식별자는 유지), 결과가 비었을 때 라벨과 시간 범위와 데이터소스를 바꿔 재시도하도록 유도하는 노 데이터 힌트. 모두 LLM이 잘 판단해 주겠지에 기대지 않기 위한 장치로, 위 Defense in Depth의 Hook과 같은 축이다.
- **사용량 제한은 사후 반영(post-accounting)** — 요청 전에는 현재 사용량이 한도를 넘었는지 검사하고, 응답 후 모델이 반환한 실제 토큰 사용량을 사용자별 버킷에 누적한다(초과 시 429). 추정치가 아니라 실측 기반으로 비용을 관리한다. 부가 저장소(대화 기록, 개인화) 장애가 전체 장애가 되지 않게 해당 기능만 제한하고 단일 요청 처리는 유지한다.

## 에이전트 목록과 실행 통제는 다른 계층이다

여러 플랫폼의 에이전트를 한 목록에서 관찰하는 것과 실행 중 도구 호출을 차단하는 것은 다르다. 담당자와 목적을 찾는 인벤토리, 사용량과 위험을 보는 관리 화면, 호출 경로의 게이트웨이와 실행 권한을 구분한다.

부분 검증(2026-10-24): Dataiku Agent Management의 공식 제품 설명과 FAQ는 네이티브 API와 로그 스트림으로 에이전트를 발견하고 관찰하며, 통합 깊이는 각 플랫폼이 공개하는 정보에 달려 있다고 설명한다. 이 제품은 에이전트와 도구 사이의 트래픽 경로에 놓이는 AI 게이트웨이가 아니다. 일부 플랫폼의 에이전트 중지는 지원하지만 런타임 통제는 각 에이전트 플랫폼에 남는다. 이는 제공자가 명시한 기능 경계이며 모든 연결 플랫폼의 차단 동작을 재현한 결과가 아니다.

이 구분을 적용한 운영 점검은 다음과 같다.

1. 목록에서 발견한 에이전트와 실제 trace를 수집하는 에이전트를 구분하고, 담당자와 목적을 연결한다.
2. 위험 알림, 인증 기록과 실제 중지 권한을 따로 확인한다. 경고가 생겼다는 사실을 실행이 차단됐다는 증거로 쓰지 않는다.
3. 플랫폼별로 중지 가능한 범위와 호출 경로를 시험한다. 위험한 도구 호출의 권한 검사와 실행 직전 차단은 실제 런타임에서 검증한다.

가동 상태나 호출량만으로 업무 결과가 적절했다고 판정하지 않는다. 관측 데이터가 빠진 범위는 정상으로 채우지 않고 미관측으로 남긴다.

## 명령별 승인보다 실행 환경의 경계

코딩 에이전트의 작업은 모델 요청, 도구 실행, 결과 반영이 반복되는 루프다. 모델은 도구 이름과 입력을 담은 구조화된 요청을 돌려주고, 에이전트 소프트웨어가 허용 여부를 확인해 실행한 뒤 결과를 다음 요청의 컨텍스트로 넣는다. 테스트 실패 메시지도 이 경로로 다음 수정의 근거가 된다. 루프 자체의 정지 조건과 가드는 [[Agent-Loop-Engineering|루프 엔지니어링]]이 다룬다. 여기서는 그 행동이 실행되는 자리를 다룬다.

명령마다 사람에게 묻는 권한 프롬프트는 반복될수록 검토 기능을 잃는다. Anthropic은 2026-03-25 auto mode 설계 글에서 사용자가 수동 프롬프트의 93%를 실제로 승인하며, 시간이 지나면 무엇을 승인하는지 주의 깊게 보지 않는 approval fatigue로 이어진다고 설명했다. 2025-10-20 sandboxing 글에서는 파일시스템 격리와 네트워크 격리(승인된 서버에만 연결)를 함께 적용한 sandbox가 내부 사용에서 권한 프롬프트를 84% 줄였다고 밝혔다. 84%는 Anthropic 내부 사용 기준이고 93%는 글에 측정 대상과 방법이 밝혀져 있지 않다. 두 수치 모두 Claude Code 기준이며 다른 도구나 조직에 그대로 옮기지 않는다. 글의 파일시스템 격리 설명과 달리 현재 로컬 sandboxed Bash의 기본 읽기 범위는 넓어 자격 증명 파일도 읽을 수 있으므로, 실제 범위는 [[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]에서 확인한다.

그래서 질문을 이 명령을 허용할지에서 이 환경이 무엇에 닿을 수 있는지로 바꾼다.

- **에이전트별 실행 환경**: 한 장비에서 여러 에이전트를 돌리면 코드 사본을 나눠도 빌드 자원과 테스트 서버 포트가 겹칠 수 있다([[Agent-Terminal-Workspaces|worktree가 막지 못하는 DB와 포트 충돌]]). 에이전트마다 코드, 도구, 의존성과 테스트 데이터베이스를 가진 환경(container, pod, VM)을 주면 한 에이전트의 설치와 변경이 다른 에이전트를 깨지 않는다.
- **환경 단위 네트워크 정책**: 코드 저장소, 패키지 저장소, 테스트 데이터베이스처럼 작업에 필요한 대상만 열고 운영 데이터베이스와 내부 인사 시스템 같은 대상은 막는다. 모델이 잘못 판단해도 환경 경계가 그 행동을 어렵게 만든다.
- **자격 증명을 실행 환경 밖에 둔다**: 2025-10-20 sandboxing 글 기준으로 Claude Code on the web은 git 자격 증명이나 서명 키 같은 민감한 자격 증명이 sandbox 안에 들어가지 않도록 설계됐다. 이를 모델 호출로 넓힌 설계 원칙으로, 모델 호출을 실행 환경 밖의 제어 계층이 맡으면 오염된 의존성이 환경 변수를 읽더라도 모델 API 키를 얻지 못한다.
- **세 위치를 따로 묻는다**: 에이전트 루프가 도는 곳, 코드가 실행되는 곳, 모델이 도는 곳은 서로 다르다. 루프와 실행 환경을 자체 인프라에 두어도 외부 모델 제공자를 쓰면 프롬프트와 코드 일부는 그 제공자로 나간다. 외부 전송이 없어야 하면 모델까지 내부에서 제공해야 한다.

모델, 루프를 관리하는 에이전트 소프트웨어, 실행 환경, 접근 범위를 정하는 정책 계층을 나눠 두면 모델을 바꿔도 환경과 정책을 다시 만들 필요가 줄어든다. 대가는 환경의 기동 시간, 컴퓨팅 비용, 대용량 데이터나 특수 하드웨어가 필요한 작업의 추가 설정이다. 한 사람이 저장소 하나에서 짧게 고치는 일은 로컬 에이전트가 단순하고, 긴 작업, 여러 에이전트 동시 실행, 보안 규칙이 엄격한 팀일수록 통제된 실행 환경의 가치가 커진다. 이 목록은 설계 원칙이며 특정 제품의 격리 수준을 검증한 결과가 아니다.

## 출처
- [Dataiku Agent Management — Dataiku](https://www.dataiku.com/product/agent-management)
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)
- [Grafana에서 자연어로 장애 원인을 분석하기: LLM 에이전트 기반 SRELens 개발기 — LY Corporation 기술블로그](https://techblog.lycorp.co.jp/ko/analyzing-incident-root-causes-in-grafana-using-natural-language-with-llm-agent)
- [How we built Claude Code auto mode: a safer way to skip permissions — Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode)
- [Beyond permission prompts: making Claude Code more secure and autonomous — Anthropic](https://www.anthropic.com/engineering/claude-code-sandboxing)
- [The Agent Loop Explained: What Happens When You Give Claude a Bug to Fix — YouTube, ByteMonk](https://www.youtube.com/watch?v=Gy4ECDG_hI4) — 2026-10-28, 실행 환경 제품 후원 영상. 루프와 실행 환경 분리, 세 위치 구분은 후원사 제품 설명을 일반화한 설계 원칙이며 제품 동작을 검증하지 않음

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain/Inform/Verify/Correct/HITL)]]
- [[Harness-Anatomy|하네스 구성도 (루프 가드레일이 앉는 블록 지도)]]
- [[Agent-Swarm-Containment|에이전트 군집 격리 (AI로 AI를 감독하는 구조와 한계)]]
- [[Agent-Loop-Engineering|루프 엔지니어링 (agent loop의 정지 조건과 가드)]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한 (auto mode)]]
