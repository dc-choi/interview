---
tags: [infrastructure, aws, opensearch, sizing, instance, storage]
status: done
verified_at: 2026-07-15
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service 인스턴스와 스토리지", "OpenSearch Instance and Storage Sizing", "OpenSearch 하드웨어 사이징"]
---

# OpenSearch Service 인스턴스와 스토리지 선정

Shard 설계가 논리 층이라면 이 문서는 그 아래 하드웨어 결정 층이다. Storage 총량 계산과 shard당 1.5 vCPU, heap = RAM 50퍼센트 규칙은 [[OpenSearch-Cluster-Reliability|shard 사이징 휴리스틱]]을 따르고, 여기서는 그 결과를 어떤 instance 계열과 storage 유형으로 받아낼지를 다룬다. 관리형 운영 전반은 [[OpenSearch-Service]] 참고.

AWS의 공통 전제는 어떤 계열이든 초기 추정 후 대표 workload로 부하 시험을 하고 조정하는 것이다. 과소한 cluster의 부족분보다 과대한 cluster의 여유분을 측정하는 편이 쉬우므로 크게 시작해 줄여가는 접근을 권한다.

## Data node 계열 선정

병목이 무엇인지가 계열을 정한다. 무거운 workload의 초기 기준으로 AWS는 storage 100GiB당 2 vCPU와 8GiB memory를 제시한다. 이는 m 계열의 vCPU 대 RAM 비율(1:4)과 같다.

| 계열 | vCPU:RAM | 맞는 병목 | 대표 신호 |
|---|---|---|---|
| c (compute) | 1:2 | 색인 heavy, ingest pipeline, 한국어 분석기 CPU | `CPUUtilization` 지속 고점, write queue 적체, JVM pressure는 낮음 |
| m (general) | 1:4 | 색인과 검색이 섞인 균형 workload | 뚜렷한 단일 병목 없음, 시작점으로 적합 |
| r (memory) | 1:8 | 집계, fielddata, 큰 query cache, k-NN graph | `JVMMemoryPressure` 고점, old GC 빈발, CPU는 여유 |
| im4gn, i3, i4i | NVMe 로컬 | disk latency가 SLO를 직접 깨는 대용량 고IOPS | EBS latency와 throttle이 병목인데 IOPS 증설로도 부족 |
| or1 | S3 backed | 색인 heavy 로그처럼 durability를 S3에 위임 가능한 쓰기 중심 | OpenSearch 2.11+ domain, remote-backed storage 전제 |

한국어 콘텐츠 검색 서비스라면 출발점은 보통 r 계열이다. 상품이나 게시물 검색은 filter와 aggregation 조합이 많아 memory-bound로 가는 경향이 있고, [[OpenSearch-Korean-Text-Analysis|한국어 분석]]의 형태소 분석 비용은 색인 시점 CPU라서 색인 트래픽이 클 때만 c 계열이 후보가 된다.

### Graviton을 기본값으로

같은 세대에서 Graviton(m6g, c6g, r6g, r7g 등)이 x86 대비 price-performance가 낫다는 것이 AWS의 공식 입장이다. Graviton2 기준 x86 동세대(M5, C5, R5) 대비 색인 throughput 최대 38퍼센트 향상, 색인 latency 최대 50퍼센트 감소, query 성능 최대 40퍼센트 향상을 벤치마크로 제시하고, price-performance는 이전 세대 instance 대비 최대 44퍼센트 개선으로 별도 제시한다(x86 동세대 대비 수치가 아님에 유의). plugin 호환성 제약이 없는 관리형에서는 Graviton을 기본으로 두고 x86을 선택할 이유가 있는지를 거꾸로 검증하는 편이 낫다. 단 Graviton3(c7g, m7g, r7g)은 gp3 storage만 지원한다.

## Instance store와 EBS gp3

| 기준 | im4gn 등 instance store | EBS gp3 |
|---|---|---|
| Latency | NVMe 로컬, 네트워크 hop 없음 | 네트워크 attach, throttle 가능 |
| 용량 조정 | 불가, instance 크기에 고정 | 볼륨 크기와 IOPS, throughput 독립 조정 |
| 노드 교체 시 | 로컬 데이터 소실, replica에서 shard 전체를 네트워크 재복제 | storage가 compute와 분리된 수명 |
| 강제 조건 | replica 없이는 노드 하나 장애가 곧 데이터 손실 | 볼륨 자체도 장애 도메인이므로 replica는 여전히 필요 |

Instance store 계열(im4gn, i3, i4i, r6gd, r7gd)은 EBS를 아예 붙일 수 없다. 그래서 데이터가 커질수록 노드 교체와 blue-green 배포 때 재복제할 양이 커지고 recovery 시간이 storage 유형의 함수가 된다. 기본값은 EBS gp3로 두고, IOPS와 throughput 증설로도 latency SLO를 못 맞출 때 instance store를 검토하는 순서가 안전하다.

