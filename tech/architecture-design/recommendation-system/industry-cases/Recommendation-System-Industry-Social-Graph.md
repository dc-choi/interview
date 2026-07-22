---
tags: [architecture, recommendation-system, industry-case-study, graph, social-network]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation System Social Graph Cases", "추천 시스템 소셜 그래프 사례"]
---

# 소셜 그래프 추천 시스템 산업 사례

LinkedIn과 Pinterest는 모두 graph를 쓰지만 추천의 의미가 다르다. LinkedIn은 두 사람이 연결될 가능성과 연결 후 가치를 다루는 **상호적 추천**이고, Pinterest는 사용자가 관심을 가질 콘텐츠를 찾는 **발견형 추천**이다. 같은 random walk와 embedding도 edge 의미, 목적 함수, 재랭킹 정책이 달라진다.

## 전체 비교

| 구분 | LinkedIn PYMK | Pinterest Pixie | Pinterest PinSage |
|---|---|---|---|
| 주된 역할 | 사람 후보 생성부터 최종 재랭킹 | 실시간 graph 후보 생성 | item representation 학습 |
| 핵심 graph | 사람과 사람의 연결 | Pin과 Board 관계 | Pin과 Board 관계, node feature |
| 대표 기법 | N-hop, PPR, embedding retrieval | biased random walk | random walk sampling과 GCN |
| 중요한 목적 | 초대 전송과 수락, 연결 가치, 공정성 | 관련 콘텐츠 발견과 최신 맥락 | 유사성과 일반화 가능한 embedding |
| 주의점 | 추천 대상도 이해관계자 | 인기 node 편향 | graph snapshot과 embedding freshness |

## LinkedIn People You May Know

### 제품 문제

PYMK는 viewer에게 연결할 가능성이 있는 다른 member를 추천한다. 2024년 공개 자료 기준으로 전체 inventory를 모두 점수화할 수 없기 때문에 수십억 규모의 후보 공간을 여러 단계로 줄인다.

클릭만 예측하면 목적이 불완전하다. 초대를 보내는 행동과 상대가 수락하는 행동은 별도 event이고, 한쪽의 engagement가 다른 쪽의 경험을 해칠 수 있다. 최종 목록에는 relevance뿐 아니라 fairness와 diversity 정책도 들어간다.

### Candidate generation

공개된 후보 source는 세 종류다.

1. **Graph-based**: 2-hop과 3-hop neighbor, 더 먼 관계를 찾는 Personalized PageRank를 사용한다.
2. **Similarity-based**: viewer와 candidate의 embedding 또는 profile 유사도를 사용한다.
3. **Heuristic-based**: 지역의 신규 member처럼 명시적 규칙으로 후보를 보충한다.

Graph walk는 연결 구조를 직접 사용한다. N-hop은 가까운 network vicinity를 안정적으로 찾고, PPR은 viewer 주변으로 teleport 범위를 제한해 더 먼 candidate까지 개인화한다. 연결이 적은 사용자에게 후보 유동성을 만들 수 있지만, degree가 큰 node와 기존 연결 구조를 반복 강화할 위험도 있다.

### Multi-stage ranking

2024년 공개 구조는 다음 funnel을 제시한다. 수치는 해당 글의 시점과 제품 표면에 한정된다.

| 단계 | 공개된 역할 | 대표 평가 관점 |
|---|---|---|
| L0 candidate generation | 수십억 inventory에서 약 3,000-5,000개 | Recall@k |
| L1 light ranker | source 점수를 보정해 약 500-800개 | Recall@k, calibration |
| L2 rich ranker | 강한 pair feature로 초대 전송과 수락 event 예측 | AUC, Precision@k, ECE |
| Re-ranker | 여러 예측을 결합하고 fairness와 diversity 적용 | 정책 지표, 목록 지표 |

여러 source의 점수 분포가 다르므로 L1의 calibration이 중요하다. L2는 viewer-candidate pair feature를 사용할 수 있지만 비용이 높다. 최종 re-ranker는 여러 event score의 가중치를 조정하고 protected attribute와 목록 다양성 같은 제약을 적용한다.

### 평가와 피드백 루프

LinkedIn은 단계별 offline metric과 전체 시스템 A/B test를 분리한다. 공개 글은 offline과 online이 어긋나는 원인으로 presentation bias, 배포 오류, 학습과 online 분포 차이를 든다.

Graph 추천에는 추가 피드백 루프가 있다.

- 추천으로 새 edge가 생기면 다음 graph와 후보 분포가 바뀐다.
- 연결이 많은 사용자는 더 많은 후보 경로에 등장할 수 있다.
- 초대 전송만 높이면 수락률과 상대의 피로도가 악화될 수 있다.
- 공정성 re-ranking은 어느 단계의 어떤 집단 분포를 목표로 하는지 명시해야 한다.

### Talent Search는 별도 사례다

2019년 Talent Search 연구는 검색된 후보 profile의 대표성을 맞추면서 기존 ranking utility를 보존하는 re-ranking을 다룬다. PYMK와 목적, query, 사용자 관계가 다른 제품 표면이며 하나의 공통 현행 모델이라고 합치면 안 된다.

## Pinterest Pixie

