---
tags: [database, vector, embedding, hnsw, ann, similarity-search, filtering]
status: done
verified_at: 2026-10-06
category: "데이터&저장소(Data&Storage)"
aliases: ["Vector Similarity Search", "벡터 유사도 검색", "HNSW", "ANN", "임베딩 검색", "거리 계산", "필터 벡터 검색", "Filtered Vector Search"]
---

# 벡터 유사도 검색 (임베딩, HNSW, 거리)

이미지나 텍스트 같은 비정형 데이터는 단순 값 비교로 유사성을 판단하기 어렵다. 빨간 공과 빨간 사과는 색과 모양은 비슷하지만 의미가 다르고, 표현이 달라도 의미가 가까운 문장이 있다. 벡터 유사도 검색은 데이터를 **숫자 배열(벡터)** 로 바꾼 뒤, 벡터 공간에서 **가까운 데이터**를 찾는다. 색상, 소재, 디자인 같은 특징이 벡터에 반영되므로 유사한 대상을 의미 기반으로 검색할 수 있다.

## 기본 흐름 — 임베딩 → 저장 → 검색

1. **임베딩**: 원본 데이터를 임베딩 모델에 넣어 벡터로 변환.
2. **저장**: 벡터를 벡터 검색 지원 저장소에 적재.
3. **검색**: 쿼리 벡터와 저장된 벡터들을 비교해 가장 가까운 것을 찾음.

저장과 검색을 PostgreSQL 안에서 처리하는 구현이 [[pgvector|pgvector]], 검색 엔진 쪽 구현이 [[OpenSearch-Vector-Search|OpenSearch k-NN]]이다.

벡터 축과 `국가 - 수도` 같은 산술 관계는 model, 언어와 학습 corpus에 따라 달라지는 직관이지 모든 embedding의 보장된 성질이 아니다. 검색에서는 좌표 자체를 해석하기보다 고정된 query와 relevance judgment로 이웃 순위를 검증한다.

## Exact kNN부터 ANN까지

인덱스가 없는 exact kNN은 모든 후보와 거리를 비교해 완전한 Recall을 제공한다. ANN은 일부 탐색을 생략해 지연을 줄이는 대신 Recall, index build와 운영 복잡성을 비용으로 낸다. 따라서 vector DB나 ANN index를 기본값으로 두지 않고 **데이터 크기, 차원, 실행 주기, 동시성, 지연 SLO와 실측값**으로 선택한다.

```text
raw vector bytes ≈ item 수 N × 차원 D × 원소 bytes
전체 item pair 수 = N × (N - 1) / 2
방향을 구분한 비교 수 = N × (N - 1)
```

예를 들어 1,291개의 1,024차원 float32 vector는 원본 값만 약 5 MiB이고 방향을 구분한 pair는 약 166만 개다. 저장소 overhead와 실행 환경을 따로 측정해야 하지만, 하루 한 번 도는 batch라면 in-memory exact 비교가 상시 ANN 서비스보다 단순할 수 있다.

1. exact 결과를 품질 기준선으로 만든다.
2. 예상 최대 N과 D로 memory, 비교량과 batch 시간을 측정한다.
3. online query면 p95와 p99, offline batch면 완료 deadline을 본다.
4. SLO를 넘을 때 HNSW 또는 IVF를 도입하고 exact 대비 Recall@K를 측정한다.
5. 규모와 분포가 바뀔 때 같은 benchmark로 선택을 다시 검토한다.

## ANN — 근사 최근접 탐색

전체 비교가 지연 또는 batch deadline을 넘으면 **ANN(Approximate Nearest Neighbor)** 으로 일부 정확도를 내주고 속도를 얻는다. 대표 인덱스가 HNSW와 IVF다. ANN은 빠르지만 **설정에 따라 검색 품질(recall)과 성능이 달라진다**는 게 핵심 성질이다.

## HNSW — 계층 그래프 탐색

HNSW(Hierarchical Navigable Small World)는 벡터들을 **그래프로 연결**해 가까운 벡터를 빠르게 찾는다.

