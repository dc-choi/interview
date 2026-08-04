---
tags: [database, vector, embedding, hnsw, ann, similarity-search]
status: done
verified_at: 2026-08-04
category: "데이터&저장소(Data&Storage)"
aliases: ["Vector Similarity Search", "벡터 유사도 검색", "HNSW", "ANN", "임베딩 검색", "거리 계산"]
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

## 거리 계산 방식

| 방식 | 무엇을 보나 | 적합 |
|------|-------------|------|
| **L2(유클리드)** | 직선 거리 — 방향 + 크기 모두 | 이미지 유사도, 얼굴 인식 등 물리적 특징 |
| **코사인** | 두 벡터의 **각도**(크기 무시, 방향만) | 텍스트 의미 유사도 |
| **내적(inner product)** | 방향 + 크기, **클수록 더 유사** | 선호 강도까지 반영하는 추천 |

거리 방식은 임의로 정하는 게 아니라 **사용하는 임베딩 모델의 특성에 맞춰** 골라야 한다(모델이 코사인 정규화로 학습됐으면 코사인, 추천 점수 스케일이 의미 있으면 내적).

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

## 관련 문서
- [[pgvector|pgvector (PostgreSQL 벡터 검색)]] — PostgreSQL 구현, 타입과 운영
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화]] — ef_search/LIMIT, iterative scan
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색]] — 검색 엔진 쪽 k-NN과 embedding pipeline
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 벡터 + BM25 하이브리드, 청킹
- [[Recommendation-System-Candidate-Generation|추천 후보 생성]] — item-to-item과 콘텐츠 기반 source
- [[Recommendation-System-Serving-Operations|추천 서빙과 embedding/index lifecycle]]
- [[Recommendation-System-Feedback-Data|추천 impression과 interaction 계약]]
- [[Index|인덱스 설계 (B-Tree)]] — 일반 인덱스와의 대비

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 - YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [Methods and engines - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/)
- [pgvector — exact와 approximate nearest neighbor search](https://github.com/pgvector/pgvector)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Embedding task type](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/task-types)
- [벡터DB를 걷어내고 유사글 추천 되살리기 — DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?id=168411&boardType=techBlog&isShared=Y)
- [pgvector 검색 최적화 - YouTube](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)
