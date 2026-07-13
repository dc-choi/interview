---
tags: [database, search, opensearch, rerank, cross-encoder, neural-sparse]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["OpenSearch Reranking", "Neural Sparse Search", "OpenSearch 재정렬과 뉴럴 스파스 검색"]
---

# OpenSearch Reranking과 Neural Sparse Search

Retrieval은 수백만 문서에서 후보를 빠르게 회수하는 문제고, ranking은 상위 수십 개를 정확히 줄 세우는 문제다. 두 문제의 비용 구조가 달라서 현대 검색 스택은 retrieve-then-rerank 2단계로 분리한다. 이 문서는 [[OpenSearch-Hybrid-Search|하이브리드 검색]]이 범위 밖으로 둔 reranker와 neural sparse search를 다룬다. Score normalization과 RRF는 그 문서, `knn_vector`와 ML Commons connector 기본은 [[OpenSearch-Vector-Search|벡터 검색]]이 담당한다.

## Retrieve-then-rerank가 표준인 이유

Bi-encoder는 query와 문서를 각각 독립적으로 vector로 만들어 유사도를 계산한다. 문서 embedding을 미리 색인해 두므로 검색 시점 비용은 query 1회 encoding과 ANN 탐색뿐이다. Cross-encoder는 query와 문서를 한 입력으로 붙여 model에 통과시키므로 두 텍스트의 token 간 상호작용을 직접 보고 더 정확하지만, 문서마다 inference 1회가 필요해 전체 corpus에는 적용할 수 없다.

| 구조 | 정확도 | 검색 시점 비용 | 적용 범위 |
|---|---|---|---|
| Bi-encoder | 낮음에서 중간 | query encoding 1회 + ANN | 전체 corpus 회수 |
| Cross-encoder | 높음 | 문서 수 x inference | 상위 N 재정렬만 |

그래서 1단계에서 BM25, dense, hybrid로 후보 상위 N을 싸게 회수하고, 2단계에서 cross-encoder로 그 N개만 재정렬한다. Rerank는 이미 회수된 후보의 순서만 바꾼다. 1단계가 놓친 문서는 rerank가 복원할 수 없으므로 candidate depth가 먼저다. 이 원리는 [[OpenSearch-Hybrid-Search|하이브리드 검색]]의 fusion과 동일하다.

## Rerank processor 설정 (2.12+)

`rerank`는 search pipeline의 response processor다. `ml_opensearch` type(2.12+)은 ML Commons에 등록된 cross-encoder model을 호출하고, `by_field` type(2.18+)은 문서 field 값으로 재정렬한다. Model은 두 경로로 준비한다.

- 내부 배포: OpenSearch 제공 pretrained cross-encoder `ms-marco-MiniLM-L-6-v2`, `ms-marco-MiniLM-L-12-v2`를 ML node에 배포. 둘 다 영어 MS MARCO 학습 model이다.
- 외부 connector: [[OpenSearch-Vector-Search|ML Commons connector]]로 SageMaker의 cross-encoder, Cohere Rerank, Amazon Bedrock Rerank를 연결해 `model_id`로 사용. Amazon OpenSearch Service에서는 IAM과 SigV4 인증이 전제다.

```json
PUT /_search/pipeline/rerank-v1
{
  "response_processors": [
    {
      "rerank": {
        "ml_opensearch": {"model_id": "<cross-encoder model_id>"},
        "context": {"document_fields": ["title", "content"]}
      }
    }
  ]
}
```

검색 요청에는 `ext.rerank.query_context`로 재정렬 기준 텍스트를 준다. `query_text`에 직접 넣거나 `query_text_path`로 요청 본문 내 위치를 가리키며 둘 중 하나만 허용된다.

```json
GET products-v1/_search?search_pipeline=rerank-v1
{
  "size": 25,
  "query": {"match": {"content": "여름 캠핑 의자 추천"}},
  "ext": {"rerank": {"query_context": {"query_text": "여름 캠핑 의자 추천"}}}
}
```

Rerank 대상 수는 1단계가 반환하는 hit 수, 즉 `size`가 결정한다. `size: 100`이면 query당 cross-encoder inference가 100회다. 재정렬 깊이를 늘리고 싶으면 `size`를 키우고 `by_field`의 `keep_previous_score`나 oversampling 후 상위만 노출하는 방식으로 비용과 품질을 조율한다. Latency는 문서 수에 거의 선형이므로 N 선택이 곧 p99 예산 배분이다.

