---
tags: [spring, component-scan, autowired, qualifier, constructor-injection]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Bean 등록과 자동 주입", "Spring Autowiring"]
---

# Spring Core, Bean 등록과 자동 주입

Bean 등록은 객체를 container의 관리 대상으로 만드는 일이고, autowiring은 등록된 후보 중 injection point의 의도에 맞는 객체를 연결하는 일이다. 자동화의 양보다 최종 graph가 명확한지가 더 중요하다.

## 수동 등록과 component scan

`@Bean`은 외부 library 객체, 생성 조건이나 명시적인 조립이 필요한 객체에 잘 맞는다. component scan은 애플리케이션의 반복적인 component 등록을 줄인다.

기본 scan 대상에는 `@Component`와 이를 meta-annotation으로 포함한 `@Controller`, `@Service`, `@Repository`, `@Configuration` 등이 있다. stereotype은 단순 label만은 아니다. 예를 들어 `@Repository`는 persistence exception translation 같은 후처리의 의미도 가진다.

`@ComponentScan`의 base package를 생략하면 선언한 configuration class의 package부터 탐색한다. Spring Boot는 main class를 project root package에 두어 `@SpringBootApplication`의 암묵적 scan 범위를 애플리케이션 코드로 제한하는 구성을 권장한다. default package는 classpath 전체를 넓게 읽을 수 있어 피한다.

include/exclude filter는 가능하지만, 복잡한 filter graph보다 package/module 경계를 명확히 하는 편이 보통 추적하기 쉽다. custom stereotype에서 Bean name attribute를 제공한다면 최신 Spring에서는 `@AliasFor(annotation = Component.class, attribute = "value")`로 의도를 명시한다.

## 이름 충돌을 우선순위로 숨기지 않는다

자동 scan끼리 같은 Bean name을 만들면 등록 단계에서 충돌한다. core Spring은 일부 수동 definition override를 허용할 수 있지만, Spring Boot의 `spring.main.allow-bean-definition-overriding` 기본값은 `false`다. override를 켜서 통과시키기보다 다음을 확인한다.

1. 같은 역할을 실수로 두 번 scan하지 않았는가?
2. 서로 다른 package의 같은 simple class name이 충돌하는가?
3. auto-configuration을 대체하려는 의도가 condition으로 표현되어 있는가?
4. 여러 구현이 정상이라면 Bean name 충돌이 아니라 후보 선택 문제로 모델링했는가?

## constructor injection을 기본으로 둔다

| 방식 | 적합한 경우 | 주의점 |
|---|---|---|
| constructor | 필수 dependency, immutable graph | dependency가 너무 많으면 책임 과다 신호다. |
| setter | 실제로 optional하거나 재설정 가능한 dependency | 불완전한 상태가 외부에 노출될 수 있다. |
| field | framework integration의 제한된 경계 | 직접 생성과 단위 test가 어렵고 계약이 숨는다. |
| 일반 method | 여러 값을 한 번에 설정해야 하는 특수 경우 | 호출 시점과 불완전 상태를 관리해야 한다. |

Spring Bean에 constructor가 하나뿐이면 `@Autowired`를 생략할 수 있다. constructor injection은 `final` field, 누락된 dependency의 조기 발견과 container 없는 단위 test에 유리하다. Lombok의 `@RequiredArgsConstructor`는 boilerplate를 줄이지만 생성된 constructor와 annotation processor 설정을 code review에서 볼 수 있어야 한다.

optional dependency는 의미를 코드에 드러낸다.

- `Optional<T>`는 값의 부재를 argument로 전달한다.
- `@Nullable T`는 nullable contract를 사용한다.
- `@Autowired(required = false)` method는 dependency를 만족하지 못하면 method 자체를 호출하지 않는다.

필수 dependency를 optional로 바꾸어 잘못된 구성을 숨기지 않는다.

## 같은 type 후보가 여러 개일 때

`@Autowired`는 기본적으로 type 후보를 찾는다. 하나로 결정되지 않으면 다음 의도를 구분한다.

1. `@Qualifier` 또는 custom qualifier로 의미 있는 후보 집합을 좁힌다.
2. 일반적인 기본 후보 하나는 `@Primary`로 표시한다.
3. 일반 후보가 없을 때만 선택될 후보는 Spring 6.2 이후 `@Fallback`을 사용할 수 있다.
4. 별도 resolution indicator가 없고 여전히 모호하면 injection point의 field/parameter name과 Bean name 일치를 fallback으로 본다.

`@Qualifier("persistent")`는 고유 Bean ID를 직접 가리키는 명령이라기보다 type 후보 안에서 특성을 좁히는 의미다. 문자열 오타와 중복 의미를 줄이려면 `@Qualifier`를 meta-annotation으로 포함한 custom annotation을 만들 수 있다.

