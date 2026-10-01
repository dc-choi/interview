---
tags: [spring, transaction, rollback, read-only, jpa, jdbc]
status: done
verified_at: 2026-09-30
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Transaction Rollback Rules", "rollbackFor", "RollbackOn", "checked 예외 커밋", "readOnly 트랜잭션"]
---

# Spring transaction rollback rule과 readOnly

`@Transactional`의 rollback rule은 예외 종류로 commit과 rollback을 가르고, `readOnly`는 기술마다 다른 최적화를 요청한다. 둘 다 기본값을 잘못 이해하면 오류 없이 의도와 다른 결과가 남는다. Transaction 추상화와 proxy 경계는 [[Spring-Transactional|Spring @Transactional]], 선언이 실제로 적용됐는지 확인하는 방법은 [[Spring-Transactional-Verification|transaction 적용 확인]]에 있다. 기준은 Spring Framework 7.0.9다.

## checked 예외를 commit하는 이유

- 선언적 transaction은 `RuntimeException`이나 `Error`가 proxy 밖으로 던져지면 rollback하고, checked 예외면 commit한다.
- 이 기본값은 unchecked 예외를 DB 접근 불가, SQL 문법 오류, network 오류처럼 복구할 수 없는 시스템 예외로, checked 예외를 호출자가 처리할 업무 의미의 예외로 가정한다. EJB CMT와 JTA의 전통적인 기본값과 같다.
- 정상 흐름이 아닌 결과는 시스템 예외와 업무 예외로 나눠 설계한다. 잔고 부족처럼 시스템은 정상인데 업무 조건이 맞지 않는 결과가 업무 예외다.

## 실패를 알리면서 상태를 남기는 설계

결제 잔고가 부족하면 주문은 저장하고 결제 상태를 대기로 둔 뒤, 고객에게 잔고 부족을 알리고 별도 계좌 입금을 안내해야 한다고 하자.

```java
@Transactional
public void order(Order order) throws NotEnoughMoneyException {
    orderRepository.save(order);
    if (order.isNotEnoughMoney()) {
        order.markPaymentWaiting();          // 대기 상태로 변경
        throw new NotEnoughMoneyException(); // checked, 기본 규칙상 commit
    }
    order.markPaymentCompleted();            // 결제 시스템 오류는 unchecked로 전파되어 rollback
}
```

| 결과 | 던지는 예외 | transaction | 남는 상태 |
|---|---|---|---|
| 정상 | 없음 | commit | 결제 완료 주문 |
| 시스템 예외 | unchecked | rollback | 주문 없음 |
| 잔고 부족 | `NotEnoughMoneyException`(checked) | commit | 결제 대기 주문, 호출자는 입금 안내로 분기 |

여기서 업무 예외는 실패 신호이면서 반환값처럼 쓰인다. 같은 결과를 `PaymentResult` 같은 반환값으로 돌려줄 수도 있다. 반환값은 transaction 결과가 예외 종류에 묶이지 않아 의도가 코드에 드러나고, checked 예외는 호출자가 처리를 빠뜨리지 못하게 compile 단계에서 강제한다.

## rollback 규칙을 바꾸는 방법

- `rollbackFor`는 checked 예외도 rollback하게 하고, `noRollbackFor`는 지정한 예외에서 rollback하지 않게 한다. 예외 type으로 지정하면 그 type과 하위 type이 일치한다. `rollbackForClassName` 같은 이름 pattern은 의도하지 않은 class까지 일치할 수 있다.
- Method마다 `rollbackFor`를 흩뿌리지 말고 전역 정책을 하나로 정한다. 기존 기본값을 유지한다면 `RuntimeException`은 항상 rollback된다는 규칙만 공유하면 되고, `rollbackFor`는 checked 예외를 rollback해야 하는 legacy 코드에만 둔다.
- Spring Framework 6.2부터 `@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)`로 전역 기본값을 모든 예외 rollback으로 바꿀 수 있다. 기본값은 `RUNTIME_EXCEPTIONS`다. 개별 rollback rule은 이 기본값을 덮지만 rule에 없는 예외에는 고른 기본값이 남는다. Spring `@Transactional`과 `jakarta.transaction.Transactional`에 모두 적용된다.
- Spring 문서는 EJB 방식의 commit되는 업무 예외에 의존하지 않는다면 실수로 던진 checked 예외에도 일관되게 rollback하도록 `ALL_EXCEPTIONS` 전환을 권하고, checked 예외를 강제하지 않는 Kotlin 애플리케이션에도 권한다. Kotlin 코드는 `Exception`을 상속한 예외가 기본 규칙상 commit된다는 점부터 점검한다.
- Spring Boot의 기본 `@EnableTransactionManagement` 설정은 사용자가 직접 선언하면 물러나므로(Spring Boot 4.1.1 source) 설정 class에 선언한다. 위 주문 예제처럼 checked 예외 commit을 계약으로 쓰는 코드가 있으면 전환 전에 `noRollbackFor`로 명시한다. 명시하지 않으면 전환 뒤 대기 주문도 rollback된다.

