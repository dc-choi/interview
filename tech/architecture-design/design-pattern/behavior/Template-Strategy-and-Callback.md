---
tags: [design-pattern, template-method, strategy, callback, composition]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Template Strategy Callback", "Template Callback Pattern", "템플릿 콜백"]
---

# Template Method, Strategy와 Callback

세 패턴은 모두 **변하지 않는 실행 골격과 바뀌는 동작을 분리**한다. 차이는 변형 지점을 상속으로 제공하는지, 객체/함수로 주입하는지, 실행마다 callback으로 넘기는지에 있다.

## 먼저 변화 축을 찾는다

```text
before
  -> variable operation
  -> success/failure handling
  -> cleanup/after
```

logging, transaction, resource cleanup 같은 골격이 반복되고 가운데 업무 동작만 달라진다면 분리 후보가 된다. 단순히 줄 수를 줄이려는 목적보다 실패/cleanup 규칙을 한곳에서 보장하는 가치가 중요하다.

## 세 방식 비교

| 방식 | 변형 메커니즘 | 장점 | 비용 |
|---|---|---|---|
| Template Method | subclass override | 알고리즘 순서를 강제 | 상속 결합, class 증가 |
| Strategy | interface/객체 composition | 독립 test와 교체 | 조립/상태 lifecycle 필요 |
| Callback | 실행 시 함수 전달 | 국소적이고 간결 | callback nesting, 예외 contract |

## Template Method

```java
abstract class TraceTemplate<T> {
    final T execute() {
        var started = begin();
        try {
            return call();
        } catch (RuntimeException e) {
            recordFailure(started, e);
            throw e;
        } finally {
            end(started);
        }
    }
    protected abstract T call();
}
```

Base class가 lifecycle을 소유하므로 subclass가 순서를 깨뜨리지 못하게 template method를 `final`로 둘 수 있다. 하지만 subclass가 base의 protected detail을 알아야 하고 Java는 단일 상속이므로 작은 variation에 과한 구조가 될 수 있다.

## Strategy

```java
interface Operation<T> {
    T run();
}

final class TraceContext {
    <T> T execute(Operation<T> operation) {
        // before, invoke, failure, cleanup
        return operation.run();
    }
}
```

Strategy를 constructor로 고정하면 조립 후 반복 실행하는 정책 객체에 적합하다. method parameter로 넘기면 호출마다 동작을 바꾸기 쉽다. Lambda는 함수형 interface인 Strategy 구현을 짧게 표현할 뿐 pattern의 의도는 composition에 있다.

## Template Callback

Spring의 `JdbcTemplate`, transaction template 같은 API는 resource acquire/release와 예외 변환을 template이 담당하고 사용자 code를 callback으로 받는다.

```java
return template.execute(context -> repository.save(command));
```

Callback contract에는 return type, checked exception 처리, retry 가능성과 resource 소유권이 포함된다. callback이 template이 제공한 resource 대신 별도 connection/manager를 사용하면 보장된 boundary를 벗어난다.

## 언제 proxy/AOP로 넘어가나

Template/callback은 call site가 template을 명시적으로 호출하므로 control flow가 보인다. 원본 call site조차 수정하지 않고 여러 Bean method에 공통 정책을 적용해야 한다면 proxy/interceptor/AOP를 검토한다.

- 업무 흐름에 중요한 transaction/retry는 명시적 template이 더 읽기 쉬울 수 있다.
- metric/logging처럼 횡단적이며 적용 policy가 안정적이면 AOP가 적합할 수 있다.
- pattern 도입 전 예외, return과 cancellation semantics가 보존되는지 test한다.

## 출처

- [Spring Framework, JdbcTemplate](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)
- [Spring Framework, Programmatic Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html)
- Template Method: [시작](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94427), [예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94428), [예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94429), [예제 3](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94430), [적용 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94431), [적용 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94432), [정의](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94433)
- Strategy: [시작](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94434), [예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94435), [예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94436), [예제 3](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94437)
- Callback: [시작](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94438), [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94439), [적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94440), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94441)

## 관련 문서

- [[TemplateMethod패턴이란|Template Method]]
- [[Strategy패턴이란|Strategy]]
- [[Spring-JDBC-Essentials|Spring JDBC]]
- [[Spring-AOP|Spring AOP]]