```java
@Target({FIELD, PARAMETER, METHOD, TYPE})
@Retention(RUNTIME)
@Qualifier("mainDiscount")
public @interface MainDiscount {}
```

Bean 이름 fallback은 편리하지만 parameter rename이 wiring 의미를 바꿀 수 있다. 중요한 정책 선택은 qualifier나 별도 역할 type처럼 명시적인 계약을 선호한다.

## 모든 전략이 필요하면 collection으로 받는다

array, `List<T>`, `Set<T>`, `Map<String, T>`를 주입하면 해당 type의 후보들을 함께 받을 수 있다. `Map` key는 Bean name이다. 전략 registry나 chain을 만들 때 유용하지만, 어떤 구현이 포함되는지가 scan 범위에 숨어 있지 않은지 확인한다. 순서가 의미 있으면 `Ordered`, `@Order`, `@Priority` 같은 계약을 명시한다.

## 자동과 수동의 운영 기준

- controller, application service, repository처럼 수가 많고 규칙적인 업무 component는 scan을 기본으로 둔다.
- connection client, serializer, 공통 infrastructure처럼 생성 방법과 영향 범위를 보여줘야 하는 객체는 명시적 `@Bean`을 고려한다.
- 여러 정책 구현을 한 묶음으로 운영한다면 한 configuration에 수동으로 모아 graph를 보이게 하거나, 명시적인 qualifier와 registry contract를 둔다.
- Spring Boot auto-configuration은 조건과 back-off 규칙을 먼저 이해하고, 부족할 때만 사용자 Bean으로 대체한다.

자동 등록도 역할에 의존하도록 설계하면 OCP와 DIP를 지킬 수 있다. 반대로 수동 등록도 구체 구현이 애플리케이션 곳곳에 새어나가면 좋은 설계가 아니다.

## NestJS로 옮길 때

NestJS는 Spring식 classpath component scan보다 `@Module` metadata에서 provider graph를 명시한다. class token 외의 역할은 string이나 `Symbol` token을 사용하고 `useClass`, `useValue`, `useFactory`, `useExisting`으로 recipe를 선택한다.

Spring의 같은 type collection 주입을 그대로 기대하지 않는다. 여러 전략을 모두 주입하려면 collection provider를 명시적으로 구성할 수 있다.

```typescript
const DISCOUNT_POLICIES = Symbol('DISCOUNT_POLICIES')

const discountPolicies = {
  provide: DISCOUNT_POLICIES,
  useFactory: (fixed: FixedPolicy, rate: RatePolicy) => [fixed, rate],
  inject: [FixedPolicy, RatePolicy],
}
```

NestJS에는 Spring의 `@Primary`와 같은 일반 후보 우선순위를 기계적으로 찾기보다, 소비자가 요청하는 token 자체로 의미를 정한다. `useExisting`은 다른 token이 같은 instance를 가리키는 alias이고, `exports`는 다른 module에 공개할 token을 제한한다.

## 출처

- [Spring Framework, Classpath Scanning and Managed Components](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
- [Spring Framework, Using `@Autowired`](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)
- [Spring Framework, Qualifier 기반 autowiring](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html)
- [Spring Framework, `@Primary` and `@Fallback`](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-primary.html)
- [Spring Boot, Structuring Your Code](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- 김영한 강사, [Component scan과 의존관계 자동 주입 시작](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55368)
- 김영한 강사, [탐색 위치와 기본 scan 대상](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55369)
- 김영한 강사, [Component scan filter](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55370)
- 김영한 강사, [중복 등록과 충돌](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55371)
- 김영한 강사, [다양한 의존관계 주입 방법](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55373)
- 김영한 강사, [Optional dependency 처리](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55374)
- 김영한 강사, [Constructor injection 선택](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55375)
- 김영한 강사, [Lombok과 constructor injection](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55376)
- 김영한 강사, [조회 Bean이 둘 이상인 문제](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55377)
- 김영한 강사, [`@Autowired` field name, `@Qualifier`, `@Primary`](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55378)
- 김영한 강사, [Qualifier annotation 직접 만들기](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55379)
- 김영한 강사, [조회한 Bean을 `List`와 `Map`으로 받기](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55380)
- 김영한 강사, [자동과 수동의 실무 운영 기준](https://www.inflearn.com/courses/lecture?courseId=325969&unitId=55381)
- 김영한 강사, [Component scan과 자동 의존관계 설정](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49586)
- 김영한 강사, [Java code로 직접 Spring Bean 등록하기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49587)

## 관련 문서

- [[Spring-Core-Container-and-Bean-Metadata|Spring container와 Bean metadata]]
- [[Spring-Core-Scope-and-Lifecycle|Spring Bean scope와 lifecycle]]
- [[NestJS-Core-Concepts|NestJS 핵심 개념]]
- [[Cohesion-Coupling|응집도와 결합도]]
