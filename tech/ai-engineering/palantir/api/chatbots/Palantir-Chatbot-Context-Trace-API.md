---
tags: [palantir, foundry, api, aip, chatbot, rag, trace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# RAG Context를 제어하고 실행 Trace를 관찰한다

Chatbot continue 요청의 contextsOverride를 생략하면 해당 세션의 Agent data source 설정으로 relevant context를 자동 검색한다. 제공하면 자동 retrieval을 건너뛰고 client가 지정한 목록을 사용한다. 빈 목록과 필드 생략은 같은 의도로 다루면 안 된다.

## 검색과 응답 생성을 분리한다

Preview `PUT /api/v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/ragContext`는 userInput과 optional parameterInputs로 관련 context를 미리 검색한다. `api:aip-agents-write` scope가 필요하다. 사전 검색 뒤 client가 context를 가공해 continue의 contextsOverride로 전달할 수 있다. 검색 응답을 받은 사실 자체가 대화 exchange 생성이나 답변 완료를 의미하지 않는다.

object context는 objectRids와 propertyTypeRids로 prompt에 포함할 객체와 속성을 지정한다. function retrieved context는 functionRid/version과 함수가 반환한 retrievedPrompt 문자열을 갖는다. continue의 InputContext는 functionRetrievedContext 또는 objectContext union 목록이다. 함수와 property의 API name, ID와 RID를 혼용하지 않는다.

응답 context는 objectContexts/functionRetrievedContexts로 묶인다. getContent의 context에는 client가 보낸 것과 Agent가 자동 검색한 것이 들어갈 수 있으므로 그 결과만으로 출처 경로를 단정하지 않는다. 공식 명세에 없는 임의 free-text context 타입을 더하지 않는다.

## 진행 중 Trace와 완료 Context를 구별한다

Preview `GET /api/v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/sessionTraces/{sessionTraceId}`는 `api:aip-agents-read`로 trace를 조회한다. status가 IN_PROGRESS이면 계속 polling하고 COMPLETE가 될 때까지 확인한다. trace는 retrieval과 tool call 등 응답 생성 단계의 관찰 자료다.

trace.contexts는 응답 생성이 끝난 뒤에만 채워진다. 따라서 생성 중 필드 부재를 retrieval 미실행의 증거로 삼지 않는다. 완료 후 context 객체가 있고 두 목록이 비어 있으면 retrieval을 시도했지만 찾지 못한 상태다. context 객체 자체가 비어 있거나 없는 경우와 구별한다.

toolCallGroups는 같은 시점에 시작한 tool call들을 묶으며 group은 시작 순서다. 각 tool은 name/type, input과 optional output을 갖는다. 유형은 FUNCTION, ACTION, ONTOLOGY_SEMANTIC_SEARCH, OBJECT_QUERY, UPDATE_APPLICATION_VARIABLE, REQUEST_CLARIFICATION, OBJECT_QUERY_WITH_SQL, CODE_EXECUTION이다.

input의 inputs map과 성공 output은 string 또는 RID union이다. input에는 Agent가 도구 선택 이유로 제공한 optional thought도 있을 수 있다. 이 필드를 도구 실행 결과나 검증된 사실과 혼합하지 않는다.

tool output 부재는 진행 중이다. success는 output을, failure는 Agent가 입력을 고치는 데 사용할 correctionMessage를 제공한다. 도구 호출 시도가 있었다는 사실만으로 외부 변경 성공이나 답변 정확성을 확정하지 않는다. 최종 사용자 응답은 SessionExchangeResult와 함께 확인한다.

## 오류와 관측 한계

SessionTraceNotFound는 trace/session/Agent 식별 관계와 존재를 확인하고, 세션/Agent 부재 및 endpoint 권한 오류도 처리한다. RAG 검색은 object type 또는 function/version이 없거나 token에서 접근할 수 없어 실패할 수 있다. NOT_FOUND만으로 설정 원본이 삭제되었다고 단정하지 않는다.

이 문서는 공개 API와 schema를 대조한 결과다. 실제 retrieval 품질, tool 실행 순서, trace 보존 기간과 runtime 성능을 시험하지 않았다. 사용자 입력, retrievedPrompt와 tool 출력은 민감한 자료가 들어갈 수 있으므로 이 지식 문서에는 실제 대화 본문이나 token을 복제하지 않는다.

## 출처

- [Palantir, Get RAG Context For Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/get-rag-context-for-session)
- [Palantir, Blocking Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/blocking-continue-session)
- [Palantir, Streaming Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/streaming-continue-session)
- [Palantir, Get Session Trace](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/session-traces/get-session-trace)
- [Palantir, Get Content](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/contents/get-content)

## 관련 문서

- [[Palantir-Chatbot-Session-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Ontology-SQL-API]]
