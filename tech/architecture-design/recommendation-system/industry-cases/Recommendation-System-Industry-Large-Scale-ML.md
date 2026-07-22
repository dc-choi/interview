---
tags: [architecture, recommendation-system, industry-case-study, distributed-ml, online-learning]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Large Scale ML Cases", "추천 시스템 대규모 ML 사례"]
---

# 대규모 추천 ML과 실시간 학습 산업 사례

Meta와 ByteDance 사례의 공통점은 모델 수식보다 **sparse embedding, feature freshness, parameter distribution, serving latency**가 아키텍처를 지배한다는 점이다. 다만 Meta DLRM은 공개 reference workload, Instagram Explore와 Meta Ads는 특정 제품 표면, ByteDance Monolith는 online training framework 사례다. 하나의 현행 회사 공통 스택으로 합치면 안 된다.

## 사례별 위치

| 사례 | 주된 문제 | 대표 공개 기여 | 직접 확인되는 범위 |
|---|---|---|---|
| Meta DLRM | sparse와 dense feature의 대규모 CTR 모델 | embedding table, feature interaction, 병렬화 | 공개 reference model과 workload |
| Instagram Explore | 수십억 media에서 실시간 추천 | 4단계 funnel, Two-Tower, cache와 precompute | 2023년 Explore 표면 |
| Meta Ads sequence learning | 집계 feature가 잃는 event 순서 | event-based feature와 sequence model | 2024년 Ads 표면 |
| ByteDance Monolith | concept drift와 동적 sparse ID | collisionless table, online training, 증분 sync | 2022년 BytePlus Recommend 배포 |

## Meta DLRM

### 모델 구조

DLRM은 추천에서 흔한 두 입력 계열을 나눠 처리한다.

```text
dense feature  -> bottom MLP ------------------+
sparse ID      -> embedding table -> vectors --+-> feature interaction -> top MLP -> probability
```

- Dense feature는 연속값과 이미 압축된 통계다.
- Sparse categorical feature는 user, item, category처럼 cardinality가 큰 ID다.
- 각 sparse ID는 큰 embedding table lookup으로 vector가 된다.
- Dense representation과 sparse embedding 사이의 interaction을 만든 뒤 top MLP가 확률을 예측한다.

DLRM의 가치는 특정 layer 조합을 정답으로 제시하는 데 있지 않다. 추천 workload가 큰 embedding lookup과 상대적으로 작은 dense compute를 동시에 가진다는 점을 연구와 benchmark에 드러낸 데 있다.

### 병렬화와 시스템 영향

공개 DLRM은 embedding table에 model parallelism, fully connected layer에 data parallelism을 적용하는 구성을 제시한다. 이 비대칭 때문에 일반적인 dense DNN과 병목이 다르다.

- embedding 전체 크기는 accelerator memory를 넘을 수 있다.
- lookup과 gradient update는 memory bandwidth와 통신에 민감하다.
- table별 cardinality와 access frequency가 달라 단순 균등 sharding이 불균형을 만든다.
- batch 크기는 throughput을 높이지만 online latency budget에 제한된다.
- model마다 sparse/dense 비율이 달라 같은 hardware 최적화가 동일한 효과를 내지 않는다.

2020년 Meta 연구는 production-scale DNN workload 사이의 다양성과 server 세대, batching, co-location에 따른 latency-bounded throughput 차이를 보고했다. 핵심은 모델 architecture와 serving hardware를 분리해 최적화하기 어렵다는 점이다.

### 근거 경계

DLRM은 공개 reference architecture와 benchmark다. Facebook, Instagram, Ads의 모든 모델이 이 구조와 같거나 2026년 현재도 그대로라는 증거가 아니다.

## Instagram Explore

### 4단계 funnel

2023년 공개된 Explore 구조는 다음 단계를 사용한다.

```text
Retrieval -> First-stage ranking -> Second-stage ranking -> Final reranking
```

