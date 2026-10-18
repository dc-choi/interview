---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 트랜잭션, incremental과 pipeline 변경의 안전성

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Transaction을 선택하는 계약

- 7월 Python transforms `>=3.25`의 incremental `transaction_limit`은 input별 batch 처리다. v2 semantics와 transactional append input에 적용하며 최초 snapshot은 가능하지만 snapshot input와 lightweight를 동일하게 지원하지 않았다.
- `strict_append`, input의 current/previous/added 범위와 schedule의 계속 따라잡기 동작을 구분한다. 결과 지연을 이해하려면 job이 실제 소비한 transaction 범위를 확인한다.
- 7월 Pipeline rollback 베타는 provenance에 맞는 downstream transaction을 찾아 incrementality를 보존했다. 대상 preview에서 dataset을 제외/추가하고 branch 이름으로 확인한다. media/stream/Restricted View 같은 비지원 resource는 구분한다.
- 11월 dataset rollback은 Editor 권한, 성공한 transactional 데이터 상태가 대상이었다. retention으로 지운 데이터와 rollback으로 제외한 데이터를 구분하며 OSv2 재index가 필요할 수 있다.
- Force Snapshot은 다음 build에 적용되는 되돌릴 수 없는 선택이었다. 과거 code version, dataset pointer, object index의 복원을 하나의 동작으로 보지 않는다.

## Pipeline 변경을 검토하는 신호

- 1월 삭제한 Ontology output은 다음 deploy에서 entity를 삭제하는 대신 Pipeline Builder의 관리 권한을 해제해 Ontology Manager로 넘겼다. deploy 전 disown warning을 확인한다.
- 3월 breaking schema change가 없는 Ontology output은 build 없이 deploy할 수 있게 됐다. schema 변경의 무해함과 최신 데이터 build 완료는 별도다.
- 3월 file union은 tabular/file/media 입력을 유효 조합으로 묶어 unified file output을 만들었다. 4월 Split 설명은 true/false 경로만 명시하므로 null이 어느 쪽에 포함되는지는 그 공지만으로 단정하지 않는다.
- 3월 find/replace는 node/description/column/parameter 검색과 column 변경 preview를 제공했다. 4월 case/exact/regex와 통계 비교, 5월 proposal의 null/unique/string length/수치 분포가 확대됐다.
- 5월 chart는 transform node 중심이며 join/union/split 뒤 별도 transform이 필요한 경우가 있었다. aggregate 결과 paging과 모든 row 계산을 구분한다.
- 8월 checkpoint는 short-term disk 기본, in-memory는 OOM 가능성이 있고 persistent output dataset은 최초 deploy 때 생성했다. output별 전략을 다르게 정할 수 있다.
- 10월 sampling Apply all은 호환 입력만 대상으로 했고 media percentage 적용은 제외됐다. 12월 breaking-state replay strategy timeline은 incremental 변경의 재실행 범위를 드러냈다.
- node text autosave/discard 단축키, ungrouped section, column 검색과 clear, reviewed proposal marker, deployment warning와 Ontology output 오류 강조는 검토 편의를 높였지만 데이터 correctness 검사를 대체하지 않는다.

## 운영 판단

코드 diff, schema, source transaction, materialization, index 상태와 downstream build 완료를 함께 확인한다. Undo Import라는 이름도 이미 발생한 변경과 downstream 관찰 가능성을 없애지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [July 1, 2025, Roll back pipelines to a previous state in Data Lineage — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#84164bab-4b2f-4a50-838e-11aa61da6aef)
- [May 13, 2025, Text nodes now available in Pipeline Builder and Workflow Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#9e202a20-b525-4574-a5f6-f2b9112c56dc)
- [May 20, 2025, Analyze data with charts in Pipeline Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#8163310e-4c0e-4d1c-acc0-246389bf3ca8)
- [July 29, 2025, Lightweight pipelines now available in Pipeline Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#dbb1f5a0-f9e9-4b0d-8226-37b00a91c9a2)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