## Neural sparse search (2.11+)

Neural sparse search는 학습된 model이 텍스트를 token과 weight 쌍의 sparse vector로 확장해 `rank_features` field에 색인한다. BM25처럼 역색인 자료구조를 쓰지만 term weight를 통계가 아니라 학습으로 얻고, 원문에 없는 의미적 연관 token까지 확장한다는 점이 다르다.

Dense vector 대비 장점은 세 가지다.

- 역색인 재사용: HNSW graph와 native memory가 필요 없다. OpenSearch 공식 벤치마크(MS MARCO v2, 8.8M passage)에서 index 크기가 dense 65.4GB 대비 doc-only 6.8GB, bi-encoder 4.7GB, BM25 1GB였다.
- 해석 가능: 어떤 token이 얼마의 weight로 match됐는지 확인 가능해 relevance 디버깅이 dense보다 쉽다.
- 검색 시 RAM 증가가 거의 없다(같은 벤치마크에서 doc-only 0.03GB, bi-encoder 0.06GB, dense는 7.9% 증가).

### Doc-only vs bi-encoder 모드

| 모드 | ingest | query | BEIR 평균 NDCG@10 | p99 (MS MARCO v2) |
|---|---|---|---:|---:|
| Doc-only | sparse encoding model | tokenizer + weight lookup | 0.462 | 22ms |
| Bi-encoder | sparse encoding model | 같은 model로 inference | 0.492 | 383.5ms |
| 참고: BM25 | - | - | 0.419 | 18.9ms |
| 참고: dense (TAS-B) | - | - | 0.410 | 86.8ms |

Doc-only는 query 시점 model inference가 없어 latency가 BM25급이다. 공식 권장 조합은 bi-encoder면 `opensearch-neural-sparse-encoding-v2-distill` 단독, doc-only면 ingest에 `doc-v3-gte` + 검색에 `tokenizer-v1`이다. v3 계열은 prune ratio 0.1로 pruning돼 index 크기 대비 품질 trade-off가 개선됐다.

### Two-phase processor (2.15+)

`neural_sparse_two_phase_processor`는 request processor로, 1차에서 high-weight token만으로 상위 후보를 회수하고 2차에서 low-weight token으로 그 후보만 rescore한다. 기본값은 `enabled: true` 등록 시, `prune_ratio: 0.4`, `expansion_rate: 5.0`, `max_window_size: 10000`. 공식 문서 기준 latency가 doc-only에서 약 27.9%, bi-encoder에서 약 59.6% 감소했다. Sparse vector의 긴 tail token이 scoring 비용의 주범이라는 관찰을 구조화한 것이다.

## Hybrid와 rerank 조합 판단

전체 조합의 자연스러운 최대 구성은 hybrid(BM25 + dense 또는 sparse) 회수 후 cross-encoder rerank다. 그러나 단계마다 latency가 누적되므로 예산에서 역산한다.

| 구성 | 품질 기대 | latency 구성 요소 |
|---|---|---|
| BM25 only | 기준선 | lexical 탐색 |
| Neural sparse doc-only | BM25 대비 유의미한 개선 | lexical급 탐색 |
| Hybrid | branch 상호 보완 | 두 branch + fusion |
| Hybrid + rerank | 최상 | 위 전부 + N회 inference |

판단 기준: (1) p99 예산이 100ms급이고 외부 rerank API 왕복이 수십에서 수백 ms면 rerank를 뺀 hybrid나 doc-only sparse가 현실적이다. (2) RAG처럼 상위 몇 개의 정밀도가 결과 품질을 지배하고 latency 허용이 크면 rerank 가치가 크다. (3) rerank 도입 전에 [[OpenSearch-Hybrid-Search|hybrid 평가 설계]]의 같은 judgment set으로 rerank 유무를 비교해 nDCG 개선분이 latency 비용을 정당화하는지 확인한다.

## 한국어 주의점

