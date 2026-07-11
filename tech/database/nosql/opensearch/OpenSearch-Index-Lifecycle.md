---
tags: [database, search, opensearch, alias, reindex, ism, data-stream]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Index Lifecycle", "OpenSearch ISM", "OpenSearch 인덱스 수명주기"]
---

# OpenSearch 인덱스 수명주기

인덱스는 생성 후 schema를 자유롭게 바꾸는 테이블이 아니다. Template으로 생성 규칙을 고정하고, alias로 애플리케이션 계약을 분리하며, rollover와 ISM으로 크기와 보존을 통제한다.

## Index template

Template은 새 인덱스에 mapping, setting, alias를 일관되게 적용한다.

- 여러 composable index template의 pattern이 일치하면 priority가 가장 높은 하나만 선택되며 낮은 priority template과 병합되지 않는다.
- 선택된 template 안에서는 `composed_of` 순서대로 component template을 합치고, 뒤 component와 index template 본문, Create Index 요청 순서로 같은 key를 덮어쓸 수 있다.
- 서로 겹치는 pattern을 같은 priority로 등록하지 않는다.
- 운영 반영 전 Simulate Index Template API로 최종 결과를 확인한다.
- Template 변경은 이미 존재하는 인덱스를 자동 수정하지 않는다.

## Alias를 애플리케이션 계약으로 사용

애플리케이션은 `products-v17` 같은 물리 이름 대신 `products-read`, `products-write` alias를 사용한다.

- 여러 인덱스를 가리키는 write alias에는 정확히 하나의 `is_write_index`가 필요하다.
- Alias에 filter와 search routing을 넣을 수 있지만 보안 경계로 사용하지 않는다.
- `_aliases` API의 remove와 add를 한 요청에 담아 원자적으로 전환한다.
- 기존 인덱스는 일정 기간 보존한다. Write alias 전환 뒤 변경분을 역동기화할 수 없다면 단순 rollback 대상으로 간주하지 않는다.

```json
POST /_aliases
{
  "actions": [
    {"remove": {"index": "products-v1", "alias": "products-read"}},
    {"add": {"index": "products-v2", "alias": "products-read"}}
  ]
}
```

## 매핑 변경과 무중단 전환

Field type과 index analyzer 변경은 새 인덱스가 필요하다.

1. 변경 capture를 먼저 시작하고 source high watermark를 기록한다.
2. `products-v2`를 새 mapping과 setting으로 생성하고 schema와 analyzer를 검증한다.
3. Watermark 기준 source snapshot을 `_reindex` 또는 bulk로 backfill한다.
4. 이후 create, update, delete를 source version 순서로 replay한다.
5. Lag와 DLQ가 기준 안에 들면 partition별 count와 hash, 삭제 건, sample, 핵심 query와 aggregation을 대조한다.
6. 실제 query를 shadow read하고 결과 정확성, p95와 p99, 오류율을 비교한다.
7. `_aliases` 한 요청으로 read와 write alias를 전환하고 일정 기간 양쪽을 동기화한다.
8. 오류가 있으면 write를 차단하고 v2 전환 뒤 변경분을 v1에 재생한 후 alias를 되돌린다. 역동기화 경로가 없으면 write rollback 대신 forward-fix한다.
9. 보존 기간과 지속 reconciliation을 통과한 뒤 v1을 삭제한다.

Reindex는 source 시점의 view를 복사하며 source 이후 write를 자동 추적하지 않는다. Alias 전환의 원자성도 이름 변경에만 적용되고 양쪽 데이터가 같다는 보장은 아니다. Destination mapping, shard, replica 설정은 자동 복사되지 않으며 `_source`가 꺼져 있으면 Reindex API를 사용할 수 없다.

### 대규모 Reindex 실행 제어

- 긴 작업은 `wait_for_completion=false`로 시작하고 Tasks API에서 진행률과 실패를 확인한다.
- `requests_per_second`로 운영 traffic과 경쟁하지 않게 제한하고 측정 결과에 따라 rethrottle한다.
- `slices`는 병렬 처리량과 cluster 부하를 함께 높인다. `auto`를 무조건 사용하지 않고 source shard와 여유 자원으로 결정한다.
- 응답의 `failures`, `version_conflicts`, `retries`, 처리 count를 검증한다. `conflicts=proceed`는 version conflict만 계속 진행하며 다른 실패를 성공으로 바꾸지 않는다.
- Destination이 alias라는 계약을 강제해야 하면 `require_alias=true`를 검토한다.
- 기존 index의 `_source`가 완전하고 신뢰할 수 있는 projection이면 `_reindex`가 적합하다. Projection 규칙이 바뀌었거나 drift가 의심되면 파생 index를 다시 복사하지 않고 RDB나 event log 원본에서 재구축한다.

## Rollover

Rollover는 age, document count, primary shard size 조건에 따라 새 write index를 만든다.

- Alias 방식은 `logs-000001` 같은 숫자 suffix와 write index 설정이 필요하다.
- 새 인덱스는 template에서 mapping과 setting을 받는다.
- 시간만 기준으로 자르면 트래픽 변화에 따라 shard 크기가 크게 흔들릴 수 있다.
- Age와 primary shard size를 함께 보고 복구 가능한 크기로 유지한다.

## Data stream

Data stream은 timestamp가 필수인 append 중심 시계열 데이터에 적합하다.

