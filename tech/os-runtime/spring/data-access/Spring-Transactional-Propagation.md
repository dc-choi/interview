---
tags: [spring, transaction, propagation, rollback-only]
status: done
verified_at: 2026-09-30
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Transaction Propagation", "트랜잭션 전파", "UnexpectedRollbackException"]
---

# Spring transaction 전파

이미 진행 중인 transaction이 있을 때 안쪽 경계가 참여할지, 보류하고 새로 시작할지에 따라 connection 수, 물리 commit 주체와 rollback 범위가 달라진다. Transaction 추상화, proxy 경계와 rollback rule은 [[Spring-Transactional|Spring @Transactional]]에 있다. 기준은 Spring Framework 7.0.9다.

## 전파가 필요한 이유

회원 가입 때 회원과 가입 이력 log를 함께 저장하거나 함께 rollback해야 한다면 경계를 어디에 둘지가 문제다.

- Repository마다 경계: service에는 transaction이 없고 `MemberRepository.save`와 `LogRepository.save`에만 `@Transactional`이 있으면 호출마다 별도의 물리 transaction이 된다. 회원 저장이 commit된 뒤 log 저장이 실패하면 log만 rollback되어 회원은 있는데 이력은 없는 상태가 남는다.
- Service 한 곳에 경계: service에만 `@Transactional`을 두면 manager가 얻은 connection을 동기화 저장소에 묶고 이후 repository가 그 connection을 쓰므로 한 transaction이 된다. 전파를 고민할 필요가 없는 가장 단순한 방법이다. JPA는 commit 직전에 flush하므로 INSERT SQL이 commit 직전에 몰려 찍힌다.
- 호출 경로마다 요구가 다를 때: 한 client는 service로 회원과 log를 한 transaction에 묶고, 다른 client는 `MemberRepository`만, 또 다른 client는 `LogRepository`만 호출하면서 각자 transaction을 원한다. Service에만 두면 단독 호출에 transaction이 없고, repository에만 두면 service 경로를 하나로 묶지 못한다. 전파가 없다면 transaction이 있는 method와 없는 method를 따로 만들어야 한다.
- 해결: 기본값 `REQUIRED`로 service와 repository 모두에 `@Transactional`을 둔다. Service 안에서 호출되면 repository는 참여하고 단독 호출되면 스스로 시작한다. 시작 지점과 관계없이 전체를 하나로 묶거나 필요한 곳만 분리할 수 있다는 것이 전파가 있는 이유다. Spring Data JPA의 기본 CRUD method가 자체 `@Transactional`을 가지면서 service transaction에 참여하는 것([[Spring-Data-JPA-Repository-Abstraction]]), 단독 호출에도 원자성이 필요한 custom fragment 구현 method에 `@Transactional`을 두는 것([[Spring-Data-JPA-Custom-Repositories]])도 같은 설계다.

전파 동작을 검증하는 test에는 test method 자체에 `@Transactional`을 걸지 않는다. Test transaction에 service가 참여하면 검증하려는 시작과 물리 commit 주체가 바뀐다([[Transactional-Test-Antipattern|Spring database 통합 테스트]]).

## 물리 transaction과 논리 transaction

- 물리 transaction은 실제 connection에서 `setAutoCommit(false)`로 시작해 commit 또는 rollback하는 DB transaction이다.
- 논리 transaction은 transaction manager로 여는 경계 단위다. `@Transactional` 메서드 호출이나 `getTransaction()` 호출마다 하나씩 생긴다. transaction 안에서 transaction을 또 열 때만 둘을 구분할 의미가 있다.
- 모든 논리 transaction이 commit돼야 물리 transaction이 commit된다. 하나라도 rollback되면 물리 transaction은 rollback된다.

## 전파 옵션

| 전파 | 기존 transaction이 있을 때 | 없을 때 |
|---|---|---|
| `REQUIRED` | 같은 물리 transaction에 참여 | 새 transaction 시작 |
| `REQUIRES_NEW` | 기존 것을 suspend하고 독립 transaction 시작 | 새 transaction 시작 |
| `SUPPORTS` | 참여 | transaction 없이 실행 |
| `MANDATORY` | 참여 | 예외 |
| `NOT_SUPPORTED` | suspend 후 transaction 없이 실행 | transaction 없이 실행 |
| `NEVER` | 예외 | transaction 없이 실행 |
| `NESTED` | 지원되는 manager에서 savepoint 사용 | 새 transaction 시작 |

