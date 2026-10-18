---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Incremental read mode, changelog와 filtered CDC의 정확성

Iceberg incremental은 @incremental(v2_semantics=True)가 필수다. transforms-tables 0.1390.0 이상에서 with_table_incremental_options(table_read_mode=...)를 설정한다. 기본 append_only는 append와 compaction replace만 읽는다. overwrite/delete를 만나면 full fallback하거나 require_incremental=True일 때 실패한다. changelog는 Spark 전용이며 .changelog() 호출의 전제다.

## Read와 write를 분리한다

incremental runtime의 dataframe/polars/pandas/arrow는 기본 added rows다. 일반 write는 incremental append이며 INSERT가 duplicate를 자동 제거하지는 않는다. native API는 직접 append/MERGE를 선택하고 snapshot fallback에서는 full replace한다. logic을 바꾸면 semantic_version을 올려 전체를 재계산한다. snapshot_inputs로 지정한 input은 항상 전체를 읽는다.

## Changelog 종류

identifier changelog의 명시 key는 source에서 unique해야 한다. INSERT/DELETE/UPDATE_BEFORE/UPDATE_AFTER와 _change_ordinal을 반환하지만 Iceberg identifier metadata만으로 uniqueness를 강제하지 않는다. 중복 key가 있으면 실패한다.

key를 믿을 수 없으면 net changes는 전체 row의 DELETE/INSERT로 차이를 계산하고 중간에 상쇄된 변화를 제거한다. 더 느릴 수 있고 중복 row를 보존할 수 있다. primer의 여러 update에 대한 before image 설명과 V0→V2 표가 서로 달라, 이를 모든 원본 event가 담긴 audit stream으로 단정하지 않는다.

apply_changelog는 destination도 같은 key로 unique해야 한다. INSERT/UPDATE_AFTER는 upsert, DELETE는 delete, UPDATE_BEFORE는 무시한다. source/changelog/destination의 key 중복과 같은 ordinal의 tie를 점검한다. primer의 ordinal만 정렬하는 row_number 예제는 before image를 고를 수 있으므로 그대로 복사하지 않는다.

## Filtered CDC

active 조건의 row만 유지할 때 changelog를 단순 filter하면 active→inactive update가 사라져 옛 row가 남는다. 최신 예제는 UPDATE_BEFORE를 빼고 key별 최신 변화를 고른 뒤, inactive 또는 DELETE를 DELETE로 바꿔 target에 적용한다. output에서 제외해야 하는 전환도 삭제 event로 전달한다.

native create_changelog_view는 snapshot range를 주지 않으면 첫 snapshot부터 읽을 수 있어 last-processed watermark를 명시적으로 관리한다. snapshot retention이 watermark를 지우면 incremental resolution이 깨질 수 있다.

## COW와 MOR

COW는 변경 row가 있는 file을 재작성하고 MOR는 delete file을 추가한다. changelog scan은 delete file을 지원하지 않아 MOR update/delete 뒤 실패하며 Ontology incremental index도 실패한다. changelog나 object backing에는 COW를 유지한다.

COW index의 읽기 비용도 changed-row 수보다 rewritten-file 크기에 따른다. compaction이 MOR의 read amplification을 줄이더라도, 필요한 과거 changelog의 모든 호환성 문제까지 해결한다고 단정하지 않는다.

## 출처

- [Palantir, incremental-overview](https://www.palantir.com/docs/foundry/iceberg/incremental-overview)
- [Palantir, incremental-transforms](https://www.palantir.com/docs/foundry/iceberg/incremental-transforms)
- [Palantir, incremental-code-examples](https://www.palantir.com/docs/foundry/iceberg/incremental-code-examples)
- [Palantir, changelogs](https://www.palantir.com/docs/foundry/iceberg/changelogs)
- [Palantir, changelog-code-examples](https://www.palantir.com/docs/foundry/iceberg/changelog-code-examples)
- [Palantir, changelog-primer](https://www.palantir.com/docs/foundry/iceberg/changelog-primer)

## 관련 문서

- [[Palantir-Iceberg-Transforms-and-Properties]]
- [[Palantir-Iceberg-Maintenance-and-History]]
