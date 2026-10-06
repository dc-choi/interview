---
tags: [ai, mcp, a2a, tool-use, protocol]
status: done
verified_at: 2026-09-30
category: "AI엔지니어링(AIEngineering)"
aliases: ["MCP", "Model Context Protocol", "모델 컨텍스트 프로토콜", "A2A", "Agent2Agent"]
---

# MCP (Model Context Protocol)

## 정의

LLM이나 AI 에이전트를 외부 도구와 데이터 소스에 연결하는 표준 프로토콜. 모델은 기본적으로 텍스트로 답할 뿐이지만, MCP로 도구에 연결되면 파일을 읽고, 명령을 실행하고, DB나 API를 조회하는 실제 행동을 한다. 말만 하던 컨설턴트에게 노트북과 접근 권한을 주는 셈이다.

핵심 가치는 표준화다. 모델과 도구를 1회성으로 직접 엮는 대신, 표준 인터페이스 하나로 여러 모델과 도구를 조합한다(AI 주변기기의 USB-C에 비유된다).

## 구성: Host, Client, Server

| 구성 | 역할 | 예시 |
|---|---|---|
| Host | 사용자가 쓰는 AI 애플리케이션 | Claude Code, Claude Desktop, VS Code 같은 IDE와 채팅 클라이언트 |
| Client | Host 안에서 특정 서버와 1:1 연결을 맺는 커넥터 | Host 내부 |
| Server | 실제 기능을 노출하는 프로세스 | 파일시스템, GitHub, DB, 브라우저 자동화 |

Gmail이나 Slack 같은 서비스 자체가 MCP 서버인 것은 아니다. 그 서비스의 기능을 Tools로 노출하는 프로그램이 서버이고, Host는 연결하는 서버마다 Client를 하나씩 만든다.

서버가 노출하는 3종 원시(primitive):

- Tools: 모델이 호출하는 함수. 읽기 전용일 수도 있고 환경 변경 부수효과를 가질 수도 있음
- Resources: 모델이 읽는 데이터(파일 내용, 레코드)
- Prompts: 재사용 가능한 프롬프트 템플릿

MCP는 stdio와 Streamable HTTP 전송을 지원한다. 일반적으로 로컬 프로세스는 stdio, 원격 서버는 Streamable HTTP를 사용한다.

## 왜 쓰나: tool-use의 N×M 문제

- 표준이 없으면 모델 ↔ 도구 연동을 모델 수 × 도구 수만큼 개별 구현해야 한다(N×M)
- 도구를 MCP 서버로 한 번 노출하면, 필요한 transport, 인증과 primitive를 지원하는 Host에서 재사용된다 → 통합 비용이 N+M으로 줄어든다

이게 자동완성 수준의 AI와 작업에 참여하는 AI를 가르는 경계다. 도구가 붙어야 모델이 환경을 읽고 바꾸는 작업자가 된다.

## RAG, 에이전트와 Function Calling의 경계

네 개념은 대체재 목록이 아니라 서로 다른 책임을 설명한다.

| 개념 | 맡는 책임 | 그 자체로 보장하지 않는 것 |
|---|---|---|
| MCP | 외부 도구와 데이터의 발견, 호출과 전달을 표준화 | 검색 품질, 답의 정확성, 업무 완료 |
| RAG | 검색한 외부 근거를 생성 입력에 결합 | 원본과 색인의 최신성, 근거 해석의 정확성 |
| 에이전트 | 결과를 관찰하며 다음 행동과 도구 사용을 동적으로 결정 | 무제한 자율 실행이나 사람 개입의 불필요성 |
| Function Calling | 모델이 도구 이름과 인자를 구조화해 요청 | 함수 실행 자체와 실행 권한 |

예를 들어 정책 문서를 검색하는 MCP 도구를 에이전트가 호출하고, 반환된 문서를 넣어 답변을 생성하면 한 흐름에 세 개념이 함께 들어간다(설명용 예시). 검색과 생성을 고정 순서로 실행하는 RAG에는 에이전트 루프가 없어도 된다. MCP도 모델이나 컨텍스트 관리 방식을 지정하지 않는다.

