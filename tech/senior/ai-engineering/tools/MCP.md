---
tags: [senior, ai, mcp, tool-use, protocol]
status: done
verified_at: 2026-08-04
category: "Senior - AI 엔지니어링"
aliases: ["MCP", "Model Context Protocol", "모델 컨텍스트 프로토콜"]
---

# MCP (Model Context Protocol)

## 정의

LLM이나 AI 에이전트를 외부 도구와 데이터 소스에 연결하는 표준 프로토콜. 모델은 기본적으로 텍스트로 답할 뿐이지만, MCP로 도구에 연결되면 파일을 읽고, 명령을 실행하고, DB나 API를 조회하는 실제 행동을 한다. 말만 하던 컨설턴트에게 노트북과 접근 권한을 주는 셈이다.

핵심 가치는 표준화다. 모델과 도구를 1회성으로 직접 엮는 대신, 표준 인터페이스 하나로 여러 모델과 도구를 조합한다(AI 주변기기의 USB-C에 비유된다).

## 구성: Host, Client, Server

| 구성 | 역할 | 예시 |
|---|---|---|
| Host | 사용자가 쓰는 AI 애플리케이션 | IDE 확장, 채팅 클라이언트 |
| Client | Host 안에서 특정 서버와 1:1 연결을 맺는 커넥터 | Host 내부 |
| Server | 실제 기능을 노출하는 프로세스 | 파일시스템, GitHub, DB, 브라우저 자동화 |

서버가 노출하는 3종 원시(primitive):

- Tools: 모델이 호출하는 함수. 읽기 전용일 수도 있고 환경 변경 부수효과를 가질 수도 있음
- Resources: 모델이 읽는 데이터(파일 내용, 레코드)
- Prompts: 재사용 가능한 프롬프트 템플릿

MCP는 stdio와 Streamable HTTP 전송을 지원한다. 일반적으로 로컬 프로세스는 stdio, 원격 서버는 Streamable HTTP를 사용한다.

## 왜 쓰나: tool-use의 N×M 문제

- 표준이 없으면 모델 ↔ 도구 연동을 모델 수 × 도구 수만큼 개별 구현해야 한다(N×M)
- 도구를 MCP 서버로 한 번 노출하면, 필요한 transport, 인증과 primitive를 지원하는 Host에서 재사용된다 → 통합 비용이 N+M으로 줄어든다

이게 자동완성 수준의 AI와 작업에 참여하는 AI를 가르는 경계다. 도구가 붙어야 모델이 환경을 읽고 바꾸는 작업자가 된다.

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

읽기 전용은 원본 강의가 변경되지 않는다는 뜻이지 데이터가 이동하지 않는다는 뜻은 아니다. 질문에서 파생된 검색어와 코드 조각은 Tool 인자로 MCP 서버에 전달될 수 있고, 조회된 자막과 진도는 Host의 모델 context로 돌아온다. OAuth는 어떤 원본을 조회할 수 있는지 제한하며, 반환된 데이터는 Host의 대화, memory, 보존과 모델 개선 정책을 따른다. 연결 해제와 서비스 쪽 OAuth 권한 회수를 모두 확인하고, 디렉터리 등재 자체를 보안 검증으로 간주하지 않는다.

## 통제와 보안: 권한이 생긴 만큼

도구 접근 권한은 데이터 노출이나 환경 변경 부수효과를 만들 수 있다. 그래서 연결만큼 통제가 중요하다.

- 사람 승인(Human-in-the-loop): 위험한 도구 호출 전 사람이 확인 → [[Harness-Engineering|HITL]]
- 권한 최소화: 서버가 접근할 수 있는 범위(디렉토리, 스코프)를 제한
- 프롬프트 인젝션 경계: 서버가 반환한 데이터가 모델의 지시를 오염시킬 수 있으므로 신뢰 경계를 설정
- 감사: 어떤 도구가 무엇을 실행했는지 로깅

## 하네스와 컨텍스트에서의 위치

MCP는 하네스의 Inform(맥락 주입)과 도구 실행 축을 표준화한 수단이다. 다만 서버가 너무 많은 도구와 리소스를 노출하면 선택 비용과 [[Context-Engineering|Context Rot]]가 늘어난다. 필요한 서버만 켜고, 도구 스키마를 필요할 때만 로드하는 JIT 원칙이 그대로 적용된다.

## 면접 체크포인트

- MCP를 한 줄로: 모델을 외부 도구와 데이터에 연결하는 표준(USB-C 비유), tool-use를 N×M에서 N+M으로
- Host/Client/Server 구조와 Tools/Resources/Prompts 원시 구분
- 도구 권한 = 위험 → HITL, 권한 최소화, 프롬프트 인젝션 경계, 감사
- 도구를 많이 붙일수록 컨텍스트 비용이 오른다 → 필요한 서버만(JIT, Select)

## 출처

- [Architecture overview - Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture)
- [인프런 MCP - Inflearn](https://www.inflearn.com/pages/mcp)
- [Inflearn Connector - Claude](https://claude.ai/directory/connectors/inflearn)
- [Inflearn App - ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6a60947c82c8819191097ba682d36c68)
- [Connectors overview - Anthropic](https://claude.com/docs/connectors/overview)
- [Bring your app to ChatGPT - OpenAI](https://learn.chatgpt.com/use-cases/chatgpt-apps)
- [비개발자가 한 달 동안 풀스택으로 개발하면서 배운 것 — NAVER D2](https://d2.naver.com/helloworld/0107009)

## 관련 문서

- [[Harness-Engineering]] — MCP는 Inform과 도구 실행 축, 권한은 HITL로 통제
- [[Context-Engineering]] — 도구 과다 노출 = Context Rot, 필요한 서버만(JIT, Select)
- [[Tool-Output-Filtering]] — MCP 응답이 컨텍스트를 채우는 주범, 프록시 계층에서 필드만 추출
- [[Production-Agent-Architecture]] — 도구를 가진 에이전트의 Defense in Depth
- [[AI-Handicap-Learning|AI를 학습 난이도 조절 도구로]] — 강의 근거를 활용하는 학습 루프
- [[AI엔지니어링(AIEngineering)]] — 카테고리 인덱스
