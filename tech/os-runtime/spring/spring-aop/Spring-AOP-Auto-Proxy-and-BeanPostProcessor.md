---
tags: [spring, aop, bean-post-processor, auto-proxy, aspect]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring AOP Auto Proxy Creator", "BeanPostProcessor AOP", "자동 프록시 생성기"]
---

# Spring AOP auto-proxy와 BeanPostProcessor

수동 `ProxyFactory` 설정은 Bean마다 proxy를 만들어 주입해야 한다. Spring AOP는 `BeanPostProcessor` 기반 auto-proxy creator가 container에 등록될 Bean을 검사하고 필요한 target만 proxy로 바꿔 이 반복을 자동화한다.

## BeanPostProcessor의 위치

```text
Bean definition
  -> instantiate
  -> dependency injection
  -> BeanPostProcessor before initialization
  -> initialization callbacks
  -> BeanPostProcessor after initialization
  -> exposed Bean
```

`BeanPostProcessor`는 Bean **instance**를 처리한다. Definition metadata를 바꾸는 `BeanFactoryPostProcessor`와 구분한다. Post-processor는 container마다 적용되며, early lifecycle에 만들어진다.

## proxy로 교체하기

개념적으로 auto-proxy creator는 다음을 수행한다.

1. 등록된 Advisor와 `@Aspect` 후보를 모은다.
2. Bean type에 match하는 Advisor가 있는지 검사한다.
3. 하나라도 match하면 target을 감싼 AOP proxy를 만든다.
4. match한 Advisor들을 proxy chain에 넣는다.
5. 원본 대신 proxy를 exposed Bean으로 반환한다.

여러 Advisor가 match해도 보통 target별 proxy 하나에 모두 넣는다. 모든 Bean을 무조건 proxy로 만들지 않고 class-level 후보 검사를 먼저 해 startup/runtime 비용을 줄인다.

## `@Aspect`가 동작하는 경로

```java
@Aspect
@Component
class TraceAspect {
    @Around("execution(* com.example..service..*(..))")
    Object trace(ProceedingJoinPoint joinPoint) throws Throwable {
        return joinPoint.proceed();
    }
}
```

`@Aspect` 자체가 bytecode를 weave하는 것은 아니다. Spring의 annotation-aware auto-proxy creator가 aspect Bean의 advice/pointcut metadata를 Advisor로 변환하고 일반 Advisor와 함께 proxy를 만든다. 그래서 Spring Bean이 아닌 `new` object에는 적용되지 않는다.

## early initialization 함정

`BeanPostProcessor`와 그 direct dependency는 다른 일반 Bean보다 일찍 생성된다. 이 단계에서 예상 밖 Bean을 끌어오면 그 Bean이 전체 post-processing/auto-proxy 대상에서 빠질 수 있다.

- custom post-processor의 dependency를 최소화한다.
- `@Bean` method는 return type이 `BeanPostProcessor`임을 container가 일찍 알 수 있게 선언한다.
- 필요하면 static factory method로 configuration class의 조기 생성을 줄인다.
- `not eligible for getting processed by all BeanPostProcessors` warning을 무시하지 않는다.

## 적용 범위 진단

- proxy가 생기지 않았다면 Bean 등록 여부, Pointcut type match와 auto-proxy creator 활성화를 확인한다.
- proxy는 생겼지만 advice가 안 돌면 method-level match와 self-invocation을 확인한다.
- 같은 target에 proxy가 중첩되면 여러 AOP 설정 source가 unified creator로 합쳐지는지 확인한다.
- infrastructure Bean까지 잡는 broad package Pointcut을 피한다.

## 출처

- [Spring Framework 7.0, Container Extension Points](https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html)
- [Spring Framework, Auto-proxying](https://docs.spring.io/spring-framework/reference/core/aop-api/autoproxy.html)
- BeanPostProcessor: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94483), [예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94484), [예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94485), [적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94486), [정리 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94487), [Spring 지원 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94488), [Spring 지원 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94489), [한 proxy와 여러 Advisor](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94490), [정리 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94491)
- `@Aspect`: [적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94493), [내부 변환](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94494), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94495)

## 관련 문서

- [[Spring-AOP|Spring AOP]]
- [[Spring-AOP-Proxy-Factory|ProxyFactory]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring Bean lifecycle]]
