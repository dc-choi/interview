---
tags: [palantir, chatbot, rag, citations]
status: done
verified_at: 2026-10-16
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
