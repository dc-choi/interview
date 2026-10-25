---
tags: [palantir, chatbot, tools, commands]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Chatbot tool과 client command"]
---

# Chatbot tool과 client command

Chatbot tool은 LLM이 control flow를 정하고 입력값을 구성해 호출하는 경로다. 다만 Action과 Function은 application variable의 deterministic input(string과 object set 입력만)을, Command는 beta configuration에서 preset 값이나 string/object set application variable을 쓰도록 입력을 고정할 수 있다. Action은 Ontology edit, Object query는 허용한 type/property의 filter/aggregation/inspection/link traversal, Function은 published Logic을 포함한 함수 호출을 담당한다. Update application variable은 Application state에 구성한 application variable의 값을 갱신하며, 그 variable을 같은 유형의 Workshop variable에 매핑하면 다른 widget에 출력을 보여 줄 수 있다. 2026-10-26 공식 Tools 문서 기준, Object query는 접근 가능한 property를 지정해 query의 token 효율을 높일 수 있다. Request clarification은 실행을 멈추고 사용자에게 필요한 맥락을 받는 경로다.

Function tool은 기본 최신 published version을 사용하지만 특정 version을 지정할 수 있다. Prompt와 model뿐 아니라 tool version 변화도 회귀 평가한다. Legacy Ontology semantic search는 citation/input-output variable과 결과 object set 전달이 없는 경로이므로 Ontology context 사용을 우선 검토한다.

## Prompted mode와 native mode의 지원 범위

2026-10-26 공식 Tools 문서 기준, prompted mode(prompted tool calling)는 prompt에 도구 사용 지시를 넣어 LLM이 도구를 쓰게 하며 한 번에 한 tool만 호출한다. 이 mode는 모든 tool 유형과 사용 가능한 모든 model을 지원하지만, 여러 tool 호출이 필요한 복잡한 질의에서는 응답이 더 오래 걸릴 수 있다. Native mode(native tool calling) 자체는 일부 Palantir-provided model과 Action, Object query, Function, Update application variable tool에서만 사용할 수 있다. 이 mode에서는 chatbot이 여러 tool을 병렬로 호출할 수 있으며, native mode의 속도와 성능 이점은 더 높은 token 효율과 병렬 호출에서 나온다. 두 mode를 모두 쓸 수 있는 구성이면 대표 질의로 두 mode의 지연과 token 사용량을 비교한다. Command를 추가했는데 native mode에서 동작할 것이라고 가정하지 않는다.

2026-10-26 공식 Tools 문서 기준, Request clarification도 native mode 지원 목록에 없다. Command나 clarification이 필요한 구성은 prompted mode를 선택한다. 도구의 등록 가능 여부와 선택한 모델 및 mode에서의 호출 지원을 함께 확인한다.

## 실행 방식과 응답 검토

Action tool은 자동 실행 또는 사용자 확인 후 실행 중 하나로 구성한다. 도구 설명은 언제 무엇을 실행할지 구체적으로 쓰되 permission 검증을 prompt에 맡기지 않는다. 2026-10-26 공식 Getting started 문서 기준 temperature는 focused, deterministic output(기본값 0)과 random output(최댓값 1) 사이의 균형을 정한다. 다만 temperature 0을 도구 입력 해석이나 실제 부작용의 재현을 보장하는 설정으로 간주하지 않는다.

Edit mode, view mode, Workshop과 AIP Threads에서는 응답 아래의 **View reasoning**으로 응답 생성 과정을 조사할 수 있다. 이는 LLM의 reasoning 과정을 살피는 진입점이며(도구 호출이 어떤 형태로 표시되는지는 공식 문서에서 확인하지 못했다), 실제 데이터 변경의 성공 여부는 View reasoning이 아니라 실행 결과와 대상 object의 변경을 대조하는 운영 점검으로 확인한다.

## Command는 사용자의 application에서 실행한다

Command tool은 backend API와 달리 paired application의 현재 screen/state를 사용한다. Map 이동이나 ephemeral feature drawing 같은 UI 조작에 적합하다. Chatbot은 application이 command를 선언하고 제공(declare and produce)해야 그 command를 tool로 쓸 수 있다. Instance마다 다른 prompt가 필요하면 같은 command를 여러 번 선택해 각각 구성할 수 있다.

Beta configuration은 기본 documentation에 추가 설명을 붙이고 parameter별로 Chatbot decides, preset, string/object-set application variable을 지정한다. Optional parameter는 넘기지 않도록 설정할 수도 있다. 입력 override와 command 호출 자체의 승인을 구분한다.

기본은 실행 전 payload를 사용자에게 보여주고 approve/reject를 받는다. 승인을 끄면 사용자의 prompt만으로 수동 승인 없이 command를 실행하므로, 잘못되거나 범위가 넓은 command가 사람의 개입 없이 동작할 수 있다. 공식 문서는 운영 데이터를 바꾸거나 정보를 공유하거나 그 밖에 중대한 영향을 주는 command에 실행 전 사용자 승인을 요구하는 것을 privacy best practice로 권한다.

## Pairing과 실행 환경을 검증한다

Studio 시험은 별도 application window를 열고 Pair한 뒤 prompt로 command를 검증한다. 여러 application instance는 pairing group에 더할 수 있고 미연결이면 사용자가 target을 선택한다. AIP Assist에서는 Usage panel의 AIP Assist toggle을 켜고 Publish한 뒤 AIP Assist에서 chatbot을 고르면 target application에 자동 pair한다. 여러 application용 tool이 있는데 그 application들과 pair되지 않았으면 열린 browser tab 중 pair할 application을 고르게 한다.

Workshop chatbot widget과 인접 iframe app은 자동 pairing할 수 있다. 하지만 chatbot을 Function으로 publish해 Automate 등 command 미지원 backend 환경에서 실행하면 command tool은 무시된다. 동일 chatbot의 UI 시험 성공을 무인 Function 실행의 전체 기능 지원으로 확대하지 않는다.

Command tool을 쓰는 chatbot은 retention window가 inactivity 24시간 뒤 만료되도록 자동 설정된다. 2025년 5월 공지는 indefinite conversation retention을 AIP Agent Studio(2026년 4월 말 AIP Chatbot Studio로 개명)의 선택 설정으로 소개하며 24시간 retention과 대비했으므로, command tool chatbot의 대화가 inactivity 24시간을 넘어 유지된다고 가정하지 않고 현재 동작은 공식 문서로 다시 확인한다. Save와 Publish도 다르며 production은 published version을 사용한다.

## 출처

- [Palantir, Chatbot tools](https://www.palantir.com/docs/foundry/chatbot-studio/tools)
- [Palantir, Commands as tools](https://www.palantir.com/docs/foundry/chatbot-studio/commands-as-tools)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/chatbot-studio/getting-started)
- [Palantir, Chatbot application state](https://www.palantir.com/docs/foundry/chatbot-studio/application-state)
- [Palantir, May 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-05)

## 관련 문서

- [[Palantir-Chatbot-Application-State|Deterministic tool input]]
- [[Palantir-Chatbot-Sessions-and-Distribution|Session과 Function publish]]
- [[Palantir-Assist-Content-and-Context|AIP Assist 배포]]