- OpenSearch 내장 pretrained cross-encoder 2종은 MS MARCO 영어 학습 model이라 한국어 rerank 품질을 기대할 수 없다. 한국어는 connector로 다국어 reranker(Cohere Rerank multilingual, Bedrock의 rerank 지원 model)를 연결하거나 자체 한국어 cross-encoder를 SageMaker에 배포한다.
- Sparse encoding model도 v1에서 v3 대부분이 영어 학습이다. 다국어는 `opensearch-neural-sparse-encoding-multilingual-v1`(한국어 포함 15개 언어, query는 `tokenizer-multilingual-v1` lookup을 쓰는 doc-only 계열)을 쓴다. MIRACL 한국어에서 NDCG@10 0.607로 BM25 0.371을 크게 앞섰다.
- 확인 방법: model card의 학습 데이터 언어와 tokenizer vocabulary를 보고, 반드시 자사 한국어 query set으로 BM25 대비 평가한다. 영어 벤치마크 수치는 한국어 성능을 보장하지 않는다.
- Neural sparse의 token 확장은 model tokenizer 기준이므로 [[OpenSearch-Korean-Text-Analysis|한국어 analyzer]]의 형태소 분석과는 별개 계층이다. BM25 branch의 analyzer 품질 문제를 sparse가 대신 풀어주지 않는다.

## 자주 틀리는 오개념 교정

- Rerank는 recall을 올리지 않는다. 1단계 후보에 없는 문서는 순서를 바꿔도 나타나지 않는다. Zero-result와 낮은 recall은 candidate depth, analyzer, embedding 문제다.
- Neural sparse는 BM25의 튜닝판이 아니다. 색인 자료구조만 공유하고 weight는 학습 model이 만든다. Model 교체는 dense와 마찬가지로 재색인 사안이다.
- Doc-only 모드도 ingest 시점에는 model inference가 필요하다. 비용이 사라진 게 아니라 query 시점에서 색인 시점으로 이동한 것이며, 색인 처리량과 [[OpenSearch-Indexing-Internals|ingest pipeline]] CPU에 반영된다.
- Cross-encoder rerank와 hybrid fusion은 대체 관계가 아니다. Fusion은 회수 branch 결합, rerank는 결합된 상위 N의 재정렬로 층위가 다르다.
- 벤치마크의 bi-encoder p99 383.5ms는 검색 노드에서 model을 함께 돌린 구성의 수치다. 외부 GPU endpoint로 빼면 다른 profile이 되므로 수치보다 doc-only 대비 규모 감각으로 쓴다.

## 운영 체크포인트

- [ ] Rerank 대상 N과 p99 예산의 관계를 부하 테스트로 측정했는가
- [ ] Rerank model endpoint 장애 시 pipeline을 우회하는 fallback 경로가 있는가
- [ ] 한국어 query set으로 BM25, sparse, hybrid, rerank를 같은 judgment로 비교했는가
- [ ] Sparse model version을 문서에 기록하고 model 교체 시 재색인 절차가 있는가
- [ ] Two-phase processor 적용 전후의 latency와 relevance 회귀를 함께 확인했는가
- [ ] Amazon OpenSearch Service engine version이 rerank(2.12+), two-phase(2.15+)를 지원하는가

## 관련 문서

- [[OpenSearch-Hybrid-Search|하이브리드 검색과 점수 결합]]
- [[OpenSearch-Vector-Search|k-NN과 embedding pipeline]]
- [[OpenSearch-Korean-Text-Analysis|한국어 analyzer와 사전 운영]]
- [[Vector-Similarity-Search|ANN과 HNSW 원리]]

## 출처

- [Rerank processor - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/rerank-processor/)
- [Reranking using a cross-encoder model - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/rerank-cross-encoder/)
- [Neural sparse search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/neural-sparse-search/)
- [Generating sparse vector embeddings automatically - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/neural-sparse-with-pipelines/)
- [Neural sparse query two-phase processor - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/search-pipelines/neural-sparse-query-two-phase-processor/)
- [Pretrained models - OpenSearch Documentation](https://docs.opensearch.org/latest/ml-commons-plugin/pretrained-models/)
- [Improving document retrieval with sparse semantic encoders - OpenSearch Blog](https://opensearch.org/blog/improving-document-retrieval-with-sparse-semantic-encoders/)
- [opensearch-neural-sparse-encoding-multilingual-v1 - Hugging Face](https://huggingface.co/opensearch-project/opensearch-neural-sparse-encoding-multilingual-v1)
- [Amazon OpenSearch Service ML connectors - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ml-amazon-connector.html)
- [Integrate sparse and dense vectors for RAG - AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/integrate-sparse-and-dense-vectors-to-enhance-knowledge-retrieval-in-rag-using-amazon-opensearch-service/)
