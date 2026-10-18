---
tags: [palantir, foundry, api, aip, chatbot, streaming]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Chatbot 세션의 수명과 응답 취소

Session은 호출 사용자와 Agent 사이의 대화다. 아래 endpoint는 모두 Preview이며 preview=true가 필요하다. get/list/content는 aip-agents-read, 생성/변경/continue/cancel/delete는 aip-agents-write scope를 쓴다. 다만 모든 Agent의 세션을 모아 조회하는 allSessions는 write scope다.

## 생성, 만료와 목록의 범위

`POST /api/v2/aipAgents/agents/{agentRid}/sessions`는 optional agentVersion을 body에 받아 새 세션을 만든다. 생성만으로 첫 대화를 실행하지는 않으며 blockingContinue 또는 streamingContinue로 exchange를 추가한다.

`GET /agents/{agentRid}/sessions/{sessionRid}`는 RID, Agent RID/version과 metadata를 돌려준다. messageCount는 사용자 메시지와 Agent 응답을 모두 세므로 완성된 exchange 하나가 두 메시지다. estimatedExpiresTime은 추정 만료 시각이며 새 exchange가 추가되면 연장된다. 만료 뒤에는 다시 접근할 수 없어 새 세션이 필요하다. 예제의 24시간 차이를 고정 수명으로 일반화하지 않는다.

`GET /agents/{agentRid}/sessions`는 호출 사용자와 해당 Agent 사이에서 **같은 client가 만든 세션만** 최신 업데이트순으로 나열한다. 다른 client나 Chatbot Studio가 만든 대화는 나오지 않는다. `GET /agents/allSessions`도 같은 client/사용자와 접근 가능한 Agent 범위다. 모든 사용자의 대화를 보는 관리 API가 아니다.

일반 list는 pageToken/pageSize와 nextPageToken으로 이어서 읽는다. allSessions의 pageSize는 기본/최대 100이다. allSessions에 필요한 aip-agents-write를 GET이라는 이유로 read로 바꾸지 않는다.

## Blocking과 Streaming 모두 세션별로 직렬화한다

`POST /sessions/{sessionRid}/blockingContinue`는 필수 userInput.text와 optional parameterInputs, contextsOverride, sessionTraceId를 받는다. 전체 응답이 생성될 때까지 반환을 기다린다. 같은 세션에 동시 continue를 보내는 것은 지원하지 않는다.

streamingContinue도 같은 입력에 optional messageId를 추가하며 Markdown 응답 텍스트의 stream을 반환한다. 한 세션에서는 완료 응답을 받거나 진행 중 exchange를 취소한 뒤 다음 메시지를 보낸다. 동시에 여러 사용자 입력을 push하는 채팅 queue를 서버가 자동 직렬화한다고 가정하지 않는다.

messageId는 stream 취소용 client UUID, sessionTraceId는 진행/결과 trace 식별자다. 서로 바꿔 쓰지 않는다. trace ID를 미리 만들면 생성 중에도 trace를 poll할 수 있고 생략하면 자동 생성된다. 기존 trace ID를 재사용하면 SessionTraceIdAlreadyExists이며 일반 idempotency key로 취급하지 않는다.

blocking 결과는 agentMarkdownResponse, interruptedOutput, sessionTraceId와 optional parameterUpdates/totalTokensUsed다. totalTokensUsed는 모델이 지원하지 않으면 빠진다. 필드가 없다고 사용량 0으로 기록하지 않는다. stream이 끝나면 getContent로 최종 exchange와 전체 결과를 다시 읽는다. 명세가 stream을 binary body로 제시하므로 임의의 SSE event schema를 가정하지 않는다.

## 취소는 연결을 자동 닫지 않는다

`POST /sessions/{sessionRid}/cancel`은 streamingContinue에 제공했던 messageId로 진행 중 exchange를 취소한다. 호출해도 기존 stream은 종료되지 않으므로 client가 stream을 닫아 읽기를 중단해야 한다.

취소 body에서 response를 생략하면 exchange가 세션에 추가되지 않는다. response를 넣으면 client가 준 텍스트로 exchange가 추가된다. 이때 interruptedOutput=true이며 Agent가 생성한 최종 응답이 아니다. 같은 result 형태라고 생성 주체를 지우지 않는다.

이미 완료/취소되었거나 시작하지 않은 messageId는 CancelSessionFailedMessageNotInProgress다. streamingContinue 직후 너무 빨리 취소해서 아직 시작하지 않은 경우에도 발생할 수 있다. 오류를 처리하고 getContent로 최신 대화 상태를 다시 확인하도록 명세가 설명한다.

## 내용 조회와 메타데이터 변경

`GET /sessions/{sessionRid}/content`는 첫 exchange부터 시간순으로 대화 내용을 반환한다. userInput, optional context와 result를 보존한다. context에는 client 제공분과 자동 retrieval이 함께 들어갈 수 있다. 대화 전체가 별도 paging으로 분할된다는 계약은 이 endpoint에 없다.

`PUT /sessions/{sessionRid}/updateTitle`의 title은 필수이고 200자를 넘으면 잘린다. `DELETE /sessions/{sessionRid}` 이후 세션은 접근할 수 없고 목록에도 나타나지 않는다. 단순히 UI 목록을 숨기는 기능으로 해석하지 않는다.

## 재시도와 실패 조건

ContextSizeExceededLimit이면 짧은 메시지 또는 새 세션을 검토한다. AgentIterationsExceededLimit은 loop/복잡도나 설정을 검토한다. SessionExecutionFailed는 내부 실행 실패이며, RateLimitExceeded/RetryAttemptsExceeded/RetryDeadlineExceeded는 기다린 뒤 retry하라는 설명이다.

새 continue 재시도가 같은 exchange의 자동 재개라는 보장은 없다. 실패 후 getContent와 trace 상태를 확인해 중복 추가 여부를 다루는 것은 client 설계다. parameter/type/모델/function/ontology 의존성 오류는 [[Palantir-Chatbot-Version-API]]와 함께 확인한다. 실제 세션 생성, stream이나 취소를 수행하지 않았다.

## 출처

- [Palantir, Create Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/create-session)
- [Palantir, Get Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/get-session)
- [Palantir, List Sessions](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/list-sessions)
- [Palantir, List Sessions For Agents](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/agents/list-sessions-for-agents)
- [Palantir, Blocking Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/blocking-continue-session)
- [Palantir, Streaming Continue Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/streaming-continue-session)
- [Palantir, Cancel Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/cancel-session)
- [Palantir, Get Content](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/contents/get-content)
- [Palantir, Update Session Title](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/update-session-title)
- [Palantir, Delete Session](https://www.palantir.com/docs/foundry/api/aip-agents-v2-resources/sessions/delete-session)
