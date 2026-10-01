---
tags: [spring, transaction, propagation, isolation, aop]
status: done
verified_at: 2026-09-30
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

직접 구현하면 service가 connection을 얻어 `setAutoCommit(false)`로 시작하고 repository 메서드마다 `Connection`을 parameter로 넘겨야 한다. transaction용과 비transaction용 메서드가 중복되고, repository는 받은 connection을 닫으면 안 되며, service에 JDBC 코드와 try-catch-finally가 쌓인다. Transaction manager는 transaction 추상화와 resource 동기화로 이를 없앤다. `DataSourceTransactionManager`의 순서는 다음과 같다(Spring Framework 7.0.9 source).

1. `getTransaction()`이 manager의 `DataSource`에서 connection을 얻고, autocommit이면 `setAutoCommit(false)`로 바꾼 뒤 `TransactionSynchronizationManager`에 묶는다. 저장소가 thread별이라 다른 요청의 connection과 섞이지 않는다. Manager에 `DataSource`를 주지 않으면 transaction을 시작하지 못한다.
2. Data access 코드는 `DataSourceUtils.getConnection(dataSource)`로 묶인 connection을 받는다. 묶인 것이 없으면 새로 얻는다.
3. `DataSourceUtils.releaseConnection(con, dataSource)`는 transaction에 묶인 connection이면 닫지 않고, 아니면 닫는다. 여기서 `con.close()`를 직접 부르면 진행 중인 transaction의 connection이 반환되고, `dataSource.getConnection()`으로 새로 얻으면 다른 DB session이라 transaction 밖에서 실행된다.
4. `commit(status)`나 `rollback(status)` 뒤 manager가 묶음을 풀고 바꿨던 autocommit, isolation과 read-only 상태를 되돌린 다음 connection을 반환한다. Service에는 정리 코드가 필요 없다.

Pool의 connection은 재사용되므로 수동 commit 상태 그대로 반환하면 다음 대여자가 그 상태를 물려받을 수 있다. 직접 구현한다면 finally에서 `setAutoCommit(true)` 뒤 `close()`한다. HikariCP 7.0.2는 반환 때 미커밋 변경을 rollback하고 autocommit, isolation, read-only를 pool 기본값으로 되돌리지만 모든 pool이 그렇다고 가정하지 않는다. Service는 JDBC `Connection` 대신 `PlatformTransactionManager`에만 의존하므로 JPA로 바꿀 때 manager 구현만 `JpaTransactionManager`로 바꾼다. 직접 JDBC의 connection 접근 규칙은 [[Spring-JDBC-Essentials|Spring JDBC Essentials]]를 참고한다.

## Programmatic 방식

명시적인 흐름 제어가 필요하면 imperative code에는 `TransactionTemplate`, reactive code에는 `TransactionalOperator`를 사용한다. Spring Framework는 일반적인 imperative programmatic flow에 `TransactionTemplate` 사용을 권장한다.

```java
transactionTemplate.executeWithoutResult(status -> {
    orderRepository.save(order);
    paymentRepository.save(payment);
});
```

callback 안에서 unchecked exception이 밖으로 전파되면 rollback된다. 업무 조건으로 rollback해야 하는 경우 `status.setRollbackOnly()`를 사용할 수 있지만, 예외와 상태 반환 중 어떤 contract를 쓸지 일관되게 정한다.

`TransactionTemplate`은 callback 밖으로 나온 예외를 종류와 관계없이 rollback한다. `RuntimeException`과 `Error`는 그대로, 선언되지 않은 checked 예외는 `UndeclaredThrowableException`으로 감싸 다시 던진다(Spring Framework 7.0.9 source). 선언적 방식의 checked 예외 commit 규칙은 여기에 적용되지 않는다. Callback signature가 checked 예외를 선언하지 않으므로 `SQLException` 같은 예외는 callback 안에서 원인을 담은 unchecked 예외로 감싸 던진다. Callback 안에서 예외를 잡고 정상 반환하면 commit된다.

## 선언적 방식과 programmatic 방식의 선택