- 상위 계층은 노드가 적어 빠르게 훑고, 하위 계층으로 내려갈수록 촘촘한 연결을 따라 정밀 탐색.
- 비유: 고속도로로 대략 가까운 지역까지 간 뒤, 점점 작은 도로로 들어가 목적지 근처를 찾는 방식.
- 동적 데이터에 적합 — 별도 centroid training 없이 새 벡터를 그래프에 삽입할 수 있다.

### 튜닝 파라미터

| 파라미터 | 의미 | pgvector 기본 | 크게 잡으면 |
|----------|------|------|-------------|
| `m` | 노드 하나가 가질 최대 이웃 수 | 16 | 연결이 촘촘 → 품질↑, **인덱스 크기/생성비용↑** |
| `ef_construction` | 인덱스 생성 시 연결 후보 수 | 64 | 더 좋은 연결 가능 → **생성 시간↑** |
| `ef_search` | 검색 시 유지할 후보 수 | 40 | recall↑ → **CPU/메모리/응답시간↑** |

`m`, `ef_construction`은 **생성 시점**에 고정되고, `ef_search`는 **쿼리마다 조정** 가능해 품질↔성능 균형을 맞추는 핵심 손잡이다. recall이 부족하면 `ef_search`를 키우고, 느리면 줄인다.

표의 기본값은 pgvector 기준이다. OpenSearch는 engine과 version에 따라 parameter 위치와 기본값이 다르므로 제품 문서를 따로 확인한다.

## IVF — 학습한 bucket 일부만 탐색

IVF는 대표 centroid를 먼저 학습하고 각 vector를 가장 가까운 inverted list에 배치한다. Query는 가까운 list 일부만 탐색해 전체 비교를 피한다.

- `nlist`를 늘리면 bucket이 세분화되지만 training과 관리 비용이 늘어난다.
- `nprobes`를 늘리면 더 많은 list를 탐색해 recall이 좋아질 수 있지만 latency와 CPU가 증가한다.
- 최초 training은 필요하지만 새 vector마다 다시 학습하지는 않는다. 데이터 분포나 embedding model이 크게 바뀌면 재학습과 새 index 전환을 검토한다.
- OpenSearch의 IVF는 Faiss engine이 제공하며 배포 형태와 version별 지원 범위를 확인한다.

## 메타데이터 필터와 ANN

실제 검색은 tenant, 권한, 지역, 유효 기간 같은 조건을 만족하는 후보 중에서 가까운 벡터를 찾아야 할 때가 많다. 조건을 적용하는 위치에 따라 결과 수, recall과 지연이 달라진다.

| 배치 | 동작 | 위험 |
|---|---|---|
| ANN 뒤 필터 | 인덱스가 후보를 찾은 뒤 조건으로 제거한다 | 조건에 맞는 비율이 낮으면 요청한 수를 못 채운다. pgvector는 조건이 10% 행에 맞고 `hnsw.ef_search`가 기본값 40이면 평균 4행만 남는다고 설명한다 |
| 필터 뒤 exact | 조건으로 후보를 먼저 좁히고 전수 비교한다 | 남은 후보가 적으면 정확하고 빠르지만, 많으면 전수 비교 비용이 커진다 |
| 탐색 중 필터 | 허용 목록을 들고 그래프를 탐색하며 조건을 만족하는 노드만 결과에 넣는다 | 통과하지 않는 노드도 경유하는 방식은 조건이 엄격하거나 질의 벡터와 상관이 낮으면 탐색이 전수에 가까워지고, 통과 노드만 경유하는 방식은 허용 노드끼리의 경로가 끊길 수 있다 |

HNSW는 이웃 링크를 따라 이동하므로 필터를 통과하는 노드 비율이 낮아지면 남은 노드만으로 연결된 경로가 사라질 수 있다. Qdrant는 percolation 이론으로 통과 비율이 임계점보다 낮아지면 그래프가 조각나 탐색이 실패하기 시작하고, `m`을 늘리면 임계점을 옮길 수 있다고 설명했다.

엔진은 선택도에 따라 경로를 바꾸거나 경로를 고르는 기준을 안내한다(2026-10-06 문서 기준).

