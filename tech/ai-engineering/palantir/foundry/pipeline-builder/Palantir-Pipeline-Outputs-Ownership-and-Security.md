---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder output, 소유권과 보안"]
---

# Pipeline Builder output, 소유권과 보안

Output schema는 upstream column 중 계약에 포함할 subset을 고른다. 불필요한 column을 drop할 수 있지만 required column이 부족하면 deploy가 막힌다. 일반 dataset/file/media/virtual-table/Ontology output은 저장과 관리 주체가 다르다.

## Dataset write mode

| 모드 | 이력과 동일 key의 처리 |
|---|---|
| Default | incremental input 조건을 충족하면 APPEND, 그 외 SNAPSHOT |
| Snapshot replace | 이전 output과 새 row를 합치고 새 key 값 우선, current duplicate는 무작위 하나 |
| Snapshot replace and remove | 새 true row 유지와 old row post-filter를 조합하며 false key는 old row 제거 |
| Append only new rows | 기존 key는 버리고 current duplicate는 무작위 하나, APPEND |
| Snapshot only new rows | 새 key만 SNAPSHOT에 남기지만 current duplicate는 보존 |
| Always append rows | 결과를 항상 APPEND |
| Changelog | record 변경 history를 APPEND |
| Direct changelog | row가 PK, timestamp, deletion boolean을 제공 |

Direct changelog의 timestamp는 OSv2에서 동일 PK dedup 기준이 아니며 transaction ID를 사용한다고 명시한다. Write format 변경은 다음 deploy에 반영하고 existing dataset overwrite는 ownership을 가져오는 1회 동작으로 단순 rename과 다르다.

공식 overwrite 확인 화면은 기존 dataset에 쓰던 logic이 깨진다고 경고한다. 다른 Pipeline Builder pipeline이 만든 dataset을 대상으로 하거나 기존 job spec과 backing logic을 삭제해야 한다고 안내하므로, 실행 전에 기존 writer와 연결된 작업을 확인한다. (2026-10-18 [공식 확인 화면](https://www.palantir.com/docs/resources/foundry/pipeline-builder/outputs-overwrite-dataset@2x.png) 확인, overwrite와 삭제는 미실행)

## Ontology 관리 범위

PB가 만든 object/link만 PB에서 수정/삭제할 수 있다. Object ID는 첫 deploy 후 고정이고 API name은 owned object에 대해 format/중복/100자 한계를 검사하며 바꿀 수 있다. Multi-Ontology는 대상 지정이 필요하다. Link는 같은 pipeline의 object를 쓰고 첫 deploy 뒤 ID와 양끝 type을 바꾸지 못한다. Cardinality는 one-to-many/many-to-many이며 one-to-one은 지원하지 않는다.

Stream-backed object는 일반 edits/many-to-many에 제한이 있고 direct datasource Beta는 낮은 처리량의 low-latency edit 경로다. Direct datasource replay는 현재 object view를 즉시 바꿔 일시적으로 비거나 불완전할 수 있고 branching 미지원, initial setup timeout과 느린 backfill 제한이 있다.

Interface 구현은 required property mapping을 요구하고 link/action constraint와 PB에서 설정 불가능한 type class/render hint를 지원하지 않는다. Schema migration은 edits를 drop할지 compatible하게 옮길지 선택한다. Disown은 관리를 Ontology Manager로 넘기며 관련 link도 따라간다. Latest saved main의 성공 deploy가 필요하고 backing column 이름은 정확히 일치해야 한다. Direct datasource를 disown한 node가 stream dataset처럼 보여도 실제 data는 Ontology에 있다.

## Read-time policy와 marking

Restricted view는 row, object security policy는 row/property 접근을 거른다. Property 값은 object policy와 해당 property policy를 모두 통과해야 보인다. Marking/classification 참조는 ID를 logical type으로 cast하고 array에 담으며 단일 value mapping은 error다. 실제 policy는 main의 성공 deploy 뒤 생성/발효한다.

이러한 read-time control은 downstream output/export로 전파되지 않는다. Data 흐름의 보호는 marking/CBAC와 함께 설계한다. Inherited marking/Org 제거에는 protected branch, code approval과 security approval 설정이 필요하다. Security approver는 해당 marking Remove 권한과 proposal View가 필요하며 일반 code approver와 조건이 다르다.

Marking removal은 protected branch merge/deploy 뒤 발효하고 작업 branch build에는 원래 requirement가 보인다. Project의 Org는 output을 다른 Project로 옮기지 않고 제거할 수 없다. Removal은 당시 input Org에만 적용되어 이후 Org 변경은 경고가 생긴다. Multiple protected branch가 있으면 모든 protected branch에 대한 제거 설정과 보호 변경의 제약을 함께 확인한다.

## Media, virtual table와 geotemporal output

Media-set output은 transactional이며 transactionless로 바꿀 수 없다. Output이 media set이면 incremental media input은 지원하지 않고 dataset output을 써야 한다. 반면 media transform guide는 PB incremental media 전반 미지원이라고 더 넓게 표현하므로 가능한 입력/output 조합을 별도로 확인한다.

Virtual-table output은 외부 저장이며 export-enabled source를 요구하고 branch/write mode/write format을 지원하지 않는다. 해당 안내는 최소 한 Foundry dataset output도 요구한다. External-engine pipeline의 virtual-table-only 요건과 적용 범위를 섞지 않고 실제 engine의 validation을 확인한다.

Geotemporal observation은 series ID, timestamp, GeoPoint와 optional altitude(double meters)를 가진다. Live property는 observation마다, static은 series별이다. TTL(long milliseconds)은 hot-store의 stale 표시만 제한하며 cold dataset의 retention과 다르다. 기존 schema의 field 삭제/type/live-static 변경은 호환성 때문에 막는다.

Geotemporal downstream mandatory control은 latest output transaction/view에서 오며 upstream marking 변경 시 build를 fail시켜 output 재생성을 요구한다. Namespace Org 조건도 충족해야 한다. 초기 Project reader group이 downstream view에 부여되지만 이후 Project discretionary permission 변경은 전파되지 않는다. 일반 Project 권한 변경이 모든 관측값에 즉시 반영된다고 보지 않는다. 실제 권한 변경/삭제는 실행하지 않았다.

## 출처

- [Palantir Pipeline Builder, outputs-add-dataset-output](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-dataset-output)
- [Palantir Pipeline Builder, outputs-add-geotemporal-series-output](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-geotemporal-series-output)
- [Palantir Pipeline Builder, outputs-add-media-set-output](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-media-set-output)
- [Palantir Pipeline Builder, outputs-add-ontology-output](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-ontology-output)
- [Palantir Pipeline Builder, outputs-add-virtual-table-output](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-virtual-table-output)
- [Palantir Pipeline Builder, outputs-overview](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-overview)
- [Palantir Pipeline Builder, outputs-remove-markings-and-organizations](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-remove-markings-and-organizations)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
