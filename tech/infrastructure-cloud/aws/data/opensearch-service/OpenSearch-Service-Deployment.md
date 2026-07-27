---
tags: [infrastructure, aws, opensearch, managed-service, serverless]
status: done
verified_at: 2026-07-27
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service Deployment", "OpenSearch Service 배포 모델"]
---

# OpenSearch Service 배포 모델과 관리 책임

Amazon OpenSearch Service의 제공 형태를 구분하고, Provisioned domain과 Serverless collection 중 무엇을 고를지와 관리형이어도 남는 책임을 다룬다. 전체 구성은 [[OpenSearch-Service|Amazon OpenSearch Service]]에서 찾는다.

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

Serverless가 더 싸거나 그대로 호환된다고 가정하지 않는다. 최소 OCU, peak 동시성, 지원 API와 client, migration 방식까지 workload로 비교한다. Provisioned domain에서 collection으로 자동 이관하는 기능은 없으므로 별도 reindex 경로가 필요하다.

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

## 관련 문서

- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Service-Instance-Storage|인스턴스와 스토리지 선정]]
- [[OpenSearch-vs-RDB-Search|검색엔진 도입 판단]]
- [[OpenSearch|OpenSearch 학습 지도]]

## 출처

- [Amazon OpenSearch 내부 구조, 성능 최적화와 스케일링 - YouTube](https://www.youtube.com/watch?v=e9GpbaT18Mk)
- AWS 개요: [Amazon OpenSearch Service](https://aws.amazon.com/ko/opensearch-service/), [OpenSearch란 무엇인가요](https://aws.amazon.com/ko/what-is/opensearch/)
- [What is Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html)
- [OpenSearch Service와 Serverless 비교 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-comparison.html)
- [Serverless 구조와 제한 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-overview.html)
- [Auto-Tune - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/auto-tune.html)
- [OpenSearch Service quotas - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html)
