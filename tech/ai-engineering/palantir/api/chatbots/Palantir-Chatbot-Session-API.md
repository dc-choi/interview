---
tags: [palantir, foundry, api, aip, chatbot, streaming]
status: done
verified_at: 2026-11-02
category: "AI엔지니어링(AIEngineering)"
---

# Chatbot 세션의 수명과 응답 취소

Session은 호출 사용자와 Agent 사이의 대화다. 아래 endpoint는 모두 Preview이며 preview=true가 필요하다. get/list/content는 aip-agents-read, 생성/변경/continue/cancel/delete는 aip-agents-write scope를 쓴다. 다만 모든 Agent의 세션을 모아 조회하는 allSessions는 write scope다.

## 생성, 만료와 목록의 범위

`POST /api/v2/aipAgents/agents/{agentRid}/sessions`는 optional agentVersion을 body에 받아 새 세션을 만든다. 생성만으로 첫 대화를 실행하지는 않으며 blockingContinue 또는 streamingContinue로 exchange를 추가한다.

2026-11-02 확인한 Create Session 문서에서 agentVersion을 생략하면 세션 생성 시점의 최신 published 버전을 쓴다. 응답은 생성된 Session이며 요청에서 optional인 agentVersion이 응답에서는 필수다. 버전을 생략한 client는 따로 조회한 최신 버전으로 추정하지 않고 이 응답의 agentVersion을 세션에 연결된 버전으로 기록한다(적용 제안). published 버전이 없어 최신 published 버전을 가져오지 못하면 NoPublishedAgentVersion, 버전 문자열 형식이 잘못되면 InvalidAgentVersion(둘 다 INVALID_ARGUMENT, 400), 지정한 버전을 찾지 못하면 AgentVersionNotFound(NOT_FOUND, 404)다. NoPublishedAgentVersion의 설명은 AIP Chatbot Studio에서 Agent를 publish하거나 사용할 버전을 지정하라고 안내한다. 이 세 오류는 두 continue 문서에 정의되어 있지 않고, Agent와 특정 버전 조회 endpoint에는 같은 이름으로 있다([[Palantir-Chatbot-Version-API]]). 문서에 없다는 것이 continue에서 버전 문제가 생기지 않는다는 보장은 아니므로, 세션 생성 호출에서 세 오류를 이름으로 분기하되 오류 처리기를 공유하면 세 이름도 함께 등록한다(적용 제안).

같은 문서가 정의한 오류는 위 셋을 포함해 12개이고 성공 상태 코드는 적혀 있지 않다. 권한 오류 이름은 CreateSessionPermissionDenied(PERMISSION_DENIED, 403)로 다른 endpoint와 다르므로 오류 처리기를 공유하면 이 이름도 등록한다(적용 제안). 나머지 ObjectTypeIdsNotFound, ObjectTypeRidsNotFound, FunctionLocatorNotFound, OntologyEntitiesNotFound, UnsupportedLanguageModelRid, ActionTypeNotFound, SessionNotFound와 AgentNotFound는 아래 재시도 절의 continue 오류와 이름과 코드가 같다. 세션 생성 요청의 404도 continue처럼 Agent의 부재만 뜻하지 않는다. 지정한 버전을 찾지 못했거나, Agent에 설정된 object type, function, ontology type이 없거나 token이 접근하지 못하는 경우일 수 있다. 오류 이름으로 분기하고 의존성은 [[Palantir-Chatbot-Version-API]]로 확인한다(적용 제안). 세션 생성 요청에서 SessionNotFound가 오는 조건은 문서에 없다.

`GET /agents/{agentRid}/sessions/{sessionRid}`는 RID, Agent RID/version과 metadata를 돌려준다. messageCount는 사용자 메시지와 Agent 응답을 모두 세므로 완성된 exchange 하나가 두 메시지다. estimatedExpiresTime은 추정 만료 시각이며 새 exchange가 추가되면 연장된다. 만료 뒤에는 다시 접근할 수 없어 새 세션이 필요하다. 예제의 24시간 차이를 고정 수명으로 일반화하지 않는다.

