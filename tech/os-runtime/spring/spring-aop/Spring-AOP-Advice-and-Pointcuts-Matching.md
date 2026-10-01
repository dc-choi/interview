---
tags: [spring, aop, pointcut, testing]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["AOP Pointcut 매칭 검증"]
---

# AOP Pointcut 매칭 검증

## Signature와 runtime 매칭

예시 대상은 `com.example.member.MemberServiceImpl.hello(String)`이며 `MemberService` interface를 구현한다. 메서드 선언과 실제 호출 인자를 구분한다.

| 조건 | 의미 |
|---|---|
| `execution(* com.example.member.*.*(..))` | 해당 package 바로 아래 type의 method |
| `execution(* com.example.member..*.*(..))` | 해당 package와 하위 package의 method |
| `execution(* hello(String))` | 이름과 선언 parameter가 일치 |
| `execution(* hello(*))` | parameter가 정확히 하나 |
| `execution(* hello(..))` | parameter 개수와 무관 |
| `within(com.example.member.MemberServiceImpl)` | 지정 type 안에 선언된 method |
| `args(java.io.Serializable)` | 실제 인자의 type 기준 |
| `bean(*Service)` | Spring Bean 이름 패턴 |

`this`는 proxy type, `target`은 실제 대상 type이다. JDK proxy에서는 구체 구현 class의 `this` 매칭이 CGLIB와 달라질 수 있다. Annotation designator는 method/class/argument 중 어느 위치를 검사하는지 구분한다.

## 단위 검증과 실제 호출 검증

정적 signature 조건은 `AspectJExpressionPointcut`에 expression을 설정하고 `matches(method, targetClass)`로 positive/negative 사례를 비교할 수 있다. Package 한 단계와 하위 package 포함, overload, 제외할 method를 함께 확인한다. 이 검사는 runtime 인자 매칭과 proxy 호출 자체의 증거는 아니다.

실제 인자, Bean 이름, annotation binding과 proxy type 조건은 context에서 외부 호출의 side effect로 검증한다. `AopUtils.isAopProxy()`로 proxy 여부를 먼저 확인하고 JDK/CGLIB 양쪽 전략이 필요한 경우 나누어 실행한다. Annotation은 runtime retention과 올바른 target을 가져야 한다.

## 출처

- 김영한 강사, [execution](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94515), [args](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94518), [this/target](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94519), [bean](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94522)

- [Spring Framework, Declaring a Pointcut](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/pointcuts.html)
- [Spring Framework, Pointcut API in Spring](https://docs.spring.io/spring-framework/reference/core/aop-api/pointcuts.html)

## 관련 문서

- [[Spring-AOP-Advice-and-Pointcuts|Advice와 Pointcut]]
- [[Spring-AOP-Practical-Patterns-and-Proxy-Limits|Proxy 경계]]
