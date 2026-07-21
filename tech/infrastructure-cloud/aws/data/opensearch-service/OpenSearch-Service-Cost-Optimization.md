---
tags: [infrastructure, aws, opensearch, cost, serverless, blue-green]
status: done
verified_at: 2026-07-15
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service Cost Optimization", "OpenSearch 비용 최적화", "OpenSearch 배포 함정"]
---

# Amazon OpenSearch Service 비용 최적화와 배포 함정

과금 항목의 전체 목록과 Provisioned vs Serverless 비교는 [[OpenSearch-Service]], hot과 UltraWarm과 cold tier의 구조는 [[OpenSearch-Index-Lifecycle]]이 다룬다. 이 문서는 그 위에서 무엇부터 줄이는지의 순서, tier 이동과 Serverless의 손익 계산, 그리고 설정 변경이 blue-green 배포를 유발해 비용과 성능을 흔드는 함정을 다룬다. 금액은 별도 표기가 없으면 us-east-1 on-demand 기준이며 리전과 시점에 따라 달라진다.

## 줄이는 순서 플레이북

절감 수단을 나열만 하면 우선순위를 못 정한다. 원칙은 두 가지다. 먼저 데이터 양 자체를 줄여야 뒤의 모든 항목(노드 수, storage, RI 약정 규모)의 기준이 작아지고, 약정(RI)은 구조 변경이 끝난 뒤 마지막에 잠근다.

| 순서 | 조치 | 근거 |
|---|---|---|
| 1 | Retention 단축, 저가치 field 제거, sampling | 무료이며 이후 모든 비용의 분모를 줄인다 |
| 2 | Shard와 replica 정리 | over-sharding은 heap과 CPU 낭비. shard당 10에서 50GiB, heap 1GiB당 25 shard 이하 권고 |
| 3 | gp2에서 gp3로 전환 | GB당 약 9.6퍼센트 저렴(0.135 대 0.122 USD/GB-월)하고 baseline IOPS와 throughput이 낫다. 단 storage type 변경은 blue-green trigger |
| 4 | Graviton 최신 세대 전환 | AWS benchmark의 Graviton2 최대 44퍼센트 price/performance 개선은 previous-generation instance 대비 수치이며 동급 x86 전체에 일반화할 수 없다. Graviton3의 Graviton2 대비 최대 25퍼센트 성능 개선도 workload로 검증한다. Instance type 변경이므로 blue-green trigger |
| 5 | Right-sizing | CPU 60에서 80, JVM 65에서 85, storage 70에서 85퍼센트가 목표 구간. CPU 40퍼센트 미만 지속은 과잉 프로비저닝 신호 |
| 6 | Tier 이동 (UltraWarm, cold) | 아래 손익 계산을 통과할 때만 |
| 7 | Reserved Instances | 구조가 안정된 뒤 1년 또는 3년 약정. no upfront와 all upfront별 할인은 pricing page의 현재 조건을 다시 확인 |
| 8 | Database Savings Plans | 1년 hourly spend commitment로 eligible OpenSearch Service usage 등에 적용. 최대 35퍼센트 수치와 적용 범위는 RI와 별개로 계산 |

Extended Support도 확인한다. 지원 종료 engine version에 머무르면 Normalized Instance Hour당 추가 요금이 붙으므로 upgrade가 곧 절감이다. 로그성 workload라면 `_source` 저장을 생략하는 Derived Source(3.1+)와 index rollup도 storage 분모를 줄이는 수단이다.

## UltraWarm 이동 손익 계산

tier별 구조는 [[OpenSearch-Index-Lifecycle]]의 표를 따른다. 여기서는 이동이 이득이 되는 조건만 계산한다.

- Storage 단가는 압도적으로 유리하다. Hot은 20GiB primary shard에 replica 1개면 예약 공간 포함 약 58GiB의 EBS가 필요하지만, UltraWarm은 S3라서 primary 20GiB만 과금한다. 단가도 managed storage 0.024 대 gp3 0.122 USD/GB-월이다.
- 대신 warm node compute가 고정비다. `ultrawarm1.medium.search`는 시간당 0.238 USD이고 최소 2대가 필요하므로 데이터가 0이어도 월 약 348 USD가 나간다. medium 1대는 최대 1.5TiB, large 1대는 최대 20TiB를 주소할 수 있다.
- break-even은 이동할 데이터가 warm 고정비 이상으로 hot 비용(EBS와 그 데이터 때문에 유지하던 data node 증설분)을 빼줄 때다. 수백 GiB 수준이면 대체로 손해고, hot data node 한 대를 줄일 수 있는 TiB 단위부터 이득이 시작된다.
- Latency 대가가 있다. S3와 local cache 구조라 좁은 최근 구간 query는 준수하지만 넓은 기간의 cache miss query는 hot 같은 latency를 보장하지 않는다. 검색이 넓고 빈번하면 공식 문서도 hot 유지를 권고한다.
- Warm index는 read-only다. 문서 하나를 고치려 해도 hot으로 반환(warm to hot queue는 10개 제한)해야 하므로 수정이 남은 index는 후보가 아니다. 이동 자체도 force merge와 snapshot을 거치는 유료 I/O 작업이다.