실무에서는 대부분 `REQUIRED`를 쓰고 가끔 `REQUIRES_NEW`를 쓴다. 나머지는 위반 시 동작과 제약을 알아 두고 필요할 때 확인한다.

- `MANDATORY`에서 기존 transaction이 없거나 `NEVER`에서 기존 transaction이 있으면 `IllegalTransactionStateException`이 난다(`No existing transaction found for transaction marked with propagation 'mandatory'`, `Existing transaction found for transaction marked with propagation 'never'`).
- `NESTED`는 기존 transaction이 없으면 `REQUIRED`처럼 새로 시작하고, 있으면 같은 물리 transaction 안에 savepoint를 만든다. 안쪽 rollback은 savepoint까지만 되돌리므로 바깥이 예외를 잡으면 바깥은 commit할 수 있지만, 바깥이 rollback되면 안쪽 변경도 함께 rollback된다. `REQUIRES_NEW`와 달리 connection을 하나 더 쓰지 않는다.
- `NESTED`는 savepoint 기반 부분 rollback이며 보통 JDBC savepoint에 매핑되어 JDBC resource transaction에서 동작한다. `DataSourceTransactionManager`는 기본으로 허용하지만 `JpaTransactionManager`는 `nestedTransactionAllowed` 기본값이 `false`라 기존 transaction 안에서 `NESTED`를 쓰면 `NestedTransactionNotSupportedException`이 난다. 켜더라도 savepoint는 JDBC connection에만 적용되고 `EntityManager`와 영속성 컨텍스트의 entity에는 적용되지 않는다. JPA 자체가 nested transaction을 지원하지 않으므로 JPA 코드가 중첩 transaction처럼 되돌려진다고 기대하지 않는다.

## REQUIRED 참여의 동작

1. 바깥 `getTransaction()`은 기존 transaction이 없으므로 connection을 얻어 물리 transaction을 시작하고 동기화 저장소에 묶는다. 반환된 `TransactionStatus.isNewTransaction()`은 `true`다.
2. 안쪽 `getTransaction()`은 묶인 transaction을 발견하고 새 connection 없이 참여한다. `isNewTransaction()`은 `false`다. 바깥 transaction의 범위가 안쪽까지 넓어지는 것이다.
3. 안쪽 `commit()`은 신규 transaction이 아니므로 물리 commit을 하지 않는다.
4. 바깥 `commit()`이 실제로 commit하고 connection을 반환한다. 물리 commit과 rollback은 처음 시작한 신규 transaction만 한다. programmatic 방식에서는 각 `getTransaction()`이 돌려준 status로 commit이나 rollback을 호출한다.

```java
TransactionStatus outer = txManager.getTransaction(new DefaultTransactionAttribute()); // isNewTransaction() == true
TransactionStatus inner = txManager.getTransaction(new DefaultTransactionAttribute()); // false, 기존 transaction에 참여
txManager.rollback(inner); // 물리 rollback 없이 rollback-only만 표시
txManager.commit(outer);   // 물리 rollback 후 UnexpectedRollbackException
```

| 안쪽 | 바깥 | 물리 결과 | 이유 |
|---|---|---|---|
| commit | commit | commit | 바깥(신규)이 commit할 때 한 번 commit한다 |
| commit | rollback | 전체 rollback | 안쪽 commit은 논리적이라 물리 효과가 없다 |
| rollback | commit 요청 | 전체 rollback, `UnexpectedRollbackException` | 안쪽은 물리 rollback을 못 해 rollback-only를 표시하고, 바깥 commit 때 manager가 표시를 보고 rollback한 뒤 예외를 던진다 |
| `RuntimeException`이 바깥 메서드 밖까지 전파 | 바깥 AOP가 rollback | 전체 rollback, 추가 예외 없음 | 바깥도 rollback을 요청했으므로 예상한 rollback이다 |
| `REQUIRES_NEW` 안쪽 rollback | commit | 안쪽만 rollback, 바깥 commit | 안쪽이 자기 connection의 신규 transaction이라 바깥에 표시를 남기지 않는다 |

참여 transaction이 실패할 때 전체를 rollback-only로 표시하는 것은 manager 기본값(`globalRollbackOnParticipationFailure=true`)이다. `UnexpectedRollbackException`은 의도된 동작이다. 호출자는 commit을 요청했는데 실제로는 rollback됐으므로, 조용히 넘어가면 commit이 일어났다고 오해한다. Spring 문서도 호출자가 실제로 일어나지 않은 commit을 일어났다고 믿지 않게 하려고 이 예외를 던진다고 설명한다.

## REQUIRES_NEW의 보류와 재개

