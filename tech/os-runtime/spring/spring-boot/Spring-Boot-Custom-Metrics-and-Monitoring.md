---
tags: [spring-boot, micrometer, custom-metrics, counter, timer, gauge, monitoring]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Custom Metrics", "Micrometer Counter Timer Gauge", "비즈니스 메트릭 설계"]
---

# Spring Boot custom metric과 운영 monitoring

Custom metric은 code에 숫자를 추가하는 일이 아니라 운영 질문을 안정적인 이름, type과 dimension으로 표현하는 일이다. 먼저 어떤 결정을 내릴 signal인지 정하고 meter를 선택한다.

## meter 선택

| 질문 | meter | 예 |
|---|---|---|
| 사건이 얼마나 자주 생기는가 | Counter | 주문 생성, 취소, 외부 API 실패 |
| 작업 시간이 얼마나 걸리는가 | Timer | 결제 승인, batch 처리 |
| 현재 상태가 얼마인가 | Gauge | queue depth, 재고, active task |
| 값의 분포가 어떤가 | DistributionSummary | payload size, order amount |

Timer는 count와 total time을 함께 기록하므로 같은 작업에 별도 Counter를 중복 추가할 필요가 없다. Gauge는 관측 대상 object를 참조하므로 lifecycle과 강한 참조 여부를 확인하고, 사건 누적값을 Gauge로 만들지 않는다.

## 직접 계측

```java
@Component
final class PaymentMetrics {
    private final Counter approved;
    private final Timer latency;

    PaymentMetrics(MeterRegistry registry) {
        this.approved = Counter.builder("payment.approved")
            .description("Approved payment attempts")
            .register(registry);
        this.latency = Timer.builder("payment.provider.latency")
            .publishPercentileHistogram()
            .register(registry);
    }

    <T> T record(Supplier<T> action) {
        return latency.record(action);
    }
}
```

Metric code를 domain 곳곳에 흩뿌리기보다 adapter/service 경계에 얇은 instrumentation layer를 둔다. 등록 이름, description, base unit과 allowed tag를 중앙 contract로 관리한다.

## annotation 계측

`@Counted`, `@Timed`, `@Observed`는 proxy/AOP 또는 observation annotation support가 실제로 활성화돼야 동작한다. 현재 Spring Boot 4.1은 다음 opt-in을 제공한다.

```properties
management.observations.annotations.enabled=true
```

여기에 AspectJ support dependency가 필요하다. 이미 Spring MVC나 repository가 자동 계측된 지점에 annotation을 겹치면 중복 observation이 생길 수 있으므로 하나의 계측 경로를 선택한다. 구형 예제처럼 `CountedAspect`/`TimedAspect`를 직접 Bean으로 등록하는 방식은 사용하는 Micrometer/Boot version과 적용 범위를 확인한다.

## tag와 cardinality

좋은 tag는 유한하고 운영 결정을 돕는다.

- 허용: `result=success|failure`, `provider`, 정규화된 `route`, bounded `payment_method`
- 금지: `user_id`, `order_id`, raw URL, exception message, timestamp
- error class도 종류가 무한히 늘지 않도록 정규화된 error code family를 사용한다.
- dynamic tag를 붙일 때 기존 meter를 재사용하고 series budget/상한을 감시한다.

ID별 조사에는 metric tag가 아니라 trace/log field를 사용한다.

## business metric의 의미

`orders.created`와 `orders.cancelled`를 만들 때 다음 계약을 함께 기록한다.

- 요청 수인지 DB commit 성공 수인지
- retry/duplicate를 포함하는지
- 취소 요청, 승인, 환불 완료 중 어느 시점인지
- instance별 합산이 가능한지
- deploy/restart와 관계없이 어떤 query로 rate를 계산할지

DB의 정확한 매출 원장과 metric은 목적이 다르다. metric은 빠른 추세/경보용이고 금액 정산과 감사는 source of truth에서 계산한다.

## dashboard, trace, log의 역할

```text
dashboard: 이상 시점과 범위 발견
trace/APM: 느리거나 실패한 요청 경로 추적
structured log: 상세 사건과 context 확인
runbook: 다음 진단/완화 행동 결정
```

Alert는 warning/critical label만 나누는 것으로 끝나지 않는다. 사용자 영향, 지속 시간, 담당 owner와 실행할 runbook을 연결하고 false positive는 threshold/window/signal을 교정한다.

## 검증 체크리스트

- test registry로 meter 이름, type, tag와 increment를 검증한다.
- Prometheus endpoint에서 backend 이름 변환을 확인한다.
- restart/counter reset을 포함한 PromQL을 검증한다.
- cardinality와 scrape payload 증가를 배포 전후 비교한다.
- dashboard panel과 alert가 같은 metric contract를 참조하는지 확인한다.

## 출처

- [Micrometer, Meters](https://docs.micrometer.io/micrometer/reference/concepts/meters.html)
- [Micrometer, Counters](https://docs.micrometer.io/micrometer/reference/concepts/counters.html)
- [Micrometer, Timers](https://docs.micrometer.io/micrometer/reference/concepts/timers.html)
- [Spring Boot 4.1, Observability](https://docs.spring.io/spring-boot/reference/actuator/observability.html)
- custom metric: [예제](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148164), [Counter](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148165), [`@Counted`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148166), [Timer](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148167), [`@Timed`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148168), [Gauge](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148169), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148170)
- 운영 구성: [monitoring 환경](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148602)

## 관련 문서

- [[Spring-Boot-Micrometer-Prometheus-Grafana|Spring Boot metric pipeline]]
- [[Cardinality|Metric cardinality]]
- [[Application-Performance-Monitoring|APM]]
- [[Correlation-ID|Correlation ID]]
