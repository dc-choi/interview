---
tags: [database, opensearch, vector, embedding, knn, hnsw, onnx]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["OpenSearch Vector Search", "OpenSearch k-NN", "OpenSearch 벡터 검색"]
---

# OpenSearch 벡터 검색과 임베딩 파이프라인

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

## `knn_vector` mapping 계약

```json
PUT posts-vector-v1
{
  "settings": {"index": {"knn": true}},
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "post_id": {"type": "keyword"},
      "status": {"type": "keyword"},
      "content": {"type": "text"},
      "embedding": {
        "type": "knn_vector",
        "dimension": 3,
        "space_type": "cosinesimil",
        "method": {"name": "hnsw", "engine": "faiss"}
      },
      "source_version": {"type": "long"},
      "embedding_model_version": {"type": "keyword"}
    }
  }
}
```

`3`은 실행 가능한 예시 차원이다. 실제 `dimension`, vector element type, `space_type`, method와 engine은 index 생성 전에 model과 workload에 맞게 고정한다.

- Document와 query vector의 dimension이 mapping과 정확히 같아야 한다.
- Cosine, L2, inner product 중 model 학습과 normalization 방식에 맞는 공간을 선택한다. OpenSearch의 `l2`는 제곱 유클리드 거리를 사용하므로 일반 유클리드 거리와 순위는 같아도 raw distance는 다르다.
- HNSW의 `m`, `ef_construction`, `ef_search`는 recall, build 비용, memory와 latency를 함께 바꾼다.
- 새 index에서는 deprecated된 NMSLIB를 피하고 Lucene HNSW와 Faiss HNSW 또는 IVF를 workload로 비교한다. IVF는 training이 필요하고 method, space와 engine 조합은 version별 지원표를 확인한다.
- `in_memory`와 `on_disk`, compression은 latency, recall, memory와 storage를 benchmark해 선택한다.
- Vector index는 Lucene segment와 함께 만들어지고 native memory와 cache도 사용하므로 일반 text index와 별도 자원 지표가 필요하다.
- Dimension, space, engine과 build parameter를 바꿀 때는 새 index를 만들고 backfill한 뒤 alias를 전환한다.

## Query와 filter

```json
GET posts-vector-v1/_search
{
  "size": 10,
  "query": {
    "knn": {
      "embedding": {
        "vector": [0.12, -0.03, 0.44],
        "k": 100,
        "filter": {"term": {"status": "PUBLISHED"}}
      }
    }
  }
}
```

예시 vector의 세 값은 mapping dimension과 일치한다.

- `size`는 최종 hit 수, `k`는 vector candidate 수다. 둘을 명시하고 `k >= size`에서 시작해 recall과 latency를 함께 측정한다.
- Restrictive filter를 ANN 결과 뒤에 적용하면 `k`보다 적은 결과가 나올 수 있다. Engine과 version이 지원하는 efficient k-NN filter를 우선 검토한다.
- Scoring script filter는 먼저 후보를 필터링한 뒤 `knn_score`로 전수 비교하는 exact k-NN이다. 작은 후보군과 ANN `Recall@k`의 ground truth에는 유용하지만 의미적 관련도까지 정확하다는 뜻은 아니며 Serverless에서는 script 지원 범위를 별도로 확인한다.
- `k`, `ef_search`, oversampling과 rescore를 높이면 recall이 좋아질 수 있지만 latency와 CPU가 늘어난다.
- 가장 가까운 결과도 관련 없을 수 있으므로 `min_score`, 최대 거리, domain filter 또는 hybrid fallback을 검토한다.
- Lexical score와 vector score는 scale이 다르다. 결합 방식과 평가 절차는 [[OpenSearch-Hybrid-Search|하이브리드 검색]]에서 다룬다.

평가는 ANN의 `Recall@k`, 검색 관련도의 `nDCG@k`나 `Precision@k`, 운영 성능의 p95와 p99를 분리한다. Exact k-NN을 ANN ground truth로 삼고 BM25 only, vector only, hybrid를 같은 query set에서 비교한다.

## Embedding은 versioned contract다

Model artifact만 같다고 같은 vector가 보장되지는 않는다. 다음을 하나의 version으로 관리한다.

- Model과 tokenizer artifact, vocabulary
- Input normalization, prefix, 최대 token과 truncation
- Pooling, output normalization과 distance function
- Output dimension과 element precision
- Runtime, execution provider와 library version은 provenance로 기록하고 golden vector parity를 검증

Document와 query는 같은 vector 공간을 만드는 호환 encoder 계약으로 embedding해야 한다. 대칭 model은 같은 처리를 쓰고 E5 같은 비대칭 model은 passage와 query prefix나 `search_model_id`를 의도적으로 다르게 쓸 수 있지만 model pair, tokenizer, pooling, normalization, dimension과 space를 함께 versioning한다. 이 계약이 바뀌면 새 field 또는 새 index로 재임베딩하며 runtime patch는 parity가 유지되면 재임베딩 사유가 아니다.

## ML Commons connector와 Neural Search