`GET /agents/{agentRid}/sessions`는 호출 사용자와 해당 Agent 사이에서 **같은 client가 만든 세션만** 최신 업데이트순으로 나열한다. 다른 client나 Chatbot Studio가 만든 대화는 나오지 않는다. `GET /agents/allSessions`도 같은 client/사용자와 접근 가능한 Agent 범위다. 모든 사용자의 대화를 보는 관리 API가 아니다.

일반 list는 pageToken/pageSize와 nextPageToken으로 이어서 읽는다. allSessions의 pageSize는 기본/최대 100이다. 2026-11-02 확인한 일반 List Sessions 문서에는 pageSize의 기본값과 최대값이 없으므로 이 100을 일반 list에 옮겨 쓰지 않는다. 일반 list 응답의 data와 nextPageToken도 optional이라 필드가 없으면 빈 목록과 마지막 페이지로 처리한다(적용 제안). allSessions에 필요한 aip-agents-write를 GET이라는 이유로 read로 바꾸지 않는다.

allSessions 응답 AgentsSessionsPage의 Session마다 agentRid와 agentVersion이 있어 여러 Agent의 세션을 한 목록에서 Agent와 버전별로 나눌 수 있다. nextPageToken은 optional 필드이며 더 가져올 결과가 없으면 비어 있다. 필드가 없을 때도 마지막 페이지로 처리한다.

명세는 PERMISSION_DENIED 오류로 GetAllSessionsAgentsPermissionDenied(write scope 요구를 설명)와 ListSessionsForAgentsPermissionDenied 두 가지를 정의하고, 2026-11-01 확인한 문서는 둘 다 HTTP 403으로 표시한다. 403은 오류 이름으로 구분하고, 모든 Foundry API에 공통인 ApiUsageDenied 처리는 [[Palantir-API-Client-Contract]]를 따른다. 같은 날 확인 기준 이 endpoint 문서의 제목은 List Sessions For Chatbot Studio Agents로 바뀌었지만 경로, scope, 응답 type 이름 AgentsSessionsPage와 오류 이름은 그대로다.

2026-11-02 확인한 Get Session과 List Sessions 문서는 오류 코드가 NOT_FOUND(404)인 오류만 정의한다. Get Session은 SessionNotFound와 AgentNotFound를, List Sessions는 AgentNotFound 하나를 둔다. 두 문서에는 allSessions와 달리 PERMISSION_DENIED 오류 정의가 없다. SessionNotFound와 AgentNotFound는 코드가 같으므로 오류 이름으로 구분하고, 이름 있는 NotFound는 대상 부재뿐 아니라 token의 접근 불가일 수도 있어 접근 범위도 함께 확인한다. endpoint 문서에 없는 권한 오류(공통 Errors의 ApiUsageDenied 등)와 그 밖의 공통 오류는 [[Palantir-API-Client-Contract]]를 따른다.

## Blocking과 Streaming 모두 세션별로 직렬화한다

`POST /sessions/{sessionRid}/blockingContinue`는 필수 userInput.text와 optional parameterInputs, contextsOverride, sessionTraceId를 받는다. 전체 응답이 생성될 때까지 반환을 기다린다. 같은 세션에 동시 continue를 보내는 것은 지원하지 않는다.

streamingContinue도 같은 입력에 optional messageId를 추가하며 Markdown 응답 텍스트의 stream을 반환한다. 한 세션에서는 완료 응답을 받거나 진행 중 exchange를 취소한 뒤 다음 메시지를 보낸다. 동시에 여러 사용자 입력을 push하는 채팅 queue를 서버가 자동 직렬화한다고 가정하지 않는다.

messageId는 stream 취소용 client UUID, sessionTraceId는 진행/결과 trace 식별자다. 서로 바꿔 쓰지 않는다. trace ID를 미리 만들면 생성 중에도 trace를 poll할 수 있고 생략하면 자동 생성된다. 기존 trace ID를 재사용하면 SessionTraceIdAlreadyExists이며 일반 idempotency key로 취급하지 않는다.

blocking 결과는 agentMarkdownResponse, interruptedOutput, sessionTraceId와 optional parameterUpdates/totalTokensUsed다. totalTokensUsed는 모델이 지원하지 않으면 빠진다. 필드가 없다고 사용량 0으로 기록하지 않는다. stream이 끝나면 getContent로 최종 exchange와 전체 결과를 다시 읽는다. 명세가 stream을 binary body로 제시하므로 임의의 SSE event schema를 가정하지 않는다.

