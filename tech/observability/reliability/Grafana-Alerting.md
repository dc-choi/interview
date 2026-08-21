---
tags: [observability, alerting, grafana, sre, notification, on-call]
status: done
verified_at: 2026-08-21
category: "관측가능성(Observability)"
aliases: ["Grafana Alerting", "그라파나 알림", "Unified Alerting"]
---

# Grafana Alerting

Grafana가 규칙 평가부터 알림 전송까지 한 계층에서 처리하는 알림 시스템. 흐름은 **알림 규칙 → 알림 인스턴스 → 알림 정책 트리 → 컨택트 포인트**다. 임계값만 정하고 끝내면 오탐과 소음이 생기는 자리는 대부분 이 흐름의 중간 단계에 있다. [[Alert-Fatigue]]

## 평가 — 언제, 얼마나 자주 보는가

### 평가 그룹과 평가 간격

모든 알림 규칙은 하나의 **평가 그룹**에 속한다. 그룹이 **평가 간격**을 갖고, 그 간격마다 규칙을 다시 검사한다. 같은 그룹의 규칙은 같은 주기로 함께 평가되므로, 서로 다른 주기가 필요한 규칙은 그룹을 나눈다.

### Pending period

조건이 깨져도 곧바로 발화하지 않는다. 인스턴스가 **Pending** 상태로 들어가 조건이 계속 유지되는지 본다. 순간 스파이크를 거르는 장치이고, 0으로 두면 Pending을 건너뛰고 즉시 Alerting으로 간다. Prometheus 알림 규칙의 `for`와 같은 역할이다. [[Prometheus]]

### Keep firing for

반대편 장치. 조건이 해소돼도 곧바로 Resolved로 넘기지 않고 **Recovering** 상태에 머물게 한다. 임계 근처에서 오르내리는 flapping이 발화와 해소 알림을 반복해서 보내는 것을 막는다. 0으로 두면 Recovering을 건너뛴다.

**평가 간격 ≤ pending period**가 기본 감각이다. 평가 간격보다 짧은 pending period는 의미가 없고, 실제 탐지 지연은 평가 간격 + pending period로 잡아야 한다.

## 상태 — No Data와 Error

인스턴스 상태는 Normal, Pending, Alerting, Recovering에 더해 **No Data**와 **Error**가 있다.

- **No Data**: 쿼리는 성공했는데 데이터 포인트가 하나도 없는 경우. pending period를 따르며 Normal → Pending → No Data로 간다.
- **Error**: 쿼리 평가 자체가 실패한 경우. 마찬가지로 Normal → Pending → Error.

각각 네 가지 처리 옵션이 있다.

| 옵션 | 동작 |
|---|---|
| Set state (기본) | No Data 또는 Error 상태로 전이하고 `DatasourceNoData`, `DatasourceError` 인스턴스를 만든다 |
| Set Alerting | 데이터 없음이나 실패를 장애로 간주해 발화 |
| Set Normal | 정상으로 간주해 조용히 넘김 |
| Keep last state | 직전 상태를 유지. 데이터소스 일시 장애가 발화와 해소를 반복시키는 것을 막는다 |

평가 상태와 실제 알림 상태가 갈리면 `grafana_state_reason` 애노테이션에 이유가 남는다.

**설계 판단**: 배치성이라 원래 데이터가 비는 시간대가 있는 지표에 Set Alerting을 걸면 야간마다 호출이 온다. 반대로 평시 트래픽이 끊기지 않아야 하는 지표에 Set Normal을 걸면 수집이 끊긴 상태와 정상이 구분되지 않는다. 수집 중단 자체를 감지해야 하는 지표에는 No Data를 발화로 다루는 쪽이 맞다.

## 알림 정책 — 라벨로 라우팅

정책은 목록이 아니라 **트리**다. 루트는 모든 인스턴스에 매칭되는 기본 정책이라 어떤 알림도 새지 않는다.

- **라벨 매처**: 라벨 이름, 값, 연산자로 구성한다. `=`, `!=`, `=~`, `!~` 네 가지이고 여러 매처는 AND로 묶인다.
- **평가 순서**: 위에서부터 매칭되는 정책을 찾고, 찾으면 그 하위 정책을 표시 순서대로 다시 평가한다. 이 재귀의 **가장 깊은 매칭 자식**이 알림을 처리한다.
- **Continue matching siblings**: 기본은 한 정책이 매칭되면 형제 평가를 멈춘다. 켜면 형제 정책도 같은 인스턴스를 함께 처리한다. 한 알림을 팀 채널과 온콜 양쪽에 보낼 때 쓴다.

