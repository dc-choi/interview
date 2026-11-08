---
tags: [ai, agent, architecture, orchestration]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Orchestration", "프로덕션 에이전트 분업과 오케스트레이션"]
---

# 프로덕션 에이전트 아키텍처: 분업과 오케스트레이션

컴포넌트 분업과 라우팅 계약, 환경을 넘는 위임의 권한 보존, 핵심 엔진의 구현 선택과 Lazy Load 컨텍스트를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## 컴포넌트 분업

단일 에이전트에 도구와 책임이 늘어 라우팅 정확도나 컨텍스트 관리가 어려워졌을 때 분업을 검토한다. 역할 분리는 선택지이며, 추가 호출과 조율 비용까지 비교한다. 아래 표는 구성 예시다.

| 컴포넌트 | 역할 | 비고 |
|---|---|---|
| **Listener** | 외부 채널(슬랙 등) 이벤트 수신 | 상시 실행, LLM 미사용 |
| **Dispatcher** | 잡담/유효 요청 분류, 중복, 세션 관리 | 가벼운 모델(예: Sonnet) |
| **Parent Worker** | 요청 의도 정리, 라우팅, 재확인 | 요청자, 범위, 개념, 취소분 포함/제외, 합의된 사실 등의 컨텍스트 |
| **Sub-agents** | 단순 분석, 복잡 분석, 검색, 보고서, 시각화, 시트 출력 | 도메인별 워커, 권한 분리 |

Parent의 핵심 책무는 **정보 부족 시 재확인**이다. 모호한 요청을 추측으로 채우면 다층 안전망이 무용지물이 된다. 예: "거래 뽑아줘" → "숙박만요, 아니면 전체요?", "취소분 포함요?"로 분기.

**라우팅과 대화 전달은 별도 계약이다.** supervisor는 collaborator의 역할과 책임을 명확히 구분하고 겹침을 줄인다. 설계 점검에서는 전문 에이전트가 바뀐 뒤에도 후속 질문의 대상과 조건이 이어지는지 확인하고, 각 에이전트에 전달할 대화 범위와 민감정보를 제한한다. 역할 이름이나 프롬프트 분리만으로 데이터 접근 권한이 격리되지는 않는다.

관리형 API의 한 예로 Bedrock Agents Classic의 `AssociateAgentCollaborator`는 `relayConversationHistory`에 `TO_COLLABORATOR` 또는 `DISABLED`를 받는다(2026-10-07 공식 문서 확인). 같은 날 사용자 가이드는 Classic의 신규 고객 이용이 닫혀 있다고 안내하므로, 이 예시를 신규 도입 권고로 해석하지 않는다. 기존 에이전트의 단계적 연결과 대화 전달 계약을 이해하는 참고로 쓴다.

### 환경을 넘는 위임은 호출자의 권한을 보존한다

클라우드, 사내 시스템과 SaaS를 연결하는 에이전트는 연결 가능성과 실행 권한을 따로 확인한다. 다음은 IBM의 공개 신원 관리 원칙을 적용한 설계 점검이다(2026-10-10 확인).

- 사용자와 실행 에이전트를 구분해 식별하고, 누가 어떤 작업을 위임했는지 남긴다. 공유 키 하나로 모든 행동을 같은 주체의 작업으로 기록하지 않는다.
- 도구 호출에 필요한 범위와 수명으로 자격증명을 제한하고, API와 도구 실행 시점에 권한을 검사한다. 상위 에이전트가 요청을 전달했다는 이유로 하위 시스템의 권한 검사를 생략하지 않는다.
- 위임, 실행과 감사 기록을 연결한다. 중앙에 정책을 정의했어도 각 환경에서 실제로 거절되는지, 권한 회수가 반영되는지는 별도 시험으로 확인한다.

하이브리드 배치나 하나의 신원 시스템을 채택한 사실만으로 이 통제가 완성되지는 않는다. 제품 소개의 통제 목표와 실제 배포 환경에서 확인한 동작을 구분한다.

