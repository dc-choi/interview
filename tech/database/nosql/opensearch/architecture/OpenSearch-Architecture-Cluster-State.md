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

### OpenSearch Service에서 과다 샤딩 징후 확인

부분 검증(2026-10-10): 아래는 Amazon OpenSearch Service provisioned domain의 공식 지표와 장애 진단 자료를 대조한 절이다. 위 quorum과 cluster 설정 전체를 재검증한 날짜는 아니다.

작은 shard가 누적되면 cluster state와 shard 유지에 필요한 자원이 늘어난다. Health 색상만 보지 말고 같은 시간축에서 다음 지표를 비교한다.

| 관측 | 해석과 추가 확인 |
|---|---|
| `Shards.active` 증가 | 활성 primary와 replica의 합계다. 노드별 shard 배치와 작은 인덱스가 계속 생기는지 확인한다. |
| `Nodes` 감소나 변동 | 노드 이탈과 배포 시점을 함께 확인한다. 전용 cluster manager와 Warm 노드도 포함하므로 이 값으로 단순히 나눈 값을 data node당 shard 수로 쓰지 않는다. |
| `JVMMemoryPressure`, `CPUUtilization` 상승 | 과다 shard와 GC 부담의 후보 신호다. 요청 증가와 무거운 집계 등 다른 원인도 대조한다. |

대응은 [[OpenSearch-Shard-Sizing|샤드 사이징]]과 [[OpenSearch-Index-Lifecycle|인덱스 수명주기]]로 연결한다. Index template의 primary 수를 줄여도 이미 만들어진 인덱스의 shard 수는 변하지 않는다. 기존 시계열 인덱스는 reindex로 통합하는 경로를 검토하고, 삭제가 필요하면 보존 요구와 수동 snapshot을 먼저 확인한다. Scale-up이나 scale-out은 자원 압박을 줄일 수 있지만 작은 shard를 계속 만드는 정책도 함께 고친다.

노드당 1,000개를 모든 버전의 고정 상한으로 적용하지 않는다. 현재 엔진별 quota와 권장 shard 크기, heap 예산을 구분해 확인한다.

## 자주 틀리는 모델

1. OpenSearch index 하나가 Lucene index 하나인 것이 아니다. 각 shard가 Lucene index다.
2. Replica를 늘려도 primary shard 수와 routing partition은 늘지 않는다.
3. Cluster manager는 모든 검색과 쓰기가 통과하는 중앙 서버가 아니다.
4. Search는 primary와 replica를 모두 읽어 중복 집계하지 않는다.
5. Write 성공 직후 GET 가능과 Search 가능은 같은 보장이 아니다.
6. Manager quorum과 document replication은 서로 다른 문제다.

## 출처

- [How do I recognize and resolve cluster health issues that have too many shards? — AWS re:Post](https://www.repost.aws/knowledge-center/opensearch-too-many-shards)
- [AWS Documentation, Monitoring OpenSearch cluster metrics with Amazon CloudWatch](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html)
- [AWS Documentation, Choosing the number of shards](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html)
- [OpenSearch Documentation, Voting and quorum](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/voting-quorums/)
- [OpenSearch Documentation, Cluster state API](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-state/), [OpenSearch source, NoClusterManagerBlockService](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/cluster/coordination/NoClusterManagerBlockService.java)
- [OpenSearch Documentation, Cluster bootstrapping](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/bootstrapping/)
- [OpenSearch Documentation, Cluster health](https://docs.opensearch.org/latest/opensearch/rest-api/cluster-health/)

## 관련 문서

- [[OpenSearch-Architecture|OpenSearch 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Architecture-Topology|제품 구성, 계층 구조와 노드 역할]]
- [[OpenSearch-Architecture-Routing-Read-Write|문서 라우팅과 읽기, 쓰기 경로]]
- [[OpenSearch-Architecture-Lineage|프로젝트 계보와 호환성 경계]]
