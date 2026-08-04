---
tags: [spring, bean, scope, lifecycle, prototype, request-scope]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Bean Scope와 Lifecycle", "Spring Prototype Request Scope"]
---

# Spring Core, Bean Scope와 Lifecycle

scope는 Bean definition으로부터 만든 instance를 어디까지 공유할지 정하고, lifecycle은 그 instance의 준비와 정리를 누가 언제 책임질지 정한다. 개수, 상태 격리, 자원 소유권을 한 문제로 봐야 한다.

## 초기화는 dependency 연결 뒤에 한다

constructor는 필수 값과 값싼 불변조건을 확립하는 데 적합하다. 주입이 끝나야 가능한 외부 연결이나 준비 작업을 constructor에서 시작하면 setter/property injection 값이 아직 없거나, 실패한 객체를 정리하기 어려울 수 있다.

개략적인 singleton Bean lifecycle은 다음과 같다.

```text
instance 생성
  -> dependency와 property 연결
  -> BeanPostProcessor before initialization
  -> @PostConstruct
  -> InitializingBean.afterPropertiesSet()
  -> custom init method
  -> BeanPostProcessor after initialization, proxy 가능
  -> 사용
  -> @PreDestroy
  -> DisposableBean.destroy()
  -> custom destroy method
```

여러 callback 방식을 동시에 쓰지 않는 편이 이해하기 쉽다. callback 내부의 network I/O가 오래 걸리거나 실패할 수 있다면 startup timeout, retry와 partial cleanup 정책도 함께 설계한다.

## Callback 선택 기준

| 방식 | 장점 | 주의점 |
|---|---|---|
| `@PostConstruct`, `@PreDestroy` | `jakarta.annotation` 표준, component에 간결 | source를 수정할 수 있어야 한다. |
| `InitializingBean`, `DisposableBean` | Spring이 명확히 호출 | domain class가 Spring API에 결합한다. |
| `@Bean(initMethod, destroyMethod)` | 외부 library에도 적용 가능 | method name과 실제 자원 계약을 맞춰야 한다. |
| `AutoCloseable`/추론된 destroy | 표준 `close` 계약을 재사용 | 암묵적 호출인지 문서와 test로 확인한다. |

Java configuration의 `@Bean`은 기본 destroy method 추론으로 public `close`나 `shutdown`, `AutoCloseable`/`Closeable` 계약을 인식할 수 있다. 원치 않으면 `destroyMethod = ""`로 끈다. 강제 종료에서는 callback이 실행되지 않을 수 있으므로 내구성 보장의 유일한 수단으로 쓰지 않는다.

## Scope별 소유권

| Spring scope | instance 경계 | 정리 책임과 주의점 |
|---|---|---|
| `singleton` | Bean definition당 container 안에 하나 | container가 종료 callback을 관리하고, mutable state의 동시성은 개발자 책임이다. |
| `prototype` | container에 요청할 때마다 새 instance | container는 생성과 초기화까지만 하고 destruction callback은 호출하지 않는다. |
| `request` | HTTP request 하나 | web-aware context가 필요하며 긴 scope에 연결할 때 provider/proxy가 필요하다. |
| `session` | HTTP session 하나 | session 크기, 직렬화와 분산 session 전략을 고려한다. |
| `application` | `ServletContext` 하나 | Spring `ApplicationContext` singleton과 경계가 같지 않을 수 있다. |
| `websocket` | WebSocket session 하나 | 연결 수명과 정리 경로를 확인한다. |

## Prototype을 singleton에 바로 넣으면 한 번만 resolve된다

prototype Bean을 singleton constructor에 주입하면 singleton 생성 시점에 새 prototype 하나가 만들어지고 그 reference가 계속 재사용된다. 호출마다 새 instance가 필요하다는 요구와 다르다.

```java
@Component
class ClientBean {
    private final ObjectProvider<PrototypeBean> provider;

    ClientBean(ObjectProvider<PrototypeBean> provider) {
        this.provider = provider;
    }

    int execute() {
        return provider.getObject().run();
    }
}
```

`ObjectProvider`는 전체 `ApplicationContext`를 service locator로 노출하지 않고 특정 type의 lookup을 늦춘다. 표준 provider를 쓸 수 있지만 현재 Jakarta Inject package와 dependency를 확인한다. prototype이 외부 자원을 잡는다면 반환 시점을 아는 client가 명시적으로 정리하거나 별도 manager를 둔다.

