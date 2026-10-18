---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 함수 interface와 환경별 alias

Function interface는 입력 이름, 위치, 필수 여부와 반환 타입의 계약이다. 단순히 비슷한 함수 이름을 가진 것으로 충족하지 않는다. custom struct의 호환성과 optional 필드의 공통 부분도 검사한다. 특정 제품의 향후 interface 사용 계획은 현재 지원으로 보지 않는다.

Source alias는 Data Connection source의 환경별 RID를 코드에서 분리한다. `sources` 선언과 `getSource`/`get_source`에 같은 repository-unique alias key를 사용한다. Marketplace 설치자는 입력 source를 자기 환경에 매핑할 수 있다.

Custom alias는 설치 시 바꿀 수 있는 문자열 설정이다. 기능을 임의로 바꾸는 플러그인이나 권한 검사를 대체하지 않는다. v1의 `@Static` 함수 override와 v2의 custom string은 서로 다른 확장 방식이다.

Model alias는 모델 선택을 코드의 문자열 key로 표현하지만 현재 Marketplace에서 다른 모델로 remap하는 기능과 같지 않다. 대상 환경에서 정확한 모델 RID를 사용할 수 있는지 확인해야 한다. Source alias의 이식성을 model alias에 그대로 적용하지 않는다.

## 출처

- [Palantir, function-interfaces](https://www.palantir.com/docs/foundry/functions/function-interfaces)
- [Palantir, custom-aliases](https://www.palantir.com/docs/foundry/functions/custom-aliases)
- [Palantir, source-aliases](https://www.palantir.com/docs/foundry/functions/source-aliases)
- [Palantir, model-aliases](https://www.palantir.com/docs/foundry/functions/model-aliases)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
