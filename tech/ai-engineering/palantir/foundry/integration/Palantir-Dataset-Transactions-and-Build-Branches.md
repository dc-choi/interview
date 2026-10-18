---
tags: [palantir, datasets, transactions, branching]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Dataset transaction과 build branch"]
---

# Dataset transaction과 build branch

Dataset은 logical file collection에 permissions/schema/versioning을 붙인 resource다. Backing storage의 physical path와 Foundry logical path를 mapping하며 table 외에도 schema-less file을 담을 수 있다. Media set은 media-specific processing을 제공하는 별도 resource다. XML/JSON을 schema-less로 받고 downstream에서 tabular schema를 적용하는 경로도 있다.

## Transaction과 view

OPEN transaction에 file을 쓰고 COMMITTED면 view에 반영하며 ABORTED면 쓴 file을 무시한다. 파일 집합 변경은 다음과 같다.

| Type | 파일 변경 |
|---|---|
| SNAPSHOT | 새 file 집합으로 현재 view 교체 |
| APPEND | 새 file 추가, 기존 file overwrite 시 commit 실패 |
| UPDATE | 새 file 추가와 기존 file overwrite 가능 |
| DELETE | 현재 view에서 file reference 제거 |

UPDATE라도 strictly additive면 append-only 성질을 유지할 수 있다. Existing file overwrite는 downstream incremental을 깨고 snapshot 처리를 요구할 수 있다. File DELETE는 backing data의 즉시 물리 삭제가 아니며 retention과 별도로 본다.

View는 가장 최근 SNAPSHOT(없으면 최초 transaction)부터 이후 변경을 순서대로 접어 계산한다. A/B snapshot, C append, A overwrite, B delete 후에는 A'/C가 남고 새 D snapshot 뒤에는 D만 남는다. Schema는 view의 file을 읽는 metadata이며 실제 file이 schema와 일치한다는 보장은 없다. Decimal precision 최대 38 등 type parameter와 format/parser를 확인한다.

## Data branch는 merge하지 않는다

Dataset branch는 최신 transaction pointer다. Branch당 open transaction은 하나이며 같은 branch의 start/commit 순서는 유지하지만 서로 다른 branch의 시각 순서는 보장하지 않는다. Child는 parent 또는 특정 transaction에서 시작하고 독립적으로 이동한다. Open transaction에서 분기했다면 닫힐 때까지 새 transaction을 시작할 수 없다.

Dataset branch merge는 지원하지 않는다. Branch 삭제는 pointer 삭제이며 transaction을 삭제하지 않는다. 중간 branch를 삭제하면 child의 ancestry를 다시 연결하지만 transaction을 재배열하지 않는다. Git logic merge와 dataset history merge를 같은 작업으로 보고하지 않는다.

## Build는 JobSpec과 data를 각각 resolve한다

JobSpec은 logic/input dependency를 정의하고 job은 하나 이상의 output을 만드는 실행 단위다. Multi-output job의 일부 output만 계산할 수는 없다. Build는 JobSpec graph의 cycle/input/schema를 검증하고 output transaction을 열어 lock하며 충돌하는 input-changing build를 기다릴 수 있다.

Build branch에서 JobSpec을 찾고 없으면 fallback chain을 따라 찾는다. Data input도 build branch가 없으면 첫 existing fallback을 읽는다. Output은 build branch에만 쓰며 없으면 fallback에서 branch를 만들 수 있다. Input에는 새 branch를 만들지 않는다. Fallback은 관련 dataset ancestry와 호환되어야 한다.

Feature branch에서 B/C logic을 바꾸고 A는 master만 있다면 A master를 읽어 B feature, 이어 C feature를 만든다. A와 B/C master data는 바꾸지 않는다. Repository의 personal branch를 여러 사람이 동시에 편집하면 작업이 덮어써질 수 있으므로 별도 branch를 사용한다.

## Build 전체가 하나의 rollback transaction은 아니다

독립 job은 parallel로 실행한다. 실패하면 직접 의존 job과 output transaction을 종료하고 선택적으로 다른 독립 job도 abort할 수 있다. 이미 완료한 job의 output은 남을 수 있다. Build failed라는 최종 상태로 모든 output이 원래 값이라고 판단하지 않는다.

WAITING은 dependency 대기, RUN_PENDING은 runtime 확인 대기, RUNNING은 실행 중이다. ABORT_PENDING은 abort 확인 중이며 ABORTED/FAILED/COMPLETED를 구분한다. 개별 job cancel은 전체 build cancel과 별도다. Fresh 판정은 input과 JobSpec 변화가 없는지에 따르며 force build는 재계산을 요청한다.

Schedule run Succeeded는 build 시작 성공이며 그 build의 완료 성공을 뜻하지 않는다. Ignored는 fresh 등으로 새 build가 없었을 수 있다. Pause는 관측 event와 trigger state를 잊으며 resume 때 재생하지 않는다. User scope는 사용자 권한 변화에 영향받고 Project scope는 지정 Project 범위로 실행한다.

Pipeline 운영에는 owner, 요구 freshness, quality 검증, 권한과 support process를 함께 둔다. Health check는 측정 범위의 검증이며 모든 production data가 정확하다는 자동 보장은 아니다. Live logs는 시작 후 약 10초 지연 가능하고 time-range filter가 적용되지 않는 실시간 feed임을 구분한다.

## 출처

- [Palantir, Data integration](https://www.palantir.com/docs/foundry/data-integration)
- [Palantir, Application reference](https://www.palantir.com/docs/foundry/data-integration/application-reference)
- [Palantir, Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets)
- [Palantir, Branching](https://www.palantir.com/docs/foundry/data-integration/branching)
- [Palantir, Builds](https://www.palantir.com/docs/foundry/data-integration/builds)
- [Palantir, What is a data pipeline?](https://www.palantir.com/docs/foundry/data-integration/data-pipeline)
- [Palantir, Schedules](https://www.palantir.com/docs/foundry/data-integration/schedules)
- [Palantir, Health checks](https://www.palantir.com/docs/foundry/data-integration/health-checks)
- [Palantir, Media sets](https://www.palantir.com/docs/foundry/data-integration/media-sets)

## 관련 문서

- [[Palantir-Lineage-Aware-Deletion-Policies|삭제와 view retention]]
- [[Palantir-Pipeline-Schedule-Resolution|Schedule target과 resolve]]
- [[Palantir-Health-Check-Evaluation-and-Freshness|검사 scope]]
