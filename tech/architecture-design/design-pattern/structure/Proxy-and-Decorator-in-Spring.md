---
tags: [design-pattern, proxy, decorator, spring, dependency-injection]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Proxy and Decorator in Spring", "Spring Proxy Decorator", "Spring에서 Proxy와 Decorator"]
---

# Spring에서 Proxy와 Decorator

Proxy와 Decorator는 client가 같은 contract를 통해 대리 object를 호출한다는 구조가 닮았다. Pattern 이름은 class diagram보다 **접근을 통제하는지, 책임을 덧붙이는지**라는 의도로 구분한다.

## 공통 구조

```text
Client -> Subject/Component
             ^
             |
        Proxy/Decorator -> RealSubject/Component
```

Client가 interface나 대체 가능한 type에 의존하면 DI 조립만 바꿔 원본 code 수정 없이 중간 object를 넣을 수 있다.

## 의도 차이

| 의도 | 대표 기능 |
|---|---|
| Proxy | lazy loading, remote access, authorization, cache와 호출 제한 |
| Decorator | message 변환, compression, timing처럼 책임 추가 |

Cache proxy도 결과를 덧붙인다는 관점에서는 decorator처럼 보일 수 있다. 이름보다 해당 object의 primary responsibility와 교체 이유를 문서화한다.

## interface 기반 수동 proxy

```java
final class TimingService implements OrderService {
    private final OrderService target;

    public Order place(Command command) {
        long start = System.nanoTime();
        try {
            return target.place(command);
        } finally {
            metrics.record(System.nanoTime() - start);
        }
    }
}
```

장점은 contract가 명확하고 test double/조합이 쉽다는 점이다. 단점은 interface method마다 forwarding code가 반복된다는 점이다.

## class 기반 수동 proxy

Interface가 없어도 subclass가 target type을 대체할 수 있다. 그러나 상속 가능한 method만 override할 수 있고 constructor/visibility/final 제약을 받는다. Domain class에 proxy 적용만을 위해 억지 interface를 만들 필요는 없지만, client가 concrete implementation detail에 결합돼 있는지 별도로 판단한다.

## chain과 order

여러 decorator를 연결하면 각 object가 한 책임만 가질 수 있다.

```text
client -> authorization -> timing -> cache -> target
```

순서가 semantics를 바꾼다. Cache 바깥에서 timing하면 cache hit도 측정하고, 안쪽이면 target 실행만 측정한다. Transaction, retry와 authorization도 같은 이유로 order를 명시하고 통합 test한다.

## 수동 proxy의 확장 한계

- target type/method가 늘 때 proxy class가 반복된다.
- component scan Bean과 수동 proxy/target 등록이 충돌할 수 있다.
- 어느 Bean이 실제 client에 주입되는지 구성만 보고 추적하기 어려워질 수 있다.
- method name 문자열 filter는 refactoring에 취약하다.

반복되는 forwarding을 줄이는 다음 단계가 JDK dynamic proxy/CGLIB이고, Spring은 `ProxyFactory`, Advisor와 auto-proxy creator로 이를 추상화한다.

## 출처

- [Spring Framework 7.0, AOP Proxies](https://docs.spring.io/spring-framework/reference/core/aop/introduction-proxies.html)
- 예제 준비: [project](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94443), [interface Bean](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94444), [concrete Bean](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94445), [component scan](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94446), [요구사항](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94447)
- pattern: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94448), [Proxy 예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94449), [Proxy 예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94450), [Decorator 예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94451), [Decorator 예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94452), [Decorator 예제 3](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94453), [비교](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94454)
- 적용: [interface proxy](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94455), [class 예제 1](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94456), [class 예제 2](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94457), [class proxy 적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94458), [방식 비교](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94459), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94460)

## 관련 문서

- [[Proxy패턴이란|Proxy pattern]]
- [[Decorator패턴이란|Decorator pattern]]
- [[Spring-AOP-Proxy-Factory|Spring AOP ProxyFactory]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC/DI]]
