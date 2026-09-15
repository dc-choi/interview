---
tags: [database, opensearch, vector, embedding, knn, hnsw, onnx]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 벡터 검색 — embedding contract, inference와 model 교체

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

## 출처

- [AWS Documentation, Amazon OpenSearch Service ML connectors](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ml-amazon-connector.html)
- [Sentence Transformers Documentation, ONNX inference](https://www.sbert.net/docs/sentence_transformer/usage/efficiency.html)
- [LangChain4j Documentation, In-process ONNX embedding](https://docs.langchain4j.dev/integrations/embedding-models/in-process/)
- [OpenSearch Documentation, Reindex documents](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
- [ONNX technical design — ONNX](https://onnx.ai/about)
- [ONNX Runtime for Java — ONNX Runtime](https://onnxruntime.ai/docs/get-started/with-java.html)

## 관련 문서

- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
- [[OpenSearch-Vector-Search-Projection|검색 방식 선택, source of truth와 index 배치]]
- [[OpenSearch-Vector-Search-Mapping-Query|knn_vector mapping, query와 filter]]
- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
