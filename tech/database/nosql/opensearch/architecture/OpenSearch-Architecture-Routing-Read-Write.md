---
tags: [database, search, opensearch, lucene, shard, replication]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
---

# OpenSearch 문서 라우팅과 읽기, 쓰기 경로

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

## 출처

- [OpenSearch Documentation, Index settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [OpenSearch Documentation, Document APIs](https://docs.opensearch.org/latest/api-reference/document-apis/)
- [OpenSearch Documentation, Routing](https://docs.opensearch.org/latest/mappings/metadata-fields/routing/)
- [OpenSearch Documentation, Get document](https://docs.opensearch.org/latest/api-reference/document-apis/get-documents/)
- [OpenSearch Documentation, Search shard routing](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)

## 관련 문서

- [[OpenSearch-Architecture|OpenSearch 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Architecture-Topology|제품 구성, 계층 구조와 노드 역할]]
- [[OpenSearch-Architecture-Cluster-State|Cluster state, quorum과 health]]
- [[OpenSearch-Architecture-Lineage|프로젝트 계보와 호환성 경계]]