직접 JDBC 제어, transaction manager 추상화, `TransactionTemplate`, `@Transactional` AOP 순으로 놓고 보면 각 단계가 앞 단계의 문제를 하나씩 없앤다. Manager 추상화와 동기화가 JDBC 기술 의존과 connection 전달을, `TransactionTemplate`이 try-catch-commit-rollback 반복을, `@Transactional` AOP가 service 안의 transaction 코드 자체를 없앤다.

- 선언적 방식은 service에 업무 로직만 남긴다. 대신 Spring container의 bean과 AOP proxy가 있어야 하므로 `new`로 만든 service에는 적용되지 않는다. Test에서는 service를 bean으로 등록하고 `AopUtils.isAopProxy(bean)`이나 CGLIB class 이름으로 proxy 적용을 확인한다.
- Programmatic 방식은 container와 AOP 없이 동작하지만 업무 로직과 transaction 기술 코드가 한 class에 섞인다.
- Spring 문서는 transaction 연산이 적으면 programmatic 방식, 많으면 선언적 방식을 권한다. Transaction 이름을 명시적으로 정하는 것은 programmatic 방식만 가능하다. 실무 기본값은 선언적 방식이고 programmatic 방식은 test나 좁은 구간에 쓴다.

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

선언해도 오류 없이 무시되는 경로(self-invocation, `private`와 `final` method, `@PostConstruct`), 적용 위치 네 단계의 우선순위, `ApplicationReadyEvent`로 옮기는 초기화와 실제 적용을 `TransactionSynchronizationManager`와 log로 확인하는 방법은 [[Spring-Transactional-Verification|transaction 적용 확인]]에 둔다.

`@Transactional` 메서드에 `synchronized`를 붙여도 동시 차감의 갱신 누락이 남는다. Proxy는 transaction을 시작하고 대상 메서드를 호출한 뒤 반환 후에 commit하는데, `synchronized`가 막는 범위는 메서드 본문뿐이다. 본문을 나와 commit하기 전의 틈에 다른 thread가 들어와 commit 전 값을 읽는다.

- 애플리케이션 계층의 lock(`synchronized`, in-memory mutex, DB named lock, Redis lock)은 보호하는 변경이 commit된 뒤에 풀어야 한다. Lock은 transaction 경계 바깥의 facade에서 잡고, transaction을 가진 service 호출이 commit까지 끝난 뒤 해제한다.
- `synchronized`는 한 process 안에서만 동작하므로 server가 둘 이상이면 다른 process가 동시에 들어온다([[Distributed-Lock]], [[Race-Condition-Patterns]]).

## 기본 rollback rule

- `RuntimeException`과 `Error`는 기본적으로 rollback한다.
- checked exception은 기본적으로 commit 대상이다.
- `rollbackFor`, `noRollbackFor`와 이름 pattern rule로 정책을 바꿀 수 있다.
- 예외를 잡아 정상 반환하면 interceptor는 그 예외를 볼 수 없다. 이미 참여 transaction이 rollback-only로 표시됐다면 바깥 commit 시 `UnexpectedRollbackException`이 발생할 수 있다.

기술 예외를 업무 예외로 바꿀 때는 cause를 보존하고, transaction 정책과 API contract를 함께 검토한다. checked 예외를 commit하는 이유, 실패를 알리면서 상태를 남기는 업무 예외 설계와 Spring Framework 6.2의 전역 `rollbackOn` 설정은 [[Spring-Transactional-Rollback-and-ReadOnly|rollback rule과 readOnly]]에 둔다.

## 주요 속성

| 속성 | 의미 | 주의점 |
|---|---|---|
| `propagation` | 기존 transaction과 결합하는 방식 | 물리 transaction과 논리 scope를 구분한다 |
| `isolation` | DB isolation level 요청 | driver와 DB가 지원하는지 확인한다 |
| `readOnly` | 읽기 전용 의도를 전달하는 hint | 쓰기 금지를 보장하는 보안 경계가 아니다 |
| `timeout` | transaction 완료 제한 시간 | 실제 적용 범위는 manager와 resource에 따라 다르다 |
| `rollbackFor` | 추가 rollback exception | 너무 넓은 rule은 정상 복구 흐름도 rollback할 수 있다 |
| `transactionManager` | 사용할 manager 선택 | 여러 DB 또는 manager가 있을 때 명시한다 |