## Serverless OCU 심화

OCU는 6GiB RAM과 상응하는 vCPU 묶음이고 시간당 0.24 USD다. 함정은 최소 floor다.

- Redundancy 기본 활성 상태에서 floor는 indexing 1 OCU(0.5 x 2)와 search 1 OCU(0.5 x 2), 합계 2 OCU다. 트래픽이 0이어도 월 약 350 USD가 나간다.
- Dev/test에서 redundancy를 끄면 indexing 0.5와 search 0.5, 합계 1 OCU(월 약 175 USD)까지 내려간다.
- floor는 계정(또는 collection group) 단위로 공유된다. 단 KMS key가 다른 collection은 자기 OCU 세트를 새로 만들고, vector search collection은 같은 key라도 search와 time series collection과 OCU를 공유하지 못한다. collection이 유형과 key별로 파편화되면 floor가 곱해진다. 다중 KMS key 구조는 collection group(2026.02+)으로 묶어 공유시킨다.
- 3유형 제약: data lifecycle policy(retention 자동 삭제)는 time series만 지원하고, time series는 custom `_id`가 없어 upsert 기반 dedup이 안 되며([[OpenSearch-Service]]의 수집 절 참조), vector는 in-memory 모드에서 RAM이 OCU 산정을 지배하므로 disk-optimized 모드(32x binary quantization, RAM 최대 97퍼센트 절감, P90 100에서 200ms)를 먼저 검토한다.
- Time series의 OCU는 retention이 직접 결정한다. 공식 예시로 일 1TiB 수집에 30일 보존이면 indexing 20과 search 20 OCU, 7일로 줄이면 각각 약 4 OCU다.
- 결론: 소규모라도 상시 켜져 있는 workload는 provisioned 소형 domain이 floor보다 싼 경우가 많다. Serverless가 이기는 조건은 간헐적이거나 변동이 큰 부하다. 어느 쪽이든 계정 max OCU cap을 걸어 폭주를 막되, cap에 닿으면 성능 저하로 나타나므로 원인(특히 vector 메모리)을 함께 본다.

## Blue-green 배포를 유발하는 설정 변경

Provisioned domain의 설정 변경은 두 부류다. Blue-green은 기존 cluster를 복제한 새 환경을 만들어 데이터를 옮긴 뒤 전환한다.

| Blue-green 유발 (대표) | 유발하지 않음 (대체로) |
|---|---|
| Instance type 변경 | Data node 수, UltraWarm node 수 변경 |
| Storage type과 volume type 변경, EBS 축소 | Access policy, custom endpoint, TLS policy |
| Dedicated master enable과 disable | 기존 dedicated master의 type과 수 변경 |
| UltraWarm과 cold storage enable과 disable | gp3의 volume과 IOPS와 throughput 증가 |
| FGAC, at-rest와 node간 암호화 enable | error log와 slow log 발행 on off |
| Engine upgrade, service software update | 자동 snapshot 시각 변경, tag |
| Auto-Tune을 rollback과 함께 disable | Auto-Tune enable 또는 rollback 없는 disable |

주의점이 셋 있다. 첫째, gp3 volume 증가도 직전 변경이 진행 중이거나 6시간 이내면 blue-green이 된다. 둘째, service software 버전에 따라 예외가 있으므로 확신하지 말고 dry run을 쓴다. `UpdateDomainConfig`에 `DryRun: true`, `DryRunMode: Verbose`를 주면 실제 적용 없이 `DeploymentType`이 `Blue/Green`인지 `DynamicUpdate`인지와 validation 실패 목록을 돌려준다. 셋째, red index, 디스크 부족, shard 과다는 validation을 실패시키고, domain이 60일 이상 방치되면 격리와 삭제까지 갈 수 있다.

