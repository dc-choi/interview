---
tags: [observability]
status: index
category: "관측가능성(Observability)"
aliases: ["관측가능성(Observability)", "Observability"]
---

# 관측가능성(Observability)

## 현장사례
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 모니터링]] — Prometheus + Grafana
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 모니터링]] — CloudWatch, Datadog
- [x] [[Incident-Detection-Logging|장애 감지와 로깅/메트릭 (GPL 스택 비교, 아키텍처, SLO 알림, 카디널리티)]]
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 비용 개선기]] — FluentBit+Firehose+S3, 300$->2$ 사이드카 패턴
- [[Metric-Layer-Mismatch|CloudWatch 0% vs Grafana 100%]] — 같은 CPU가 다른 값으로 보인 사건, iowait·측정 레이어 차이

## Logging
- [x] [[Structured-Logging|Structured logging]]
- [x] [[Correlation-ID|Correlation ID / Trace ID]]
- [x] [[Log-Pipeline|Log pipeline (FluentBit -> Firehose -> S3)]]
- [ ] [[Log-Sampling|Log sampling]]
- [ ] [[PII-Masking|PII masking]]

## Metrics
- [x] [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (CloudWatch vs node_exporter, iowait, 두 레이어 교차 알람)]]
- [x] [[Container-Monitoring|컨테이너 모니터링 (cAdvisor·node_exporter·Prometheus·Grafana·Fluentd, 사이드카 vs 데몬셋)]]
- [ ] [[RED-USE-Method|RED / USE method]]
- [ ] [[Prometheus]]
- [ ] [[Cardinality|Cardinality 관리]]
- [ ] [[Thanos]]
- [ ] [[Long-Term-Retention|Long-term retention]]

## Tracing
- [ ] [[OpenTelemetry]]
- [ ] [[Trace-Context-Propagation|Trace context propagation]]

## Reliability
- [ ] [[SLI-SLO|SLI / SLO / Error budget]]
- [ ] [[Alert-Fatigue|Alert fatigue 방지]]
- [ ] [[Incident-Runbook|Incident runbook]]
