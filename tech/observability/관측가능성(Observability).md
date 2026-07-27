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
- [[logging|로깅 폴더 인덱스]] — 구조화, 상관관계, 파이프라인, 샘플링, PII 마스킹
- [x] [[Structured-Logging|Structured logging]]
- [x] [[Correlation-ID|Correlation ID / Trace ID]]
- [x] [[Log-Pipeline|중앙 집중식 로그 파이프라인 (수집, 버퍼, 처리, DLQ, 재생)]]
- [x] [[Centralized-Logging-with-OpenSearch|AWS Centralized Logging with OpenSearch (종료 일정, 구조, 구축과 삭제)]]
- [x] [[Log-Sampling|로그/트레이스 샘플링 (head vs tail, 에러 편향, 동적 샘플링)]]
- [x] [[PII-Masking|PII 마스킹 (생성 시점 마스킹, redaction/tokenization, 허용목록)]]

## Metrics
- [[metrics|메트릭 폴더 인덱스]] — Prometheus, RED/USE, 카디널리티, 장기 보존, 측정 레이어
- [x] [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (CloudWatch vs node_exporter, iowait, 두 레이어 교차 알람)]]
- [x] [[Container-Monitoring|컨테이너 모니터링 (cAdvisor, node_exporter, Prometheus, Grafana, Fluentd, 사이드카 vs 데몬셋)]]
- [x] [[K8s-Resource-Right-Sizing|메트릭 기반 리소스 적정화 (P95, 집계 기간, PromQL)]] — 측정 방법론 측면
- [x] [[Application-Performance-Monitoring|APM (process.hrtime, RED/USE, P95/P99, OTel, 카디널리티 관리)]]
- [x] [[CloudWatch|AWS CloudWatch (EMF, Log Insights, Composite Alarm, Container/Lambda Insights)]]
- [x] [[RED-USE-Method|RED / USE method (서비스 vs 자원, Saturation, 증상 vs 원인)]]
- [x] [[Prometheus|Prometheus (pull 모델, PromQL, Alertmanager, TSDB 한계)]]
- [x] [[Cardinality|카디널리티 관리 (라벨 폭발, 신호별 자리, route 템플릿화)]]
- [x] [[Multi-Target-Exporter|멀티타겟 Exporter, 서비스 디스커버리 (probe 모델, file_sd, RDS SD, 대상 증가 시 변경 0)]]
- [x] [[Thanos|Thanos (장기 보존, 글로벌 뷰/HA, 다운샘플링)]]
- [x] [[Long-Term-Retention|장기 보존 (hot/warm/cold, 다운샘플링, 보존 기준)]]
- [x] [[Envoy-XDS-Disconnected-Detection|Envoy xDS 단절 탐지 (readiness가 못 보는 control plane 단절, connected_state flapping, 지속 조건 알람)]]
- [x] [[Network-Traffic-Monitoring|네트워크 트래픽 모니터링 (게이트웨이 수집, 에이전트 push, 대시보드 폴링 폴백, SQLite 기본 + ClickHouse 이중 쓰기)]]

## Tracing
- [x] [[OpenTelemetry|OpenTelemetry + 분산 트레이싱 + Trace context propagation (Trace/Span, W3C traceparent, 큐 전파, 샘플링)]]

## Datadog
- [[tech/observability/datadog/datadog|Datadog 학습 지도]] — Unified Service Tagging, Catalog, APM, Monitor, SLO, 배포 추적

## Reliability
- [x] [[Observability-Reliability|관측성 신뢰성 인덱스 (SLI/SLO, alert fatigue, alert as code, 런북, 배포 가시성)]]