과금 오해도 바로잡자. 배포 중 node 수는 실제로 두 배가 되지만 요금이 기간 내내 두 배는 아니다. instance type을 바꾸면 첫 1시간만 양쪽 cluster에 과금되고 이후 새 cluster만, type이 같으면 첫 1시간 동안 큰 쪽 하나만 과금된다. 진짜 비용은 요금이 아니라 성능이다. master가 관리할 node가 배로 늘고 shard 복사 때문에 색인과 검색 latency가 오르며 rejection이 늘 수 있다. 그래서 headroom 없는 cluster에서 peak 시간에 설정을 바꾸면 안 된다.

## Auto-Tune과 off-peak window

- Auto-Tune은 node scaling이 아니라 메모리 관련 설정 조정이다. queue size, cache size, in-flight request 한도(기본 JVM의 10퍼센트, 5에서 15퍼센트 범위 조정)는 무중단으로 즉시 적용하고, JVM heap size와 young generation 변경은 blue-green이 필요해 off-peak window로 미룬다.
- Off-peak window는 매일 10시간짜리 창이며 시작 시각만 바꿀 수 있고 기본값은 리전 로컬 22시다. 2023-02-16 이후 생성된 domain은 기본 활성이고 한번 켜면 끌 수 없다.
- Required service software update는 deadline(보통 2주) 전에 조치가 없으면 off-peak window에 자동 스케줄되고 3일 전 알림이 온다. 즉 아무것도 안 해도 blue-green이 일어날 수 있으므로, 이 window가 실제 트래픽 저점과 일치하는지와 그 시간대의 용량 headroom을 확인해 둔다.
- Node 교체처럼 즉시 배포가 필요한 update는 off-peak을 기다리지 않는다.

## 자주 틀리는 오해 교정

- Blue-green 동안 두 배로 계속 과금된다? 아니다. 이중 과금은 최대 첫 1시간이고 실제 대가는 master 부하와 latency다.
- Node 수를 늘리는 것도 blue-green이다? 아니다. data node 수 변경은 대체로 dynamic update고, type 변경이 trigger다.
- UltraWarm은 옮기면 무조건 싸다? 아니다. 최소 2대의 warm node 고정비(월 약 348 USD부터)를 storage 절감이 넘어야 한다.
- Serverless는 안 쓰면 0원이다? 아니다. collection이 존재하는 한 OCU floor(redundancy 기준 2 OCU, 월 약 350 USD)가 상시 과금된다.
- Auto-Tune이 알아서 노드를 늘려준다? 아니다. heap과 queue와 cache 같은 메모리 설정만 조정하며 용량 산정은 사용자 몫이다.

## 시나리오: 설정 하나 바꿨는데 클러스터가 왜 두 배가 됐나

비용을 아끼려고 평일 낮에 EBS를 gp2에서 gp3로 바꿨다고 하자. volume type 변경은 blue-green trigger라서 CloudWatch의 `Nodes`가 11에서 22로 뛰고, shard 복사 트래픽 때문에 검색 p99가 오르고 bulk 429가 늘었다. 놀라서 지표를 보다가 두 배 과금을 걱정했지만 청구서 영향은 첫 1시간뿐이었고, 실제 문제는 headroom 없이 peak 시간에 배포를 시작한 판단이었다. 올바른 순서는 이렇다. dry run으로 `DeploymentType`을 확인하고, blue-green이면 off-peak window나 저트래픽 시간대로 스케줄하며, red index와 디스크 여유 같은 validation 항목을 미리 정리하고, 배포 중 master 부하와 latency를 감시한다. 같은 이유로 [[OpenSearch-Service]] 체크리스트의 blue-green 여유 용량 항목은 gp3 전환이나 Graviton 전환 같은 절감 작업 자체의 전제 조건이기도 하다.

## 관련 문서

- [[OpenSearch-Service|Amazon OpenSearch Service 운영]]
- [[OpenSearch-Index-Lifecycle|Rollover, ISM과 storage tier]]
- [[OpenSearch-Cluster-Reliability|Shard와 복구 원리]]

## 출처

- [Cost optimization techniques - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cost-optimization.html)
- [Making configuration changes - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-configuration-changes.html)
- [Managing capacity limits for Serverless - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-scaling.html)
- [UltraWarm storage - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html)
- [Auto-Tune - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/auto-tune.html)
- [Off-peak windows - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/off-peak.html)
- [Amazon OpenSearch Service Pricing - AWS](https://aws.amazon.com/opensearch-service/pricing/)
- [Improved performance with AWS Graviton2 instances - AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/improved-performance-with-aws-graviton2-instances-on-amazon-opensearch-service/)
- [Database Savings Plans for OpenSearch Service and Neptune Analytics - AWS](https://aws.amazon.com/about-aws/whats-new/2026/03/dbsp-opensearch-service-neptune-analytics/)
