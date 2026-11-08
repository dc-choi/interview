---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-11-08
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

2026-10-23에 확인한 technical primer에는 Foundry API도 before image를 반환한다는 설명이 남아 있어 가이드와 충돌했다. 2026-11-08에 다시 확인한 개정 primer는 Foundry가 `UPDATE_BEFORE`를 제거하고 key별로 가장 높은 `_change_ordinal`의 변경만 남긴다고 설명해 위 표와 맞는다. 다만 같은 날 확인한 Python API reference(`IncrementalTableTransformInput.changelog`)는 identifier changelog의 `_change_type`으로 여전히 `UPDATE_BEFORE`를 나열해 공식 문서끼리 어긋난다. 문서가 개정된 이력도 있으므로 사용 환경에서는 두 번의 update와 delete가 있는 작은 입력으로 반환 행을 확인하고, raw changelog를 최종 상태로 바로 취급하지 않는다.

key를 믿을 수 없으면 net changes는 전체 row의 DELETE/INSERT로 차이를 계산하고 중간에 상쇄된 변화를 제거한다. 더 느릴 수 있고 중복 row를 보존할 수 있다. 중간 값이 상쇄되므로 모든 원본 event가 담긴 audit stream으로 쓰지 않는다.

`apply_changelog`는 destination도 같은 key로 unique해야 하며 입력에는 output key당 action이 최대 하나여야 한다. `INSERT`/`UPDATE_AFTER`는 upsert, `DELETE`는 delete다. source/changelog/destination의 key 중복과 같은 ordinal의 tie를 점검한다. before image가 포함된 입력에 ordinal만 정렬하는 `row_number`를 적용하면 before image를 고를 수 있으므로 그대로 복사하지 않는다.

## Foundry reader와 writer의 검증 계약

2026-11-08 changelog technical primer 기준이다. 표의 시작 snapshot부터 동점까지는 identifier changelog의 조건이다. 아래 검증은 Foundry의 `source.changelog()`와 `output.apply_changelog()`만 수행한다. native `create_changelog_view`나 `MERGE INTO`를 직접 호출하면 같은 검사가 없으므로 호출자가 직접 보장한다.

| 단계 | 계약 | 실패하거나 어긋나는 예 |
|---|---|---|
| 읽기 범위 | 이전 build가 처리한 input snapshot은 제외하고 현재 build의 snapshot까지 포함한다. input이 그대로면 빈 changelog이고 identifier 검증도 하지 않는다 | compaction과 변경 없는 row의 rewrite는 논리 변경으로 나오지 않는다 |
| 시작 snapshot | 시작 snapshot과 끝 snapshot을 잇는 history가 남아 있어야 한다 | 시작 snapshot이 끝 snapshot의 ancestry 밖이거나 history가 만료되면 읽기가 실패한다 |
| 시작 snapshot 없음 | key별 행 수를 0에서 세기 시작하고 history가 table 생성까지 이어진다고 가정한다 | reader가 이 가정을 검증하지 않아 만료된 history는 불완전한 changelog를 만들 수 있다 |
| source key | changelog에 나온 key는 시작 snapshot과 이후 모든 snapshot 경계에서 0행 또는 1행이어야 한다 | 끝점 두 snapshot이 unique여도 중간 snapshot에 같은 key가 두 행이면 실패한다 |
| 같은 snapshot의 동점 | key마다 그 key를 마지막으로 바꾼 snapshot의 변경만 남기며, 그 snapshot에 같은 key의 변경이 여러 개면 모두 반환한다 | writer가 모호한 action으로 거부하도록 넘기는 것이며 임의의 한 행을 고르라는 뜻이 아니다 |

identifier 검증은 시작 snapshot이 있으면 그 snapshot의 identifier column 전체를 훑고 범위의 변경을 처리한 뒤 dataframe을 반환한다. 바뀐 row가 적어도 읽기 시간이 늘 수 있다. identifier column은 최상위 column 이름을 그대로(점과 backtick 포함) 넘긴다.

반환 dataframe은 source column에 `_change_type`, `_change_ordinal`, `_commit_snapshot_id`를 더한다. `_change_ordinal`은 요청 범위 안 snapshot의 0부터 시작하는 순서이며 row 순서가 아니다. 읽을 때마다 0부터 다시 매기므로 서로 다른 읽기의 결과를 ordinal만으로 정렬하지 않는다.

net changes를 `apply_changelog`에 그대로 넘기지 않는다. 일반 update가 같은 key의 `DELETE`와 `INSERT` 두 action으로 나오므로 output key당 action이 하나라는 writer 조건에 걸려 거부된다. 여러 snapshot에 걸쳐 ordinal이 달라도 마찬가지다. 한 snapshot 안의 두 행은 ordinal이 같아 ordinal만으로 한 행을 고르면 `DELETE`가 선택될 수 있으므로, 의도한 output action으로 직접 변환한다. 동일한 두 row가 한 row로 줄어든 변화도 `DELETE` 하나가 두 output row와 일치해 거부된다. 중복 row 수를 복제하려면 별도의 개수 처리나 전체 snapshot 교체가 필요하다.

`apply_changelog`의 추가 조건은 다음과 같다.

- `_change_type`은 `INSERT`, `UPDATE_AFTER`, `UPDATE`(upsert), `DELETE`(없으면 무시), `UPDATE_BEFORE`(무시)만 받는다. 소문자, 알 수 없는 값과 null은 오류다.
- null key는 다른 null key와 일치한다. action이 없는 output의 중복 key는 검사하지 않으며, output key 검증은 쓰기 전에 output key의 scan과 join을 더한다.
- 기존 output과 data column이 하나라도 모자라거나 남으면 오류다. 모든 행이 `DELETE`여도 payload column이 필요하다. key type은 같거나 Iceberg type promotion(`int`→`long`, `float`→`double`, scale이 같은 decimal 정밀도 증가)만 허용하고, 의도한 변환은 호출 전에 cast한다.
- source key에서 output key로 가는 대응은 key가 아닌 값이 바뀌어도 유일하고 고정돼야 한다. 이름이 같은 column이라도 값이 변경 가능한 field에서 파생되면 같은 문제가 생긴다. `id`로 읽고 `destination_id`로 쓰는데 `destination_id`가 A에서 B로 바뀌면 reader는 새 행만 주므로 B를 upsert하고 A가 남는다. identifier reader는 before image를 주지 않으므로 output key를 바꾸려면 보존한 이전 값으로 옛 key의 삭제를 직접 만들거나 현재 source로 output을 교체한다.

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
- [Palantir, IncrementalTableTransformInput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltabletransforminput)

## 관련 문서

- [[Palantir-Iceberg-Transforms-and-Properties]]
- [[Palantir-Iceberg-Maintenance-and-History]]
