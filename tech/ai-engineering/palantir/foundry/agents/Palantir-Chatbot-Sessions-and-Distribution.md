---
tags: [palantir, chatbot, session, logging, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Chatbot session, API와 배포"]
---

# Chatbot session과 배포 계약

Interactive chatbot을 Function, API, Workshop 또는 Marketplace로 배포할 때 같은 prompt가 같은 실행 환경을 보장하지 않는다. Saved/published version, resource dependency, session input과 client tool 지원을 함께 고정한다.

## Function 입력은 session과 state default를 포함한다

Function publish는 chatbot publish 때마다 version을 만들거나 save 때 minor version도 만들도록 설정한다. Publish 기능을 꺼도 이후 등록을 멈추는 것이며 기존 Function의 삭제를 의미하지 않는다. 다시 켠 뒤 publish해야 새 Function version이 나온다.

`userInput`은 질의이며 새 session이면 optional `sessionRid`를 생략한다. Empty string을 전달하지 않는다. 기존 session RID를 넣으면 대화를 이어간다. Output의 RID를 다음 실행에 전달해 continuity를 유지한다.

Application variables는 optional input/output으로 노출한다. Object set input을 생략하면 기본이 해당 object type의 전체 base set이고 string은 Studio default다. 누락을 empty set으로 해석하면 예상보다 넓은 context를 전달할 수 있다. Output은 변경된 variable만 반환하며 빈 output을 값 삭제로 해석하지 않는다.

AIP Evals suite는 chatbot과 같은 Project에 둔다. 독립 case는 `sessionRid=null`로 시작하고 object set은 null 또는 실제 값이어야 하며 empty 값은 허용되지 않는 경로다. 이전 case session을 공유해 테스트가 오염되지 않게 한다.

## API application의 resource 범위는 자동 확장되지 않는다

Developer Console에서 chatbot이 사용하는 단일 Ontology의 object/action/function type, application state와 retrieval/tool dependency를 추가한다. Platform SDK Project access에는 chatbot Project와 media set 등 추가 filesystem resource Project도 포함한다. AIP Chatbots write operation은 session 생성/메시지에 필요하다.

Chatbot에 새 type/media dependency를 추가해도 Developer Console resource 목록은 자동 갱신되지 않는다. Chatbot publish와 SDK application permission 변경을 각각 반영한다. Endpoint의 `agentRid` 등 이전 이름은 Chatbot 명칭 변경 후에도 남을 수 있다.

Session create 뒤 blocking/streaming continue로 메시지를 보낸다. `parameterInputs`가 application state 입력이며 blocking의 `parameterUpdates`, streaming 후 Get Content가 output을 읽는 경로다. Get Session metadata와 exchange history는 별도다. 새 exchange에 UUIDv4 `sessionTraceId`를 주거나 blocking/Get Content 결과의 ID로 trace를 조회할 수 있다.

## Session 로그는 별도의 민감 데이터다

각 user message는 하나의 execution이며 `traceId`로 function/model/tool의 관련 로그를 잇는다. `session_rid`는 conversation, `owning_rid`는 최상위 source executor를 나타낸다. Chatbot A→Function→B 호출에서도 owning은 A일 수 있어 즉시 실행한 chatbot RID와 혼동하지 않는다.

Session metadata, user request, compiled system/user/assistant message, tool call/result, final response와 error를 export할 수 있다. Native tool definition은 system event의 `native_tools`, prompted는 content에 들어간다. Final response는 text/media 응답 외에 client tool call일 수도 있다.

User identifier, prompt, application state, retrieval와 tool 결과가 포함될 수 있으므로 export dataset의 Marking, 목적, 접근자와 retention을 정한다. Schema/event type은 바뀔 수 있어 parser를 확장에 견디게 한다. 동일 trace의 같은 tool 반복은 retry 후보지만 별도 의도 호출일 수도 있으므로 input/result와 call ID로 확인한다. Error name이나 최종 답만으로 전체 실행의 성공을 판정하지 않는다.

## Marketplace는 media set 전체를 포함한다

Add files로 chatbot을 넣거나 chatbot widget을 포함한 Workshop을 넣으면 dependency가 포함된다. Document context의 media set은 선택된 문서만 아니라 사용하지 않은 item까지 전체가 packaged된다. 공개/배포 범위를 제한하려면 필요한 문서만 새 media set으로 분리하고 chatbot을 다시 설정한다. Assist agent 배포는 해당 Marketplace guide의 예외다.

## 출처

- [Palantir, Chatbots as Functions](https://www.palantir.com/docs/foundry/chatbot-studio/chatbots-as-functions)
- [Palantir, Foundry APIs for Chatbots](https://www.palantir.com/docs/foundry/chatbot-studio/foundry-apis)
- [Palantir, Session logging](https://www.palantir.com/docs/foundry/chatbot-studio/session-logging)
- [Palantir, Marketplace distribution](https://www.palantir.com/docs/foundry/chatbot-studio/marketplace)

## 관련 문서

- [[Palantir-Chatbot-Tools-and-Commands|실행 환경별 tool 지원]]
- [[Palantir-AIP-Observability|Trace와 실행 관측]]
- [[Palantir-Logs-and-Usage-Governance|Log export governance]]
