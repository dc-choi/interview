---
tags: [palantir, foundry, document-intelligence]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 문서 추출 전략과 평가의 경계

Document Intelligence는 media set의 문서에 여러 추출 전략을 실행하고 Markdown과 원문 bounding box, 품질/시간/token 비용을 비교한 뒤 batch transform 또는 page function으로 배포한다. Raw text는 전자 PDF의 embedded text, OCR은 문자 인식, layout-aware OCR은 블록/표 구조를 함께 가져온다. VLM은 원본 page image와 선택적 OCR 전처리 결과를 사용한다.

## 추출 API 계약

권장 V2 operation은 extractTextV2와 extractLayoutAwareTextV2다. ELECTRONIC은 embedded text, SCAN은 OCR, AUTO는 page별 판정이며 작은 추가 계산 비용이 있다. Format은 TEXT/MARKDOWN/HTML이고 비영어 scanned 문서에는 OCR language를 지정한다. 한국어 예시는 KOR다. 전자 PDF나 영어 문서는 language를 생략할 수 있다.

Page range는 0 기반 start inclusive/end exclusive다. 0~5는 다섯 page다. 문서 크기/모델/할당량에 따라 5~10page batch부터 조정한다. Layout-aware V2는 pages 배열과 block을 반환하며 TEXT block도 type/text의 tagged value이므로 plain string으로 곧바로 처리하지 않는다.

이 API 범위를 Pipeline Builder의 입력값에 그대로 옮기지 않는다. 공식 Transform media 가이드의 PDF text extraction 예시는 첫 페이지를 `1`로 지정하고, 설정 화면은 End page를 포함한다고 명시한다. Slice PDF v1 화면도 끝 페이지를 포함한다. 화면/operation 버전을 확인하고 같은 문서의 첫 페이지와 마지막 페이지로 범위를 검증한다. (2026-10-18 [공식 가이드](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-transform-media), [PDF 추출 설정 화면](https://www.palantir.com/docs/resources/foundry/pipeline-builder/transforms-media-configure-extract-text@2x.png), [Slice PDF v1 화면](https://www.palantir.com/docs/resources/foundry/pipeline-builder/transforms-media-search-slice@2x.png) 대조)

## 품질을 판단하는 방법

공식 core-concepts는 평가에 enrollment의 Claude 4 Sonnet이 필요하다고 제한한다. Rubric은 1~5점으로 table/header 등 추출 품질을 모델이 판단하는 방식이며 원문의 정답 보증이 아니다. 일반 selected-VLM 설명보다 이 구체적인 availability 조건을 함께 확인한다.

원문 image와 bounding box, 빠진 표/열/주석을 직접 비교하고 업무상 필요한 값의 정확성으로 전략을 고른다. 기본 prompt와 평가 prompt가 공급자의 내부 evaluation set에 맞춰졌다는 설명은 내 문서 분포의 검증을 대신하지 않는다. Chunk preview와 embedding 생성은 추출 정확성 확인 이후의 별도 단계다.

## 출처

- [Palantir, document-intelligence](https://www.palantir.com/docs/foundry/document-intelligence)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/document-intelligence/core-concepts)
- [Palantir, document-to-text](https://www.palantir.com/docs/foundry/document-intelligence/document-to-text)
- [Palantir, overview](https://www.palantir.com/docs/foundry/document-intelligence/overview)

## 관련 문서

- [[Palantir-Document-Intelligence]]
- [[Palantir-Data-and-Model-Integration]]