바깥 transaction의 resource를 동기화 저장소에서 떼어 두고(suspend) 새 connection으로 신규 transaction을 시작한다. 안쪽이 끝나면 그 connection을 반환하고 보류한 바깥 transaction을 다시 묶어(resume) 원래 connection으로 계속한다. 안쪽 lock은 안쪽 완료 직후 풀린다.

`REQUIRES_NEW`는 별도 물리 transaction이므로 JDBC에서는 추가 connection을 요구한다. 바깥이 connection을 쥔 채 안쪽이 pool을 기다리므로 여러 thread가 동시에 이 경로에 들어오면 pool 고갈을 넘어 deadlock까지 갈 수 있다. Spring 문서는 pool 크기가 동시 thread 수보다 최소 1 이상 크지 않으면 `REQUIRES_NEW`를 쓰지 말라고 경고한다. 호출 concurrency와 pool budget을 함께 계산한다([[Connection-Pool|DB 커넥션 풀]]). 외부 HTTP 호출을 독립 DB transaction으로 바꾸는 기능은 아니다.

## 참여하면 무시되는 속성

`isolation`, `timeout`, `readOnly`는 새 transaction을 시작할 때(기존 transaction이 없는 `REQUIRED`, 항상 새로 여는 `REQUIRES_NEW`) 적용된다. 기존 transaction에 참여하면 바깥 설정을 따르고 안쪽 선언은 조용히 무시된다.

- 바깥 read-write transaction 안에서 호출된 `@Transactional(readOnly = true)` 조회는 read-only 최적화(Hibernate flush 생략 등)를 받지 않는다.
- 바깥이 `readOnly = true`인 상태에서 쓰기 메서드를 `REQUIRED`로 호출하면 쓰기가 read-only transaction에 참여한다. Hibernate는 read-only transaction의 flush mode를 `MANUAL`로 두므로 변경 감지 쓰기가 반영되지 않을 수 있고, connection이 read-only로 설정되면 DB가 쓰기를 거부할 수 있다.
- 안쪽의 `timeout`과 isolation 선언은 바깥 설정에 덮인다. 안쪽 설정이 꼭 필요하면 경계를 바깥으로 옮기거나 추가 connection 비용을 감수하고 `REQUIRES_NEW`를 쓴다.

manager의 `validateExistingTransaction`을 `true`로 두면 isolation이 다른 참여와, read-only 바깥에 read-write 안쪽이 참여하는 경우를 `IllegalTransactionStateException`으로 거부한다. 기본값은 `false`다.

## 부가 작업이 실패해도 본 작업 유지하기

회원 가입과 가입 이력 log를 한 transaction으로 묶으면 정합성은 맞지만 log 저장 실패로 가입까지 rollback된다. log 실패는 기록만 하고 가입은 유지해야 한다면 service가 log 예외를 잡아 정상 흐름으로 바꾼다.

```java
@Transactional
public void join(String username) {
    memberRepository.save(new Member(username));
    try {
        logRepository.save(new Log(username));
    } catch (RuntimeException e) {
        log.warn("가입 이력 저장 실패 username={}", username, e); // 기록 후 정상 흐름
    }
}
```

- 모두 `REQUIRED`면 기대대로 되지 않는다. `LogRepository` proxy가 예외를 보고 rollback을 요청하지만 신규 transaction이 아니므로 rollback-only만 표시한다. service가 예외를 잡아 정상 반환해도 표시는 지워지지 않아 바깥 commit에서 물리 rollback과 `UnexpectedRollbackException`이 난다. 가입도 저장되지 않고 호출자는 예외를 받는다. 예상하지 못한 rollback 예외를 보면 이 구조를 먼저 의심한다.
- `LogRepository.save`에 `@Transactional(propagation = Propagation.REQUIRES_NEW)`를 두면 log 저장이 별도 connection의 신규 transaction이 된다. 실패해도 그 transaction만 rollback되고 바깥에 표시가 남지 않아 결과는 가입 commit, log rollback이다.
- `REQUIRES_NEW`는 transaction을 분리할 뿐 예외 전파를 막지 않는다. service가 예외를 잡지 않으면 `RuntimeException`이 service 밖으로 나가 가입 transaction도 rollback된다.
- `REQUIRES_NEW`를 쓰면 한 요청이 connection 두 개를 동시에 점유한다. 트래픽이 많은 경로에서는 pool 고갈로 이어질 수 있다.
- 대안은 transaction이 없는 facade가 가입 transaction과 log transaction을 차례로 호출하는 구조다. 두 transaction이 connection을 순서대로 쓰므로 동시 점유가 없고, class 하나가 늘어나는 대신 pool 위험을 피한다. 단순한 대안으로 풀리면 `REQUIRES_NEW`보다 먼저 검토한다.

