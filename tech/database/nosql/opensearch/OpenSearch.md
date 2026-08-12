---
tags: [database, search, opensearch, lucene, inverted-index]
status: index
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch", "검색 엔진", "역색인"]
---

# OpenSearch 학습 지도

OpenSearch는 Apache Lucene을 분산 실행 계층으로 감싼 검색 및 분석 엔진이다. JSON 문서를 샤드별 Lucene 인덱스에 저장하고, 역색인과 `doc_values`로 전문 검색, 필터, 정렬, 집계를 처리한다.

이 문서는 설정을 전부 외우는 순서가 아니라 검색엔진을 도입하고 설계하는 중심 이야기를 단계별로 익히는 로드맵이다. 각 단계에서 필요한 절만 읽고, 아웃풋을 만든 뒤 통과 기준을 만족하면 다음 단계로 넘어간다.

## 한 장으로 보는 흐름

- 쓰기: `RDB commit → Outbox 또는 CDC → OpenSearch 문서 → Index analyzer → term → 역색인`
- 검색: `사용자 query → Search analyzer → term → shard별 postings와 BM25 → coordinator가 top K 병합 → 응답`
- 저장 계층: `Cluster → Index → Primary와 Replica shard → Lucene index → immutable segment`
- 서비스 경계: `Client → 검색 API 계층(계약, 캐시, 폴백) → 쿼리 이해(정규화, 교정, 초성) → 위 검색 흐름`

이 흐름의 다이어그램 버전은 [[OpenSearch-Architecture-Map|아키텍처 한 장 지도]]에 있다.

`term`은 analyzer가 만든 검색 단위이고, postings는 해당 term을 가진 문서 ID 목록이다. 이 용어들의 실물 예시는 시작 전 단계의 [[OpenSearch-Basics|기초 문서]]에서 익힌다.

## 핵심 개념과 구조

OpenSearch의 논리적 데이터 모델과 물리적 실행 구조는 구분해서 본다. RDB의 row와 table 비유는 입문에는 유용하지만, 실제 검색과 복제의 실행 단위는 shard이고 물리 저장 단위는 Lucene segment다.

| 개념                       | 역할                                                                                          | 놓치기 쉬운 점                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Document                 | 색인, ID 조회, 갱신의 논리적 단위인 JSON 데이터                                                             | API가 다루는 기본 단위이지 내부 물리 저장의 최소 단위는 아니다                         |
| Mapping과 field           | field 타입, analyzer와 색인 구조를 정의하는 index schema                                                | 직접 정의할 수도 있고 dynamic mapping으로 추론될 수도 있다                      |
| Index                    | 관련 document와 mapping, settings를 묶는 논리적 경계                                                   | 검색 요청은 index 전체가 아니라 index를 구성하는 shard에서 분산 실행된다              |
| Primary shard            | routing으로 document가 배정되는 논리적 partition                                                      | 각 shard copy는 독립적으로 검색 가능한 완전한 Lucene index다                  |
| Replica shard            | primary shard의 복제본                                                                          | 장애 대응과 읽기 분산에는 유용하지만 primary routing 공간은 늘리지 않는다              |
| Node                     | OpenSearch process 하나이며 shard copy를 저장하거나 cluster 역할을 수행                                    | 모든 node가 요청을 조율할 수 있고 전용 역할 분리는 workload에 따라 결정한다             |
| Cluster와 cluster manager | 하나 이상의 node가 공유하는 실행 경계이며 선출된 manager가 cluster state, node membership과 shard allocation을 조율 | manager는 검색과 쓰기의 중앙 프록시가 아니다                                  |
| Segment                  | shard copy 안의 불변 Lucene 검색 단위                                                               | refresh로 검색 가능해지고 작은 segment는 background merge로 합쳐진다          |
| Inverted index           | analyzer가 만든 term에서 document ID 목록인 postings로 가는 구조                                         | phrase와 proximity 검색은 저장된 token position을 사용하며 의미 문맥 이해와는 다르다 |
| `doc_values`             | document ID에서 field 값으로 가는 column-oriented on-disk 구조                                       | 정렬과 집계에 사용하며 `text` field에는 기본 제공되지 않는다                       |
| BM25                     | `text` 검색의 기본 lexical similarity                                                            | TF, IDF, 반복 포화와 검색 대상 field 길이를 사용하며 score는 확률이 아니다           |