## 예외 계층 설계와 transaction 결과

Web 계층 예외 처리에서는 업무 예외를 `RuntimeException` 계층으로 만들고 checked 예외를 unchecked로 감싸 전파하는 관례가 흔하다([[Spring-Exception-Handling|Spring 예외 처리 전략]]). 이 관례를 따르면 기본 규칙상 업무 예외도 rollback된다. `@Transactional` 경계 안에서 checked 예외를 감싸는 순간 같은 실패의 transaction 결과가 commit에서 rollback으로 바뀐다. 실패를 알리면서 상태를 남겨야 하는 use case는 다음 중 하나를 명시적으로 고른다.

- 해당 업무 예외를 `noRollbackFor`에 둔다.
- 예외 대신 결과 값을 반환한다.
- 상태를 저장하는 transaction을 먼저 commit하고, 실패 통지는 그 transaction 밖에서 한다.

예외를 잡아 삼키는 것은 선택지가 아니다. 잡고 정상 반환하면 interceptor가 예외를 보지 못해 commit하고, 참여 transaction이 이미 rollback-only로 표시됐다면 바깥 commit에서 `UnexpectedRollbackException`이 난다([[Spring-Transactional-Propagation|Spring transaction 전파]]). 실제 결과가 commit인지 rollback인지는 예외 log가 아니라 transaction manager의 DEBUG log로 확인한다([[Spring-Transactional-Verification|transaction 적용 확인]]).

## readOnly가 실제로 바꾸는 것

`readOnly = true`는 읽기 전용 transaction을 요청하는 hint다. 쓰기를 막는 검사가 아니며 일부 DB만 read-only transaction의 `INSERT`와 `UPDATE`를 거부하므로 무결성 장치로 쓰지 않는다. 최적화는 framework, JDBC driver, DB 세 층에서 기술마다 다르게 일어난다.

| 층 | JPA(`JpaTransactionManager`와 Hibernate) | JDBC(`DataSourceTransactionManager`, `JdbcTransactionManager`) |
|---|---|---|
| Framework | flush mode를 `MANUAL`로 바꿔 commit 때 flush와 dirty checking을 건너뛴다. Transaction이 새로 연 `EntityManager`면 `setDefaultReadOnly(true)`로 조회 entity의 변경 감지용 snapshot도 만들지 않는다 | 없음 |
| JDBC driver | Spring 기본 구성(`prepareConnection` true, connection을 session 종료까지 보유)에서 `Connection.setReadOnly(true)` | `Connection.setReadOnly(true)` 후 끝나면 원복. `enforceReadOnly`를 켜면 `SET TRANSACTION READ ONLY`도 실행 |
| DB | driver가 전달한 read-only mode로 내부 최적화 가능 | 같음 |

- JPA는 조회 경로에 `readOnly = true`를 두는 편이 대체로 이득이다. 큰 entity graph일수록 dirty checking과 snapshot 비용이 줄어든다. OSIV로 `EntityManager`가 먼저 열려 있으면 snapshot 생략은 적용되지 않고 flush 생략만 적용된다.
- JDBC만 쓰는 경로는 framework 이득이 없고 driver 호출만 늘 수 있다. 예를 들어 MySQL Connector/J는 `readOnlyPropagatesToServer` 기본값 `true`에서 `setReadOnly` 때 server의 transaction 접근 mode를 바꾸는 추가 왕복을 만든다. InnoDB read-only 최적화를 얻는 대가다. JdbcTemplate 경로는 효과가 작거나 오히려 느려질 수 있으므로 성능 test로 판단한다.
- 제약을 걸수록 최적화 여지가 생긴다는 점이 readOnly의 설계 교훈이다.
- 이미 진행 중인 transaction에 참여하면 안쪽 `readOnly`는 무시된다([[Spring-Transactional-Propagation|Spring transaction 전파]]).

## class 기본값 readOnly와 쓰기 method 재선언

조회 method가 많은 JPA service는 class에 `@Transactional(readOnly = true)`를 두고 회원 가입, 주문, 취소 같은 쓰기 method에만 `@Transactional`을 다시 붙인다. Method 선언이 class 선언보다 우선하므로 쓰기 method만 read-write가 된다. Spring Data JPA의 `SimpleJpaRepository`도 같은 방식이다([[Spring-Data-JPA-Repository-Abstraction|Spring Data JPA Repository 추상화]]). 읽기에는 가급적 readOnly를 넣고 쓰기에는 넣지 않는다.