Retrieval은 수십억 media를 여러 source에서 수천 개 후보로 줄인다. source는 heuristic과 ML, real-time과 pre-generated 조합으로 구성된다. 최근 행동은 freshness에 유리하고, 사전 생성 source는 장기 취향과 peak-time 가용성에 유리하다.

### Two-Tower retrieval

User tower와 item tower는 독립적으로 embedding을 만든다. item embedding은 offline으로 계산해 ANN index에 넣고, user embedding은 요청 시 최신 user feature로 계산한다.

이 구조의 장점은 item을 매 요청마다 다시 추론하지 않고 cache와 ANN을 사용할 수 있다는 점이다. 반대로 user-item pair feature를 tower 입력에 넣으면 독립 계산과 cacheability를 잃는다. pair feature는 더 좁혀진 후보에 적용하는 downstream ranker로 미룬다.

### Ranking과 value model

- First-stage ranker는 second-stage의 top-K 선택 결과를 label로 삼는 distillation 형태를 사용한다.
- Second-stage MTML model은 click, like, see-less 같은 여러 event probability를 예측한다.
- Value model은 양과 음의 event에 가중치를 주어 최종 효용 점수를 만든다.
- Final re-ranking은 integrity filter, 동일 author 반복 방지와 diversity policy를 적용한다.

공개 글은 cache, off-peak precomputation, hourly continual training을 조합해 무거운 모델과 가용성 사이를 절충한다고 설명한다. 이 주기와 구조는 2023년 Explore 사례이며 다른 Meta 표면의 계약이 아니다.

## Meta Ads의 sequence learning

### 집계 sparse feature의 한계

전통적인 DLRM형 Ads 입력은 최근 N일 클릭한 광고, 방문한 페이지 같은 행동을 여러 window로 집계한다. 이 방식은 대규모 sparse ID를 다루기 좋지만 다음 정보를 잃을 수 있다.

- event의 실제 순서와 간격
- 같은 event 안의 attribute 조합
- aggregation 방식 사이의 중복
- 사람이 미리 정의하지 않은 행동 pattern

### Event-Based Feature

2024년 공개 시스템은 event stream, sequence length, event attribute를 하나의 EBF 계약으로 묶는다. event model은 attribute embedding과 timestamp encoding으로 event representation을 만들고, sequence model이 여러 event를 요약한다.

긴 sequence를 그대로 self-attention하면 비용이 커진다. 공개 글은 multi-headed attention pooling으로 복잡도를 `O(N²)`에서 `O(MN)` 형태로 줄이고, 길이가 다른 sequence를 jagged tensor로 처리하기 위한 PyTorch와 GPU kernel 수준의 최적화를 설명한다.

이 사례가 보여 주는 변화는 feature engineering이 사라진다는 단순한 선언이 아니다. raw event에 가까워질수록 storage format, sequence truncation, serving kernel, feature point-in-time correctness까지 함께 다시 설계해야 한다.

## ByteDance Monolith

### 해결하려는 두 문제

1. User와 item ID가 계속 생기므로 sparse embedding table 크기가 동적으로 증가한다.
2. 짧은 동영상과 광고 관심은 빨리 바뀌므로 batch retraining만으로 concept drift를 따라가기 어렵다.

Monolith는 Worker-Parameter Server 구조에서 dense parameter와 sparse embedding을 관리하고, batch training 이후에도 streaming example로 training PS를 갱신한다.

### Collisionless embedding lifecycle

Fixed-size hashing은 서로 다른 ID가 같은 embedding을 공유하는 collision을 만들 수 있다. Monolith는 동적 key-value hash table로 ID별 embedding을 분리하고, 무한 성장을 막기 위해 lifecycle policy를 둔다.

- 발생 횟수가 적은 ID는 admission 전에 filtering한다.
- 오래 접근되지 않은 ID는 table별 expiry에 따라 제거한다.
- lookup과 update를 TensorFlow resource operation으로 통합한다.

