---
tags: [spring, transaction, aop, proxy, troubleshooting]
status: done
verified_at: 2026-09-30
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Transaction Verification", "트랜잭션 적용 확인", "Transactional 미적용", "isActualTransactionActive"]
---

# Spring transaction 적용 확인과 조용한 미적용

선언적 transaction은 경계가 코드에 보이지 않고, 적용되지 않아도 예외 없이 정상 동작처럼 보인다. Spring 문서도 annotation이 조용히 무시되면 rollback 시나리오를 test하기 전까지 동작하는 것처럼 보일 수 있다고 경고한다. 그래서 선언 여부가 아니라 실제 적용을 코드와 log로 확인한다. Transaction 추상화와 proxy 경계는 [[Spring-Transactional|Spring @Transactional]]에 있다. 기준은 Spring Framework 7.0.9와 Spring Boot 4.1.1이다.

## 확인 도구

| 도구 | 확인하는 것 |
|---|---|
| `TransactionSynchronizationManager.isActualTransactionActive()` | 현재 thread에 실제 transaction이 있는지. Transaction 없는 `SUPPORTS`처럼 synchronization만 켜진 상태와 구분된다 |
| `TransactionSynchronizationManager.isCurrentTransactionReadOnly()` | 적용된 readOnly 값. 기존 transaction에 참여했다면 바깥 설정이 보인다 |
| `AopUtils.isAopProxy(bean)` | 주입된 bean이 proxy인지 |
| `logging.level.org.springframework.transaction.interceptor=TRACE` | `TransactionInterceptor`가 가로챈 transaction 대상 method마다 `Getting transaction for [...]`와 `Completing transaction for [...]`를 남긴다. 대상이라고 생각한 method 호출에 이 log가 없으면 proxy를 거치지 않았거나 annotation이 인식되지 않은 것이다 |
| Transaction manager DEBUG log | 물리 commit과 rollback이 `Initiating transaction commit`, `Initiating transaction rollback`으로 남는다. 예외 log만으로는 결과를 알 수 없으므로 checked 예외 commit과 `rollbackFor`는 이 log로 검증한다 |

Manager log의 logger 이름은 실제 manager class다. Spring Boot가 자동 구성한 `JdbcTransactionManager`나 `JpaTransactionManager`의 class나 package로 level을 올린다([[Spring-Transactional-Propagation|Spring transaction 전파]]의 log 절).

## Proxy가 method마다 판단하는 방식

Class나 method에 `@Transactional`이 하나라도 있으면 transaction proxy가 실제 객체 대신 bean으로 등록되고 주입된다. Spring Boot 기본값은 class 기반 proxy(`spring.aop.proxy-target-class` 기본 `true`)라 대상 class를 상속한 하위 type이 주입된다. Proxy는 호출된 method가 transaction 대상인지 매번 판단해 대상이면 transaction을 시작하고, 아니면 transaction 없이 실제 method를 바로 호출한다. Class에 선언하면 그 class에 선언된 method 전체가 대상이 된다.

Spring 5.3까지는 proxy 종류와 관계없이 public method만 대상이었고, 6.0부터 class 기반 proxy는 protected와 package-visible method도 대상이 된다. 이전 자료의 public 전용 설명은 이 버전 차이로 읽는다.

## 적용 위치 우선순위

더 구체적인 선언이 우선한다. `AbstractFallbackTransactionAttributeSource`는 다음 순서로 찾아 처음 찾은 설정을 쓴다.

1. 구현 class의 method
2. 구현 class
3. Interface의 method
4. Interface

Class에 `@Transactional(readOnly = true)`, 쓰기 method에 `@Transactional`을 두면 쓰기 method만 read-write이고 annotation이 없는 method는 class 기본값을 따른다. Method별 값은 `isCurrentTransactionReadOnly()`로 확인한다. 이 관례와 재선언 누락의 실패 모드는 [[Spring-Transactional-Rollback-and-ReadOnly|rollback rule과 readOnly]]에 있다.

Interface 선언은 Spring 5.0부터 interface 기반과 class 기반 proxy에서 인식되지만, AspectJ mode의 weaving은 interface annotation을 인식하지 않아 조용히 무시된다. 구현 class에 둔다.

## 예외 없이 무시되는 경로

| 경로 | 이유 |
|---|---|
| 같은 객체 안의 내부 호출 | `this` 호출은 proxy를 거치지 않는다 |
| `private` method | 하위 class가 override할 수 없어 class 기반 proxy가 가로채지 못한다. CGLIB 검증 log도 남지 않는다 |
| Interface 기반 proxy의 non-public method나 interface에 없는 method | Interface에 선언된 public method만 proxy를 거친다 |
| `final` method | Override할 수 없다. Public final method는 proxy 생성 때 `Public final method [...] cannot get proxied via CGLIB` WARN만 남는다 |
| 상위 class에서 상속한 method | Class-level 선언은 상위 class로 올라가지 않으므로 하위 class에서 재선언해야 참여한다 |
| `new`로 만든 객체 | Spring bean이 아니므로 proxy가 없다 |
| `@PostConstruct` method 자신 | 아래 초기화 절 |

