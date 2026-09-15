---
tags: [aws, rds, monitoring, cloudwatch, observability, performance-insights]
status: index
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring", "RDS 모니터링"]
---

# RDS 모니터링

RDS는 관리형이지만 **운영 책임은 여전히 우리에게 있다.** 느린 쿼리, 커넥션 고갈, 스토리지 포화, Replica Lag은 AWS가 자동으로 막아주지 않으므로 지표, 로그, 알람을 직접 설계해야 한다.

- [[RDS-Monitoring-Metrics|지표와 알람 기준]] — 모니터링 3계층, CloudWatch 핵심 지표, 알람 임계치, Database Insights 전환, Enhanced Monitoring
- [[RDS-Monitoring-Logs|로그 수집과 알람 파이프라인]] — Slow Query Log, RDS for MySQL 로그 6종, CloudWatch Logs 게시, Redo Log 크기, Lambda에서 Slack으로 보내는 알람
- [[RDS-Monitoring-Tools-Pitfalls|외부 도구와 운영 함정]] — Datadog DBM, Percona PMM, pganalyze, 흔한 함정, 면접 체크포인트
- [[RDS-Monitoring-Deep-Metrics|모니터링 심화]] — CommitLatency, History List Length, RDS Event Subscription, 커스텀 Prometheus, pt-query-digest, Support Case

## 관련 문서

- [[rds-operations|RDS 운영 폴더 인덱스]]
- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[관측가능성(Observability)|관측가능성 전반]]