라우팅이 라벨에 걸리므로, 규칙 쪽에서 `team`, `severity`, `service` 같은 라벨을 규격으로 붙여두는 것이 선행 조건이다. 이 라벨 규격을 코드로 관리하면 정책 트리가 사람 손에 흔들리지 않는다. [[Alert-as-Code]]

## 그룹핑과 타이밍

한 장애로 인스턴스 수십 개가 뜰 때 알림을 묶는 장치다.

| 설정 | 기본값 | 역할 |
|---|---|---|
| Group by | `alertname`, `grafana_folder` | 알림 규칙 단위 묶음. 규칙 이름이 폴더 간 유일하지 않아 폴더 라벨이 함께 들어간다 |
| Group wait | 30초 | 새 그룹의 첫 알림 전 대기. 관련 인스턴스를 모아 한 번에 보낸다 |
| Group interval | 5분 | 기존 그룹에 변화(신규 발화, 해소)가 있을 때 후속 알림 간격 |
| Repeat interval | 4시간 | 변화가 없어도 계속 발화 중이면 다시 알리는 주기 |

Repeat interval은 group interval 이상이어야 하고 **group interval의 배수**여야 한다. Group by를 비우면 모든 알림이 한 그룹으로 합쳐진다. 라벨 하나를 group by에 추가할 때마다 그룹 수가 곱으로 늘어 알림 건수가 늘어난다는 점은 유의한다.

## 침묵과 뮤트 타이밍

둘 다 알림 전송만 막고 **규칙 평가는 계속된다**. 상태는 UI에서 그대로 보인다.

| | Silence | Mute timing / active time interval |
|---|---|---|
| 대상 선택 | 라벨 매처 | 알림 정책에 부착 |
| 시간 | 시작과 종료가 고정된 1회 구간, 공식 문서상 최대 지속 기간 규정이 없다 | 반복되는 시간 구간 정의 |
| 쓰임 | 계획 작업, 알려진 장애 대응 중 임시 차단 | 야간이나 주말처럼 정기적으로 비긴급 알림을 막을 때 |

Silence를 걸어두고 걷는 것을 잊으면 그 조건의 장애를 통째로 놓친다. 종료 시각을 반드시 유한하게 잡고, 활성 silence 목록을 주기적으로 점검한다.

## 운영 체크포인트

- 탐지 지연 = 평가 간격 + pending period. SLO 대응 시간과 맞는지 역산한다. [[SLI-SLO]]
- 지표 성격별로 No Data 처리 옵션을 다르게 준다. 획일 적용이 야간 오탐이나 무음 장애를 만든다.
- 정책 트리는 라벨 규격에 의존하므로, 라벨을 먼저 표준화하고 트리를 짠다.
- Group by에 고카디널리티 라벨을 넣지 않는다. 묶으려고 만든 장치가 알림을 쪼갠다.
- 알림 규칙마다 런북 링크를 애노테이션으로 붙인다. [[Incident-Runbook]]

## 흔한 함정

- pending period 없이 임계만 걸어 배포 직후 스파이크마다 호출
- Keep last state를 전 규칙에 걸어 데이터소스 장애를 영원히 못 봄
- Repeat interval을 group interval의 배수가 아닌 값으로 잡음
- Continue matching siblings를 몰라서 같은 알림을 두 정책에 중복 정의
- 무기한 silence를 걸고 방치
- Group by를 비워 전 서비스 알림이 한 그룹으로 뭉쳐 긴급도 구분 소실

## 면접 체크포인트

- 평가 간격, pending period, keep firing for가 각각 무엇을 막는가
- No Data와 Error의 네 가지 처리 옵션과 지표 성격별 선택 기준
- 알림 정책 트리의 매칭 규칙(가장 깊은 자식, continue matching siblings)
- group wait / group interval / repeat interval의 역할과 기본값
- Silence와 mute timing의 차이, 둘 다 평가를 멈추지 않는다는 점
- 알림 라우팅이 라벨 규격에 선행 의존한다는 구조

## 출처

- [Grafana — Alert rule evaluation](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/)
- [Grafana — Alert instance and rule state and health](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/state-and-health/)
- [Grafana — Notification policies](https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/notification-policies/)
- [Grafana — Group alert notifications](https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/group-alert-notifications/)
- [Grafana — Create silences](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/)

## 관련 문서

- [[Alert-Fatigue|Alert fatigue 방지 (소음 줄이기, 알림 이원화)]]
- [[Alert-as-Code|Alert as Code (라벨 규격과 정책의 코드화)]]
- [[SLI-SLO|SLI / SLO / Error budget]]
- [[Incident-Runbook|Incident runbook]]
- [[Prometheus|Prometheus / Alertmanager (for, 그룹핑, 침묵)]]
- [[Incident-Detection-Logging|장애 감지와 로깅 (실제 알림 규칙 구성)]]
