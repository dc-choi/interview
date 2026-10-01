---
tags: [jpa, jakarta-persistence, hibernate, persistence-context, dirty-checking]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Persistence Context", "영속성 컨텍스트", "Dirty Checking"]
---

# JPA 영속성 컨텍스트

영속성 컨텍스트는 entity identity와 lifecycle을 관리하는 단위 작업 공간이다. 같은 persistence context 안에서는 동일한 entity type과 primary key에 하나의 managed instance가 대응한다. 1차 cache, 변경 감지와 SQL 실행 시점은 이 경계 안에서 이해해야 한다.

## 엔티티 상태와 전이

| 상태 | 의미 | 대표 전이 |
|---|---|---|
| new/transient | 아직 persistence context와 무관한 객체 | `new` |
| managed | context가 identity와 변경을 추적 | `persist`, `find`, query |
| detached | 식별자는 있지만 context가 추적하지 않음 | `detach`, `clear`, `close`, transaction-scoped context의 commit과 rollback, 직렬화 |
| removed | 삭제가 예약된 managed entity | `remove` |

`merge(detached)`는 전달한 객체 자체를 managed 상태로 바꾸지 않는다. 상태를 복사한 managed instance를 반환하므로 반환값을 사용해야 한다. 이미 managed인 객체는 별도 `save()` 없이 field를 변경하면 flush 때 반영된다.

### 준영속이 생기는 실무 경로

명세의 detached는 DB row에 대응하는 식별자를 가졌지만 persistence context와 연결되지 않은 instance다. 애플리케이션이 수정 form이나 API 요청 값으로 `new Book()`을 만들고 기존 row의 `id`를 넣은 객체도 이렇게 다룬다. Context가 추적하지 않으므로 setter로 값을 바꿔도 commit 때 UPDATE가 나가지 않는다.

Spring의 transaction-scoped context에서는 service transaction이 끝나면 반환된 entity가 detached가 된다. OSIV가 켜져 있으면 request 끝까지 같은 `EntityManager`가 열려 있어 managed로 남고, transaction 밖에서 바꾼 값도 같은 request의 다음 transaction이 flush할 때 함께 반영될 수 있다([[JPA-API-OSIV]]).

| 수정 방법 | 동작 | 주의 |
|---|---|---|
| 변경 감지 | transaction 안에서 식별자로 entity를 다시 조회하고 바꿀 field만 변경 | 바꿀 속성을 고를 수 있음 |
| `merge` | 같은 식별자의 managed instance(없으면 DB에서 읽거나 새로 만든 copy)에 전달 객체의 상태 전체를 복사해 반환. 전달 객체는 계속 detached | form에 없던 field도 `null`로 덮어쓸 수 있음 |

기본은 변경 감지다. Controller는 식별자와 변경할 값(parameter나 DTO)만 넘기고, transaction이 있는 service가 entity를 조회해 `change(...)` 같은 의미 있는 domain method로 바꾼다. 주문처럼 여러 entity가 얽힌 command도 service가 조회부터 해야 managed 상태에서 business logic이 돈다. merge 덮어쓰기와 form binding 위험은 [[Spring-MVC-Server-Rendered-CRUD]]의 managed update 절에 둔다.

## 1차 캐시와 동일성

1차 cache는 persistence context 안의 identity map이다. key는 entity type과 `@Id`로 매핑한 식별자, value는 entity instance다. `persist()`한 entity도 여기에 등록된다.

1. `find()`는 DB보다 1차 cache를 먼저 찾는다.
2. 없으면 SELECT를 실행하고 결과 instance를 cache에 넣은 뒤 반환한다.
3. 같은 context에서 같은 식별자를 다시 `find()`하면 SELECT 없이 같은 instance를 준다.

```java
Member first = em.find(Member.class, 1L);
Member second = em.find(Member.class, 1L);
assert first == second;
```

이 cache는 보통 transaction 또는 `EntityManager` 범위다. 애플리케이션 전체나 분산 cache가 아니며, 대량 처리에서는 managed entity와 snapshot이 계속 쌓이지 않도록 주기적인 `flush()`와 `clear()`를 검토한다.

