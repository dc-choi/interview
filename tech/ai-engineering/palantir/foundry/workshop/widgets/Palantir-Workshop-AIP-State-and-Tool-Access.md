---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop AIP의 상태와 도구 접근"]
---

# Workshop AIP의 상태와 도구 접근

Workshop AIP는 widget 생성, 분석, chatbot과 generated content처럼 서로 다른 기능이다. AIP enablement와 개별 app/function/data 권한이 필요하다. Source의 model 목록이나 feature availability는 해당 snapshot 설명이며 실제 enrollment의 지원을 별도 확인한다.

## Function과 UI

Function-backed variable은 tagged release와 input mapping을 사용한다. 같은 input의 cache와 Automatic/event recompute를 구분한다. TSv1 .all() 후 in-memory filter보다 TSv2/Python server-side filter+count는 object 전체 전달을 피한다. Function-backed action은 read용 variable과 달리 Ontology write의 권한/criteria 경로를 거친다.

OAuth outbound function은 직접 widget/variable 호출에서 interactive authorization prompt를 띄우지 못한다. 이미 authorization이 없으면 fail할 수 있어 prompt가 필요한 경우 function-backed action으로 감싸는 경로를 문서가 안내한다. UI에서 function을 찾는 것과 외부 source 인증 성공은 별개다.

## Chatbot

권장 Chatbot Studio 경로는 published version과 reasoning 표시, application variable mapping의 read/write mode를 지정한다. Textbox 변수는 사용자 입력도 반영하지만 외부에서 값을 바꾸면 message가 자동 전송되므로 단순 input prefill과 같은 동작으로 가정하지 않는다.

Ontology scenario를 선택한 chatbot은 해당 isolated state를 읽고 Action edits를 그 scenario 안에 남긴다. Workshop legacy scenario와 신규 Ontology scenario 지원을 구분한다. Commands는 다른 app의 state/operation을 다룰 수 있으므로 variable access와 tool capability를 필요한 범위로 제한한다.

Legacy chatbot은 soon-sunset 안내가 있고 role/tools/variables/object types를 module에서 구성한다. Prompt의 업무 가이드만으로 authorization을 강제하지 않는다. Source도 stochastic output에 대해 constrained context, fallback과 실제 query 표시를 권한다.

## 생성과 검토

AIP Generated Content는 Logic/direct LLM/prompt function 경로를 갖고 AIP Logic app 접근이 없으면 widget-not-found처럼 보이는 error가 생길 수 있다. Temperature 낮음은 결정성/정확성 보장이 아니다. Events와 generated-content 문서의 옛 GPT3/4 목록은 현재 model catalog 전체로 채택하지 않는다.

복구한 한국어 AIP widget-generation source는 원문에 검증되지 않은 AIP 번역이라고 표시되어 있다. Module object type context가 필요하고 Add widget 전까지 generated configuration을 반영하지 않는다고 설명하지만 영문 현행 availability를 추가 증명하지 않는다. AIP Analyst는 도구/UI 구성 외 opening checkpoint가 있을 수 있다. 실제 model/tool 호출은 수행하지 않았다.

## 출처

- [Palantir Workshop, aip-features-in-workshop](https://palantir.com/docs/kr/foundry/workshop/aip-features-in-workshop/)
- [Palantir Workshop, functions-overview](https://www.palantir.com/docs/foundry/workshop/functions-overview)
- [Palantir Workshop, functions-use](https://www.palantir.com/docs/foundry/workshop/functions-use)
- [Palantir Workshop, widgets-aip-analyst](https://www.palantir.com/docs/foundry/workshop/widgets-aip-analyst)
- [Palantir Workshop, widgets-aip-chatbot](https://www.palantir.com/docs/foundry/workshop/widgets-aip-chatbot)
- [Palantir Workshop, widgets-aip-generated-content](https://www.palantir.com/docs/foundry/workshop/widgets-aip-generated-content)

## 관련 문서

- [[Palantir-Workshop]]
