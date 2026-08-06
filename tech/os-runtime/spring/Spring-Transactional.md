---
tags: [spring, transaction, propagation, isolation, aop]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Transactional", "@Transactional", "Transaction Propagation"]
---

# Spring `@Transactional`

Spring transaction 추상화는 업무 단위와 resource별 transaction 제어를 분리한다. 애플리케이션은 `PlatformTransactionManager`라는 공통 계약을 사용하고, JDBC, JPA, JTA 등의 구현체가 실제 begin, commit, rollback을 수행한다.

## JDBC transaction의 연결 구조

하나의 local JDBC transaction은 한 `Connection`에서 수행된다. Spring의 imperative transaction manager는 transaction synchronization을 통해 현재 execution thread에 resource를 연결하고, `JdbcTemplate`과 `DataSourceUtils`가 그 connection을 재사용하게 한다.

- transaction manager와 data-access code가 같은 `DataSource`를 사용해야 한다.
- 별도로 `dataSource.getConnection()`을 호출하면 transaction-bound connection 밖에서 실행될 수 있다.
- 이 thread-bound 설명은 imperative model의 설명이다. Reactive transaction은 Reactor context를 사용하므로 `ThreadLocal`로 설명하면 안 된다.

자세한 JDBC resource 경계는 [[Spring-JDBC-Essentials|Spring JDBC Essentials]]를 참고한다.

## Programmatic 방식

명시적인 흐름 제어가 필요하면 imperative code에는 `TransactionTemplate`, reactive code에는 `TransactionalOperator`를 사용한다. Spring Framework는 일반적인 imperative programmatic flow에 `TransactionTemplate` 사용을 권장한다.

```java
transactionTemplate.executeWithoutResult(status -> {
    orderRepository.save(order);
    paymentRepository.save(payment);
});
```

callback 안에서 unchecked exception이 밖으로 전파되면 rollback된다. 업무 조건으로 rollback해야 하는 경우 `status.setRollbackOnly()`를 사용할 수 있지만, 예외와 상태 반환 중 어떤 contract를 쓸지 일관되게 정한다.

## Declarative 방식과 proxy 경계

`@Transactional`은 일반적으로 Spring AOP proxy가 method 호출을 가로채 transaction을 시작하고 종료한다. 정상 반환이면 commit하고, 기본 rollback rule에 해당하는 예외가 밖으로 전파되면 rollback한다.

```java
@Service
class OrderService {
    @Transactional
    public void placeOrder(Order order) {
        orderRepository.save(order);
        paymentRepository.save(order.payment());
    }
}
```

Proxy mode에서는 같은 객체 안의 `this.inner()` 호출이 proxy를 통과하지 않으므로 `inner()`의 `@Transactional` metadata가 적용되지 않는다. transaction boundary를 별도 bean의 public use-case method로 옮기는 방식이 가장 명확하다. AspectJ mode를 명시적으로 구성한 경우에는 weaving 방식이므로 proxy self-invocation 제약과 다르다.

Spring Framework 6.0 이후 class-based proxy는 `protected`와 package-visible method도 기본적으로 transaction 대상으로 만들 수 있다. Interface-based proxy의 transactional method는 proxied interface에 선언된 `public` method여야 한다. Proxy 종류에 관계없이 외부에서 proxy를 통과하는 호출만 intercept된다는 경계는 같다.

Concrete class의 method에 annotation을 두는 것이 가장 이식성이 높다. Class-level 설정은 해당 class의 기본값이고 method-level metadata가 더 구체적인 정책을 제공한다. Proxy가 완전히 초기화되기 전인 `@PostConstruct` 안에서는 transactional method 호출에 의존하지 않는다.

## 기본 rollback rule

- `RuntimeException`과 `Error`는 기본적으로 rollback한다.
- checked exception은 기본적으로 commit 대상이다.
- `rollbackFor`, `noRollbackFor`와 이름 pattern rule로 정책을 바꿀 수 있다.
- 예외를 잡아 정상 반환하면 interceptor는 그 예외를 볼 수 없다. 이미 참여 transaction이 rollback-only로 표시됐다면 바깥 commit 시 `UnexpectedRollbackException`이 발생할 수 있다.

기술 예외를 업무 예외로 바꿀 때는 cause를 보존하고, transaction 정책과 API contract를 함께 검토한다.

## 주요 속성

