---
tags: [ai, agent, llm, tool-use, function-calling, orchestration]
status: done
verified_at: 2026-10-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent From Scratch", "에이전트 직접 만들기", "Tool Calling Loop", "도구 호출 루프", "Planner Executor"]
---

# 에이전트 직접 만들기: 도구 호출 루프, 계획과 실행, 메모리

LLM은 입력에 대한 텍스트를 생성할 뿐, 스스로 정보를 모으거나 여러 단계를 실행하지 못한다. 에이전트는 모델이 도구를 쓰고 환경과 상호작용하며 문제를 풀게 만드는 실행 구조다. 프레임워크 없이 한 번 직접 만들어 보면 모델, 오케스트레이션, 도구가 각각 무슨 일을 하는지 분명해진다. 결정론적 문제는 알고리즘(소프트웨어 1.0)으로, 패턴 기반의 비결정론적 문제는 학습 모델(2.0)로, 자연어로 지시하는 문제는 LLM(3.0)으로 푸는 구분과 그 상호 보완은 [[Software-3-0]]에 있다.

## 세 계층

| 계층 | 역할 |
|---|---|
| 모델 | 요청을 이해하고 다음 행동(답변 또는 도구 호출)을 정한다 |
| 오케스트레이션 | 모델 호출을 반복하고, 도구 호출을 실행하고, 계획, 상태, 오류, 종료를 관리한다. 하네스의 핵심이다 |
| 도구 | API 호출, DB 조회, 파일 작업처럼 실제 효과를 내는 함수 |

오늘 뉴스를 요약해 문서 도구에 기록하고 키워드를 메신저로 공유하는 요청이라면, 모델이 요약, 기록, 공유라는 계획을 세우고, 오케스트레이션이 이를 도구 호출 순서로 실행하며, 중간 결과(요약문, 키워드)를 상태로 들고 다니다가 최종 응답을 만든다. 하네스 전체 구성은 [[Harness-Anatomy]]에 있다.

## 1. 도구 호출 루프

모델은 도구를 직접 실행하지 않는다. 사용 가능한 도구의 이름, 설명, 입력 JSON Schema를 요청에 담아 보내면, 모델은 답변 대신 호출할 도구와 인자를 출력한다. 런타임이 그 도구를 실행하고 결과를 대화에 붙여 다시 모델을 부른다. 모델이 더 이상 도구를 부르지 않을 때까지 반복하는 것이 에이전트의 기본 루프다.

```ts
/** 모델이 도구 호출을 멈출 때까지 반복한다. */
const runAgent = async (userInput: string): Promise<string> => {
  const messages: Message[] = [{ role: 'user', content: userInput }];
  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const response = await model.generate({ messages, tools: toolSchemas });
    messages.push(response.message);
    if (response.toolCalls.length === 0) return response.text;

    // 한 응답에 여러 호출이 올 수 있다. 결과를 호출 ID로 짝지어 모두 돌려준다.
    const results = await Promise.all(response.toolCalls.map((call) => executeTool(call)));
    messages.push(...results.map((result) => ({ role: 'tool', toolCallId: result.callId, content: result.output })));
  }
  throw new AgentTurnLimitError(MAX_TURNS);
};
```

- 첫 번째 도구 호출만 처리하고 끝내면 에이전트가 아니라 한 번의 분기다. 결과를 모델에 돌려줘야 모델이 그 결과를 해석하고 다음 행동을 정한다.
- 한 응답에 도구 호출이 여러 개 올 수 있다고 가정한다. 각 결과는 호출 ID로 짝지어 돌려준다(공급자마다 `tool_use`와 `tool_result`, `function_call`과 `function_call_output`처럼 이름이 다르다).
- 도구 실행이 실패하면 예외로 루프를 깨기보다 오류 내용을 결과로 돌려줘 모델이 다른 방법을 시도하게 한다. 재시도해도 되는 오류와 사람에게 넘길 오류를 구분한다.
- 최대 반복 횟수, 비용 한도, 시간 제한을 둔다. 종료 조건이 없는 루프는 비용 사고가 된다. [[Agent-Loop-Engineering]]
- 모델이 만든 인자는 믿지 않는다. 스키마로 검증하고, 공급자의 strict 스키마 옵션을 쓰면 형식 위반을 줄일 수 있다.

## 2. 도구를 잘 정의한다

- 설명이 도구 선택 품질을 가장 크게 좌우한다. 무엇을 하는지, 언제 쓰고 언제 쓰지 않는지, 각 인자의 의미와 반환하지 않는 정보까지 적는다.
- 동작마다 도구를 따로 만들기보다 관련 동작을 `action` 인자를 가진 도구 하나로 묶으면 선택 모호성이 줄어든다. 여러 서비스에 걸치면 이름에 서비스 접두사를 붙인다.
- 도구 응답은 다음 판단에 필요한 필드만 안정적인 식별자와 함께 돌려준다. 불필요한 데이터는 컨텍스트를 낭비한다. [[Agent-Ready-API-Design]], [[Agent-Context-Budget]]

## 3. 계획과 실행

여러 단계가 필요한 요청(최근 글을 가져와 AI 관련 글만 걸러 요약하고 메일로 보내기)은 계획 단계와 실행 단계를 나눌 수 있다. 플래너는 모델에게 정해진 JSON 구조의 계획을 받아 오고, 실행기는 그 계획을 순서대로 실행한다.

