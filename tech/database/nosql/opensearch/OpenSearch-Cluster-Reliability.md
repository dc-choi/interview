---
tags: [database, search, opensearch, reliability, shard, snapshot]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Cluster Operations", "OpenSearch Reliability", "OpenSearch 클러스터 운영"]
---

# OpenSearch 클러스터 운영과 복구

좋은 클러스터는 정상 상태의 최대 처리량보다 노드와 zone 장애, shard 이동, reindex, snapshot restore 중에도 SLO를 지키도록 설계한다.

## 샤드 수를 정하는 입력

공식 문서의 shard당 10에서 50GB는 시작점일 뿐 고정 공식이 아니다. 다음 값을 함께 benchmark한다.

- 예상 primary 데이터 크기와 보존 기간
- 일일 색인량과 peak bulk concurrency
- 검색과 집계가 hit하는 shard 수
- 하나의 shard를 복구하는 데 허용되는 시간
- 노드와 zone 장애 시 남는 CPU, disk, network
- Rollover와 reindex 동안 원본과 대상이 공존할 여유 공간

`cluster.max_shards_per_node` 기본 제한은 안전한 목표가 아니라 폭주 방지 상한이다. 값을 늘려 과다 샤딩을 숨기지 않는다.

### Amazon OpenSearch Service sizing 휴리스틱

아래 값은 provisioned domain의 초기 추정치다. Serverless나 self-managed cluster의 보장 공식으로 사용하지 않고 대표 데이터와 query fan-out, 동시성, 복구 시간으로 검증한다.

| 입력 | AWS의 초기 기준 | 적용할 때 주의할 점 |
|---|---|---|
| Primary shard 크기 | 검색 지연 중심 10에서 30GiB, 로그와 쓰기 중심 30에서 50GiB | 50GiB는 일반 권장 상한이지 안전을 보장하는 제한이 아님 |
| Node당 shard와 heap | Heap 1GiB당 전체 shard 25개 이하 | `20 shards/GiB`는 현재 AWS 공식 수치가 아니며 service quota와도 다름 |
| Shard와 CPU | 요청에 관여하는 shard당 1.5 vCPU에서 시작 | Query fan-out과 동시 요청이 겹치므로 부하 시험 필수 |
| JVM heap | Instance RAM의 50퍼센트, 일반 상한 32GiB | r7g와 optimized instance 예외, Auto-Tune 변경 가능 |
| Replica | 일반 domain은 최소 1개 권장, Multi-AZ with Standby는 최소 2개 | 읽기 처리량과 장애 내성 대신 모든 쓰기의 복제 비용 증가 |

Hot storage는 원본 크기에 replica와 실제 indexing overhead, Linux 예약 공간과 서비스 예약 공간을 모두 반영한다.

```text
최소 Hot storage
= source × (1 + replicas) × (1 + measured indexing overhead) ÷ 0.95 ÷ 0.80
```

AWS의 단순 worst-case 식은 `source × (1 + replicas) × 1.45`다. 서비스 예약은 노드별 20퍼센트, 최대 20GiB이므로 실제 domain에서는 노드별 계산이 더 정확하다. Indexing overhead를 항상 10퍼센트로 고정하지 말고 sample을 색인한 뒤 `_cat/indices`의 `pri.store.size`로 측정한다. 이 식은 UltraWarm과 cold storage에 적용하지 않는다.

### Scale-up과 Scale-out

- 데이터와 shard가 한 node 범위에 있고 개별 node의 CPU와 heap이 병목이면 scale-up이 단순할 수 있다.
- 저장 용량, shard 병렬성, query 동시성이나 장애 내성이 node 한 대의 범위를 넘으면 scale-out을 검토한다.
- Scale-out은 shard가 새 node로 이동하고 실제 작업이 병렬화될 때만 효과가 있다. 과다 shard 상태에서는 coordination, heap과 network 비용이 커질 수 있다.
- Primary 수를 data node 수의 배수로 맞추는 것은 shard 크기보다 후순위다. Replica와 다른 index까지 포함한 전체 배치를 `_cat/shards`로 확인한다.
- 정상 상태뿐 아니라 node나 zone 하나를 잃고 recovery가 진행되는 동안의 p99, 429, CPU와 disk를 측정한다.

### 과다 샤딩

