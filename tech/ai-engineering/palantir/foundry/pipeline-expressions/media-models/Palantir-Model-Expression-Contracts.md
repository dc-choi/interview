---
tags: [palantir, pipeline-builder, llm, embeddings]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Pipeline 표현식의 LLM과 임베딩 호출

모델의 결과, 입력 결측과 실행 오류를 구분해야 한다. 아래 두 함수는 Batch 지원으로 표시되며, 실제 모델 호출이나 계정별 모델 가용성은 확인하지 않았다.

## LLM 입력과 출력

`useLlmV3`은 모델, 사용자 prompt, system prompt와 출력 타입을 받는다. 사용자 prompt에는 이미지와 PDF 미디어를 넣을 수 있고 PDF는 이미지 목록으로 변환한다. System prompt에는 미디어 참조를 넣을 수 없다.

전체 prompt가 비거나 null이면 출력이 null이다. 일부 열만 null이면 해당 부분을 `<null>`로 취급한다. 미디어 항목을 prompt로 사용할 수 있다는 설명과 별개로, 텍스트 없이 media reference만 넣은 예제는 null이다. 미디어 단독 요청이 모든 구성에서 가능하다고 단정하지 않는다.

Simple 출력은 오류를 null로 돌려주며 With errors는 `ok`와 `error`를 가진 struct를 반환한다. 따라서 입력 결측과 모델 한도 초과를 구분하려면 오류 정보를 보존하는 모드를 검토한다. Boolean, 숫자, 날짜, 문자열, 배열과 struct 등을 지정할 수 있지만 타입 적합성이 답변 내용의 사실성을 보장하지는 않는다.

공식 예제 하나는 `WITH_ERRORS`를 Output mode 대신 Output type 위치에 표시한다. 선언된 인자 구분을 기준으로 설정하고 실제 UI/SDK 계약을 확인해야 한다. [Use LLM](https://www.palantir.com/docs/foundry/pb-functions-expression/useLlmV3)

## 임베딩 생성과 오류 모드

`textToEmbeddingsV2`는 모델과 텍스트를 받아 Embedded vector를 만든다. null, 빈 문자열과 모델 입력 한도 초과의 null 예제가 있다. 다만 `SIMPLE`로 표시된 다른 예제는 `{ok, error}` struct를 반환해 선언/예제 사이에 모호함이 있다. 호출자가 실제 반환 스키마를 확인하기 전에는 모든 오류가 null이라고 가정하지 않는다.

모델별 예제 벡터는 중간이 생략되어 있으며 서로 다른 모델의 앞부분이 같게 표시되기도 한다. 이를 모델 간 동일 출력, 벡터 차원이나 호환성의 증거로 사용하지 않는다. [Text to embeddings](https://www.palantir.com/docs/foundry/pb-functions-expression/textToEmbeddingsV2)

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`useLlmV2` 중국어 문서는 Batch, typed output과 Simple/With errors를 설명한다. Null/빈 prompt와 media reference만 있는 입력은 null인 예시가 있다. With errors 예제에서 `WITH_ERRORS`가 Output type에 들어간 표기 불일치가 있으므로 예제를 그대로 호출 설정으로 옮기지 않는다. 예시 모델 이름과 의료 응답은 현재 모델 지원이나 의료 정확성의 증거가 아니다.

## 출처

- [Palantir, useLlmV2 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/useLlmV2/)

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-String-Normalization-Contracts|분할 단위와 토큰 한도]]
- [[Palantir-Text-and-Vector-Similarity-Contracts|벡터 유사도 비교의 조건]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