```json
{
  "steps": [
    { "tool": "news_fetchLatest", "args": {}, "saveAs": "posts" },
    { "tool": "posts_filterByTopic", "args": { "topic": "AI" }, "inputFrom": "posts", "saveAs": "aiPosts" },
    { "tool": "posts_summarize", "args": {}, "inputFrom": "aiPosts", "saveAs": "summary" },
    { "tool": "mail_send", "args": { "to": "me" }, "inputFrom": "summary" }
  ]
}
```

- `saveAs`와 `inputFrom`은 단계 사이의 데이터 흐름이다. 앞 단계 결과를 이름 붙여 저장하고 뒤 단계가 이름으로 꺼내 쓴다.
- 실행 전에 계획을 검증한다. 등록된 도구만 허용하고, 인자는 스키마로, `inputFrom`이 앞 단계에서 정의된 이름인지 확인한다. 모델이 만든 계획을 그대로 실행하면 없는 도구 호출이나 잘못된 참조로 중간에 깨진다.
- 메일 발송, 결제, 삭제처럼 되돌릴 수 없는 단계 앞에는 사람의 승인을 두고, 재실행에 대비해 멱등하게 만든다. [[LLM-Workflow-Patterns#되돌릴 수 없는 행동 직전 승인: 또 하나의 절충|되돌릴 수 없는 행동 직전 승인]]
- 계획을 한 번에 다 세우고 실행하는 방식은 예측 가능하지만 중간 결과에 따라 계획을 바꾸기 어렵다. 단계마다 모델이 다음 행동을 고르는 루프 방식과의 절충은 [[LLM-Workflow-Patterns#Plan-and-Execute: 절충 패턴|Plan-and-Execute]]에 있다.

### 추천, 승인과 실행 결과를 별도 상태로 둔다

구매 후보를 추천하거나 장애 원인을 설명하는 응답은 발주나 설비 조작이 완료됐다는 증거가 아니다. 업무 자동화에 적용할 때는 추천 내용, 실행할 대상과 인자, 승인 여부, 실제 도구 실행 결과를 구분한다.

2026-10-09 Amazon Bedrock 공식 문서에서 확인한 구현 예는 다음과 같다.

- **사용자 확인:** 특정 action에 확인을 설정하면 사용자가 `CONFIRM` 또는 `DENY`로 결정한다. 해당 동작을 거부하면 실행하지 않는다. 모델이 필요하다고 판단한 것과 사용자가 승인한 것은 다른 상태다.
- **제어권 반환:** action group을 return control로 설정하면 호출 후보와 인자를 `invocationInputs`, 식별자를 `invocationId`로 애플리케이션에 돌려준다. 애플리케이션이 실행 결과를 같은 `invocationId`와 `actionGroup`에 연결해 `sessionState`로 반환한다.

이를 구매 업무에 적용한다면 추천 결과를 검토한 뒤 확정한 품목과 수량으로 실행하고, 발주 API의 결과를 확인해야 완료로 표시한다. 이는 공식 기능을 연결한 설계 예시이며 특정 제조 현장의 도입 성과나 설비 제어 안전성을 검증한 사례는 아니다. 제어권을 돌려받는 것만으로 승인, 인가와 중복 실행 방지가 구현되지는 않는다.

## 4. 메모리

- **작업 메모리**: 한 요청 안의 단계 결과. 위 `saveAs` 저장소가 여기에 해당하고 프로세스 메모리로 충분하다.
- **대화 기록**: 모델은 상태가 없으므로 이전 대화를 매 호출에 다시 보낸다. 길어지면 요약하거나 필요한 부분만 남긴다. [[Context-Engineering]]
- **장기 메모리**: 아까 가져온 것 중 AI 관련만 보내 달라는 식으로 이전 요청의 결과를 다시 쓰려면 저장소에 남긴다. 여러 인스턴스나 재시작을 견디려면 프로세스 메모리가 아니라 외부 저장소가 필요하고, 저장 범위와 만료, 사용자별 격리를 정한다.

## 직접 만들기와 프레임워크

직접 만든 구현은 원리를 익히기에 좋지만, 복잡한 흐름 제어, 재시도, 관측, 상태 저장까지 갖추려면 비용이 크다. LangGraph 같은 오케스트레이션 프레임워크나 공급자 SDK의 도구 실행 루프(Anthropic SDK의 Tool Runner 등)를 쓰면 루프와 도구 결과 처리를 맡길 수 있다. 어느 쪽이든 모델 출력은 비결정적이므로 검증, 한도, 승인, 평가는 직접 설계해야 한다. [[LLM-Eval-Strategy]]

## 체크포인트

- 모델, 오케스트레이션, 도구 계층이 각각 하는 일
- 도구 호출 결과를 모델에 돌려주는 루프가 필요한 이유와 병렬 호출 처리
- 도구 정의에서 설명, 통합, 응답 설계가 중요한 이유
- 모델이 만든 계획을 실행 전에 검증하는 항목과 되돌릴 수 없는 단계의 승인
- 작업 메모리, 대화 기록, 장기 메모리의 차이

## 출처

- [Amazon Bedrock, Get user confirmation before invoking action group function](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-userconfirmation.html)
- [Amazon Bedrock, Return control to the agent developer by sending elicited information in an InvokeAgent response](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html)
- [AI 에이전트를 만드는 방법 — kciter.so, kciter](https://kciter.so/posts/how-to-build-an-agent/)
- [Claude Docs, Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [OpenAI API Docs, Function calling](https://developers.openai.com/api/docs/guides/function-calling)

## 관련 문서

- [[Software-3-0|Software 3.0]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[Harness-Anatomy|하네스 구성도]]
- [[Agent-Loop-Engineering|루프 엔지니어링]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[AI-Anxiety-and-FOMO|AI 불안과 FOMO를 다루는 법]]
