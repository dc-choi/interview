---
tags: [ai, agent, workflow, orchestration, graph, human-in-the-loop]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Graph Engineering", "그래프 엔지니어링", "에이전트 실행 그래프", "Agent Execution Graph"]
---

# 그래프 엔지니어링 (Graph Engineering)

작업을 여러 노드로 나누고 노드 사이의 이동 경로, 전달할 상태와 분기 조건을 명시해 여러 모델과 코드, 사람이 하나의 실행 구조 안에서 일하게 설계하는 일이다. 한 에이전트에게 계획, 조사, 검증과 종료 판단을 모두 맡기는 대신 무엇을 먼저 하고 무엇을 동시에 할지, 실패하면 어디로 돌아갈지, 어떤 결정을 코드가 내리고 어느 순간 사람이 개입할지를 구조로 정한다. 목표는 모델을 더 똑똑하게 만드는 것이 아니라 똑똑한 모델의 실수가 구조 안에서 드러나고 걸러지게 하는 것이다.

## 이름과 범위

- 2026년 7월 무렵부터 쓰이기 시작한 이름이고 정의와 기원이 정립되지 않았다. 실행 흐름의 그래프를 가리키는 용법 외에 지식 그래프나 컨텍스트 그래프까지 같은 이름으로 묶는 글도 있다(2026-10-12 확인). 이 문서는 실행 그래프만 다룬다. 지식 쪽 그래프는 [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]], [[GraphRAG-Retrieval|GraphRAG 검색]], [[LLM-Wiki-Knowledge-Compilation|LLM 위키]]와 이 vault의 [[Development-Ontology|온톨로지]]에서 다룬다.
- 그래프 워크플로우와 상태 기계는 오래된 기법이다. 달라진 점은 노드 안에 모델 호출과 에이전트 루프가 들어간다는 것이다.
- 프롬프트(모델이 무슨 말을 듣는가), 컨텍스트(무엇을 아는가), 루프(어떻게 반복해 행동하는가) 다음에 그래프(여러 모델과 코드, 사람이 어떤 구조로 함께 움직이는가)를 놓는 계보는 업계의 프레이밍이다. 뒤 단계를 앞 단계의 상위 호환으로 설명하기도 하지만 대체 관계는 아니다. 노드마다 프롬프트와 컨텍스트의 품질이 여전히 결과를 좌우하고, 노드 안에서는 루프가 돈다. 새 용어를 기존 구조에 배치하는 기준은 [[Harness-Engineering#AI 활용의 진화: 프롬프트 → 컨텍스트 → 하네스 → 루프|AI 활용의 진화]]를 따른다.

## 구성 요소: 노드, 엣지, 상태, 조건

| 요소 | 뜻 | 설계 질문 |
|---|---|---|
| 노드 | 한 가지 책임을 맡은 작업 단위. 모델 호출, 에이전트 루프, 결정론적 함수와 사람의 결정이 모두 노드가 된다 | 입력, 산출물과 완료 기준은 무엇인가 |
| 엣지 | 다음 작업으로 가는 경로. 앞 노드로 되돌아가는 엣지가 있으면 그래프 안에 루프가 생긴다 | 끝나면 어디로 가고 실패하면 어디로 돌아가는가 |
| 상태 | 노드 사이에 전달되고 쌓이는 정보 | 어느 노드가 어떤 값을 쓰고, 병렬 결과는 어떻게 합치는가 |
| 조건 | 다음 경로를 고르는 규칙 | 이 분기를 코드가 판정하는가, 모델이나 사람이 판단하는가 |

LangGraph의 Graph API는 같은 구성을 State, Node, Edge와 조건부 엣지로 제공한다. 조건부 엣지는 노드 실행 뒤 현재 상태를 받아 다음 노드를 돌려주는 routing function이다. 한 노드에서 여러 엣지가 나가면 도착 노드들이 다음 super-step에서 병렬로 실행되고, 상태의 키마다 지정한 reducer가 업데이트를 반영한다. 기본 reducer는 기존 값을 덮어쓰므로 병렬 노드의 결과를 한 키에 모으려면 누적 reducer를 지정한다(2026-10-12 공식 문서 기준).

단일 에이전트가 유능한 직원 한 명에게 모든 업무를 맡기는 방식이라면, 그래프는 조직도와 업무 규정을 설계하는 쪽에 가깝다. 누가 조사하고 누가 검증하는지, 어떤 경우에 다시 일을 시키는지, 어떤 결정은 대표가 직접 승인하는지를 미리 정해 둔다.

## 노드로 나누는 이유

경쟁사 분석, 보고서 작성과 사실 검증을 한 에이전트에 맡기면 결과가 틀렸다는 사실은 알아도 계획, 검색, 해석과 검증 중 어디서 틀렸는지 알기 어렵다. 조사를 충분히 했는지, 무엇을 기준으로 충분하다고 봤는지, 틀린 정보를 그냥 넘겼는지가 모두 모델 내부의 판단으로 남는다.

- 노드마다 책임과 완료 기준을 명시하고 중간 산출물을 따로 확인할 수 있다.
- 기준에 못 미친 노드만 다시 실행한다.
- 서로 의존하지 않는 노드를 동시에 실행해 전체 시간을 줄인다.

## 판단의 분담: 코드, 모델, 사람

정답이 하나로 정해지지 않는 판단은 모델이나 사람이 맡고, 반드시 지켜야 하는 규칙은 코드가 판정한다.

| 대상 | 맡는 쪽 | 예 |
|---|---|---|
| 개수, 존재와 한도 | 코드 | 경쟁사 수가 기준 이상인가, 수치마다 출처가 붙었는가, 최대 재시도 횟수와 지출 한도 |
| 정답이 하나가 아닌 생성과 판단 | 모델, 판정 모델이나 사람 검토 | 검색어 생성, 문서 요약과 결과 작성, 출처가 그 수치를 실제로 뒷받침하는가, 두 시장 중 어느 쪽이 매력적인가 |
| 방향과 되돌리기 어려운 행동 | 사람 | 만들 제품의 결정, 외부 발송과 결제 |

- AI가 필요 없는 노드에는 AI를 쓰지 않는다. 숫자를 세는 일을 모델에 물으면 비용과 비결정성만 늘어난다.
- 사람 승인이 필요한지도 모델이 고르지 않고 코드 규칙으로 정한다. 되돌릴 수 없는 행동 앞의 승인 배치는 [[LLM-Workflow-Patterns-Chain-vs-Agent#되돌릴 수 없는 행동 직전 승인: 또 하나의 절충|되돌릴 수 없는 행동 직전 승인]]을 따른다.
- 코드가 확인할 수 있는 것은 출처의 존재와 개수까지다. 출처가 주장에 적용되고 그 주장을 지지하는지는 별도 판정이 필요하다([[LLM-Hallucination-Verification#지시문으로 줄이고 검사로 막는다|존재, 적용과 지지 검사]]). 규칙을 코드에 두는 일반 원칙은 [[LLM-Hallucination-Verification#규칙은 코드가 판정하고 모델은 설명한다|규칙은 코드가 판정하고 모델은 설명한다]], 어떤 규칙을 강제 층으로 내릴지는 [[Harness-Gate-Placement|게이트 배치]]가 정본이다.

## 기본 패턴

| 패턴 | 구조 | Anthropic, LangGraph 문서의 이름 |
|---|---|---|
| 라우터 | 입력을 분류해 맞는 노드나 에이전트로 보낸다 | Routing |
| 병렬 실행 | 독립된 하위 작업을 동시에 실행하고 결과를 취합한다 | Parallelization |
| 생성자와 평가자 | 생성 노드의 결과를 평가 노드가 확인하고, 미달이면 피드백과 함께 되돌린다 | Evaluator-optimizer |
| 사람 승인 | 중요한 결정 앞에서 그래프를 멈추고 승인, 거절이나 수정을 받아 이어 간다 | LangGraph의 interrupt 기반 human-in-the-loop |

두 문서는 앞 호출의 출력을 다음 호출이 이어받는 prompt chaining과 중앙 모델이 하위 작업을 동적으로 나눠 작업자 모델에 맡기고 결과를 합치는 orchestrator-workers도 함께 든다. 생성자와 평가자 패턴은 평가 기준이 분명할 때 효과가 크다. 패턴은 섞어 쓴다. 모델이 계획을 데이터로 내놓고 코드가 집행하는 절충은 [[LLM-Workflow-Patterns-Chain-vs-Agent#Plan-and-Execute: 절충 패턴|Plan-and-Execute]]에 있다.

## 예시: 실패 항목을 해당 노드로 되돌리는 조사 그래프

신규 SaaS의 시장 규모, 경쟁사와 고객 문제를 조사해 만들 제품을 제안하는 작업을 그래프로 나눈 설계 예시다. 숫자 기준은 설명을 위한 값이다.

1. **요청 분석과 계획:** 요청을 해석하고 하위 작업과 노드별 완료 기준을 정한다.
2. **병렬 조사:** 시장 규모, 경쟁사, 고객 문제 노드를 동시에 실행한다. 경쟁사는 최소 10곳, 시장 규모 수치에는 출처, 고객 문제에는 실제 사용자 의견 최소 20건처럼 노드마다 기준을 둔다.
3. **취합:** 각 노드의 결과가 상태에 쌓이고 취합 노드가 합친다.
4. **검증:** 출처가 충분한지, 경쟁사 수가 기준을 넘는지, 시장 규모 수치끼리 충돌하지 않는지, 고객 문제가 수집한 의견에서 나왔는지 확인한다.
5. **선택적 복귀:** 미달 항목만 해당 노드로 되돌린다. 경쟁사가 5곳이면 경쟁사 노드로, 시장 규모의 출처가 부족하면 시장 규모 노드로 간다. 다시 조사할지를 모델의 감으로 정하지 않고 재시도 조건과 경로를 그래프에 둔다.
6. **제안과 사람 승인:** 제안 노드가 만들 제품의 방향을 내면 그래프를 멈추고 진행 여부를 묻는다. 승인하면 다음 노드로 넘어가고, 거절하면 제안 노드로 돌아가 다른 방향을 찾는다.

검증 노드 다음 경로를 코드가 고르는 부분만 떼면 다음과 같다. 프레임워크와 무관한 routing function 예시이며, LangGraph라면 검증 노드 뒤에 조건부 엣지로 연결한다.

```ts
const NextNode = {
  COMPETITORS: 'competitors',
  MARKET: 'market',
  NEEDS_REVIEW: 'needsReview',
  SUPPORT_CHECK: 'supportCheck',
} as const;
type NextNode = (typeof NextNode)[keyof typeof NextNode];

interface ResearchState {
  readonly competitors: readonly string[];
  readonly marketFigures: readonly { readonly value: number; readonly sourceUrl?: string }[];
  readonly retries: Readonly<Record<'competitors' | 'market', number>>;
}

const MIN_COMPETITORS = 10;
const MAX_RETRIES = 2;

/**
 * 검증 노드 다음 경로를 고른다. 개수와 출처의 존재처럼 코드로 확인할 수 있는 조건만 판정한다.
 * @param state 병렬 조사 결과와 노드별 재시도 횟수
 * @returns 다음에 실행할 노드
 */
const routeAfterVerify = (state: ResearchState): NextNode => {
  const lacksCompetitors = state.competitors.length < MIN_COMPETITORS;
  const lacksSources = state.marketFigures.some((figure) => !figure.sourceUrl);
  const canRetryCompetitors = lacksCompetitors && state.retries.competitors < MAX_RETRIES;
  const canRetryMarket = lacksSources && state.retries.market < MAX_RETRIES;
  const hasUnmetCriteria = lacksCompetitors || lacksSources;

  if (canRetryCompetitors) {
    return NextNode.COMPETITORS;
  }
  if (canRetryMarket) {
    return NextNode.MARKET;
  }
  if (hasUnmetCriteria) {
    return NextNode.NEEDS_REVIEW;
  }
  return NextNode.SUPPORT_CHECK;
};
```

- 재시도 횟수는 해당 조사 노드가 다시 실행될 때 상태에 올리고, 한도에 닿으면 사람 검토로 보낸다. 한도가 없으면 기준을 채우지 못하는 노드가 비용만 쓰며 계속 돈다.
- 예시는 미달 노드를 하나씩 되돌린다. LangGraph의 routing function은 노드 목록을 돌려줄 수도 있어, 미달 노드들을 다음 super-step에서 함께 다시 실행할 수 있다.
- LangGraph는 한 실행의 super-step 수를 recursion limit으로 제한하고, 넘으면 `GraphRecursionError`를 낸다. 1.0.6부터 기본값은 1,000이다(2026-10-12 공식 문서 기준). 전역 한도는 마지막 방어선이고, 노드별 재시도 정책은 위처럼 업무 기준으로 따로 둔다.
- `supportCheck`는 출처가 수치를 실제로 뒷받침하는지, 시장 규모 수치들의 정의와 기준 연도가 맞는지처럼 코드로 판정할 수 없는 항목을 모델 판정이나 사람 검토에 맡기는 노드다.

## 사람 승인 노드의 실행 경계

2026-10-12 공식 문서로 확인한 실행 경계다.

- **LangGraph의 interrupt:** 실행을 멈추고 외부 입력을 기다린다. 멈춘 상태를 이어 가려면 checkpointer와 `thread_id`가 필요하고, 운영에는 영속 checkpointer를 쓴다. `Command(resume=...)`로 재개하면 멈춘 줄이 아니라 그 노드의 처음부터 다시 실행한다.
- **승인 전 부수효과:** 그래서 interrupt 앞에서 실행한 기록 생성이나 API 호출은 재개 때 다시 실행된다. 멱등하게 만들거나, 승인 뒤로 옮기거나, 별도 노드로 분리한다. 상태 복구와 외부 작업 중복의 일반 경계는 [[Harness-Anatomy#상태 복구와 외부 작업의 중복 방지는 별도다|상태 복구와 중복 방지]]를 따른다.
- **거절 뒤의 재시도:** 한 노드 안에서 interrupt를 반복 호출하는 루프는 재개할 때마다 앞선 반복을 다시 실행하므로 피한다. 노드 호출마다 interrupt는 한 번만 부르고, 다시 물어야 하면 조건부 엣지로 되돌아오게 한다. 거절하면 제안 노드로 돌아가는 경로도 같은 방식으로 엣지에 둔다.
- **Claude Code 동적 워크플로우:** 실행 중에는 사용자 입력을 받지 않는다. 단계 사이에 승인이 필요하면 단계마다 별도 워크플로우로 나눠 실행한다.

## 루프와의 관계

- 루프는 한 에이전트가 정지 조건까지 반복하는 구조이고, 그래프는 여러 노드 사이의 이동 규칙이다. 노드 하나가 안에서 루프를 돌 수도 있고, 노드 몇 개와 되돌아가는 엣지가 모여 하나의 루프가 될 수도 있다. 생성자와 평가자 패턴은 그래프로 그린 검증 루프다.
- 그래서 그래프는 루프를 대체하지 않고 품는다. 각 루프의 정지 조건과 가드는 [[Agent-Loop-Engineering|루프 엔지니어링]]이 정본이다.
- Claude Code의 [[Claude-Code-Dynamic-Workflows|동적 워크플로우]]는 스크립트가 루프, 분기와 중간 결과를 직접 쥐는 방식이어서 실행 그래프를 코드로 적은 형태로 볼 수 있다. 그래프를 사람이 처음부터 그릴 필요는 없고, 모델이 오케스트레이션 초안을 쓰고 사람이 검토하는 방식도 가능하다.

## 쓰지 않을 때와 비용

- 간단한 요약, 짧은 질의응답, 한두 번의 도구 호출로 끝나는 작업은 그래프로 만들지 않는다. 노드와 엣지가 늘수록 디버깅 지점과 상태 계약이 늘고, 모델을 부르는 노드가 늘수록 비용도 커진다.
- Anthropic은 가장 단순한 해법을 먼저 찾고 필요할 때만 복잡도를 올리라고 권하며, 여기에는 에이전트 시스템을 만들지 않는 선택도 포함된다. 에이전트 시스템은 대개 지연과 비용을 더 나은 과제 성능과 맞바꾼다. Claude Code 문서도 워크플로우 한 번의 실행이 같은 작업을 대화로 처리할 때보다 상당히 많은 토큰을 쓸 수 있다고 안내한다(2026-10-12 확인).
- 그래프가 이득인 지점은 여러 단계, 조건 분기, 병렬 처리, 실패 지점으로의 복귀, 중간의 사람 개입과 결과 검증이 함께 필요하고 이를 거버넌스로 통제해야 할 때다. 하나의 에이전트 루프로는 관리하기 어려워지는 지점이다. 업무의 예측 가능성으로 체인과 에이전트를 고르는 기준은 [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]], 역할 분리의 비용 비교는 [[Harness-Engineering#멀티 에이전트 오케스트레이션|멀티 에이전트 오케스트레이션]]을 따른다.
- 에이전트가 실제 업무를 더 맡을수록 개별 에이전트 성능보다 그래프 설계가 결과 품질을 좌우하게 된다는 주장이 이 계보에 따라붙는다. 측정으로 확인된 결론이 아니라 전망이다. 다만 작업 분할, 병렬 지점, 검증 지점, 복귀 경로와 사람에게 넘길 결정은 모델이 좋아져도 누군가 정해야 하는 설계 결정으로 남는다.

## 면접 체크포인트

- 노드, 엣지, 상태, 조건을 설명하고 그래프가 루프를 품는 관계를 말할 수 있는가
- 단일 에이전트에서 실패 지점이 보이지 않는 이유와 노드 분할이 주는 관찰, 부분 재실행의 이득
- 코드, 모델, 사람의 판정 분담. 개수와 존재는 코드, 지지 여부는 판정, 방향 결정은 사람
- 검증 실패를 해당 노드로만 되돌리는 경로, 노드별 재시도 한도와 전역 단계 한도의 역할 차이
- 사람 승인 노드의 재개 방식과 승인 전 부수효과의 멱등성
- 그래프로 만들지 않아야 할 작업과 비용, 복잡도의 트레이드오프

## 출처

- [또다른 트렌드 Graph Engineering 알려드림 — YouTube, 코드팩토리](https://www.youtube.com/watch?v=SBLDc4R1d_E)
- [Building effective agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
- [LangGraph, Graph API overview](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph, Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangGraph, Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Claude Code Docs, Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows)
- [Graph Engineering Is Two Ideas Wearing One Name — Hightower's AI Harness Engineering, Rick Hightower](https://rickhigh.substack.com/p/graph-engineering-is-two-ideas-wearing)
- [What Is Graph Engineering for AI Agents? Execution Graphs, Context Graphs, and Loops — PuppyOne](https://www.puppyone.ai/en/blog/graph-engineering-ai-agents-map)

## 관련 문서

- [[Agent-Loop-Engineering|루프 엔지니어링 (정지 조건, 4중 루프, 3종 가드 — 노드 안과 되돌아가는 엣지에서 도는 반복)]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (체인 vs 에이전트, Plan-and-Execute, 되돌릴 수 없는 행동 직전 승인)]]
- [[Claude-Code-Dynamic-Workflows|Claude Code 동적 워크플로우 (계획을 스크립트로 옮긴 오케스트레이션)]]
- [[Harness-Engineering|하네스 엔지니어링 (진화 사다리, 멀티 에이전트 오케스트레이션의 비용)]]
- [[Harness-Anatomy|하네스 구성도 (루프 가드, 상태 복구와 외부 작업 중복 방지)]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증 (규칙은 코드가 판정, 인용의 존재와 적용과 지지)]]
- [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (검증 노드의 채점 기준과 완료 선언 차단)]]
- [[AI-Native-Org|AI 네이티브 조직 (상태 전이마다 사람 개입점을 고정한 사례)]]
- [[Agent-From-Scratch|에이전트 직접 만들기 (계획 검증과 단계 사이 데이터 흐름)]]
- [[GraphRAG-Retrieval|GraphRAG 검색 (같은 그래프라는 이름을 쓰는 지식 쪽 구조)]]