| 속성 | 의미 | 주의점 |
|---|---|---|
| `propagation` | 기존 transaction과 결합하는 방식 | 물리 transaction과 논리 scope를 구분한다 |
| `isolation` | DB isolation level 요청 | driver와 DB가 지원하는지 확인한다 |
| `readOnly` | 읽기 전용 의도를 전달하는 hint | 쓰기 금지를 보장하는 보안 경계가 아니다 |
| `timeout` | transaction 완료 제한 시간 | 실제 적용 범위는 manager와 resource에 따라 다르다 |
| `rollbackFor` | 추가 rollback exception | 너무 넓은 rule은 정상 복구 흐름도 rollback할 수 있다 |
| `transactionManager` | 사용할 manager 선택 | 여러 DB 또는 manager가 있을 때 명시한다 |

`readOnly = true`는 JDBC connection이나 ORM session에 최적화 hint를 전달할 수 있다. 실제 쓰기 차단과 최적화 수준은 transaction manager, persistence provider, driver와 DB에 따라 달라지므로 데이터 무결성 장치로 사용하지 않는다.

## Propagation

| 전파 | 기존 transaction이 있을 때 | 없을 때 |
|---|---|---|
| `REQUIRED` | 같은 물리 transaction에 참여 | 새 transaction 시작 |
| `REQUIRES_NEW` | 기존 것을 suspend하고 독립 transaction 시작 | 새 transaction 시작 |
| `SUPPORTS` | 참여 | transaction 없이 실행 |
| `MANDATORY` | 참여 | 예외 |
| `NOT_SUPPORTED` | suspend 후 transaction 없이 실행 | transaction 없이 실행 |
| `NEVER` | 예외 | transaction 없이 실행 |
| `NESTED` | 지원되는 manager에서 savepoint 사용 | 새 transaction 시작 |

`REQUIRED`의 각 method는 논리 scope가 분리돼도 같은 물리 transaction에 참여할 수 있다. 안쪽 scope가 rollback-only로 표시되면 바깥 scope가 정상 반환을 시도해도 전체 물리 transaction은 commit할 수 없다.

`REQUIRES_NEW`는 별도 물리 transaction이므로 JDBC에서는 추가 connection을 요구한다. 바깥 transaction이 connection을 보유한 채 안쪽 transaction이 pool을 기다릴 수 있으므로 호출 concurrency와 pool budget을 함께 계산한다. 외부 HTTP 호출을 독립 DB transaction으로 바꾸는 기능은 아니다.

`NESTED`는 savepoint 기반 부분 rollback이며 모든 transaction manager와 resource에서 같은 방식으로 지원되지 않는다. JPA transaction에서 자동으로 동일하게 동작한다고 가정하지 않는다.

## Spring Boot 4.1 자동 구성

Spring Boot 4.1은 classpath, 단일 후보 `DataSource`, 기존 bean 여부 같은 조건이 맞으면 `JdbcTransactionManager`를 자동 구성한다. 사용자 정의 `TransactionManager`가 있거나 여러 resource가 있으면 조건부 자동 구성이 물러나거나 명시적 선택이 필요하다. 자동 구성은 transaction boundary 자체를 만들어 주지 않으며, `@Transactional` 또는 programmatic API로 경계를 선언해야 한다.

## 경계 설계

- 여러 repository 변경이 하나의 업무 성공 또는 실패를 이루는 service use case에 경계를 둔다.
- transaction 안에서 원격 API, 긴 파일 I/O, 사용자 대기를 수행하지 않는다.
- database transaction은 broker와 외부 API까지 원자적으로 묶지 않는다. 필요하면 [[Transactional-Outbox|Transactional Outbox]]나 보상 전략을 사용한다.
- `REQUIRES_NEW`를 실패 은폐 수단으로 쓰지 않는다. 독립 commit이 업무 불변식에 맞는지 먼저 판단한다.
- `REQUIRES_NEW`는 앞선 성공을 보존하는 수단이지 외부 시스템과 내부 상태의 정합을 자동으로 맞추는 수단이 아니다. 바깥 transaction이 롤백될 수 있는 구조에서 안쪽만 먼저 commit되면, 외부 결제는 완료됐는데 바깥이 관리하던 상태는 롤백되는 dual-write 불일치가 더 명확하게 남을 수 있다. 외부 호출은 transaction 밖으로 빼고 중간 상태 기록과 완료 확정으로 단계를 나눈다 — [[External-API-Integration-Patterns|외부 API 연동 패턴]]의 3단계 분리.
- integration test에서 실제 transaction manager, propagation, rollback rule과 DB 동작을 검증한다.

## 면접 체크포인트