## 취소는 연결을 자동 닫지 않는다

`POST /sessions/{sessionRid}/cancel`은 streamingContinue에 제공했던 messageId로 진행 중 exchange를 취소한다. 호출해도 기존 stream은 종료되지 않으므로 client가 stream을 닫아 읽기를 중단해야 한다.

취소 body에서 response를 생략하면 exchange가 세션에 추가되지 않는다. response를 넣으면 client가 준 텍스트로 exchange가 추가된다. 이때 interruptedOutput=true이며 Agent가 생성한 최종 응답이 아니다. 같은 result 형태라고 생성 주체를 지우지 않는다.

2026-11-02 확인한 Cancel Session 문서(result 하위 필드의 정의는 2026-10-31 수집한 같은 문서의 schema 기준)에서 응답의 result는 optional이다. response를 보낸 경우에만 세션에 추가된 exchange의 결과가 오고, 생략하면 추가된 exchange가 없어 빈 응답이 온다. 그래서 취소 성공은 result의 유무가 아니라 오류가 아닌 성공 응답을 받았는지로 판정하고, 응답 자체를 받지 못했으면 아래 재시도 절차처럼 상태 미상으로 다룬다(적용 제안). 같은 문서의 응답 예시는 요청 예시의 response 문자열을 agentMarkdownResponse로 돌려주면서 interruptedOutput을 false로 보여 주지만, 필드 정의는 취소된 exchange에서 true라고 설명한다. 그래서 client가 넣은 응답인지는 응답의 interruptedOutput 값만으로 판단하지 않는다. response를 실은 cancel이 result가 있는 성공 응답을 받은 경우에만 client 응답으로 기록하고, 그 cancel이 실패했거나 결과를 모르면 생성 주체를 미상으로 둔다(적용 제안).

이미 완료/취소되었거나 시작하지 않은 messageId는 CancelSessionFailedMessageNotInProgress다. streamingContinue 직후 너무 빨리 취소해서 아직 시작하지 않은 경우에도 발생할 수 있다. 오류를 처리하고 getContent로 최신 대화 상태를 다시 확인하도록 명세가 설명한다.

같은 날 확인한 Cancel Session 문서가 정의한 오류는 네 가지다. CancelSessionFailedMessageNotInProgress(INVALID_ARGUMENT, 400), CancelSessionPermissionDenied(PERMISSION_DENIED, 403), SessionNotFound와 AgentNotFound(NOT_FOUND, 404)다. 성공 상태 코드는 적혀 있지 않다. 이미 취소된 exchange를 다시 취소하면 위 400이 오지만, 이 400만으로는 앞선 cancel이 적용됐는지, exchange가 먼저 끝났는지, 아직 시작하지 않았는지 구분할 수 없다. 응답을 받지 못한 cancel을 다시 보내 이 400을 받으면 실패로 확정하지 않고 아래 재시도와 실패 조건의 절차(직접 만든 sessionTraceId가 COMPLETE인지 대기 상한 안에서 확인한 뒤 getContent로 판단, 상한을 넘기면 상태 미상)를 따른다. response를 실었던 cancel이면 getContent의 agentMarkdownResponse를 보낸 텍스트와 비교한다. getContent와 trace 조회에는 aip-agents-read scope가 필요하다(적용 제안). 권한 오류 이름은 continue의 권한 오류 이름과 다르므로 오류 처리기를 공유하면 CancelSessionPermissionDenied도 등록한다(적용 제안).

## 내용 조회와 메타데이터 변경

`GET /sessions/{sessionRid}/content`는 첫 exchange부터 시간순으로 대화 내용을 반환한다. userInput, optional contexts와 result를 보존한다. contexts에는 client가 contextsOverride로 보낸 context나 자동 retrieval 결과가 들어갈 수 있다(contextsOverride를 주면 자동 retrieval을 건너뛴다). 대화 전체가 별도 paging으로 분할된다는 계약은 이 endpoint에 없다.

