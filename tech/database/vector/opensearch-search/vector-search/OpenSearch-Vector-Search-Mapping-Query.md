---
tags: [database, opensearch, vector, embedding, knn, hnsw, onnx]
status: done
verified_at: 2026-07-15
category: "데이터&저장소(Data&Storage)"
---

# OpenSearch 벡터 검색 — knn_vector mapping, query와 filter

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
- Vector index의 memory 경로는 engine별로 다르다. Faiss와 NMSLIB index는 native library memory와 k-NN cache를 사용하고 circuit breaker의 영향을 받는다. Lucene engine은 Lucene segment와 OS page cache 경로를 사용하므로 모든 vector index를 native cache 모델로 설명하면 안 된다. Engine별 heap, native memory, page cache와 disk 지표를 분리한다.
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

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 — YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [AWS Documentation, Semantic search in Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/semantic-search.html), [OpenSearch Documentation, Semantic field](https://docs.opensearch.org/latest/mappings/supported-field-types/semantic/)
- [AWS Documentation, Serverless vector search](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html)
- [OpenSearch 기반 검색엔진과 벡터 검색 프로젝트 — YouTube](https://www.youtube.com/watch?v=CoLQ9ZCFNaY)
- [OpenSearch Documentation, k-NN vector field](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-vector/)
- [OpenSearch Documentation, k-NN query](https://docs.opensearch.org/latest/query-dsl/specialized/k-nn/index/)
- [OpenSearch Documentation, Vector search techniques](https://docs.opensearch.org/latest/vector-search/vector-search-techniques/index/)
- [OpenSearch Documentation, Filtering vector search](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/)
- [OpenSearch Documentation, k-NN API and stats](https://docs.opensearch.org/latest/vector-search/api/knn/)
- [OpenSearch Documentation, Methods and engines](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/), [OpenSearch Documentation, Vector spaces](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-spaces/), [OpenSearch Documentation, Vector search settings](https://docs.opensearch.org/latest/vector-search/settings/)
- [OpenSearch Documentation, Disk-based vector search](https://docs.opensearch.org/latest/vector-search/optimizing-storage/disk-based-vector-search/)

## 관련 문서

- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색과 임베딩 파이프라인]]
- [[OpenSearch-Vector-Search-Projection|검색 방식 선택, source of truth와 index 배치]]
- [[OpenSearch-Vector-Search-Embedding-Operations|embedding contract, inference와 model 교체]]
- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색과 점수 결합]]