MCP와 Function Calling을 원격 실행과 로컬 실행으로 나누면 틀린다. MCP 서버는 로컬과 원격에서 모두 실행할 수 있고, 모델이 요청한 함수도 애플리케이션 구현에 따라 외부 API를 호출할 수 있다. 핵심 차이는 실행 장소가 아니라 연결 프로토콜과 모델의 호출 요청이라는 책임이다. 세부 검색 설계는 [[RAG-Retrieval-Engineering]], 실행 흐름은 [[LLM-Workflow-Patterns]]에서 다룬다.

## 사용자 소유 콘텐츠 커넥터 패턴

원격 MCP 서버는 사용자가 구독하거나 소유한 콘텐츠를 검색 가능한 AI 컨텍스트로 바꿀 수 있다. 디렉터리 목록은 발견과 설치를 돕는 배포 계층이고, 실제 접근은 원격 endpoint와 OAuth 권한으로 결정된다.

```text
Host -> OAuth authorization -> remote MCP
     -> 사용자별 entitlement 검사 -> 검색과 조회 Tool
     -> 근거가 포함된 context -> 모델 응답
```

학습 콘텐츠 서버의 Tool은 보통 네 역할로 나뉜다.

| 역할 | Inflearn 구현 예시 |
|---|---|
| 의미 검색 | `search_lectures`로 수강 중인 유닛 자막 검색 |
| 본문 조회 | `get_lecture_content`로 특정 유닛의 핵심 콘텐츠 조회 |
| 학습 상태 | `list_my_recent_learnings`로 최근 강좌와 진도 조회 |
| 구조 탐색 | `get_curriculum`으로 섹션과 유닛 트리 조회 |

Tools는 근거를 가져오고 Prompts는 그 근거를 사용하는 학습 절차를 묶는다. Inflearn 구현은 강사형 튜터링, 개념 탐구, 복습 퀴즈와 학습 로드맵 Prompt를 제공한다. 다만 MCP 호환이 모든 기능의 동등한 노출을 뜻하지는 않는다. 2026-08-04 공개 안내 기준 Claude 계열의 지원 Client에서는 Prompts를 사용할 수 있지만, ChatGPT용 Inflearn app은 네 개의 읽기 전용 Tool을 호출하는 방식이다.

읽기 전용은 원본 강의가 변경되지 않는다는 뜻이지 데이터가 이동하지 않는다는 뜻은 아니다. 질문에서 파생된 검색어와 코드 조각은 Tool 인자로 MCP 서버에 전달될 수 있고 조회된 자막과 진도는 Host의 모델 context로 돌아온다. OAuth는 어떤 원본을 조회할 수 있는지 제한하며 반환된 데이터는 Host의 대화, memory, 보존과 모델 개선 정책을 따른다. 연결 해제와 서비스 쪽 OAuth 권한 회수를 모두 확인하고 디렉터리 등재 자체를 보안 검증으로 간주하지 않는다.

## 통제와 보안: 권한이 생긴 만큼

도구 접근 권한은 데이터 노출이나 환경 변경 부수효과를 만들 수 있다. 그래서 연결만큼 통제가 중요하다.

- 사람 승인(Human-in-the-loop): 위험한 도구 호출 전 사람이 확인 → [[Harness-Engineering|HITL]]
- 권한 최소화: 서버가 접근할 수 있는 범위(디렉토리, 스코프)를 제한
- 프롬프트 인젝션 경계: 서버가 반환한 데이터가 모델의 지시를 오염시킬 수 있으므로 신뢰 경계를 설정
- 계정 위임의 범위: OAuth 연결만으로 계정의 모든 권한이 에이전트에 넘어가지는 않는다. 실제 가능 행위는 부여된 scope, 서버가 노출한 도구, 서비스의 객체 접근 권한과 Host 통제를 함께 확인한다. 삭제와 발송 도구가 허용된 경우 승인이나 차단 정책을 정한다 ([[Claude-Code-Business-Automation|커넥터 도구 권한]])
- 감사: 어떤 도구가 무엇을 실행했는지 로깅

도구의 `annotations`는 동작에 관한 메타데이터이며 권한을 강제하는 장치가 아니다. 명세도 신뢰하는 서버가 제공하지 않은 annotation은 비신뢰로 취급하도록 요구한다. 읽기 전용이라는 설명만으로 외부 전송이나 민감 데이터 노출까지 안전하다고 판단하지 않는다.

