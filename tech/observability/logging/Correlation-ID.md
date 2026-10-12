---
tags: [observability, logging, tracing]
status: done
verified_at: 2026-08-25
category: "관측가능성(Observability)"
aliases: ["Correlation ID", "Trace ID"]
---

# Correlation ID / Trace ID

## 개념

분산 환경에서 요청 하나가 여러 서비스를 거칠 때, 흩어진 로그를 한 요청으로 묶는 식별자다. 로그를 중앙 적재해도 식별자가 없으면 어떤 로그가 어떤 요청의 것인지 알 수 없으므로, 진입 시점에 ID를 만들어 모든 로그와 하위 호출에 실어 보낸다.

이름이 혼용되지만 실무 구분은 둘이다.

- **Correlation ID (Request ID)** — 요청 단위 식별자 하나를 비표준 관례 헤더인 `X-Request-ID`, `X-Correlation-ID` 등으로 전파한다. 로그를 요청 단위로 묶는 데는 이것으로 충분하다.
- **Trace ID + Span ID** — trace-id가 요청 전체를, span-id가 그 안의 작업 하나를 가리킨다. W3C `traceparent`는 호출자가 만든 span-id를 `parent-id` 필드에 담고, 수신 서비스는 같은 trace-id 아래 새 span-id를 만든다. 서비스 간 호출 관계와 구간별 소요 시간까지 복원할 수 있다.

분산 트레이싱을 쓰는 환경이라면 trace-id를 로그의 상관 키로 재사용할 수 있다. 별도 request-id는 트레이스와 독립된 요청 식별 요구가 있을 때만 둔다.

## 생성과 전파 규칙

- **신뢰 경계에서 검증한다** — ID가 없거나 형식과 길이 규칙을 통과하지 못하면 진입점에서 새로 만든다. W3C `traceparent`는 trace-id와 parent-id가 유효하지 않으면 무시하고 새 trace를 시작한다. 보안 경계에서는 정책에 따라 유효한 trace도 다시 시작할 수 있다.
- **종류에 맞게 전파한다** — custom correlation ID는 검증한 같은 값을 하위 호출에 싣는다. 분산 트레이싱은 trace-id를 유지하되 서비스마다 새 span-id를 만들고, 다음 호출의 `parent-id`를 현재 span-id로 갱신한다.
- **Correlation ID는 응답에도 돌려준다** — 응답 헤더로 반환하면 클라이언트 오류 문의를 받았을 때 그 ID로 바로 해당 요청의 로그를 찾을 수 있다.
- **비동기 경계도 잇는다** — 메시지 큐로 넘어갈 때 메시지 속성에 실어 보내지 않으면 컨슈머부터 추적이 끊긴다 ([[OpenTelemetry]]의 SQS 전파 예).

## 로그에 잇기

ID는 헤더로 도는 것만으로는 소용이 없고, 모든 로그 레코드에 필드(`trace_id`, `request_id`)로 박혀야 검색이 된다. 요청 컨텍스트 전파(AsyncLocalStorage, MDC)와 필드 명명 규약은 [[Structured-Logging|Structured logging]]이 정본이다.

## 수집 이후에도 상관 필드의 이름을 맞춘다

요청에 같은 ID를 넣었어도 수집과 변환 과정에서 필드 이름이 달라지면 분석 도구가 두 데이터를 연결하지 못할 수 있다. 2026-10-13 Splunk Observability Cloud의 Related Content 문서 기준, APM의 `trace_id`와 로그의 `trace.id`는 값이 같아도 자동으로 연결되지 않는다. 계측이나 필드 매핑에서 키 이름을 맞춰야 한다.

요청 연결과 인프라 연결의 키도 구분한다. Splunk에서 특정 Kubernetes pod로 연결할 때는 `k8s.pod.name`뿐 아니라 `k8s.cluster.name`으로도 범위를 좁혀야 한다. 클러스터가 다르면 같은 pod 이름이 있을 수 있기 때문이다. 이 필드명과 동작은 해당 제품의 계약이며 모든 관측 도구의 공통 규격으로 일반화하지 않는다.

설정 검증에서는 식별 가능한 요청 하나를 만들고 원본 로그, 수집 후 필드, 저장된 trace와 화면의 연결 결과를 차례로 대조하는 방식을 권한다. 로그와 trace가 각각 조회되는 것만으로 상관 연결까지 성공했다고 판단하지 않는다. 이는 문서 기반 점검안이며 실제 환경에서 재현한 결과는 아니다. 이 절만 대조했으므로 기존 `verified_at`은 유지한다.

## 관련 문서
- [[Structured-Logging|Structured logging]]
- [[Log-Pipeline|Log Pipeline]]
- [[OpenTelemetry|OpenTelemetry (W3C trace context 전파)]]

## 출처

- [Splunk, Related Content in Splunk Observability Cloud](https://help.splunk.com/en/splunk-observability-cloud/data-tools/related-content) — 2026-10-13 상관 필드 이름과 Kubernetes 클러스터 범위 조건 대조
- [W3C, Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry, Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