- 작은 shard가 수천 개 생김
- Cluster state와 heap metadata 증가
- 검색 fan-out과 coordinator reduce 증가
- 파일 핸들, segment, cache가 분산됨
- 재시작과 allocation이 느려짐

### 과소 샤딩

- 하나의 shard와 노드가 hot spot이 됨
- 색인과 검색 병렬성이 제한됨
- shard 하나의 장애 복구 단위가 너무 커짐
- 노드를 추가해도 hot shard가 쪼개지지 않음

Primary shard 수는 정적 설계에 가깝고 replica 수는 동적으로 조절할 수 있다. 잘못된 primary 구조는 split, shrink, reindex 중 조건에 맞는 방식을 선택한다.

## Manager quorum과 failure domain

운영의 일반적인 출발점은 서로 다른 failure domain에 둔 cluster-manager-eligible node 3개다.

- 3개 중 2개가 살아야 과반이 유지된다.
- 동시에 voting configuration의 절반 이상을 중단하지 않는다.
- Rolling restart는 한 대씩, 재합류와 state 안정화를 확인한 뒤 다음으로 간다.
- 전용 manager에 일반 검색과 bulk 트래픽을 보내지 않는다.
- `cluster.initial_cluster_manager_nodes`는 최초 bootstrap 이후 재사용하지 않는다.

## Replica와 allocation awareness

- Primary와 같은 replica는 동일 노드에 배치되지 않는다.
- Zone이나 rack을 node attribute로 정의하고 allocation awareness를 설정한다.
- 일반 awareness는 장애 후 남은 zone에 copy를 몰아 재배치할 수 있으므로 장애 여유 용량이 필요하다.
- Forced awareness는 한 zone에 copy가 몰리는 것을 막는 대신 yellow 상태를 받아들일 수 있다.
- 한 물리 호스트에 여러 node가 있으면 `cluster.routing.allocation.same_shard.host=true`를 검토한다.

Replica는 노드 장애와 읽기 분산을 위한 수단이다. 잘못된 delete와 논리 손상도 복제하므로 backup이 아니다.

## Disk watermark

기본적인 사용률 기준은 low 85%, high 90%, flood stage 95%다. 운영 버전의 실제 값을 반드시 확인한다.

- Low: 해당 노드에 새 shard 할당을 피한다.
- High: shard를 다른 노드로 이동하려 한다.
- Flood stage: 관련 인덱스에 `read_only_allow_delete` block을 건다.

Low watermark는 새 index의 primary allocation에는 적용되지 않는 예외가 있다. Watermark를 꺼서 증상을 숨기지 않는다. 오래된 인덱스 삭제, rollover, 용량 증설, shard 재배치로 원인을 제거하고 block 해제를 확인한다.

## Unassigned shard 진단

```http
GET /_cluster/health?level=shards
GET /_cat/shards?v
GET /_cluster/allocation/explain
```

Allocation Explain의 decider를 보고 판단한다.

- `same_shard`: primary와 replica의 동일 노드 배치 방지
- `disk_threshold`: watermark와 여유 공간 부족
- `awareness`: zone과 rack 제약
- `filter`: include, exclude, require 조건
- `shards_limit`: node나 index shard 상한
- `throttling`: recovery concurrency 제한
- `node_version`: 호환되지 않는 버전

복구 concurrency를 한꺼번에 높이면 recovery는 빨라져도 검색과 색인 disk I/O가 고갈될 수 있다. 장애 훈련과 실제 지표로 조정한다.

## Snapshot과 Restore

Snapshot은 index와 cluster state를 외부 repository에 저장하는 복구 수단이다.

- Segment를 공유하는 incremental 구조다.
- Cluster 전체의 완벽한 한 시점 복사본은 아니다. shard별 시작 시점이 다를 수 있다.
- 일관된 최종 이관은 write를 멈추고 마지막 snapshot을 수행한다.
- Snapshot 파일을 저장소에서 직접 지우지 않고 OpenSearch API로 삭제한다.
- Replica와 snapshot을 모두 둔다.
- Repository verify와 실제 restore 훈련을 정기적으로 실행한다.
- `PARTIAL`을 성공으로 간주하지 않고 failed shard를 확인한다.
- 일반 데이터 복구에서 `include_global_state`와 security index 복원을 명시적으로 판단한다.

