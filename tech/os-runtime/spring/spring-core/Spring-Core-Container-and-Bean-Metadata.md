---
tags: [spring, application-context, bean-definition, configuration, singleton]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Container와 Bean Metadata", "Spring BeanDefinition"]
---

# Spring Core, Container와 Bean Metadata

Spring container는 설정 source를 직접 실행하는 단순 registry가 아니다. 다양한 설정을 `BeanDefinition` metadata로 정규화하고, 그 recipe에 따라 객체를 생성, 연결하고 lifecycle을 관리한다.

## ApplicationContext가 객체 graph를 조립한다

`ApplicationContext`는 Spring IoC container를 나타내는 주 API다. 설정 metadata를 읽고 Bean을 instantiate, configure, assemble한다. `BeanFactory`가 Bean 생성과 조회의 기초를 제공하고, `ApplicationContext`는 resource, event, 국제화와 environment 같은 애플리케이션 기능을 더한다.

```java
ApplicationContext context =
    new AnnotationConfigApplicationContext(AppConfig.class);

OrderService orderService = context.getBean(OrderService.class);
```

개략적인 과정은 다음과 같다.

```text
configuration source 읽기
  -> BeanDefinition 등록
  -> Bean instance 생성
  -> 의존관계 해결과 주입
  -> initialization, post-processing, proxy
  -> 사용과 종료 처리
```

생성과 주입이 항상 완전히 분리된 두 번의 pass라는 뜻은 아니다. constructor dependency는 instance 생성 과정에서 먼저 해결되어야 하고, circular dependency나 lazy 설정도 순서에 영향을 준다.

## Bean 조회는 graph 검증 도구로 쓴다

- 이름과 type으로 조회하면 둘 다 만족하는 Bean을 찾는다.
- type만으로 조회할 때 후보가 없거나 둘 이상이면 각각 다른 예외가 발생한다.
- 상위 type으로 조회하면 assignable한 하위 Bean이 모두 후보가 된다.
- `getBeansOfType()`은 특정 type의 전체 후보를 map으로 확인할 수 있다.
- `Object` type은 infrastructure Bean까지 넓게 잡을 수 있다.

애플리케이션 로직이 계속 `ApplicationContext.getBean()`을 호출하면 dependency가 숨은 service locator가 된다. 직접 조회는 test, diagnostic, framework integration처럼 container 자체를 다루는 경계에 제한하고 일반 객체는 constructor DI를 사용한다.

## BeanDefinition은 instance가 아니라 recipe다

Bean definition에는 class 또는 factory method, constructor argument, property, scope, lazy flag, init/destroy method 같은 생성 metadata가 담긴다. XML `<bean>`, annotated component와 Java configuration은 표현 방식이 다르지만 container가 소비하는 definition으로 수렴한다.

| 설정 source | definition을 만드는 대표 경로 |
|---|---|
| annotated component | classpath scanner와 annotation reader |
| `@Configuration` + `@Bean` | configuration class parser와 factory method metadata |
| XML | `XmlBeanDefinitionReader` |
| programmatic registration | registry API와 `BeanDefinition` builder |

Java configuration의 `factoryBeanName`, `factoryMethodName`은 특정 configuration Bean의 method로 객체를 만든다는 metadata다. 이것을 `FactoryBean<T>` extension point와 같은 개념으로 혼동하지 않는다.

## `@Configuration`의 full mode와 lite mode

기본 `@Configuration(proxyBeanMethods = true)`에서는 Spring이 runtime-generated CGLIB subclass로 `@Bean` method 간 직접 호출을 가로챈다. 이미 관리 중인 Bean이면 container instance를 반환하여 scope 의미를 보존한다.

`@Configuration(proxyBeanMethods = false)` 또는 일반 component 안의 `@Bean`은 lite mode다. 이때 한 `@Bean` method가 다른 method를 직접 호출하면 일반 Java 호출이므로 새 객체를 만들 수 있다. 각 factory method를 독립적으로 만들고 dependency를 parameter로 받으면 interception에 의존하지 않는다.

```java
@Configuration(proxyBeanMethods = false)
class AppConfig {
    @Bean
    MemberRepository memberRepository() {
        return new MemoryMemberRepository();
    }

    @Bean
    OrderService orderService(
        MemberRepository members,
        DiscountPolicy discount
    ) {
        return new OrderServiceImpl(members, discount);
    }
}
```