`readOnly = true`는 JDBC connection이나 ORM session에 최적화 hint를 전달할 수 있다. 실제 쓰기 차단과 최적화 수준은 transaction manager, persistence provider, driver와 DB에 따라 달라지므로 데이터 무결성 장치로 사용하지 않는다. `isolation`, `timeout`, `readOnly`는 새 transaction을 시작할 때만 적용되고 기존 transaction에 참여하면 바깥 설정을 따른다. JPA와 JDBC에서 readOnly가 실제로 바꾸는 것, class 기본값 readOnly와 쓰기 method 재선언의 실패 모드는 [[Spring-Transactional-Rollback-and-ReadOnly|rollback rule과 readOnly]]에 있다.

## Propagation

`propagation`은 이미 transaction이 있을 때 참여할지, 보류하고 새로 시작할지, savepoint를 쓸지를 정한다. 기본값 `REQUIRED`는 같은 물리 transaction에 참여하고 `REQUIRES_NEW`는 추가 connection으로 독립 transaction을 연다. 전파 옵션 표, 물리와 논리 transaction, rollback-only와 `UnexpectedRollbackException`, 참여 시 무시되는 속성과 부가 작업 분리는 [[Spring-Transactional-Propagation|Spring transaction 전파]]에서 다룬다.

## Spring Boot 4.1 자동 구성

Spring Boot 4.1은 classpath, 단일 후보 `DataSource`, 기존 bean 여부 같은 조건이 맞으면 `JdbcTransactionManager`를 자동 구성한다(`spring.dao.exceptiontranslation.enabled=false`면 `DataSourceTransactionManager`). JPA(Hibernate)가 classpath에 있으면 JPA 자동 구성이 JDBC 쪽보다 먼저 실행돼 `TransactionManager` bean이 없을 때 `JpaTransactionManager`를 등록하고, JDBC 쪽은 manager가 이미 있어 물러난다. 그래서 JPA starter를 추가하면 JDBC만 쓰던 코드의 manager 구현도 바뀐다. `JpaTransactionManager`는 같은 `DataSource`를 `DataSourceUtils`나 `TransactionAwareDataSourceProxy`로 쓰는 plain JDBC 접근도 같은 transaction에 참여시킨다([[Spring-Data-Access-Strategy]]).

사용자 정의 `TransactionManager`가 있으면 이 자동 구성이 물러나고, `DataSource` bean을 직접 등록해도 `DataSource` 자동 구성이 물러난다. 여러 manager가 공존하면 `@Transactional(transactionManager = ...)`로 명시한다. 자동 구성은 transaction boundary 자체를 만들어 주지 않으며, `@Transactional` 또는 programmatic API로 경계를 선언해야 한다.

## 경계 설계

- 여러 repository 변경이 하나의 업무 성공 또는 실패를 이루는 service use case에 경계를 둔다. Repository를 단독으로 호출하는 경로까지 있으면 양쪽에 `REQUIRED`를 두는 이유는 [[Spring-Transactional-Propagation|Spring transaction 전파]]의 전파가 필요한 이유 절에 있다.
- transaction 안에서 원격 API, 긴 파일 I/O, 사용자 대기를 수행하지 않는다.
- database transaction은 broker와 외부 API까지 원자적으로 묶지 않는다. 필요하면 [[Transactional-Outbox|Transactional Outbox]]나 보상 전략을 사용한다.
- `REQUIRES_NEW`를 실패 은폐 수단으로 쓰지 않는다. 독립 commit이 업무 불변식에 맞는지 먼저 판단한다.
- `REQUIRES_NEW`는 앞선 성공을 보존하는 수단이지 외부 시스템과 내부 상태의 정합을 자동으로 맞추는 수단이 아니다. 바깥 transaction이 롤백될 수 있는 구조에서 안쪽만 먼저 commit되면, 외부 결제는 완료됐는데 바깥이 관리하던 상태는 롤백되는 dual-write 불일치가 더 명확하게 남을 수 있다. 외부 호출은 transaction 밖으로 빼고 중간 상태 기록과 완료 확정으로 단계를 나눈다 — [[External-API-Integration-Patterns|외부 API 연동 패턴]]의 3단계 분리.
- integration test에서 실제 transaction manager, propagation, rollback rule과 DB 동작을 검증한다.