## Request scope는 실제 요청 시점까지 늦춘다

애플리케이션 startup에는 HTTP request가 없으므로 singleton이 request Bean을 즉시 만들 수 없다. `ObjectProvider`로 handler 실행 시 조회하거나 scoped proxy를 주입한다.

```java
@Scope(value = WebApplicationContext.SCOPE_REQUEST,
       proxyMode = ScopedProxyMode.TARGET_CLASS)
@Component
class RequestLogContext {
    // request 전용 상태
}
```

proxy는 singleton처럼 주입되지만 method 호출 시 현재 request의 실제 target을 찾는다. class proxy와 JDK interface proxy의 제한을 구분하고, private method나 concrete type 검사에 기대지 않는다. 지연 lookup을 숨기는 만큼 request scope는 correlation context, tenant context처럼 경계가 분명한 경우에 제한한다.

## NestJS scope는 이름이 비슷해도 의미가 다르다

| Spring | NestJS | 해석 |
|---|---|---|
| singleton | `Scope.DEFAULT` | 애플리케이션에서 공유되는 기본 provider다. |
| prototype | `Scope.TRANSIENT` | 비슷하지만 Nest transient는 각 consumer가 전용 instance를 받는 의미다. |
| request | `Scope.REQUEST` | 요청별 DI sub-tree를 만들고 dependency chain 위로 scope가 전파될 수 있다. |
| lifecycle callback | `OnModuleInit`, `OnModuleDestroy` 등 | module/application lifecycle이며 Bean callback과 정확히 1:1은 아니다. |

NestJS request scope는 provider 하나만 바뀌는 것이 아니라 이를 의존하는 controller와 provider graph까지 request-scoped가 될 수 있어 비용을 확인해야 한다. Spring scoped proxy를 그대로 흉내 내기보다 정말 요청별 객체가 필요한지, AsyncLocalStorage 같은 context 전달이 더 맞는지 먼저 판단한다.

NestJS의 shutdown hook은 process signal만으로 자동 보장되지 않는다. `app.close()`를 호출하거나 signal 처리를 위해 `enableShutdownHooks()`를 설정해야 `onModuleDestroy`, `beforeApplicationShutdown`, `onApplicationShutdown` 경로가 실행된다. request-scoped class는 애플리케이션 lifecycle hook의 일반적인 대상이 아니다.

## 점검 질문

- 공유 instance가 request별 mutable state를 field에 저장하는가?
- prototype 또는 transient를 사용하는 이유가 단순한 `new`보다 분명한가?
- 짧은 scope를 긴 scope에 연결할 때 실제 resolve 시점은 언제인가?
- 외부 자원을 만든 주체와 닫는 주체가 일치하는가?
- 정상 종료뿐 아니라 startup 실패와 강제 종료도 관찰 가능한가?

## 출처

- [Spring Framework, Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html)
- [Spring Framework, Lifecycle Callbacks](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html)
- [Spring Framework, Using the `@Bean` Annotation](https://docs.spring.io/spring-framework/reference/core/beans/java/bean-annotation.html)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS, Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- 김영한 강사, [Bean lifecycle callback 시작](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55383)
- 김영한 강사, [`InitializingBean`, `DisposableBean`](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55384)
- 김영한 강사, [Bean 등록 초기화와 소멸 method](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55385)
- 김영한 강사, [`@PostConstruct`, `@PreDestroy`](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55386)
- 김영한 강사, [Bean scope란?](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55388)
- 김영한 강사, [Prototype scope](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55389)
- 김영한 강사, [Prototype을 singleton Bean과 함께 쓸 때의 문제](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55490)
- 김영한 강사, [Provider로 prototype 문제 해결](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55390)
- 김영한 강사, [Web scope](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55391)
- 김영한 강사, [Request scope 예제](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55392)
- 김영한 강사, [Scope와 Provider](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55393)
- 김영한 강사, [Scope와 proxy](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55394)

## 관련 문서

- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기]]
- [[Spring-Core-Container-and-Bean-Metadata|Spring container와 Bean metadata]]
- [[NestJS-Lifecycle|NestJS lifecycle]]
- [[NestJS-vs-Spring-Runtime-DI|NestJS vs Spring runtime과 DI]]
