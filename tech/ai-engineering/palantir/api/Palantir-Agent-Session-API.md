---
tags: [palantir, foundry, api, agent, session, event]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Agents API", "Agent Definition Version API"]
---

# Agents API의 정의 버전과 세션

Platform API v2의 Agents 그룹(`/api/v2/agents/...`)은 agent 정의 버전을 조회하고 세션을 만들어 event를 보내는 계약이다. API reference는 이 그룹을 [[Palantir-Agent-Stack-Sessions|Agent Stack]]과 직접 연결해 설명하지 않는다. Agent Stack 개요가 Agent platform APIs로 자체 앱, 서비스와 Function에서 세션을 만들고 event를 보낸다고 설명하고 세션, event, semantic version 용어가 맞아 같은 대상으로 읽을 수 있다는 것은 해석이다. 세션 조회에 UnsupportedAgent(400)가 문서화돼 있으므로 Agent Stack으로 발행한 모든 agent가 이 API를 지원한다고 가정하지 않으며, 지원하는 agent 종류는 reference에 나와 있지 않다. 같은 문서 사이드바에 AIP Chatbot Studio 그룹(`/api/v2/aipAgents/...`)이 따로 있으며, 그쪽의 Agent는 Chatbot Studio로 만든 chatbot을 뜻한다([[Palantir-Chatbot-Version-API]]). 두 그룹은 경로, scope, 버전 형식과 세션 진행 방식이 달라 서로 대체하지 않는다.

2026-11-24 확인 기준 이 그룹의 endpoint는 모두 Preview라서 `preview=true`가 필요하고 예고 없이 바뀌거나 제거될 수 있다. OAuth2로 호출하는 third-party application은 조회에 `api:agents-read`, 세션 생성과 event 전송에 `api:agents-write` operation scope를 요청해야 한다.

## 정의 버전은 발행 뒤 바뀌지 않는다

Agent Definition Version은 agent 정의의 한 버전이며 발행 뒤에는 바뀌지 않는다. 문서화된 endpoint는 특정 버전 조회 하나다. 이 그룹에는 정의 목록이나 버전 목록 endpoint가 없다.

`GET /api/v2/agents/agentDefinitions/{agentDefinitionApiName}/versions/{agentDefinitionVersionVersion}`

