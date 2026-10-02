---
tags: [nestjs, workflow, schedule, reliability]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Workflow 운영, 제한과 schedule"]
---

# NestJS Workflow 운영, 제한과 schedule

Workflow 운영은 실행 상태, 지원팀의 개입, worker의 자원 사용과 오랫동안 남는 journal을 함께 관리한다.

## 상태와 복구 API

| 상태 | 의미와 개입 |
|---|---|
| pending | 아직 claim되지 않음. limit, rate window 또는 worker의 version 등록 확인 |
| running | worker가 lease를 유지하며 실행 |
| suspended | sleep/signal/backoff까지 durable 대기 |
| compensating | 실패 또는 취소 효과를 되돌리는 중 |
| completed | output과 함께 종료 |
| failed | compensation 뒤 실패 또는 definition error로 보상 없이 실패 |
| cancelled | 보상한 취소 또는 terminate로 보상 없이 종료 |
| compensation_failed | undo가 멈춤. 원래 error와 error.compensation을 확인 |

`retry()`는 failed의 journal에서 재개하지만 이미 compensation한 작업은 거부한다. compensation_failed는 미완료 undo만 새 attempts로 수행한다. 이미 지난 run timeout은 retry의 새 timeout 또는 false를 지정한다. 완료 step을 수행했던 효과와 되돌린 효과를 섞어 재사용하지 않는다.

delete는 finished instance와 journal을 삭제하며 unfinished는 force가 필요하다. force는 compensation하지 않는다. 관리 route는 staff 인가로 보호하고 getStatus의 input/lease를 고객에게 통째로 반환하지 않는다.

`ctx.setStatus()`는 최대 16KiB JSON customStatus다. journaled decision 값이 아니며 replay마다 다시 설정하고 다음 write에 함께 반영한다. cancelled 뒤 마지막 stage가 남아도 lifecycle status와 혼동하지 않는다.

## Worker와 실행 제한

기본 worker concurrency는 process당 10, poll은 1초, leaseDuration은 30초, renewal은 lease의 1/3, shutdownTimeout은 10초다. worker:false는 API 전용 process이고 start/signal/inspect는 가능하다. crash 뒤 lease 만료, 정상 shutdown은 claim 중단/signal abort/drain과 lease 반환으로 이어진다. event loop stall과 host clock skew는 takeover를 유발하므로 clock/pool과 grace period를 맞춘다.

workflow concurrency는 global 또는 key별 실행 slot이다. suspended instance는 slot을 잡지 않는다. rateLimit은 외부 request 수가 아니라 **execution 시작 수**를 제한하며 signal/retry/cancel resume도 센다. 한 execution이 여러 request를 하면 limit 수치가 실제 provider rate와 같지 않다. fixed window 경계에서는 두 배 burst가 생길 수 있다.

priority는 1..2097151의 낮은 수가 먼저고 priority 없는 instance가 그보다 먼저다. strict priority는 starvation 가능성이 있으며 다른 작업에도 명시 priority를 준다. limits는 가장 높은 registered version의 정의로 모든 version에 적용되지만 process별 코드가 판단하므로 전체 worker에 같은 설정을 배포한다.

## Schedule

cron은 5필드 또는 seconds 포함 6필드, rrule은 RFC5545, every는 최소 1초 interval이다. cron/rrule의 tz는 기본 UTC이며 every에는 쓰지 않는다. startAt/endAt/limit로 범위를 정한다. instance ID는 schedule ID와 occurrence time으로 같아 여러 worker가 같은 occurrence를 시작해도 한 instance가 된다.

| 정책 | 선택 |
|---|---|
| missed | skip(기본, 1분 안에 발견), once(최신 누락 1개), all(최근 최대 100개, overlap allow 필요) |
| overlap | skip(기본), allow, cancel-previous, buffer-one |

선언 schedule은 코드가 정본이다. startup과 매분 확인하고 마지막 선언 process 확인이 5분 끊기면 다른 process가 제거/교체할 수 있다. 해당 worker가 scale-to-zero인 동안 다른 코드가 DB를 공유하면 schedule이 제거될 수 있다. 돌아온 선언은 새 schedule처럼 next occurrence/unpaused/run count 0으로 다시 시작한다. 누락 복구 정책만으로 이 운영 조건이 사라지지는 않는다.

`WorkflowSchedules` 또는 client.schedules의 trigger는 paused 상태와 overlap에 관계없이 지금 실행한다. pause/resume는 다음 현재 이후 occurrence부터 재개한다. runtime upsert/remove는 코드 선언 schedule을 수정할 수 없다. preview로 epoch ms의 다음 occurrence를 확인한다.

## Journal, retention과 관측

모든 execution이 전체 journal을 읽고 처음부터 replay한다. 기본 warn은 1000 entries/1000000 bytes, max는 10000/10000000이다. max 도달은 compensation 후 WorkflowJournalLimitError로 실패한다. 무한 loop는 새 business period ID의 instance로 이어 가거나 독립 회차 schedule로 나눠 journal을 제한한다.

purge는 기본 completed/failed/cancelled만 정리하고 compensation_failed는 명시할 때만 지운다. 더는 unfinished instance가 소비할 수 없고 retention보다 오래된 signal을 지우되 최신 signal은 남긴다. signal ID의 dedupe 기간도 보존 기간이므로 provider retry 기간보다 길게 정한다.

`WorkflowEvents.events$`와 `nestjs:workflows:<type>`를 사용한다. instance ID는 전체 trace, resume는 execution span, step attempt는 내부 span으로 묶을 수 있다. compensation_failed와 WorkflowNonDeterminismError, journal-large, schedule-skipped에 개입/관측 정책을 둔다.

## 출처

- [NestJS Documentation, Durable workflows](https://docs.nestjs.com/reliability/workflows)

## 관련 문서

- [[NestJS-Workflows-Signals-and-Compensation]]
- [[NestJS-Workflows-CQRS-and-Payload-Security]]
- [[NestJS-Distributed-Locks]]