- OpenSearch: Lucene filter(2.4 이상)와 Faiss filter(HNSW는 2.9 이상, IVF는 2.10 이상)는 필터 후 문서 수와 `k` 등을 보고 사전 필터 exact search와 수정된 사후 필터 ANN 중 하나를 고른다. Faiss는 필터를 통과한 문서가 `k`개 이상인데 filtered ANN이 `k`개보다 적게 반환하면 필터 통과 문서 ID에 exact search로 fallback한다. 3.5부터는 `index.knn.faiss.efficient_filter.disable_exact_search`를 true로 두어 이 fallback을 끌 수 있다. 사용 예는 [[OpenSearch-Vector-Search-Mapping-Query|OpenSearch query와 filter]]에 있다.
- Qdrant: 약한 필터는 HNSW를 그대로 쓰고 엄격한 필터는 payload index와 전체 rescore가 맞지만, 그 사이에서는 둘 다 잘 맞지 않는다. 그래서 indexed payload 값을 기준으로 HNSW에 edge를 추가하며, 이를 위해 데이터 적재 전에 payload index를 만들라고 권장한다. 조건을 만족하는 추정 규모가 임계값보다 작으면 query planner가 full scan을 고른다.
- Weaviate: inverted index로 만든 허용 목록을 HNSW 탐색에 넘기고, 필터가 지나치게 엄격하면 flat search로 자동 전환하는 cutoff를 둔다. v1.34부터 새 컬렉션의 HNSW 기본 필터 전략은 ACORN이며, 다단계 이웃 평가와 필터를 만족하는 추가 진입점으로 질의와 가까운 영역의 노드가 필터로 많이 제외되는 경우를 완화한다.
- pgvector: 조건 컬럼 인덱스로 exact search 대상을 좁히는 방법, partial index와 partitioning을 대안으로 안내하고, 0.8.0부터는 iterative index scan을 켜면 결과가 모자랄 때 상한 안에서 인덱스를 더 탐색한다. 세부는 [[pgvector-Query-Optimization|pgvector 쿼리 최적화]]에 있다.

ACORN 논문은 predicate subgraph traversal로 이론상 이상적이지만 실용적이지 않은 필터 검색 전략을 근사하고, 실험 데이터셋에서 고정 recall 기준 기존 방법보다 2~1,000배 높은 처리량을 보고했다.

다음은 이 동작을 운영에 적용한 설계 지침이다.