## 면접 체크포인트

- `PlatformTransactionManager`가 업무 code와 resource transaction을 어떻게 분리하는지 설명한다.
- Transaction manager가 connection을 시작, 동기화, 정리하는 순서와 `DataSourceUtils`의 역할을 설명한다.
- proxy 기반 `@Transactional`에서 self-invocation이 적용되지 않는 이유를 설명한다.
- `synchronized`를 붙인 `@Transactional` 메서드에서 갱신 누락이 남는 이유를 commit 시점으로 설명한다.
- `REQUIRED`, `REQUIRES_NEW`, `NESTED`의 논리 scope, connection, rollback 차이를 말한다.
- checked exception의 기본 commit rule과 명시적 rollback rule, `TransactionTemplate`과의 차이를 설명한다.
- imperative thread-bound synchronization과 reactive context를 구분한다.

## 출처

- [Spring Framework, Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [예약 취소와 환불에서 REQUIRES_NEW만으로 정합성을 지킬 수 없었던 이유 — velog](https://velog.io/@khs0305/%EB%B0%A5%ED%92%80-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%98%88%EC%95%BD-%EC%B7%A8%EC%86%8C%ED%99%98%EB%B6%88%EC%97%90%EC%84%9C-REQUIRESNEW%EB%A7%8C%EC%9C%BC%EB%A1%9C-%EC%A0%95%ED%95%A9%EC%84%B1%EC%9D%84-%EC%A7%80%ED%82%AC-%EC%88%98-%EC%97%86%EC%97%88%EB%8D%98-%EC%9D%B4%EC%9C%A0)
- [Spring Framework, Programmatic Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html)
- [Spring Framework, Choosing Between Programmatic and Declarative Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/tx-decl-vs-prog.html)
- [Spring Framework, Declarative Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html)
- [Spring Framework, Transaction Propagation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)
- [Spring Framework API, JpaTransactionManager](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/orm/jpa/JpaTransactionManager.html)
- [Spring Framework 7.0.9, `TransactionTemplate` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/support/TransactionTemplate.java)
- [Spring Framework 7.0.9, `DataSourceTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/datasource/DataSourceTransactionManager.java)
- [Spring Boot 4.1 API, DataSourceTransactionManagerAutoConfiguration](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/jdbc/autoconfigure/DataSourceTransactionManagerAutoConfiguration.html)
- [Spring Boot 4.1.1, `HibernateJpaAutoConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-hibernate/src/main/java/org/springframework/boot/hibernate/autoconfigure/HibernateJpaAutoConfiguration.java)
- [Spring Boot 4.1.1, `JpaBaseConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-jpa/src/main/java/org/springframework/boot/jpa/autoconfigure/JpaBaseConfiguration.java)
- [HikariCP 7.0.2, `ProxyConnection` source](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.0.2/src/main/java/com/zaxxer/hikari/pool/ProxyConnection.java)
- 최상용 강사, [Synchronized 이용해보기](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174915)
- 최상용 강사, [Synchronized 이용해보기, 문제점](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174916)
- 김영한 강사, [트랜잭션 적용 2](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110086)
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

## 관련 문서

- [[Spring|Spring 개요 (IoC, DI, AOP)]]
- [[Spring-Transactional-Propagation|Spring transaction 전파]] — 물리와 논리 transaction, rollback-only, 부가 작업 분리
- [[Spring-Transactional-Rollback-and-ReadOnly|rollback rule과 readOnly]] — checked 예외 commit, 업무 예외 설계, 기술별 readOnly 효과
- [[Spring-Transactional-Verification|transaction 적용 확인]] — 조용한 미적용 경로, 적용 위치 우선순위, 초기화 시점
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Isolation-Level|Isolation Level]]
- [[Transactions|ACID 트랜잭션]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[Spring-Transaction-Events|Spring 트랜잭션 이벤트]] — 커밋 단계에 부수효과를 거는 배선과 그 계약
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴]] — 외부 호출의 3단계 분리, 대사
