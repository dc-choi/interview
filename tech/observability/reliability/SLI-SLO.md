---
tags: [observability, sre, sli, slo, error-budget, reliability]
status: done
category: "관측가능성(Observability)"
aliases: ["SLI SLO", "SLI / SLO / Error budget", "에러 버짓", "Error Budget", "SLA"]
verified_at: 2026-08-31
---

# SLI / SLO / Error Budget

안정성을 감각에 맡기지 않고 **지표로 정의하고, 목표를 정하고, 그 목표를 예산처럼 소비**하는 SRE의 언어. "우리 서비스는 안정적이다"를 측정 가능한 합의로 바꾼다.

## 세 용어의 구분

- **SLI (Indicator, 지표)**: 서비스 수준의 한 측면을 위해 잘 정의한 정량 지표. 요청 성공률처럼 비율일 수 있지만, 지연 시간이나 처리량도 될 수 있다.
- **SLO (Objective, 목표)**: SLI의 목표값 또는 목표 범위. 예: "28일 동안 가용성 99.9%". 내부 운영 목표일 수도, 사용자에게 공개한 목표일 수도 있다.
- **SLA (Agreement, 계약)**: 사용자와의 계약으로, 포함된 SLO를 못 지켰을 때의 결과를 명시한다. 금전 보상은 한 예다. 고객 SLA보다 더 엄격한 내부 SLO를 두어 여유를 만드는 방식은 흔하지만 정의 자체는 아니다.

## SLI 고르기 — RED / USE

지표는 **사용자 경험을 반영**해야 의미가 있다.

- **RED (요청 중심)**: Rate(요청량), Errors(에러율), Duration(지연). 사용자 대면 서비스의 기본. [[Application-Performance-Monitoring]]
- **USE (자원 중심)**: Utilization, Saturation, Errors. 인프라/리소스 관점.

대표 SLI 두 가지: **가용성**(성공 요청 비율), **지연**(목표 시간 안에 끝난 요청 비율). P95/P99는 지연 분포를 이해하고 목표를 정하는 보조 지표다. 너무 많은 SLO를 만들지 말고 사용자 대면 소수에 집중한다.

## 9의 의미 — SLO를 시간으로

| SLO | 30일 윈도 허용 다운타임 |
|---|---|
| 99% | 약 7.2시간 |
| 99.9% | 약 43분 |
| 99.95% | 약 21분 |
| 99.99% | 약 4.3분 |

9를 하나 늘릴 때마다 비용과 난이도가 급격히 오른다. 일반적인 가용성 SLO는 100%를 목표로 삼지 않는다. 변경과 장애에 쓸 에러 버짓이 사라지고, 과도하게 보수적인 설계 비용이 생기기 때문이다.

## Error Budget — 안정성을 예산으로

가용성처럼 비율로 표현한 SLO에서는 **에러 버짓 = 1 − SLO**다. 30일 99.9% SLO면 0.1%, 즉 약 43분이 허용된 불안정이다. 이 리프레임이 강력한 이유는 안정성을 **소비 가능한 자원**으로 만들기 때문이다.

- 버짓이 남아 있다 → 합의한 배포 정책에 따라 기능 작업을 진행한다.
- 버짓이 소진됐다 → 정책에 따라 변경을 제한하고 안정성 작업의 우선순위를 올린다. P0와 보안 수정처럼 예외도 미리 정한다.

개발(속도)과 운영(안정)의 갈등을 **하나의 숫자로 논의**할 수 있게 한다. 최종 행동은 버짓 잔량과 사전에 합의한 정책이 함께 결정한다.

## Burn Rate와 알람

raw 임계값(`에러율 > 1%`)만으로 알람하면 짧은 오류 급증과 지속 장애를 구분하기 어렵다([[Alert-Fatigue]]). 대신 **버짓을 얼마나 빨리 태우는가(burn rate)**로 본다.

아래는 Google SRE Workbook이 충분한 요청량이 있는 서비스의 출발점으로 제안한 조합(30일 윈도, 99.9% SLO 기준)이다.

- **빠른 소진**(예: 1시간에 버짓 2% = 14.4배 속도) → 즉시 호출(page).
- **중간 소진**(예: 6시간에 버짓 5% = 6배 속도) → 즉시 호출(page).
- **느린 소진**(예: 3일에 버짓 10% = 1배 속도) → 티켓(낮은 긴급도).

각 항목은 long window와 함께 short window(순서대로 5분, 30분, 6시간)까지 동시에 임계를 넘길 때만 발화한다. 이 **multi-window multi-burn-rate** 알람은 아직 버짓이 빠르게 소진 중인지 확인해 오탐을 줄인다. 저트래픽 서비스에서는 한 번의 실패가 과도한 burn rate가 될 수 있으므로 별도 설계가 필요하다.

## Error Budget Policy

버짓이 소진되면 **무슨 일이 벌어지는지 미리 문서로 합의**한다 — 기능 배포 동결, 안정성 작업 우선순위 상향 등. 이게 없으면 버짓은 그냥 보고용 숫자가 된다.

## 흔한 함정

- SLO가 너무 많음 → 사용자 대면 소수에 집중
- 일반적인 가용성 SLO를 100%로 잡음 → 변경 여유와 비용의 트레이드오프를 잃음
- SLI를 사용자 경험이 아닌 엉뚱한 레이어에서 측정([[Metric-Layer-Mismatch]])
- raw 임계 알람만 사용 → 알람 피로 → burn rate와 시간 창을 함께 검토
- 버짓 정책이 없어 소진돼도 아무 일도 안 일어남

## 면접 체크포인트

- SLI/SLO/SLA의 구분과 내부 SLO에 여유를 둘 수 있는 이유
- RED/USE로 SLI를 고르는 법, 사용자 경험을 반영해야 하는 이유
- 가용성 SLO의 에러 버짓 = 1 − SLO, 그것이 개발 속도와 안정성을 정렬하는 원리
- burn rate 기반 multi-window 알람이 알람 피로를 줄이는 이유
- 100% SLO가 안티패턴인 이유

## 출처

- [Service Level Objectives — Google SRE Book](https://sre.google/sre-book/service-level-objectives/)
- [Alerting on SLOs — Google SRE Workbook](https://sre.google/workbook/alerting-on-slos/)
- [Error Budget Policy for Service Reliability — Google SRE Workbook](https://sre.google/workbook/error-budget-policy/)

## 관련 문서

- [[Application-Performance-Monitoring|APM (RED/USE, P95/P99)]]
- [[Incident-Detection-Logging|장애 감지의 정적 임계 경보와 SLO 개선]]
- [[Alert-Fatigue|Alert fatigue 방지]]
- [[RDS-Monitoring|RDS 모니터링 (지표/알람 설계)]]
- [[Ops-Level-Indicator|운영 레벨 지표]]
