---
tags: [spring, core, ioc, dependency-injection, bean]
status: index
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Core", "스프링 핵심 원리"]
---

# Spring Core

Spring Core의 중심은 annotation 암기가 아니라 **객체 graph의 생성, 연결, scope와 lifecycle을 애플리케이션 로직 밖에서 관리하는 것**이다. 다형성과 SOLID가 변경 방향을 설계한다면 IoC container는 그 설계를 실행 시점의 객체 graph로 조립한다.

2026-08-04 기준 공식 stable 문서는 Spring Framework 7.0.8, Spring Boot 4.1.0이다. 오래된 예제의 설계 원리는 여전히 유효하지만 프로젝트 생성 화면, dependency version과 일부 기본값은 현재 공식 문서를 다시 확인한다.

## 문서 지도

| 문서 | 핵심 질문 |
|---|---|
| [[Spring-Core-Object-Design-and-Composition|객체 설계와 구성]] | 역할과 구현을 어떻게 분리하고, composition root에서 구현을 선택하는가 |
| [[Spring-Core-Container-and-Bean-Metadata|컨테이너와 Bean metadata]] | `ApplicationContext`는 설정을 어떻게 읽어 Bean을 만들고 관리하는가 |
| [[Spring-Core-Registration-and-Autowiring|Bean 등록과 자동 주입]] | scan, 수동 등록, constructor injection과 후보 선택을 어떻게 운영하는가 |
| [[Spring-Core-Scope-and-Lifecycle|Bean scope와 lifecycle]] | instance를 어디까지 공유하고, 초기화와 정리를 누가 책임지는가 |
| [[Spring-Core-AOP|AOP와 proxy]] | 횡단 관심사를 어디에 적용하고 proxy 경계를 어떻게 검증하는가 |

## 하나의 흐름으로 읽기

```text
요구사항과 변화 축
  -> 역할, 구현, 행동 계약
  -> 구성 정보로 구현 선택
  -> BeanDefinition 등록
  -> container가 객체 생성과 의존성 연결
  -> scope에 따라 instance 제공
  -> lifecycle callback과 proxy 적용
  -> AOP advice가 proxy를 통과한 method 호출에 결합
```

container는 OCP나 DIP를 자동으로 만들어 주지 않는다. 클라이언트가 구체 구현에 의존하면 Bean으로 등록해도 DIP 위반은 남는다. 반대로 모든 객체를 interface로 만들 필요도 없다. 실제 교체 가능성, 테스트 경계와 모듈 경계에 안정된 역할을 둔다.

## Spring과 NestJS를 비교하는 기준

| 질문 | Spring | NestJS |
|---|---|---|
| 등록 단위 | Bean definition, component scan, configuration | module의 provider metadata |
| 런타임 식별자 | Java type, Bean name, qualifier | class, string, `Symbol` token |
| 기본 instance 경계 | container별 singleton | application singleton |
| 짧은 scope | prototype, request 등 | transient, request |
| 구성 경계 | `@Configuration`, `@Bean`, auto-configuration | `@Module`, custom/dynamic provider |

문법을 1:1로 옮기지 않는다. Spring의 package scan을 NestJS에서 재현하기보다 feature module의 `providers`, `imports`, `exports`로 공개 graph를 명시한다. TypeScript `interface`는 런타임에 사라지므로 교체 가능한 역할에는 별도의 `Symbol`이나 abstract class token이 필요하다.

## 공식 출처

- [Spring Framework, The IoC Container](https://docs.spring.io/spring-framework/reference/core/beans.html)
- [Spring Framework, IoC Container and Beans 소개](https://docs.spring.io/spring-framework/reference/core/beans/introduction.html)
- [Spring Boot, Beans and Dependency Injection](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## 관련 문서

- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기]]
- [[OOP|객체지향 기본]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[NestJS-vs-Spring-Runtime-DI|NestJS vs Spring 런타임과 DI]]
