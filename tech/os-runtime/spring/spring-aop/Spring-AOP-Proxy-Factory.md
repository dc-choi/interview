---
tags: [spring, aop, proxy-factory, jdk-proxy, cglib, advisor]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring AOP ProxyFactory", "JDK Proxy and CGLIB", "Spring 프록시 팩토리"]
---

# Spring AOP ProxyFactory

Spring의 `ProxyFactory`는 JDK dynamic proxy와 CGLIB class proxy의 생성 차이를 감추고, 부가 기능을 `Advice`, 적용 대상을 `Pointcut`, 둘의 조합을 `Advisor`로 표현한다.

## 수동 proxy에서 동적 proxy로

수동 proxy는 target method마다 forwarding code를 작성한다. Reflection은 runtime에 method metadata를 읽고 호출할 수 있게 해 이 반복을 일반화한다. 다만 compile-time type check를 잃으므로 framework 내부나 좁은 infrastructure 경계에서 사용한다.

### JDK dynamic proxy

```java
InvocationHandler handler = (proxy, method, args) -> {
    before(method);
    return method.invoke(target, args);
};

OrderService proxy = (OrderService) Proxy.newProxyInstance(
    loader,
    new Class<?>[]{OrderService.class},
    handler
);
```

JDK proxy는 interface를 구현하는 runtime class를 만든다. Client는 proxy에 노출된 interface type으로 호출해야 하고 interface에 없는 concrete method는 그 proxy contract에 포함되지 않는다.

### CGLIB class proxy

CGLIB는 target class의 subclass를 runtime에 생성해 override 가능한 method를 가로챈다. Spring은 CGLIB를 `spring-core`에 repackaging하므로 보통 직접 `Enhancer`를 사용하지 않는다.

- `final` class는 subclass proxy를 만들 수 없다.
- `final`, `private`와 일부 비가시 method는 override/advice할 수 없다.
- 현재 Spring은 일반적으로 Objenesis로 proxy instance를 만들어 constructor를 두 번 호출하지 않는다.
- Java module boundary에서는 package open 제약이 생길 수 있다.

## ProxyFactory와 AOP Alliance Advice

```java
ProxyFactory factory = new ProxyFactory(target);
factory.addAdvisor(new DefaultPointcutAdvisor(pointcut, advice));
Object proxy = factory.getProxy();
```

| 요소 | 질문 |
|---|---|
| Target | 실제 업무 method는 어디에 있는가? |
| Advice | 호출 전후에 무엇을 할 것인가? |
| Pointcut | 어떤 class/method 호출에 적용할 것인가? |
| Advisor | 어느 Pointcut에 어느 Advice를 붙일 것인가? |

여러 Advisor를 한 ProxyFactory에 넣으면 proxy chain 하나가 순서대로 advice를 실행할 수 있다. 부가 기능 하나마다 proxy object를 겹겹이 직접 만들 필요가 없다.

## proxy type 선택을 단정하지 않는다

Spring Framework core의 기본 규칙은 interface가 있으면 JDK proxy, 없으면 CGLIB다. `proxyTargetClass=true`로 class proxy를 강제할 수 있다. 그러나 Spring Boot가 설정에 따라 class-based proxy를 기본화할 수 있으므로 **Framework 기본과 실제 Boot application 설정을 구분**한다.

Spring Framework 7의 `@Proxyable`은 특정 Bean/component에 interface 또는 target-class proxy 요구를 표현할 수 있다. 최종 판단은 `AopUtils.isJdkDynamicProxy()`/`isCglibProxy()`와 context test로 확인한다.

## Pointcut의 두 책임

Pointcut은 class filter와 method matcher로 구성된다.

1. Bean type에 적용 가능한 method가 하나라도 있는지 보고 proxy 생성 후보를 좁힌다.
2. 실제 호출 method가 match할 때 advice를 실행한다.

Method 이름 문자열 하나만으로 고르면 refactoring과 overload에 취약하다. package/type/annotation과 signature를 의도에 맞게 조합한다.

## 출처

- [Spring Framework 7.0, Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- [Spring Framework, ProxyFactory](https://docs.spring.io/spring-framework/reference/core/aop-api/pfb.html)
- dynamic proxy: [reflection](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94462), [JDK proxy 소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94463), [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94464), [적용 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94465), [적용 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94466), [CGLIB 소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94467), [CGLIB 예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94468), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94469)
- ProxyFactory: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94471), [예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94472), [예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94473), [개념](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94474), [Advisor](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94475), [custom Pointcut](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94476), [기본 Pointcut](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94477), [여러 Advisor](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94478), [interface 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94479), [class 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94480), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94481)

## 관련 문서

- [[Spring-AOP|Spring AOP]]
- [[Proxy-and-Decorator-in-Spring|Spring에서 Proxy와 Decorator]]
- [[Spring-AOP-Auto-Proxy-and-BeanPostProcessor|Auto-proxy creator]]