- 실패 모드: 쓰기 method에 재선언을 빠뜨리면 class의 `readOnly = true`를 물려받는다. Hibernate는 flush를 생략하므로 dirty checking 기반 `UPDATE`가 예외 없이 반영되지 않을 수 있다. `IDENTITY` 전략의 `persist`처럼 insert가 앞당겨지는 경로나 bulk query는 DB와 driver가 read-only transaction의 쓰기를 거부하면 오류가 된다. 조용한 미반영인지 오류인지는 DB와 driver 조합으로 test한다.
- 점검: code review에서 readOnly 기본 class의 모든 상태 변경 method에 쓰기 선언이 있는지 확인한다. Integration test는 변경 뒤 `flush()`와 `clear()` 또는 새 transaction으로 다시 읽어 반영을 검증하고, 적용된 값은 `TransactionSynchronizationManager.isCurrentTransactionReadOnly()`로 확인한다.
- Transaction이 아예 없으면 실패가 드러난다. Spring이 주입한 shared `EntityManager`로 transaction 밖에서 `persist()`를 부르면 `No EntityManager with actual transaction available for current thread` 메시지의 `TransactionRequiredException`이 난다. 데이터 변경과 지연 로딩은 transaction 안에서 실행한다.

## 어느 `@Transactional`을 import하나

Spring은 `jakarta.transaction.Transactional`(과거 `javax.transaction.Transactional`)도 Spring annotation의 drop-in 대체로 인식한다. 하지만 JTA annotation에는 `value`(TxType), `rollbackOn`, `dontRollbackOn`만 있고 `readOnly`, `isolation`, `timeout`이 없다. readOnly 관례를 쓰려면 `org.springframework.transaction.annotation.Transactional`로 통일하고, IDE 자동 import로 두 annotation이 섞이지 않게 code review나 architecture test로 막는다.

## 면접 체크포인트

- Checked 예외를 기본적으로 commit하는 이유와 업무 예외로 상태를 남기는 설계를 설명한다.
- 업무 예외를 `RuntimeException` 계층으로 바꿀 때 transaction 결과가 어떻게 달라지는지 말한다.
- Spring Framework 6.2 `rollbackOn`의 효과와 전환 전에 점검할 코드를 말한다.
- `readOnly`가 JPA와 JDBC에서 각각 무엇을 바꾸는지, class 기본값 readOnly에서 쓰기 재선언을 빠뜨리면 생기는 일을 설명한다.

## 출처

- [Spring Framework, Rolling Back a Declarative Transaction](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)
- [Spring Framework, Using @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- [Spring Framework 7.0.9, `EnableTransactionManagement` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/annotation/EnableTransactionManagement.java)
- [Spring Framework 7.0.9, `RollbackOn` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/annotation/RollbackOn.java)
- [Spring Framework 7.0.9, `HibernateJpaDialect` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/vendor/HibernateJpaDialect.java)
- [Spring Framework 7.0.9, `JpaTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/JpaTransactionManager.java)
- [Spring Framework 7.0.9, `DataSourceUtils` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/datasource/DataSourceUtils.java)
- [Spring Framework 7.0.9, `DataSourceTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/datasource/DataSourceTransactionManager.java)
- [Spring Framework 7.0.9, `SharedEntityManagerCreator` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/SharedEntityManagerCreator.java)
- [Spring Boot 4.1.1, `TransactionAutoConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-transaction/src/main/java/org/springframework/boot/transaction/autoconfigure/TransactionAutoConfiguration.java)
- [Spring Data JPA, Transactionality](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html)
- [Jakarta Transactions 2.0 API, Transactional](https://jakarta.ee/specifications/transactions/2.0/apidocs/jakarta/transaction/transactional)
- [MySQL Connector/J, Performance Extensions](https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-performance-extensions.html)
- 김영한 강사, [트랜잭션 옵션 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114685)
- 김영한 강사, [예외와 트랜잭션 커밋, 롤백, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114686)
- 김영한 강사, [예외와 트랜잭션 커밋, 롤백, 활용](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114687)
- 김영한 강사, [스프링 트랜잭션 이해 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114688)
- 김영한 강사, 활용 1: [JPA와 DB 설정, 동작확인](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24279), [회원 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24290), [상품 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24295)

## 관련 문서

- [[Spring-Transactional|Spring @Transactional]]
- [[Spring-Transactional-Verification|transaction 적용 확인]]
- [[Spring-Transactional-Propagation|Spring transaction 전파]]
- [[Spring-Exception-Handling|Spring 예외 처리 전략]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
