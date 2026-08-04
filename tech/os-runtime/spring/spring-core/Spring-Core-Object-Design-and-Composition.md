---
tags: [spring, oop, solid, ioc, dependency-injection]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring 객체 설계와 구성", "Spring Composition Root"]
---

# Spring Core, 객체 설계와 구성

Spring의 핵심 가치는 객체지향 언어의 다형성을 실무의 변경 가능한 객체 graph로 연결하는 데 있다. container는 객체 생성과 연결을 대신하지만, 역할과 책임, 행동 계약과 의존 방향은 개발자가 설계해야 한다.

## 역사보다 문제를 본다

EJB 중심의 엔터프라이즈 Java는 container 서비스와 표준화를 제공했지만 개발과 테스트 비용도 컸다. Spring은 단순한 Java 객체를 중심에 두고 IoC, DI, AOP, transaction 추상화를 제공하며 성장했다. Hibernate의 아이디어는 JPA 표준에도 큰 영향을 주었다.

현재 Spring은 하나의 기능이 아니라 Framework, Boot, Data, Security 등 프로젝트들의 생태계다. Spring Framework가 IoC container와 핵심 programming model을 제공하고, Spring Boot는 dependency와 자동 설정, 내장 server, 운영 기능의 기본 조합을 제공한다.

## 역할과 구현을 분리한다

다형성의 출발점은 클라이언트가 구체 class가 아니라 행동 역할과 협력하는 것이다. 회원 저장소가 memory에서 DB로, 할인 정책이 고정 금액에서 비율로 바뀌어도 주문 로직의 메시지는 유지될 수 있다.

그러나 interface만 선언했다고 OCP와 DIP가 성립하지는 않는다.

```java
final class OrderServiceImpl implements OrderService {
    private final MemberRepository members = new MemoryMemberRepository();
    private final DiscountPolicy discount = new FixDiscountPolicy();
}
```

클라이언트가 구현을 직접 생성하면 추상 역할과 구체 구현에 동시에 의존한다. 정책을 바꿀 때 클라이언트 코드도 수정해야 하므로 DIP와 OCP가 함께 깨진다.

## 사용 영역과 구성 영역을 나눈다

composition root는 구현 객체를 생성하고 어떤 역할에 연결할지 결정한다. 애플리케이션 객체는 자신의 비즈니스 책임에 집중하고, 구성 객체가 graph 선택 책임을 맡는다.

```java
final class AppConfig {
    private final MemberRepository members = new MemoryMemberRepository();
    private final DiscountPolicy discount = new RateDiscountPolicy();

    MemberService memberService() {
        return new MemberServiceImpl(members);
    }

    OrderService orderService() {
        return new OrderServiceImpl(members, discount);
    }
}
```

할인 정책을 바꿀 때 주문 서비스의 소스는 그대로 두고 구성 선택만 바꾼다. OCP는 시스템의 어떤 코드도 수정하지 말라는 뜻이 아니다. 예상한 변화 축에서 안정된 사용 영역을 닫고, 구성이나 새 구현을 통해 확장하라는 뜻이다.

## 작은 회원 예제로 경계를 검증한다

저장 기술이 정해지지 않은 회원 기능이라면 `MemberRepository` 역할과 memory 구현을 먼저 두고, service가 회원 등록과 중복 이름 검사 같은 use case를 담당하게 할 수 있다. 이 구조의 핵심은 memory repository 자체가 아니라 저장 기술을 바꿀 때 service의 업무 규칙이 함께 흔들리지 않는 경계다.

- `Map` 기반 구현은 빠른 학습용 fake이지만 process 재시작, 동시성, DB constraint를 대신하지 않는다.
- `Optional`은 조회 결과 부재를 표현할 수 있지만 모든 `null` 문제를 자동 해결하지 않는다.
- service의 사전 중복 조회만으로 동시 요청을 막을 수는 없다. 운영 DB의 `UNIQUE` constraint와 충돌 처리를 함께 둔다.
- memory, JDBC, JPA 구현은 같은 repository 계약 test를 통과해야 교체 가능성을 실제로 검증할 수 있다.

## SOLID가 적용되는 지점

| 원칙 | 이 구조에서의 의미 |
|---|---|
| SRP | 서비스는 실행 책임, 구성 객체는 생성과 연결 책임을 맡는다. |
| OCP | 새 정책을 추가하고 구성 선택을 바꿔도 주문 로직은 수정하지 않는다. |
| LSP | 모든 할인 구현은 금액, 실패와 부수효과에 관한 같은 계약을 지킨다. |
| ISP | 클라이언트가 필요하지 않은 저장소나 정책 기능까지 의존하지 않는다. |
| DIP | 주문 정책은 `DiscountPolicy` 역할에 의존하고 구성 영역이 구현을 연결한다. |

추상화는 비용이 있다. 구현 교체 가능성이 낮고 행동 계약도 없는 단순 class까지 모두 interface로 감싸면 탐색 비용만 커질 수 있다. 실제 변화 축과 테스트 대역이 필요한 경계부터 추상화한다.

