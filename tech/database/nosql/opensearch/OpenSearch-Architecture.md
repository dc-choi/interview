---
tags: [database, search, opensearch, lucene, shard, replication]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Architecture", "OpenSearch 아키텍처"]
---

# OpenSearch 아키텍처와 분산 실행 모델

Lucene은 애플리케이션에 임베드되는 검색 라이브러리이며 자체 분산 클러스터 기능을 제공하지 않는다. OpenSearch는 Lucene 위에 JSON API, 매핑, 샤드 배치, 복제, 장애 복구, 클러스터 조정 계층을 제공한다. 핵심 실행 경계는 인덱스 전체가 아니라 샤드다.

## 제품 구성

| 구성 요소 | 역할 |
|---|---|
| OpenSearch | JSON 문서 저장, 색인, 검색과 집계를 실행하는 분산 엔진 |
| OpenSearch Dashboards | Query 탐색, 시각화, 인덱스와 plugin 관리 UI |
| Data Prepper | Source, processor, sink를 연결하는 별도 server-side 수집기 |

## 계층 구조

```text
Cluster
└── Index
    ├── Primary shard 0
    │   └── Lucene index
    │       ├── segment A
    │       └── segment B
    ├── Replica shard 0
    │   └── Primary shard 0의 복제본
    └── Primary shard 1
        └── 또 하나의 Lucene index
```

- 인덱스는 관련 JSON 문서의 논리적 집합이며 매핑과 설정을 가진다.
- 각 문서는 정확히 하나의 논리적 primary shard에 속한다.
- 각 shard는 독립적으로 검색 가능한 완전한 Lucene 인덱스다.
- replica는 primary의 복사본이다. 읽기 분산과 장애 대응에는 유용하지만 primary routing 공간을 늘리지는 않는다.
- primary 수가 `P`, replica 수가 `R`이면 일반적인 물리 shard copy 수는 `P × (1 + R)`다.

샤드가 늘면 Lucene 인덱스, segment reader, cache, heap metadata, 파일 핸들, 검색 fan-out도 함께 늘어난다. 샤드는 단순한 파일 조각이 아니다.

## 노드 역할

| 역할 | 책임 | 운영 포인트 |
|---|---|---|
| `cluster_manager` | 클러스터 상태, 노드 멤버십, 샤드 할당 | 데이터 경로의 중앙 프록시가 아님 |
| `data` | 샤드 저장, 색인, 검색, 집계 | CPU, heap, 디스크 I/O의 주 소비자 |
| `ingest` | ingest pipeline 실행 | 무거운 변환은 검색 자원과 경쟁 |
| `coordinating_only` | shard fan-out과 결과 reduce | 큰 검색에서 heap 병목 가능 |
| `search` | Search replica shard를 호스팅 | 색인과 검색 workload 분리 |

모든 노드는 암묵적으로 coordinating 기능을 수행한다. 규모가 작으면 여러 역할을 겸할 수 있지만, 운영 규모에서는 전용 cluster manager를 두고 애플리케이션 트래픽을 직접 보내지 않는 편이 안전하다.

## 문서 라우팅

기본 routing 값은 `_id`다.

```text
shard_num = hash(_routing) % num_primary_shards
```

같은 `_id`는 같은 shard group으로 가므로 ID 기반 GET, update, delete는 모든 shard를 탐색하지 않는다. Custom routing으로 저장한 문서의 GET, update, delete에는 같은 값을 제공해야 한다. Search는 생략해 전체 shard를 검색할 수 있고, 같은 routing을 주면 관련 shard만 검색한다.

### Custom routing의 양면성

- 장점: 특정 tenant나 도메인 키를 한정된 shard로 보내 검색 fan-out을 줄일 수 있다.
- 위험: 키 분포가 치우치면 hot shard와 디스크 skew가 생긴다.
- 한계: 한 routing key의 write는 해당 logical shard primary에 집중된다. Replica가 서로 다른 read 요청은 분산해도 primary write hot spot을 없애지는 못한다.
- 완화: `index.routing_partition_size`로 한 routing 값을 일부 shard 집합에 분산할 수 있지만 인덱스 생성 시 설계해야 한다.

## 기본 DOCUMENT replication 쓰기 흐름

```text
Client
  -> 요청을 받은 coordinating node
  -> routing으로 primary shard 결정
  -> primary에서 검증과 local operation 실행
  -> active replica에 operation 전달
  -> 결과를 client에 응답
```

1. `_id` 또는 custom routing으로 target primary를 찾는다.
2. Primary가 매핑과 요청을 검증하고 translog와 Lucene indexing buffer에 반영한다.
3. Primary가 모든 active replica에 operation을 병렬 전달하고 응답을 수집한다.
4. Replication 결과와 함께 client에 응답하며 `_shards.successful`과 `_shards.failed`에 실제 shard 결과가 나타난다.

