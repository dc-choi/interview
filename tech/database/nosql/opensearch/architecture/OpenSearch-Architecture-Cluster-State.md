---
tags: [database, search, opensearch, lucene, shard, replication]
status: done
verified_at: 2026-08-19
category: "Data & Storage - NoSQL"
---

# OpenSearch Cluster state, quorum과 health

## Cluster state와 quorum

Cluster state에는 문서 본문이 아니라 노드 목록, 인덱스 설정과 매핑, alias와 template, shard routing table, cluster block이 들어간다. Elected cluster manager만 authoritative state를 변경한다. 새 state를 broadcast한 뒤 voting node 과반의 확인으로 commit하고 적용 메시지를 publish한다.

Quorum은 모든 data node가 아니라 voting configuration에 포함된 cluster-manager-eligible node의 과반이다. 주된 대상은 다음 두 가지다.

1. Cluster manager 선거
2. Cluster state update commit

문서 검색이나 일반 쓰기마다 manager quorum을 받는 구조가 아니다. 데이터 복제 acknowledgment와 control-plane quorum은 서로 다른 계층이다.

Manager가 없을 때 기본값은 `cluster.no_cluster_manager_block=metadata_write`다. 이 상태에서는 mapping이나 routing table 같은 metadata 변경만 차단되고 일반 문서 색인과 read는 마지막 local cluster state 기준으로 계속 처리된다. 문서 쓰기까지 막으려면 `write`를, 읽기까지 막으려면 `all`을 명시한다. 어느 경우든 결과는 stale하거나 partition의 일부 데이터만 포함할 수 있으므로 정상 상태의 일관성으로 간주하지 않는다.

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

## 출처

- [OpenSearch Documentation, Voting and quorum](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/voting-quorums/)
- [OpenSearch Documentation, Cluster state API](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-state/), [OpenSearch source, NoClusterManagerBlockService](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/cluster/coordination/NoClusterManagerBlockService.java)
- [OpenSearch Documentation, Cluster bootstrapping](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/bootstrapping/)
- [OpenSearch Documentation, Cluster health](https://docs.opensearch.org/latest/opensearch/rest-api/cluster-health/)

## 관련 문서

- [[OpenSearch-Architecture|OpenSearch 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Architecture-Topology|제품 구성, 계층 구조와 노드 역할]]
- [[OpenSearch-Architecture-Routing-Read-Write|문서 라우팅과 읽기, 쓰기 경로]]
- [[OpenSearch-Architecture-Lineage|프로젝트 계보와 호환성 경계]]
