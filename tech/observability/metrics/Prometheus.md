---
tags: [observability, prometheus, metrics, promql, time-series, monitoring]
status: done
verified_at: 2026-09-30
category: "관측가능성(Observability)"
aliases: ["Prometheus", "프로메테우스", "PromQL", "Alertmanager"]
---

# Prometheus

오픈소스 시계열(time-series) 모니터링의 사실상 표준. **pull 기반 수집 + 다차원 라벨 + PromQL**이 핵심이고, Grafana로 시각화, Alertmanager로 알람을 붙여 GPL(Grafana, Prometheus, Loki) 스택을 이룬다. [[Incident-Detection-Logging]]

## 동작 모델 — Pull 기반

Prometheus가 대상의 `/metrics` 엔드포인트를 **주기적으로 긁어온다(scrape)**. 푸시가 아니다.

- **장점**: 대상의 생존 여부를 수집 자체로 알 수 있고(up 메트릭), 대상이 수집기를 몰라도 됨, 중앙에서 수집 주기 제어.
- **Service Discovery**: 쿠버네티스, EC2, Consul 등에서 대상을 자동 발견해 동적 환경에 대응.
- **Exporter**: 직접 계측 못 하는 대상은 exporter가 변환한다. `node_exporter`(호스트), `cAdvisor`(컨테이너), DB/Redis exporter 등 ([[Container-Monitoring|컨테이너 모니터링]]). 대상이 많고 자주 변하면 하나의 exporter가 여러 대상을 긁는 [[Multi-Target-Exporter|멀티타겟 Exporter + 서비스 디스커버리]]로 확장.
- 단명하는 배치 잡은 pull이 어려워 **Pushgateway**로 예외 처리.

## 데이터 모델 — 다차원 라벨

메트릭은 `이름{라벨=값, ...}` 형태의 시계열이다.

```
http_requests_total{method="POST", route="/order", status="500"} 42
```

라벨 조합 하나가 **별도 시계열**이다. 그래서 라벨 값이 무한히 늘면 시계열이 폭발한다 → [[Cardinality|카디널리티 관리]]가 Prometheus 운영의 핵심 제약.

메트릭 타입 4종: **Counter**(단조 증가), **Gauge**(오르내림), **Histogram**(버킷 분포, P95 계산용), **Summary**(분위수 사전 계산).

## PromQL — 쿼리로 신호를 만든다

### 기본 연산

Micrometer의 tag가 Prometheus의 label이다. 한 줄 끝의 숫자가 그 series의 값이다.

| 연산 | 형태 | 뜻 |
|---|---|---|
| label matcher | `=`, `!=`, `=~`, `!~` | 같음, 다름, 정규식 일치, 정규식 불일치 |
| 산술 | `+ - * / % ^` | label set이 같은 series끼리 짝지어 계산하고 결과에서 metric 이름은 빠진다 |
| 집계 | `sum`, `sum by (label)`, `count`, `topk(k, ...)` | 전체 합, label별 합(SQL `GROUP BY`처럼), 결과 series 수, 값이 큰 k개 |
| 과거 시점 | `offset 10m` | 평가 시점보다 10분 전 값 |
| 구간 | `[1m]` | series마다 최근 1분의 sample 전부(range vector) |

```promql
http_server_requests_seconds_count{uri="/log", method="GET"}
http_server_requests_seconds_count{method=~"GET|POST", uri!~"/actuator.*"}
node_filesystem_size_bytes - node_filesystem_avail_bytes
sum by (method, status) (http_server_requests_seconds_count)
topk(3, http_server_requests_seconds_count)
sum(http_server_requests_seconds_count offset 10m)
```