`wait_for_active_shards`는 쓰기 시작 전 필요한 active copy 수를 검사하는 availability 조건이다. 단순한 write quorum이나 성공 replica 수 보장이 아니다. 기본값 `1`은 primary만 active여도 시작할 수 있다는 뜻이다.

## GET과 Search의 읽기 경로

### ID 기반 GET

- `_id` hash로 shard group을 바로 찾는다.
- primary 또는 replica copy 하나에서 읽는다.
- 기본 GET은 real-time이므로 refresh 전 최신 문서도 반환할 수 있다.

### Search

```text
Query text
  -> coordinating node가 관련 logical shard의 한 copy씩에 scatter
  -> 각 shard가 대상 field의 search analyzer로 term 생성
  -> 각 shard가 segment별 term dictionary에서 posting list 조회
  -> posting을 합치고 query context이면 BM25로 shard top K 계산
  -> coordinating node가 shard 후보를 global reduce
  -> 최종 hit의 _source를 fetch
```

- Primary와 replica를 모두 중복 검색하지 않는다. logical shard마다 한 copy를 고른다.
- Adaptive Replica Selection은 과거 실행 시간, 노드 간 지연, search queue를 보고 copy를 고른다.
- 일반 `query_then_fetch`는 shard별 후보를 모아 전역 순위를 만든 뒤 최종 문서만 fetch한다.
- `dfs_query_then_fetch`는 전역 term 통계를 먼저 모아 점수를 보정하지만 round trip과 비용이 늘어난다.
- tail latency는 가장 느린 shard의 영향을 크게 받는다.
- Search API는 shard 일부가 실패해도 partial result를 반환할 수 있다. 정확한 전체 결과가 필요하면 `allow_partial_search_results=false`를 검토하고 `_shards.failed`를 확인한다.

## Cluster state와 quorum

Cluster state에는 문서 본문이 아니라 노드 목록, 인덱스 설정과 매핑, alias와 template, shard routing table, cluster block이 들어간다. Elected cluster manager만 authoritative state를 변경한다. 새 state를 broadcast한 뒤 voting node 과반의 확인으로 commit하고 적용 메시지를 publish한다.

Quorum은 모든 data node가 아니라 voting configuration에 포함된 cluster-manager-eligible node의 과반이다. 주된 대상은 다음 두 가지다.

1. Cluster manager 선거
2. Cluster state update commit

문서 검색이나 일반 쓰기마다 manager quorum을 받는 구조가 아니다. 데이터 복제 acknowledgment와 control-plane quorum은 서로 다른 계층이다.

Manager가 없을 때 기본 `cluster.no_cluster_manager_block=write`는 write를 막지만 마지막 local state 기반 read는 가능할 수 있다. 이 결과는 stale하거나 partition의 일부 데이터만 포함할 수 있으므로 정상 상태의 일관성으로 간주하지 않는다.

### 장애 허용 수

아래 수치는 현재 voting configuration의 voter 수를 기준으로 단순화한 값이다.

- voter 1개: 0개 장애 허용
- voter 2개: 0개 장애 허용
- voter 3개: 1개 장애 허용
- voter 4개: 1개 장애 허용
- voter 5개: 2개 장애 허용

`cluster.initial_cluster_manager_nodes`는 새 클러스터의 최초 bootstrap에만 사용한다. 기존 클러스터 재시작이나 신규 노드 join용 seed 목록이 아니다.

## Health 색상

| 상태 | 의미 | 해석 |
|---|---|---|
| Green | 모든 primary와 replica가 할당됨 | allocation 관점 정상 |
| Yellow | 모든 primary는 있지만 일부 replica가 미할당 | 서비스 가능하지만 redundancy 부족 |
| Red | 하나 이상의 primary가 미할당 | 일부 데이터가 unavailable할 수 있음 |

Green은 heap, latency, disk I/O까지 건강하다는 뜻이 아니다. Allocation 상태만 요약한다.

## 자주 틀리는 모델

1. OpenSearch index 하나가 Lucene index 하나인 것이 아니다. 각 shard가 Lucene index다.
2. Replica를 늘려도 primary shard 수와 routing partition은 늘지 않는다.
3. Cluster manager는 모든 검색과 쓰기가 통과하는 중앙 서버가 아니다.
4. Search는 primary와 replica를 모두 읽어 중복 집계하지 않는다.
5. Write 성공 직후 GET 가능과 Search 가능은 같은 보장이 아니다.
6. Manager quorum과 document replication은 서로 다른 문제다.

## 선택: 프로젝트 계보와 호환성 경계

