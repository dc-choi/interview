---
tags: [palantir, monitoring, metrics, thresholds]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Monitoring signal과 evaluation window"]
---

# Monitoring signal과 evaluation window

Rule은 metric 이름뿐 아니라 계산 단위, comparator, window와 포함 실패 유형을 가진다. 예시/default threshold는 workload 요구를 검증하는 출발점이며 모든 환경의 SLA가 아니다. 일부 rule은 configurable severity 대신 fixed High를 사용한다.

## Agent와 schedule

Agent bootstrapper/manager heartbeat, agent/manager version stale time을 분리한다. 기본 권고는 heartbeat 10분, old version 10일, CPU 80%, heap 70%, free disk 10GB와 queue 70 jobs다. Keystore/truststore의 earliest certificate expiry는 Medium 30일/High 10일 전을 권고한다. 실제 source host 용량과 certificate rotation 시간을 맞춘다.

Consecutive schedule failure는 canceled build를 세지 않는다. 기본 Medium 1/High 3회는 frequency/stability에 맞춰 바꾼다. Schedule duration은 실행 중 지연도 검출하므로 마지막 성공 소요시간만 보는 check와 구분한다.

## Object/link indexing의 신호

Changelog/merge-change rule은 active/replacement pipeline의 user-caused failure를 중심으로 세며 transient infrastructure retry와 다르다. Sync terminal failure는 재시도하지 않는 실패로 fixed High다. Scroll failure는 stream에서 object database로의 전달 실패를 본다.

Sync propagation delay와 checkpoint liveness는 별도다. Object/link stream의 last checkpoint 기본 High는 2분이다. Invalid stream record는 scroll job이 무시한 format violation, direct-write invalid는 validation reject이며 하나 이상일 때 fixed High다. 이런 alert 없이 job이 running인 것만으로 모든 record indexing을 보장하지 않는다.

## Stream rule의 시간과 단위

| Signal | 해석 |
|---|---|
| Last checkpoint duration/size | 최근 checkpoint의 소요시간/bytes |
| Checkpoint liveness | 마지막 성공 이후 시간, stream 기본 5분 |
| Consecutive checkpoint failures | 연속 실패, 기본 High 5회 |
| Trigger failure rate | 지정 window의 checkpoint trigger 실패 수 |
| Total lag | 처리하지 못한 record 수 |
| Lag V2/Sustained lag | threshold가 window 전체 유지되는지, sustained 2분~1시간 선택 가능 |
| Total throughput/V2 | checkpoint당 processed record, V2는 5분 지속 조건 |
| Ingest throughput | 초당 record가 5분간 threshold 위/아래에 머무는지 |
| Records ingested | Live view에 쓴 record 수, 5/30분/1/4시간/1일 window |
| Source staleness | latency sampling과 source timestamp 제공 시에만 가능 |

JobManager CPU/memory와 TaskManager CPU/memory를 구분하며 TaskManager는 10분 지속 조건을 사용한다. 낮은 checkpoint당 record 수는 idle input 때문일 수도 있어 일정 유입량 기대 없이 failure로 단정하지 않는다. Short threshold excursion과 window 전체 failure는 다르다.

Time-series checkpoint liveness 기본 High는 2분이고 points written window는 5/30분이다. Geotemporal sent count도 5/30분이지만 downstream service processing 완료의 보장이 아니다. Dataset time since job last succeeded는 transaction abort/신규 data 없음이어도 job success면 통과할 수 있어 time since last updated와 같은 freshness가 아니다.

## Live deployment

Scaling deficit은 ideal replica minus configured limits/override 후 target replica다. 음수는 over-provisioning, 양수는 under-provisioning이다. 실제 current replica와의 단순 차이가 아니다. Over-provision window는 scale-down delay보다 길게 설정해 정상 autoscaling 대기와 구분한다.

Queue는 30초마다 sample하고 configured window 내 backlog를 본다. Container CPU 비율은 requested CPU 기준이다. OOM rule은 누적 restart count와 most recent termination=OOM이 함께 유지될 때 발동하며 replica 교체나 다른 종료 이유로 reset될 수 있다. Unresponsive percentage는 traffic을 받지 못하는 readiness 상태이며 window를 유지해야 발동한다.

## Automation/function/action

Automation은 evaluation 없음/trigger 없음/system disabled/evaluation failure/execution failure/effect failure를 따로 본다. Evaluation 성공이 effect 성공을 보장하지 않는다. Disabled는 cycle/limit 도달 등으로 fixed High를 사용한다.

Function/action p95는 최근 sliding window의 duration이다. Failure count는 모든 실패, user-facing 또는 non-user-facing을 구분하고 action의 non-user-facing은 function-backed action에서 노출된 user-facing function error를 제외한다. Expected user input 오류를 infrastructure 오류와 같은 queue로 처리하지 않는다.

Function failure-rate composite는 failure percentage와 minimum total run count를 함께 넘어야 하며 작은 traffic의 1/1 실패를 높은 신뢰도의 장애율로 보지 않도록 한다. Count/rate/window의 comparator를 정확히 확인한다.

## 출처

- [Palantir, Monitoring rules reference](https://www.palantir.com/docs/foundry/monitoring-views/rules-reference)

## 관련 문서

- [[Palantir-Monitoring-Scope-and-Alert-State|Scope와 severity]]
- [[Palantir-CDC-Ordering-and-Stream-Recovery|Stream state와 checkpoint]]
- [[Palantir-Compute-Scaling-and-Recovery|Replica scaling]]