```text
logs-app
  -> .ds-logs-app-000001
  -> .ds-logs-app-000002  현재 write index
```

- Write는 최신 backing index로 간다.
- Search는 전체 backing index를 대상으로 한다.
- Update와 delete 중심의 일반 도메인 데이터에는 맞지 않는다.
- Rollover와 ISM을 연결하기 쉽다.
- Data stream에 ISM 정책을 연결하면 이후 생성되는 backing index에 적용된다. 기존 backing index에는 별도로 정책을 적용한다.

## Amazon OpenSearch Service storage tier

| Tier | 저장과 compute | 검색과 쓰기 |
|---|---|---|
| Hot | Data node의 EBS 또는 instance store | 읽기와 쓰기 가능, 새 데이터와 빈번한 검색 |
| UltraWarm | S3 저장과 warm node의 compute, local cache | 검색 가능, index는 read-only이며 수정하려면 hot으로 반환 |
| Cold | S3 저장, 상시 search compute 없음 | 직접 검색 불가, 필요한 index를 UltraWarm에 attach한 뒤 검색 |

UltraWarm과 cold는 primary shard 크기만 storage로 계산하며 hot tier의 replica, Linux와 서비스 예약 overhead를 적용하지 않는다. 다만 UltraWarm에는 warm node compute 비용이 있고, 넓은 기간의 cache miss query는 hot과 같은 latency를 보장하지 않는다.

- 로그처럼 rollover 뒤 수정하지 않는 index는 `hot -> UltraWarm -> cold -> delete` 전환과 잘 맞는다.
- 상품과 문서처럼 계속 수정하는 long-lived index는 age만으로 warm에 보내지 않고 write와 freshness 요구를 먼저 본다.
- Cold storage는 UltraWarm과 dedicated master가 필요하며 cold 상태를 느린 검색 tier로 오해하지 않는다.
- ISM으로 전환을 자동화하되 tier 이동 실패와 attach 시간을 runbook에 포함한다.
- Tiering은 비용과 검색 빈도를 조절하는 수단이며 snapshot과 원본 replay를 대신하지 않는다.

## Index State Management

ISM은 index age, size, document count 등의 조건으로 상태와 action을 자동화한다.

Index template이 직접 정의하는 대상은 setting, mapping, alias다. 새 인덱스에 정책을 자동 연결하려면 ISM 정책의 `ism_template.index_patterns`와 `priority`를 사용한다. Index template에 `opendistro.index_state_management.policy_id`를 넣는 이전 방식은 deprecated다.

```text
hot
  -> rollover
read_only
  -> replica 조정, force merge 검토
delete
  -> 보존 기간 종료 후 삭제
```

운영 포인트:

- ISM은 주기 작업이라 threshold를 정확한 순간에 실행하지 않는다.
- Cluster가 red인 동안 ISM job은 실행되지 않는다. 복구 후 Explain과 notification으로 실패 상태를 확인한다.
- Rollover alias, write index, index 이름 규칙이 맞지 않으면 action이 실패한다.
- 한 action 실패 시 뒤 action이 진행되지 않을 수 있다.
- Retry, exponential backoff, error notification을 정책에 포함한다.
- ISM Explain과 Retry API를 runbook에 넣는다.
- 현재 data stream write index는 rollover 전에 삭제할 수 없다.

## Ingest와 수명주기 연결

- Index template에 default pipeline과 final pipeline을 설정할 수 있다.
- Pipeline에서 `date_index_name`을 사용하면 time-based index로 routing할 수 있다.
- Bulk item 실패는 dead-letter 또는 재처리 큐로 보낸다.
- 원본 이벤트를 재생할 수 있어야 index를 처음부터 다시 만들 수 있다.
- 검색 인덱스를 유일한 원본으로 두지 않는다.

## 변경 작업 안전장치

| 작업 | 사전 조건 | 검증 |
|---|---|---|
| Reindex | Destination 미리 생성, source `_source` 활성 | 실패, conflict, count, query 비교 |
| Alias 전환 | 새 인덱스 catch-up 완료 | read와 write smoke test |
| Rollover | Template, write alias, 이름 규칙 | 새 index mapping과 shard 확인 |
| Force merge | 쓰기가 끝난 read-only index | disk 여유와 merge 시간 |
| Delete | Snapshot과 보존 정책 확인 | alias와 data stream 참조 확인 |

## 관련 문서

- [[OpenSearch-Indexing-Internals|Bulk와 ingest pipeline]]
- [[OpenSearch-Cluster-Reliability|Snapshot과 upgrade]]
- [[OpenSearch-Service|Amazon OpenSearch Service storage tier]]
- [[CDC-Debezium|변경 데이터 재처리]]

## 출처

- [Amazon OpenSearch Service로 검색 구현하기 - YouTube](https://www.youtube.com/watch?v=2Swr59CkA_w)
- [Index Template과 Mapping 기본 개념 - WikiDocs](https://wikidocs.net/280297)
- [Index template APIs - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/index-templates/)
- [Index templates - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [Index aliases - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-alias/)
- [Reindex Documents API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
- [Roll over index - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/rollover/)
- [Data streams - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [Index State Management - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/ism/index/)
- [UltraWarm storage - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html)
- [Cold storage - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cold-storage.html)
- [OpenSearch Service ISM - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html)
