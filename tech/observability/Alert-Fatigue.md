---
tags: [observability, alerting, alert-fatigue, sre, on-call, incident]
status: done
category: "관측가능성(Observability)"
aliases: ["Alert Fatigue", "Alert fatigue", "알람 피로", "알람 피로 방지", "alerting"]
---

# Alert Fatigue 방지

알람이 너무 많으면 **사람이 알람을 무시하기 시작한다**. 그 순간 알람 시스템은 무용지물이 되고, 진짜 장애가 소음에 묻힌다. 알람 피로는 기술 문제가 아니라 **신뢰의 문제**다. 핵심은 알람 수를 줄이는 게 아니라 **모든 알람이 행동을 요구하게** 만드는 것이다. [[SLI-SLO]]

## 좋은 알람의 조건

- **Actionable**: 받으면 **지금 뭔가 해야 한다**. 할 일이 없으면 알람이 아니라 대시보드/티켓이다.
- **사용자 영향 기반**: 원인(CPU 90%)이 아니라 **증상(요청 실패율 상승)**으로 알람. CPU가 높아도 사용자가 멀쩡하면 깨우지 않는다.
- **긴급도 분리**: 즉시 호출(page)할 것과 업무시간 티켓으로 충분한 것을 나눈다.

## Symptom-based vs Cause-based

| 방식 | 예 | 문제 |
|---|---|---|
| **Cause-based** | "CPU > 80%", "디스크 70%" | 사용자 영향 없어도 울림 → 오탐 폭증 |
| **Symptom-based** | "성공률 < 99.9%", "P99 > 1s" | 사용자가 실제로 아플 때만 → 행동 가능 |

원인 알람은 진단의 보조일 뿐, **호출 트리거는 증상**이어야 한다. [[RED-USE-Method]]

## Burn Rate — 임계값 알람의 대안

raw 임계("에러율 > 1%")는 짧은 스파이크에도 울려 오탐을 만든다. 대신 **에러 버짓을 얼마나 빨리 태우는가**로 본다. 빠른 소진은 즉시 호출, 느린 소진은 티켓. multi-window multi-burn-rate가 진짜 위험만 깨운다. [[SLI-SLO]]

## 소음 줄이는 메커니즘

- **그룹핑/중복 제거**: 한 장애로 쏟아진 100개 알람을 1개로 묶음(Alertmanager). [[Prometheus]]
- **억제(inhibition)**: 상위 장애(리전 다운) 시 하위 알람(개별 인스턴스) 침묵.
- **임계 시간(for)**: 일정 시간 지속될 때만 발화 → 순간 스파이크 무시.
- **패턴 자동 분석**: 온콜이 알람을 받고 판단하던 경험적 규칙을 시스템에 구현해, 알려진 패턴이면 발생 자체를 차단. 시스템 개편에 따른 트래픽 전환 자동 탐지, 조건에 걸려도 문제가 확정될 때까지 발송 대기, 공휴일 트래픽 패턴 학습 반영 등으로 계속 정교화한다.
- **런북 링크 첨부**: 알람마다 [[Incident-Runbook|대응 절차]]를 달아 즉시 행동 가능.
- **알람 리뷰**: 정기적으로 오탐/무시된 알람을 추려 삭제하거나 고친다.

## 하인리히 법칙 — 알람이 잡아야 하는 것

하인리히의 1:29:300 법칙 — 중대한 사고 1건 이전에 경미한 사고 29건과 징후 300건이 존재한다. 알람의 역할은 중대 장애가 터진 뒤 알리는 것이 아니라, 그 앞의 경미한 신호를 정확히 탐지해 알리는 것이다. 오류가 없어도 트래픽이 급증하거나 급감하면 중대한 변화의 전조일 수 있어 감시 대상이 된다.

## 흔한 함정

- 모든 메트릭에 임계 알람 → 소음 → 무시 → 진짜 장애 누락
- 원인 기반 알람만 → 사용자 영향 없는 호출로 온콜 소진
- 심야 호출과 정보성 알람이 같은 채널 → 긴급도 구분 실종
- 알람에 런북이 없어 받아도 뭘 할지 모름
- 한 번 만든 알람을 영원히 안 지움 → 누적 소음

## 면접 체크포인트

- 알람 피로가 신뢰 문제인 이유(무시 시작 → 진짜 장애 누락)
- actionable, 증상 기반, 긴급도 분리의 원칙
- cause-based vs symptom-based, 호출은 증상으로
- burn rate가 raw 임계 알람의 오탐을 줄이는 원리
- 그룹핑/억제/for/런북 링크로 소음을 줄이는 법

## 출처

- [Google SRE Workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book — Monitoring Distributed Systems (symptoms vs causes)](https://sre.google/sre-book/monitoring-distributed-systems/)
- [네이버 검색의 SRE 시스템 — NAVER D2](https://d2.naver.com/helloworld/2047663) (패턴 자동 분석, 하인리히 법칙)

## 관련 문서

- [[SLI-SLO|SLI/SLO/에러 버짓 (burn rate)]]
- [[RED-USE-Method|RED / USE (증상 기반 지표)]]
- [[Incident-Runbook|Incident runbook]]
- [[Prometheus|Prometheus / Alertmanager (그룹핑)]]
- [[Incident-Detection-Logging|장애 감지와 로깅]]
