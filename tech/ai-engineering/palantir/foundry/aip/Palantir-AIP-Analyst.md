---
tags: [palantir, aip-analyst, analytics, agent, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP Analyst 분석과 embedding"]
---

# AIP Analyst의 분석, 저장과 앱 통합

AIP Analyst는 Ontology 탐색, object set, SQL/집계와 시각화를 tool loop로 연결하는 대화형 분석 앱이다. Dataset/function/Action/media/time-series, Notepad/Quiver/Contour도 사용할 수 있다. 같은 질문이 여러 모델 호출과 backend query를 유발하므로 답변 하나를 호출 하나로 계산하지 않는다.

## 검색 scope와 데이터 인가를 구분한다

Ontology/object group/status/visibility/project scope는 **Object type search와 Object search** 결과에 적용한다. Project가 아닌 folder는 해당 scope에서 무시하고 manually added context에는 project filter가 적용되지 않는다. Scope는 탐색을 좁히는 계약이며 모든 resource 접근을 막는 보안 정책으로 확대하지 않는다.

Unsaved analysis는 사용자 설정을 이후 새 분석 default로 저장하고 미지정 항목에 primary organization default를 사용한다. Saved analysis는 자체 scope를 저장하며 미지정 부분을 조직/사용자 default로 메우지 않는다. Widget도 자체 scope가 우선이다. 모델 Fast/Balanced/Smart category 뒤 실제 model은 자동 갱신될 수 있고 Custom으로 특정 model을 고정하면 자동 갱신을 받지 않는다.

Tools 메뉴는 category/개별 도구를 제어하고 Manage tools로 agent도 조정할 수 있다. Object lookup, SQL/aggregation, function 실행과 Action은 실제 backend 계약을 따른다. Action은 기본 사용자 확인 후 실행하지만 auto-submit으로 구성할 수 있다. PDF page range/semantic search와 media attachment, spreadsheet/Word/image/PDF upload를 지원한다. Word embedded image와 PDF 시각 정보도 처리하지만 실제 추출 품질은 자료로 확인한다.

## 저장된 분석은 과거 답변 스냅샷이 아니다

Compass analysis resource는 사용자 messages, tool calls와 reference를 저장하며 tool results와 agent responses는 저장하지 않는다. 다시 열면 최신 데이터에 tool을 재실행하고 viewer 권한을 적용한다. 저장 당시 수치를 재현하는 보고서로 해석하지 않는다. Save Review에서 messages/tools/references를 확인한다.

저장한 model category는 다시 열 때 현재 category model로 해석될 수 있다. Category 없이 specific model을 저장한 분석은 그 model을 유지한다. Analysis access가 모든 referenced resource 접근을 부여하지 않아 viewer마다 skip/error와 결과 차이가 날 수 있다. CBAC 환경은 저장 때 classification marking을 적용한다.

PDF와 Notepad export는 별도 artifact다. PDF는 context/tool 포함 범위를 preview하고 Notepad는 message text와 tool view 이미지를 저장한다. 요약 Notepad, skill 생성, Quiver/Contour 전환도 가능하다. 분석의 dynamic replay와 export 시점의 결과 보존은 다른 선택이다.

## Widget 입력은 계속 동기화되는 데이터 binding과 다르다

Custom prompt는 기본 system prompt 뒤에 append한다. Specific model을 해당 project에 attribution할 수 없으면 fallback model을 쓰므로 model RID 선택만 보고 실제 model을 확정하지 않는다. Suggested prompt와 여러 context에는 rationale title/description을 붙일 수 있다.

User message variable 변경은 자동 메시지 제출과 분석 시작을 유발한다. Input object set은 chat 시작 후 업데이트를 듣지 않고 new chat/reset까지 초기값을 유지한다. Save된 기존 chat을 load해도 widget configured inputs를 새로 적용하지 않으며 새 chat/reset에서 사용한다. 반면 widget tool options/scope는 저장 분석 설정보다 우선한다.

Output은 last object set, user/assistant messages와 Vega spec, cited object/media와 active running 상태 등을 변수로 전달한다. Vega spec에는 데이터가 embed돼 **live view가 아닌 snapshot**이다. All messages의 tool-use/result JSON shape에는 backward compatibility 보장이 없으므로 외부 고정 schema로 의존하지 않는다. Citation output 연결은 기본 reference 동작을 override한다.

On user message send Action은 메시지 제출 전에 실행하므로 All user messages에 새 메시지가 아직 없다. On agent stopped Action은 active tab의 agent가 멈출 때 실행하고 실행 중 새 메시지를 막는다. Required parameter를 모두 미리 연결하며 Action success와 agent의 해석 품질을 구분한다.

## 숨김 설정의 한계를 확인한다

Hide input은 variable-triggered message를 막지 않는다. Add context options는 메뉴만 바꾸고 pasted URL/drag-drop/message의 context 추가나 tool 권한에는 영향을 주지 않는다. Hide tab header는 새 tab과 branch도 끈다. Default tools와 Hide configure tools button을 함께 쓰는 것은 widget 도구 구성 방법이며 데이터 resource 인가와는 별도다.

Browser tab이 열린 동안 unsaved draft는 memory에 남아 widget을 숨겼다 보여도 유지한다. Refresh/close는 지우며 Clear chat on navigation 또는 Reset key로 명시적으로 초기화할 수 있다. 분석의 tab branching은 이전 문맥을 복사한 새 경로이며 background tab도 계속 실행한다.

Iframe URL은 제한된 설정만 제공한다. Ontology/group/project scope, preload resources, model/view와 initialMessage/autoStart를 설정하고 더 세밀한 통제는 단일 full-page widget module을 embed한다. `autoSubmitActionTypeRids`는 확인 없이 실행할 Action 노출이므로 ordinary context attachment와 구별한다.

## 관리자 default와 강제 정책을 구분한다

Enrollment는 primary organization 기준으로 analysis saving/action execution/file upload를 disable할 수 있다. Action exception group은 nested membership도 포함하고 빈 목록이면 전원 금지다. Upload disable에도 media set 경로는 남는다. Analysis saving disable은 생성뿐 아니라 기존 resource 열기도 막는다.

Group skill은 같은 skill을 중복 표시하지 않고 어느 group 하나가 enable하면 기본 enable한다. 사용자 override가 group default보다 우선하며 사용자는 inherited skill을 disable할 수 있다. 조직 search/model default도 새 unsaved 분석의 default일 뿐 사용자가 바꿀 수 있다. 반면 PDF watermark는 required export control로 사용자가 제거/수정하지 못하며 PDF에만 적용한다.

## Token 비용과 backend compute를 분리한다

매 model call은 instructions/tool definitions, retained messages/results를 다시 보낸다. 큰 query 결과는 이후 turn에도 반복 비용을 만들므로 aggregate/SQL로 좁힌 값을 반환하고 필요 없는 context를 hide/cleanup한다. 새 주제는 새 tab을 고려하고 search scope/context preload로 탐색 낭비를 줄인다.

Ontology query/write, dataset SQL, function, time-series와 media는 각 backend compute를 별도로 사용한다. Visualization/planning과 Workshop/Machinery metadata lookup은 별도 query engine 대신 주로 model token 비용이지만 그 결과로 수행한 후속 query는 해당 backend에 귀속된다. 생성한 dashboard/analysis는 이후 열 때도 자원별 compute가 발생한다.

Token attribution은 saved analysis resource, embedded owning module, unsaved user(또는 설정 project)에 따라 다르다. Federated backend는 자체 규칙을 따른다. Token estimator/outline, exported AIP Token Usage와 Resource Management를 함께 본다.

반복 계산이 안정되면 function으로 여러 tool 호출을 하나로 줄인다. Skill은 접근법을 재사용하지만 여전히 tool loop를 수행해 compute를 자동 줄이지는 않는다. 장시간 자율 작업은 async Pro-code agent로 분리하되 Void agent를 query tool처럼 결과 반환에 사용할 수는 없다. 이는 비용/신뢰성 설계 원리이며 모든 function이 결정적이라는 보편 보장은 아니다.

## 출처

- [Palantir, AIP Analyst](https://www.palantir.com/docs/foundry/aip-analyst/overview)
- [Palantir, Capabilities](https://www.palantir.com/docs/foundry/aip-analyst/capabilities)
- [Palantir, Using AIP Analyst](https://www.palantir.com/docs/foundry/aip-analyst/using-aip-analyst)
- [Palantir, Analysis resources](https://www.palantir.com/docs/foundry/aip-analyst/analysis-resources)
- [Palantir, Admin configuration](https://www.palantir.com/docs/foundry/aip-analyst/admin-configuration)
- [Palantir, Compute usage with AIP Analyst](https://www.palantir.com/docs/foundry/aip-analyst/compute-usage)
- [Palantir, Embed AIP Analyst](https://www.palantir.com/docs/foundry/aip-analyst/embed)
- [Palantir, AIP Analyst Workshop widget](https://www.palantir.com/docs/foundry/aip-analyst/workshop-widget)

## 관련 문서

- [[Palantir-Workshop-Applications|화면 변수와 이벤트]]
- [[Palantir-Pro-Code-Agents|비동기 agent 결과]]
- [[Palantir-Logs-and-Usage-Governance|활동/비용 데이터와 보호]]
- [[Palantir-AI-FDE-and-Skills|개발 agent와 skill]]
