---
tags: [infrastructure, aws, opensearch, availability, snapshot, upgrade]
status: done
verified_at: 2026-07-27
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service Operations", "OpenSearch Service 운영"]
---

# OpenSearch Service 가용성, 변경과 복구

Provisioned domain의 가용성 설계, service software update와 engine upgrade의 구분, snapshot 복구와 프로덕션 점검을 다룬다. 전체 구성은 [[OpenSearch-Service|Amazon OpenSearch Service]]에서 찾는다.

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
- Engine upgrade는 OpenSearch와 Elasticsearch의 major와 minor version 변경이다. 사용자가 시작하고 사전 검증, snapshot, 호환 가능한 upgrade path 확인이 필요하다. 지원 경로, 진행 단계와 검증 실패 원인은 [[OpenSearch-Service-Engine-Upgrade|Engine upgrade 문서]]에서 다룬다.
- Engine version은 downgrade할 수 없다는 전제로 새 domain과 restore 또는 reindex rollback 경로를 준비한다.
- Blue-green 여유 용량, off-peak window와 Firehose, CloudWatch Logs, client, plugin 호환 검증 같은 실행 체크는 [[OpenSearch-Service-Engine-Upgrade|Engine upgrade 문서]]의 체크포인트를 따른다.
- Serverless engine은 AWS가 upgrade하지만 client는 현재 OpenSearch 3.x와 호환돼야 하며 지원 API와 plugin subset은 애플리케이션이 검증한다.

## Snapshot과 복구

- OpenSearch와 Elasticsearch 5.3 이상 domain은 AWS 관리 저장소에 자동 snapshot을 매시간 만들고 최대 336개를 14일 보존한다.
- 자동 snapshot은 해당 domain의 cluster 복구용이다. 장기 보존과 다른 domain 이관에는 자체 S3 repository의 manual snapshot을 사용한다.
- Manual snapshot은 기본적으로 UltraWarm과 cold tier 데이터를 포함하지 않는다. 필요하면 snapshot 전에 hot tier로 옮기거나 원본 재생 경로를 유지한다.
- Serverless는 매시간 자동 snapshot을 만들지만 manual snapshot과 다른 collection으로의 restore를 지원하지 않는다. 같은 이름의 열린 index를 restore하면 덮어쓸 수 있고 restore 중 해당 index 요청은 실패한다.
- Red cluster가 지속되면 자동 snapshot도 실패할 수 있으므로 `AutomatedSnapshotFailure`를 감시한다.
- Manual snapshot은 완벽한 단일 시점 복사본이 아니며 shard별 포함 시점이 다를 수 있다.
- Backup 존재 여부가 아니라 실제 restore 시간과 RPO, RTO를 정기적으로 검증한다.
- 검색 index가 원본 DB나 event log에서 재생 가능하면 snapshot 실패와 schema migration에 대한 복구 선택지가 늘어난다.

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

- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Service-Engine-Upgrade|Engine upgrade 경로와 사전 검증]]
- [[OpenSearch-Cluster-Reliability|Shard, Multi-AZ와 복구 원리]]
- [[OpenSearch-Index-Lifecycle|Rollover, Hot, UltraWarm과 Cold storage]]
- [[OpenSearch-Performance-Troubleshooting|성능과 장애 진단]]

## 출처

- [Multi-AZ domain 구성 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html)
- [Service software updates - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/service-software.html)
- [Domain engine upgrade - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/version-migration.html)
- [Handling errors - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/handling-errors.html)
- [OpenSearch Service snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html)
- [Manual snapshot 제한 - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-create.html)
- [Serverless snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-snapshots.html)
