---
tags: [infrastructure, aws, opensearch, search, analytics, managed-service]
status: done
category: "Infrastructure - AWS"
aliases: ["Amazon OpenSearch Service", "OpenSearch Service", "Amazon OpenSearch"]
verified_at: 2026-07-21
---

# Amazon OpenSearch Service

Amazon OpenSearch Service는 OpenSearch를 AWS에서 운영하는 관리형 서비스다. 프로비저닝형 클러스터인 domain과 자동 용량 관리형인 Serverless collection을 제공한다. 역색인, shard, Query DSL 같은 엔진 내부는 [[OpenSearch|OpenSearch 학습 지도]]에서 다룬다.

## 프로젝트와 서비스를 구분하기

| 대상 | 의미 | 사용자가 결정하는 것 |
|---|---|---|
| OpenSearch | Apache 2.0 검색과 분석 엔진 | 배포 위치, plugin, 모든 cluster 설정 |
| OpenSearch Service domain | AWS가 인프라를 관리하는 프로비저닝형 cluster | engine version, instance, node 수, storage, index 설계 |
| OpenSearch Serverless collection | node와 cluster를 노출하지 않는 자동 확장형 서비스 | collection 유형, capacity limit, data와 network policy |
| OpenSearch Ingestion | Data Prepper 기반 관리형 수집 pipeline | source, processor, sink, buffer, DLQ와 OCU 범위 |

Managed domain에서는 애플리케이션 팀이 mapping, analyzer, shard와 replica, query 비용, 원본 정합성을 설계한다. Serverless는 물리 shard 수와 refresh interval을 AWS가 관리하지만 collection 유형, index 수, mapping, query, retention과 capacity limit은 애플리케이션 팀 책임이다.

Provisioned domain은 기본적으로 instance RAM의 50퍼센트를 최대 32GiB까지 JVM heap으로 사용하지만 r7g와 OpenSearch optimized instance에는 상한 예외가 있다. 사용자는 JVM option과 `opensearch.yml`을 직접 수정할 수 없고 지원 domain에서는 Auto-Tune이 heap, queue, cache 일부를 조정할 수 있다. Auto-Tune은 node와 storage autoscaling이 아니며 Serverless에는 이 node와 heap 규칙을 적용하지 않는다.

## 적합한 문제

- 상품, 게시물, 문서의 full-text search와 자동완성
- 로그, trace, metric의 탐색과 집계, Dashboard 시각화
- RDBMS와 DynamoDB가 효율적으로 처리하기 어려운 다중 filter, sort, 검색 조합
- 이벤트에서 만든 역정규화된 검색 Read Model

다음 요구에는 단독 원본 저장소로 사용하지 않는다.

- 다중 행 transaction과 foreign key가 필요한 업무 원장
- refresh 이전에도 Search API에서 즉시 보여야 하는 강한 read-after-write
- 관계형 join이 핵심인 조회
- 원본을 다시 만들 수 없는 유일한 데이터 보관소

## Provisioned domain과 Serverless

| 기준 | Provisioned domain | Serverless collection |
|---|---|---|
| 용량 | instance, node, EBS와 storage tier를 직접 선택 | indexing과 search OCU를 설정 범위에서 자동 확장 |
| 제어 | shard와 node 구조, plugin, engine version 제어가 큼 | node를 노출하지 않고 일부 API와 plugin 제한 |
| 변경 | service software와 engine upgrade를 구분해 관리 | version과 service update를 AWS가 관리 |
| 보안 | domain access policy, IAM, fine-grained access control | encryption, network, data access policy |
| 과금 | instance 시간, EBS, 선택 storage와 data transfer | ingest OCU, search OCU, S3 storage |
| 적합성 | 예측 가능한 지속 부하와 세밀한 튜닝 | 간헐적이거나 변동이 큰 부하, 운영 단순화 |

Serverless가 항상 저렴하거나 완전히 호환되는 것은 아니다. 최소 OCU, peak 동시성, 지원 API와 client, migration 방식까지 workload로 비교한다. Provisioned domain에서 collection으로 자동 이관하는 기능은 없으므로 별도 reindex 경로가 필요하다.

