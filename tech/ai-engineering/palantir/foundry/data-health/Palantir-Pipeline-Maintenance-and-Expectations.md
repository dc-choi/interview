---
tags: [palantir, pipelines, data-expectations, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline 운영과 data expectation"]
---

# Pipeline 운영과 data expectation

Pipeline maintenance는 data delivery 목적/범위/시각/주말 운용/정상 갱신 주기/critical stale 기준을 먼저 정의한다. Maintainer는 monitoring 설정, 최초 장애 조사, logic/check 수정과 upstream owner 연락을 맡는다. 권한 없는 dashboard watcher만으로 data 문제를 충분히 조사하기 어려울 수 있다.

## Monitoring 단위는 resolved schedule이다

Resolved inputs는 schedule이 읽지만 build하지 않는 첫 경계, intermediates는 build하고 다른 selected job이 읽는 data, outputs는 build하지만 schedule 안에서 소비하지 않는 data다. UI target과 output은 같지 않다. Multi-output transform의 다른 output도 실제 output이고 downstream에서 읽는 target은 intermediate가 된다.

Schedule graph가 touch할 수 있는 범위와 staleness로 실제 재계산한 범위를 구분한다. Sync dataset은 기본 fresh로 취급되어 target에 있어도 강제하지 않으면 ingestion을 다시 하지 않을 수 있다. 단순 graph target 색으로 source refresh 실행을 보고하지 않는다.

| 경계 | 기본 검사 목적 |
|---|---|
| Schedule | 전체 status와 duration, 중복 job alert 소음 줄이기 |
| Resolved input | Schema, 알려진 cadence의 last update, owner 없는 sync의 status |
| Resolved output | Last update와 consumer-facing schema |
| User-facing intermediate | Schema/data freshness/중요 cadence |
| Synced data | Sync status/freshness와 원 dataset freshness를 함께 비교 |

Source commit freshness, content timestamp freshness와 application sync freshness를 함께 보면 어느 단계가 늦는지 구분할 수 있다. 예상 update가 없는 주말/휴일에 무조건 같은 deadline을 적용하지 않는다. Content의 business validity는 이 운영 검사만으로 보장하지 않는다.

## Expectation은 build-time contract다

Expectation은 typed requirement, check는 input/output에 연결한 이름 있는 조건 집합이다. Precondition은 input 가정, postcondition은 output 품질을 검사한다. CI가 branch에 check를 등록하고 FAIL이면 job을 abort하거나 WARN이면 계속하도록 정한다.

Input precondition 실패가 abort하는 것은 그 transform output이며 upstream input의 이미 완료된 build가 아니다. Upstream commit을 막으려면 upstream producer의 postcondition으로 정의한다. Single-node virtual output의 on_error=FAIL 제한 등 engine/resource별 지원은 따로 확인한다.

Incremental transform이라도 check는 전체 dataset을 평가하므로 이전 transaction과의 PK 중복도 검출한다. Check name은 identity이므로 rename은 기존 history/monitor setting을 유지하는 단순 label 변경이 아니라 제거 후 새 생성과 같다. 개발 branch에서 기대 조건을 build/test한 뒤 보호 branch에 반영한다.

## 변경과 불안정 input을 분리한다

Versioned logic/review를 유지하고 manual/Fusion input 뒤에 validation dataset을 두어 불안정 schema/content를 격리한다. Validation을 event schedule로 운영하고 다른 pipeline은 검증된 output을 입력으로 읽도록 한다. Assert column 수/type 예제만으로 모든 내용 검증을 끝내지 않는다.

Shared dataset을 별도 pipeline으로 분리하면 lock 충돌을 줄일 수 있지만 scheduling/ownership 복잡도가 늘어난다. 필요하면 한 schedule만 producer가 되고 다른 schedule은 input으로 다루는 단순한 경계를 먼저 비교한다. 운영 수동 실행은 schedule의 retry/failure/ignore 설정을 보존하도록 Run Schedule Now를 사용한다.

Stability 문서의 Contour/Workbook 비권장과 squash merge는 해당 권고의 맥락이며 모든 최신 authoring 기능의 지원 종료나 저장소 전체 Git 규칙으로 취급하지 않는다. 핵심은 production logic의 변경 이력/review와 반복 가능한 build다.

## Support ownership을 남긴다

Support hours/primary와 secondary rotation, escalation, handoff 시 미해결 issue의 owner를 정한다. Pipeline 목적/output사용/기대 delivery/최신 lineage/upstream 지원과 반복 문제 해결 절차를 가까운 documentation에 둔다. 계획된 downtime을 downstream과 공유하고 알려진 문제의 alert 억제에는 이유/기간을 남긴다. 반응할 사람이 없는 rule 수만 늘리지 않는다.

## 출처

- [Palantir, Maintaining pipelines](https://www.palantir.com/docs/foundry/maintaining-pipelines)
- [Palantir, Define data expectations](https://www.palantir.com/docs/foundry/maintaining-pipelines/define-data-expectations)
- [Palantir, Recommended health checks](https://www.palantir.com/docs/foundry/maintaining-pipelines/recommended-health-checks)
- [Palantir, Stability recommendations](https://www.palantir.com/docs/foundry/maintaining-pipelines/stability-recommendations)
- [Palantir, Recommended support processes](https://www.palantir.com/docs/foundry/maintaining-pipelines/support-processes)
- [Palantir, Monitoring views introduction](https://www.palantir.com/docs/foundry/maintaining-pipelines/monitoring-views-intro)

## 관련 문서

- [[Palantir-Pipeline-Schedule-Resolution|Build scope와 target]]
- [[Palantir-Health-Check-Evaluation-and-Freshness|검사 시점]]
- [[Palantir-Virtual-Table-Execution-and-Detection|Engine별 expectation 예외]]
