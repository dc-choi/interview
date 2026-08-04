---
tags: [spring, aop, retry, self-invocation, proxy-limit, cglib]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring AOP Proxy Limits", "Spring AOP Self Invocation", "Spring AOP 실무 주의사항"]
---

# Spring AOP 실전 pattern과 proxy 한계

AOP annotation이 code에 보인다고 정책이 실행되는 것은 아니다. 호출이 실제 proxy를 통과하고 Pointcut이 match하며 Advice가 원래 return/exception 의미를 보존해야 한다.

## Trace annotation

`@Trace`는 명시적 opt-in Pointcut으로 package 전체 logging보다 의도를 드러내기 쉽다.

- method/annotation 이름만 아니라 success/failure/latency를 structured signal로 기록한다.
- argument와 return은 PII/secret allowlist 없이 기록하지 않는다.
- 같은 method가 HTTP/DB auto instrumentation으로 이미 trace되는지 확인한다.
- annotation retention은 runtime, target은 실제 적용 method/type과 맞춘다.

## Retry annotation

Retry는 단순히 exception을 다시 호출하는 기능이 아니다.

```text
transient failure 분류
  -> idempotency 확인
  -> bounded attempts
  -> backoff + jitter
  -> timeout budget
  -> final failure 관측
```

- validation/auth/permanent error는 retry하지 않는다.
- 결제/주문 write는 idempotency key나 unique constraint 없이 retry하지 않는다.
- transaction boundary 안에서 같은 실패를 반복할지 새 transaction으로 재시도할지 정한다.
- 중첩 retry가 증폭되지 않게 client/library/application 책임을 하나로 정한다.

## self-invocation

```java
public void outer() {
    this.inner(); // proxy를 다시 거치지 않음
}
```

Client가 proxy를 호출한 뒤 target 내부의 `this.inner()`는 target reference에 대한 직접 호출이다. 그래서 `inner()`의 `@Transactional`, `@Async`나 custom Aspect가 기대대로 실행되지 않을 수 있다.

대안 우선순위:

1. Advice가 필요한 `inner()`를 별도 Bean/use case로 분리한다.
2. 필요하면 self reference를 주입해 proxy를 호출하되 순환 의존과 가독성 비용을 드러낸다.
3. `ObjectProvider`/context lookup은 infrastructure coupling을 감수할 때 제한적으로 쓴다.
4. `AopContext.currentProxy()`는 target을 Spring AOP에 직접 결합하므로 마지막 수단이다.
5. 내부 호출 자체를 weave해야 할 강한 요구라면 AspectJ weaving의 운영 복잡성과 비교한다.

## proxy type과 DI

JDK proxy는 interface contract를 구현하므로 concrete target class로 cast/주입할 수 없다. CGLIB proxy는 target subclass라 concrete type으로 보이지만 그 이유만으로 implementation type DI를 권장하지 않는다.

- Client는 가능하면 안정적인 capability interface에 의존한다.
- Framework core 기본은 interface가 있으면 JDK proxy지만 Boot 설정은 class proxy를 선택할 수 있다.
- 실제 type/cast를 가정하는 code보다 `AopUtils`와 context test로 확인한다.
- 여러 infrastructure feature가 proxy type 설정을 공유/통합할 수 있다.

## CGLIB의 현재 한계

오래된 자료의 `기본 constructor 필수`, `constructor 두 번 호출`을 현재 Spring의 일반 규칙으로 반복하지 않는다. Spring은 Objenesis를 사용해 보통 constructor double invocation을 피한다.

여전히 중요한 한계는 다음과 같다.

- `final` class는 subclass proxy 불가
- `final`/`private`/비가시 method는 advice 불가
- module path package open 제약
- target이 직접 생성한 내부 object와 Spring Bean이 아닌 instance에는 auto-proxy 미적용

## 검증 전략

```java
assertThat(AopUtils.isAopProxy(bean)).isTrue();
assertThat(AopUtils.isJdkDynamicProxy(bean)
        || AopUtils.isCglibProxy(bean)).isTrue();
```

- annotation 유무만 검사하지 말고 외부 proxy call의 실제 side effect를 검증한다.
- self-invocation negative case를 test로 고정한다.
- Advice order, retry 횟수와 transaction 경계를 통합 test한다.
- final/private method가 Pointcut 대상이라고 오해하지 않게 architecture test를 둔다.

## 출처

- [Spring Framework 7.0, Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- [Spring Retry](https://github.com/spring-projects/spring-retry)
- 실전: [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94527), [Trace AOP](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94531), [Retry AOP](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94532), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94530)
- self-invocation: [문제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94534), [self injection](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94535), [lazy lookup](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94536), [구조 변경](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94537)
- proxy 한계: [cast](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94538), [DI](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94539), [CGLIB](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94540), [Spring 해결](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94541), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94542), [다음 단계](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94544)

## 관련 문서

- [[Spring-AOP|Spring AOP]]
- [[Spring-AOP-Advice-and-Pointcuts|Advice와 Pointcut]]
- [[Spring-Transactional|Spring transaction]]
- [[Idempotency|Idempotency]]
