---
tags: [observability, logging, tracing, request-context, cross-cutting-concern]
status: done
verified_at: 2026-09-30
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
| 명시적 parameter | 흐름이 code에 보이고 test가 쉽다 | 중간 method와 interface signature 전파, 진입점마다 첫 context 생성 |
| `ThreadLocal` | imperative 동기 호출에서 signature가 단순 | pool 정리, async/reactive 전파 문제 |
| framework context | 표준 instrumentation과 propagation | framework/runtime 경계 이해 필요 |

새 system은 OpenTelemetry span/context와 structured logging을 우선 검토한다. 직접 만든 depth log는 작은 동기 애플리케이션의 학습/진단에는 유용하지만 process/queue를 넘는 distributed trace를 대신하지 못한다.

## parameter 없이 depth를 추적하는 holder

명시적 parameter 방식은 첫 호출이 새 ID를 만들고(`begin`) 이후 계층이 이전 ID를 받아 level만 올린다(`beginSync(previous, message)`). 비용은 signature 전파에서 끝나지 않는다.

- 경로의 method signature와 interface가 모두 바뀌고, 그 interface에 의존하는 code도 함께 바뀐다.
- 호출자가 자신이 첫 호출인지 알아야 두 API 중 하나를 고른다. test나 batch처럼 controller를 거치지 않는 진입점에서 service를 먼저 부르면 넘길 context가 없다.

holder 방식은 이 판단을 구현체 안으로 옮긴다.

```text
TraceId = (transaction id, level)
  next: level + 1, previous: level - 1, first: level == 0
begin         -> sync: holder가 비었으면 새 TraceId(level 0), 있으면 next로 교체
end/exception -> 결과 기록 후 release: first면 holder 비우기(ThreadLocal은 remove), 아니면 previous로 교체
```

controller, service, repository로 들어가며 level이 0, 1, 2로 오르고, 반환하며 2, 1, 0으로 내려온 뒤 holder가 비워진다. 호출자는 `begin` 하나만 쓰고 signature도 그대로다. holder를 singleton field에 두면 동시 요청이 서로의 값을 덮어쓰므로 thread별 저장소가 필요하고, pool thread가 재사용되므로 첫 레벨 종료에서 반드시 비운다([[Java-ThreadLocal-and-Request-Context|ThreadLocal lifecycle]]).

client가 `LogTrace` 같은 interface에만 의존하면 field holder 구현을 ThreadLocal 구현으로 바꾸는 일은 Bean 등록 한 곳의 변경으로 끝난다. client code를 고치지 않고 DI로 구현을 교체하는 OCP 사례다.

## 종료 호출 계약

holder의 depth는 호출 하나에 release가 정확히 한 번 일어날 때만 맞는다. 종료 API는 아래 둘 중 하나로 정하고 문서화한다.

| 계약 | 정상 경로 | 실패 경로 | 예 |
|---|---|---|---|
| 배타적 종료 | `end(status)` | `exception(status, e)` | 위 수동 계측. 둘 중 하나만 부르고, 부른 쪽이 release를 한 번 수행 |
| 실패 표시 후 항상 종료 | `finally`에서 `end()` | 실패 기록 뒤 같은 `finally`에서 `end()` | OpenTelemetry span. `recordException`과 ERROR status는 span을 끝내지 않는다 |

배타적 종료 API를 catch에서 실패를 기록하고 finally에서 종료하는 [[Template-Strategy-and-Callback|template 골격]]에 그대로 끼우면 실패 경로에서 release가 두 번 일어난다. 이후 로그의 depth가 한 단계 어긋나고, 상위 호출이 종료할 때 이미 비운 holder를 읽어 오류가 난다. OpenTelemetry 명세는 이미 끝난 span에 대한 이후 `End` 호출을 무시하도록 권고하고, 현재 context 복원(Scope 닫기)을 span 종료와 분리한다. 직접 만든 holder도 release를 결과 기록에서 떼어 `finally` 한 곳에서 한 번만 실행하면 두 계약 모두에서 depth가 맞는다.

## 운영 안전성

- ID는 log field로 남기고 message 문자열을 parsing contract로 만들지 않는다.
- UUID 앞 8자리처럼 자른 ID는 32bit라 같은 기간의 요청이 약 7만 7천 건이면 충돌 확률이 50%에 이른다. 운영 ID는 W3C trace-id(16byte)처럼 충분한 길이를 쓴다.
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
- [OpenTelemetry, Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- 과정 안내: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94381), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94404)
- 예제: [project](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94407), [V0](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94408), [요구사항](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94409), [V1 개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94410), [V1 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94411), [V2 동기화](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94412), [V2 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94413), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94414)
- 동기화: [필드 동기화 개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94416), [ThreadLocal 동기화 개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94422), [ThreadLocal 동기화 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94423)

## 관련 문서

- [[Structured-Logging|Structured logging]]
- [[Correlation-ID|Correlation ID]]
- [[OpenTelemetry|OpenTelemetry]]
- [[Java-ThreadLocal-and-Request-Context|Java ThreadLocal과 request context]]
- [[Template-Strategy-and-Callback|Template Method, Strategy와 Callback]]
