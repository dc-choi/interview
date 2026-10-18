---
tags: [palantir, automate, scale, backpressure, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Automate 규모 제한과 backpressure"]
---

# Automate 규모 제한과 backpressure

비용은 condition 빈도, execution grouping과 effect 내부 query의 곱으로 커진다. 주기적으로 처리할 이유가 없는 수동 대량 편집은 직접 Action을 쓰는 편이 적합할 수 있다. 아래 한도는 2026-10-16 문서 기준이며 enrollment 변경은 다시 확인한다.

## Trigger 이전부터 bulk로 설계한다

자주 바뀌는 object는 시간 condition으로 평가 빈도를 제한하고 single execution/ObjectSet input과 backend aggregation을 우선 검토한다. 조건이 객체별로 이미 분할돼 있으면 effect만 bulk로 바꿔 모든 비용을 없앨 수 없다.

Time cap은 latency/중간 변경 보존과 맞바꾼다. Per-object는 실패 격리/별도 설정이 필요한 경우 선택한다. ObjectSet은 query로 전달하고 array는 실제 원소 목록이므로 큰 전체 load와 loop 속 N+1 query를 피한다.

## 규모 제한의 실패 단위를 확인한다

| 범위 | 문서 기준 한도/동작 |
|---|---|
| Scheduled added/removed input | 100,000, save 또는 평가 실패 |
| Scheduled Run on all input | 1,000,000, save 또는 평가 실패 |
| Recipients | 10,000, save 또는 평가 실패 |
| Live evaluation | 10,000, 설정에 따라 초과 drop 또는 오류 |
| Scheduled per-object | 10,000, effects 전 전체 오류 |
| Manual input ObjectSet | 5,000,000, 실행 시 오류 |
| Batch size | 최대 1,000 |
| Scenario | 100, 초과 시 평가 전 실패 |

Live drop toggle은 앞 10,000개만 처리하고 나머지를 버리는 선택이다. 성공한 run 표시와 전체 event 처리 완료를 구분한다. Cycle guard는 live loop를 검출/disable하고 Allow cycles는 최대 50회를 허용하는 예외다.

일반 execution queue는 최대 45분, explicit queue-effect 대기는 별도 configurable이다. Queue에서 만료하면 effect가 없고 4시간 runtime timeout은 **이미 완료된 effects는 유지**하고 나머지를 중단한다. 순서대로 시작해도 내부 병렬성과 다른 duration 때문에 같은 완료 순서는 보장하지 않는다.

## Pause, mute와 disabled는 다른 중단이다

Mute는 condition/history를 계속 평가하며 effects만 막는다. Auto-mute는 최근 30 event 중 모든 effect 실패가 최소 80%일 때 적용한다. Pause는 scheduled/live trigger와 active execution을 중단하지만 manual run/event retry는 남는다. Expired/trashed/otherwise disabled는 manual/retry 포함 전체를 막는다.

Expiration은 indefinitely 또는 날짜를 선택하고 날짜는 현재부터 최대 6개월이다. 중국어 구번역은 pause를 전면 미평가로 설명하지만 manual/retry 예외는 현재 영어 문서로 보완한다. 해당 번역은 정확성 미검증 경고가 있어 영어 최신 보장으로 취급하지 않는다.

## Backlog와 폭주를 나눠 복구한다

Manual run은 trigger 조건을 bypass하고 같은 type의 static/dynamic/saved/function ObjectSet을 지정한다. Batch는 무작위 순서이며 예시 실행은 1분 간격과 parallelism을 사용한다. Snapshot expiry가 나면 oldest N을 반환하는 함수로 제한하고 이전 실행 완료 후 반복해 backlog를 줄인다. 큰 manual 한도가 timeout/snapshot 내 전체 처리 보장은 아니다.

폭주 시 원인과 downstream을 pause하고 run count/시작 시점, source update 빈도, chain의 분기와 function query를 함께 본다. Status/timestamp guard로 재처리를 제어하고 automations를 하나씩 낮은 빈도로 재개해 usage를 비교한다. Chained object edits는 explicit dependency의 single-level 제한과 별개로 다음 자동화를 trigger할 수 있다.

## 출처

- [Palantir, Limits](https://www.palantir.com/docs/foundry/automate/limits)
- [Palantir, Performance best practices](https://www.palantir.com/docs/foundry/automate/performance-best-practices)
- [Palantir, Troubleshooting automation performance](https://www.palantir.com/docs/foundry/automate/troubleshooting-performance)
- [Palantir, Manual execution](https://www.palantir.com/docs/foundry/automate/manual-execution)
- [Palantir, Muting, pausing, and expiration](https://www.palantir.com/docs/foundry/automate/muting-pausing-expiration)
- [Palantir, Muting, pausing, and expiry (중국어 기계번역판)](https://palantir.com/docs/zh/foundry/automate/muting-pausing-expiry/)
- [Palantir, Evaluation latency (중국어 기계번역판)](https://palantir.com/docs/zh/foundry/automate/condition-evaluation-latency/)
- [Palantir, Automation settings](https://www.palantir.com/docs/foundry/automate/execution-settings)

## 관련 문서

- [[Palantir-Automate-Conditions-and-Scheduling|평가와 event queue]]
- [[Palantir-Automate-Effects-and-Recovery|Partial failure와 재시도]]
- [[Palantir-Autopilot-Observability-and-Control|폭주와 대기 관측]]