### 실시간 graph candidate generation

Pixie는 query에서 관련 Pin을 시작점으로 잡고 Pin-Board graph에서 biased random walk를 수행한다. 모든 Pin을 점수화하지 않고 시작점 주변 graph만 탐색해 후보를 만든다.

여러 seed Pin과 seed별 weight를 한 요청에 넣을 수 있어 최근 행동과 서로 다른 관심사를 조합할 수 있다. 후보 생성기이므로 최종 relevance와 정책 순서는 downstream ranker가 결정한다.

2017년 Pinterest Engineering 글은 당시 p99 60ms 목표와 여러 추천 표면 적용을 보고했다. 이 규모와 지연 수치는 현재 SLA가 아니라 발표 당시 구현의 근거다.

### Pixie가 보여 주는 계약

- query는 사용자 ID 하나가 아니라 여러 seed와 weight의 집합일 수 있다.
- random walk의 restart, edge weight, walk length가 탐색 범위와 인기 편향을 바꾼다.
- 실시간 graph read가 가능해도 edge ingestion freshness와 삭제 반영은 별도 문제다.
- 후보 source의 성과는 최종 CTR만이 아니라 source recall, coverage, 새로운 item 발견으로 관측해야 한다.

## Pinterest PinSage

### Graph structure와 node feature 결합

PinSage는 random walk로 중요한 이웃을 샘플링한 뒤 graph convolution으로 Pin embedding을 만든다. graph 연결뿐 아니라 node의 시각, annotation feature를 함께 사용할 수 있어 interaction이 적은 item에도 표현을 전달할 수 있다.

학습과 추론의 핵심은 GCN 이름보다 scale을 견디는 주변 구조다.

- 중요 이웃만 샘플링해 full-neighborhood aggregation을 피한다.
- 점점 어려운 negative를 사용해 가까운 비관련 item을 구분한다.
- MapReduce 기반 inference로 전체 graph의 item embedding을 계산한다.
- 생성된 embedding은 related-item retrieval과 ranking feature로 사용할 수 있다.

2018년 논문은 30억 node, 180억 edge graph와 75억 training example을 보고했고, offline metric, user study, A/B test로 비교했다. 이 수치는 논문 시점의 실험 규모다.

### Pixie와 PinSage를 구분한다

```text
Pixie   = 요청 시 graph를 걸어 후보를 찾는 online retrieval 사례
PinSage = graph와 node feature로 재사용 가능한 embedding을 학습하는 사례
```

둘은 경쟁 모델 이름이 아니다. 한 시스템에서도 graph traversal source와 embedding ANN source를 함께 두고 union, dedup, calibration할 수 있다.

## 전이 가능한 설계 질문

1. 어떤 node와 edge가 실제 선호를 표현하는가?
2. edge의 방향, 시간 감쇠, 반복 횟수를 어떻게 반영하는가?
3. graph snapshot, item embedding, ANN index의 version을 어떻게 맞추는가?
4. 연결이 적은 사용자와 신규 item에 어떤 fallback source를 주는가?
5. degree가 큰 node의 노출 집중을 어떤 slice와 policy로 관측하는가?
6. 추천 대상이 사람일 때 양쪽의 가치와 안전을 어떤 event로 분리하는가?

## 공개 근거의 경계

- LinkedIn PYMK 글은 2024년 연결 추천 표면의 공개 스냅샷이다.
- Talent Search fairness 연구는 recruiter-side profile ranking 사례이며 PYMK나 Jobs 전체 구조가 아니다.
- Pixie와 PinSage 수치와 구성은 각각 2017년과 2018년 공개 시점의 사례다.
- 공개 논문은 2026년 현재 각 회사의 전체 graph, feature, 모델과 정책을 증명하지 않는다.

## 관련 문서

- [[Recommendation-System-Industry-Case-Studies|추천 시스템 산업 사례 지도]]
- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]
- [[Recommendation-System-Feedback-Data|피드백 데이터]]
- [[Recommendation-System-Serving-Operations|서빙과 운영]]

## 출처

- [Building a Large-Scale Recommendation System: People You May Know - LinkedIn Engineering](https://www.linkedin.com/blog/engineering/recommendations/building-a-large-scale-recommendation-system-people-you-may-know)
- [Candidate Generation in a Large Scale Graph Recommendation System: People You May Know - LinkedIn Engineering](https://www.linkedin.com/blog/engineering/recommendations/candidate-generation-in-a-large-scale-graph-recommendation-system-people-you-may-know)
- [Fairness-Aware Ranking in Search and Recommendation Systems with Application to LinkedIn Talent Search - KDD](https://www.kdd.org/kdd2019/accepted-papers/view/fairness-aware-ranking-in-search-recommendation-systems-with-application-to)
- [Pixie: A System for Recommending Billions of Items in Real-Time - Pinterest 연구진](https://arxiv.org/abs/1711.07601)
- [Introducing Pixie - Pinterest Engineering](https://medium.com/pinterest-engineering/introducing-pixie-an-advanced-graph-based-recommendation-system-e7b4229b664b)
- [Graph Convolutional Neural Networks for Web-Scale Recommender Systems - Pinterest 연구진](https://arxiv.org/abs/1806.01973)