## IoC와 DI를 분리해서 이해한다

- IoC는 실행 흐름, 객체 생성과 연결의 제어가 애플리케이션 객체 밖으로 이동한 원리다.
- DI는 constructor, factory method나 property를 통해 실제 의존 객체를 외부에서 제공하는 방법이다.
- 정적 class 의존관계는 import와 type에서 보이지만, 실제 instance graph는 구성 정보와 실행 조건에 따라 달라질 수 있다.
- framework는 정해진 lifecycle 안에서 사용자 코드를 호출하고, library는 애플리케이션 코드가 필요할 때 호출한다. 실제 제품은 두 성격을 함께 가질 수 있으므로 이 구분을 절대적인 분류표로 쓰지 않는다.

## 테스트가 설계 피드백을 준다

도메인 단위 테스트는 Spring container 없이도 객체를 직접 생성할 수 있어야 빠르고 명확하다. constructor에 필요한 역할이 드러나면 fake 구현으로 행동 계약을 검증할 수 있다. Spring context test는 등록 조건, 후보 선택, proxy와 실제 graph처럼 container가 담당하는 부분에 집중한다.

## NestJS와 TypeScript에 적용한다

TypeScript `interface`는 compile 후 사라지므로 DI token으로 직접 사용할 수 없다. Spring의 interface type 주입을 기계적으로 옮기지 말고 runtime token과 compile-time contract를 함께 둔다.

```typescript
export const DISCOUNT_POLICY = Symbol('DISCOUNT_POLICY')

@Module({
  providers: [
    { provide: DISCOUNT_POLICY, useClass: RateDiscountPolicy },
    OrderService,
  ],
  exports: [OrderService],
})
export class OrderModule {}

@Injectable()
export class OrderService {
  constructor(
    @Inject(DISCOUNT_POLICY) private readonly discount: DiscountPolicy,
  ) {}
}
```

NestJS의 composition root는 하나의 거대한 `AppConfig`라기보다 root module과 feature module들의 graph다. 구현 선택은 해당 역할을 소유한 module에 두고, `exports`는 외부에 필요한 token만 공개한다. `@Injectable()`은 등록 자체가 아니므로 module의 `providers` 또는 동적 module metadata에 포함해야 한다.

## 점검 질문

- 새 정책을 넣을 때 사용 영역과 구성 영역 중 어디가 바뀌는가?
- interface의 모든 구현이 같은 행동 계약을 지키는가?
- client가 구현 class를 직접 생성하거나 service locator로 찾고 있지 않은가?
- 단위 테스트가 container 없이 핵심 객체를 만들 수 있는가?
- NestJS token과 module 공개 범위가 역할의 소유권을 드러내는가?

## 출처

- [Spring Framework, IoC Container and Beans 소개](https://docs.spring.io/spring-framework/reference/core/beans/introduction.html)
- [Spring Boot, Spring Beans and Dependency Injection](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55321)
- 김영한 강사, [강의 자료](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55325)
- 김영한 강사, [자바 진영의 추운 겨울과 Spring의 탄생](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55327)
- 김영한 강사, [Spring이란?](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55328)
- 김영한 강사, [좋은 객체 지향 programming이란?](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55329)
- 김영한 강사, [좋은 객체 지향 설계의 5가지 원칙](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55330)
- 김영한 강사, [객체 지향 설계와 Spring](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55331)
- 김영한 강사, [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55333)
- 김영한 강사, [비즈니스 요구사항과 설계](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55334)
- 김영한 강사, [회원 domain 설계](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55335)
- 김영한 강사, [회원 domain 개발](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55336)
- 김영한 강사, [회원 domain 실행과 test](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55337)
- 김영한 강사, [주문과 할인 domain 설계](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55338)
- 김영한 강사, [주문과 할인 domain 개발](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55339)
- 김영한 강사, [주문과 할인 domain 실행과 test](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55340)
- 김영한 강사, [새로운 할인 정책 개발](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55342)
- 김영한 강사, [새로운 할인 정책 적용과 문제점](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55343)
- 김영한 강사, [관심사의 분리](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55344)
- 김영한 강사, [AppConfig refactoring](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55345)
- 김영한 강사, [새로운 구조와 할인 정책 적용](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55346)
- 김영한 강사, [전체 흐름 정리](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55347)
- 김영한 강사, [좋은 객체 지향 설계의 5가지 원칙 적용](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55348)
- 김영한 강사, [IoC, DI, container](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55349)
- 김영한 강사, [Spring으로 전환하기](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55350)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55396)
- 김영한 강사, [비즈니스 요구사항 정리](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49580)
- 김영한 강사, [회원 domain과 repository 만들기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49581)
- 김영한 강사, [회원 service 개발](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49583)

## 관련 문서

- [[OOP|객체지향 기본]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
- [[Spring-Core-Container-and-Bean-Metadata|Spring container와 Bean metadata]]
