---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Model custom telemetry와 자동 지표의 구분

core ML model은 custom log와 span을 제공하고 user-defined metric은 제공하지 않는다. platform은 invocation별 total duration span과 request log를 자동 생성한다. LLM adapter의 별도 telemetry와 혼동하지 않는다.

opentelemetry-api와 opentelemetry-sdk를 model environment에 명시적으로 추가한다. outbound network request 자동 instrumentation에는 opentelemetry-instrumentation이 필요하다. package 설치가 실제 모든 outbound library instrumentation을 자동 보장하는 것은 아니다.

Foundry가 설정한 global logger/tracer provider를 사용한다. Python logging은 Foundry로 route되지만 third-party logging/tracing도 global provider에서 얻은 logger/tracer로 연결해야 한다. preprocessing/inference를 custom span으로 나누면 total latency 중 원인을 비교할 수 있다.

telemetry는 Ontology/AIP Observability에서 확인한다. 이 문서는 실제 log 수집/retention이나 model 운영을 실행 검증한 결과가 아니다. training metric은 Experiment, post-training evaluation metric은 Evaluation의 별도 artifact로 기록한다.

## 출처

- [Palantir, instrumentation-telemetry](https://www.palantir.com/docs/foundry/integrate-models/instrumentation-telemetry)

## 관련 문서

- [[Palantir-Model-Experiments-API]]
- [[Palantir-Container-Model-Contracts]]