- `PlatformTransactionManager`가 업무 code와 resource transaction을 어떻게 분리하는지 설명한다.
- proxy 기반 `@Transactional`에서 self-invocation이 적용되지 않는 이유를 설명한다.
- `REQUIRED`, `REQUIRES_NEW`, `NESTED`의 논리 scope, connection, rollback 차이를 말한다.
- checked exception의 기본 commit rule과 명시적 rollback rule을 설명한다.
- imperative thread-bound synchronization과 reactive context를 구분한다.

## 출처

- [Spring Framework, Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [예약 취소와 환불에서 REQUIRES_NEW만으로 정합성을 지킬 수 없었던 이유 — velog](https://velog.io/@khs0305/%EB%B0%A5%ED%92%80-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%98%88%EC%95%BD-%EC%B7%A8%EC%86%8C%ED%99%98%EB%B6%88%EC%97%90%EC%84%9C-REQUIRESNEW%EB%A7%8C%EC%9C%BC%EB%A1%9C-%EC%A0%95%ED%95%A9%EC%84%B1%EC%9D%84-%EC%A7%80%ED%82%AC-%EC%88%98-%EC%97%86%EC%97%88%EB%8D%98-%EC%9D%B4%EC%9C%A0)
- [Spring Framework, Programmatic Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html)
- [Spring Framework, Declarative Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html)
- [Spring Framework, Transaction Propagation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)
- [Spring Boot 4.1 API, DataSourceTransactionManagerAutoConfiguration](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/jdbc/autoconfigure/DataSourceTransactionManagerAutoConfiguration.html)
- 김영한 강사, [문제점들](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110088)
- 김영한 강사, [트랜잭션 추상화](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110089)
- 김영한 강사, [트랜잭션 동기화](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110090)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 매니저 1](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110091)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 매니저 2](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110092)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 템플릿](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110093)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 AOP 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110094)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 AOP 적용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110095)
- 김영한 강사, [트랜잭션 문제 해결, 트랜잭션 AOP 정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110096)
- 김영한 강사, [스프링 부트의 자동 리소스 등록](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110097)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110098)
- 김영한 강사, [스프링 트랜잭션 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114678)
- 김영한 강사, [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114679)
- 김영한 강사, [트랜잭션 적용 확인](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114680)
- 김영한 강사, [트랜잭션 적용 위치](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114681)
- 김영한 강사, [트랜잭션 AOP 주의 사항, 프록시 내부 호출 1](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114682)
- 김영한 강사, [트랜잭션 AOP 주의 사항, 프록시 내부 호출 2](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114683)
- 김영한 강사, [트랜잭션 AOP 주의 사항, 초기화 시점](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114684)
- 김영한 강사, [트랜잭션 옵션 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114685)
- 김영한 강사, [예외와 트랜잭션 커밋, 롤백, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114686)
- 김영한 강사, [예외와 트랜잭션 커밋, 롤백, 활용](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114687)
- 김영한 강사, [스프링 트랜잭션 이해 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114688)
- 김영한 강사, [스프링 트랜잭션 전파 1, 커밋과 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114690)
- 김영한 강사, [스프링 트랜잭션 전파 2, 트랜잭션 두 번 사용](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114691)
- 김영한 강사, [스프링 트랜잭션 전파 3, 전파 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114692)
- 김영한 강사, [스프링 트랜잭션 전파 4, 전파 예제](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114693)
- 김영한 강사, [스프링 트랜잭션 전파 5, 외부 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114694)
- 김영한 강사, [스프링 트랜잭션 전파 6, 내부 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114695)
- 김영한 강사, [스프링 트랜잭션 전파 7, REQUIRES_NEW](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114696)
- 김영한 강사, [스프링 트랜잭션 전파 8, 다양한 전파 옵션](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114697)
- 김영한 강사, [스프링 트랜잭션 전파 기본 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114698)
- 김영한 강사, [트랜잭션 전파 활용 1, 예제 프로젝트 시작](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114700)
- 김영한 강사, [트랜잭션 전파 활용 2, 커밋과 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114701)
- 김영한 강사, [트랜잭션 전파 활용 3, 단일 트랜잭션](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114702)
- 김영한 강사, [트랜잭션 전파 활용 4, 전파 커밋](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114703)
- 김영한 강사, [트랜잭션 전파 활용 5, 전파 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114704)
- 김영한 강사, [트랜잭션 전파 활용 6, 복구 REQUIRED](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114705)
- 김영한 강사, [트랜잭션 전파 활용 7, 복구 REQUIRES_NEW](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114706)
- 김영한 강사, [트랜잭션 전파 활용 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114707)

## 관련 문서

- [[Spring|Spring 개요 (IoC, DI, AOP)]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Isolation-Level|Isolation Level]]
- [[Transactions|ACID 트랜잭션]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴]] — 외부 호출의 3단계 분리, 대사
