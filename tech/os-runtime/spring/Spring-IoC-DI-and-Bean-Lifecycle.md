---
tags: [spring, ioc, dependency-injection, bean, lifecycle]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring IoC DI", "Spring Bean Lifecycle", "스프링 빈 생명주기"]
---

# Spring IoC, DI와 Bean 생명주기

Spring IoC container는 객체를 대신 만들어 주는 도구에 그치지 않는다. **Bean definition을 읽고, 객체 생성과 의존성 연결, scope, lifecycle callback, post-processing을 일관된 규칙으로 관리**한다. 애플리케이션 코드는 구체 객체를 찾는 대신 필요한 계약을 선언한다.

## IoC와 DI의 관계

- **IoC**: 객체 생성과 연결 시점의 제어권이 애플리케이션 코드에서 container로 이동한 설계 원리
- **DI**: 생성자, factory method, setter 같은 경로로 의존성을 외부에서 제공하는 구현 방법
- **Bean**: Spring container가 생성, 조립하고 관리하는 객체
- **ApplicationContext**: BeanFactory 기능에 event, resource, 국제화 같은 애플리케이션 서비스를 더한 주된 container API

DI가 자동으로 낮은 결합도를 만들지는 않는다. 구현 클래스에 직접 의존하거나 지나치게 넓은 interface를 주입하면 container를 사용해도 변경 비용은 그대로다. 의존 방향과 계약의 크기가 먼저다.

## Definition과 instance를 구분한다

Bean definition은 객체 생성법을 적은 recipe다. class, factory method, constructor argument, property, scope, lifecycle metadata를 담고 실제 instance와 구분된다.

| 등록 방식 | 주된 용도 | 현재 해석 |
|---|---|---|
| XML `<bean>` | 소스 밖에서 조립 관계 변경 | 여전히 지원되지만 새 Boot 앱의 기본은 아님 |
| `@Configuration` + `@Bean` | 외부 라이브러리, 조건과 생성 로직이 있는 객체 | 명시적 Java configuration |
| component scan | 애플리케이션의 `@Component` 계열 | convention 기반 발견 |
| Boot auto-configuration | classpath와 property 조건에 따른 기본 Bean | 사용자 Bean이 있으면 물러나는 자동 설정 |

`@Bean` method의 return type이 Bean type을 결정하고 method name이 기본 Bean name이 된다. XML과 Java config는 원리는 같고 metadata 표현만 다르다.

## 주입 방식

```java
@Service
class OrderService {
    private final PaymentPort paymentPort;

    OrderService(@Qualifier("primaryPayment") PaymentPort paymentPort) {
        this.paymentPort = paymentPort;
    }
}
```

- **Constructor injection**: 필수 의존성을 완전한 상태로 만들고 field를 `final`로 둘 수 있다.
- **Setter injection**: 실제로 선택 사항이며 런타임 교체가 필요한 의존성에 제한한다.
- **Field injection**: 짧지만 객체를 container 밖에서 만들기 어렵고 필수 의존성이 signature에 드러나지 않는다.
- collection, array, typed `Map`을 주입하면 해당 element type의 후보들을 모을 수 있다.

단일 생성자에는 `@Autowired`가 없어도 된다. 같은 type 후보가 여럿이면 숨은 선택에 기대지 말고 다음 의도를 표현한다.

1. `@Qualifier`로 의미가 맞는 후보 집합을 좁힌다.
2. 일반 기본 후보라면 `@Primary`, 일반 후보가 없을 때만 쓸 후보라면 `@Fallback`을 검토한다.
3. 고유 이름을 직접 지목하는 의도라면 `@Resource`의 name 기반 의미와 구분한다.

`@Qualifier`는 고유 Bean ID를 뜻하는 장치가 아니라 type 후보 안에서 의미를 좁히는 filter다. 같은 qualifier를 가진 여러 Bean을 collection으로 받을 수도 있다.

## Scope는 instance 경계다

| Scope | instance 경계 | 주의점 |
|---|---|---|
| `singleton` | Bean definition당 container 안에 하나 | JVM 전체 singleton이 아니며 thread safety를 자동 보장하지 않음 |
| `prototype` | 요청할 때마다 새 instance | container는 생성 후 추적하지 않아 destruction callback을 호출하지 않음 |
| `request` | HTTP request 하나 | 더 긴 scope에 주입할 때 proxy 또는 provider 필요 |
| `session` | HTTP session 하나 | 메모리와 분산 session 일관성 비용 |
| `application` | ServletContext 하나 | 여러 Spring context와 경계가 다를 수 있음 |
| `websocket` | WebSocket session 하나 | web-aware context에서만 유효 |

singleton Bean이 mutable request 상태를 field에 보관하면 여러 요청 thread가 같은 값을 공유한다. 기본 scope와 무상태 설계를 함께 봐야 한다.