원격 서버의 토큰은 그 MCP 서버를 대상으로 발급됐는지 검증한다. 다른 API용 토큰을 검증 없이 받아 downstream으로 그대로 전달하는 token passthrough는 명세에서 금지한다. MCP 접근 권한과 downstream API 접근 권한은 별도로 관리한다.

로컬 stdio 서버는 실행되는 프로그램이다. MCP를 사용한다는 사실이 OS 샌드박스를 자동으로 제공하지 않는다. 시작 명령과 패키지 출처, 파일과 네트워크 접근 범위, 자격증명 전달을 확인하고 최소 권한으로 실행한다. 이 보안 경계는 서버의 도구 이름이나 공개 디렉터리 등재로 대신할 수 없다.

MCP 서버가 다루는 자격 증명이 남에게 쓰이거나 밖으로 새는 네 경계(인증, 파일 경로, API 목적지, Origin과 Host), 실제 보안 권고와 조직용 게이트웨이 구성은 [[MCP-Security-Boundaries|MCP 보안 경계]]에서 다룬다.

## 하네스와 컨텍스트에서의 위치

MCP는 하네스의 Inform(맥락 주입)과 도구 실행 축을 표준화한 수단이다. 다만 서버가 너무 많은 도구와 리소스를 노출하면 선택 비용과 [[Context-Engineering|Context Rot]]가 늘어난다. 필요한 서버만 켜고, 도구 스키마를 필요할 때만 로드하는 JIT 원칙이 그대로 적용된다.

## 거버넌스와 표준화 — 벤더 중립 재단으로

2025-12-09 Anthropic은 MCP를 Linux Foundation 산하 directed fund인 Agentic AI Foundation(AAIF)에 기부했다. AAIF는 Anthropic, Block, OpenAI가 공동 설립했고 창립 프로젝트는 MCP, Block의 goose(MCP 기반 로컬 우선 에이전트 프레임워크), OpenAI의 AGENTS.md(코딩 에이전트용 저장소별 지침 파일) 세 가지다. 발표 당시 Platinum 회원은 AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI였다. Anthropic은 같은 발표에서 공개 MCP 서버 1만 개 이상, Python과 TypeScript SDK 합산 월 9,700만 회 이상 다운로드, Claude 디렉터리의 MCP 기반 커넥터 75개 이상을 제시했다(2025-12 발표 기준 수치).

도입하는 쪽에서 벤더 중립 거버넌스가 뜻하는 것:

- 표준의 소유와 상표가 한 회사의 제품 전략에서 분리된다. 경쟁 벤더도 같은 규격에 투자할 동기가 생겨 서버를 한 번 만들면 여러 Host에서 쓰는 N+M 이점이 커진다
- 운영 방식은 그대로다. 발표는 기존 메인테이너 체계와 커뮤니티 의견 중심의 투명한 결정 방식을 유지한다고 밝혔고, 변경은 여전히 SEP(Specification Enhancement Proposal)와 버전별 명세로 들어온다
- 중립이 하위 호환을 보장하지는 않는다. 현재 명세 `2026-07-28`은 `initialize` 핸드셰이크와 프로토콜 수준 세션(`Mcp-Session-Id`)을 제거해 요청마다 버전과 capability를 싣는 stateless 설계로 바꾸고, `server/discover`를 필수 RPC로 추가했다. 이전 명세 `2025-11-25`의 공식 changelog에는 stateless 항목이 없으므로, stateless는 2025-12 발표 시점의 방향 설명이었고 실제 명세 변경은 2026-07-28 개정이다
- 명세에 12개월 이상 유예 기간을 두는 기능 수명 주기와 폐기 정책이 생겼다(Roots, Sampling, Logging은 Deprecated). 서버와 Client를 운영하면 지원하는 프로토콜 버전과 폐기 기능 레지스트리를 주기적으로 확인한다

재단 이관은 규격의 신뢰성이나 개별 서버의 안전성을 보증하지 않는다. 위의 권한 최소화와 신뢰 경계 점검은 그대로 적용한다.

## 변경 알림 구독과 재연결

`2026-07-28` 명세는 기존 HTTP GET 알림 스트림과 `resources/subscribe`, `resources/unsubscribe`를 `subscriptions/listen`으로 대체한다. 클라이언트가 도구, 프롬프트, 리소스 목록 또는 지정 리소스 변경을 선택하면, HTTP POST 응답을 길게 열어 알림을 받는다. 진행 상황과 요청별 로그 알림은 해당 요청의 응답 스트림을 사용한다(2026-10-06 공식 changelog 확인).