- 경로의 agent는 RID가 아니라 API name으로 식별하고, query `ontology`에 Ontology의 API name이나 RID를 준다. reference는 이 query를 선택 항목으로 표시하지 않는다. Agent Stack에서 Ontology binding은 선택이고 세션 응답의 API name 식별자도 binding이 없으면 비므로, binding 없는 agent의 정의 버전을 조회하는 경로는 문서에서 확인되지 않는다(해석).
- 버전 문자열은 `<major>.<minor>.<patch>-<tag>`(tag 선택, 예: `1.2.3`, `1.2.3-rc1`)다. Chatbot Studio 버전의 `major.minor`와 형식이 달라 같은 파서를 쓰지 않는다.
- 응답 `AgentDefinitionVersion`에는 version, createdTime, createdBy와 함께 선택 목록 argumentDefinitions, eventDefinitions, contextItemDefinitions, 그리고 필수 agentStateType이 있다. agentStateType의 type은 event payload나 context item 데이터 등 한 데이터 조각의 schema를 기술하는 공용 data type union이다. 이 필드들을 Agent SDK `defineAgent`의 세션 생성 인자, event, context item 정의와 상태 schema에 대응시키는 것은 해석이며, Agent Builder의 입력도 argumentDefinitions에 대응할 수 있다.
- argumentDefinitions의 각 항목은 name, dataType과 필수 필드 requirement를 가진다. requirement는 세션을 시작할 때 호출자가 반드시 주는 required와 생략할 수 있는 optional의 union이다. optional은 선택 필드 defaultValue를 가질 수 있고, 있으면 인자를 생략했을 때 agent runtime이 쓰는 기본값이다. 기본값 없는 optional 인자도 있을 수 있다. deprecated 필드 isOptional은 false이거나 없으면 기본값이 선언되지 않은 한 필수라는 뜻이며, 필수 여부는 requirement로 판단한다. 세션 생성에서 키를 빼는 것과 null을 보내는 것이 구분되므로(아래 생성 요청), 기본값은 키를 뺐을 때 적용된다고 읽는다. dataType이 nullable이면 null도 정당한 명시 값일 수 있고, null을 보냈을 때 기본값이 쓰이는지는 문서에 없다(2026-11-23 수집한 reference 본문 기준, 라이브 페이지는 자식 필드를 접어 두고 예시에 required만 보여 준다).
- argument의 dataType, event의 payloadType, agentStateType과 context item의 dataType은 같은 data type union을 쓴다. 하위 type은 date, timestamp, string, boolean, short, integer, long, float, double, list(elementType), record(valueType), struct(fields), nullable(wrappedType), discriminatedUnion(discriminatorKey와 members), object, objectSet이다. struct field와 union member field의 isOptional은 없으면 필수다. 값의 JSON 표현은 struct, list, nullable, record, discriminatedUnion, objectSet, object만 설명돼 있고, date, timestamp, 숫자 type, string, boolean의 표현(날짜 형식, long을 JSON 숫자로 보내는지)은 reference에 없다. record는 임의 문자열 키와 같은 type의 값을 가진 객체, discriminatedUnion은 discriminatorKey 이름의 속성으로 member를 고른 뒤 나머지 속성이 그 member의 fields를 따르는 객체, objectSet은 object set RID 문자열, object는 `ontologyRid`, `objectTypeApiName`, `primaryKey`(property API name과 값의 객체)를 가진 객체다. object와 objectSet의 type 정의는 Ontology를 ontologyApiName으로 적지만 object 값 예시는 RID로 적으므로, 정의와 값의 Ontology 식별자 형식이 다르다고 보고 둘을 같은 문자열로 비교하지 않는다(2026-11-23 수집한 reference 본문 기준).
- 2026-11-23 수집한 reference 본문 기준(라이브 페이지는 이 하위 설명을 접어 둔다), eventDefinitions는 세션 생성 뒤 agent로 보낼 수 있는 event 종류를 eventType(discriminator 값)과 payloadType으로 선언한다. contextItemDefinitions는 세션 안의 강하게 타입이 정해진 context 데이터 단위를 contextItemType과 dataType으로 선언하며, reference는 이를 세션 UI를 만드는 데 쓸 수 있다고 설명한다. 둘 다 agent를 발행할 때 선언되므로 발행한 버전에 없는 event나 context item을 클라이언트가 임의로 추가할 수 없다고 읽는다(해석).
- 오류는 AgentDefinitionNotFound, AgentDefinitionVersionNotFound, OntologyNotFound, ObjectTypeNotFound(404)와 UnsupportedDataType(400)이다. 마지막은 그 버전이 이 API가 지원하지 않는 data type을 담았다는 뜻이다. 발행된 버전은 바뀌지 않으므로 재시도로는 풀리지 않고, 그 type을 뺀 새 버전을 발행하거나 API 지원이 추가됐는지 확인한다(운영 판단).

## 세션은 비동기로 진행한다

세션은 특정 버전의 agent 정의를 실행한 단위다.

| 작업 | Endpoint | Scope |
|---|---|---|
| 생성 | `POST /api/v2/agents/agentSessions` | `api:agents-write` |
| 메타데이터 조회 | `GET /api/v2/agents/agentSessions/{agentSessionId}` | `api:agents-read` |
| Event 전송 | `POST /api/v2/agents/agentSessions/{agentSessionId}/sendEvent` | `api:agents-write` |
| 상태 조회 | `GET /api/v2/agents/agentSessions/{agentSessionId}/getSessionState` | `api:agents-read` |

