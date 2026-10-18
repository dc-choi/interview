---
tags: [palantir, ontology, semantic-search]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 문서 검색과 Ontology augmented generation

벡터 유사도는 선택한 embedding model이 만든 근접도다. 유사한 문서를 찾는 것과 답의 사실성을 보장하는 것은 다르다. 검색 품질, 생성 품질과 원문 검증을 나눠 평가한다.

## 문서에서 검색 단위까지

문서를 text로 추출하고 chunk로 나눈 뒤 embedding을 생성한다. 표, 도표와 이미지가 핵심이면 OCR과 vision model의 결과를 비교한다. Page 번호와 media reference를 chunk에 연결하면 답변에서 실제 시각 자료를 다시 확인할 수 있다.

문자 수 기준 chunk 크기는 token 제한과 다르다. 영어의 약 4자/token은 추정치이고 다른 언어에 그대로 적용하지 않는다. Model 입력 한도에 여유를 두고 측정한다. Separator 우선순위와 overlap을 정하되 separator가 없으면 대략적인 목표 크기를 넘을 수 있다.

Document processing 예제는 explode 위치를 0부터 사용하고 문서 ID와 chunk 위치를 합쳐 식별자를 만든다. 이 방식은 재분할하면 같은 내용의 위치가 달라질 수 있으므로 영구 식별자가 필요한 시스템에서는 변경 전략을 따로 정해야 한다.

## 먼저 검색이 필요한지 판단한다

자료 전체가 context에 들어가면 검색 없이 시작해 비교 기준을 만들 수 있다. 문서의 128k token과 약 300페이지 예시는 문서 형식에 따라 달라지는 설명값이다. 검색을 추가한 뒤 품질이 나쁘면 모델부터 바꾸지 않고 실제로 검색된 근거를 확인한다.

질문과 문서는 같은 embedding model을 사용해야 한다. Model을 교체하면 저장된 문서도 다시 embedding한다. 다국어, 전문 용어와 짧은 질의는 별도 평가한다.

| 개선 방식 | 목적 | 확인할 위험 |
| --- | --- | --- |
| Keyword search | 제품명, 식별자와 전문 용어의 정확한 검색 | 표현이 달라지면 누락 |
| Semantic search | 의미가 비슷한 표현 검색 | 비슷하지만 틀린 내용 |
| Query 추출/확장 | 핵심 질문과 동의어를 검색에 반영 | 원래 의도의 왜곡 |
| HyDE | 가상 답을 만든 뒤 그 embedding으로 검색 | 생성 답을 근거로 오인 |
| RRF | 서로 다른 검색 결과의 순위를 결합 | 후보에 없는 자료는 복구하지 못함 |

RRF는 문서별로 `1 / (k + rank)`를 합산한다. 안내의 기본 k는 60이고 예제는 0부터 세는 순위를 사용한다. 이 k는 nearest-neighbor 후보 수와 다른 값이다. k를 키우면 상위 순위의 상대적인 가중치 차이가 작아진다. 같은 문서는 ID로 합쳐야 한다.

## 근거를 확인할 수 있는 출력

검색된 text뿐 아니라 원문 위치, page와 media reference를 보존한다. PDF viewer에서 원문과 답을 대조할 수 있게 하면 추출 오류와 생성 오류를 구분하기 쉽다. LLM이 만든 요약과 가상 문서는 원문 근거와 분리한다.

공식 OAG 예제에는 독립 실행 코드로 쓰기 전에 보완할 구문과 구성요소가 있다. 이 문서는 검색 설계 계약을 정리한 것이며 예제 전체의 실행을 검증한 결과가 아니다.

## 출처

- [Palantir, overview-semantic-search](https://www.palantir.com/docs/foundry/ontology/overview-semantic-search)
- [Palantir, aip-multimodal-and-embedding-models](https://www.palantir.com/docs/foundry/ontology/aip-multimodal-and-embedding-models)
- [Palantir, document-processing](https://www.palantir.com/docs/foundry/ontology/document-processing)
- [Palantir, ontology-augmented-generation](https://www.palantir.com/docs/foundry/ontology/ontology-augmented-generation)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]
- [[Palantir-Ontology-Task-Validation|업무 질문으로 검증]]

공식 문서를 대조한 지식이며 실제 Foundry 배포나 SDK 실행은 검증하지 않았다.
