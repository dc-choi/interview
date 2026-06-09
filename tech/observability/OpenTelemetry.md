---
tags: [observability, opentelemetry, otel, distributed-tracing, trace-context]
status: done
category: "관측가능성(Observability)"
aliases: ["OpenTelemetry", "OTel", "분산 트레이싱", "Distributed Tracing", "Trace Context Propagation", "W3C traceparent"]
---

# OpenTelemetry와 분산 트레이싱

마이크로서비스에서 요청 하나가 여러 서비스를 거치면, 로그만으로는 "어디서 느려졌나"를 추적할 수 없다. **분산 트레이싱**이 요청의 전체 여정을 하나로 잇고, **OpenTelemetry(OTel)**가 그것을 벤더 중립 표준으로 수집한다.

## OpenTelemetry란

CNCF 표준이자 SDK 모음으로, **추적(traces), 메트릭(metrics), 로그(logs) 세 신호를 한 규격**으로 다룬다. OpenTracing과 OpenCensus를 통합한 후속이다. 특정 벤더(Datadog, Jaeger 등)에 코드를 묶지 않는 게 핵심 가치다.

- **SDK/API**: 앱에 심는 계측 라이브러리
- **Collector**: 받고(receive) 가공하고(process) 내보내는(export) 중간 계층. 앱과 백엔드를 분리해, 백엔드를 바꿔도 앱 코드는 그대로
- **OTLP**: OTel의 표준 전송 프로토콜
- **Exporter**: Jaeger, Tempo, Prometheus, Datadog 등으로 송출

## 트레이싱 모델 — Trace와 Span

- **Trace**: 요청 하나의 전체 여정.
- **Span**: 그 안의 한 작업(예: HTTP 핸들, DB 쿼리). `trace_id`, `span_id`, `parent_span_id`, 속성(attributes), 이벤트를 가진다.
- 스팬들이 부모-자식으로 **트리**를 이뤄 어디서 시간이 쓰였는지 보인다. 로그의 [[Correlation-ID|correlation/trace id]]가 이 trace_id와 연결되면 로그와 트레이스를 오갈 수 있다.

## 컨텍스트 전파 — 끊기면 트레이스가 깨진다

서비스 A가 B를 부를 때 **같은 trace에 속하도록 컨텍스트를 넘겨야** 한다. 표준은 **W3C Trace Context**의 `traceparent` 헤더다.

```
traceparent: 00-<32hex trace-id>-<16hex span-id>-<2hex flags>
```

전파 경로는 HTTP 헤더만이 아니다. **gRPC 메타데이터, 그리고 메시지 큐**까지 넘겨야 비동기 흐름이 안 끊긴다.

```typescript
// SQS 메시지로 trace context 전파 — 프로듀서가 inject, 컨슈머가 extract
import { propagation, context } from '@opentelemetry/api';
const carrier: Record<string, string> = {};
propagation.inject(context.active(), carrier);
// carrier.traceparent 를 SQS MessageAttributes에 실어 보냄
// 컨슈머: propagation.extract(context.active(), carrier) 로 같은 trace에 이어붙임
```

이 전파를 안 하면 프로듀서 → 큐 → 컨슈머가 **세 개의 끊긴 trace**로 보여 발주 자동화 같은 비동기 파이프라인을 추적할 수 없다. [[SQS]], [[MQ-Kafka-Consumer]]

## 계측 — 자동 vs 수동

- **자동 계측**: 코드 변경 없이 인기 라이브러리(HTTP, Express/Nest, pg, ioredis 등)를 패치해 스팬 자동 생성. `@opentelemetry/auto-instrumentations-node`.
- **수동 계측**: 비즈니스 로직 구간에 직접 스팬을 만들어 도메인 의미를 더한다.

```typescript
// NestJS/Node.js 부팅 시 SDK 기동
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://collector:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

## 샘플링 — 전부 저장할 수 없다

- **Head 기반**: trace 시작 시 보존 여부 결정. 싸지만 **드문 에러 trace를 놓칠 수 있다**.
- **Tail 기반**: trace가 끝난 뒤 Collector에서 결정 → **에러나 느린 trace만 골라 보존** 가능. 대신 버퍼링 비용.

## 흔한 함정

- **컨텍스트 전파 누락**(특히 비동기 큐) → trace가 끊김
- 고카디널리티 속성 남발 → 저장 비용 폭발([[Cardinality|카디널리티 관리]])
- 과한 샘플링으로 에러 trace 유실 → tail 샘플링 고려
- Collector를 단일 인스턴스로 → SPOF. agent(노드) + gateway(중앙) 2단 구성

## 면접 체크포인트

- OTel이 세 신호를 통합하고 벤더 중립인 점, Collector가 앱과 백엔드를 분리하는 이유
- Trace/Span 구조와 trace_id가 로그 correlation id와 연결되는 방식
- W3C `traceparent` 전파, 특히 메시지 큐로 전파해 비동기 trace를 잇는 법
- 자동 vs 수동 계측, head vs tail 샘플링의 트레이드오프
- 컨텍스트 전파 누락이 trace를 깨뜨리는 시나리오

## 출처

- [OpenTelemetry 공식 문서 — Concepts, Instrumentation](https://opentelemetry.io/docs/)
- [W3C Trace Context 명세](https://www.w3.org/TR/trace-context/)

## 관련 문서

- [[Correlation-ID|Correlation ID / Trace ID (로그 상관)]]
- [[Application-Performance-Monitoring|APM (OTel, P95/P99)]]
- [[SLI-SLO|SLI/SLO (지연 SLI는 trace에서)]]
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]]
- [[SQS|SQS (메시지 속성으로 trace 전파)]]
- [[Structured-Logging|구조화 로깅]]