ML connector는 endpoint 인증과 request, response 변환 계층이지 semantic pipeline 전체가 아니다. Amazon OpenSearch Service는 IAM과 SigV4로 Bedrock이나 SageMaker AI에 연결한 뒤 remote model을 등록하고 배포해 얻은 `model_id`를 `text_embedding` ingest processor나 `neural` query에서 사용한다. 애플리케이션이 vector를 직접 생성하는 raw k-NN 경로도 가능하다. Connector를 써도 IAM과 FGAC, network, quota, latency, 비용, model 장애 책임은 남으므로 동기 ingest와 외부 비동기 worker를 workload로 비교한다.

## ONNX local inference와 외부 API

ONNX는 model graph와 operator, data type을 교환하기 위한 format이고 ONNX Runtime은 Java를 포함한 여러 환경에서 inference를 실행한다. Sentence Transformers를 외부 ONNX Runtime에서 실행하면 export가 token embedding까지만 포함할 수 있으므로 원 model의 tokenizer, attention mask를 반영한 pooling과 normalization을 재현해야 한다. Export 성공이 원본 framework와의 수치 동일성이나 성능을 보장하지는 않는다.

| 선택 | 장점 | 운영 책임 |
|---|---|---|
| Local ONNX | Network와 API rate limit 제거, data 통제, 고정 artifact | CPU나 GPU sizing, batching, model 배포, cold start, native library |
| External API | Model serving과 hardware 운영 위임 | 비용, quota, network failure, privacy, provider model 변경 |

Java에서는 ONNX Runtime을 직접 사용하거나 LangChain4j 같은 wrapper를 선택할 수 있다. Stock LangChain4j in-process model은 문서별 CPU 병렬 실행이며 GPU와 임의의 pooling, true tensor batching이 필요하면 direct ONNX Runtime adapter를 검토한다. Framework 선택보다 tokenizer, pooling, normalization과 batch output을 reference implementation과 비교하는 검증이 우선이다.

## Model 교체 절차

1. 새 model contract와 목적 metric을 고정한다.
2. Golden corpus에서 기존과 새 embedding, retrieval quality를 비교한다.
3. 새 index 또는 versioned vector field를 만들고 source of truth를 읽는 worker로 background re-embedding한다. 일반 `_reindex`는 기존 vector를 복사할 뿐 새 model을 호출하지 않는다.
4. Source change stream으로 backfill 이후 변경을 따라잡는다.
5. Shadow query에서 Recall@k, nDCG@k, p95와 p99, error와 resource를 비교한다.
6. Canary로 search traffic을 전환하고 alias 또는 query config를 바꾼다.
7. Rollback 기간 후 이전 vector와 model artifact를 제거한다.

## 운영 체크포인트

- [ ] Embedding contract와 model version이 document에 기록되는가
- [ ] Source write와 projection event 사이 dual-write gap이 없는가
- [ ] Duplicate, out-of-order update와 delete replay를 방어하는가
- [ ] Embedding worker의 queue lag, timeout, DLQ, batch 크기를 감시하는가
- [ ] k-NN cache와 native memory, graph load, breaker를 감시하는가
- [ ] Exact term, semantic query, restrictive filter별 relevance set이 있는가
- [ ] Model upgrade를 full rebuild와 rollback까지 훈련했는가

## 관련 문서

- [[Vector-Similarity-Search|벡터 유사도 검색과 HNSW]]
- [[OpenSearch-Query-Relevance|BM25와 lexical relevance]]
- [[OpenSearch-Hybrid-Search|Normalization, weighted fusion과 RRF]]
- [[OpenSearch-Indexing-Internals|검색 Read Model 동기화]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[At-Least-Once|At-Least-Once 전달]]

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 - YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [Semantic search in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/semantic-search.html), [Semantic field - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/semantic/)
- [Amazon OpenSearch Service ML connectors - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ml-amazon-connector.html)
- [Serverless vector search - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html)
- [OpenSearch 기반 검색엔진과 벡터 검색 프로젝트 - YouTube](https://www.youtube.com/watch?v=CoLQ9ZCFNaY)
- [k-NN vector field - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-vector/)
- [k-NN query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/specialized/k-nn/index/)
- [Vector search techniques - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/vector-search-techniques/index/)
- [Filtering vector search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/)
- [k-NN API and stats - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/api/knn/)
- [Methods and engines - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/), [Vector spaces - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-spaces/)
- [Disk-based vector search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/optimizing-storage/disk-based-vector-search/)
- [Delete document - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/delete-document/)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [Spring Cloud Stream Rabbit binder](https://docs.spring.io/spring-cloud-stream/docs/current/reference/html/spring-cloud-stream-binder-rabbit.html)
- [Sentence Transformers ONNX inference](https://www.sbert.net/docs/sentence_transformer/usage/efficiency.html)
- [LangChain4j in-process ONNX embedding](https://docs.langchain4j.dev/integrations/embedding-models/in-process/)
- [Reindex documents - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
- [ONNX technical design - ONNX](https://onnx.ai/about)
- [ONNX Runtime for Java - ONNX Runtime](https://onnxruntime.ai/docs/get-started/with-java.html)
