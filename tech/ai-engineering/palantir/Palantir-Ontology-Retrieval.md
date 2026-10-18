---
tags: [palantir, ontology, retrieval, semantic-search, rag]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 온톨로지 검색", "Ontology Augmented Generation"]
---

# Ontology 검색: 원문, 객체와 계산을 연결한다

Ontology 검색은 관련 텍스트를 찾는 일과 업무 객체의 관계, 권한과 계산을 함께 다루는 일로 나뉜다. 문서 청크를 객체로 만들고 원문과 연결하면 검색 결과를 실제 자료와 대조할 수 있다. 검색 결과가 질문에 답할 충분한 근거인지, 그 결과로 행동할 권한이 있는지는 별도로 판단한다.

2026-10-16 공개 문서를 대조했다. 아래 예시는 설계 설명이며 Foundry의 검색 정확도, 지연과 권한을 직접 시험한 결과는 아니다.

## 원문과 청크의 연결부터 설계한다

PDF는 media set으로 가져와 텍스트를 추출하고 청크별 행으로 나눈다. 각 청크에 원본 객체의 식별자, 청크 식별자와 media reference를 남겨 원문으로 돌아갈 수 있게 한다. `Chunk string`의 크기와 겹침은 **문자 단위**이며 구분자 우선순위로 분할한다. 모델의 토큰 한도와 같은 단위로 계산하지 않는다. [Document processing](https://www.palantir.com/docs/foundry/ontology/document-processing)

공식 예제의 `원본 ID + 청크 위치`는 한 번의 분할 결과를 식별하는 방법이다. 원문이나 분할 규칙이 바뀌어도 같은 위치가 같은 의미를 가리킨다는 보장은 아니다. 변경 전후 근거 재현이 필요하면 원문 버전, 추출 방식과 청크 생성 버전을 함께 추적한다. 이 버전 설계는 예제에 대한 적용 해석이다.

도표와 이미지가 핵심이면 텍스트 추출 결과만으로 충분하지 않다. 청크에 페이지 번호와 페이지 이미지의 media reference를 보존하면 텍스트로 후보를 찾은 뒤 해당 이미지를 vision 모델에 전달할 수 있다. OCR과 VLM 추출은 실제 문서로 비교한다. [Choose multimodal and embedding models](https://www.palantir.com/docs/foundry/ontology/aip-multimodal-and-embedding-models)

## 임베딩 계약과 검색 경로를 맞춘다

문서와 질문은 같은 임베딩 모델로 처리한다. 모델을 바꾸면 기존 청크도 다시 임베딩한다. 모델 이름, 차원과 입력 한도를 확인하고 실제 검색 언어의 질문과 문서 표본으로 평가한다. 영어의 문자/토큰 비율을 한국어 문서에 그대로 적용하지 않는다. [Model selection](https://www.palantir.com/docs/foundry/ontology/aip-multimodal-and-embedding-models)

확인일의 Palantir 제공 모델 검색 경로는 다음과 같이 다르다. [Semantic search workflow](https://www.palantir.com/docs/foundry/ontology/using-palantir-provided-models-to-create-a-semantic-search-workflow)

| 경로 | 질문 처리와 반환 계약 |
|---|---|
| Workshop KNN object set | 노코드 검색, K는 1~100. 관련도 순 정렬은 지원하지 않음 |
| TypeScript v1 Function | 질문을 직접 임베딩해 전달. `orderByRelevance()`로 순서 지정, K는 최대 100 |
| TypeScript v2 Function | `nearestNeighbors`에 텍스트 또는 벡터 전달. `fetchPage({ $orderBy: "relevance" })`로 순서 지정, 이웃 수 최대 500 |
| Python Function | 텍스트 질문을 받는 `nearest_neighbors`는 beta. 반환 객체에 `_score`가 있으며 별도 관련도 정렬 API를 같은 것으로 가정하지 않음 |

`functions.json`의 `enableVectorProperties`는 TypeScript v1 저장소 설정이다. 이를 v2와 Python의 공통 설정으로 복사하지 않는다. 반환된 객체 집합과 정렬된 결과 목록도 구별한다.

## 검색 실패를 생성 실패와 나눠 본다

답변이 틀리면 먼저 필요한 근거가 검색되어 모델 입력에 들어갔는지 확인한다. 작은 자료가 문맥 안에 충분히 들어가면 전체 문맥을 쓰는 단순한 기준선부터 비교할 수 있다. 자료가 커질 때는 아래 방법을 오류 유형에 맞춰 더한다. [Ontology-augmented generation](https://www.palantir.com/docs/foundry/ontology/ontology-augmented-generation)

| 방법 | 해결하려는 문제 | 별도로 확인할 점 |
|---|---|---|
| 키워드 검색 | 식별자와 도메인 용어의 정확한 일치 | 분석기, 토큰과 AND/OR 의미 |
| 의미 검색 | 표현이 달라도 유사한 내용을 찾기 | 모델과 언어별 검색 품질 |
| HyDE | 짧은 질문과 답변 문단의 표현 차이 | 생성한 가상 답변은 검색 입력이며 사실 근거가 아님 |
| 질의 확장 | 동의어와 관련 용어 누락 | 추가한 용어가 질문을 다른 의미로 바꾸지 않는지 |
| RRF 결합 | 여러 검색의 순위를 하나로 합치기 | 같은 청크 식별자로 합치고 후보 수와 최종 반환 수를 구별 |

표의 점검 항목은 설계 해석이다. 검색 기법을 모두 추가하는 것을 기본으로 삼지 않는다. 질문별 정답 근거와 실패 사례를 기준으로 개선 효과와 비용을 비교한다.

Keyword용 query enriching은 동의어와 관련어를 더하지만, semantic용 query extraction은 핵심 요청을 남기고 불필요한 말을 줄이는 방식이다. 같은 전처리를 두 경로에 그대로 적용하지 않는다. RRF는 각 목록의 순위 `r`에 대해 `1 / (상수 + r)`를 더한다. 이 상수는 KNN 이웃 수나 최종 반환 수와 다르며 커질수록 상위 순위 사이의 차이보다 여러 목록에 등장했는지가 더 중요해진다. 독립적인 keyword/vector 검색을 병렬로 수행한 뒤 청크 ID별 점수를 합치고 최종 개수만 자른다. [Ontology-augmented generation](https://www.palantir.com/docs/foundry/ontology/ontology-augmented-generation)

### Custom retrieval의 문자열과 인용을 함께 설계한다

2025년 2월 Chatbot Studio의 Function-backed context는 `AipAgentsContextRetrieval` interface를 구현하고 `messages`만 required input으로 두는 계약이었다. String/Object Set application variable은 optional input으로 받아 type이 맞는 variable에 mapping했다. 반환한 `retrievedPrompt` 문자열은 system prompt에 붙으므로 원문 내용과 실행 지시의 구분을 설계한다. ([February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02))

Custom citation은 object RID, PDF의 media set/item key, 외부 name/href를 정해진 tag로 출력해 citation bubble로 표시하는 경로다. Object는 Object Explorer, PDF는 문서 첫 페이지로 이동했다. Bubble이 생성됐다는 것과 해당 문장이 인용 자료에 의해 뒷받침된다는 것은 다르다. Page/chunk와 statement의 대응을 실제로 평가한다. Retrieval에 Logic을 쓰려는 경우 당시 TypeScript wrapper를 통해 interface를 맞추는 대안을 안내했다.

2025년 6월 multi-type context는 Object Set, Function과 document를 여러 개 등록하고 새 message마다 등록 순서대로 문자열로 resolve했다. 같은 타입의 여러 context도 가능하므로 한 corpus의 semantic search와 다른 corpus의 full text를 조합할 수 있다. Citation은 중앙 설정에서 전체 enablement와 object-type별 외부 URL/media override를 정한다. 검색 corpus, prompt 결합 순서와 클릭 대상이 각각 다를 수 있음을 보존한다. ([June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06))

## 같은 문자열 검색도 호출 위치에 따라 다르다

Object Explorer의 전역 검색은 여러 단어를 기본 OR로 처리한다. 반면 개별 속성의 Contains 필터는 모든 검색 토큰을 요구하며, Workshop의 object set filter `CONTAIN`은 접두사 일치 경로다. UI 이름만 보고 부분 문자열 검색으로 일반화하지 않는다. 분석기 설정은 토큰화와 대소문자 처리에 영향을 준다. [Understanding text search](https://www.palantir.com/docs/foundry/object-explorer/understanding-text-search)

선행 wildcard는 공식 문서 사이에 범위 차이가 있다. [Search syntax](https://www.palantir.com/docs/foundry/object-explorer/search-syntax)는 render hint를 설정한 선행 wildcard를 설명하지만, 상세 검색 문서는 전역 검색에서는 지원하지 않고 개별 속성 필터에서만 지원한다고 적는다. 전역 검색에서의 지원을 확정하지 않고 실제 경로를 시험해야 한다. 양쪽이 함께 제약하는 `*term*` 형태도 지원된다고 가정하지 않는다.

관계 탐색은 검색 문법과 별개다. 예를 들어 공항을 조건으로 좁힌 뒤 연결된 출발 항공편으로 pivot하면 탐색의 주 대상이 공항에서 항공편으로 바뀐다. 여러 관계를 따라갈 때도 결과 객체의 타입과 집합 의미를 보존한다. [Pivot linked objects](https://www.palantir.com/docs/foundry/object-explorer/pivot-linked)

## 파생 속성은 저장값이 아닌 조회 시점 계산이다

Derived property는 관계를 따라 값을 선택하거나 집계해 조회 시점에 계산한다. 읽기 전용이며 객체 저장소에 저장하거나 색인하는 값이 아니다. Ontology 정의형은 beta이고 최대 세 번의 관계 탐색을 지원한다. Runtime 정의형은 앱이나 요청 단위 계산에 쓰며 산술/날짜 표현식을 지원한다. [Derived properties](https://www.palantir.com/docs/foundry/ontology/derived-properties)

계산 경로의 원천 객체와 중간 객체마다 권한 검사를 하므로, 같은 객체의 같은 파생 속성도 사용자마다 값이 달라질 수 있다. 사용자별 결과 차이를 곧바로 데이터 손상으로 판단하지 않는다.

`Collect list/set`의 반환 개수 제한은 표시할 값의 개수이며 필터가 평가하는 전체 값의 범위를 줄이지 않는다. 따라서 화면에 보이지 않는 값 때문에 객체가 필터에 일치할 수 있다. 수집 결과 순서는 기본 보장되지 않고 vector는 집계 대상이 아니다. [Derived properties reference](https://www.palantir.com/docs/foundry/ontology/derived-properties-reference)

이 특성 때문에 파생값을 이용한 필터/정렬의 비용은 후보 객체 수와 관계의 중간 결과 크기에 영향을 받는다. 큰 집계를 반복한다면 사전 계산값과 최신성 요구를 비교한다. 이는 조회 설계의 선택이며 특정 방식의 성능을 측정한 결론이 아니다.

## 출처

- [Palantir, Semantic search overview](https://www.palantir.com/docs/foundry/ontology/overview-semantic-search)
- [Palantir, Document processing](https://www.palantir.com/docs/foundry/ontology/document-processing)
- [Palantir, Choose multimodal and embedding models](https://www.palantir.com/docs/foundry/ontology/aip-multimodal-and-embedding-models)
- [Palantir, Use Palantir-provided models to create a semantic search workflow](https://www.palantir.com/docs/foundry/ontology/using-palantir-provided-models-to-create-a-semantic-search-workflow)
- [Palantir, Ontology-augmented generation](https://www.palantir.com/docs/foundry/ontology/ontology-augmented-generation)
- [Palantir, Understanding text search](https://www.palantir.com/docs/foundry/object-explorer/understanding-text-search)
- [Palantir, Search syntax](https://www.palantir.com/docs/foundry/object-explorer/search-syntax)
- [Palantir, Pivot to explore linked objects](https://www.palantir.com/docs/foundry/object-explorer/pivot-linked)
- [Palantir, Derived properties](https://www.palantir.com/docs/foundry/ontology/derived-properties)
- [Palantir, Derived properties reference](https://www.palantir.com/docs/foundry/ontology/derived-properties-reference)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06)

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Data-and-Model-Integration]]
- [[Palantir-Security-and-Governance]]
- [[Palantir-Derived-Properties|파생 속성의 집계, 보안과 query 비용]]
- [[RAG-Retrieval-Engineering]]
- [[GraphRAG-Retrieval]]
