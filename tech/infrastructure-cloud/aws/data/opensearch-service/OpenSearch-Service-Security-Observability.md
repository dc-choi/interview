---
tags: [infrastructure, aws, opensearch, security, observability, ingestion]
status: done
verified_at: 2026-07-27
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service Security Observability", "OpenSearch Service 보안과 관측"]
---

# OpenSearch Service 보안, 수집과 관측

Domain과 Serverless collection의 보안 경계, 데이터 수집 경로, 관측 신호와 비용 입력을 다룬다. 전체 구성은 [[OpenSearch-Service|Amazon OpenSearch Service]]에서 찾는다.

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

## 관련 문서

- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Service-Cost-Optimization|비용 최적화와 배포 함정]]
- [[OpenSearch-Security-Production|OpenSearch 보안과 프로덕션 점검]]
- [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성]]
- [[IAM]], [[VPC]], [[KMS]], [[CloudWatch]]

## 출처

- [Fine-grained access control - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html)
- [Handling errors - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/handling-errors.html)
- [Serverless IAM - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/security-iam-serverless.html)
- [Serverless network policy - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html)
- [OpenSearch Ingestion pipeline features - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/osis-features-overview.html)
- [CloudWatch metrics - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html)
- CloudWatch: [Recommended alarms](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html), [Serverless metrics](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/monitoring-cloudwatch.html)
