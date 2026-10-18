---
tags: [palantir, chatbot, state, workshop, tools]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Chatbot의 application state 계약"]
---

# Chatbot의 application state 계약

Model context, tool 입력/출력과 UI state를 각각 정한다. LLM이 대답한 사실과 필요한 variable이 갱신된 사실은 다르다. 2025년 4월 개편 이력과 2026년 10월 전용 문서의 계약을 함께 구분한다.

## Visibility와 쓰기 도구

이전 access mode는 내부 state-update tool에 variable UUID를 전달했지만 최종 응답 전에 update를 누락할 수 있었다. 개편은 명시적 **Update application variable** tool과 이름 기반 parameter를 사용했다. 기존 agent는 backend migration했지만 새 variable은 tool에 직접 추가해야 했다.

Visibility는 현재 값/이름/설명을 compiled prompt에 넣을지 정한다. Retrieval 입력으로만 필요한 variable은 prompt에서 숨길 수 있다. Prompt에서 숨기는 것과 tool/function 입력에서 제외하는 것, model이 보는 것과 쓰는 권한은 별개다.

## 정해진 출력은 deterministic mapping을 쓴다

결과를 반드시 화면에 표시해야 한다면 model이 추가 update tool을 고르길 기다리지 않고 output에 mapping한다. Type은 서로 맞아야 한다.

| 경로 | State 연결 |
|---|---|
| Object query | Object type별 output Object Set |
| Call function | String/Object Set 결과와 같은 타입 variable |
| Ontology RAG | 응답마다 K개 관련 객체의 output Object Set |
| Object query input | 미리 filter한 Object Set을 initial input으로 지정 |
| Citation selection | 선택한 citation object 하나의 static Object Set |

Initial set은 앱 context를 deterministic하게 전달하지만 data security를 대신하지 않는다. Citation set은 검색한 K개 전체와 다르므로 source preview와 결과 목록을 나눈다.

현재 application variable은 string/object set을 지원한다. 이름/설명은 prompt를 구성하므로 역할과 사용 시점을 명시한다. String의 동적 prompt 내용은 visible이어야 LLM이 읽는다. Ontology retrieval의 input set은 값 자체를 숨겨도 retrieval 결과가 context로 전달될 수 있다.

Context/tool의 deterministic output mapping은 실행 결과를 기록한 뒤 LLM response streaming이 끝날 때 UI variable에 반영한다. Response 중간의 tool 완료와 UI update 시점을 구분한다. Action/Function tool의 deterministic input은 reasoning loop 시작의 variable 값에 고정되며 같은 query 안의 앞선 tool update를 따라 바뀌지 않는다.

Function-backed context에서 여러 object type citation을 설정하면 클릭한 type의 variable만 singleton object set이 되고 나머지 citation variable은 empty set으로 초기화된다. Overlay가 empty 여부로 열리도록 구성하되 empty 여부와 보일 조건의 방향을 직접 확인한다.

## Text box와 session variable은 실행을 유발한다

Text-box variable은 사용자 입력에 따라 바뀐다. 외부 widget에서 값을 바꾸면 그 값으로 새 message를 보내는 경로였다. 단순 field 동기화와 model 호출 trigger를 구분한다.

Active session identifier는 현재 `sessionRid`다. 외부에서 기존 session RID로 바꾸면 전환하고 새 값 구성에 따라 새 session을 만든다. History collapse는 표시이며 session 삭제나 접근 차단이 아니다.

Chatbot의 context 구성, 앱 state 통합, Function publish와 Automate 연결은 다른 자동화 단계다. 같은 prompt를 써도 interactive user 확인과 무인 실행의 오류 처리/재시도/권한을 다시 정한다. 이는 agent tier를 설계에 적용한 해석이다.

## 대화 보존은 agent와 version의 계약이다

2025년 5월 indefinite retention은 agent/version별 opt-in으로 도입됐고 이후 version에 유지되지만 이미 finite로 published된 과거 version은 바뀌지 않았다. Restricted View-backed type dependency가 있으면 선택할 수 없었다. Threads model mode는 기본 indefinite, chatbot mode는 해당 agent 설정을 따랐다. 저장한 설정과 실제 대화를 시작한 version/의존성을 함께 확인하며 같은 제품의 모든 대화가 영구 보존된다고 가정하지 않는다.

2026년 4월 Agent Studio/Agent widget의 Chatbot 명칭 변경은 기존 API Agent endpoint 이름을 호환성 때문에 유지했다. 이름 변경과 legacy interactive widget 제거는 다른 사건이다. 같은 공지는 legacy mode를 5월 1일 제거 대상으로 안내하고 기존 widget의 Upgrade 또는 새 chatbot 생성을 요구했다. 신규 chatbot과 old legacy 설정의 model/tool 지원을 같은 것으로 보지 않는다.

## 출처

- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, May 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-05)

- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, Chatbot application state](https://www.palantir.com/docs/foundry/chatbot-studio/application-state)
- [Palantir, Chatbot citations](https://www.palantir.com/docs/foundry/chatbot-studio/citations)

## 관련 문서

- [[Palantir-SDK-and-Agent-Tools|도구와 실행 identity]]
- [[Palantir-AIP-Generation-and-Data-Context|생성과 context]]
- [[Palantir-Agent-Stack-Sessions|Agent Stack session]]