한 transaction 안에서만 살아 있으므로 성능 이득은 크지 않고 핵심은 동일성 보장이다. 같은 row를 두 번 읽으면 서로 다른 instance가 생기는 SQL 중심 DAO와 달리([[JPA-Ecosystem-and-Version-Migration]]), 같은 context에서는 같은 식별자가 같은 instance라 `==`가 true다. Hibernate 문서는 이를 식별자 조회와 entity를 싣는 query에 대한 application 수준 repeatable read로 설명하며, DB transaction의 격리 수준은 바꾸지 않는다.

한계도 함께 본다. Hibernate 7.4.11에서 context가 entity를 읽은 뒤 다른 transaction이 이름을 바꾸고 commit하자, 같은 context의 JPQL entity query는 SQL을 다시 실행했지만 이미 관리 중인 instance를 옛 값 그대로 돌려줬다. 같은 조건의 scalar projection(`select m.name ...`)은 새 값을 반환했고 `refresh()` 뒤에야 entity도 새 값이 됐다. 최신 DB 상태로 판단해야 하면 `refresh()`, lock 또는 조건부 UPDATE를 쓰고, 다른 transaction이 추가한 row는 query 결과에 새로 나타날 수 있다는 점도 고려한다. 같은 transaction의 bulk DML 뒤 재조회도 이 규칙을 따른다([[Querydsl-Dynamic-Queries-and-Bulk-DML|bulk DML 뒤 재조회]]).

### 1차 cache와 공유 cache

1차 cache는 persistence context identity map이며 항상 lifecycle 관리에 참여한다. 2차 공유 cache는 persistence unit 범위의 선택 기능으로 provider와 cache 구현 설정이 필요하다. Redis 같은 임의의 application cache와 같은 계층으로 보지 말고, transaction consistency, invalidation과 query cache 사용 여부를 별도로 검증한다.

## 쓰기 지연과 변경 감지

`persist()`와 field 변경은 context에 기록되고 provider는 synchronization 때 필요한 SQL을 만든다. Hibernate의 변경 감지는 로드 snapshot과 현재 상태를 비교한다. 기본 UPDATE가 변경된 column만 포함한다고 가정하지 말고 생성 SQL을 확인한다.

Hibernate는 이 기록을 action queue(흔히 쓰기 지연 SQL 저장소라고 부르는 곳)에 모은다. `persist()`는 insert action, `remove()`는 delete action을 쌓고, update action은 flush 때 변경 감지가 바뀐 entity에 대해서만 만든다. Commit은 flush로 SQL을 보낸 뒤 DB transaction을 commit하는 순서다. DB transaction이라는 작업 단위가 있어야 SQL을 모았다가 한꺼번에 보낼 수 있다.

```java
Member member = em.find(Member.class, 1L);
member.changeName("new-name");
// managed entity에는 update용 save 호출이 필요하지 않다.
```

쓰기 지연은 모든 식별자 전략에서 같은 모양이 아니다. Hibernate에서 DB가 insert 때 ID를 주는 `IDENTITY`는 식별자를 얻으려고 `persist()` 직후 INSERT를 실행하고 JDBC insert batching도 끈다([[JPA-Entity-Mapping-Identity]]). batch 가능 여부는 provider, generator와 JDBC 설정을 함께 본다.

### JDBC batch 설정

모아 둔 SQL을 JDBC batch로 묶어 보내려면 따로 켜야 한다. Hibernate 7.4의 `hibernate.jdbc.batch_size` 기본값은 0이라 batching이 꺼져 있고, 문서는 10에서 50 사이 값을 권한다. Spring Boot에서는 `spring.jpa.properties.hibernate.jdbc.batch_size`처럼 `spring.jpa.properties.` 뒤에 Hibernate 속성 이름을 정확히 적는다.

- `hibernate.order_inserts`와 `hibernate.order_updates`(기본 false)는 entity type과 식별자 순으로 문장을 정렬해 batch를 더 잘 묶는다. 정렬 비용이 있으므로 켜기 전후를 측정한다.
- Session마다 `unwrap(Session.class).setJdbcBatchSize(n)`으로 전역 값을 덮어쓸 수 있다.
- 실제로 묶였는지는 `org.hibernate.orm.jdbc.batch` logger(TRACE)나 datasource proxy로 확인한다.

## flush는 동기화이지 commit이 아니다

Flush는 managed state를 DB SQL과 동기화하지만 transaction을 commit하거나 1차 cache를 비우지 않는다.