## gp3 baseline과 추가 프로비저닝 판단

OpenSearch Service의 gp3는 EC2의 gp3와 baseline 규칙이 다르다.

- IOPS baseline: 볼륨 1,024GiB까지 3,000 IOPS, 그 이상은 GiB당 3 IOPS가 가격에 포함
- Throughput baseline: 170GiB까지 125MiB/s, 초과 시 250MiB/s, 이후 3TiB마다 250MiB/s 추가
- 추가 프로비저닝: baseline을 넘겨 별도 과금으로 증설 가능. 현재 gp3 최대 지원 한도는 80,000 IOPS와 2,000MB/s이며 instance 유형에 따라 실효 한도는 더 낮다
- gp2와 달리 burst credit이 없어 성능이 일정하고, 동일 용량에서 storage 단가도 더 낮다

늘릴지 말지는 다음 CloudWatch 지표로 판단한다.

| 지표 | 의미 | 판단 |
|---|---|---|
| `IopsThrottle` | EBS 볼륨 또는 EC2 instance IOPS 한도 초과 | 1이 반복되면 IOPS 증설 또는 instance 상향 |
| `ThroughputThrottle` | micro-bursting 합산이 프로비저닝 throughput 초과 | 대량 bulk, merge, recovery 구간과 겹치는지 확인 |
| `DiskQueueDepth` | 대기 중 I/O 요청 수 | 지속 상승이면 디스크가 소화 못 하는 상태 |
| `ReadLatency`, `WriteLatency` | EBS I/O latency | search와 write latency 상승과 상관관계 확인 |

Throttle 지표 없이 latency만 보고 IOPS를 늘리면 원인이 heap나 shard skew일 때 돈만 쓴다. 반대로 IOPS를 아무리 늘려도 instance의 EBS 대역폭 상한을 넘을 수 없으므로 throttle의 주체가 볼륨인지 instance인지 먼저 구분한다.

## Master와 coordinating 노드 사이징

전용 cluster manager는 3개 고정이 기본이다. 1개는 서비스가 거부하고, 2개는 하나만 죽어도 quorum(2)을 잃으며, 4개는 3개와 동일한 내성인데 3AZ 배치에서 오히려 문제를 만들고, 5개는 대기 4대 비용 대비 과잉이다. 크기는 트래픽이 아니라 관리할 노드 수와 shard 수로 정한다. OpenSearch 2.17 이상 기준 AWS의 최소 권장:

| Master RAM | 최대 data node | 최대 shard |
|---:|---:|---:|
| 8GB | 30 | 15K |
| 16GB | 60 | 30K |
| 32GB | 120 | 60K |
| 64GB | 240 | 120K |

전용 coordinator 노드(2024-10부터 지원)는 scatter-gather 조율과 aggregation reduce를 data node에서 분리한다. AWS 시작 기준은 data node 수의 10퍼센트, 최소 2개, data node와 같은 instance 계열에 비슷한 크기다. 큰 노드 1개보다 작은 노드 여러 개가 가용성에 유리하다. 큰 terms aggregation이나 깊은 pagination의 응답 병합이 data node의 heap을 흔들 때 효과가 있고, shard 자체의 검색 비용은 줄이지 않는다.

## k-NN 노드의 특수성

faiss 같은 native engine의 HNSW graph는 JVM heap이 아니라 off-heap native memory에 올라간다. 그래서 heap = RAM 50퍼센트 경험칙이 유일한 memory 소비자라는 전제가 깨진다. heap 밖 절반을 OS page cache와 k-NN graph가 나눠 써야 하고, graph가 크면 page cache가 밀려 일반 검색까지 같이 느려진다.

관리형에서 사용 가능한 graph memory는 다음과 같이 계산한다.

```text
graph 가용 memory = RAM × 0.5 (heap 제외) × knn.memory.circuit_breaker.limit (기본 50%)
예: RAM 32GiB 노드 = 32 × 0.5 × 0.5 = 8GiB
```

open source 문서의 정의도 같다. RAM 100GB에 heap 32GB면 남은 68GB의 50퍼센트인 34GB가 한도다. 한도를 넘으면 LRU로 native index를 내리고, 사용률이 `knn.circuit_breaker.unset.percentage`(기본 75) 아래로 내려가야 `knn.circuit_breaker.triggered`가 풀린다.

필요량은 HNSW 추정식으로 먼저 계산한다.

```text
HNSW memory ~= 1.1 × (4 × dimension + 8 × m) bytes/vector
예: 1M vectors, dimension 256, m 16 -> 약 1.267GB
```

