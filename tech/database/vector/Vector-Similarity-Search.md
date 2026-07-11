---
tags: [database, vector, embedding, hnsw, ann, similarity-search]
status: done
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

## ANN — 근사 최근접 탐색

전체를 다 비교하는 정확한 최근접(exact kNN)은 데이터가 크면 너무 느리다. 그래서 실무는 **ANN(Approximate Nearest Neighbor)** — 약간의 정확도를 내주고 속도를 크게 얻는 근사 탐색 — 을 쓴다. 대표 인덱스가 HNSW와 IVF다. ANN은 빠르지만 **설정에 따라 검색 품질(recall)과 성능이 달라진다**는 게 핵심 성질.

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

## 면접 체크포인트

- 벡터 검색이 의미 기반 유사성을 푸는 원리(임베딩 공간의 거리)
- exact kNN vs ANN의 트레이드오프, recall 개념
- HNSW 계층 그래프 탐색과 IVF의 사전 training, 분포 drift 시 재학습 차이
- `m` / `ef_construction`(생성 고정) vs `ef_search`(쿼리 조정)의 역할 분담
- L2 / 코사인 / 내적의 차이와 임베딩 모델 정합성

## 관련 문서
- [[pgvector|pgvector (PostgreSQL 벡터 검색)]] — PostgreSQL 구현, 타입과 운영
- [[pgvector-Query-Optimization|pgvector 쿼리 최적화]] — ef_search/LIMIT, iterative scan
- [[OpenSearch-Vector-Search|OpenSearch 벡터 검색]] — 검색 엔진 쪽 k-NN과 embedding pipeline
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 벡터 + BM25 하이브리드, 청킹
- [[Index|인덱스 설계 (B-Tree)]] — 일반 인덱스와의 대비

## 출처

- [Amazon OpenSearch 시맨틱 검색과 하이브리드 검색 - YouTube](https://www.youtube.com/watch?v=mX6XNgbW_kE)
- [Methods and engines - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/)
- [pgvector 검색 최적화 - YouTube](https://www.youtube.com/watch?v=n3_LY7YFCwE&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=6)