- transaction commit 전에 flush된다.
- `em.flush()`로 명시할 수 있다.
- 기본 `AUTO` mode에서 query 결과에 영향을 줄 변경은 query 전에 보이도록 provider가 처리한다.
- `COMMIT` mode에서는 context의 미반영 변경이 query 결과에 보이는지가 명세상 보장되지 않는다.

Constraint 위반을 일찍 확인하거나 대량 작업의 batch 경계를 제어하려고 명시적으로 flush할 수 있다. flush 뒤 rollback하면 DB transaction도 rollback되므로 flush를 영구 저장으로 오해하지 않는다.

### SQL 실행 순서

Hibernate는 method 호출 순서가 아니라 action queue 순서로 SQL을 실행한다. 순서는 orphan removal, INSERT, UPDATE, collection 요소 변경, DELETE다. Hibernate 7.4.11에서 unique `code`를 가진 row를 `remove()`하고 같은 `code`의 새 entity를 `persist()`하자 flush가 INSERT를 먼저 실행해 unique 위반이 났다. 같은 key를 지우고 다시 넣어야 하면 `remove()` 뒤 `flush()`를 호출하거나, 삭제 후 재삽입 대신 기존 row를 수정한다.

## detach, clear, close

- `detach(entity)`: 한 entity를 분리한다.
- `clear()`: context의 모든 managed entity를 분리한다.
- `close()`: application-managed `EntityManager`와 context를 닫는다.
- transaction rollback 뒤에는 기존 managed state를 계속 신뢰하지 말고 작업 경계를 종료한다.

Detached 객체에서 이미 로드된 state는 읽을 수 있지만 초기화되지 않은 lazy association은 context 밖에서 안전하게 탐색할 수 없다. 요청 DTO 변환을 transaction 안에서 끝내거나 필요한 fetch plan을 미리 선택한다.

## 범위와 thread 안전성

`EntityManager`와 persistence context는 thread-safe가 아니므로 동시 실행 thread 사이에 공유하지 않는다. Spring의 일반적인 transaction-scoped context는 transaction 경계에 맞춰 공유된다. HTTP request와 항상 동일한 경계라는 뜻은 아니며 OSIV는 별도 설정이다.

## 점검 질문

- 지금 다루는 instance는 new, managed, detached, removed 중 무엇인가?
- SQL이 필요한 시점과 transaction commit 시점을 구분했는가?
- bulk DML이나 native SQL 뒤 context state가 DB와 어긋나지 않았는가?
- 대량 loop에서 context 크기와 JDBC batch를 측정했는가?
- 같은 unique key를 지우고 다시 넣는 흐름이 flush 순서에 걸리지 않는가?

## 출처

- [Jakarta Persistence 3.2, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a1060)
- [Jakarta Persistence 3.2, Queries and Flush Mode](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a4374)
- [Jakarta Persistence 3.2, Detached Entities](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a1982)
- [Jakarta Persistence 3.2, Transaction Rollback](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a2049)
- [Hibernate ORM current User Guide, Persistence Context](https://docs.hibernate.org/stable/orm/userguide/html_single/#pc)
- [Hibernate ORM 7.4 User Guide, Flush operation order](https://docs.hibernate.org/orm/7.4/userguide/html_single/#flushing-order)
- [Hibernate ORM 7.4 User Guide, Physical Transactions](https://docs.hibernate.org/orm/7.4/userguide/html_single/#transactions-physical)
- [Hibernate ORM 7.4 User Guide, Batching](https://docs.hibernate.org/orm/7.4/userguide/html_single/#batch)
- [Hibernate ORM 7.4, Introduction, Logging the generated SQL](https://docs.hibernate.org/orm/7.4/introduction/html_single/#logging-generated-sql)
- [Spring Boot 4.1, Configure JPA Properties](https://docs.spring.io/spring-boot/how-to/data-access.html)
- [Spring Framework 7.0.9, `OpenEntityManagerInViewInterceptor` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/support/OpenEntityManagerInViewInterceptor.java)
- [Spring Framework 7.0.9, `JpaTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/JpaTransactionManager.java)
- 강의: [영속성 컨텍스트 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21686), [영속성 컨텍스트 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21687)
- 강의: [플러시](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21688), [준영속 상태](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21689), [정리](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21690)
- 강의: [SQL 중심적인 개발의 문제점](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21670), [JPA 소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21683)
- 강의: [상품 수정](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24308), [변경 감지와 병합(merge)](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24309), [상품 주문](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24310)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Transactions|트랜잭션]]
