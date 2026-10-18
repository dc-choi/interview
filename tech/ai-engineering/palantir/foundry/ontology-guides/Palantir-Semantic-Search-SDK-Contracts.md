---
tags: [palantir, ontology, semantic-search]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Embedding 검색의 SDK 버전과 실행 계약

AIP와 개발 기능을 활성화하고 문서 embedding을 Ontology vector property에 연결한다. Vector 차원, similarity 방식과 model metadata를 일치시킨다. Batch 문서와 실시간 질문이 다른 model을 사용하면 동일한 검색 공간이 아니다.

## Palantir 제공 모델의 호출 방식

| 경로 | 공식 예제의 계약 |
| --- | --- |
| Workshop 기본 KNN | k 1~100, relevance 정렬을 지원하지 않는 경로 |
| TypeScript Functions V1 | `enableVectorProperties`, model로 query embedding 생성, `nearestNeighbors(...).orderByRelevance().take(k)`, k 1~100 |
| TypeScript Functions V2 | client를 전달하고 text 또는 vector로 `nearestNeighbors`, k 1~500, `fetchPage`의 `$orderBy: "relevance"` |
| Python 예제 | `@function(beta=True)`, text `nearest_neighbors`, `_score` 사용 |

V1의 flags와 class/index export를 V2의 기본 export 함수 파일에 그대로 옮기지 않는다. V2의 text 검색이 embedding을 처리하는 경로와 V1에서 model을 직접 호출하는 경로도 구분한다. Python 예제의 score 반환만으로 다른 SDK와 같은 정렬 계약을 추정하지 않는다.

## Custom embedding model의 추가 책임

공식 custom model 안내는 이전 방식이며 현재 권장 경로가 아니라는 주의가 있다. Custom model을 사용할 수 없다는 의미는 아니다. Model adapter, batch inference, live deployment, wrapper function과 Ontology 연결을 직접 관리해야 한다.

MiniLM 예제의 384차원은 해당 모델의 값이다. 다른 모델에 그대로 적용하지 않는다. Pandas adapter의 text 입력과 float list 출력 schema를 맞추고 데이터가 크면 Spark 경로를 검토한다. GPU 실행은 지원되는 환경과 resource profile이 있어야 한다.

V1 custom 예제의 `enableVectorProperties`, `enableResourceGeneration`, `useDeploymentApiNames`는 그 실행 방식의 설정이다. V2 예제는 Ontology에 묶인 model function을 generated SDK의 `executeFunction`으로 호출하고 결과의 `output_data[0]`을 사용한다. 예제의 placeholder adapter와 입력 column은 실제 환경에 맞춰야 한다.

## Relevance 설명의 충돌

Custom model 안내의 문장은 V2 relevance 정렬을 설명하지 않는다고 하지만 같은 페이지 코드는 `$orderBy: "relevance"`를 사용한다. Palantir 제공 모델 안내도 이 정렬을 명시한다. 따라서 오래된 설명을 V2 정렬 불가라는 일반 규칙으로 확장하지 않는다. 설치한 SDK와 API에서 직접 확인해야 한다.

## Threshold와 score의 의미

KNN 후보를 k개 가져온 뒤 threshold를 적용하면 이미 가져온 후보만 걸러진다. 결과가 k개보다 적어질 수 있고 나머지 전체 객체를 추가로 검색하는 동작이 아니다.

Dot product를 cosine similarity로 해석하려면 같은 차원뿐 아니라 정규화된 벡터라는 전제가 필요하다. 예제의 길이 검사만으로 정규화가 보장되지 않는다. `$select`를 사용하면 후처리에 필요한 embedding property도 포함한다.

Vector property를 Action/Function으로 편집할 수 있어도 변경된 vector가 원문과 일치하는지 자동 검증되는 것은 아니다. 원문 revision, model과 재생성 조건을 연결하는 운영이 필요하다.

## 출처

- [Palantir, using-palantir-provided-models-to-create-a-semantic-search-workflow](https://www.palantir.com/docs/foundry/ontology/using-palantir-provided-models-to-create-a-semantic-search-workflow)
- [Palantir, using-custom-models-to-create-a-semantic-search-workflow](https://www.palantir.com/docs/foundry/ontology/using-custom-models-to-create-a-semantic-search-workflow)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]
- [[Palantir-Ontology-Task-Validation|업무 질문으로 검증]]

공식 문서를 대조한 지식이며 실제 Foundry 배포나 SDK 실행은 검증하지 않았다.
