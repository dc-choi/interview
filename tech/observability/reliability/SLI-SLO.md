---
tags: [observability, sre, sli, slo, error-budget, reliability]
status: done
category: "관측가능성(Observability)"
aliases: ["SLI SLO", "SLI / SLO / Error budget", "에러 버짓", "Error Budget", "SLA"]
---

# SLI / SLO / Error Budget

안정성을 "느낌"이 아니라 **지표로 정의하고, 목표를 정하고, 그 목표를 예산처럼 소비**하는 SRE의 언어. "우리 서비스는 안정적이다"를 측정 가능한 합의로 바꾼다.

## 세 용어의 구분

- **SLI (Indicator, 지표)**: 실제로 측정하는 값. 보통 비율이다 — `좋은 요청 수 / 전체 요청 수`. 예: 성공률, 임계 이하 지연 비율.
- **SLO (Objective, 목표)**: SLI에 대한 내부 목표. 예: "28일 동안 가용성 99.9%". 팀이 지키기로 한 선.
- **SLA (Agreement, 계약)**: 고객과의 계약. 위반 시 보상이 따른다. **SLO는 SLA보다 빡세게** 잡아 내부에서 먼저 경보가 울리게 한다.

## SLI 고르기 — RED / USE

지표는 **사용자 경험을 반영**해야 의미가 있다.

- **RED (요청 중심)**: Rate(요청량), Errors(에러율), Duration(지연). 사용자 대면 서비스의 기본. [[Application-Performance-Monitoring]]
- **USE (자원 중심)**: Utilization, Saturation, Errors. 인프라/리소스 관점.

대표 SLI 두 가지: **가용성**(성공 요청 비율), **지연**(P95/P99가 임계 이하인 비율). 너무 많은 SLO를 만들지 말고 사용자 대면 소수에 집중한다.

## 9의 의미 — SLO를 시간으로

| SLO | 월 허용 다운타임 |
|---|---|
| 99% | 약 7.2시간 |
| 99.9% | 약 43분 |
| 99.95% | 약 21분 |
| 99.99% | 약 4.3분 |

9를 하나 늘릴 때마다 비용과 난이도가 급격히 오른다. **100%는 목표로 두지 않는다** — 변경(배포)을 위한 여유가 없어지기 때문이다.

## Error Budget — 안정성을 예산으로

**에러 버짓 = 1 − SLO**. 99.9% SLO면 0.1%, 즉 월 약 43분이 "써도 되는 불안정"이다. 이 리프레임이 강력한 이유는 안정성을 **소비 가능한 자원**으로 만들기 때문이다.

- 버짓이 남아 있다 → 빠르게 기능을 배포해도 된다(개발 속도 우선).
- 버짓이 소진됐다 → 배포를 동결하고 안정성 작업에 집중한다.

개발(속도)과 운영(안정)의 영원한 갈등을 **하나의 숫자로 정렬**한다. 누구의 의견이 아니라 버짓 잔량이 결정한다.

## Burn Rate와 알람

raw 임계값("에러율 > 1%")으로 알람하면 오탐이 쏟아진다([[Alert-Fatigue]]). 대신 **버짓을 얼마나 빨리 태우는가(burn rate)**로 본다.

- **빠른 소진**(예: 1시간에 버짓 2% = 14.4배 속도) → 즉시 호출(page).
- **느린 소진**(예: 6시간에 10%) → 티켓(낮은 긴급도).

이 **multi-window multi-burn-rate** 알람이 "진짜 위험"만 깨우고 소음을 줄인다.

## Error Budget Policy

버짓이 소진되면 **무슨 일이 벌어지는지 미리 문서로 합의**한다 — 기능 배포 동결, 안정성 작업 우선순위 상향 등. 이게 없으면 버짓은 그냥 보고용 숫자가 된다.

## 흔한 함정

- SLO가 너무 많음 → 사용자 대면 소수에 집중
- SLO를 100%로 잡음 → 변경 여유가 없어 오히려 안정성 저하
- SLI를 사용자 경험이 아닌 엉뚱한 레이어에서 측정([[Metric-Layer-Mismatch]])
- raw 임계 알람 → 알람 피로 → burn rate로 전환
- 버짓 정책이 없어 소진돼도 아무 일도 안 일어남

## 면접 체크포인트

- SLI/SLO/SLA의 구분과 SLO를 SLA보다 빡세게 잡는 이유
- RED/USE로 SLI를 고르는 법, 사용자 경험을 반영해야 하는 이유
- 에러 버짓 = 1 − SLO, 그것이 개발 속도와 안정성을 정렬하는 원리
- burn rate 기반 multi-window 알람이 알람 피로를 줄이는 이유
- 100% SLO가 안티패턴인 이유

## 출처

- [Google SRE Book — Service Level Objectives, Embracing Risk](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook — Alerting on SLOs (multi-window multi-burn-rate)](https://sre.google/workbook/alerting-on-slos/)

## 관련 문서

- [[Application-Performance-Monitoring|APM (RED/USE, P95/P99)]]
- [[Incident-Detection-Logging|장애 감지와 SLO 알림]]
- [[Alert-Fatigue|Alert fatigue 방지]]
- [[RDS-Monitoring|RDS 모니터링 (지표/알람 설계)]]
- [[Ops-Level-Indicator|운영 레벨 지표]]
