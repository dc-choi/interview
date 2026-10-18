---
tags: [palantir, chatbot, tools, commands]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Chatbot tool과 client command"]
---

# Chatbot tool과 client command

Chatbot tool은 LLM이 control flow와 입력값을 결정해 호출하는 경로다. Action은 Ontology edit, Object query는 허용한 type/property의 filter/aggregation/inspection/link traversal, Function은 published Logic을 포함한 함수, variable update는 UI state 변경을 담당한다. Request clarification은 실행을 멈추고 사용자에게 필요한 맥락을 받는 경로다.

Function tool은 기본 최신 published version을 사용하지만 특정 version을 지정할 수 있다. Prompt와 model뿐 아니라 tool version 변화도 회귀 평가한다. Legacy Ontology semantic search는 citation/input-output variable과 결과 object set 전달이 없는 경로이므로 Ontology context 사용을 우선 검토한다.

## Prompted와 native 호출의 지원 범위

Prompted tool calling은 prompt에 도구 사용법을 넣으며 한 번에 한 tool만 호출한다. 모든 제공 model/tool 유형을 지원하는 경로다. Native는 일부 Palantir-provided model과 Action/Object query/Function/variable update에 한해 parallel tool 호출을 지원한다. Command를 추가했는데 native mode에서 동작할 것이라고 가정하지 않는다.

Action의 자동 실행과 user confirmation은 별도 설정이다. 도구 설명은 언제 무엇을 실행할지 구체적으로 쓰되 permission 검증을 prompt에 맡기지 않는다. Temperature 0도 입력 해석과 실제 효과의 결정성을 보장하는 설정은 아니다.

## Command는 사용자의 application에서 실행한다

Command tool은 backend API와 달리 paired application의 현재 screen/state를 사용한다. Map 이동이나 ephemeral feature drawing 같은 UI 조작에 적합하다. 생산 application이 command를 선언하고 노출해야 하며, 같은 command를 여러 번 등록해 설명/기본값을 다르게 구성할 수 있다.

Beta configuration은 기본 documentation에 추가 설명을 붙이고 parameter별로 Chatbot decides, preset, string/object-set application variable을 지정한다. Optional parameter는 넘기지 않도록 설정할 수도 있다. 입력 override와 command 호출 자체의 승인을 구분한다.

기본은 실행 전 payload를 사용자에게 보여주고 approve/reject를 받는다. 승인을 끄면 매 호출에 수동 검토 없이 실행하므로 운영 데이터 변경이나 정보 공유 등 결과가 큰 command는 review 정책을 명확히 정한다. 이는 제품 기능 설정의 선택이며 모든 환경의 자동 승인 정책을 뜻하지 않는다.

## Pairing과 실행 환경을 검증한다

Studio 시험은 별도 application window를 열고 Pair한 뒤 prompt로 command를 검증한다. 여러 application instance는 pairing group에 더할 수 있고 미연결이면 사용자가 target을 선택한다. AIP Assist에서는 chatbot usage toggle과 Publish 후 target app에 자동 pair하며 추가 app이 필요하면 선택을 요구한다.

Workshop chatbot widget과 인접 iframe app은 자동 pairing할 수 있다. 하지만 chatbot을 Function으로 publish해 Automate 등 command 미지원 backend 환경에서 실행하면 command tool은 무시된다. 동일 chatbot의 UI 시험 성공을 무인 Function 실행의 전체 기능 지원으로 확대하지 않는다.

Command tool이 있는 chatbot session은 inactivity 24시간 뒤 만료되는 retention으로 자동 설정된다. 일반 chatbot의 indefinite opt-in 이력과 구분한다. Save와 Publish도 다르며 production은 published version을 사용한다.

## 출처

- [Palantir, Chatbot tools](https://www.palantir.com/docs/foundry/chatbot-studio/tools)
- [Palantir, Commands as tools](https://www.palantir.com/docs/foundry/chatbot-studio/commands-as-tools)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/chatbot-studio/getting-started)

## 관련 문서

- [[Palantir-Chatbot-Application-State|Deterministic tool input]]
- [[Palantir-Chatbot-Sessions-and-Distribution|Session과 Function publish]]
- [[Palantir-Assist-Content-and-Context|AIP Assist 배포]]
