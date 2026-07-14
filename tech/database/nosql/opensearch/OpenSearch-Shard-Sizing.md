---
tags: [database, search, opensearch, shard, sizing, capacity-planning]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Shard Sizing", "OpenSearch 샤드 사이징", "샤드 설계"]
---

# OpenSearch 샤드 사이징

Primary shard 수는 index 생성 후 바꿀 수 없으므로 첫 문서를 색인하기 전에 결정해야 하는 정적 설계다. 목표는 shard를 모든 data node에 고르게 분산하되, 복구 가능한 크기와 hardware가 감당하는 개수 사이에서 균형을 잡는 것이다.

Amazon OpenSearch Service의 index 기본값은 primary 5개에 replica 1세트로 총 10개 shard다. Primary 1개 replica 1세트인 오픈소스 기본값과 다르므로, 어느 쪽이든 기본값에 기대지 말고 index template에 명시한다.

## 쓰기와 검색의 fan-out 비대칭

- Indexing 요청은 primary에 쓴 뒤 모든 replica에도 복제된다. Primary 5개에 replica 1세트면 쓰기 하나가 shard copy 10개를 거친다.
- 검색 요청은 shard당 primary 또는 replica 중 한 copy만 조회한다. 같은 index에서 검색 하나는 shard 5개를 읽는다.
- Replica 추가는 읽기 용량과 장애 내성을 늘리는 대신 모든 쓰기의 복제 비용을 같이 늘린다.

## 샤드 수를 정하는 입력

공식 문서의 shard당 10에서 50GB는 시작점일 뿐 고정 공식이 아니다. 다음 값을 함께 benchmark한다.

- 예상 primary 데이터 크기와 보존 기간
- 일일 색인량과 peak bulk concurrency
- 검색과 집계가 hit하는 shard 수
- 하나의 shard를 복구하는 데 허용되는 시간
- 노드와 zone 장애 시 남는 CPU, disk, network
- Rollover와 reindex 동안 원본과 대상이 공존할 여유 공간

`cluster.max_shards_per_node` 기본 제한은 안전한 목표가 아니라 폭주 방지 상한이다. 값을 늘려 과다 샤딩을 숨기지 않는다.

## 초기 primary 수 계산

색인 후 디스크 크기는 원본 대비 1:1.1 정도가 흔하지만 mapping과 분석 설정에 따라 1:10에서 10:1까지 벌어진다. Sample을 색인해 `_cat/indices`로 실측한 비율로 예측 index 크기를 만든 뒤 목표 shard 크기로 나눈다.

```text
primary 수 ≈ (원본 데이터 + 성장분) × (1 + indexing overhead) ÷ 목표 shard 크기
```

성장분을 얼마나 미리 반영할지가 실제 판단이다. 66GiB 데이터에 목표 30GiB면 3개지만, 1년 내 4배 성장을 그대로 반영하면 10개가 되어 현재 shard가 7GiB대로 과소해진다. 이때는 중간값을 고르거나(6개면 현재 12GiB에서 미래 48GiB), 3개로 시작해 상한을 넘을 때 reindex로 재분할하는 전략 중 복구 시간과 운영 여력으로 선택한다.

## Amazon OpenSearch Service sizing 휴리스틱

아래 값은 provisioned domain의 초기 추정치다. Serverless나 self-managed cluster의 보장 공식으로 사용하지 않고 대표 데이터와 query fan-out, 동시성, 복구 시간으로 검증한다.

| 입력 | AWS의 초기 기준 | 적용할 때 주의할 점 |
|---|---|---|
| Primary shard 크기 | 검색 지연 중심 10에서 30GiB, 로그와 쓰기 중심 30에서 50GiB | 50GiB는 일반 권장 상한이지 안전을 보장하는 제한이 아님 |
| Node당 shard와 heap | Heap 1GiB당 전체 shard 25개 이하 | `20 shards/GiB`는 현재 AWS 공식 수치가 아니며 service quota와도 다름 |
| Shard와 CPU | 요청에 관여하는 shard당 1.5 vCPU에서 시작 | Query fan-out과 동시 요청이 겹치므로 부하 시험 필수 |
| JVM heap | Instance RAM의 50퍼센트, 일반 상한 32GiB | r7g와 optimized instance 예외, Auto-Tune 변경 가능 |
| Replica | 일반 domain은 최소 1개 권장, Multi-AZ with Standby는 최소 2개 | 읽기 처리량과 장애 내성 대신 모든 쓰기의 복제 비용 증가 |

