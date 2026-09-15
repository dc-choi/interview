---
tags: [database, search, opensearch, lucene, shard, replication]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
---

# OpenSearch 제품 구성, 계층 구조와 노드 역할

Lucene은 애플리케이션에 임베드되는 검색 라이브러리이며 자체 분산 클러스터 기능을 제공하지 않는다. OpenSearch는 Lucene 위에 JSON API, 매핑, 샤드 배치, 복제, 장애 복구, 클러스터 조정 계층을 제공한다. 핵심 실행 경계는 인덱스 전체가 아니라 샤드다.

## 제품 구성

| 구성 요소 | 역할 |
|---|---|
| OpenSearch | JSON 문서 저장, 색인, 검색과 집계를 실행하는 분산 엔진 |
| OpenSearch Dashboards | Query 탐색, 시각화, 인덱스와 plugin 관리 UI |
| Data Prepper | [[OpenSearch-Data-Ingestion#Ingest pipeline과 Data Prepper|Source, buffer, processor와 sink를 연결하는 별도 수집 component]] |

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

모든 노드는 암묵적으로 coordinating 기능을 수행한다. 규모가 작으면 여러 역할을 겸할 수 있지만, 운영 규모에서는 전용 cluster manager를 두고 애플리케이션 트래픽을 직접 보내지 않는 편이 안전하다. `cluster_manager`는 Elasticsearch와 OpenSearch 1.x가 master라고 부르던 역할로, 2.x에서 비포용 용어 정리로 개명되고 `master` 표기는 deprecated 됐다. 제거 예고와 달리 실제 3.x에서도 `master` role과 `master_timeout`은 경고와 함께 계속 동작한다. 장애 영향도 역할마다 다르다. Data node 하나를 잃으면 replica가 있는 한 검색을 지속하면서 shard를 재배치하지만, elected cluster manager를 잃으면 새 선거가 끝날 때까지 cluster state 변경이 멈춘다. 상세 동작은 [[OpenSearch-Architecture-Cluster-State#Cluster state와 quorum|Cluster state와 quorum 절]]을 참고한다.

## 출처

- [OpenSearch란 무엇인가 — WikiDocs](https://wikidocs.net/280293)
- [OpenSearch Documentation, OpenSearch concepts](https://docs.opensearch.org/latest/getting-started/concepts/)
- [OpenSearch Documentation, Creating a cluster](https://docs.opensearch.org/latest/tuning-your-cluster/), [OpenSearch Documentation, Breaking changes](https://docs.opensearch.org/latest/breaking-changes/), [OpenSearch source, DiscoveryNodeRole](https://github.com/opensearch-project/OpenSearch/blob/3.0.0/server/src/main/java/org/opensearch/cluster/node/DiscoveryNodeRole.java)

## 관련 문서

- [[OpenSearch-Architecture|OpenSearch 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Architecture-Routing-Read-Write|문서 라우팅과 읽기, 쓰기 경로]]
- [[OpenSearch-Architecture-Cluster-State|Cluster state, quorum과 health]]
- [[OpenSearch-Architecture-Lineage|프로젝트 계보와 호환성 경계]]
