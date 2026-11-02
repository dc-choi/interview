---
tags: [palantir, foundry, api, aip, chatbot, rag, trace]
status: done
verified_at: 2026-11-02
category: "AI엔지니어링(AIEngineering)"
---

# RAG Context를 제어하고 실행 Trace를 관찰한다

Chatbot continue 요청의 contextsOverride를 생략하면 해당 세션의 Agent data source 설정으로 relevant context를 자동 검색한다. 제공하면 자동 retrieval을 건너뛰고 client가 지정한 목록을 사용한다. 빈 목록과 필드 생략은 같은 의도로 다루면 안 된다.

## 검색과 응답 생성을 분리한다

Preview `PUT /api/v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/ragContext`는 userInput과 optional parameterInputs로 관련 context를 미리 검색한다. `api:aip-agents-write` scope가 필요하다. 사전 검색 뒤 client가 context를 가공해 continue의 contextsOverride로 전달할 수 있다. 검색 응답을 받은 사실 자체가 대화 exchange 생성이나 답변 완료를 의미하지 않는다.

object context는 objectRids와 propertyTypeRids로 prompt에 포함할 객체와 속성을 지정한다. function retrieved context는 functionRid/version과 함수가 반환한 retrievedPrompt 문자열을 갖는다. continue의 InputContext는 functionRetrievedContext 또는 objectContext union 목록이다. 함수와 property의 API name, ID와 RID를 혼용하지 않는다.

응답 context는 objectContexts/functionRetrievedContexts로 묶인다. getContent의 context에는 client가 보낸 것과 Agent가 자동 검색한 것이 들어갈 수 있으므로 그 결과만으로 출처 경로를 단정하지 않는다. 공식 명세에 없는 임의 free-text context 타입을 더하지 않는다.

2026-11-02 확인한 Get RAG Context For Session 문서(하위 필드의 필수 여부와 형식은 2026-10-31 수집한 같은 문서의 schema 기준)에서 응답의 objectContexts와 functionRetrievedContexts는 둘 다 optional이고, ObjectContext의 objectRids와 propertyTypeRids도 optional이다. ragContext 응답에서 필드가 없으면 빈 목록으로 처리하되, 진단을 위해 각 목록이 실제로 왔는지는 따로 남긴다(적용 제안). FunctionRetrievedContext는 functionRid, functionVersion과 retrievedPrompt가 모두 필수인데, 이 문서와 Get Session Trace 문서의 응답 예시는 둘 다 retrievedPrompt를 빼고 있다. 예시를 테스트 fixture로 그대로 쓰면 필수 필드가 없는 응답을 정상으로 받아들이게 되므로 RAG와 trace fixture 모두 schema 정의를 기준으로 만든다(적용 제안). functionVersion은 `<major>.<minor>.<patch>-<tag>` 형식이고 `-<tag>`는 생략할 수 있다(예: 1.2.3, 1.2.3-rc1).

## 진행 중 Trace와 완료 Context를 구별한다

Preview `GET /api/v2/aipAgents/agents/{agentRid}/sessions/{sessionRid}/sessionTraces/{sessionTraceId}`는 `preview=true`와 `api:aip-agents-read`로 trace를 조회한다. status가 IN_PROGRESS이면 계속 polling하고 COMPLETE가 될 때까지 확인한다. trace는 retrieval과 tool call 등 응답 생성 단계의 관찰 자료다.

2026-11-02 확인한 Get Session Trace 문서에서 응답의 id와 status는 필수이고 contexts와 toolCallGroups는 optional이다. status가 나타내는 것은 최종 응답 생성의 완료 여부다. 따라서 COMPLETE를 모든 도구의 성공이나 답변 정확성으로 해석하지 않는다. polling 간격, 최대 대기 시간과 실패 또는 취소 전용 status는 이 문서에 정의되어 있지 않다. client는 대기 상한을 별도로 정하고, 이를 넘으면 생성 실패로 단정하지 않고 상태 미상으로 남긴다(적용 제안).

