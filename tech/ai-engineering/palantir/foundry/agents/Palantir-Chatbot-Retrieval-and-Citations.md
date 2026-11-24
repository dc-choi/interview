---
tags: [palantir, chatbot, rag, citations]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Chatbot retrieval과 citation 계약"]
---

# Chatbot retrieval과 citation

Chatbot Studio는 이전 Agent Studio 명칭의 interactive assistant 구성 도구다. Instructions, tool/variable description은 compiled system prompt를 만든다. LLM에 주는 context와 실행 가능한 tool을 별도로 설계한다. Model은 enrollment에서 활성화한 일부만 선택할 수 있다.

## Retrieval은 매 메시지에 실행한다

Configured retrieval은 새 user message마다 결정적으로 실행하며 결과를 LLM에 넣는다. 이것은 LLM이 필요에 따라 tool을 고르는 경로와 다르다. Retrieval을 켠다고 항상 최신이거나 사실인 답을 보장하지 않으며 실제 source, index와 질의를 평가한다.

Ontology context는 정한 N개 object 또는 embedding property의 semantic search K개를 전달한다. Static input은 전체 object type, variable input은 앱에서 제한한 set이다. Printed property를 명시해 불필요한 값과 token을 줄인다. 기본은 media reference/vector처럼 출력 불가한 property를 제외한 전체다.

Document context는 전체 text 또는 relevant K chunks다. Relevant chunks는 해당 가이드에서 beta로 명시하므로 enrollment 가용성을 확인한다. 전체 text는 query별 검색 누락을 줄이는 대신 context window와 비용을 늘린다. System prompt/history/state/tools/retrieval의 합이 context window이며 초과하면 새 session이 필요할 수 있다.

## Function-backed context는 prompt 생성 계약이다

Hybrid keyword/semantic 같은 custom retrieval은 TypeScript v1 `AipAgentsContextRetrieval` interface로 구현한다. TypeScript v2 repository의 function interface는 이 경로에서 지원하지 않는다. 필수 입력은 `messages` 하나이며 string/object set application variable을 optional argument로 더할 수 있다.

결과의 `retrievedPrompt` string이 system prompt에 삽입된다. Object type API name과 variable type mapping을 맞춘다. AIP Logic 직접 작성은 해당 문서의 후속 계획이며, 지원 전에는 interface를 구현한 TS wrapper에서 Logic을 호출하는 경로가 제시된다. Function-backed context가 임의 최신 runtime에서도 같은 interface로 실행된다고 확장하지 않는다.

## Citation 렌더링과 근거 정확성은 다르다

Document/Ontology context는 기본 citation prompt와 Sources 목록을 제공한다. Function context/tool은 자동 citation이 아니므로 format과 실제 source 식별자를 prompt에 넣어야 한다. 올바른 XML이 렌더링된 사실은 인용이 해당 주장을 지지한다는 검증이 아니다.

```xml
<citation><key>OBJECT_RID</key></citation>
<citation><objectTypeId>TYPE_ID</objectTypeId><primaryKey>KEY</primaryKey></citation>
<citation><mediaSetKey>MEDIA_SET_RID</mediaSetKey><mediaItemKey>ITEM_RID</mediaItemKey><page>12</page></citation>
<citation><name>SOURCE_NAME</name><href>https://example.com/source</href></citation>
```

Object citation 기본 click은 해당 object, PDF는 기본 첫 page 또는 지정 page를 연다. Object type별 external URL/PDF/variable update로 click 동작을 override하거나 citation 자체를 전역 비활성화할 수 있다. Citation이 보이지 않는 상황과 retrieval이 없었던 상황을 혼동하지 않는다.

Singleton citation variable과 검색한 전체 object set output을 나눠 source preview와 결과 목록을 연결한다. URL/문서 page가 정확히 존재하고 권한에 맞게 열리는지, 답변의 수치/조건을 그 위치가 실제 지지하는지 평가한다.

## 사용자 접근과 피드백 지표는 따로 확인한다

AIP Chatbot은 Project나 folder에 저장되는 file이며 다른 resource와 같은 접근 제어를 따른다. Chatbot을 공유해도 사용자가 설정된 retrieval context에 접근하지 못하면 실행 중 오류가 난다. 사용자는 chatbot이 쓰는 model과 data source에도 접근 권한이 있어야 한다. 작성자 화면에서 잘 동작한 retrieval을 사용자 권한에서도 같은 결과로 보지 않는다. Project가 folder와 file 단위 role 부여를 막으면 chatbot 대신 Project에 role을 준다.

편집기의 chat panel은 저장하지 않은 변경까지 포함한 현재 설정으로 응답하므로, 작성자가 시험한 결과가 published version의 동작과 다를 수 있다. 저장하지 않은 변경이 있으면 Publish를 할 수 없다. End user 관점은 View에서 version을 골라 확인한다. View가 누구의 권한으로 실행되는지는 이 안내에 없으므로 권한 차이는 실제 사용자 권한으로 따로 확인한다.

Publish 뒤 Monitoring panel은 session 수, 사용자 수와 사용자가 thumbs up/down으로 helpful 또는 unhelpful을 표시한 session 비율을 보여 준다. 이 비율은 표시한 사용자의 만족 신호이며 답변의 사실 정확성이나 citation이 주장을 지지하는지에 대한 평가가 아니다. 정확성은 Function으로 게시한 chatbot을 AIP Evals로 평가하는 경로([[Palantir-AIP-Evaluation-Suites|질의와 근거 평가]])와 함께 본다. Usage panel은 Workshop, automation과 외부 배포 같은 사용처를 보여 주고 최신 published version을 AIP Assist에 노출하는 설정도 둔다. 설정 변경 전 영향 확인의 출발점으로 쓰되 이 목록이 모든 사용처를 보장한다고 보지 않는다.

## 출처

- [Palantir, AIP Chatbot Studio](https://www.palantir.com/docs/foundry/chatbot-studio)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/chatbot-studio/core-concepts)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/chatbot-studio/getting-started)
- [Palantir, Retrieval context](https://www.palantir.com/docs/foundry/chatbot-studio/retrieval-context)
- [Palantir, Citations](https://www.palantir.com/docs/foundry/chatbot-studio/citations)

## 관련 문서

- [[Palantir-Chatbot-Application-State|Application state]]
- [[Palantir-AIP-Generation-and-Data-Context|LLM의 data context]]
- [[Palantir-AIP-Evaluation-Suites|질의와 근거 평가]]
