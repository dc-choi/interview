---
tags: [infrastructure, aws, opensearch, upgrade, migration]
status: done
verified_at: 2026-07-27
category: "Infrastructure - AWS"
aliases: ["OpenSearch Service Engine Upgrade", "OpenSearch 엔진 업그레이드"]
---

# OpenSearch Service Engine Upgrade

Engine upgrade는 Amazon OpenSearch Service domain의 OpenSearch 또는 Elasticsearch version을 올리는 사용자 주도 변경이다. AWS 운영 계층의 patch인 service software update와는 수명주기가 다르며, 두 변경의 구분은 [[OpenSearch-Service-Operations#Service software와 engine upgrade|서비스 운영 문서]]에서 다룬다. 이 문서는 in-place upgrade의 지원 경로, 진행 단계, 부적격 원인과 rollback 설계를 다룬다.

## In-place upgrade 지원 범위

OpenSearch 1.0 이상 또는 Elasticsearch 5.1 이상을 실행하는 domain은 새 domain을 만들지 않고 in-place upgrade할 수 있다. 그 이전 version은 snapshot 복원이나 reindex 기반 migration으로 새 domain에 이관한다.

## 지원 upgrade path

| 현재 version | 목표 version |
|---|---|
| OpenSearch 1.3, 2.x, 3.x — 1.3과 2.x는 2.19 경유 필수 | OpenSearch 3.x |
| OpenSearch 1.3 또는 2.x | OpenSearch 2.x |
| OpenSearch 1.x | OpenSearch 1.x |
| Elasticsearch 7.x | Elasticsearch 7.x 또는 OpenSearch 1.x |
| Elasticsearch 6.8 | Elasticsearch 7.x 또는 OpenSearch 1.x |
| Elasticsearch 6.x | Elasticsearch 6.x |
| Elasticsearch 5.6 | Elasticsearch 6.x |
| Elasticsearch 5.x | Elasticsearch 5.x |

관리형 in-place upgrade는 위 표의 경로만 허용하고, 표에 없는 조합은 중간 version을 경유한다. Self-managed cluster의 node별 rolling upgrade 절차는 [[OpenSearch-Cluster-Reliability#Self-managed rolling upgrade|rolling upgrade]]에서 다룬다.

## 3.x 진입 조건

- OpenSearch 1.3이나 2.x에서 3.x로 가려면 먼저 2.19로 upgrade해야 한다.
- 2.19에서 3.x로 갈 때 3.0에서 제거된 k-NN index 설정(`index.knn.algo_param.ef_construction`, `index.knn.algo_param.m`, `index.knn.space_type`)이나 store 설정 `index.store.hybrid.mmap.extensions`가 남아 있으면 사전 검증이 실패한다. k-NN 설정은 mapping의 method 정의로 옮기고 store 설정은 제거한다.
- OpenSearch 1.3, Elasticsearch 7.10 또는 그 이전 version에서 만든 index는 3.x가 지원하지 않으므로 upgrade 전에 reindex해야 한다. Hot, UltraWarm, cold 중 어느 tier에 있든 reindex 대상이며, UltraWarm과 cold의 비호환 index는 hot으로 옮겨 reindex한 뒤 원래 tier로 되돌린다. 필요 없는 index는 삭제해도 된다.

## 전환별 breaking change 포인트

- Elasticsearch 7.x, OpenSearch 1.x 진입: mapping type이 `_doc` 하나로 고정되고 `_bulk` 같은 일부 API가 request body의 mapping type을 요구하지 않는다. Self-hosted 7.x의 새 index 기본 shard 수는 1이지만 OpenSearch Service domain은 기본값 5를 유지한다. OSS 6.8에서 OpenSearch 1.x로 갈 때 한 문서의 nested JSON object가 field 합산 10,000개를 넘으면 migration이 실패한다.
- Elasticsearch 6.8에서 7.x 또는 OpenSearch 1.x로 갈 때는 manual snapshot을 테스트 domain에 복원해 문제를 먼저 식별하는 것이 권장 절차다.
- Elasticsearch 6.8에서 만든 index는 OpenSearch 2.3과 호환되지 않으므로 upgrade 전에 reindex한다. Reindex 없이 2.3으로 올리면 비호환 index를 storage tier 밖으로 옮길 수 없어 삭제만 남는다.
- Elasticsearch 5.6에서 6.x 진입: 6.x에서 만든 index는 multiple mapping type을 지원하지 않는다. 5.x index는 6.x cluster에 복원하면 여전히 multiple mapping type을 지원하므로, client가 index당 mapping type을 하나만 만드는지 확인한다. Upgrade 중 `.kibana` index는 `.kibana-6`로 reindex되고 같은 이름의 alias로 연결된다.
- OpenSearch Service는 2.17부터 concurrent search 설정을 명시하지 않았고 hot과 warm data node가 2xlarge 이상이며 p90 CPU가 일주일 넘게 45% 미만인 domain에서 concurrent segment search를 auto mode로 활성화한다. Upstream 2.17의 기본 mode는 none이다. 집계 정확도 영향은 [[OpenSearch-Aggregations-Pagination|집계, 정렬, 페이지네이션]], 3.0의 BM25 점수 변화는 [[OpenSearch-Query-Relevance|Query DSL과 관련도]]에서 다룬다. 목표 version의 breaking change 목록을 upgrade마다 확인한다.

## 진행 3단계

1. 사전 검증(pre-upgrade check): upgrade를 막는 문제를 검사하고 통과해야 다음 단계로 간다.
2. Snapshot: OpenSearch Service가 자동 pre-upgrade snapshot을 만들고, 성공해야 진행한다. Upgrade가 실패하면 이 snapshot으로 원상 복구한다.
3. Upgrade: 15분에서 수 시간까지 걸릴 수 있고 진행 중 OpenSearch Dashboards를 쓰지 못할 수 있다.

성공한 upgrade 뒤의 복원 경로는 아래 rollback 절에서 다룬다.

## Downgrade 불가와 rollback 설계

성공한 engine upgrade는 in-place로 되돌릴 수 없다. Snapshot은 forward 방향으로만, 최대 한 major version까지 호환되므로 새 version에서 만든 snapshot은 이전 version cluster에 복원할 수 없고, 이 역방향 제약은 minor version 차이에도 적용된다.

- 자동 pre-upgrade snapshot은 upgrade 후에도 AWS Support를 통해 이전 version의 새 domain에 복원할 수 있다. Support 없이 직접 rollback하려면 upgrade 전에 manual snapshot을 만들고 실제 restore를 검증한다.
- Manual snapshot은 기본적으로 UltraWarm과 cold tier index를 포함하지 않고, warm index는 snapshot당 하나씩 hot과 섞지 않는 조건으로만 명시해 담을 수 있다. [[OpenSearch-Service-Operations#Snapshot과 복구|snapshot 제약]]을 rollback 계획에 반영한다.
- Snapshot 이후 쓰기의 복구는 [[OpenSearch-Cluster-Reliability#Self-managed rolling upgrade|rolling upgrade]]의 dual-write와 변경 로그 replay 원칙을 따른다. 검색 index를 원본 DB나 event log에서 재생할 수 있으면 선택지가 늘어난다. [[OpenSearch-Indexing-Internals|Read Model 동기화]] 구조가 이 전제를 만든다.

## Upgrade 부적격과 실패의 주요 원인

사전 검증이 실패하면 고쳐야 할 문제가 통지된다. Domain이 부적격이 되거나 upgrade가 실패하는 흔한 원인은 네 갈래로 묶인다.

| 갈래 | 원인 |
|---|---|
| Cluster 상태 | red cluster, split brain, master node 미발견, pending task 과다, storage volume 장애, 진행 중인 다른 설정 변경 |
| 리소스 여유 | OpenSearch와 Elasticsearch 7.x의 기본 한도인 node당 shard 1,000개 초과, disk 사용률 90% 초과, JVM memory pressure 75% 초과, 5xx 오류율 급증 |
| 호환성 | 목표 version이 지원하지 않는 optional plugin, 구버전에서 이관된 비호환 index, `.dashboards` alias가 비호환 index를 가리킴, red Dashboards |
| Snapshot과 key | snapshot 진행 중, pre-upgrade snapshot timeout 또는 실패, KMS key 접근 불가 |

Cross-cluster 연결이 있으면 upgrade 후에도 source와 destination의 호환이 유지돼야 한다. 비호환 connection은 remote domain을 먼저 upgrade하거나 삭제해야 하는데, replication이 활성인 connection을 삭제하면 재개할 수 없다.

## 연동 검증과 용량

- Data Firehose, CloudWatch Logs처럼 domain으로 stream하는 서비스가 목표 version을 지원하는지 upgrade 전에 확인하고, client library 호환도 함께 검증한다.
- Optional plugin은 domain과 함께 자동 upgrade되므로 목표 version에 없는 plugin이 있으면 upgrade 요청이 실패한다.
- Engine upgrade는 blue-green 배포를 유발하므로 off-peak 시간과 용량 headroom을 확보한다. Blue-green 비용과 함정은 [[OpenSearch-Service-Cost-Optimization|비용 최적화 문서]]에서 다룬다.

## 운영 체크포인트

- [ ] 목표 version까지의 경유 version과 breaking change를 확인했는가
- [ ] Support 의존 없는 rollback을 위해 이전 version 호환 manual snapshot을 만들고 restore를 검증했는가
- [ ] 부적격 원인 네 갈래(cluster 상태, 리소스, 호환성, snapshot과 key)를 미리 점검했는가
- [ ] Firehose, CloudWatch Logs, client, plugin의 목표 version 지원을 확인했는가
- [ ] Blue-green 여유 용량과 off-peak window를 확보했는가
- [ ] Rollback 시나리오에서 snapshot 이후 쓰기의 복구 경로를 정했는가

## 관련 문서

- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Service-Cost-Optimization|비용 최적화와 배포 함정]]
- [[OpenSearch-Cluster-Reliability|Self-managed rolling upgrade와 snapshot]]
- [[OpenSearch-Index-Lifecycle|Reindex와 alias 전환]]

## 출처

- [Upgrading Amazon OpenSearch Service domains - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/version-migration.html)
- [Can't downgrade after upgrade - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/handling-errors.html#troubleshooting-upgrade-snapshot)
- [Migrating to Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/migration.html)
- [Making configuration changes - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-configuration-changes.html)
- [Breaking changes - OpenSearch Documentation](https://docs.opensearch.org/latest/breaking-changes/)
- [k-NN index settings - OpenSearch Documentation](https://docs.opensearch.org/2.6/search-plugins/knn/knn-index/)
- [UltraWarm manual snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html)
- [Taking manual snapshots - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-create.html)
- [Concurrent segment search - OpenSearch Documentation](https://docs.opensearch.org/2.17/search-plugins/concurrent-segment-search/)