2026-11-02 확인한 Get Content 문서(SessionExchange 하위 필드의 필수 여부와 설명은 2026-10-31 수집한 같은 문서의 schema 기준이며, 2026-11-02 HTML에서는 접힌 하위 속성이라 다시 대조하지 못했다)에서 응답 Content의 필드는 optional인 exchanges 하나다. 필드가 없으면 빈 대화로 표시하되, 끊긴 직후의 재전송 판단에는 쓰지 않는다(아래 재시도 절, 적용 제안). exchange마다 userInput(text 필수)과 result는 필수이고, contexts는 optional이며 prompt에 추가 context가 들어가지 않았으면 비어 있다. result의 agentMarkdownResponse, interruptedOutput과 sessionTraceId는 필수이고 parameterUpdates와 totalTokensUsed는 optional이다. parameterUpdates는 Chatbot Studio에서 READ_WRITE 접근으로 설정한 application variable의 갱신만 담으며 값은 string 또는 objectSet(object set RID) union이다([[Palantir-Chatbot-Version-API]]). 이 schema는 interruptedOutput이 true인 exchange를 취소된 exchange로, 그 응답(있다면)을 Agent가 아니라 client가 cancel 요청으로 넣은 것으로 정의한다. 다만 위 Cancel Session의 응답 예시는 이 정의와 어긋나므로 이 값만으로 생성 주체를 정하지 않는다. 대화 기록을 내보낼 때는 streamingContinue에 직접 만든 sessionTraceId를 result.sessionTraceId와 맞춰 exchange와 cancel 기록을 대응시키고, response를 실은 cancel이면 agentMarkdownResponse를 보낸 텍스트와 비교한다. interruptedOutput과 기록이 어긋나거나 대응할 기록이 없으면 Cancel 절처럼 생성 주체를 미상으로 둔다(적용 제안). FunctionRetrievedContext의 retrievedPrompt는 필수인데 Get Content 문서의 응답 예시도 이를 빼고 있으므로 fixture는 schema로 만든다([[Palantir-Chatbot-Context-Trace-API]], 적용 제안).

같은 Get Content 문서가 정의한 오류는 ContentNotFound, AgentNotFound와 SessionNotFound 세 가지이며 모두 NOT_FOUND(404)다. PERMISSION_DENIED 오류는 정의하지 않고 성공 상태 코드도 적혀 있지 않다. 세 오류는 코드가 같으므로 오류 이름으로 분기한다. ContentNotFound가 SessionNotFound와 어떤 조건에서 갈리는지는 문서에 없으므로 ContentNotFound를 빈 대화로 단정하지 않고 Get Session으로 세션 존재를 따로 확인하며, Get Session이 성공해도 내용 상태는 미상으로 둔다(적용 제안). endpoint 문서에 없는 권한 오류와 공통 오류는 [[Palantir-API-Client-Contract]]를 따른다.

`PUT /sessions/{sessionRid}/updateTitle`의 title은 필수(2026-10-31 수집한 schema 기준)이고 200자를 넘으면 잘린다. 2026-11-02 확인한 Update Session Title 문서는 Agent의 세션 목록에서 세션을 알아보기 쉽도록 사용자 지정 제목을 붙이는 용도라고 설명한다. response 절과 응답 예시가 없고 성공 상태 코드도 적혀 있지 않다. 정의한 오류는 UpdateSessionTitlePermissionDenied(PERMISSION_DENIED, 403), SessionNotFound(NOT_FOUND, 404)와 AgentNotFound(NOT_FOUND, 404) 세 가지다. 200자를 어떤 단위로 세는지와 빈 제목을 받는지는 적혀 있지 않다. 초과분은 거부되지 않고 잘린다고 설명하므로 끝부분이 중요한 제목은 client가 보내기 전에 줄이고, 저장된 제목은 Get Session 응답의 metadata.title(2026-10-31 수집한 schema 기준 필수)로 다시 읽는다(적용 제안). Get Session에는 aip-agents-read scope가 필요하므로 write scope만 요청한 client는 같은 client가 만든 세션에 한해 allSessions 응답에서 rid로 세션을 찾아 metadata.title을 확인한다(적용 제안). 목록은 같은 client가 만든 세션만 보여 주므로 제목으로 알아보는 효과도 그 client의 목록 안에서만 기대한다(적용 제안). 권한 오류 이름이 다른 endpoint와 다르므로 오류 처리기를 공유하면 UpdateSessionTitlePermissionDenied도 등록한다(적용 제안).