## 관리 책임 경계

AWS가 주로 담당하는 영역:

- instance와 기반 인프라 프로비저닝, 일부 장애 감지와 교체
- service software 배포와 관리형 endpoint
- 자동 snapshot 저장소와 CloudWatch metric 제공
- Multi-AZ 배치 기능과 Serverless capacity orchestration

애플리케이션 팀이 계속 담당하는 영역:

- Managed domain의 mapping, analyzer, index template, shard와 replica 설계
- domain instance와 storage 용량, Serverless capacity limit
- query와 aggregation 비용, bulk concurrency와 backpressure
- engine version upgrade와 breaking change, client와 plugin 호환성
- VPC, access policy, IAM, fine-grained role과 KMS key 수명주기
- ingestion 실패, 중복, 순서, DLQ, replay와 원본 정합성
- alarm, SLO, snapshot 복구 훈련과 비용 최적화

## 가용성과 용량

프로덕션 provisioned domain의 기본 출발점은 Multi-AZ with Standby다.

- 세 Availability Zone, 전용 cluster manager 3개, 3의 배수인 data node를 사용한다.
- index마다 primary를 포함해 세 copy가 되도록 replica 2개가 필요하다.
- 정상 peak뿐 아니라 zone 하나의 장애, shard recovery, blue-green 배포 중에도 버틸 여유를 둔다.
- Multi-AZ without Standby는 장애 후 남은 node로 shard를 이동하므로 복구 I/O와 성능 저하를 용량에 포함한다.
- node 평균이 아니라 shard skew, 가장 느린 node와 p99를 본다.

가용성 옵션은 잘못된 delete, mapping 오류, 과도한 query를 복구하지 않는다. Replica는 backup이 아니며 [[OpenSearch-Cluster-Reliability|snapshot과 restore 전략]]이 별도로 필요하다.

## Service software와 engine upgrade

두 변경은 서로 다른 수명주기다.

- Service software update는 AWS 운영 계층의 patch와 기능 변경이다. Blue-green 배포를 사용하며 필수 update는 실제 notification deadline을 기준으로 EventBridge와 담당자 alarm을 연결한다. 장기 미적용은 domain 격리와 최종 삭제로 이어질 수 있다.
- 2026년 4월 24일 이후 적용된 service software update는 적용 방식, 이후 설정 변경 여부와 15일 창 같은 조건을 충족하면 self-service rollback이 가능하다. 자동 강제 적용이나 engine upgrade에는 이 rollback을 적용할 수 없다.
- Engine upgrade는 OpenSearch major와 minor version 변경이다. 사용자가 시작하고 사전 검증, snapshot, 호환 가능한 upgrade path 확인이 필요하다.
- Engine version은 downgrade할 수 없다는 전제로 새 domain과 restore 또는 reindex rollback 경로를 준비한다.
- Blue-green 배포는 일시적으로 cluster manager와 data node 여유를 사용하므로 off-peak와 용량 headroom을 확보한다.
- Firehose, CloudWatch Logs, client library, optional plugin이 목표 engine version을 지원하는지 함께 검증한다.
- Serverless engine은 AWS가 upgrade하지만 client는 현재 OpenSearch 3.x와 호환돼야 하며 지원 API와 plugin subset은 애플리케이션이 검증한다.

## Snapshot과 복구