구독은 재생 가능한 이벤트 로그가 아니다. 공식 Ruby SDK 설명에서는 서버가 승인한 구독 범위를 첫 알림으로 확인하고, 승인 이후 변경만 전달한다. 클라이언트는 구독 뒤 현재 상태를 조회하고 변경 알림을 재조회 신호로 쓴다. 연결이 끊긴 동안의 알림이 복구된다고 가정하지 않는다.

명세에서 SSE event ID와 `Last-Event-ID` 재개가 제거됐으므로 끊긴 요청은 새 요청 ID로 다시 발행한다. 부수효과가 있는 도구 실행의 중복 방지는 별도 업무 계약이며, 알림 스트림 재연결과 같은 의미로 취급하지 않는다.

## A2A와의 경계 — 도구 연결과 에이전트 협업

A2A(Agent2Agent)는 서로 다른 조직과 프레임워크의 에이전트가 일을 맡기고 결과를 주고받게 하는 개방형 프로토콜이다. MCP가 에이전트와 도구를 잇는 수직 연결이라면 A2A는 에이전트끼리의 수평 연결이고, 공식 문서도 두 프로토콜을 경쟁이 아닌 보완 관계로 설명한다.

| 구분 | MCP | A2A |
|---|---|---|
| 연결 대상 | 에이전트와 도구, 데이터 | 에이전트와 에이전트 |
| 상대의 내부 | 도구 스키마를 드러내고 호출된다 | 내부 사고, 계획, 도구 구현을 공유하지 않는 불투명한 상대 |
| 작업 단위 | 도구 호출과 결과 | 상태가 있는 Task와 결과물(Artifact) |
| 발견 | Host 설정과 `server/discover` | 도메인의 `/.well-known/agent-card.json`에 둔 Agent Card, 레지스트리나 직접 설정 |

- **이력**: Google이 2025-04-09 발표했고 2025-06-23 Linux Foundation 프로젝트가 됐다. 2026-08-27 MCP와 같은 AAIF의 Growth Stage 프로젝트로 채택됐으며 명세는 v1.0이 안정판이다(2026-09-30 공식 사이트 확인)
- **구성**: Agent Card에 이름, 서비스 엔드포인트, 스트리밍과 푸시 알림 같은 capability, 인증 방식, 할 수 있는 일(skill)을 적는다. Task는 제출, 진행, 완료, 실패, 취소, 거절 상태와 입력 필요, 인증 필요 같은 중단 상태를 거친다. 메시지는 텍스트, 파일, 구조화 데이터 Part로 이루어지고 결과는 Artifact로 돌아온다. 전송 바인딩은 JSON-RPC 2.0, gRPC, HTTP+JSON이고 오래 걸리는 작업은 스트리밍이나 웹훅 푸시 알림으로 추적한다
- **보안**: 민감한 내용이 든 Agent Card는 인증 뒤에 두고 자격 증명은 정적 비밀 대신 대역 밖에서 동적으로 받는다. 원격 에이전트의 응답도 도구 결과처럼 신뢰 경계 밖의 입력으로 다룬다
- **제품 기능과 구분**: Claude Code의 서브에이전트, 에이전트 팀과 세션 간 메시징은 제품 안의 조정 기능이고, 2026-09-30 Claude Code 공식 문서 색인에는 A2A 항목이 없다. 로컬 코딩 에이전트 여러 개를 함께 돌리는 일이 곧 A2A는 아니므로 제품별 지원 여부는 각 공식 문서로 확인한다
- **교차 검증은 프로토콜과 별개다**: 한 에이전트가 만든 보고서를 다른 에이전트가 원자료와 대조해 환각을 걸러내는 생성과 검증의 분리는 A2A 없이도 서브에이전트나 별도 세션으로 만들 수 있다 ([[Harness-Engineering|검증의 우선성]])

## 면접 체크포인트

