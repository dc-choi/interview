---
tags: [observability, logging, tracing, request-context, cross-cutting-concern]
status: done
verified_at: 2026-08-04
category: "관측가능성(Observability)"
aliases: ["Application Method Trace", "Method Call Logging", "애플리케이션 호출 추적"]
---

# 애플리케이션 method 호출 추적 설계

Method trace는 요청 하나가 controller, service와 repository를 통과한 흐름, 실행 시간과 실패 지점을 연결한다. 직접 만든 logger가 목적이 아니라 **호출 context를 잃지 않고 업무 동작을 훼손하지 않는 관측 계약**이 목적이다.

## 요구사항을 신호로 바꾼다

| 요구사항 | 필요한 신호 |
|---|---|
| 요청별 호출 구분 | request/trace ID |
| 중첩 호출 확인 | parent/child 또는 depth |
| 병목 확인 | start/end와 duration |
| 정상/예외 구분 | status와 exception type |
| 업무 영향 금지 | 원래 return/exception 보존 |

모든 public method를 무조건 출력하면 volume, PII와 noise가 폭발한다. use case 경계나 명시적 annotation으로 대상을 제한하고, 이미 HTTP/DB tracing이 있는 지점은 중복 계측하지 않는다.

## 수동 계측이 드러내는 문제

```java
TraceStatus status = trace.begin("OrderService.order()");
try {
    var result = order();
    trace.end(status);
    return result;
} catch (Exception e) {
    trace.exception(status, e);
    throw e;
}
```

이 구조는 동작 원리를 보여주지만 모든 method에 복사하면 다음 비용이 생긴다.

- 정상/예외 종료를 빼먹을 수 있다.
- 관측 code가 업무 code보다 길어진다.
- context parameter가 호출 계층 전체 signature를 오염시킨다.
- 적용 범위를 바꾸려면 원본 code를 반복 수정한다.

예외를 기록한 뒤 삼키거나 다른 예외로 무심코 바꾸면 application semantics가 달라진다. 관측 layer는 원래 예외, return value와 cancellation을 보존해야 한다.

## context 전달 선택

| 방식 | 장점 | 한계 |
|---|---|---|
| 명시적 parameter | 흐름이 code에 보이고 test가 쉽다 | 중간 method signature 전파 |
| `ThreadLocal` | imperative 동기 호출에서 signature가 단순 | pool 정리, async/reactive 전파 문제 |
| framework context | 표준 instrumentation과 propagation | framework/runtime 경계 이해 필요 |

새 system은 OpenTelemetry span/context와 structured logging을 우선 검토한다. 직접 만든 depth log는 작은 동기 애플리케이션의 학습/진단에는 유용하지만 process/queue를 넘는 distributed trace를 대신하지 못한다.

## 운영 안전성

- ID는 log field로 남기고 message 문자열을 parsing contract로 만들지 않는다.
- argument/return 전체를 기본 기록하지 않는다. token, password와 개인정보 allowlist를 둔다.
- duration은 monotonic clock을 사용하고 단위를 명시한다.
- exception class와 normalized error code를 기록하되 stack trace 중복을 제어한다.
- sampling, level과 retention을 traffic 규모에 맞춘다.
- logger 장애가 업무 transaction을 실패시키지 않게 한다.

## 더 나은 분리로 가는 흐름

```text
manual try/catch
  -> template/callback
  -> proxy/interceptor
  -> AOP or standard telemetry instrumentation
```

각 단계의 목표는 원본 business code 수정 없이 부가 기능을 적용하는 것이다. 자동화가 커질수록 적용 대상 pointcut과 비적용 경계를 더 명확히 test해야 한다.

## 출처

- [OpenTelemetry, Context](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry, Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- 과정 안내: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94381), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94404)
- 예제: [project](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94407), [V0](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94408), [요구사항](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94409), [V1 개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94410), [V1 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94411), [V2 동기화](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94412), [V2 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94413), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94414)

## 관련 문서

- [[Structured-Logging|Structured logging]]
- [[Correlation-ID|Correlation ID]]
- [[OpenTelemetry|OpenTelemetry]]
- [[Java-ThreadLocal-and-Request-Context|Java ThreadLocal과 request context]]