- OpenSearch와 Elasticsearch 5.3 이상 domain은 AWS 관리 저장소에 자동 snapshot을 매시간 만들고 최대 336개를 14일 보존한다.
- 자동 snapshot은 해당 domain의 cluster 복구용이다. 장기 보존과 다른 domain 이관에는 자체 S3 repository의 manual snapshot을 사용한다.
- Manual snapshot은 UltraWarm과 cold tier 데이터를 포함하지 않는다. 필요하면 snapshot 전에 hot tier로 옮기거나 원본 재생 경로를 유지한다.
- Serverless는 매시간 자동 snapshot을 만들지만 manual snapshot과 다른 collection으로의 restore를 지원하지 않는다. 같은 이름의 열린 index를 restore하면 덮어쓸 수 있고 restore 중 해당 index 요청은 실패한다.
- Red cluster가 지속되면 자동 snapshot도 실패할 수 있으므로 `AutomatedSnapshotFailure`를 감시한다.
- Manual snapshot은 완벽한 단일 시점 복사본이 아니며 shard별 포함 시점이 다를 수 있다.
- Backup 존재 여부가 아니라 실제 restore 시간과 RPO, RTO를 정기적으로 검증한다.
- 검색 index가 원본 DB나 event log에서 재생 가능하면 snapshot 실패와 schema migration에 대한 복구 선택지가 늘어난다.

## 보안 경계

- VPC domain은 endpoint의 도달 범위를 제한하지만 사용자 권한을 대신하지 않는다.
- Configuration API 권한과 domain endpoint의 data-plane 권한을 분리한다.
- Data plane에는 resource-based domain access policy와 fine-grained access control이 함께 관여할 수 있다.
- IAM principal을 access policy에 쓰면 client는 SigV4로 서명해야 한다. Internal user의 basic authentication과 혼합할 때 정책 충돌을 검증한다.
- Fine-grained access control은 HTTPS, node-to-node encryption, at-rest encryption을 요구하며 활성화 후 끌 수 없다.
- Master user를 애플리케이션 공용 계정으로 사용하지 않고 workload별 role을 분리한다.
- KMS key disable, grant 제거, 삭제는 domain 가용성과 복구 가능성에 직접 영향을 주므로 별도 alarm을 둔다.

Serverless data-plane 호출은 network policy, IAM의 `aoss:APIAccessAll`, collection과 index의 data access policy를 모두 통과해야 한다. Browser Dashboards에는 `aoss:DashboardsAccessAll`도 필요하며 SigV4 service name은 `aoss`다. 여러 network policy 중 하나라도 public access를 허용하면 VPC 제한보다 public access가 우선한다.

## 데이터 수집

주요 경로는 애플리케이션 bulk, CDC와 outbox, Data Firehose, CloudWatch Logs, OpenSearch Ingestion이다.

OpenSearch Ingestion은 source, buffer, processor, sink로 구성한다. Persistent buffer는 push source 데이터를 여러 AZ의 disk buffer에 최대 72시간 유지할 수 있고, sink 재시도 소진이나 거부 event는 S3 DLQ로 보낼 수 있다. 그래도 다음 책임은 남는다.

- Managed domain과 Serverless Search collection처럼 지원되는 sink에서는 안정적인 원본 ID를 `_id`로 사용한다. Serverless time series collection은 custom document ID와 upsert를 지원하지 않으므로 별도 중복 제거와 replay 전략이 필요하다.
- 원본 version을 이용한 순서 역전 방어
- mapping 오류와 권한 오류의 재처리 기준
- DLQ replay, 누락 탐지와 원본 대조
- sink 장애 시 source backpressure와 허용 가능한 lag

자세한 패턴은 [[OpenSearch-Indexing-Internals|검색 Read Model 동기화]]를 따른다.

## 관측과 알람

아래 표와 node API는 Provisioned domain 기준이다. Serverless는 `AWS/AOSS`의 `IndexingOCU`, `SearchOCU`, ingestion과 search 오류 및 latency, HTTP status, `StorageUsedInS3`를 감시한다.

| 영역 | 우선 신호 |
|---|---|
| 가용성 | `ClusterStatus.red`, `ClusterStatus.yellow`, node 수, manager 도달 가능성 |
| 저장소 | `FreeStorageSpace`, write block, shard 수, snapshot 실패 |
| JVM과 CPU | data와 manager의 CPU, JVM memory pressure, old generation |
| 요청 | 4xx와 5xx 비율, search와 write latency, request 수 |
| 포화 | search와 write queue, rejected, bulk 실패, shard skew |
| 보안 | `KMSKeyError`, `KMSKeyInaccessible`, 인증과 권한 실패 |

