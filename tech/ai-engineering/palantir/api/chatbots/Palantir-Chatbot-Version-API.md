---
tags: [palantir, foundry, api, aip, chatbot, versioning]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent 이름으로 제공되는 Chatbot의 버전 계약

이 API의 Agent는 AIP Chatbot Studio에서 만든 AIP Chatbot을 뜻한다. 이전 AIP Agent/Agent Studio 명칭과의 하위 호환 때문에 경로와 type 이름에 Agent가 남아 있다. 임의의 외부 Agent runtime을 등록하는 범용 API로 해석하지 않는다.

이 그룹의 endpoint는 Preview이며 `preview=true`가 필요하다. 버전/설정 조회는 `api:aip-agents-read`, 대화 생성/진행은 `api:aip-agents-write` operation scope를 사용한다. 실제 Agent와 데이터 접근 권한도 함께 확인한다.

## Published와 Saved의 버전 증가가 다르다

버전 문자열은 `major.minor`다. major는 publish마다, minor는 save마다 증가한다고 명시한다. 일반 library의 major.minor.patch 의미를 그대로 적용하지 않는다.

`GET /api/v2/aipAgents/agents/{agentRid}`는 optional version을 받으며 생략하면 최신 published 버전을 반환한다. 최신 save를 자동 선택하는 의미가 아니다. Agent에는 RID/version, displayName, optional description/inputPlaceholder/suggestedPrompts, application parameters가 있다.

`GET /agents/{agentRid}/agentVersions/{agentVersionString}`은 특정 버전 상세를, `GET /agents/{agentRid}/agentVersions`는 최신순 버전 목록을 제공한다. 목록은 pageToken/pageSize와 nextPageToken으로 계속 조회한다. 잘못된 문자열 InvalidAgentVersion, 없는 AgentVersion/Agent, published 버전이 없는 NoPublishedAgentVersion을 구별한다. 마지막 경우 publish하거나 사용할 버전을 명시하라는 설명이다.

버전 응답 예제의 string 1.0과 내부 major/minor 1/2는 서로 맞지 않는다. 파서가 두 값의 일치를 전제하거나 예제로 버전 변환식을 만들지 않는다. 실제 응답과 사용 SDK 계약을 대조한다.

## Application variable은 이름과 type을 먼저 확인한다

parameters map의 key는 Chatbot Studio application state variable의 ParameterId다. 각 Parameter는 parameterType, access와 optional description을 갖는다. description은 Agent prompt에 들어가 variable 사용 문맥을 제공한다.

parameterType은 string 또는 objectSet union이다. string에는 optional defaultValue가 있고 objectSet에는 expectedObjectTypes ID 목록이 있을 수 있다. access는 READ_ONLY/READ_WRITE다. Agent가 반환하는 parameterUpdates는 READ_WRITE로 설정한 variable에서만 생성될 수 있다.

continue/RAG 요청의 string 값은 type=string과 value를, objectSet 값은 ontology API name과 ObjectSet 정의를 보낸다. objectSet 응답 update는 갱신된 ObjectSet의 RID다. 입력 정의와 출력 RID는 서로 다른 schema라 그대로 역직렬화해 재전송하지 않는다.

ObjectSet 입력은 base/static/interface/reference, link searchAround, union/intersect/subtract/filter, type cast, ANN, experimental derived property를 조합하는 구조다. 비교/term/regex/interval, relative date와 공간 filter의 제약은 [[Palantir-Ontology-SQL-API]]의 동일 계약과 함께 확인한다. 특히 빈 in 배열은 전체 object를 매칭하고, field/propertyIdentifier는 상호 배제이며 ANN은 설정된 vector type에서 1~500개의 이웃을 선택한다. Agent application state의 예상 object type도 별도로 맞아야 한다.

## 세션의 버전과 런타임 의존성

세션 생성 때 agentVersion을 생략하면 그 시점의 최신 published 버전을 쓴다. 기존 세션의 version은 getSession으로 확인한다. 설정 조회를 최신 버전으로만 해 놓고 오래된 세션에 parameter를 보내면 InvalidParameter 또는 InvalidParameterType이 날 수 있다.

Agent가 참조한 object/link/action type, function/version과 language model도 현재 token에서 접근 가능해야 한다. ObjectTypeIdsNotFound/ObjectTypeRidsNotFound/OntologyEntitiesNotFound/FunctionLocatorNotFound는 부재와 접근 불가를 함께 포함한다. 모델 deprecated/접근 불가이면 UnsupportedLanguageModelRid, 없는/접근 불가 action이면 ActionTypeNotFound로 나타날 수 있다.

공개 명세의 계약을 확인했으며 실제 publish/save, 모델 지원이나 Agent 실행을 시험하지 않았다.

## 출처

- [Palantir, Agent basics](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agents/agent-basics)
- [Palantir, Get Agent](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agents/get-agent)
- [Palantir, Get Agent Version](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agent-versions/get-agent-version)
- [Palantir, List Agent Versions](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agent-versions/list-agent-versions)
- [Palantir, Create Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/create-session)
- [Palantir, Blocking Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/blocking-continue-session)