Annotation이 붙었는지 test하지 말고, 외부에서 proxy를 거쳐 호출했을 때 `isActualTransactionActive()`가 `true`인지와 rollback이 실제로 일어나는지를 test한다([[Spring-AOP-Practical-Patterns-and-Proxy-Limits|AOP 실전 패턴과 proxy 한계]]).

## 초기화 로직의 transaction

`@PostConstruct`와 `@Transactional`을 같은 method에 붙이면 transaction이 적용되지 않는다. Method 안에서 `isActualTransactionActive()`가 `false`다. `@PostConstruct`는 `CommonAnnotationBeanPostProcessor`가 초기화 전 단계에서 원본 객체에 호출하고, auto-proxy creator는 그 뒤 초기화 후 단계에서 원본을 proxy로 바꾼다([[Spring-AOP-Auto-Proxy-and-BeanPostProcessor|Spring AOP auto-proxy]]). 초기화 시점에는 proxy가 아직 없으므로 transaction을 얻을 수 없다. 같은 method를 나중에 bean을 통해 호출하면 proxy를 거치므로 적용된다.

```java
@PostConstruct
@Transactional
public void initV1() { }  // isActualTransactionActive() == false

@EventListener(ApplicationReadyEvent.class)
@Transactional
public void initV2() { }  // isActualTransactionActive() == true
```

Transaction이 필요한 초기화는 container와 AOP 준비가 끝난 뒤 발행되는 `ApplicationReadyEvent`의 listener로 옮긴다. Listener는 context에서 꺼낸 bean, 즉 proxy에서 호출되므로 transaction이 적용된다. Transaction이 필요 없는 일반 초기화는 `@PostConstruct`를 쓴다.

Spring Boot 4.1 문서 기준으로 이 시점의 운영 의미는 다음과 같다.

- `ApplicationReadyEvent`는 application runner와 command-line runner를 호출한 뒤에 발행되고, 바로 다음에 `ReadinessState.ACCEPTING_TRAFFIC` 이벤트가 발행된다. Listener는 기본적으로 같은 thread에서 실행되므로 readiness probe는 listener가 끝난 뒤에 준비 완료가 된다.
- `WebServerInitializedEvent`는 `ApplicationStartedEvent`보다 먼저 발행되므로 listener가 돌 때 web server는 이미 열려 있다. Probe를 거치지 않는 요청은 초기화 전에 들어올 수 있다.
- 오래 걸리는 작업은 listener에 두지 말고 application runner나 command-line runner를 고려하라고 문서가 권한다.

## 면접 체크포인트

- `@Transactional`이 조용히 적용되지 않는 경로와 이를 확인하는 도구를 말한다.
- 적용 위치 네 단계의 우선순위와 class 기본값 readOnly 관례를 설명한다.
- `@PostConstruct`에서 transaction이 적용되지 않는 이유를 bean lifecycle로 설명하고 `ApplicationReadyEvent` 대안의 운영 의미를 말한다.

## 출처

- [Spring Framework, Using @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- [Spring Framework 7.0.9, `TransactionAspectSupport` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/interceptor/TransactionAspectSupport.java)
- [Spring Framework 7.0.9, `AbstractFallbackTransactionAttributeSource` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/interceptor/AbstractFallbackTransactionAttributeSource.java)
- [Spring Framework 7.0.9, `AbstractPlatformTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/support/AbstractPlatformTransactionManager.java)
- [Spring Framework 7.0.9, `TransactionSynchronizationManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/support/TransactionSynchronizationManager.java)
- [Spring Framework 7.0.9, `CglibAopProxy` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-aop/src/main/java/org/springframework/aop/framework/CglibAopProxy.java)
- [Spring Framework 7.0.9, `InitDestroyAnnotationBeanPostProcessor` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-beans/src/main/java/org/springframework/beans/factory/annotation/InitDestroyAnnotationBeanPostProcessor.java)
- [Spring Boot 4.1, Application Events and Listeners](https://docs.spring.io/spring-boot/reference/features/spring-application.html#features.spring-application.application-events-and-listeners)
- [Spring Boot 4.1.1, `TransactionAutoConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-transaction/src/main/java/org/springframework/boot/transaction/autoconfigure/TransactionAutoConfiguration.java)
- 김영한 강사, [트랜잭션 적용 확인](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114680)
- 김영한 강사, [트랜잭션 적용 위치](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114681)
- 김영한 강사, [트랜잭션 AOP 주의 사항, 프록시 내부 호출 2](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114683)
- 김영한 강사, [트랜잭션 AOP 주의 사항, 초기화 시점](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114684)
- 김영한 강사, [예외와 트랜잭션 커밋, 롤백, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114686)
- 김영한 강사, [스프링 트랜잭션 이해 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114688)

## 관련 문서

- [[Spring-Transactional|Spring @Transactional]]
- [[Spring-Transactional-Rollback-and-ReadOnly|rollback rule과 readOnly]]
- [[Spring-AOP-Auto-Proxy-and-BeanPostProcessor|Spring AOP auto-proxy와 BeanPostProcessor]]
- [[Spring-AOP-Practical-Patterns-and-Proxy-Limits|AOP 실전 패턴과 proxy 한계]]
- [[Spring-Transaction-Events|Spring 트랜잭션 이벤트]] — 발행 지점의 `isActualTransactionActive()` 검사