CloudWatch 평균만 보지 않고 최소와 최대 statistic, node 차원, `_nodes/stats`, `_cat/shards`, slow log를 함께 본다. Provisioned domain의 403과 429는 thread pool 포화뿐 아니라 heap 보호 throttling과 Search Backpressure에서도 생길 수 있으므로 response reason, queue와 rejected, JVM, CPU, disk, shard skew로 원인을 구분한다. Alarm threshold는 공식 예시를 복사하기보다 SLO와 정상 peak baseline으로 조정한다.

## 비용 입력

- Provisioned: data와 manager instance 시간, EBS, warm과 cold storage, snapshot S3, data transfer
- Serverless: indexing OCU, search OCU, managed storage, generation과 redundancy 또는 collection group별 compute floor와 capacity limit
- Ingestion: pipeline OCU, persistent buffer, DLQ S3
- 공통: replica 수, 과다 shard, 보존 기간, refresh 빈도, query fan-out, extended support

기술 선택 시 최고 RPS만 비교하지 않는다. 정상과 장애 peak의 headroom, p95와 p99, 오류율, 운영 인력, restore 비용을 포함한 총비용으로 판단한다.

## 프로덕션 체크리스트

- [ ] Provisioned와 Serverless의 API, 비용, 운영 제약을 실제 workload로 비교했는가
- [ ] Node나 zone 하나를 잃은 상태에서도 SLO를 만족하는가
- [ ] Blue-green 배포와 reindex가 동시에 필요한 여유 용량이 있는가
- [ ] Service software와 engine upgrade 알림, 담당자, runbook이 있는가
- [ ] Domain은 VPC에 있고 data-plane 최소 권한을 검증했는가
- [ ] Mapping, bulk, 429, DLQ와 replay를 애플리케이션이 처리하는가
- [ ] CloudWatch alarm과 OpenSearch 내부 metric을 함께 보는가
- [ ] Provisioned domain의 manual restore 또는 Serverless의 original-collection restore를 실제로 훈련했는가
- [ ] 원본에서 전체 index를 재생하고 결과를 대조할 수 있는가
- [ ] Replica, shard, retention, OCU와 extended support 비용을 추적하는가

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Cluster-Reliability|Shard, Multi-AZ와 복구 원리]]
- [[OpenSearch-Index-Lifecycle|Rollover, Hot, UltraWarm과 Cold storage]]
- [[OpenSearch-Security-Production|OpenSearch 보안과 프로덕션 점검]]
- [[OpenSearch-Performance-Troubleshooting|성능과 장애 진단]]
- [[IAM]], [[VPC]], [[KMS]], [[CloudWatch]]

## 출처

- [Amazon OpenSearch 내부 구조, 성능 최적화와 스케일링 - YouTube](https://www.youtube.com/watch?v=e9GpbaT18Mk)
- [Amazon OpenSearch Service - AWS](https://aws.amazon.com/ko/opensearch-service/)
- [OpenSearch란 무엇인가요 - AWS](https://aws.amazon.com/ko/what-is/opensearch/)
- [What is Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html)
- [OpenSearch Service와 Serverless 비교 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-comparison.html)
- [Serverless 구조와 제한 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-overview.html)
- [Auto-Tune - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/auto-tune.html)
- [OpenSearch Service quotas - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
- [Handling errors - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/handling-errors.html)
- [CloudWatch metrics - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html)
- [Multi-AZ domain 구성 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html)
- [Service software updates - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/service-software.html)
- [Domain engine upgrade - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/version-migration.html)
- [OpenSearch Service snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html)
- [Manual snapshot 제한 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-create.html)
- [Serverless snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-snapshots.html)
- [Fine-grained access control - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html)
- [Serverless IAM - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/security-iam-serverless.html)
- [Serverless network policy - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html)
- [OpenSearch Ingestion pipeline features - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/osis-features-overview.html)
- [Recommended CloudWatch alarms - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html)
- [Serverless CloudWatch metrics - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/monitoring-cloudwatch.html)