Collision을 없애는 것만으로 충분하지 않다. 어떤 ID를 받아들이고 언제 제거할지가 memory cost, tail item 학습과 재등장한 ID의 cold start를 결정한다.

### Streaming feedback loop

공개된 data path는 다음과 같다.

```text
User action Kafka + Feature Kafka
  -> Flink online joiner
  -> Training example Kafka
  -> online training / HDFS batch training
  -> training PS
  -> incremental parameter sync
  -> serving PS
```

Action과 feature는 순서대로 도착한다는 보장이 없으므로 request key로 결합한다. 전환처럼 늦게 오는 action을 위해 memory cache 뒤에 on-disk KV storage를 둔다. Negative sampling으로 label 분포를 바꾸면 serving에서 log-odds correction을 적용한다.

### Parameter sync와 reliability

수 TB 모델 전체를 자주 교체하면 network와 memory spike가 크다. Monolith는 최근에 갱신된 sparse key만 추적해 minute-level로 training PS에서 serving PS로 보낸다고 설명한다. Dense parameter는 더 느린 주기로 동기화할 수 있어 serving bundle 내부에 의도적인 freshness 차이가 생긴다.

Fault tolerance는 snapshot frequency와 freshness의 교환 관계다. 논문 사례는 training PS를 매일 snapshot하고, 장애 시 하루 분량 update 손실을 허용하는 선택을 보고한다. 이는 보편 권장 주기가 아니라 당시 실험으로 정한 정책이다.

### 근거 경계

Monolith 논문이 직접 확인하는 제품 배포는 BytePlus Recommend다. 현재 TikTok이나 Douyin의 전체 candidate, ranking, policy stack을 공개한 문서로 사용하면 안 된다.

## 함께 읽을 때의 설계 질문

| 질문 | DLRM과 Meta 사례 | Monolith 사례 |
|---|---|---|
| 큰 sparse state를 어떻게 담는가 | table sharding과 model parallelism | 동적 collisionless table과 expiry |
| 최신 행동을 어떻게 반영하는가 | real-time source, continual training, sequence EBF | Kafka join과 online training |
| 요청 지연을 어떻게 낮추는가 | cache, precompute, ANN, staged ranking | serving PS와 증분 parameter sync |
| version 정합성을 어떻게 다루는가 | model과 embedding/index bundle | dense/sparse sync 주기와 snapshot |
| 무엇을 그대로 복사하면 안 되는가 | 공개 workload를 현행 공통 모델로 간주 | BytePlus 구조를 TikTok 명세로 간주 |

## 관련 문서

- [[Recommendation-System-Industry-Case-Studies|추천 시스템 산업 사례 지도]]
- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Feedback-Data|피드백 데이터]]
- [[Recommendation-System-Serving-Operations|서빙과 운영]]

## 출처

- [Deep Learning Recommendation Model for Personalization and Recommendation Systems - Meta 연구진](https://arxiv.org/abs/1906.00091)
- [DLRM Reference Implementation - Meta GitHub](https://github.com/facebookresearch/dlrm)
- [The Architectural Implications of Facebook's DNN-based Personalized Recommendation - Meta Research](https://ai.meta.com/research/publications/the-architectural-implications-of-facebooks-dnn-based-personalized-recommendation/)
- [Scaling the Instagram Explore Recommendations System - Meta Engineering](https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/)
- [Sequence Learning for Personalized Ads Recommendations - Meta Engineering](https://engineering.fb.com/2024/11/19/data-infrastructure/sequence-learning-personalized-ads-recommendations/)
- [Monolith: Real Time Recommendation System With Collisionless Embedding Table - ACM RecSys workshop](https://ceur-ws.org/Vol-3303/paper8.pdf)
- [Monolith Source Code - ByteDance GitHub](https://github.com/bytedance/monolith)
