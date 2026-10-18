---
tags: [palantir, schedule, operations, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry schedule 운영과 조사"]
---

# Schedule 운영과 조사

논리적 pipeline당 단순한 schedule을 유지하고 각 dataset을 여러 schedule이 경쟁해 build하지 않게 한다. 공통 output과 여러 terminal branch, 별도 validation table은 schedule 경계를 나눌 수 있다. 한 dataset당 하나는 운영 기본값이며 parameterized incremental/compaction처럼 의도된 예외를 설계할 수 있다.

## 상태를 세 갈래로 나눠 조사한다

1. Run history가 없으면 pause, trigger/version 변경과 upstream event의 실제 발생을 확인한다. Input build 성공과 transaction commit은 다르다.
2. Ignored이면 target이 최신인지 확인한다. Data Lineage의 Out-of-date 색상으로 stale job을 보고 force보다 먼저 판단 근거를 확인한다.
3. Trigger 후 build가 실패했으면 Build report/log와 scope identity/권한을 본다. 일부만 실행되면 stale subset과 connecting graph 포함 여부를 따로 확인한다.

`JobSpecInputsTrashed`/`JobSpecOutputsTrashed`는 trash resource가 들어 있는 상태다. Restore하거나 schedule에서 제외한다. Downstream이 그 resource를 읽으면 downstream도 제외하거나 코드를 수정해야 한다. 단순히 upstream만 숨겨도 입력 의존성이 없어지지 않는다.

Retry 대상 오류는 해당 reference에서 `INTERNAL`, `TIMEOUT`, `CUSTOM_SERVER`, `FAILED_PRECONDITION`으로 제시한다. 실제 재시도 수는 오류의 retry 가능성과 admin cap을 따른다. Failure 원인을 고치지 않고 retry 수만 늘리면 복구가 보장되지 않는다.

## 검색과 metric의 범위를 읽는다

Build Schedules는 처음에 본인이 만든 schedule을 표시한다. Files, 마지막 편집 User, scoped Project 조건은 OR로 후보를 더하고 이름/pause 상태로 좁힌다. Project 조건은 user-scoped schedule을 찾지 못하며 file branch를 생략하면 default branch를 쓴다. 검색 상태는 URL에 저장된다.

카드의 total compute, median successful duration과 mean frequency는 최근 최대 10 run의 지표다. 실패를 제외한 duration 중앙값을 전체 안정성으로 해석하지 않는다. 진행 중 build나 resource 정보 누락 시 compute는 과소 표시될 수 있다. Resource 사용량의 확정 여부를 함께 확인한다.

Schedule 편집마다 version이 생기며 두 version을 비교할 수 있다. 날짜 picker 바깥의 과거 version은 목록에 보이지 않을 수 있다. 갑작스러운 동작 변화는 version과 시작 시점을 대조한다.

## 권한과 자동 pause

Project-scoped schedule 편집은 target Editor, trigger Viewer와 scoped Project Editor를 요구한다. Edit/delete/pause, 단순 view의 요구 권한이 다르다. Bulk pause/enable/delete를 하기 전에 검색 범위와 ownership을 확인한다.

모든 job이 연속 실패하는 schedule은 자동 pause될 수 있다. 해당 안내는 보편적인 고정 실패 횟수를 명시하지 않는다. 원인을 수정하고 schedule을 실행해 job이 성공하면 자동 unpause되고 failure counter가 초기화된다. 설정상 pause와 장애 원인 제거를 구분한다.

## Marketplace의 설치 후 실행까지 포함한다

Schedule packaging은 user scope, fallback branch, 서로 다른 branch trigger와 trigger/target Restricted View를 지원하지 않는 범위다. Pipeline/dataset transformation을 product에 먼저 넣고 Schedule output을 추가한다. 선택 가능한 schedule이 없으면 source schedule을 만들고 새 product version을 생성한다.

Static dataset을 제외한 packaged dataset이 target으로 build되는 schedule을 포함하지 않으면 설치 후 downstream이 stale해질 수 있다. Product에 dataset이 있다는 사실과 그 dataset을 계속 갱신할 실행 계약이 있다는 사실을 구분한다.

## Logic Flows의 역사적 경계

Logic Flows는 2024년 8월부터 sunset이며 신규 개발에 권하지 않는 경로다. Full support와 향후 deprecation 설명을 즉시 사용 불가로 바꾸지 않는다. 새로운 workflow는 AIP Logic/Action 등 현재 목적에 맞는 도구로 설계한다.

Connected flow는 단일 Project의 resource parameter와 JSON configuration을 묶은 stateless 실행 단위다. 생성 시 검증하며 save만으로 실행되지 않는다. UI/Builds/Data Lineage/schedule로 실행하고 job 결과를 확인한다. 기존 connected flow는 수정하지 못하고 archive할 수 있다.

Compass Files Lister는 folder RID 목록으로 repository PR을 생성하며 기본 `compass-lister/rids.json`을 생성하거나 덮어쓴다. `generated_file_path`로 경로를 지정한다. `merge_when_ready`는 repository의 auto-merge 조건이 충족되어야 동작한다. PR 생성과 merge/build 완료를 분리한다.

## 출처

- [Palantir, Scheduling best practices](https://www.palantir.com/docs/foundry/building-pipelines/scheduling-best-practices)
- [Palantir, Find and manage schedules](https://www.palantir.com/docs/foundry/building-pipelines/find-manage-schedules)
- [Palantir, Troubleshooting reference](https://www.palantir.com/docs/foundry/building-pipelines/schedule-troubleshooting)
- [Palantir, View and modify schedules](https://www.palantir.com/docs/foundry/building-pipelines/view-modify-schedules)
- [Palantir, Schedule in a Marketplace product](https://www.palantir.com/docs/foundry/building-pipelines/marketplace-schedules)
- [Palantir, Logic Flows](https://www.palantir.com/docs/foundry/building-pipelines/logic-flows-overview)
- [Palantir, Create a connected flow](https://www.palantir.com/docs/foundry/building-pipelines/create-a-connected-flow)
- [Palantir, Compass Files Lister](https://www.palantir.com/docs/foundry/building-pipelines/compass-file-lister)

## 관련 문서

- [[Palantir-Pipeline-Schedule-Resolution|Schedule 범위와 trigger]]
- [[Palantir-Branching-and-Packaging-Boundaries|Marketplace와 branch 경계]]
- [[Palantir-Automate-Conditions-and-Scheduling|Ontology event 기반 Automate]]
