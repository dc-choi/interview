---
tags: [observability, metrics, tracing, exemplar, prometheus, grafana, correlation]
status: done
verified_at: 2026-08-21
category: "관측가능성(Observability)"
aliases: ["Exemplars", "Exemplar", "메트릭-트레이스 연결"]
---

# Exemplar — 메트릭에서 트레이스로

메트릭은 저카디널리티여야 하므로 `trace_id`를 라벨에 넣을 수 없다. 그런데 P99가 튀었을 때 정작 필요한 것은 **그 튄 요청 한 건의 트레이스**다. Exemplar가 이 모순을 푼다. 집계 수치 옆에 개별 요청의 참조를 따로 매달아, 라벨을 늘리지 않고 대표 샘플로 내려갈 수 있게 한다. Grafana 문서는 exemplar를 "a specific trace representative of measurement taken in a given time interval"로 정의한다.

## 라벨과 exemplar는 저장 위치가 다르다

| 구분 | 라벨 | Exemplar |
|---|---|---|
| 위치 | 시계열의 식별 키 일부 | 시계열의 한 샘플에 붙는 참조 |
| 증가 방식 | 값 종류의 곱으로 시계열 수 증가 | 시계열 수 불변, 별도 버퍼에 적재 |
| 저장 | TSDB 인덱스와 시계열 | 고정 크기 순환 버퍼(메모리) |
| 쿼리 | PromQL 매칭과 그룹핑 대상 | 집계 대상 아님, 그래프 위 점으로 조회 |

이것이 **traceId를 메트릭 라벨에 넣지 않는다**와 **3축을 traceId로 연결한다**가 동시에 성립하는 이유다. 연결의 매개는 라벨이 아니다. 메트릭은 exemplar, 로그는 본문 또는 structured metadata, 트레이스는 자기 자신이 traceId를 들고 있다. [[Cardinality]]

## 노출 형식 — OpenMetrics

Exemplar는 OpenMetrics 텍스트 형식에서 도입됐다. 스펙상 카운터의 total과 히스토그램, gauge histogram의 버킷 값에 붙을 수 있다. 문법은 값 뒤에 `#`을 두고 라벨셋, 값, 선택적 타임스탬프를 잇는다.

```
http_request_duration_seconds_bucket{le="0.1"} 8 # {trace_id="a1b2c3"} 0.054 1520879607.789
```

- 붙일 수 있는 타입이 제한적이다. Counter total과 Histogram, GaugeHistogram의 버킷이 대상이고 Gauge는 아니다.
- **exemplar 라벨셋의 라벨 이름과 값 길이 합은 128 UTF-8자를 넘을 수 없다.** traceId와 spanId 정도만 담으라는 제약이다.
- 노출 자체가 OpenMetrics 형식을 타야 하므로, 클라이언트 라이브러리와 스크레이프 양쪽이 지원해야 한다.

## Prometheus에서 켜기

Exemplar 저장은 기능 플래그로 켠다.

```
prometheus --enable-feature=exemplar-storage
```

- 저장 구조는 **모든 시계열을 대상으로 하는 고정 크기 순환 버퍼**다. 버퍼가 차면 오래된 exemplar부터 밀린다. 즉 exemplar는 전수 보존이 아니라 최근 표본이다.
- 버퍼 크기는 설정의 `storage`/`exemplars` 블록에서 exemplar 개수로 정한다.
- 활성화 시 exemplar가 WAL에도 기록되어 WAL 보존 기간 동안 로컬에 남는다.
- `trace_id`만 담은 exemplar 하나가 메모리에서 대략 100바이트 수준이다.

## Grafana에서 잇기

### 메트릭 → 트레이스

Prometheus 데이터소스 설정에서 exemplar를 켜면, Explore와 대시보드의 그래프 위에 exemplar가 별표로 표시된다. 별에 커서를 올리면 trace ID가 보이고 옆 버튼을 누르면 트레이스 데이터소스로 질의가 넘어간다. Grafana 문서 기준으로 **exemplar 지원은 Prometheus 데이터소스에 한정**된다.

### 로그 → 트레이스

Loki 데이터소스의 **Derived fields**가 같은 역할을 한다. 로그에서 새 필드를 뽑아 그 값으로 링크를 만드는 기능이다.