- 생성 요청에는 agent와 agentVersion이 필수이고 arguments는 인자 이름과 JSON 값의 map이다. 키를 빼면 undefined, 값을 비우면 null로 구분한다. 응답 `AgentSession`은 세션 id, agentRid, agentVersion과 Ontology binding이 없으면 비는 API name 식별자를 준다.
- 세션 생성과 event 처리는 agent 로직을 실행하므로 플랫폼 데이터를 바꿀 수 있다. 조회처럼 다루지 않고, Agent Builder의 사전 계산 Action처럼 세션 시작만으로 부수 효과가 생길 수 있음을 함께 본다.
- sendEvent는 event를 비동기 처리로 받아들였다는 결과(accepted)와 consistencyKey를 돌려준다. 수락은 처리 완료가 아니다. 세션이 아직 시작되지 않았으면 sessionNotReady가 오며 잠시 뒤 다시 보낸다.
- getSessionState에 consistencyKey를 주면 그 지점 이후의 상태를 요구한다. 서버가 아직 그 지점을 보지 못했으면 behind(세션 시작 여부와 무관), 세션이 시작 전이라 읽거나 event를 받을 수 없으면 notReady, 준비됐으면 available이 온다. 키를 생략하면 서버가 가진 최신 상태를 준다. 형식이 맞지 않는 키는 InvalidConsistencyKey(400)라 재시도로 풀리지 않는다.
- 이 그룹에는 세션 목록, 취소나 삭제 endpoint가 없다. 버전별 세션 조사와 취소는 Agent Manager 화면에서 한다.

### 운영 제안

event를 보낸 뒤 그 결과를 확인하려면 sendEvent의 consistencyKey로 상태를 조회하고, behind나 notReady는 간격을 두고 재시도한다. 키 없이 조회한 상태는 방금 보낸 event를 반영하지 않았을 수 있다. 공식 문서가 event 순서 보장, 중복 전송 방지(idempotency)와 세션 만료를 이 API 페이지에 적지 않았으므로, 같은 event를 다시 보내도 한 번만 처리된다고 가정하지 않는다. 문서상 handler가 큐 순서대로 처리된다는 설명은 Agent SDK 쪽 계약이다([[Palantir-Agent-Stack-Sessions]]).

권한 오류는 작업별로 나뉜다(CreateAgentSessionPermissionDenied, SendEventPermissionDenied, GetSessionStatePermissionDenied, 403). 세션 메타데이터 조회의 UnsupportedAgent(400)는 대상 agent가 이 API를 지원하지 않는다는 뜻이다. 생성 실패 CreateAgentSessionFailed(500)는 세션 id를 주지 않고 API에는 세션 목록도 없으므로, 재시도 전 중복 생성 여부는 Agent Manager에서 그 버전의 세션을 찾거나 클라이언트가 자신의 생성 시도를 기록해 확인한다(운영 제안). 404 계열 처리는 [[Palantir-API-Client-Contract]]를 따른다.

공개 API reference의 계약을 대조했다. 실제 세션 생성, event 전송과 상태 조회는 시험하지 않았다. event 객체의 schema는 문서에 펼쳐져 있지 않고, Send Event 예제가 id, `@platform/send-user-message` 같은 eventType과 payload(parts의 type, text)의 모양만 보여 주므로 예제를 완전한 계약으로 쓰지 않는다. available 상태의 하위 필드도 확인하지 못했다.

## 출처

- [Palantir, Agent Definition Version basics](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-definition-versions/agent-definition-version-basics/)
- [Palantir, Get Agent Definition Version](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-definition-versions/get-agent-definition-version/)
- [Palantir, Agent Session basics](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-sessions/agent-session-basics/)
- [Palantir, Create Agent Session](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-sessions/create-agent-session/)
- [Palantir, Get Agent Session](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-sessions/get-agent-session/)
- [Palantir, Send Event](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-sessions/send-event/)
- [Palantir, Get Session State](https://www.palantir.com/docs/foundry/api/v2/agents-v2-resources/agent-sessions/get-session-state/)

## 관련 문서

- [[Palantir-Agent-Stack-Sessions|Agent Stack의 session, context와 event]]
- [[Palantir-Chatbot-Version-API|Chatbot Studio 버전 API]]
- [[Palantir-API-Client-Contract|API 클라이언트 계약]]
