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

identifier changelog의 명시 key는 source에서 unique해야 한다. Iceberg identifier metadata만으로 uniqueness를 강제하지 않으며 Foundry의 identifier changelog 생성은 중복 key가 있으면 실패한다.

2026-10-23 Changelogs and CDC 가이드와 incremental code examples를 대조한 API 경계는 다음과 같다.

| 생성 경로 | 범위와 결과 처리 |
|---|---|
| Foundry `source.changelog(["id"])` | transform 문맥에서 snapshot 범위를 정하고 `UPDATE_BEFORE`를 제거한 뒤 key별 최신 변경을 선택 |
| native `create_changelog_view`의 identifier 모드 | 호출자가 snapshot 범위를 지정하며 중간 변경과 `UPDATE_BEFORE`/`UPDATE_AFTER`를 포함 |

같은 날 확인한 technical primer에는 Foundry API도 before image를 반환한다는 설명이 남아 있어 위 가이드와 충돌한다. 따라서 위 표는 가이드와 현재 예제의 계약을 설명하며, 모든 배포 버전의 실측 결과가 아니다. 사용 환경에서는 두 번의 update와 delete가 있는 작은 입력으로 반환 행을 확인하고, raw changelog를 최종 상태로 바로 취급하지 않는다.

key를 믿을 수 없으면 net changes는 전체 row의 DELETE/INSERT로 차이를 계산하고 중간에 상쇄된 변화를 제거한다. 더 느릴 수 있고 중복 row를 보존할 수 있다. primer의 여러 update에 대한 before image 설명과 V0→V2 표가 서로 달라, 이를 모든 원본 event가 담긴 audit stream으로 단정하지 않는다.

`apply_changelog`는 destination도 같은 key로 unique해야 하며 입력에는 output key당 action이 최대 하나여야 한다. `INSERT`/`UPDATE_AFTER`는 upsert, `DELETE`는 delete다. source/changelog/destination의 key 중복과 같은 ordinal의 tie를 점검한다. before image가 포함된 입력에 ordinal만 정렬하는 `row_number`를 적용하면 before image를 고를 수 있으므로 그대로 복사하지 않는다.

## Filtered CDC

active 조건의 row만 유지할 때 changelog를 단순 filter하면 active→inactive update가 사라져 옛 row가 남는다. Foundry API 예제는 `source.changelog(["id"])` 결과에서 active인 비삭제 변경을 `INSERT`로, 나머지를 `DELETE`로 바꿔 적용한다. snapshot 실행에서는 active인 전체 입력으로 output을 다시 쓴다.

native 예제는 `UPDATE_BEFORE`를 먼저 제외하고 key별 `_change_ordinal` 내림차순으로 최신 행을 고른 뒤 `MERGE INTO`의 삭제, 갱신과 삽입 조건을 나눈다. 이 예제는 before image를 제외한 뒤 snapshot당 key별 action이 하나라는 전제다. 같은 ordinal에 여러 action이 남는 입력에 임의의 한 행 선택을 그대로 적용하지 않는다.

native create_changelog_view는 snapshot range를 주지 않으면 첫 snapshot부터 읽을 수 있어 last-processed watermark를 명시적으로 관리한다. snapshot retention이 watermark를 지우면 incremental resolution이 깨질 수 있다.

## 초기화와 snapshot 범위

2026-10-23 Changelogs and CDC 가이드의 native 예제는 시작 snapshot을 제외하고 끝 snapshot을 포함한다. 두 snapshot이 같으면 변경 적용을 건너뛰며, 변경을 적용한 뒤 처리한 끝 snapshot을 watermark로 기록한다. 이 순서만으로 장애 시 원자적 갱신이나 exactly-once 처리가 보장된다고 확대하지 않는다.

첫 실행이나 incremental 해석이 불가능한 실행은 `ctx.is_incremental`로 분기해 현재 입력 전체로 output을 교체한다. 필터 등 업무 로직도 전체 입력에 적용하며, native 예제는 이 경로에서 watermark를 초기화한다. 전체 이력에 changelog를 생성하고 적용하는 방식은 현재 입력을 한 번 읽는 것보다 비효율적일 수 있으므로 초기화 경로와 증분 경로를 구분한다.

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
