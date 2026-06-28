---
tags: [observability, prometheus, metrics, promql, time-series, monitoring]
status: done
category: "관측가능성(Observability)"
aliases: ["Prometheus", "프로메테우스", "PromQL", "Alertmanager"]
---

# Prometheus

오픈소스 시계열(time-series) 모니터링의 사실상 표준. **pull 기반 수집 + 다차원 라벨 + PromQL**이 핵심이고, Grafana로 시각화, Alertmanager로 알람을 붙여 GPL(Grafana, Prometheus, Loki) 스택을 이룬다. [[Incident-Detection-Logging]]

## 동작 모델 — Pull 기반

Prometheus가 대상의 `/metrics` 엔드포인트를 **주기적으로 긁어온다(scrape)**. 푸시가 아니다.

- **장점**: 대상의 생존 여부를 수집 자체로 알 수 있고(up 메트릭), 대상이 수집기를 몰라도 됨, 중앙에서 수집 주기 제어.
- **Service Discovery**: 쿠버네티스, EC2, Consul 등에서 대상을 자동 발견해 동적 환경에 대응.
- **Exporter**: 직접 계측 못 하는 대상은 exporter가 변환한다. `node_exporter`(호스트), `cAdvisor`(컨테이너), DB/Redis exporter 등. [[Container-Monitoring]] 대상이 많고 자주 변하면 하나의 exporter가 여러 대상을 긁는 [[Multi-Target-Exporter|멀티타겟 Exporter + 서비스 디스커버리]]로 확장.
- 단명하는 배치 잡은 pull이 어려워 **Pushgateway**로 예외 처리.

## 데이터 모델 — 다차원 라벨

메트릭은 `이름{라벨=값, ...}` 형태의 시계열이다.

```
http_requests_total{method="POST", route="/order", status="500"} 42
```

라벨 조합 하나가 **별도 시계열**이다. 그래서 라벨 값이 무한히 늘면 시계열이 폭발한다 → [[Cardinality|카디널리티 관리]]가 Prometheus 운영의 핵심 제약.

메트릭 타입 4종: **Counter**(단조 증가), **Gauge**(오르내림), **Histogram**(버킷 분포, P95 계산용), **Summary**(분위수 사전 계산).

## PromQL — 쿼리로 신호를 만든다

```promql
# 5분간 라우트별 5xx 비율
sum(rate(http_requests_total{status=~"5.."}[5m])) by (route)
  / sum(rate(http_requests_total[5m])) by (route)

# P99 지연 (histogram)
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

`rate()`로 카운터를 초당 증가율로 바꾸는 게 기본기다. [[RED-USE-Method|RED 지표]]를 PromQL로 표현한다.

## 룰 — Recording과 Alerting

- **Recording rule**: 무거운 쿼리를 미리 계산해 새 시계열로 저장(대시보드/알람 가속).
- **Alerting rule**: 조건이 일정 시간 참이면 Alertmanager로 알람 발송. Alertmanager가 **그룹핑, 침묵(silence), 라우팅, 중복 제거**를 맡아 [[Alert-Fatigue|알람 피로]]를 줄인다.

## 저장과 확장의 한계

- 로컬 TSDB는 **단일 노드, 보존 기간 제한**(기본 수주). 장기 보존/글로벌 뷰/HA는 기본 제공 안 됨.
- 해법: **remote-write로 외부 저장**(Thanos, Mimir, Cortex)으로 보냄. [[Thanos]], [[Long-Term-Retention]]
- 메트릭 전용 — 로그는 Loki, 추적은 Tempo/Jaeger로 분리. [[OpenTelemetry]]

## 흔한 함정

- 고카디널리티 라벨(user_id, request_id) → 시계열 폭발, OOM ([[Cardinality]])
- 로컬 보존만 믿고 장기 데이터 유실 → remote-write/Thanos 필요
- raw 임계값 알람 남발 → 알람 피로 (burn rate로 전환, [[SLI-SLO]])
- Histogram 버킷을 부적절히 잡아 분위수 부정확
- Pull 모델에서 방화벽/네트워크로 scrape 실패를 놓침

## 면접 체크포인트

- Pull vs Push 모델의 트레이드오프, exporter/service discovery 역할
- 라벨 기반 다차원 모델과 카디널리티 제약의 관계
- `rate()`/`histogram_quantile()`로 RED 지표 만드는 법
- Recording/Alerting rule, Alertmanager의 그룹핑/침묵
- 로컬 TSDB의 한계와 Thanos/remote-write로 푸는 방식

## 출처

- [Prometheus — Overview / Data model / Querying](https://prometheus.io/docs/introduction/overview/)
- [Prometheus — Alerting & Alertmanager](https://prometheus.io/docs/alerting/latest/overview/)

## 관련 문서

- [[Cardinality|카디널리티 관리]]
- [[Thanos|Thanos (장기 보존, 글로벌 뷰)]]
- [[RED-USE-Method|RED / USE method]]
- [[Container-Monitoring|컨테이너 모니터링 (node_exporter, cAdvisor)]]
- [[CloudWatch|CloudWatch (AWS 매니지드 대안)]]
- [[SLI-SLO|SLI/SLO (burn rate 알람)]]
