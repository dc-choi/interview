---
tags: [palantir, aip, logic]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Logic block과 문맥 경계

## 블록의 입력과 출력

Logic은 project folder에 저장하는 함수 자원이다. Input, block과 output을 연결하며 마지막 block의 결과가 함수 output이 된다. Primitive/object 외에도 struct로 여러 이름 있는 값을 반환할 수 있다. 일반 home folder와 project folder를 구분한다.

Use LLM은 prompt, 도구와 출력 schema를 구성한다. 모델에게 주는 객체 속성과 query 반환 개수를 제한해 관련 데이터만 전달한다. 도구 응답도 block token 한도에 포함된다. Block마다 context 한도가 새로 적용되며 후속 block은 명시적으로 넘긴 정보만 받는다.

모든 모델이 native tool calling을 지원하면 Logic이 native로 전환하고 Debugger에 알린다. 하나라도 지원하지 않으면 prompted 방식을 유지한다. Prompt에 도구 이름을 적는 것과 실제 도구를 허용하는 설정은 다르다. 플랫폼은 실행 모드의 권한 범위에서 호출을 처리한다.

## 결정적 계산과 제어 흐름

명확한 계산/호출은 Execute function, Apply action과 transform block으로 표현하면 모델 호출과 token을 줄일 수 있다. Apply action block이 존재해도 Ontology commit에는 상위 Action 실행 문맥이 필요하다. LLM이 제안한 편집과 실제 반영을 구분한다.

Conditional의 모든 branch는 일관된 반환 타입을 가져야 한다. Ontology edits를 반환하는 branch와 함께 다른 branch를 둘 때는 action 또는 take no action을 명시한다. Loop는 List를 입력으로 받고 Array를 고르면 변환 block을 자동 삽입한다. Element/index 변수를 사용할 수 있으며 action이 없는 반복은 병렬 실행된다.

## 개선과 평가

작은 입출력 사례 집합을 prompt 변경마다 반복하고 few-shot, 필요한 속성만의 context와 deterministic block을 비교한다. Feedback object에 제안/근거/사람 검증 결정을 기록한 뒤 유사 사례를 다시 조회하는 방식은 retrieval feedback loop이며 모델 가중치가 자동 학습된다는 뜻은 아니다.

Generated evals는 입력/출력뿐 아니라 참조 object type을 포함해 사례와 metric을 만든다. 사람이 사례와 evaluator를 보완하고 반복 편차, 실패 유형과 cost를 확인한다. Optional metric의 No value는 집계에서 제외되므로 결측을 성공 점수로 계산하지 않는다. 실행 이력은 Add as test case로 재사용할 수 있다.

Debugger의 prompt/tool/execution log는 재현과 실패 조사 자료다. 화면이 설명하는 사고 과정이 모델 내부 추론을 빠짐없이 보여 준다는 보장으로 해석하지 않는다. 한국어/중국어로 복구된 이전 concepts는 검증되지 않은 기계 번역이며 과거 4개 block 분류를 현재 전체 목록으로 사용하지 않는다.

## 호출 경로별 제한

Debugger에서는 5분 제한이 적용되지 않지만 Workshop과 function execution API에서는 적용된다. 디버거 성공 뒤 실제 소비 경로의 지연도 검증한다. Command-line 호출 예제는 Ontology edits 반환 함수에는 제공되지 않는다. Temperature 0은 문서 기본값이며 결과의 완전한 결정성을 보장하지 않는다.

## 출처

- [Palantir Foundry, logic](https://www.palantir.com/docs/foundry/logic/)
- [Palantir Foundry, blocks](https://www.palantir.com/docs/foundry/logic/blocks/)
- [Palantir Foundry, concepts (기계 번역)](https://palantir.com/docs/zh/foundry/logic/concepts/)
- [Palantir Foundry, core-concepts](https://www.palantir.com/docs/foundry/logic/core-concepts/)
- [Palantir Foundry, faq](https://www.palantir.com/docs/foundry/logic/faq/)
- [Palantir Foundry, getting-started](https://www.palantir.com/docs/foundry/logic/getting-started/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/logic/overview/)

## 관련 문서

- [[Palantir-Foundry-Logic]]
- [[Palantir-AIP-Logic-and-Evaluation]]