Node당 shard 수의 hard limit은 버전에 따라 다르다. Elasticsearch 7.x와 OpenSearch 2.15까지는 node당 1,000개이고, OpenSearch Service의 2.17 이상은 JVM heap 16GiB당 1,000개로 node당 최대 4,000개까지다. 상한 근처에서 도는 cluster는 이미 과다 샤딩 상태다.

## Hot storage 최소 계산

Hot storage는 원본 크기에 replica와 실제 indexing overhead, Linux 예약 공간과 서비스 예약 공간을 모두 반영한다.

```text
최소 Hot storage
= source × (1 + replicas) × (1 + measured indexing overhead) ÷ 0.95 ÷ 0.80
```

AWS의 단순 worst-case 식은 `source × (1 + replicas) × 1.45`다. 서비스 예약은 노드별 20퍼센트, 최대 20GiB이므로 실제 domain에서는 노드별 계산이 더 정확하다. Indexing overhead를 항상 10퍼센트로 고정하지 말고 sample을 색인한 뒤 `_cat/indices`의 `pri.store.size`로 측정한다. 이 식은 UltraWarm과 cold storage에 적용하지 않는다.

## Scale-up과 Scale-out

- 데이터와 shard가 한 node 범위에 있고 개별 node의 CPU와 heap이 병목이면 scale-up이 단순할 수 있다.
- 저장 용량, shard 병렬성, query 동시성이나 장애 내성이 node 한 대의 범위를 넘으면 scale-out을 검토한다.
- Scale-out은 shard가 새 node로 이동하고 실제 작업이 병렬화될 때만 효과가 있다. 과다 shard 상태에서는 coordination, heap과 network 비용이 커질 수 있다.
- Primary 수를 data node 수의 배수로 맞추면 node 간 배치가 고르게 되지만, 이는 shard 크기보다 후순위다. 5GiB 데이터면 여전히 shard 1개가 맞다.
- Replica와 다른 index까지 포함한 전체 배치를 `_cat/shards`로 확인한다.
- 정상 상태뿐 아니라 node나 zone 하나를 잃고 recovery가 진행되는 동안의 p99, 429, CPU와 disk를 측정한다.

## 과다 샤딩과 과소 샤딩

과다 샤딩의 증상:

- 작은 shard가 수천 개 생김
- Cluster state와 heap metadata 증가
- 검색 fan-out과 coordinator reduce 증가
- 파일 핸들, segment, cache가 분산됨
- 재시작과 allocation이 느려짐

과소 샤딩의 증상:

- 하나의 shard와 노드가 hot spot이 됨
- 색인과 검색 병렬성이 제한됨
- shard 하나의 장애 복구 단위가 너무 커짐
- 노드를 추가해도 hot shard가 쪼개지지 않음

Primary shard 수는 정적 설계에 가깝고 replica 수는 동적으로 조절할 수 있다. 잘못된 primary 구조는 split, shrink, reindex 중 조건에 맞는 방식을 선택한다. 작은 시계열 index가 누적된 과다 샤딩은 [[OpenSearch-Index-Lifecycle#Reindex로 시간 기반 인덱스 통합|reindex로 월별이나 분기별 통합]]이 복구 경로다.

## Storage skew

한두 node가 특정 index의 shard를 더 많이 들고 있으면 node 간 CPU 사용률 차이, 간헐적이고 node별로 다른 latency, 특정 node의 queue 적체로 나타난다. 평균 지표만 보면 놓친다.

- `_cat/allocation`으로 node별 shard 수와 저장량을 보고, node 단위 skew와 index 단위 skew를 구분해 진단한다.
- 예방은 primary 수의 배수 정렬과 함께, 시간 기준으로만 자르지 않는 것이다. 시계열 index를 시간으로만 자르면 트래픽 변동이 shard 크기 편차로 쌓이므로 크기 조건이 있는 [[OpenSearch-Index-Lifecycle#Rollover|rollover]]로 자르면 균일해진다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Architecture|분산 실행과 routing]]
- [[OpenSearch-Cluster-Reliability|Allocation, snapshot과 복구]]
- [[OpenSearch-Index-Lifecycle|Rollover와 ISM]]
- [[OpenSearch-Service|Amazon OpenSearch Service 운영]]
- [[OpenSearch-Service-Instance-Storage|인스턴스와 스토리지 선정]]

## 출처

- [OpenSearch Service shard 수 선택 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html)
- [OpenSearch Service 운영 모범 사례 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp.html)
- [OpenSearch Service storage 계산 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-storage.html)
- [OpenSearch Service quota - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