### 저장 계층

```text
Cluster (2-node 배치 예시)
└── Index
    ├── Shard group 0
    │   ├── Primary copy on Node A → Lucene index → immutable segments
    │   └── Replica copy on Node B → Lucene index → immutable segments
    └── Shard group 1 → 다른 document partition
```

OpenSearch는 단일 node로도 실행할 수 있다. 현재 오픈소스 기본값은 primary shard마다 replica 1개지만, 같은 shard group의 primary와 replica는 같은 node에 함께 할당되지 않아 shard를 할당할 수 있는 별도 data node가 없으면 replica는 unassigned 상태로 남는다. 배포판과 관리형 서비스의 기본값은 다를 수 있으므로 운영에서는 index template에 명시한다.

### 쓰기와 검색 흐름

1. 쓰기는 `_id` 또는 custom routing의 hash로 primary shard를 고른다. 기본 DOCUMENT replication에서는 primary가 작업을 적용하고 active replica에 전달하지만, 성공 응답이 곧 Search 가시성을 뜻하지는 않는다. 새 segment가 refresh되어야 검색할 수 있다.
2. 일반적인 lexical top-hits 검색은 coordinating 기능을 수행하는 node가 각 logical shard의 사용 가능한 copy 하나에 요청을 보낸다. 각 shard가 segment의 postings를 조회하고 local top K를 만든 뒤 coordinator가 전체 결과를 병합한다. Primary와 replica를 모두 중복 검색하는 구조가 아니다.
3. Full-text match는 inverted index를, 정렬과 집계는 주로 `doc_values`를 사용한다. 기본 similarity 설정에서는 query context의 lexical 결과를 BM25로 채점하고, filter context는 점수를 계산하지 않는다.

### 설계 체크포인트

- Shard와 replica는 많을수록 좋은 설정이 아니다. Shard마다 CPU, heap metadata, file handle과 검색 fan-out 비용이 생기고 replica는 저장 공간과 쓰기 비용을 늘린다.
- Replica는 가용성을 높이는 재료이지 단독 보장은 아니다. Failure domain, allocation awareness와 cluster-manager quorum을 함께 설계한다.
- Node 역할 분리는 workload 격리 선택이다. 전용 cluster manager는 운영 cluster의 control plane을 보호하고, ingest와 coordinating 전용화는 실제 부하를 benchmark해 결정한다.
- 관련도 개선은 BM25 parameter부터 바꾸지 않는다. Mapping과 analyzer, query와 filter 구분, field boost, 대표 query set과 품질 지표를 먼저 검증한다.

세부 동작은 [[OpenSearch-Architecture|분산 실행 모델]], [[OpenSearch-Mapping-Text-Analysis|매핑과 저장 구조]], [[OpenSearch-Inverted-Index-Structures|역색인 물리 구조]], [[OpenSearch-Query-Relevance|BM25와 Query DSL]]에서 이어서 본다.

이 흐름에서 답해야 할 질문은 다섯 가지다. 왜 RDB 검색만으로 부족한가, 무엇을 어떤 term으로 저장할 것인가, 어떤 조건을 필터와 점수로 나눌 것인가, 분산 실행의 비용은 무엇인가, 원본 DB와 검색 결과의 시차를 어떻게 관리할 것인가.

## 단계별 로드맵

단계의 완료는 문서를 읽었다는 체크가 아니라 문서를 보지 않고 아웃풋을 만들 수 있는지로 판단한다. 업무 중 짜투리에는 지정한 절만 읽고, 퇴근 후에는 설계와 실험에 집중한다.

| 단계 | 핵심 질문 | 퇴근 후 아웃풋 |
|---:|---|---|
| 시작 전. 실물 익히기 | 인덱스, 문서, 검색 요청과 응답은 실제로 어떻게 생겼는가 | 인덱스 생성부터 검색까지 네 요청 직접 실행 |
| 0. 도입 판단 | 언제 검색엔진의 운영 비용이 정당화되는가 | 요구, 대안, 비용, 판단을 담은 짧은 ADR |
| 1. 핵심 원리 | 문서가 어떻게 term이 되고 분산 검색되는가 | 매핑과 query 설계, 전체 요청 흐름 그림 |
| 2. 검색 품질 | 검색 결과가 실제로 좋아졌는지 어떻게 아는가 | 기준선과 변경 후 품질, latency 비교 |
| 3. 운영 | 동기화, 변경, 장애와 복구를 어떻게 통제하는가 | 무중단 전환 Runbook과 장애 진단표 |
| 4. 선택 심화 | 측정된 문제를 어떤 내부 구조나 검색 방식으로 풀 것인가 | 내부 구조 분석 또는 하이브리드 검색 실험 |

