---
tags: [ai, agent, runtime, harness]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Runtime Deployment", "Eve", "Mecatl", "Strands Harness SDK", "OpenCode 2.0"]
---

# 에이전트 런타임의 정의, 상태와 배포 경계

에이전트 런타임은 모델 호출을 실제 도구 실행, 권한 검사, 상태 저장과 사용자 채널에 연결한다. 모델의 추론 능력이 좋아져도 작업 관리나 재개, 접근 통제가 자동으로 해결되지는 않는다.

## 정의와 실행 환경을 분리한다

| 층 | 관리할 계약 | 대표 확인 항목 |
|---|---|---|
| 에이전트 정의 | 지침, 모델, 도구, 스킬과 위임 관계 | 변경 이력, 도구 입력 검증과 테스트 |
| 실행 루프 | 호출, 승인, 압축, 예산과 종료 | 무한 재시도, 취소 전파와 실패 보고 |
| 영속 상태 | 세션, 이벤트와 완료한 작업 | 재시작 복구, 동시 쓰기와 중복 부수효과 |
| 실행 환경 | 로컬 프로세스, 샌드박스와 서버 | 자격 증명, 파일과 네트워크 접근 |
| 클라이언트 | 터미널, 웹과 메시지 채널 | 연결 단절 뒤 재접속과 사용자 권한 |

파일 기반 정의는 변경을 리뷰하기 쉽게 하지만 격리를 대신하지 않는다. 저장한 대화 이력도 외부 결제나 배포가 한 번만 실행됐다는 증거는 아니다.

## 파일 구조로 정의하는 Eve

2026-10-16 공식 소개와 agent-files 문서 대조 기준이다. Eve는 Markdown 지침과 스킬, TypeScript 도구를 디렉터리에서 발견해 에이전트로 구성한다. `instructions.md`가 기본 지침이고, `agent.ts`에서 모델과 런타임을 설정한다. `tools/`, `skills/`, `channels/`, `subagents/`는 기능의 배치를 드러낸다. 스킬은 관련 작업에 맞춰 불러온다.

도입 시에는 파일이 존재하는 것, 빌드가 인식한 것과 실제 호출된 것을 따로 확인한다. 같은 이름의 도구 충돌과 자식의 지침 및 권한 상속 여부도 점검한다. 이번 정리는 공식 구조 확인이며 배포와 장애 복구를 실행한 검증은 아니다.

## 자체 인프라에서 실행하는 Mecatl

2026-10-16 공식 저장소 기준, Mecatl은 모델 공급자, 저장소, 파일 시스템과 클라이언트를 실행 루프에서 분리한다. gRPC와 HTTP/SSE 연결, 도구 승인, 훅, 압축과 하위 에이전트를 제공한다. 외부 저장소의 세션과 이벤트로 프로세스 교체 뒤 저장한 작업을 복구한다.

Kubernetes 참조 런타임은 **Redis에 상태와 이벤트를 저장하고 Kubernetes lease로 세션별 단일 쓰기를 조정**한다. Redis만으로 실행 소유권을 정한다는 의미로 읽지 않는다. 임대 만료, 기존 작업자의 지연 종료와 외부 부수효과의 멱등성은 실제 배포에서 추가 검증할 조건이다.

## 조립된 하네스와 SDK를 구분하는 Strands

2026-10-16 공식 문서 기준, Strands harness는 도구, 문맥 관리, 세션, 메모리와 훅을 조합한 기본 구현이다. Strands Harness SDK는 그 구성을 직접 만드는 층이다. Python과 TypeScript에서 시작하며 모델 공급자를 교체할 수 있다.

기본 하네스로 시작해 필요한 항목만 바꾸는 것과, 실행 구조를 처음부터 구성하는 것은 유지할 책임이 다르다. 모델 선택의 자유가 공급자별 도구 호출, 캐시와 오류 응답의 동등성을 보장하지 않는다. [[Strands-Conversation-State|대화와 세션 상태]]에서 저장과 동시 쓰기 경계를 함께 본다.

## 공유 서비스와 Code Mode를 사용하는 OpenCode 2.0

2026-10-16 V2 공식 문서에서 MCP의 Code Mode 기본 사용과 백그라운드 하위 에이전트 호출을 대조했다. `execute`에서 여러 도구를 호출하고 중간 결과를 가공해 모델에 반환할 정보를 줄인다. 백그라운드 호출은 자식 세션을 시작한 뒤 부모가 계속 진행하도록 한다.

제공된 GeekNews 2026-10-15 발췌는 TUI, 웹과 데스크톱을 단일 백그라운드 서비스로 연결하는 개편, OpenAPI 연결, 80개 이상 내부 플러그인과 핫 리로드를 소개한다. 이 항목들의 전체 릴리스 구현은 이번에 대조하지 않았다. V1과의 플러그인 API, 서버 프로토콜과 설정 호환성을 확인한 뒤 이전한다.

## 작업 관리의 병목을 평가한다

코딩 에이전트의 품질은 작업 성공률과 사용자의 개입량으로 확인한다. 2026-10-09 공개 경험 글인 「Why Are Coding Agents So Dumb?」는 병렬화 부족, 모델별 위임 부재, 읽기 어려운 계획과 반복 승인 비용을 지적한다. 특정 시점의 사용 경험이며 모든 제품의 현재 결함을 입증한 결과는 아니다.

- 독립 작업은 병렬화할 수 있지만 같은 파일과 Git 상태를 바꾸는 작업은 소유권과 순서를 먼저 정한다.
- 모델 라우팅은 가격뿐 아니라 오판 비용, 재작업과 컨텍스트 인계 비용을 포함한다.
- 반복적인 확인을 줄일 때도 파일 시스템과 네트워크 경계는 실행 계층에서 강제한다.
- 완료 보고는 계획 항목의 체크보다 실행 결과와 산출물에 연결한다.

## 출처

- [Introducing eve — Vercel](https://vercel.com/blog/introducing-eve)
- [Agent Files — vercel/eve](https://github.com/vercel/eve/blob/main/docs/reference/agent-files.md)
- [Mecatl — Stacklok](https://github.com/stacklok/mecatl)
- [Strands Agents, Strands harness](https://strandsagents.com/docs/user-guide/harness/)
- [OpenCode, V2 Intro](https://opencode.ai/v2/docs/)
- [OpenCode, MCP servers](https://opencode.ai/v2/docs/mcp-servers)
- [OpenCode, Tools](https://dev.opencode.ai/v2/docs/tools/)
- [Why Are Coding Agents So Dumb? — Michael Lynch](https://mtlynch.io/why-are-coding-agents-so-dumb/)
- 사용자 제공 GeekNews 발췌: 2026-10-11 Eve와 코딩 에이전트, 2026-10-15 Mecatl과 OpenCode 2.0, 2026-10-16 Strands Harness SDK. 게시물 URL은 제공되지 않았다.

## 관련 문서

- [[Agent-Declarative-Runtime|선언형 에이전트 런타임]]
- [[Harness-Anatomy|하네스 구성요소]]
- [[Agent-Loop-Engineering|루프와 정지 조건]]
- [[Strands-Conversation-State|Strands 대화와 세션 상태]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agentic-Verification|에이전트 기반 검증]]
