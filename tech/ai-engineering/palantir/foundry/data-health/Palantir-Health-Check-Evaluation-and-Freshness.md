---
tags: [palantir, data-health, freshness, monitoring]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Health check 실행과 freshness"]
---

# Health check 실행과 freshness

Health check는 resource의 status/time/size/content/schema를 검사하고 실패를 알린다. 검사가 성공했다는 사실은 검사가 측정하는 범위에서만 유효하다. Data Health 앱, dataset/table의 Health, schedule Metrics/Health 또는 Data Lineage에서 결과를 확인한다. 일괄 추가는 선택한 dataset마다 같은 configuration을 적용한다.

## Job, build와 schedule status의 범위

Job은 한 transform의 계산이며 여러 output을 만들 수 있다. Build는 요청한 target과 그 계산 집합, schedule은 반복 실행하는 target/jobs 구성이다. Spark 중심의 job 설명을 모든 새 execution engine의 구현으로 일반화하지 않는다.

| Check | 판단 범위와 trigger |
|---|---|
| Job status | 해당 dataset job의 성공/실패. 다른 downstream 실패와 독립 |
| Build status | target에 도달하는 build 전체의 성공/실패. Intermediate의 build-status는 그 build에서 갱신되지 않을 수 있음 |
| Schedule status/duration | 지정한 schedule 실행의 전체 build와 intermediates |
| Sync status/duration | 지정 destination으로의 sync 결과/소요시간 |

Upstream 실패로 target job이 canceled되어 실행되지 않으면 그 target의 job-status가 평가되지 않을 수 있다. Job 성공 표시만으로 전체 pipeline이 성공했다고 결론 내리지 않는다. Schedule status가 이미 전체 실패를 포착하면 같은 schedule의 모든 intermediate에 중복 job alert를 추가할지 소음과 구체적 조사 필요를 비교한다.

Build duration도 terminal output에 대해 갱신하며 intermediate에 붙인 duration이 모든 upstream build에서 갱신되는 것은 아니다. 여러 sync destination이 있으면 목적지를 명시한다.

## Freshness는 세 가지 시계를 구분한다

| Check | 기준 |
|---|---|
| Time since last updated | 현재 시각과 마지막 committed transaction |
| Data freshness | 마지막 commit 시각과 timestamp column 최대값 |
| Sync freshness | 마지막 sync 시각과 datetime column 최대값 |
| Time since sync last updated | 현재와 마지막 destination sync 시각 |

Source row 생성 시각을 가진 column이 data freshness에 적합하지만 의미를 확인해야 한다. Data freshness는 commit 때만 평가하므로 이후 아무 commit도 없는데 계속 현재 기준으로 지연을 검출하는 검사가 아니다. Empty transaction도 last-update를 바꿀 수 있으며 checks-reference의 Ignore empty transactions 옵션으로 파일 없는 transaction을 제외할 수 있다. 구형 check-types의 기본 설명만으로 이 옵션을 부정하지 않는다.

Automatic time check는 dataset update와 설정 threshold 도달 때 실행한다. Update 시 이전 commit까지의 경과도 평가하고 다음 threshold를 재설정한다. 1시간 threshold에 58분마다 update면 deadline이 갱신되고, 62분 만에 update면 60분경 실패 후 update 때 회복될 수 있다. Threshold의 정확한 동등 경계는 선택 comparator와 실제 report 시각으로 확인한다. Manual schedule은 build 시점과 독립적인 반복 평가다.

## 검사와 build 차단은 별도다

많은 health check는 job이 끝난 뒤 계산한다. 잘못된 output의 commit 자체를 막으려면 build-time data expectation의 failure 정책을 사용한다. Health check 실패가 자동으로 build를 abort한다고 가정하지 않는다.

## 출처

- [Palantir, Health checks](https://www.palantir.com/docs/foundry/data-health/overview)
- [Palantir, Types of checks](https://www.palantir.com/docs/foundry/data-health/check-types)
- [Palantir, Check schedules](https://www.palantir.com/docs/foundry/data-health/check-evaluation)
- [Palantir, Checks reference](https://www.palantir.com/docs/foundry/data-health/checks-reference)
- [Palantir, 数据健康概述 (중국어 기계 번역, 정확성 미검증)](https://palantir.com/docs/zh/foundry/data-health/)

## 관련 문서

- [[Palantir-Health-Check-Content-and-Schema|내용 검사와 통계]]
- [[Palantir-Health-Alerts-and-Incident-Context|알림과 사고 조사]]