- 정규식은 전체 일치다. `env=~"foo"`는 `^foo$`로 해석된다.
- selector에는 metric 이름이나 빈 문자열과 일치하지 않는 matcher가 하나 이상 있어야 한다. `{uri!~"/actuator.*"}`, `{job=~".*"}`처럼 빈 문자열과도 일치하는 matcher만 있으면 거부되므로 metric 이름과 함께 쓴다.
- `offset`은 selector 바로 뒤에 붙인다. `sum(x offset 10m)`은 되지만 `sum(x) offset 10m`은 문법 오류다.
- range query(그래프)는 결과로 scalar와 instant vector만 받는다. range vector는 그대로 그릴 수 없어 `rate()`, `increase()` 같은 함수로 instant vector로 바꾼다. Table 보기(instant query)에서는 펼친 sample을 볼 수 있다.
- range query는 step마다 instant query를 다시 실행하는 것과 같다. 그래서 `topk`가 고르는 series가 step마다 달라져 그래프에 k개보다 많은 선이 보일 수 있다.
- Prometheus 3.0부터 range는 왼쪽 열림, 오른쪽 닫힘 구간이다(2.x는 양쪽 닫힘). 왼쪽 경계와 timestamp가 같은 sample은 빠지므로 2.x에서 옮긴 query는 결과 sample 수가 달라질 수 있다.
- Prometheus UI의 Graph와 Table은 저장된 과거 데이터까지 보여 주지만, 여러 panel을 묶은 dashboard는 Grafana로 만든다([[Spring-Boot-Micrometer-Prometheus-Grafana|Spring Boot 모니터링 파이프라인]]).

### 신호 예시

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

- 로컬 TSDB는 **단일 노드, 보존 기간 제한**(시간과 용량 보존을 모두 지정하지 않으면 기본 15일). 복제되지 않아 장기 보존/글로벌 뷰/HA는 기본 제공 안 됨.
- 해법: **remote-write로 외부 저장**(Thanos, Mimir, Cortex)으로 보냄. [[Thanos]], [[Long-Term-Retention]]
- 메트릭 전용 — 로그는 Loki, 추적은 Tempo/Jaeger로 분리. [[OpenTelemetry]]

## 흔한 함정

- 고카디널리티 라벨(user_id, request_id) → 시계열 폭발, OOM ([[Cardinality]])
- 로컬 보존만 믿고 장기 데이터 유실 → remote-write/Thanos 필요
- raw 임계값 알람 남발 → 알람 피로 (burn rate로 전환, [[SLI-SLO]])
- Histogram 버킷을 부적절히 잡아 분위수 부정확
- Pull 모델에서 방화벽/네트워크로 scrape 실패를 놓침 — NAT 뒤 대상은 에이전트 push 토폴로지로 우회 ([[Network-Traffic-Monitoring|네트워크 트래픽 모니터링]])

## 면접 체크포인트

- Pull vs Push 모델의 트레이드오프, exporter/service discovery 역할
- 라벨 기반 다차원 모델과 카디널리티 제약의 관계
- `rate()`/`histogram_quantile()`로 RED 지표 만드는 법
- label matcher, `sum by`, `offset`의 쓰임과 range vector를 그래프로 그리려면 함수가 필요한 이유
- Recording/Alerting rule, Alertmanager의 그룹핑/침묵
- 로컬 TSDB의 한계와 Thanos/remote-write로 푸는 방식

## 출처

- [Prometheus — Overview / Data model / Querying](https://prometheus.io/docs/introduction/overview/)
- [Prometheus — Alerting & Alertmanager](https://prometheus.io/docs/alerting/latest/overview/)
- [Prometheus — Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus — Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus — Storage](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus — Migration to Prometheus 3.0](https://prometheus.io/docs/prometheus/latest/migration/)
- [인프런, 김영한, 프로메테우스 - 기본 기능](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148155)
- [인프런, 김영한, 정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148162)

## 관련 문서

- [[Cardinality|카디널리티 관리]]
- [[Thanos|Thanos (장기 보존, 글로벌 뷰)]]
- [[RED-USE-Method|RED / USE method]]
- [[Container-Monitoring|컨테이너 모니터링 (node_exporter, cAdvisor)]]
- [[CloudWatch|CloudWatch (AWS 매니지드 대안)]]
- [[SLI-SLO|SLI/SLO (burn rate 알람)]]
