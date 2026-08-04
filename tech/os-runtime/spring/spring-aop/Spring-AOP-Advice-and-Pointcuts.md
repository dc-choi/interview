---
tags: [spring, aop, advice, pointcut, aspectj-expression]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring AOP Advice Pointcut", "AspectJ Pointcut Expressions", "Spring AOP 포인트컷"]
---

# Spring AOP Advice와 Pointcut

Aspect는 횡단 정책인 Advice와 적용 범위인 Pointcut을 함께 모듈화한다. Spring AOP는 AspectJ expression language 일부를 사용하지만 AspectJ compiler weaving과 달리 **Spring Bean의 method execution**만 runtime proxy로 가로챈다.

## AOP 적용 방식의 경계

| 방식 | 적용 시점 | join point 범위 |
|---|---|---|
| Spring AOP | runtime proxy | Spring Bean method execution |
| AspectJ compile-time weaving | compile | field, constructor, method call/execution 등 |
| AspectJ load-time weaving | class load | bytecode weaving이 지원하는 범위 |

Spring AOP의 제한은 단순한 약점이 아니라 container integration과 낮은 도입 비용을 얻는 tradeoff다. Method execution 외의 세밀한 join point가 꼭 필요할 때만 weaving 복잡성을 감수한다.

## Advice 종류

| annotation | 실행 시점 | 주의점 |
|---|---|---|
| `@Before` | target 호출 전 | 호출을 생략하거나 return을 바꾸지 못함 |
| `@AfterReturning` | 정상 return 뒤 | return value binding/type 범위 확인 |
| `@AfterThrowing` | 예외 throw 뒤 | match할 exception type 확인 |
| `@After` | finally 의미 | 정상/예외 모두 실행 |
| `@Around` | 전체 호출 감쌈 | `proceed()`, return과 exception 보존 책임 |

필요한 권한이 가장 좁은 Advice를 선택한다. 단순 log에 `@Around`를 사용해 실수로 `proceed()`를 빼먹는 것보다 `@Before`/`@AfterReturning`이 안전할 수 있다.

여러 Aspect 순서는 `@Order`/`Ordered`로 표현한다. 순서가 중요한 Advice를 한 Aspect class 안에 섞기보다 책임별 Aspect로 분리하고 chain을 통합 test한다.

## named Pointcut

```java
@Pointcut("execution(public * com.example..service..*(..))")
void applicationService() {}

@Pointcut("@annotation(com.example.Traceable)")
void tracedOperation() {}

@Around("applicationService() && tracedOperation()")
Object trace(ProceedingJoinPoint pjp) throws Throwable {
    return pjp.proceed();
}
```

작은 named Pointcut을 조합하면 긴 expression을 여러 Aspect에서 복제하지 않고 architecture policy를 한곳에 둔다. Java visibility는 Pointcut 참조 범위를 정하지만 matching 의미를 바꾸지는 않는다.

## 주요 designator

| PCD | match 기준 |
|---|---|
| `execution` | method signature, 가장 일반적인 기준 |
| `within` | method가 선언된 type/package |
| `this` | proxy object의 runtime type |
| `target` | target object의 runtime type |
| `args` | 실제 argument runtime type |
| `@target` | target class annotation |
| `@within` | annotated type 안에 선언된 method |
| `@annotation` | 실행 method annotation |
| `@args` | argument runtime type annotation |
| `bean` | Spring Bean name, Spring 전용 확장 |

Spring AOP에서 `call`, `get`, `set`, constructor join point 등 지원하지 않는 AspectJ PCD를 쓰면 실패한다.

## `execution` 읽기

```text
execution(modifiers? return-type declaring-type? method(params) throws?)
```

`*`는 한 항목 wildcard, package/type 문맥의 `..`는 여러 segment, parameter의 `..`는 0개 이상의 argument를 뜻한다. 너무 넓은 `execution(* *(..))`는 infrastructure와 configuration까지 잡을 수 있으므로 public signature와 bounded package부터 시작한다.

`within`은 선언 type 기준이라 subtype method까지 포괄하는 `execution`과 의미가 다를 수 있다. `args`는 runtime argument를 보고 `execution`은 method signature의 정적 parameter를 본다.

## `this`, `target`과 parameter binding

Proxy 기반 Spring AOP에서 `this`는 proxy, `target`은 뒤의 application object다. JDK proxy는 interface type으로 보이고 CGLIB proxy는 target subclass이므로 `this` matching이 proxy strategy 영향을 받을 수 있다.

`args(account)`, `@annotation(auditable)`, `target(bean)`처럼 Pointcut variable을 Advice parameter에 binding할 수 있다. Name discovery가 모호해지지 않도록 compiler parameter metadata와 `argNames` 요구를 확인한다.

## Pointcut test

- 대표 class/method가 match하는 positive test를 둔다.
- 제외할 infrastructure/private/self-call 경계의 negative test를 둔다.
- proxy strategy를 바꿔도 `this`/`target` 의미가 유지되는지 확인한다.
- annotation retention/target과 bridge method/overload를 확인한다.

## 출처

- [Spring Framework 7.0, AOP Concepts](https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html)
- [Spring Framework 7.0, Declaring Advice](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html)
- [Spring Framework 7.0, Declaring a Pointcut](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/pointcuts.html)
- 개념: [핵심/부가 기능](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94497), [Aspect](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94498), [적용 방식](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94499), [용어](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94500), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94501)
- 구현: [project](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94503), [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94504), [시작](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94505), [Pointcut 분리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94506), [Advice 추가](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94507), [Pointcut 참조](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94508), [순서](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94509), [Advice 종류](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94510), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94511)
- Pointcut: [designator](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94513), [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94514), [`execution` 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94515), [`execution` 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94516), [`within`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94517), [`args`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94518), [`@target/@within`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94525), [`@annotation/@args`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94521), [`bean`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94522), [parameter binding](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94523), [`this/target`](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94519), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94524)

## 관련 문서

- [[Spring-AOP|Spring AOP]]
- [[Spring-AOP-Practical-Patterns-and-Proxy-Limits|AOP 실전과 proxy 한계]]
- [[Spring-Transactional|Spring transaction]]
