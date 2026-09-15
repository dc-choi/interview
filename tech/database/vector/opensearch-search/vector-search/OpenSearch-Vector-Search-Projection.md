---
tags: [database, opensearch, vector, embedding, knn, hnsw, onnx]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 벡터 검색 — projection과 index 배치

OpenSearch 벡터 검색은 텍스트나 이미지에서 만든 embedding을 `knn_vector` field에 저장하고 query vector와 가까운 document를 찾는다. 의미 유사도는 OpenSearch가 이해하는 것이 아니라 embedding model이 만든 공간과 distance function이 결정한다.

이 문서는 [[OpenSearch|키워드 검색 중심 OpenSearch 심화 인덱스]]와 분리된 확장 주제다. ANN과 HNSW 자체 원리는 [[Vector-Similarity-Search|벡터 유사도 검색]], 결과 결합은 [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색]]에서 다룬다.

## 검색 방식 선택

| 방식 | 강점 | 주요 한계 |
|---|---|---|
| Lexical, BM25 | exact term, 고유명사, filter, 설명 가능성 | 표현이 다른 같은 의미를 놓칠 수 있음 |
| Vector k-NN | paraphrase와 의미가 가까운 후보 탐색 | embedding 비용, broad false positive, 낮은 설명 가능성 |
| Hybrid | exact signal과 semantic recall 결합 | 서로 다른 score 결합과 tuning 필요 |

Vector search는 keyword search의 상위 호환이 아니다. Query 유형별 relevance judgment를 만들고 lexical, vector, hybrid를 따로 평가한 뒤 선택한다.

## Source of truth와 비동기 projection

```text
RDBMS transaction
  -> outbox 또는 committed change log
  -> message broker
  -> projection consumer
       ├── text document 생성
       ├── embedding inference
       └── OpenSearch index 또는 indexes 반영
```

OpenSearch는 재구축 가능한 search Read Model로 두고 RDBMS가 업무 원본을 책임진다.

- 원본 변경과 outbox record를 같은 transaction에 저장해 dual-write gap을 막는다.
- Broker 전달은 at-least-once를 가정하고 domain ID를 `_id`로 사용해 retry를 멱등하게 만든다.
- Text와 vector projector가 모두 같은 event를 받아야 한다면 각각 별도 durable consumer group과 queue를 사용한다.
- OpenSearch bulk item이 성공한 뒤 consumer ack한다. Publisher confirm과 consumer ack는 서로 다른 책임 경계다.
- Source version으로 오래된 update를 거부한다. 삭제 version 보존은 `index.gc_deletes`, 기본 60초로 제한되므로 더 늦은 event까지 막으려면 source 측 ledger나 soft-delete tombstone이 필요하다.
- Embedding 실패가 원본 write를 막지 않도록 retry, DLQ, lag와 failed status를 별도로 관리한다.
- RabbitMQ queue와 DLQ는 전체 replay 원본이 아니다. 전체 rebuild는 source snapshot, watermark와 이후 change log로 수행한다.
- Manual sync API는 document를 즉시 수정하는 우회로보다 durable rebuild job을 등록하는 진입점으로 만든다.
- Source와 projection의 count, version, sample hash를 주기적으로 reconciliation한다. 검증 단계와 DLQ 운영은 [[OpenSearch-Indexing-Pipeline-Reliability|파이프라인 신뢰성]]이 정본이다.

자세한 cutover와 replay 절차는 [[OpenSearch-Indexing-Internals|OpenSearch 검색 Read Model 동기화]]를 따른다.

## Text와 vector index 배치

| 구조 | 장점 | 비용과 위험 |
|---|---|---|
| 같은 document에 text와 vector field | filter와 hybrid query가 단순하고 version 정합성이 좋음 | model migration과 vector 자원이 text lifecycle에 결합 |
| Text와 vector index 분리 | 독립 sizing, model 실험, lifecycle과 rollback | dual projection, delete와 version 동기화, 결과 결합 필요 |

분리 구조는 데모에서 차이를 비교하거나 model lifecycle을 격리할 때 유용하지만 일반적인 기본값은 아니다. OpenSearch hybrid query는 서로 다른 index의 같은 `_id`를 join하지 않으므로 native hybrid와 동일 filter가 핵심이면 한 document에 함께 두는 편이 단순하다. 분리한다면 같은 `_id`, source version, model version과 content hash를 양쪽에 기록한다. Chunk 단위 vector라면 결정적인 chunk ID와 parent ID, 전체 chunk 삭제 규칙도 둔다.

## 출처

- [OpenSearch Documentation, Delete document](https://docs.opensearch.org/latest/api-reference/document-apis/delete-document/)
- [RabbitMQ Documentation, Reliability guide](https://www.rabbitmq.com/docs/reliability)
- [Spring Cloud Stream Reference, Rabbit binder](https://docs.spring.io/spring-cloud-stream/docs/current/reference/html/spring-cloud-stream-binder-rabbit.html)

## 관련 문서

- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
- [[OpenSearch-Vector-Search-Mapping-Query|knn_vector mapping, query와 filter]]
- [[OpenSearch-Vector-Search-Embedding-Operations|embedding contract, inference와 model 교체]]