## 핵심 엔진: 프레임워크 vs 자체 구현

오케스트레이션 엔진을 LangChain 같은 범용 프레임워크에 계속 맡길지, 자체 구현할지는 성숙도에 따라 갈린다. 프레임워크는 빠르게 PoC를 세우는 데 강하지만, 프로덕션에서 제어권, 디버깅, 성능 튜닝을 가져오려면 추상화가 오히려 족쇄가 된다.

- PoC 단계: 프레임워크로 빠르게 검증
- 프로덕션 핵심 엔진: ReAct(추론과 행동을 번갈아 도는 루프) 방식 기반으로 자체 구현해 운영
- 자체 엔진은 매 턴 tool-calling으로 탐색, 행동 방향을 직접 정하고, 폴더 구조와 메타데이터를 컨텍스트로 받아 Progressive Disclosure 방식으로 필요한 만큼씩 파고든다 → [[RAG-Retrieval-Engineering]]

판단 기준은 통제 가능성이다. 핵심 루프의 동작을 한 줄까지 설명, 수정할 수 있어야 비결정성을 통제할 수 있다.

### 다음 단계를 누가 정하는가

이 문서의 비교 기준: 프레임워크를 고를 때는 기능 목록보다 다음 단계를 정하는 쪽을 먼저 본다. 코드가 그린 경로를 따르는지, 관리자 에이전트가 일을 배분하는지, 모델이 다른 에이전트에 대화를 넘기는지, 하나의 에이전트 루프가 도구 호출을 이어 가는지에 따라 제어 흐름의 재현성이 달라지고, 한도의 단위(super-step, 턴, 반복)와 재개 지점(checkpoint, RunState, session)도 프레임워크마다 다르다. 경로가 코드로 고정돼도 모델 노드의 출력은 결정론적이지 않다. 이 절은 LangGraph 행을 빼고 2026-11-08 공식 문서 기준이며, 확인하지 않은 항목은 미확인으로 적는다. LangGraph 행은 [[Agent-Graph-Engineering#사람 승인 노드의 실행 경계|그래프 엔지니어링]]의 2026-10-12 공식 문서 대조를 따른다.

| 프레임워크 | 다음 단계를 정하는 쪽 | 반복과 비용 한도 | 멈춤, 재개와 사람 입력 |
|---|---|---|---|
| LangGraph | 조건부 엣지의 routing function이 상태를 보고 다음 노드를 고른다. 상태에는 모델 노드의 출력이 들어갈 수 있다 | recursion limit, 비용 한도 미확인 | interrupt와 checkpointer로 멈추고, 재개하면 멈춘 노드를 처음부터 다시 실행 |
| CrewAI | sequential process는 정의한 task 순서. hierarchical process는 task를 미리 배정해 두지 않고 manager agent가 에이전트의 능력에 따라 배분하고 결과를 검토 | 최종 답까지의 최대 반복 수, 분당 요청 수 한도(속도 제한), 비용 한도 미확인 | 미확인 |
| Microsoft Agent Framework | graph workflow는 executor 사이의 edge(direct, 조건부, switch-case, fan-out, fan-in)가 정한다. 내장 orchestration은 패턴마다 달라 handoff는 에이전트끼리 제어를 넘기고 Magentic은 관리자 에이전트가 조정한다. Python에는 실험적인 functional API도 있다 | 미확인 | checkpointing을 명시적으로 켜면 graph workflow 기준 superstep이 끝날 때마다 checkpoint를 만들어 재개, request와 response로 사람 입력 대기 |
| OpenAI Agents SDK | LLM이 도구와 handoff로 정하거나 코드가 정하며, 섞을 수 있다 | `max_turns`를 넘으면 기본적으로 `MaxTurnsExceeded`(`max_turns=None`으로 끄거나 error handler로 정한 출력을 대신 돌려줄 수 있다), 비용 한도 미확인 | 승인 대기는 interruption으로 드러나고 `RunState`로 이어 간다. 오래 기다려야 하면 `RunState`를 직렬화해 저장했다가 복원한다 |
| Google ADK | template workflow agent(Python과 Go는 ADK 2.0부터 대체)는 오케스트레이션에 모델을 쓰지 않고 미리 정한 구조(순차, 병렬, 반복)로 실행한다. coordinator 방식에서는 coordinator의 instruction과 하위 에이전트의 description을 바탕으로 LLM이 `transfer_to_agent`로 위임하거나 `AgentTool`로 감싼 에이전트를 호출한다 | 반복은 종료 조건까지, 그 밖은 미확인 | 미확인 |
| Claude Agent SDK | Claude Code와 같은 에이전트 루프가 도구 호출이 없는 응답을 낼 때까지 진행하고, 하위 에이전트를 언제 몇 개 띄울지도 Claude가 Agent 도구로 정한다 | `max_turns`, `max_budget_usd`(둘 다 기본 무제한) | session ID로 재개, 사람 입력 미확인 |

- ADK 문서는 Python과 Go의 ADK 2.0부터 template workflow가 graph 기반 workflow와 동적 workflow 같은 더 유연한 구조로 대체됐다고 안내한다. graph 기반 workflow는 AI 에이전트와 결정적 실행 노드를 분기를 넣을 수 있는 그래프로 잇는다.
- Claude Agent SDK의 하위 에이전트는 별도 컨텍스트에서 일하고 마지막 메시지만 부모에게 돌려준다. 수십에서 수백 개 에이전트 규모의 실행은 오케스트레이션을 런타임이 대화 밖에서 실행하는 스크립트로 옮기는 Workflow 도구(TypeScript SDK v0.3.149 이상)로 처리할 수 있다. 스크립트는 Claude가 작성하고 런타임이 실행하므로 실행 중 다음 단계는 스크립트가 정한다([[Claude-Code-Dynamic-Workflows|동적 워크플로우]]).
- 위에서 다룬 ReAct 기반 자체 엔진은 모델이 매 턴 다음 행동을 정하는 루프 방식이고, 프레임워크를 쓰지 않으므로 표의 실행 한도와 재개 수단을 직접 구현한다([[Production-Agent-Architecture-Guardrails#프롬프트 계층화와 루프 가드레일|루프 가드레일]]).

같은 위임이라도 대화의 주도권이 다르다. OpenAI Agents SDK의 handoff는 전문 에이전트가 해당 실행(turn)의 나머지 동안 활성 에이전트가 되어 기본적으로 이전 대화 기록 전체를 보며(`input_filter` 등으로 바꿀 수 있다), 입력 guardrail은 handoff 사슬의 첫 에이전트에만 적용된다. agents-as-tools는 관리자 에이전트가 대화의 주도권을 유지한 채 `Agent.as_tool()`로 전문 에이전트를 부른다. Microsoft Agent Framework의 handoff orchestration은 기본적으로 대화형이어서 에이전트가 다른 에이전트로 넘기지 않고 응답하면 사용자에게 제어가 돌아간다. 런타임별 위임 방식의 다른 예는 [[Agent-Declarative-Runtime#위임 방식 세 가지|위임 방식 세 가지]]에 있다.

**판단 기준:**

1. 분기, 재시도와 승인 위치를 코드로 고정해야 하면 graph나 workflow 쪽을 쓴다. 입력마다 작업 분해가 달라 모델의 판단이 필요하면 LLM 위임 쪽을 쓰되, 실행 경로가 입력마다 달라질 수 있으므로 trace와 턴 한도, 비용 한도를 함께 두고 내장 한도가 없으면 직접 둔다([[LLM-Workflow-Patterns-Chain-vs-Agent#체인 워크플로우 vs 에이전트 워크플로우, 그리고 절충|체인과 에이전트의 판단 기준]]).
2. handoff처럼 대화 기록이 넘어가는 방식은 [[#컴포넌트 분업|컴포넌트 분업]]의 라우팅과 대화 전달 계약으로 전달 범위와 민감정보를 점검한다. OpenAI Agents SDK에서는 `input_filter` 등으로 조정한다.
3. 재개 때 외부 부수효과가 다시 실행될 수 있으므로 멱등 키나 기존 결과 조회를 둔다. OpenAI 문서는 승인이 도구 실행을 허용할 뿐 정확히 한 번의 실행을 보장하지 않는다고 적는다([[Harness-Anatomy#상태 복구와 외부 작업의 중복 방지는 별도다|상태 복구와 중복 방지]]).
4. 멈춘 실행이 남아 있는 동안 정의를 바꾸면 복원이 깨질 수 있다. Microsoft 문서는 복원한 workflow가 checkpoint를 만든 workflow의 구조와 executor 식별자를 유지해야 한다고 적으므로, 식별자를 유지하거나 정의 버전을 나눈다.

## Lazy Load 컨텍스트

Parent가 모든 규칙을 메모리에 들고 있으면 세션당 수십만 토큰이 낭비된다. 헤드리스 모드(매 요청마다 새 세션 생성)에서는 더 치명적이다.

전략은 Parent가 규칙 본문이 아닌 **주소만** 보유하는 것.

```
Parent: "SQL 작업이면 #sql-rules 참조"
        "보고서면 #report-rules 참조"
              ↓
Sub-agent가 자기 규칙만 런타임에 로드
```

부작용 효과:
- **유지보수**: 한 워커 규칙만 수정 → 다른 워커 무영향
- **권한 분리**: 보고서 워커의 BigQuery 직접 접근은 실제 도구와 자격증명 권한으로 제한한다. 규칙 파일 분리만으로 접근이 차단되지는 않는다.
- **토큰 절감**: 세션당 200K+ 절약 가능

## 출처
- [Agentic AI identity management — IBM](https://www.ibm.com/solutions/agentic-ai-identity-management)
- [Amazon Bedrock, Use multi-agent collaboration with Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html)
- [Amazon Bedrock API Reference, AssociateAgentCollaborator](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_AssociateAgentCollaborator.html)
- [CrewAI Docs, Processes](https://docs.crewai.com/en/concepts/processes)
- [CrewAI Docs, Hierarchical Process](https://docs.crewai.com/en/learn/hierarchical-process)
- [Microsoft Learn, Agent Framework Workflow capabilities](https://learn.microsoft.com/en-us/agent-framework/workflows/)
- [Microsoft Learn, Agent Framework Workflow concepts](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/)
- [Microsoft Learn, Agent Framework Workflow Edges](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/edges)
- [Microsoft Learn, Agent Framework Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)
- [Microsoft Learn, Agent Framework Orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/)
- [Microsoft Learn, Agent Framework Human-in-the-loop](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)
- [OpenAI Agents SDK, Agent orchestration](https://openai.github.io/openai-agents-python/multi_agent/)
- [OpenAI Agents SDK, Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [OpenAI Agents SDK, Running agents](https://openai.github.io/openai-agents-python/running_agents/)
- [OpenAI Agents SDK, Human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/)
- [Google ADK, Template agent workflows](https://adk.dev/agents/workflow-agents/)
- [Google ADK, Workflow patterns](https://adk.dev/workflows/patterns/)
- [Google ADK, Workflows: multi-agent, multi-node applications](https://adk.dev/workflows/)
- [Claude Agent SDK, How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- [Claude Agent SDK, Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents)
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain/Inform/Verify/Correct/HITL)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (구조화 조회, Progressive Disclosure 탐색)]]
- [[Agent-Graph-Engineering|그래프 엔지니어링]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트 워크플로우]]
- [[Claude-Code-Dynamic-Workflows|동적 워크플로우]]