replica는 vector 수를 배로 늘린다는 점, 추정식에 맞춰 dimension 축소나 quantization을 먼저 검토할 수 있다는 점까지 넣어 노드 RAM을 역산한다. 그래서 k-NN data node는 r 계열이 사실상 기본이다. 관리형에서는 `knn.memory.circuit_breaker.enabled`와 `knn.circuit_breaker.triggered`를 제외한 k-NN 설정을 바꿀 수 있고, `KNNGraphMemoryUsage` metric을 한도와 비교해 감시한다. engine별 동작 차이는 [[OpenSearch-Vector-Search]] 참고. 참고로 lucene engine의 vector index는 native cache가 아니라 일반 segment처럼 page cache에 의존한다.

## 자주 틀리는 오개념

- heap을 키울수록 좋다는 오해. k-NN과 page cache는 heap 밖 memory를 쓰므로 heap이 크면 오히려 손해일 수 있다. 관리형은 heap 비율을 직접 못 바꾸므로(50퍼센트, 상한 32GiB, r7g와 OR 계열 예외도 자동 적용은 아님) 조정 수단은 instance RAM 크기 자체다.
- gp3 IOPS 증설이 만능이라는 오해. `IopsThrottle`은 볼륨 한도뿐 아니라 EC2 instance 한도 초과로도 발생하므로 볼륨만 키우면 해결 안 될 수 있다.
- instance store가 항상 정답이라는 오해. latency는 얻지만 용량 탄력성과 노드 교체 시 재복제 비용을 지불한다. 대부분의 검색 서비스는 gp3 튜닝으로 충분하다.
- coordinator를 늘리면 검색이 빨라진다는 오해. reduce 단계 부담만 옮겨질 뿐 shard 수준 병목(느린 query, skew)은 그대로다.
- 계열 선정을 벤치마크 없이 확정하는 것. AWS 스스로 초기 추정은 시작점일 뿐이며 대표 workload 시험 후 조정하라고 명시한다.

## 인스턴스 결정 순서 체크리스트

1. Storage 총량과 shard 수, 크기를 [[OpenSearch-Cluster-Reliability|사이징 휴리스틱]]으로 먼저 고정한다
2. 요청에 관여하는 shard당 1.5 vCPU 기준으로 필요한 vCPU 총량을 잡는다
3. 병목 예상(집계 중심이면 r, 색인 중심이면 c, 불명확하면 m)으로 계열을 고르고 Graviton을 기본값으로 둔다
4. 무거운 workload면 storage 100GiB당 2 vCPU, 8GiB RAM 기준과 교차 검증한다
5. Storage는 EBS gp3로 시작하고 baseline으로 부족한지 throttle 지표로 확인한 뒤에만 IOPS와 throughput을 증설한다
6. latency SLO가 gp3 한계 밖이면 instance store 계열과 재복제 비용을 저울질한다
7. 전용 master 3개를 노드와 shard 수 기준으로, coordinator는 data node의 10퍼센트에 최소 2개로 잡는다
8. k-NN이 있으면 HNSW 추정식으로 graph memory를 역산해 r 계열 RAM을 별도로 정한다
9. Multi-AZ with Standby 기준 3의 배수 data node와 zone 장애, blue-green 여유까지 얹는다
10. 대표 데이터와 트래픽으로 부하 시험 후 `CPUUtilization`, `JVMMemoryPressure`, throttle 지표를 보고 줄이거나 늘린다

## 관련 문서

- [[OpenSearch-Service|Amazon OpenSearch Service 관리형 운영]]
- [[OpenSearch-Cluster-Reliability|Shard 사이징과 복구 원리]]
- [[OpenSearch-Vector-Search|벡터 검색과 하이브리드 검색]]
- [[OpenSearch-Performance-Troubleshooting|성능과 장애 진단]]

## 출처

- [Sizing Amazon OpenSearch Service domains - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html)
- [Choosing instance types and testing - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-instances.html)
- [Supported instance types - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)
- [OpenSearch Service quotas, EBS gp3와 Java process 한도 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
- [Dedicated master nodes - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-dedicatedmasternodes.html)
- [Dedicated coordinator nodes - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/Dedicated-coordinator-nodes.html)
- [k-NN search in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/knn.html)
- [CloudWatch metrics for OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html)
- [Lower your storage cost with gp3 EBS volumes - AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/lower-your-amazon-opensearch-service-storage-cost-with-gp3-amazon-ebs-volumes/)
- [Improved performance with AWS Graviton2 instances - AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/improved-performance-with-aws-graviton2-instances-on-amazon-opensearch-service/)
- [Increase performance by upgrading to Graviton2 - AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/increase-amazon-elasticsearch-service-performance-by-upgrading-to-graviton2/)
- [Vector search settings - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/settings/)
- [Methods and engines, memory estimation - OpenSearch Documentation](https://docs.opensearch.org/latest/field-types/supported-field-types/knn-methods-engines/)