OpenSearch와 OpenSearch Dashboards는 각각 Elasticsearch와 Kibana의 마지막 Apache 2.0 릴리스인 7.10.2를 기반으로 2021년에 시작한 포크다. 이후 독립된 roadmap으로 발전했으며 현재 Linux Foundation 산하 OpenSearch Software Foundation의 지원과 프로젝트 TSC의 기술 방향 아래 Apache 2.0으로 배포된다. 엔진 프로젝트와 AWS 관리형 상품인 Amazon OpenSearch Service는 같은 대상이 아니다.

분기의 직접 계기는 7.11의 라이선스 변경이었다. Elastic은 2024년 Elasticsearch와 Kibana 무료 부분의 source code에 AGPLv3를 ELv2, SSPL과 함께 선택할 수 있도록 추가했지만 기본 배포판은 계속 ELv2로 제공한다. 따라서 OpenSearch는 Apache 2.0, Elasticsearch는 SSPL이라고만 단순화하지 않고 source code와 배포판의 라이선스, 거버넌스, 기능, API, plugin 생태계를 각각 확인한다.

공통 조상은 영구적인 기능 동등성과 client 호환성을 보장하지 않는다. OpenSearch 2.x 이상에서는 OpenSearch client를 기본으로 사용하고, migration 때 source와 target version뿐 아니라 index 생성 version, mapping, plugin, API와 snapshot 호환성을 함께 검증한다. 제품 선택은 source와 배포판 라이선스, 관리형 서비스 조건, 지원 기능의 target version, 운영 역량, 지원 계약, migration 비용과 실제 workload의 총비용을 함께 본다.

### 비교 벤치마크를 읽는 법

제품 비교 수치는 version, 라이선스 배포판, hardware, mapping, query mix와 engine을 고정한 snapshot이다. P90 service time은 요청의 90퍼센트가 그 값 이하인 경계이고, 아래 연구는 반복 실행별 P90의 중앙값과 category별 기하평균을 사용하며 outlier도 포함했다. 따라서 처리량, 자원 비용과 안정성 전체의 승자를 뜻하지 않는다.

- OpenSearch 2.17.1과 Elasticsearch 8.15.4의 Big5 동일 가중치 비교에서는 OpenSearch가 text query에서 2.42배 느렸고 term aggregation은 3.38배, date histogram은 16.55배 빨랐으며 전체 기하평균은 1.56배 빨랐다. 실제 query 비율이 다르면 전체 결과도 달라진다.
- 10M, 768차원 ANN에서는 OpenSearch 기본 NMSLIB가 Elasticsearch Lucene보다 11퍼센트 빨랐지만 OpenSearch Lucene은 Elasticsearch Lucene보다 258.2퍼센트 느렸다. 현재 NMSLIB는 deprecated이므로 이 수치를 현재 제품과 engine의 보편적 우열로 사용하지 않는다. OpenSearch Agentic Search와 Elasticsearch Agent Builder도 product boundary와 packaging이 다르므로 feature 이름만으로 선택하지 않는다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Indexing-Internals|다음: 색인 내부와 운영 DB 동기화]]
- [[OpenSearch-Cluster-Reliability|클러스터 운영과 복구]]
- [[OpenSearch-Performance-Troubleshooting|성능 진단]]

## 출처

- [OpenSearch vs Elasticsearch 비교 - YouTube](https://www.youtube.com/watch?v=EPGVqk9TrTI), [Benchmarking OpenSearch and Elasticsearch - Trail of Bits](https://blog.trailofbits.com/2025/03/06/benchmarking-opensearch-and-elasticsearch/), [Methods and engines - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/knn-methods-engines/)
- [About OpenSearch - OpenSearch](https://opensearch.org/About/)
- [OpenSearch Software Foundation - OpenSearch](https://opensearch.org/foundation/)
- [Software licensing FAQ - Elastic](https://www.elastic.co/pricing/faq/licensing/), [Elastic Agent Builder - Elastic Documentation](https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder)
- [Language clients - OpenSearch Documentation](https://docs.opensearch.org/latest/clients/)
- [OpenSearch란 무엇인가 - WikiDocs](https://wikidocs.net/280293)
- [OpenSearch concepts - OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/concepts/)
- [Creating a cluster - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/)
- [Index settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Document APIs - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/)
- [Routing - OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/metadata-fields/routing/)
- [Get document - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/get-documents/)
- [Search shard routing - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)
- [Voting and quorum - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/voting-quorums/)
- [Cluster state API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-state/)
- [Cluster bootstrapping - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/bootstrapping/)
- [Cluster health - OpenSearch Documentation](https://docs.opensearch.org/latest/opensearch/rest-api/cluster-health/)
