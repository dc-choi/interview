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
- [[Metric-Layer-Mismatch|CloudWatch 0% vs Grafana 100%]] — 같은 CPU가 다른 값으로 보인 사건, iowait와 측정 레이어 차이

## 기본 개념
- [x] [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적 (카디널리티, 보관, 알림 설계 원칙)]]
- [x] [[Ops-Level-Indicator|운영 레벨 지표 (여러 메트릭을 단일 단계로 압축, 시간대 정규화, 플레이북)]]
- [x] [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성 (OpenSearch UI, PPL, 상관분석, AI 장애 조사)]]

## Logging
- [x] [[Structured-Logging|Structured logging]]
- [x] [[Correlation-ID|Correlation ID / Trace ID]]
- [x] [[Log-Pipeline|중앙 집중식 로그 파이프라인 (수집, 버퍼, 처리, DLQ, 재생)]]
- [x] [[Centralized-Logging-with-OpenSearch|AWS Centralized Logging with OpenSearch (종료 일정, 구조, 구축과 삭제)]]
- [x] [[Log-Sampling|로그/트레이스 샘플링 (head vs tail, 에러 편향, 동적 샘플링)]]
- [x] [[PII-Masking|PII 마스킹 (생성 시점 마스킹, redaction/tokenization, 허용목록)]]

## Metrics
- [x] [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (CloudWatch vs node_exporter, iowait, 두 레이어 교차 알람)]]
- [x] [[Container-Monitoring|컨테이너 모니터링 (cAdvisor, node_exporter, Prometheus, Grafana, Fluentd, 사이드카 vs 데몬셋)]]
- [x] [[K8s-Resource-Right-Sizing|메트릭 기반 리소스 적정화 (P95, 집계 기간, PromQL)]] — 측정 방법론 측면
- [x] [[Application-Performance-Monitoring|APM (process.hrtime, RED/USE, P95/P99, OTel, 카디널리티 관리)]]
- [x] [[CloudWatch|AWS CloudWatch (EMF, Log Insights, Composite Alarm, Container/Lambda Insights)]]
- [x] [[RED-USE-Method|RED / USE method (서비스 vs 자원, Saturation, 증상 vs 원인)]]
- [x] [[Prometheus|Prometheus (pull 모델, PromQL, Alertmanager, TSDB 한계)]]
- [x] [[Cardinality|카디널리티 관리 (라벨 폭발, 신호별 자리, route 템플릿화)]]
- [x] [[Thanos|Thanos (장기 보존, 글로벌 뷰/HA, 다운샘플링)]]
- [x] [[Long-Term-Retention|장기 보존 (hot/warm/cold, 다운샘플링, 보존 기준)]]

## Tracing
- [x] [[OpenTelemetry|OpenTelemetry + 분산 트레이싱 + Trace context propagation (Trace/Span, W3C traceparent, 큐 전파, 샘플링)]]

## Reliability
- [x] [[Deploy-Observability|배포 가시성 (APM 스팬 태그 공통 신호, 멀티 플랫폼 통합 탐지, 장애 스레드 자동 첨부, FPM vs CLI 계측 함정)]]
- [x] [[SLI-SLO|SLI / SLO / Error budget (9의 의미, burn rate, 버짓 정책)]]
- [x] [[Alert-Fatigue|Alert fatigue 방지 (actionable, 증상 기반, burn rate, 그룹핑)]]
- [x] [[Alert-as-Code|Alert as Code (Terraform+YAML SSOT, proxy 계층 표준화, grouped alert, custom action 권한, deadman switch)]]
- [x] [[Incident-Runbook|Incident runbook (절차서, 알람 연결, 완화 우선)]]
