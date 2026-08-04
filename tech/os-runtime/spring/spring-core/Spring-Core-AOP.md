---
tags: [spring, aop, proxy, cross-cutting-concern, interceptor]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Core AOP", "Spring AOP와 Proxy"]
---

# Spring Core, AOP와 Proxy

AOP는 여러 업무 객체에 반복되는 timing, transaction, security 같은 횡단 관심사를 핵심 로직과 분리하는 도구다. 공통 코드를 숨기는 기술이 아니라 어디에 어떤 부가 동작이 적용되는지 별도의 정책으로 표현하는 방식이다.

## 왜 필요한가

모든 service method 안에 stopwatch 코드를 직접 넣으면 업무 코드가 흐려지고 적용 대상 변경도 어렵다. timing 정책을 aspect로 분리하면 업무 method는 본래 책임을 유지하고, pointcut에서 측정 범위를 한 번에 바꿀 수 있다.

반복 코드가 있다는 이유만으로 모두 AOP 대상은 아니다. 업무 규칙 자체, 호출 순서와 실패 보상처럼 핵심 흐름에 중요한 코드는 명시적인 method와 service orchestration으로 남기는 편이 읽기 쉽다.

## 핵심 용어

| 용어 | 의미 |
|---|---|
| aspect | 하나의 횡단 관심사를 모듈화한 단위 |
| join point | 부가 동작을 결합할 수 있는 실행 지점, Spring AOP에서는 method 실행 |
| pointcut | advice를 적용할 join point를 고르는 조건 |
| advice | 전, 후, 예외 또는 around 시점에 수행할 동작 |
| target | 실제 업무 method를 가진 객체 |
| proxy | client 호출을 먼저 받아 advice chain과 target을 연결하는 객체 |

`@Around` advice는 대상 호출 전후를 모두 감쌀 수 있지만 `proceed()` 호출 여부와 예외 전달까지 책임진다. 단순히 정상 반환 뒤 동작만 필요하다면 더 좁은 advice 종류를 선택해 오류 가능성을 줄인다.

## proxy를 통과해야 적용된다

```text
client -> AOP proxy -> advice -> target method
```

Spring AOP는 Spring Bean의 method 실행을 runtime proxy로 가로챈다. interface가 있으면 JDK dynamic proxy, class 기반이면 CGLIB proxy가 사용될 수 있다. 실제 proxy 선택은 현재 Spring과 Boot 설정에 따라 달라질 수 있으므로 특정 종류를 무조건 기본이라고 가정하지 않는다.

target method가 같은 instance의 다른 method를 `this.other()`로 호출하면 proxy를 다시 거치지 않는다. 따라서 self-invocation에는 해당 advice가 적용되지 않는다. proxy를 억지로 꺼내 호출하기보다 aspect가 필요한 경계를 다른 Bean으로 분리하거나 호출 구조를 명확히 재설계한다.

CGLIB class proxy에는 상속 제약도 있다. `final` class와 `final` method는 override할 수 없고 `private` method도 advice 대상이 될 수 없다. proxy 제약을 모르고 annotation만 붙이면 코드에는 정책이 보이지만 runtime에는 적용되지 않는 실패가 생긴다.

## timing aspect를 운영 관측으로 연결한다

- pointcut을 package 전체에 무심코 펼치지 말고 use case나 annotation처럼 의도 있는 경계로 제한한다.
- method 이름만 출력하지 말고 성공, 실패와 latency를 관측 시스템의 timer로 기록한다.
- user ID처럼 cardinality가 무한히 늘 수 있는 값을 metric label로 쓰지 않는다.
- timing 기록이 업무 예외를 삼키거나 반환값을 바꾸지 않게 한다.
- proxy 적용 여부를 context integration test로 한 번은 확인한다.

AOP로 병목 후보를 찾은 뒤에는 DB query, external call, lock과 serialization 비용을 더 작은 span이나 profiler로 확인한다. method 전체 시간만으로 원인을 단정할 수 없다.

## NestJS와 TypeORM으로 옮길 때

NestJS interceptor도 route handler 호출 전후에 logic을 넣고 result와 exception을 변환할 수 있어 AOP와 닮았다. controller, method 또는 global scope에 binding할 수 있지만, 일반 provider의 임의 method 호출 전체를 Spring AOP pointcut처럼 자동 interception하는 기능은 아니다.

| 의도 | Spring | NestJS |
|---|---|---|
| request handler timing | method execution pointcut + advice | `NestInterceptor` + `CallHandler` |
| 인증, 인가 | Spring Security filter chain과 method security | guard 중심, 필요하면 interceptor와 분담 |
| input 변환과 검증 | argument resolver와 validation | pipe |
| exception 응답 변환 | exception handler/advice | exception filter |

TypeORM transaction을 모든 request interceptor에 기계적으로 넣으면 streaming, background work와 connection 보유 시간이 섞일 수 있다. use case가 소유한 transaction callback이나 `QueryRunner`에서 명시적인 boundary를 두고, callback에서는 전달된 transactional manager만 사용한다.

## 점검 질문

- 이 동작은 여러 use case를 가로지르는 정책인가, 핵심 업무 규칙인가?
- pointcut이 의도보다 넓게 infrastructure와 nested call까지 잡지 않는가?
- 호출이 실제 proxy를 통과하며 self-invocation은 없는가?
- advice가 예외, 반환값과 resource lifecycle을 보존하는가?
- NestJS interceptor를 일반 service AOP와 동일시하지 않았는가?

## 출처

- [Spring Framework 7.0, AOP Concepts](https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html)
- [Spring Framework, Spring AOP Capabilities and Goals](https://docs.spring.io/spring-framework/reference/core/aop/introduction-spring-defn.html)
- [Spring Framework, Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- [NestJS, Interceptors](https://docs.nestjs.com/interceptors)
- [TypeORM, Transactions](https://typeorm.io/docs/advanced-topics/transactions/)
- 김영한 강사, [AOP가 필요한 상황](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49600)
- 김영한 강사, [AOP 적용](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49601)

## 관련 문서

- [[Spring-AOP|Spring AOP 상세 (proxy factory, 자동 proxy, advice, pointcut과 실전 한계)]]
- [[Spring-Core|Spring Core]]
- [[Spring-Transactional|Spring @Transactional]]
- [[NestJS-vs-Spring-Pipeline-AOP|NestJS vs Spring Pipeline과 AOP]]
- [[관측가능성(Observability)|관측가능성]]
