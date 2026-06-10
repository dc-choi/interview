---
tags: [observability, cardinality, metrics, prometheus, cost, time-series]
status: done
category: "관측가능성(Observability)"
aliases: ["Cardinality", "카디널리티", "카디널리티 관리", "label cardinality"]
---

# Cardinality 관리

카디널리티는 **서로 다른 시계열(또는 라벨 값 조합)의 개수**다. 시계열 모니터링에서 비용과 안정성을 좌우하는 가장 흔한 함정이다. 라벨 하나를 잘못 붙이면 시계열이 수백만 개로 폭발해 수집기가 죽는다. [[Prometheus]]

## 왜 폭발하나 — 곱셈이다

시계열 수 = 메트릭 × 라벨1 값 수 × 라벨2 값 수 × ...

```
http_requests_total{method, route, status, user_id}
= 5 method × 50 route × 10 status × 1,000,000 user_id
= 25억 시계열
```

`user_id` 하나가 전체를 곱으로 터뜨린다. 각 시계열은 메모리/인덱스/저장을 따로 먹으므로 **고카디널리티 라벨 = TSDB OOM, 쿼리 지연, 비용 폭증**.

## 무엇을 라벨로, 무엇을 라벨에서 빼나

| 라벨에 적합 (낮은 카디널리티) | 라벨 금지 (높은/무한 카디널리티) |
|---|---|
| HTTP method, status code | user_id, request_id, trace_id |
| route 템플릿 `/order/:id` | route 원본 `/order/8821` |
| region, env, service | email, IP, full URL, timestamp |

원칙: **유한하고 미리 알 수 있는 값**만 라벨. 무한히 늘 수 있는 식별자는 라벨에 넣지 않는다.

## 신호별로 자리가 다르다

고카디널리티 정보를 버리라는 게 아니라 **맞는 신호에 둔다**. [[Logs-vs-Metrics]]

- **메트릭**: 집계 가능한 저카디널리티 — 비율, 분포, 추세.
- **로그**: 고카디널리티 상세 — user_id, 요청 본문, 에러 스택. [[Structured-Logging]]
- **추적(trace)**: trace_id로 요청 단위 흐름. [[OpenTelemetry]]

"특정 사용자가 왜 느린가"는 메트릭이 아니라 trace_id로 추적에서 푼다.

## 폭발을 막는 법

- **route 템플릿화**: `/order/:id`로 정규화해 path를 유한하게.
- **라벨 허용목록**: 계측 라이브러리에서 허용 라벨만 통과.
- **버킷화**: 연속값(지연)은 raw가 아니라 Histogram 버킷으로.
- **드롭/리라벨**: Prometheus `metric_relabel_configs`로 수집 단계에서 위험 라벨 제거.
- **카디널리티 모니터링**: `prometheus_tsdb_head_series`로 시계열 수 자체를 알람.

## 흔한 함정

- 디버깅 편하라고 user_id/request_id를 라벨로 추가 → 폭발
- path를 정규화 안 함 → URL마다 새 시계열
- 에러 메시지 전문을 라벨로 → 무한 카디널리티
- 카디널리티를 안 재서 어느 메트릭이 범인인지 모름
- 라벨에서 빼야 할 상세를 그냥 버림 → 로그/추적으로 옮기면 됨

## 면접 체크포인트

- 카디널리티가 라벨 값 수의 곱으로 폭발하는 원리
- 라벨에 둘 것 vs 로그/추적으로 보낼 것의 기준(유한 vs 무한)
- route 템플릿화, 허용목록, relabel로 막는 법
- 고카디널리티 정보를 버리는 게 아니라 신호를 옮긴다는 점
- 카디널리티 자체를 모니터링해야 하는 이유

## 출처

- [Prometheus — Naming and labels best practices](https://prometheus.io/docs/practices/naming/)
- [Grafana — What is cardinality and why it matters](https://grafana.com/blog/2022/02/15/what-are-cardinality-spikes-and-why-do-they-matter/)

## 관련 문서

- [[Prometheus|Prometheus (다차원 라벨 모델)]]
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적 (신호 선택)]]
- [[Application-Performance-Monitoring|APM (카디널리티 관리)]]
- [[OpenTelemetry|OpenTelemetry (추적으로 요청 단위 추적)]]
- [[Long-Term-Retention|장기 보존 (카디널리티가 비용에 미치는 영향)]]
