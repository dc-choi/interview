---
tags: [aws, rds, monitoring, observability, pitfalls]
status: done
verified_at: 2026-08-26
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring Pitfalls", "RDS 모니터링 함정"]
---

# RDS 모니터링 — 외부 도구와 운영 함정

## 외부 도구 연계

| 도구 | 특징 |
|---|---|
| **Datadog DBM** | APM과 쿼리, 호스트 지표 통합, Explain Plan 자동 캡처 |
| **Percona PMM** | 오픈소스, MySQL/PostgreSQL 세션, 쿼리, OS까지 통합 |
| **pganalyze** | PostgreSQL 특화, Query Performance 추천 |
| **NewRelic** | APM + DB 지표 결합 |

AWS 기본 도구만으로 부족하거나 멀티클라우드, 온프렘 환경과 통합이 필요할 때 선택.

## 흔한 함정

- **Max Connection 도달까지 알람 없음** — 80%에서 알람 걸어야 처리 여유 확보
- **Slow Query Log 미수집** — 성능 저하 원인 분석 불가. 임계치는 3초 → 1초로 점진 강화
- **Replica Lag 미모니터링** — 비동기 복제의 근본적 특성 무시 → read-after-write 버그
- **Storage Auto Scaling만 믿음** — 최대 storage threshold, 증가 조건과 cooldown이 있고 증설이 즉시 완료되지 않는다. gp3의 provisioned IOPS/throughput은 storage 증가만으로 자동 조정되지 않으며 gp2 등은 용량과 baseline 성능 관계가 다르므로 유형별 지표와 성능 설정을 별도로 관리
- **DB 내부 부하 데이터 미수집** — 장애 전에 Database Insights mode, retention, 접근 권한을 정하고 DB Load와 Top SQL을 수집
- **알람 피로** — 오탐 많으면 무시됨 → 복합 조건, 지속 시간, 임계 재설계

## 면접 체크포인트

- RDS 모니터링 3계층(CloudWatch 인프라 지표, Database Insights DB 부하, 로그) 설명
- **Replica Lag**을 어떻게 측정하고 임계치를 어떻게 설정하는가
- **DB Load(AAS)** 개념과 vCPU 기준선, Performance Insights에서 Database Insights로의 전환
- Slow Query Log를 **실시간 알람**으로 연결하는 아키텍처
- CloudWatch **Enhanced Monitoring과 기본 모니터링의 차이** (기본 지표 1분 vs Enhanced Monitoring의 지정된 1, 5, 10, 15, 30, 60초 간격, OS 레벨)
- 알람 오탐을 줄이는 **복합 조건, 지속시간** 설계

## 출처

- [AWS RDS, Performance Insights overview and 2026 transition](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html)
- [AWS Docs — Enhanced Monitoring 활성화](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [AWS Docs — RDS 스토리지](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링 인덱스]]
- [[RDS-Monitoring-Metrics|지표와 알람 기준]]
- [[RDS-Monitoring-Logs|로그 수집과 알람 파이프라인]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (지표 오독, 장애 패턴)]]