- 필터 선택도(넓음, 중간, 매우 좁음)별 대표 query를 따로 두고, 같은 필터를 건 exact 결과 대비 Recall@k와 지연을 잰다.
- 필터 없는 benchmark의 recall을 필터 query에 그대로 옮기지 않는다.
- tenant와 권한 같은 보안 조건은 결과 수와 무관하게 검색 경계에서 강제한다([[OpenSearch-Hybrid-Search-RRF-Filtering|하이브리드 검색의 filter 배치]], [[RAG-Retrieval-Engineering#검색 권한과 데이터 수명|RAG 검색 권한]]).

## 거리 계산 방식

| 방식 | 무엇을 보나 | 적합 |
|------|-------------|------|
| **L2(유클리드)** | 직선 거리 — 방향 + 크기 모두 | 이미지 유사도, 얼굴 인식 등 물리적 특징 |
| **코사인** | 두 벡터의 **각도**(크기 무시, 방향만) | 텍스트 의미 유사도 |
| **내적(inner product)** | 방향 + 크기, **클수록 더 유사** | 선호 강도까지 반영하는 추천 |

거리 방식은 임의로 정하는 게 아니라 **사용하는 임베딩 모델의 특성에 맞춰** 골라야 한다(모델이 코사인 정규화로 학습됐으면 코사인, 추천 점수 스케일이 의미 있으면 내적).

길이를 1로 정규화한 벡터에서는 세 방식이 수학적으로 같은 순위를 만든다. 내적이 곧 코사인 유사도이고 `||a - b||² = 2 - 2cos(a, b)`이므로 L2 거리 순서도 코사인 순서와 같다. 다만 값의 범위와 방향(거리는 작을수록, 유사도는 클수록 가까움)이 다르므로 threshold는 metric마다 따로 정한다. 정규화하지 않은 벡터에서는 내적이 크기를 반영해 순위가 달라질 수 있다([[Recommendation-System-Modeling-Foundations#벡터, 내적과 코사인|추천 모델의 내적과 코사인]]).

정규화 여부는 모델과 출력 차원마다 다르므로 모델 문서로 확인한다(2026-10-06 문서 기준). OpenAI는 임베딩을 길이 1로 정규화해 제공하므로 내적만으로 코사인을 조금 더 빨리 계산할 수 있고 코사인과 유클리드 거리가 같은 순위를 낸다고 안내한다. 차원을 줄일 때는 생성 시 `dimensions` 파라미터를 쓰는 방식을 권장하며, 생성 뒤 직접 자르면 다시 정규화해야 한다. Gemini의 `gemini-embedding-001`은 기본 3072차원만 정규화돼 있어 `output_dimensionality`로 줄인 차원은 직접 정규화해야 하고, `gemini-embedding-2`는 줄인 차원도 자동으로 정규화한다. pgvector는 길이 1로 정규화된 벡터라면 성능을 위해 내적을 쓰라고 안내한다.

### 높은 점수와 관련성 판정은 구분한다

코사인 유사도는 벡터 방향의 가까움을 나타내며, `0.95`를 관련 있을 확률 95%로 읽을 수는 없다. 차원 수만으로 무관한 문서의 평균 점수나 공통 합격선을 정하지 않는다. 예를 들어 E5-base-v2 모델 카드는 점수가 0.7~1.0에 분포하는 특성을 InfoNCE 학습의 낮은 temperature 0.01로 설명한다. 이 범위를 모든 임베딩 모델이나 무작위 벡터의 분포로 일반화하지 않는다.

Top K는 후보 안의 상대 순위를 정하므로, 정답 문서가 없는 질의에도 결과를 낼 수 있다. 그렇다고 벡터 검색이 빈 결과를 반환할 수 없는 것은 아니다. Qdrant의 `score_threshold`는 기준보다 나쁜 결과를 제외하며, Euclidean처럼 작을수록 가까운 metric에서는 높은 점수를 제외한다(2026-10-06 문서 기준).

다음은 이를 검색 품질 평가에 적용한 절차다.

1. 실제 query와 관련성 라벨을 모으고 정답 문서가 없는 query도 포함한다.
2. 모델, 전처리와 metric을 고정한 상태에서 임계값별 오탐과 누락을 비교한다. 1위라는 이유만으로 통과시키지 않는다.
3. 통과한 후보가 없으면 빈 결과나 근거 부족 응답을 허용한다. 모델이나 corpus가 바뀌면 같은 평가를 다시 수행한다.

## 임베딩 공간은 versioned contract다

vector만 저장하면 어떤 공간의 값인지 복구할 수 없다. 최소한 다음 metadata를 함께 versioning한다.

- model ID와 version, 출력 차원
- task type과 query/document의 대칭 또는 비대칭 역할
- 전처리와 chunking 또는 summary version
- 정규화 여부와 거리 함수
- 원본 content hash와 생성 시각

이 중 하나가 바뀌면 기존 vector와 새 vector를 직접 비교할 수 있다고 가정하지 않는다. 새 공간을 병렬 생성하고 품질을 평가한 뒤 alias 또는 version pointer를 전환한다. 유사도 threshold도 model, task type, 차원과 dataset에 종속되므로 공간이 바뀔 때 다시 calibration한다.

## 소규모 item-to-item 배치 패턴

작은 corpus의 유사 콘텐츠 추천은 embedding 생성만 증분 처리하고, similarity와 Top K는 주기적으로 전체 재계산하는 구성이 단순하다.

```text
정본 조회 -> content hash 비교 -> 변경분 embedding 생성과 즉시 저장
         -> usable corpus 검증 -> 전체 exact similarity
         -> threshold와 Top K 적용 -> versioned 결과 publish
```

- 긴 본문 대신 검증된 summary를 쓰면 topic noise와 비용을 줄일 수 있지만 summary가 없는 item의 coverage를 잃는다.
- batch마다 vector를 저장하면 중단 뒤 완료한 구간을 재사용할 수 있다.
- 새 item의 추천만 갱신하면 기존 item의 Top K가 새 item을 포함하지 못해 방향별 freshness가 달라진다.
- 실패 여부는 이번 실행의 신규 생성 수가 아니라 계산 가능한 전체 corpus의 coverage와 freshness로 판단한다.
- threshold 아래 결과는 억지로 채우지 않고 빈 slot 또는 다른 baseline으로 fallback한다.
- 추천 품질은 impression과 click 또는 소비 event가 있어야 검증할 수 있다.

DEVOCEAN 사례는 1,291개 글의 embedding을 MySQL에 저장하고 batch memory에서 exact 비교해 상시 vector DB 없이 추천 쓰기 경로를 복원했다. 이 수치와 유사도 하한은 해당 model과 corpus의 관측값이며 일반 임계값이 아니다.

## 면접 체크포인트

- 벡터 검색이 의미 기반 유사성을 푸는 원리(임베딩 공간의 거리)
- exact kNN과 ANN을 규모, 실행 주기와 SLO로 선택하는 방법
- exact kNN vs ANN의 트레이드오프, recall 개념
- HNSW 계층 그래프 탐색과 IVF의 사전 training, 분포 drift 시 재학습 차이
- `m` / `ef_construction`(생성 고정) vs `ef_search`(쿼리 조정)의 역할 분담
- L2 / 코사인 / 내적의 차이와 임베딩 모델 정합성
- model, task type, 차원과 전처리를 함께 versioning해야 하는 이유
- 정규화 벡터에서 코사인, 내적, L2 순위가 같아지는 이유와 모델, 출력 차원별 정규화 확인
- ANN 뒤 필터, 필터 뒤 exact, 탐색 중 필터의 차이와 엄격한 필터에서 HNSW recall이 무너지는 이유

## 관련 문서
- [[Vector-Space-Model-and-Cosine-Similarity|희소 렉시컬 벡터 공간 모델]]
- [[pgvector|pgvector (PostgreSQL 벡터 검색)]] — PostgreSQL 구현, 타입과 운영
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화]] — ef_search/LIMIT, iterative scan
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색]] — 검색 엔진 쪽 k-NN과 embedding pipeline
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 벡터 + BM25 하이브리드, 청킹
- [[Recommendation-System-Candidate-Generation|추천 후보 생성]] — item-to-item과 콘텐츠 기반 source
- [[Recommendation-System-Serving-Operations|추천 서빙과 embedding/index lifecycle]]
- [[Recommendation-System-Feedback-Data|추천 impression과 interaction 계약]]
- [[Index|인덱스 설계 (B-Tree)]] — 일반 인덱스와의 대비

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 — YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [OpenSearch Documentation, Methods and engines](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/)
- [pgvector — exact와 approximate nearest neighbor search](https://github.com/pgvector/pgvector)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Embedding task type](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/task-types)
- [벡터DB를 걷어내고 유사글 추천 되살리기 — DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?id=168411&boardType=techBlog&isShared=Y)
- [pgvector 검색 최적화 — YouTube](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)
- [OpenAI API Documentation, Vector embeddings](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenSearch Documentation, Efficient k-NN filtering](https://docs.opensearch.org/latest/vector-search/filter-search-knn/efficient-knn-filtering/)
- [Qdrant Documentation, Indexing](https://qdrant.tech/documentation/concepts/indexing/)
- [Weaviate Documentation, Filtering](https://docs.weaviate.io/weaviate/concepts/filtering)
- [Filterable HNSW Without Recall Loss — Qdrant, Andrei Vasnetsov](https://qdrant.tech/articles/filterable-hnsw/)
- [ACORN: Performant and Predicate-Agnostic Search Over Vector Embeddings and Structured Data — arXiv](https://arxiv.org/abs/2403.04871)
- [E5-base-v2 model card, FAQ — intfloat](https://huggingface.co/intfloat/e5-base-v2#faq)
- [Qdrant Documentation, Filtering Results by Score](https://qdrant.tech/documentation/search/search/#filtering-results-by-score)