- 추출 방식은 두 가지다. 캡처 그룹 하나짜리 정규식으로 로그 본문에서 뽑거나, 이미 있는 라벨(인덱스 라벨, 파싱된 라벨, structured metadata)에 매칭한다. 라벨 매칭은 `traceid`와 `trace_id` 같은 표기 흔들림을 정규식 하나로 흡수할 수 있다.
- Internal link를 켜고 트레이스 데이터소스를 지정하면 로그 줄에서 트레이스로 바로 넘어간다. [[Loki]]

### 트레이스 → 로그

역방향은 트레이스 데이터소스 쪽 설정이다. 스팬의 traceId와 서비스, 시간 범위로 LogQL 질의를 조립해 로그로 되돌아간다. 세 방향이 다 열려야 이동이 끊기지 않는다.

## 3축 연결 설계 정리

| 신호 | traceId를 두는 자리 | 다른 축으로 가는 수단 |
|---|---|---|
| 메트릭 | 라벨 아님. 샘플에 붙는 exemplar | exemplar 클릭 → 트레이스 |
| 로그 | 본문 필드 또는 structured metadata | derived field 링크 → 트레이스 |
| 트레이스 | 스팬 자체의 식별자 | traceId로 로그 재질의 |

전제는 traceId가 애초에 서비스 경계를 넘어 전파되고 있어야 한다는 것이다. [[OpenTelemetry|W3C trace context 전파]]와 [[Correlation-ID]]가 깔려 있어야 exemplar든 derived field든 의미가 생긴다.

## 운영 체크포인트

- Exemplar는 표본이다. 순환 버퍼 크기와 WAL 보존을 넘어가면 사라지므로, 장기 조사 근거로 삼지 않는다.
- 계측 라이브러리가 exemplar를 붙이려면 관측 시점에 활성 스팬 컨텍스트가 있어야 한다. 트레이스 샘플링에서 버려진 요청은 exemplar가 가리켜도 트레이스가 없을 수 있다. [[Log-Sampling]]
- remote-write나 장기 저장소로 넘길 때 exemplar 전달 지원 여부는 사용하는 스택과 버전에 따라 다르므로 별도 확인이 필요하다. [[Thanos]]
- 128자 제한 때문에 exemplar에 부가 컨텍스트를 욱여넣지 않는다. 상세는 트레이스와 로그가 갖는다.

## 흔한 함정

- exemplar를 쓰면 라벨 카디널리티가 늘어난다고 오해 → 시계열 수는 그대로다
- 기능 플래그를 안 켠 채 Grafana에서 별표가 안 보인다고 데이터소스만 뒤짐
- Gauge에 exemplar를 기대 → 스펙상 대상이 아니다
- exemplar만 믿고 traceId 전파를 안 깔아둠 → 링크가 열려도 도착지가 비어 있음
- 트레이스 샘플링률이 낮은데 exemplar 링크만 보고 데이터가 유실됐다고 판단

## 면접 체크포인트

- 라벨과 exemplar의 저장 위치 차이, 그래서 카디널리티가 늘지 않는 이유
- exemplar가 붙을 수 있는 메트릭 타입과 128자 제한
- Prometheus에서 켜는 방법과 순환 버퍼라는 저장 특성의 함의
- 메트릭 → 트레이스, 로그 → 트레이스, 트레이스 → 로그 세 방향을 각각 무엇이 잇는가
- 신호별로 traceId가 앉는 자리(라벨 금지, 본문 또는 structured metadata, 스팬)

## 출처

- [OpenMetrics specification v1.0.0 — Exemplars](https://github.com/prometheus/OpenMetrics/blob/v1.0.0/specification/OpenMetrics.md)
- [Prometheus — Feature flags (exemplar-storage)](https://prometheus.io/docs/prometheus/latest/feature_flags/)
- [Prometheus — Exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [Grafana — Introduction to exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)
- [Grafana — Configure the Loki data source (Derived fields)](https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/)

## 관련 문서

- [[Cardinality|카디널리티 관리 (라벨에 두지 말 것)]]
- [[Prometheus|Prometheus (라벨 모델과 histogram)]]
- [[Loki|Loki (structured metadata, derived field 대상)]]
- [[OpenTelemetry|OpenTelemetry (trace context 전파)]]
- [[Correlation-ID|Correlation ID / Trace ID]]
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]]
- [[Application-Performance-Monitoring|APM (P99에서 개별 요청으로)]]