- MCP를 한 줄로: 모델을 외부 도구와 데이터에 연결하는 표준(USB-C 비유), tool-use를 N×M에서 N+M으로
- Host/Client/Server 구조와 Tools/Resources/Prompts 원시 구분
- 도구 권한 = 위험 → HITL, 권한 최소화, 프롬프트 인젝션 경계, 감사
- 도구를 많이 붙일수록 컨텍스트 비용이 오른다 → 필요한 서버만(JIT, Select)
- 재단 이관(AAIF)이 바꾸는 것과 바꾸지 않는 것, 명세 개정에 따른 버전 호환 확인
- MCP(에이전트와 도구)와 A2A(에이전트와 에이전트)의 경계, Agent Card와 Task 수명주기, 제품 내부 멀티 에이전트 기능과의 차이

## 출처

2026-10-06에는 변경 알림 구독과 재연결 절을 공식 changelog와 Ruby SDK 설명에 대조했다. 다른 제품 지원 현황 전체의 검증일은 갱신하지 않았다.

- [MCP Ruby SDK, Subscriptions](https://ruby.sdk.modelcontextprotocol.io/server/subscriptions/)

2026-10-02에는 2026-07-28 명세의 tool annotations, token passthrough와 로컬 서버 실행 경계를 대조했다. 개별 Host, 커넥터와 A2A 제품 지원 현황 전체를 다시 확인한 기록은 아니다.

2026-10-06에는 RAG, 에이전트와 Function Calling 비교 절을 아래 프로토콜 문서, RAG 논문, 에이전트 설계 자료와 OpenAI Function calling 문서에 대조했다. 기존 제품 지원 현황 전체의 재검증은 아니므로 frontmatter의 검증일은 유지한다.

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — NeurIPS 2020](https://arxiv.org/abs/2005.11401)
- [Building effective agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI, Function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [Model Context Protocol, Tools (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Model Context Protocol, Security Best Practices (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices)
- [Architecture overview — Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture)
- [인프런 MCP — Inflearn](https://www.inflearn.com/pages/mcp)
- [Inflearn Connector — Claude](https://claude.ai/directory/connectors/inflearn)
- [Inflearn App — ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6a60947c82c8819191097ba682d36c68)
- [Connectors overview — Anthropic](https://claude.com/docs/connectors/overview)
- [Bring your app to ChatGPT — OpenAI](https://learn.chatgpt.com/use-cases/chatgpt-apps)
- [비개발자가 한 달 동안 풀스택으로 개발하면서 배운 것 — NAVER D2](https://d2.naver.com/helloworld/0107009)
- [Donating the Model Context Protocol and establishing the Agentic AI Foundation — Anthropic](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- [Linux Foundation Announces the Formation of the Agentic AI Foundation (AAIF) — Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [Key Changes (2026-07-28) — Model Context Protocol](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [Key Changes (2025-11-25) — Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [Versioning — Model Context Protocol](https://modelcontextprotocol.io/specification/versioning)
- [Agent2Agent (A2A) Protocol — A2A Protocol](https://a2a-protocol.org/latest/)
- [A2A Protocol Specification — A2A Protocol](https://a2a-protocol.org/latest/specification/)
- [Agent Discovery — A2A Protocol](https://a2a-protocol.org/latest/topics/agent-discovery/)
- [A New Chapter for A2A: Joining the Agentic AI Foundation — A2A Protocol](https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/)
- [Announcing the Agent2Agent Protocol (A2A) — Google Developers Blog](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Linux Foundation Launches the Agent2Agent Protocol Project — Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)
- [Claude Code documentation index — Anthropic](https://code.claude.com/docs/llms.txt)
- [인프런, 널널한 개발자, MCP와 A2A](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498590)

## 관련 문서

- [[Harness-Engineering]] — MCP는 Inform과 도구 실행 축, 권한은 HITL로 통제
- [[Context-Engineering]] — 도구 과다 노출 = Context Rot, 필요한 서버만(JIT, Select)
- [[Tool-Output-Filtering]] — MCP 응답이 컨텍스트를 채우는 주범, 프록시 계층에서 필드만 추출
- [[Production-Agent-Architecture]] — 도구를 가진 에이전트의 Defense in Depth
- [[MCP-Security-Boundaries]] — 서버 자격 증명의 네 경계, 2026년 MCP 서버 권고, 게이트웨이와 URL 모드 elicitation
- [[AI-Handicap-Learning|AI를 학습 난이도 조절 도구로]] — 강의 근거를 활용하는 학습 루프
- [[Codex-CLI]] — 같은 재단의 창립 프로젝트인 AGENTS.md 지침 파일
- [[AI엔지니어링(AIEngineering)]] — 카테고리 인덱스
