---
tags: [palantir, pipeline, schedule, trigger]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry build schedule 범위와 trigger"]
---

# Build schedule의 범위와 trigger

Schedule은 실행 시점과 build할 graph 범위를 함께 정의한다. Trigger가 충족되어도 target이 최신이면 build가 생기지 않을 수 있다. Graph에서 branch/fallback, target, 제외 경계와 실행 identity를 따로 확인한다.

## Build 경로는 branch의 job spec으로 해석한다

| Build type | 선택 범위 |
|---|---|
| Single | Target만 build |
| Full | Target과 upstream, 제외한 dataset 및 그 upstream은 탐색에서 제외 |
| Connecting | 지정 input은 제외하고 target까지 연결되는 같은 branch의 job spec 경로 |

Connecting에서 경로가 없는 target은 build되지 않는다. 다른 branch의 input을 읽는 transform은 schedule branch의 연결 경로를 끊을 수 있다. 대상 dataset이 graph에 보인다는 사실만으로 포함 여부를 판정하지 않는다. Full build로 범위를 넓힐 때 타 팀의 upstream까지 실행하지 않도록 주의한다.

선택 집합은 매 실행마다 다시 평가한다. Project scope는 고정한 Project 집합 안의 eligible dataset으로 경계를 정하며 사용자의 이후 권한 변경에 덜 의존한다. Project 생성/실행 권한이 부족하거나 Marking 제거, user 실행을 요구하는 job, Project 집합을 확정할 수 없는 경우에는 적용할 수 없다.

User scope는 마지막 생성/편집자 권한으로 실행한다. 담당자가 바뀌거나 계정이 비활성화되면 같은 설정도 실행할 수 없게 된다. 안정된 운영 계정/담당자를 정하고 편집 후 소유 identity와 권한을 다시 확인한다.

## Time은 순간이고 event는 소비될 때까지 남는다

Time trigger는 timezone의 해당 wall-clock 시각에만 충족된다. Event는 발생한 뒤 전체 compound trigger가 충족되어 schedule이 실행될 때까지 충족 상태를 유지한다.

- `OR(Time, DataUpdated)`는 정한 시각 또는 update마다 실행한다.
- `AND(Time, DataUpdated)`는 앞선 실행 이후 update가 있었을 때 정한 시각에 실행한다. 일정 시간 이내의 fresh update를 요구하는 조건은 아니다.
- `AND(EventA, EventB)`는 앞선 실행 이후 두 event가 모두 발생해야 한다. A만 반복 갱신되면 B를 기다린다.
- 여러 Time을 AND로 묶으면 시각이 겹칠 때만 실행한다. 하루 한 번과 매시간을 묶어도 매시간 실행되지 않는다.

매일 09:00 소비 schedule과 09:10 upstream update를 AND로 묶으면 다음 날 09:00에 약 하루 지난 update를 소비할 수 있다. Trigger 충족과 freshness SLA를 구분한다.

## Cron과 update 종류를 명시한다

Build schedule cron은 5-field Unix와 timezone을 쓴다. Data Health의 6-field Quartz와 복사 호환되지 않는다. `L`은 마지막 날짜/요일, `2L`은 마지막 화요일, `2#4`는 넷째 화요일이다. Day-of-month와 day-of-week를 모두 제한하면 둘 중 하나가 일치하는 OR 의미다.

DST 등으로 시계가 앞으로 건너뛴 시각은 실행되지 않고, 뒤로 반복되는 시각은 두 번 충족된다. 업무상 한 번만 처리해야 하는 외부 효과는 별도로 멱등성을 갖춰야 한다.

Data updated는 commit된 transaction, Job succeeded는 transaction commit 유무와 무관한 job 완료다. New logic, media/table update와 schedule 성공/실패도 구분한다. Transactionless media update는 즉시 발생하지 않을 수 있다.

## Staleness, retry와 겹침은 독립 설정이다

Force build는 staleness를 무시한다. 외부 원천 상태를 알 수 없는 Data Connection sync는 별도 force schedule로 분리하고 derived dataset 전체를 불필요하게 다시 계산하지 않는다. Create a schedule은 API 호출 transform을 항상 stale로 설명하지만 troubleshooting은 force가 필요할 수 있는 예에 포함한다. 해당 job의 실제 staleness와 최신 connector/transform 계약을 확인하며 API 호출 전체에 force를 일괄 적용하지 않는다.

같은 schedule의 다음 run은 기본적으로 이전 run이 끝날 때까지 시작하지 않는다. Allow overlapping runs는 긴 pipeline 앞단이 새 입력을 먼저 처리하도록 하지만 중복 schedule이나 비멱등 side effect를 해결하는 기능은 아니다.

Retry는 같은 build의 job attempt이며 retry 불가 오류와 administrator 상한을 따른다. Attempts를 1로 지정하면 schedule 설정상 retry가 없다. 일반 권고는 1분 이상 간격의 여러 retry지만 tight SLA나 외부 non-idempotent 효과는 별도 판단한다. Runtime adjudication에서 추가 attempt가 생길 수 있어 schedule retry 0을 전체 재실행 금지로 읽지 않는다.

Abort build on failure는 다른 job도 취소하는 fail-fast다. 기본 실패는 dependent job을 취소하며, 특정 dataset의 failure 뒤에도 downstream을 계속하도록 예외를 설정할 수 있다. 잘못된 input을 허용하는지 확인한다.

Re-trigger upon successful build는 transaction/batch limit 때문에 남은 입력이 있는 output을 계속 처리한다. Target 중 적어도 하나가 해당 limit을 사용해야 하며 force build는 꺼야 한다. 일반적인 무한 polling 옵션과 구분한다.

## 출처

- [Palantir, Scheduling](https://www.palantir.com/docs/foundry/building-pipelines/scheduling-overview)
- [Palantir, Create a schedule](https://www.palantir.com/docs/foundry/building-pipelines/create-schedule)
- [Palantir, Common schedules](https://www.palantir.com/docs/foundry/building-pipelines/common-schedules)
- [Palantir, Trigger types reference](https://www.palantir.com/docs/foundry/building-pipelines/triggers-reference)
- [Palantir, Scheduling best practices](https://www.palantir.com/docs/foundry/building-pipelines/scheduling-best-practices)
- [Palantir, Troubleshooting reference](https://www.palantir.com/docs/foundry/building-pipelines/schedule-troubleshooting)

## 관련 문서

- [[Palantir-Pipeline-Schedule-Operations|Schedule 조사와 packaging]]
- [[Palantir-Parameterized-Schedule-Outputs|Parameterized schedule output]]
- [[Palantir-Incremental-Transactions-and-Compaction|Incremental 처리]]
