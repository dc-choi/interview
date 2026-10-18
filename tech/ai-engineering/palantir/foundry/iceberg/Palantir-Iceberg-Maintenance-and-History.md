---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Snapshot retention, compaction과 storage 사용량

Maintenance의 Jobs/Tasks/configuration에서 rewrite data files/manifests, expire snapshots, remove orphan files와 Custom SQL을 수동 또는 cron으로 실행한다. task 삭제는 관련 schedule도 제거한다. compaction은 논리 row를 바꾸지 않지만 snapshot을 만들고 pipeline과 commit conflict/retry가 날 수 있다.

## Retention과 복구

최소 snapshot 수 또는 최소 time window 중 하나라도 만족하면 보존한다. branch마다 적용하고 tag도 특정 snapshot을 보호한다. snapshot 수가 같아도 compaction/append 빈도에 따라 보존된 업무 시간은 다르다. 자주 실행하지 않는 consumer의 last-processed snapshot을 남겨야 incremental이 이어진다.

expire snapshot은 metadata에서 제거되어 time travel/rollback이 불가능하고 되돌릴 수 없다. 물리 file 삭제는 DR lookback 때문에 별도로 지연된다. orphan cleanup도 older_than과 DR window 양쪽보다 오래된 file만 삭제한다. Foundry managed는 gc.enabled=false처럼 동작해 일반 upstream cleanup이 복구 file을 지우지 못하게 한다. 물리 file 잔존을 사용자 rollback 가능성과 혼동하지 않는다.

## UI 통계와 과금 범위

Snapshots 탭은 current metadata의 retained snapshot만 보이고 History 탭은 Foundry job을 보인다. total-files-size는 live data/delete file을, record count는 physical data file의 row를 센다. delete file이 제거한 row도 record count에 포함될 수 있다. total-data-files는 delete file/metadata/orphan을 제외한다. 표시 row count를 실제 query count와 동일시하지 않는다.

managed storage의 Resource Management는 모든 branch/tag/retained snapshot이 참조하는 data/delete file 합계를 GB-month로 보고한다. metadata/orphan은 제외하고 BYOB storage는 보고하지 않는다. BYOB cloud 비용이 없다는 뜻은 아니다. expiration 후 사용량 반영에는 지연이 있다. compute는 transform/query/sync 등 실행 앱의 자원, 시간과 처리량에 따른다.

## Sync의 조건

Custom JDBC, SQL Server, Oracle, PostgreSQL, Snowflake만 현재 직접 Iceberg sync를 지원하며 Foundry worker에서만 가능하다. private network는 agent proxy egress를 구성한다. overwrite는 전체 overwrite, append는 추가, update는 key upsert로 affected file을 overwrite한다.

source schema 변경 뒤 rerun은 schema evolution 미지원으로 실패할 수 있어 새 sync를 검토한다.

## 출처

- [Palantir, maintenance-page](https://www.palantir.com/docs/foundry/iceberg/maintenance-page)
- [Palantir, retention](https://www.palantir.com/docs/foundry/iceberg/retention)
- [Palantir, resource-usage](https://www.palantir.com/docs/foundry/iceberg/resource-usage)
- [Palantir, syncs](https://www.palantir.com/docs/foundry/iceberg/syncs)

## 관련 문서

- [[Palantir-Iceberg-Access-and-Markings]]
- [[Palantir-Iceberg-Branch-and-Transaction-Isolation]]
