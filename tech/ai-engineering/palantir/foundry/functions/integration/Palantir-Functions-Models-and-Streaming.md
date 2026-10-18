---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 모델 호출과 streaming 함수

## 모델 배포를 함수에서 사용

2026년 2월 이후 새 live deployment는 Ontology-bound 경로를 따른다. TypeScript v2/Python은 Ontology-bound 배포를 사용하고 v1의 기존 space-bound 호출과 구분한다. space migration 뒤 기존 게시 v1 함수의 호환성과 새 preview/tag에서 필요한 import 갱신은 다르다. API name으로 호출하는 Platform SDK query는 즉시 영향을 받을 수 있다.

Row-wise 호출은 tabular input/output이 각각 정확히 하나인 계약을 확인한다. 추가 입출력이 있으면 같은 방식으로 사용할 수 없다. 모델 네트워크 입력/출력 50MB와 함수 시간 한도는 함께 적용되며 Ontology Action edit 한도는 또 별개다.

구형 한국어 `model-functions`의 `@ModelFunction`은 primitive 계산을 model graph에서 쓰는 설명이다. 현재 live deployment wrapper나 자유로운 Ontology 조회 함수와 같은 것으로 합치지 않는다.

## Language model API

v1의 최신 `@foundry/languagemodelservice`는 Result의 ok/value를 처리하는 형태이고 legacy `@foundry/models-api` 예제는 직접 choices를 읽는 형태다. package 교체에는 반환 계약과 정적 분석 의존성 갱신이 필요하다.

v2/Python은 Foundry proxy endpoint, model alias, 주입된 인증 client/fetch를 통해 호환 SDK를 사용한다. 외부 OpenAI URL로 token을 보내는 예제로 해석하지 않는다. 모델 rate limit, 함수 elapsed time, 응답 크기를 함께 확인한다.

Streaming 함수는 Python Iterable/yield, TypeScript async generator/AsyncIterable로 chunk를 반환한다. OSDK streaming 호출은 beta이며 TypeScript unstable helper 또는 Python AllowBetaFeatures가 필요하다. 첫 chunk가 도착한 것과 전체 실행 성공은 다르며, 클라이언트는 중간 실패와 취소를 처리해야 한다.

## 출처

- [Palantir, functions-on-models](https://www.palantir.com/docs/foundry/functions/functions-on-models)
- [Palantir, language-models](https://www.palantir.com/docs/foundry/functions/language-models)
- [Palantir, language-models-legacy](https://www.palantir.com/docs/foundry/functions/language-models-legacy)
- [Palantir, language-models-python-tsv2](https://www.palantir.com/docs/foundry/functions/language-models-python-tsv2)
- [Palantir, model-functions](https://palantir.com/docs/kr/foundry/functions/model-functions/)
- [Palantir, streaming-functions](https://www.palantir.com/docs/foundry/functions/streaming-functions)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