prototype Bean을 singleton 생성자에 바로 주입하면 singleton을 만들 때 한 번만 resolve된다. 호출마다 새 객체가 필요하면 `ObjectProvider`, method injection 또는 scoped proxy처럼 조회 시점을 늦추는 방법이 필요하다.

## Lifecycle의 확장 지점

개략적인 흐름은 다음과 같다.

```text
definition 로드
  -> instance 생성
  -> 의존성, property 주입
  -> BeanPostProcessor before initialization
  -> @PostConstruct / InitializingBean / custom init
  -> BeanPostProcessor after initialization, proxy 가능
  -> 사용
  -> @PreDestroy / DisposableBean / custom destroy
```

- 애플리케이션 callback은 가능하면 `@PostConstruct`, `@PreDestroy`처럼 framework 결합이 작은 방식을 쓴다.
- `InitializingBean`, `DisposableBean`은 Spring API에 직접 결합된다.
- 외부 client 연결은 생성자에서 무거운 I/O를 수행하기보다 준비 실패와 종료 순서를 관찰할 수 있게 설계한다.
- prototype scope의 정리는 client 책임이다.
- 강제 종료에서는 destroy callback이 실행되지 않을 수 있으므로 callback만을 유일한 내구성 보장으로 쓰지 않는다.

## 설정 분리는 응집도를 기준으로 한다

XML 파일이나 `@Configuration` class를 단순히 줄 수로 나누지 않는다. 데이터 접근, 외부 client, 보안처럼 함께 바뀌는 Bean을 같은 module에 두고 공개하는 Bean 수를 줄인다. `@Import`는 여러 configuration을 조합하지만 순환 import와 전역 scan은 경계를 흐릴 수 있다.

Spring Boot에서는 package root 아래 component scan과 auto-configuration이 많은 연결을 숨긴다. 테스트에서 실제 Bean 후보, condition evaluation report, active profile을 확인하지 않으면 설정 파일을 읽은 것만으로 최종 graph를 알 수 없다.

## NestJS와 원리 매핑

| Spring | NestJS | 공통 질문 |
|---|---|---|
| Bean, `ApplicationContext` | Provider, application context | 누가 instance를 만들고 소유하는가 |
| `@Configuration`, `@Bean` | `@Module` providers, dynamic module | 조립 경계가 어디인가 |
| type + qualifier | class token, string/symbol token | 여러 구현 중 무엇을 선택하는가 |
| singleton, request, prototype | default, request, transient scope | 상태를 누구와 얼마나 공유하는가 |
| `@PostConstruct`, `@PreDestroy` | `OnModuleInit`, shutdown hooks | 시작과 종료 실패를 어떻게 다루는가 |

문법은 달라도 핵심은 dependency graph, instance scope, lifecycle ownership이다.

## 흔한 오해

- IoC를 interface 사용과 같은 말로 본다. 구체 class도 Bean이 될 수 있고 interface만 쓴다고 IoC가 되는 것도 아니다.
- 기본 singleton을 thread-safe singleton으로 본다. container가 개수를 관리할 뿐 내부 상태 동기화는 별개다.
- `@Autowired`와 `@Resource`를 모두 이름 기반 주입으로 본다. 전자는 기본적으로 type 기반, 후자는 name 의미가 강하다.
- prototype Bean의 종료까지 container가 책임진다고 본다.
- XML은 동작이 다르고 annotation은 항상 최신이라고 본다. 같은 container metadata를 표현하는 여러 방식이다.

## 면접 체크포인트

- IoC는 제어 원리, DI는 의존성 제공 방식이라고 구분한다.
- Bean definition과 instance, singleton scope와 JVM singleton의 차이를 설명한다.
- constructor injection이 필수 의존성과 testability를 드러내는 이유를 말한다.
- 같은 type 후보가 여러 개일 때 qualifier, primary, fallback의 의도를 구분한다.
- lifecycle callback과 BeanPostProcessor/proxy 생성의 경계를 설명한다.

## 출처

- [Spring Framework, The IoC Container](https://docs.spring.io/spring-framework/reference/core/beans.html)
- [Spring Framework, Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)
- [Spring Framework, Qualifier 기반 autowiring](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html)
- [Spring Framework, @Bean과 @Configuration](https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html)
- [인프런, Spring DI](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13717)
- [인프런, 다양한 의존 객체 주입](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13718)
- [인프런, Bean scope와 설정 분리](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13719)
- [인프런, 의존 객체 선택](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13721)
- [인프런, Bean 생명주기](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13723)
- [인프런, Java configuration](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13724)

## 관련 문서

- [[Spring-Core|Spring Core 상세 인덱스]]
- [[Spring|Spring 인덱스]]
- [[Spring-Boot-Essentials|Spring Boot 자동 설정]]
- [[Spring-MVC|Spring MVC]]
- [[NestJS-vs-Spring|NestJS와 Spring 비교]]