```java
class MemberFacade { // transaction 없음
    void join(String username) {
        memberService.join(username);   // transaction 1, commit 후 connection 반환
        try {
            logService.save(username);  // transaction 2
        } catch (RuntimeException e) {
            log.warn("가입 이력 저장 실패 username={}", username, e);
        }
    }
}
```

log처럼 실패해도 본 작업을 유지해도 되는 부수 작업에만 분리한다. 감사 기록처럼 반드시 함께 남아야 하면 분리가 불변식을 깬다. `REQUIRES_NEW`를 실패 은폐 수단으로 쓰지 않는 원칙과 외부 호출의 commit 순서 불일치는 [[Spring-Transactional]]의 경계 설계 절을 따른다.

## log로 확인하기

manager의 DEBUG log로 참여, 보류와 물리 commit 주체를 확인한다. 문구는 Spring Framework 7.0.9 source 기준이므로 버전을 바꾸면 다시 확인한다.

| 상황 | DEBUG message |
|---|---|
| 신규 시작 | `Creating new transaction with name [...]` |
| 참여 | `Participating in existing transaction` |
| 참여 실패 | `Participating transaction failed - marking existing transaction as rollback-only` |
| rollback-only인데 commit 요청 | `Global transaction is marked as rollback-only but transactional code requested commit` |
| `REQUIRES_NEW` | `Suspending current transaction, creating new transaction with name [...]`, `Resuming suspended transaction after completion of inner transaction` |
| JDBC connection | `Acquired Connection [...] for JDBC transaction`, `Switching JDBC Connection [...] to manual commit`, `Releasing JDBC Connection [...] after transaction` |

- `AbstractPlatformTransactionManager`의 logger 이름은 실제 manager class다(`getClass()`). `org.springframework.jdbc.datasource.DataSourceTransactionManager`만 DEBUG로 올리면 Boot가 자동 구성한 `org.springframework.jdbc.support.JdbcTransactionManager`나 `org.springframework.orm.jpa.JpaTransactionManager`의 log는 보이지 않으므로 실제 manager의 class 이름이나 package로 설정한다.
- HikariCP의 `HikariProxyConnection@... wrapping ...` 표기에서 proxy 객체는 대여할 때마다 새로 만들어지므로 wrapping 뒤의 물리 connection으로 재사용 여부를 판단한다. 순차 실행한 두 transaction이 같은 물리 connection을 써도 pool 재사용일 뿐 별개 transaction이다. `REQUIRED` 참여에는 새 `Acquired Connection` log가 없고, `REQUIRES_NEW`는 바깥 connection을 쥔 채 다른 connection을 얻는다.

## 면접 체크포인트

- 물리 transaction과 논리 transaction을 구분하고 신규 transaction만 물리 commit한다는 원칙을 설명한다.
- 안쪽 `REQUIRED`가 rollback-only를 남기면 바깥 commit이 `UnexpectedRollbackException`이 되는 이유를 말한다.
- 부가 작업을 분리할 때 `REQUIRES_NEW`와 facade 순차 호출의 trade-off를 비교한다.
- 참여한 transaction에서 `readOnly`, `timeout`, isolation 선언이 무시되는 조건을 말한다.

## 출처

- [Spring Framework, Transaction Propagation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)
- [Spring Framework 7.0.9, `AbstractPlatformTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-tx/src/main/java/org/springframework/transaction/support/AbstractPlatformTransactionManager.java)
- [Spring Framework 7.0.9, `DataSourceTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/datasource/DataSourceTransactionManager.java)
- [Spring Framework 7.0.9, `HibernateJpaDialect` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/vendor/HibernateJpaDialect.java)
- [Spring Framework 7.0.9, `JpaTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/JpaTransactionManager.java)
- [HikariCP 7.0.2, `ProxyConnection` source](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.0.2/src/main/java/com/zaxxer/hikari/pool/ProxyConnection.java)
- 김영한 강사, [트랜잭션 옵션 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114685)
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

- [[Spring-Transactional|Spring @Transactional]]
- [[Spring-Transaction-Events|Spring 트랜잭션 이벤트]]
- [[Transactional-Test-Antipattern|Spring database 통합 테스트]] — test-managed transaction과 `REQUIRES_NEW`
- [[Connection-Pool|DB 커넥션 풀]]
- [[Isolation-Level|Isolation Level]]