따라서 `@Configuration`이 언제나 CGLIB로 모든 호출을 보정한다거나, `@Bean`만 쓰면 언제나 singleton이 깨진다는 설명은 과도하다. direct inter-bean method call과 `proxyBeanMethods` 설정을 함께 봐야 한다.

## Spring singleton은 pattern과 경계가 다르다

Spring의 기본 singleton scope는 **Bean definition 하나당 container 하나 안에 instance 하나**다. JVM 전체에 하나인 GoF singleton도 아니고, class의 constructor를 private으로 만드는 pattern도 아니다. 같은 class를 서로 다른 Bean name으로 두 번 정의하거나 별도 `ApplicationContext`를 만들면 instance도 둘일 수 있다.

container가 instance 개수를 관리해도 thread safety는 보장하지 않는다. singleton Bean은 request별 user ID, 계산 중간값 같은 mutable state를 field에 저장하지 않고 parameter, local variable이나 별도의 짧은 scope로 넘긴다. connection pool처럼 공유 상태가 필요한 객체는 자체 동시성 계약을 명시해야 한다.

## 등록 충돌은 명시적으로 실패시킨다

core Spring은 설정에 따라 기존 definition override를 허용할 수 있지만 읽기 어려운 graph를 만든다. Spring Boot 4.1의 `SpringApplication`은 Bean definition overriding을 기본 `false`로 둔다. 같은 이름의 자동/수동 등록을 우선순위 규칙에 맡기기보다 이름과 구성 경계를 바로잡는다.

## NestJS와 비교한다

| Spring | NestJS | 차이 |
|---|---|---|
| `BeanDefinition` | module/provider metadata | Nest는 `providers` array에 runtime token과 recipe를 둔다. |
| `@Bean` factory method | `useFactory` provider | Nest는 `inject` list와 factory argument 순서를 명시한다. |
| Bean name, Java type | class/string/`Symbol` token | TypeScript type은 runtime token이 아닐 수 있다. |
| `ApplicationContext#getBean` | `ModuleRef#get`/`resolve` | 둘 다 일반 domain code의 기본 의존성 획득 방식은 아니다. |
| container singleton | default provider scope | 둘 다 공유 state의 안전성을 대신 보장하지 않는다. |

NestJS에서 같은 class를 여러 feature module의 `providers`에 반복 등록하면 공유 의도와 달리 module context별 instance가 생길 수 있다. 소유 module에서 한 번 등록하고 `exports`/`imports`로 공개한다.

## 출처

- [Spring Framework, Container Overview](https://docs.spring.io/spring-framework/reference/core/beans/basics.html)
- [Spring Framework, Bean Overview](https://docs.spring.io/spring-framework/reference/core/beans/definition.html)
- [Spring Framework, `@Bean` and `@Configuration`](https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html)
- [Spring Boot 4.1, `SpringApplication`](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/SpringApplication.html)
- 김영한 강사, [Spring container 생성](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55352)
- 김영한 강사, [container에 등록된 모든 Bean 조회](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55353)
- 김영한 강사, [Spring Bean 조회, 기본](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55354)
- 김영한 강사, [Spring Bean 조회, 동일한 type이 둘 이상](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55355)
- 김영한 강사, [Spring Bean 조회, 상속 관계](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55356)
- 김영한 강사, [BeanFactory와 ApplicationContext](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55357)
- 김영한 강사, [다양한 설정 형식 지원, Java code와 XML](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55358)
- 김영한 강사, [Spring Bean 설정 metadata, BeanDefinition](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55359)
- 김영한 강사, [Web application과 singleton](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55361)
- 김영한 강사, [Singleton pattern](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55362)
- 김영한 강사, [Singleton container](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55363)
- 김영한 강사, [Singleton 방식의 주의점](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55364)
- 김영한 강사, [`@Configuration`과 singleton](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55365)
- 김영한 강사, [`@Configuration`과 bytecode 조작](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55366)

## 관련 문서

- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기]]
- [[Spring-Core-Registration-and-Autowiring|Spring Bean 등록과 자동 주입]]
- [[Singleton패턴이란|Singleton pattern]]
- [[NestJS-vs-Spring-Runtime-DI|NestJS vs Spring runtime과 DI]]