`DELETE /sessions/{sessionRid}` 이후 세션은 접근할 수 없고 목록에도 나타나지 않는다. 단순히 UI 목록을 숨기는 기능으로 해석하지 않는다.

2026-11-02 확인한 Delete Session 문서에는 request body와 response 절이 없고 성공 시 상태 코드도 적혀 있지 않다. 이 endpoint 문서가 정의한 오류는 DeleteSessionPermissionDenied(PERMISSION_DENIED, 403), SessionNotFound(NOT_FOUND, 404), AgentNotFound(NOT_FOUND, 404) 세 가지이며, 공통 오류와 본문 없는 404는 [[Palantir-API-Client-Contract]]를 따른다. SessionNotFound와 AgentNotFound는 오류 코드가 같으므로 세션과 Agent 중 무엇을 찾지 못했는지는 오류 이름으로 구분한다. 문서의 설명은 호출 사용자와 Agent 사이의 세션 삭제뿐이며, 다른 사용자나 다른 client가 만든 세션을 지울 수 있는지와 이미 삭제한 세션을 다시 지울 때의 응답은 적혀 있지 않다. 그래서 재시도에서 받은 SessionNotFound를 삭제 성공으로 볼지는 client가 정한다. 목록은 같은 client가 만든 세션만 보여 주고 aip-agents-read scope가 필요하므로, 목록 재조회는 그 client가 만든 세션이 남았는지 확인할 때만 쓴다. 목록에 없거나 SessionNotFound를 받았다는 사실만으로 삭제와 접근 불가를 구분하지 않는다(적용 제안).

## 재시도와 실패 조건

2026-11-02 확인한 두 continue 문서는 정의한 오류 목록이 다르다. Blocking Continue Session은 18개, Streaming Continue Session은 12개를 정의하며, 아래 응답 생성 단계 오류 6개는 blocking 문서에만 있다.

| 오류 | 코드 / HTTP | 명세의 설명 |
|---|---|---|
| ContextSizeExceededLimit | INVALID_ARGUMENT / 400 | 더 짧은 메시지로 재시도하거나 새 세션을 만들어 다시 보낸다 |
| AgentIterationsExceededLimit | INVALID_ARGUMENT / 400 | 다른 질의를 쓰거나 Chatbot Studio의 Agent 설정을 검토한다 |
| SessionExecutionFailed | INTERNAL / 500 | 예상하지 못한 오류로 응답 생성에 실패했다 |
| RateLimitExceeded, RetryAttemptsExceeded, RetryDeadlineExceeded | CUSTOM_CLIENT / 400 | 모델 rate limit 초과, 설정된 재시도 횟수나 기한까지 재시도한 뒤의 실패이며 셋 다 기다린 뒤 재시도한다 |

모델 rate limit 초과를 뜻하는 RateLimitExceeded도 429가 아니라 400으로 표시된다. 상태 코드 기준 재시도([[Palantir-API-Client-Contract]]의 429와 503 backoff, 500 일시 실패 재시도)만 두면 이 세 오류는 재시도되지 않는다. 400을 받으면 오류 이름으로 재시도 대상을 고르고, 같은 400인 ContextSizeExceededLimit과 AgentIterationsExceededLimit은 같은 요청을 그대로 반복하지 않는다(적용 제안).