Restore를 해보지 않은 backup은 복구 가능성이 검증되지 않은 데이터다. RPO와 RTO를 측정하는 훈련이 필요하다.

## Self-managed rolling upgrade

아래 node별 절차는 self-managed OpenSearch에 적용한다. Amazon OpenSearch Service domain에서는 node에 직접 접근하지 않고 [[OpenSearch-Service|AWS의 service software와 engine upgrade 절차]]를 따른다.

1. Breaking change와 plugin 호환성을 staging에서 확인한다.
2. 설정 파일을 백업하고 외부 snapshot을 만든다.
3. Cluster가 green이고 unassigned shard가 없는지 확인한다.
4. 각 node 작업 전에 allocation을 `primaries`로 제한하고 `POST /_flush`를 실행한다.
5. Data node를 한 대씩 업그레이드하며 data volume을 보존한다.
6. Node 재합류 후 allocation을 `all`로 복구하고 green 상태를 기다린다.
7. Ingest와 coordinating node를 같은 절차로 업그레이드한다.
8. Cluster manager node를 마지막에 업그레이드한다.
9. 각 단계에서 node 재합류, shard 안정화, query smoke test를 확인한다.

Rolling upgrade는 인접 major version만 지원한다. 3.x로 갈 때는 source cluster가 최소 2.19.0이어야 하며 목표 버전별 공식 matrix를 다시 확인한다. Downgrade는 binary 교체가 아니라 새 설치와 snapshot restore라는 전제로 계획한다. Plugin은 OpenSearch와 major, minor, patch 호환성을 확인한다.

## Cross-Cluster Replication

지역 단위 DR이 필요하면 CCR을 검토한다.

- Follower가 leader를 pull하는 active-passive 구조다.
- Follower index는 replication 중 read-only다.
- Reporting과 검색 traffic을 follower로 보내 leader의 query 경쟁을 줄일 수 있지만 active-active write 분리는 아니며 replication lag와 별도 hot storage 비용이 생긴다.
- 새 index를 자동 복제하려면 auto-follow rule이 필요하다.
- Replication lag를 RPO 지표로 둔다.
- Failover 때 이전 leader fencing과 client 전환 순서를 runbook에 둔다.
- Follower 승격은 lag 확인과 이전 leader fencing 뒤 Stop Replication API를 호출해 일반 index로 전환한다.
- 논리 오류도 복제할 수 있으므로 snapshot을 병행한다.

## 장애별 첫 대응

| 증상 | 우선 확인 | 첫 대응 원칙 |
|---|---|---|
| Yellow | replica unassigned 이유 | node 수, awareness, filter 확인 |
| Red | unassigned primary와 snapshot | 불완전 검색을 경계하고 원인부터 제거 |
| Read-only index | flood stage와 disk | 용량 확보 후 block 상태 확인 |
| No cluster manager | voting node와 network | 과반 복구, 새 cluster bootstrap 금지 |
| 긴 recovery | disk, network, throttle | SLO를 보며 concurrency 조절 |
| Snapshot 실패 | repository 권한과 shard 상태 | 원인 해결 후 성공 snapshot 검증 |

## 관련 문서

- [[OpenSearch-Architecture|Quorum과 shard 구조]]
- [[OpenSearch-Index-Lifecycle|Rollover와 ISM]]
- [[OpenSearch-Performance-Troubleshooting|운영 지표와 진단]]
- [[OpenSearch-Service|Amazon OpenSearch Service 운영]]

## 출처

- [Creating a cluster - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/index/)
- [Voting and quorum - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/voting-quorums/)
- [Cluster settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/cluster-settings/)
- [Cluster allocation explain - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-allocation/)
- [Take and restore snapshots - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/snapshots/snapshot-restore/)
- [Rolling upgrade - OpenSearch Documentation](https://docs.opensearch.org/latest/migrate-or-upgrade/rolling-upgrade/)
- [Cross-cluster replication - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/replication-plugin/index/)
- [Cross-cluster replication API - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/replication-plugin/api/)
- [OpenSearch Service shard 수 선택 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html)
- [OpenSearch Service storage 계산 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-storage.html)
- [OpenSearch Service 운영 모범 사례 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp.html)
- [OpenSearch Service quota - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