### 시작 전: 실물 익히기

- 목표: 이후 문서 대부분이 전제하는 인덱스, 매핑, analyzer, term, 역색인, 검색 응답의 실물을 손에 익힌다.
- 읽기: 실행 중인 cluster가 없으면 [[OpenSearch-Local-Quickstart|Local Docker Quickstart]], 이어서 [[OpenSearch-Basics|OpenSearch 기초 — 요청과 응답의 실물]] 전체
- [ ] 통과: 인덱스 생성부터 match 검색까지 네 요청을 문서 없이 작성하고, 응답의 `hits`와 `_score`를 설명한다.

### 0단계: 도입 판단

- 목표: RDB 검색으로 충분한 요구와 OpenSearch가 필요한 요구를 구분한다.
- 짜투리 읽기: [[OpenSearch-vs-RDB-Search#B-tree vs 역색인|B-tree vs 역색인]], [[OpenSearch-vs-RDB-Search#검색엔진 도입의 대가|검색엔진 도입의 대가]], [[OpenSearch-vs-RDB-Search#도입 판단 사다리|도입 판단 사다리]]
- 퇴근 후 아웃풋: 익숙한 서비스 하나를 골라 요구, 검토한 대안, 새 운영 비용, 최종 판단을 네 문단으로 작성한다.
- [ ] 통과: MySQL로 충분한 경우와 OpenSearch가 필요한 경우를 90초 안에 모두 설명한다.

### 1단계: 핵심 원리

- 목표: `문서 → analyzer → term → 역색인 → shard 검색 → top K 병합` 흐름과 검색 가시성 경계를 연결한다.
- 짜투리 읽기: [[OpenSearch-Mapping-Text-Analysis#필드 타입 선택|필드 타입]], [[OpenSearch-Mapping-Text-Analysis#저장 구조 세 가지|저장 구조]], [[OpenSearch-Mapping-Text-Analysis#Analyzer 파이프라인|Analyzer]], [[OpenSearch-Query-Relevance#Term-level과 Full-text|Term-level과 Full-text]], [[OpenSearch-Query-Relevance#Query context와 Filter context|Query와 Filter]], [[OpenSearch-Query-Relevance#BM25 mental model|BM25]]
- 이어서 읽기: [[OpenSearch-Architecture#계층 구조|계층 구조]], [[OpenSearch-Architecture#기본 DOCUMENT replication 쓰기 흐름|쓰기]], [[OpenSearch-Architecture#GET과 Search의 읽기 경로|읽기]], [[OpenSearch-Indexing-Internals#한 문서의 생명주기|문서 생명주기]]
- 퇴근 후 아웃풋: 한국어 콘텐츠의 `title`, `status`, `category`, `price` 매핑과 query를 설계하고 OpenSearch index 요청부터 검색 응답까지 한 장에 그린다.
- [ ] 통과: 각 field type과 query 선택 이유, 저장 직후 Search에서 보이지 않을 수 있는 이유를 문서 없이 설명한다.

### 2단계: 검색 품질

- 목표: analyzer와 ranking 변경을 감이 아니라 같은 query set과 지표로 비교한다.
- 짜투리 읽기: [[OpenSearch-Korean-Text-Analysis#Nori의 역할과 경계|Nori]], [[OpenSearch-Korean-Text-Analysis#사용자 사전, 동의어, 불용어는 목적이 다르다|사전과 동의어]], [[OpenSearch-Query-Understanding#오타 교정 계층|오타 교정]], [[OpenSearch-Query-Understanding#초성 검색과 자모 필드|초성 검색]], [[OpenSearch-Search-Quality-Evaluation#Judgment list 구축|Judgment]], [[OpenSearch-Search-Quality-Evaluation#rank_eval API|rank_eval]], [[OpenSearch-Search-Quality-Evaluation#온라인 지표|온라인 지표]]
- 측정할 때 읽기: [[OpenSearch-Performance-Troubleshooting#운영과 닮은 benchmark|운영과 닮은 benchmark]], [[OpenSearch-Search-Quality-Evaluation#검색 로그에서 개선 백로그까지|로그 백로그]]
- 필요할 때 읽기: [[OpenSearch-Relevance-Tuning#function_score 실전|function_score]], [[OpenSearch-Relevance-Tuning#rescore — top-N 2단계 재정렬|rescore]]
- 퇴근 후 아웃풋: 문서 50개 이상, 대표 query 20개, 관련도 등급을 준비하고 nDCG@10, zero-result rate, p95 기준선을 만든다. 한 번에 한 변수만 바꿔 전후를 기록한다.
- [ ] 통과: 품질 변경이 미리 정한 latency budget을 지키는지 판단하고, 채택하거나 기각한 근거를 설명한다.

### 3단계: 운영

- 목표: 검색 인덱스를 원본에서 다시 만들 수 있고 변경과 장애를 통제할 수 있게 한다.
- 짜투리 읽기: [[OpenSearch-Indexing-Internals#운영 DB와의 동기화|RDB 동기화]], [[OpenSearch-Indexing-Pipeline-Reliability#증상별 진단|동기화 증상 진단]], [[OpenSearch-Indexing-Pipeline-Reliability#Reconciliation 설계|정합성 검증]], [[OpenSearch-Index-Lifecycle#매핑 변경과 무중단 전환|무중단 전환]], [[OpenSearch-Cluster-Reliability#Unassigned shard 진단|Unassigned shard]], [[OpenSearch-Cluster-Reliability#Snapshot과 Restore|Snapshot과 Restore]], [[OpenSearch-Performance-Troubleshooting#증상별 가설|증상별 가설]]
- AWS를 쓸 때 읽기: [[OpenSearch-Service-Deployment#관리 책임 경계|관리 책임 경계]], [[OpenSearch-Service-Operations#가용성과 용량|가용성과 용량]], [[OpenSearch-Service-Operations#프로덕션 체크리스트|프로덕션 체크리스트]], [[OpenSearch-Service-Engine-Upgrade|Engine upgrade와 rollback 설계]]
- 퇴근 후 아웃풋: `backfill → catch-up → 검증 → shadow read → canary → alias 전환 → rollback 또는 forward-fix` Runbook과 결과 누락, 429, 디스크 증가 진단표를 만든다.
- [ ] 통과: rollback 가능한 조건과 불가능한 조건을 구분하고, 장애 하나의 지표와 가설, 첫 대응을 설명한다.

### 4단계: 선택 심화

실제 문제에 맞는 한 갈래만 선택한다. 아직 측정된 문제나 품질 기준선이 없다면 이 단계를 서두르지 않는다.

- 엔진 내부 갈래: [[OpenSearch-Inverted-Index-Structures|FST, postings, BKD와 doc_values]], [[OpenSearch-Segment-Merge|Merge policy와 codec]], [[OpenSearch-Segment-Replication|Segment replication과 remote store]]
- 시맨틱 검색 갈래: [[OpenSearch-Semantic-Search|시맨틱 검색 지도]], [[OpenSearch-Vector-Search|벡터 검색]], [[OpenSearch-Hybrid-Search|하이브리드 검색]], [[OpenSearch-Reranking-Neural-Sparse|Reranking과 neural sparse search]]
- 퇴근 후 아웃풋: 내부 구조 갈래는 느린 query나 디스크 증가의 인과를 측정으로 설명한다. 시맨틱 검색 갈래는 같은 judgment로 BM25 기준선과 hybrid 또는 reranking의 품질, latency, 비용을 비교한다.
- [ ] 통과: 선택한 기법이 기준선보다 나은 조건과 나쁘거나 불필요한 조건을 함께 설명한다.

## 레퍼런스 지도

로드맵을 진행하다 특정 기능, 운영 문제, 내부 구조가 필요할 때 아래 분류에서 찾아본다. 폴더 단위 목차는 [[OpenSearch-Indexing|색인]], [[OpenSearch-Query|쿼리]], [[OpenSearch-Segment|세그먼트]], [[OpenSearch-Operations|운영]], [[OpenSearch-Search|검색 기능]] 인덱스에 있다.

### 기능과 사례

- [[OpenSearch-Autocomplete|자동완성 설계]]
- [[OpenSearch-Search-Features|Highlight, 응답과 검색 실행 제어]]
- [[OpenSearch-Query-Understanding|오타 교정, 초성 검색과 검색어 전처리]]
- [[OpenSearch-Entity-Relationship-Search|인물과 출연작 같은 개체 관계 검색 모델링]]
- [[OpenSearch-Aggregations-Pagination|집계, 패싯, 정렬과 페이지네이션]]
- [[OpenSearch-Popular-Keywords-TopK|OpenSearch, Redis, 스트림 기반 인기 검색어 top-k 설계]]
- [[OpenSearch-JavaScript-Client|opensearch-js 연결, SigV4 서명과 기본 호출]]

### 운영 레퍼런스

- [[OpenSearch-Index-Lifecycle|Template, Alias, Reindex, Data Stream과 ISM]]
- [[OpenSearch-Indexing-Pipeline-Reliability|색인 파이프라인 정합성 검증과 장애 진단]]
- [[OpenSearch-Shard-Sizing|Shard 수, 크기와 storage 사이징]]
- [[OpenSearch-Cluster-Reliability|Allocation, snapshot과 복구]]
- [[OpenSearch-Performance-Troubleshooting|성능 진단과 장애 대응]]
- [[OpenSearch-Security-Production|보안과 프로덕션 체크리스트]]

### 특정 문제가 생겼을 때 보는 심화 주제

#### Lucene과 복제 내부

- [[OpenSearch-Inverted-Index-Structures|FST, postings, BKD와 doc_values]]
- [[OpenSearch-Segment-Merge|Merge policy와 codec 압축]]
- [[OpenSearch-Segment-Replication|Segment replication, remote-backed storage와 OR1]]

#### Ranking

- [[OpenSearch-Relevance-Tuning|function_score, rescore와 LTR 판단]]

### 확장 주제

- [[OpenSearch-Hybrid-Search|렉시컬과 시맨틱 결과의 normalization과 RRF]]
- [[OpenSearch-Vector-Search|OpenSearch k-NN과 embedding pipeline]]
- [[OpenSearch-Reranking-Neural-Sparse|Reranking pipeline과 neural sparse search]]
- [[OpenSearch-Service|Amazon OpenSearch Service]] — 배포, 운영, 보안, upgrade와 비용은 이 인덱스에서 찾는다
- [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성과 AI 장애 조사]]
- [[Centralized-Logging-with-OpenSearch|AWS Centralized Logging with OpenSearch]]

### 검색 시스템의 바깥 경계

OpenSearch 엔진을 잘 운영하는 것과 사용자가 좋은 검색 경험을 얻는 것, 생성형 AI가 좋은 근거를 찾는 것은 서로 다른 문제다.

- [[OpenSearch-Search-API-Layer|검색 API 서비스 계층]]: 계약과 쿼리 빌더, 캐싱, 폴백과 부하 보호
- [[Search-UX|검색 UX 설계]]: 입력 보조, 필터, 정렬, 탐색과 검색 전환율
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]: 청킹, 하이브리드 검색, 재탐색과 근거 추적
- [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 디스커버리]]: query-bound 검색, 무질의 추천과 taxonomy browse의 공유 계약
- [[Search-Recommendation-Discovery-Learning-Path|검색과 추천 학습 경로]]: 검색 baseline부터 OPE, 온라인 실험과 장애 훈련까지 이어지는 산출물 순서

## 출처

- [Get started with OpenSearch: Fundamental concepts — OpenSearch](https://www.youtube.com/watch?v=GbkRaxj-bJw)
- [Introduction to OpenSearch — OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/intro/)
- [OpenSearch concepts — OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/concepts/)
- [Mappings — OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/)
- [Doc values mapping parameter — OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/doc-values/)
- [Creating a cluster — OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/)
- [Search shard routing — OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)
- [Segment replication — OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/segment-replication/index/)
- [Keyword search and BM25 — OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/keyword-search/)
- [Query and filter context — OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/query-filter-context/)
- [OpenSearch Documentation - OpenSearch Project](https://docs.opensearch.org/latest/about/)
- [OpenSearch 내부 구조 참고 영상 - YouTube](https://www.youtube.com/watch?v=J2uEQrCE2Hs)