두 endpoint가 함께 정의하는 오류는 코드와 상태도 같다. InvalidParameter, InvalidParameterType, SessionTraceIdAlreadyExists, UnsupportedLanguageModelRid, ActionTypeNotFound는 INVALID_ARGUMENT(400)이고, ObjectTypeIdsNotFound, ObjectTypeRidsNotFound, FunctionLocatorNotFound, OntologyEntitiesNotFound, SessionNotFound, AgentNotFound는 NOT_FOUND(404)다. continue의 404는 세션이나 Agent가 아니라 Agent가 참조하는 object type, function이나 ontology type을 찾지 못했거나 token이 접근하지 못하는 경우일 수 있다. 반대로 ActionTypeNotFound는 이름과 달리 400이고, 이 오류와 UnsupportedLanguageModelRid의 설명도 대상의 삭제나 deprecated와 함께 호출 token의 접근 불가를 원인으로 든다. 그래서 HTTP 상태만으로 판정하지 않고 오류 이름으로 분기하며, 본문 없는 응답은 상태를 보존해 따로 처리한다([[Palantir-API-Client-Contract]]). 권한 오류는 BlockingContinueSessionPermissionDenied와 StreamingContinueSessionPermissionDenied(둘 다 PERMISSION_DENIED, 403)로 endpoint마다 이름이 다르므로, 두 경로가 오류 처리기를 공유하면 두 이름을 모두 등록한다.

streaming 문서는 stream이 시작된 뒤 생성 중 실패가 어떻게 전달되는지 적지 않는다. 응답 생성 단계 오류 6개가 없다는 것은 streaming 문서가 그 실패를 오류 응답으로 정의하지 않았다는 뜻이지 그런 실패가 일어나지 않는다는 뜻이 아니다. 연결이 끊겨도 생성이 멈춘다는 보장은 없고(cancel도 stream을 닫지 않는다), getContent가 생성 중이거나 실패한 exchange를 어떻게 보여 주는지와 실패하거나 취소된 exchange의 trace가 어떻게 남는지도 문서에 없다. trace 조회 문서는 IN_PROGRESS와 COMPLETE만 설명한다. 다음은 끊긴 뒤의 적용 제안이다. 끊긴 직후 getContent에 exchange가 없다는 사실만으로 다시 보내지 않는다. messageId를 보냈다면 response 없이 cancel한다. cancel이 성공하면 명세상 그 exchange는 세션에 추가되지 않는다. CancelSessionFailedMessageNotInProgress는 이미 끝났거나 취소됐거나 아직 시작하지 않은 경우를 함께 뜻하므로, 직접 만든 sessionTraceId가 있으면 대기 상한 안에서 trace가 COMPLETE인지 확인한 뒤 getContent로 판단한다. 상한을 넘기거나 trace를 찾지 못하면 상태 미상으로 다룬다([[Palantir-Chatbot-Context-Trace-API]]).

새 continue 재시도가 같은 exchange의 자동 재개라는 보장은 없고, blocking 요청에는 messageId 필드가 없어 진행 중 exchange를 cancel로 끝낼 수 없다. getContent와 trace 조회에는 aip-agents-read scope가 필요하다. 다음은 재시도의 적용 제안이다. continue는 exchange를 추가하는 POST이므로 상태 코드 기준 재시도를 그대로 적용하지 않는다. SessionExecutionFailed를 포함한 5xx나 blocking 호출의 timeout 뒤에는 진행 중이 아님을 확인한 다음 getContent로 중복 추가 여부를 판단하고, 확인하지 못하면 상태 미상으로 둔다. write scope만 요청한 client는 이 확인을 할 수 없다. 재시도에는 새 sessionTraceId와 새 messageId를 만든다. 실패한 시도가 그 trace ID를 등록했는지 명세에 없어 같은 ID를 다시 보내면 SessionTraceIdAlreadyExists(400)를 받을 수 있다. parameter/type/모델/function/ontology 의존성 오류의 원인과 확인 방법은 [[Palantir-Chatbot-Version-API]]와 함께 본다. 실제 세션 생성, stream이나 취소를 수행하지 않았다.

## 출처

- [Palantir, Create Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/create-session)
- [Palantir, Get Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/get-session)
- [Palantir, List Sessions](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/list-sessions)
- [Palantir, List Sessions For Chatbot Studio Agents](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agents/list-sessions-for-agents)
- [Palantir, Blocking Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/blocking-continue-session)
- [Palantir, Streaming Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/streaming-continue-session)
- [Palantir, Cancel Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/cancel-session)
- [Palantir, Get Session Trace](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/session-traces/get-session-trace)
- [Palantir, Get Content](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/contents/get-content)
- [Palantir, Update Session Title](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/update-session-title)
- [Palantir, Delete Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/delete-session)