trace.contexts는 응답 생성이 끝난 뒤에만 채워진다. 따라서 생성 중 필드 부재를 retrieval 미실행의 증거로 삼지 않는다. 완료 후 context 객체가 있고 두 목록이 비어 있으면 retrieval을 시도했지만 찾지 못한 상태다. context 객체 자체가 비어 있거나 없는 경우와 구별한다. 다만 trace 응답의 두 목록도 optional이고, 빈 목록을 []로 보내는지 필드를 생략하는지는 확인한 명세에 정의가 없어 이 구분이 실제 응답에서 드러나는지는 확인하지 못했다.

같은 문서의 응답 예시는 IN_PROGRESS인데 contexts도 담고 있어 위의 필드 설명과 어긋난다. 예시를 생성 중 context 제공의 보장으로 사용하지 않고, 테스트에서는 필드 설명을 기준으로 진행 중과 완료 응답을 나눈다(적용 제안).

toolCallGroups는 같은 시점에 시작한 tool call들을 묶으며 group은 시작 순서다. 각 tool은 name/type, input과 optional output을 갖는다. 유형은 FUNCTION, ACTION, ONTOLOGY_SEMANTIC_SEARCH, OBJECT_QUERY, UPDATE_APPLICATION_VARIABLE, REQUEST_CLARIFICATION, OBJECT_QUERY_WITH_SQL, CODE_EXECUTION이다.

input의 inputs map과 성공 output은 string 또는 RID union이다. input에는 Agent가 도구 선택 이유로 제공한 optional thought도 있을 수 있다. 이 필드를 도구 실행 결과나 검증된 사실과 혼합하지 않는다.

tool output 부재는 진행 중이다. success는 output을, failure는 Agent가 입력을 고치는 데 사용할 correctionMessage를 제공한다. 도구 호출 시도가 있었다는 사실만으로 외부 변경 성공이나 답변 정확성을 확정하지 않는다. 최종 사용자 응답은 SessionExchangeResult와 함께 확인한다.

## 오류와 관측 한계

Get Session Trace가 정의한 오류는 SessionTraceNotFound, SessionNotFound와 AgentNotFound 세 가지이며 모두 NOT_FOUND(404)다. 오류 parameter는 각각 sessionTraceId/agentRid/sessionRid, agentRid/sessionRid, agentRid다. HTTP 상태만 보지 않고 오류 이름과 parameter로 확인할 식별자를 구분한다(적용 제안). 이 endpoint 문서에는 전용 PermissionDenied 오류가 없으므로 다른 endpoint의 오류 이름을 복사하지 않고, 공통 인증과 권한 오류는 [[Palantir-API-Client-Contract]]를 따른다. RAG 검색은 object type 또는 function/version이 없거나 token에서 접근할 수 없어 실패할 수 있다. NOT_FOUND만으로 설정 원본이 삭제되었다고 단정하지 않는다.

2026-11-02 확인한 ragContext 문서는 오류 일곱 개를 정의한다. GetRagContextForSessionPermissionDenied(PERMISSION_DENIED, 403)를 빼면 모두 NOT_FOUND(404)다. SessionNotFound와 AgentNotFound 말고 ObjectTypeIdsNotFound, ObjectTypeRidsNotFound, FunctionLocatorNotFound, OntologyEntitiesNotFound가 위의 RAG 검색 실패에 해당하며, 문제 대상을 parameter로 돌려준다(차례로 objectTypeIds, objectTypeRids, functionRid와 functionVersion, objectTypeRids와 linkTypeRids). 같은 Agent 설정과 token으로 세션만 새로 만들어서는 해결되기 어려우므로 SessionNotFound와 같은 404 처리기로 묶지 않고 오류 이름으로 분기해 parameter가 가리킨 대상과 token의 접근 범위를 확인한다(적용 제안). 두 continue 문서에 있는 InvalidParameter 같은 INVALID_ARGUMENT 오류와 blocking continue 문서에만 있는 rate limit 오류는 이 문서에 정의되어 있지 않다. 잘못된 parameterInputs가 어떤 오류로 돌아오는지는 문서로 확인할 수 없으므로 공통 오류 처리([[Palantir-API-Client-Contract]])에 맡긴다(적용 제안).

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
