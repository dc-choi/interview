---
tags: [spring-boot, micrometer, prometheus, grafana, metrics]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Micrometer Prometheus Grafana", "Spring Boot Metrics Pipeline", "Spring 모니터링 파이프라인"]
---

# Spring Boot, Micrometer, Prometheus와 Grafana

이 조합은 하나의 제품이 아니다. Micrometer가 application을 계측하고, Actuator가 registry data를 노출하며, Prometheus가 시계열을 수집/저장하고, Grafana가 query 결과를 시각화한다.

```text
application instrumentation
  -> Micrometer MeterRegistry
  -> Actuator /actuator/prometheus
  -> Prometheus scrape and TSDB
  -> PromQL
  -> Grafana dashboard/alert
```

## 각 component의 책임

| component | 책임 | 책임이 아닌 것 |
|---|---|---|
| Micrometer | vendor-neutral meter/observation API | 장기 metric 저장 |
| Actuator | management endpoint와 auto instrumentation | 중앙 수집/대시보드 |
| Prometheus | scrape, TSDB, PromQL, rule evaluation | application 내부 계측 자동 설계 |
| Grafana | data source query, dashboard, alert UI | 원본 metric 생성 |

backend를 바꿔도 domain metric의 의미와 tag contract는 남는다. facade가 storage migration 비용을 줄이지만 이름, histogram과 tag 의미까지 자동 호환해 주지는 않는다.

## Spring Boot에서 Prometheus로

Prometheus registry dependency를 추가하고 endpoint를 명시적으로 expose한다.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
```

Prometheus는 application instance의 `/actuator/prometheus`를 주기적으로 scrape한다. endpoint가 보인다는 사실과 Prometheus target이 `UP`이라는 사실을 각각 검증한다.

Micrometer 이름 `jvm.memory.max`는 backend naming convention에 따라 Prometheus에서 `jvm_memory_max`처럼 보일 수 있다. Actuator `metrics` selector에는 Micrometer 원래 이름을 사용한다.

## 자동 제공 metric

classpath와 application 구성에 따라 다음 binder/instrumentation이 자동 등록될 수 있다.

- JVM memory, GC, thread, class loading
- process CPU와 uptime, system/disk
- HTTP server request count/latency/status
- DataSource pool usage
- logging event count
- embedded server thread/session

자동 제공된다는 이유로 모두 dashboard에 올리지 않는다. 사용자 증상과 resource saturation을 설명하는 signal을 선택한다.

## Counter와 Gauge를 읽는 법

- Counter는 누적 사건 수다. instance 재시작 때 reset될 수 있으므로 절대값보다 `rate()`/`increase()`로 구간 변화를 본다.
- Gauge는 현재 상태다. pool active, queue depth, 재고처럼 오르내리는 값에 쓴다.
- `irate()`는 최근 두 sample의 민감한 변화를 보여주므로 빠른 graph에 제한하고 alert/느린 counter에는 보통 `rate()`를 쓴다.
- backend가 만든 suffix와 unit 변환을 확인하고 서로 다른 instance의 raw counter를 그대로 비교하지 않는다.

```promql
sum by (uri) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))

sum(jvm_memory_used_bytes{area="heap"})
  / sum(jvm_memory_max_bytes{area="heap"})
```

`uri`에는 정규화된 route template을 사용한다. 실제 path/user/request ID를 tag로 넣으면 cardinality가 폭발한다.

## Grafana dashboard

Grafana에 Prometheus data source를 연결하고 panel마다 질문을 하나씩 둔다.

- traffic/error/latency는 RED 관점으로 묶는다.
- CPU/memory/thread/pool은 resource saturation 관점으로 본다.
- variable은 service/instance/environment처럼 bounded dimension에 사용한다.
- 공유 dashboard는 출발점이다. metric name, label과 version이 현재 application과 맞는지 검증한다.
- dashboard JSON과 alert rule을 version control해 수동 UI drift를 줄인다.

## metric으로 문제 좁히기

| 증상 | 먼저 볼 metric | 다음 확인 |
|---|---|---|
| 응답 지연 | HTTP latency/error/rate | thread/pool, downstream trace |
| CPU 상승 | process/system CPU, request rate | hot method profile, GC |
| memory 압박 | heap used/max, GC pause | allocation/heap dump |
| DB 대기 | pool active/pending/max | query latency, DB connection |
| error 증가 | status별 request, log event | trace와 structured log |

metric은 원인을 증명하기보다 시간과 범위를 좁힌다. 순간 graph만 보고 memory leak이나 DB 장애를 단정하지 않는다.

## 출처

- [Spring Boot 4.1, Metrics](https://docs.spring.io/spring-boot/reference/actuator/metrics.html)
- [Spring Boot 4.1, Observability](https://docs.spring.io/spring-boot/reference/actuator/observability.html)
- [Micrometer Reference](https://docs.micrometer.io/micrometer/reference/)
- [Prometheus, Query Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Grafana, Prometheus Data Source](https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/)
- metric 기초: [Micrometer](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148148), [metric 확인](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148149), [자동 metric](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148150), [Prometheus/Grafana](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148151)
- Prometheus: [설치](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148152), [application 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148153), [scrape 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148154), [기본 query](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148155), [Gauge/Counter](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148156)
- Grafana: [설치](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148157), [연동](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148158), [dashboard](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148159), [공유 dashboard](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148160), [문제 확인](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148161), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148162)

## 관련 문서

- [[Prometheus|Prometheus]]
- [[RED-USE-Method|RED/USE method]]
- [[Cardinality|Metric cardinality]]
- [[Spring-Boot-Custom-Metrics-and-Monitoring|Custom metric과 운영 monitoring]]
