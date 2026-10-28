---
tags: [palantir, agent, session, state-machine, event]
status: done
verified_at: 2026-10-28
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Agent Stack"]
---

# Agent Stack의 session, context와 event

Agent Stack은 한 번의 chat completion보다 오래 지속되는 업무를 session, typed context items와 event/state machine으로 연결하는 기반이다. 여러 참여자가 다른 앱에서 같은 task에 기여하고 agent가 검토를 기다렸다가 입력이 오면 이어갈 수 있다.

## 세 가지 계약을 나눈다

| 요소 | 역할 |
|---|---|
| Session | Task의 상태, context와 event history를 묶고 진행을 유지 |
| Context item | Message/tool result와 구조화된 제안/결정을 strongly typed 정보로 표현 |
| Event/handler | 새 입력과 현재 상태를 바탕으로 정보 갱신, 작업 수행과 state transition 결정 |

사람에게는 interactive view, 자동화에는 structured data, 개발자에게는 실행 세부를 같은 context item에서 제공한다. Waiting for review 같은 state는 agent의 workflow에서 정의할 수 있다. Session이 무기한 지속될 수 있다는 제품 설명을 모델 context에 과거 전체가 매번 그대로 들어가거나 모든 데이터가 무제한 보존된다는 보장으로 확대하지 않는다.

## 작성, 관측과 소비를 연결한다

Agent Builder의 시각적 instructions/tools/preview/publish, Palantir Agent SDK의 custom state/context/event handler, third-party SDK template 또는 custom integration을 사용할 수 있다. Published agent는 Compass resource로 project/folder에 정리하고 resource permission을 관리한다.

Agent Manager에서 sessions의 context/event/state와 traces/logs를 조사한다. 다른 앱에서 시작한 session도 mandatory/discretionary 접근 조건을 충족해야 볼 수 있다. UI에서 보이는 진행 이력과 내부 모델 판단의 정확성은 별도로 검토한다.

Workshop은 session을 embed하고, Automate는 trigger에 따라 session 생성 또는 event 전송을 수행한다. Agent platform APIs는 외부 앱/service/function 통합에 사용한다. **확인일 기준 agents in OSDK와 AIP Logic의 session/event 통합은 coming soon**으로 표시되므로 사용 가능한 계약으로 설계하지 않는다.

이는 [[Palantir-Pro-Code-Agents]]의 async Void function 호출과 구별할 개념이다. 같은 agent라는 이름만으로 반환값, tool 지원과 session API를 서로 대체하지 않는다. 실제 SDK/API endpoint와 permissions는 대상 integration 문서를 추가 확인한다.

## Agent SDK로 실행 계약을 코드에 둔다

Palantir Agent SDK는 TypeScript로 Agent Stack의 agent를 정의하고 Foundry resource로 발행하는 경로다. System prompt와 tools에서 시작해 custom context item, event와 effect로 동작을 확장할 수 있다. 사람의 검토, 별도 관측 화면과 결정론적 로직을 결합하는 용도이며, 모델 비종속 설계로 open-source와 sovereign model 호출도 지원한다. 개별 모델의 도구 호출 호환성과 접근 조건까지 동일하다는 보장은 아니다.

생성 예제의 `defineAgent`에서는 모델과 도구뿐 아니라 `agentStateSchema`, `createSessionArgsSchema`, `createSession`, `contextItemDefinitions`를 정의한다. 세션 생성 인자, 초기 상태와 공유 정보의 타입을 구분해 읽는다. 예제에 나온 모델이나 토큰 설정을 SDK 전체의 고정값으로 해석하지 않는다.

## 생성, 버전 발행과 세션 실행을 구분한다

1. Project에서 `+ New > Agent > Build in code`를 선택하고 repository 이름과 agent 이름을 각각 지정한다.
2. Ontology binding은 선택 사항이며, 연결하면 agent API name은 해당 Ontology 안에서 고유해야 한다.
3. 생성된 repository의 agent 정의를 수정한다. Compass에 Agent resource가 생겨도 아직 발행된 버전은 없다.
4. 변경을 commit한 뒤 Checks를 확인하고 Tags에서 semantic version을 선택해 발행한다.
5. 발행 성공 후 Agent Manager에서 session을 시작하고 응답, messages, events와 context items를 확인한다.

Getting started는 Ontology binding을 SDK를 통한 코드 사용과 연결해 설명하지만, Agent Stack 개요는 agents in OSDK를 여전히 coming soon으로 표시한다. 따라서 binding 설정 가능과 OSDK 통합의 실제 제공 여부를 구분하고, 대상 환경에서 확인하기 전에는 OSDK 호출을 전제로 설계하지 않는다.

2026-10-28 공식 개요와 시작 가이드를 대조했다. 저장소 생성, 발행과 세션 실행을 실제 환경에서 시험한 기록은 아니다.

## 출처

- [Palantir, The Agent Stack](https://www.palantir.com/docs/foundry/aip/agent-stack)
- [Palantir, Agent SDK overview](https://www.palantir.com/docs/foundry/agent-sdk/overview)
- [Palantir, Get started with the Agent SDK](https://www.palantir.com/docs/foundry/agent-sdk/getting-started)

## 관련 문서

- [[Palantir-Pro-Code-Agents|함수 배포형 agent]]
- [[Palantir-AI-FDE-and-Skills|대화형 개발 agent]]
- [[Palantir-AIP-Observability|실행 관측과 보호]]
