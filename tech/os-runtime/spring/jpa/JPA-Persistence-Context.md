---
tags: [jpa, jakarta-persistence, hibernate, persistence-context, dirty-checking]
status: done
verified_at: 2026-08-04
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
| detached | context와 분리되어 변경을 추적하지 않음 | `detach`, `clear`, `close` |
| removed | 삭제가 예약된 managed entity | `remove` |

`merge(detached)`는 전달한 객체 자체를 managed 상태로 바꾸지 않는다. 상태를 복사한 managed instance를 반환하므로 반환값을 사용해야 한다. 이미 managed인 객체는 별도 `save()` 없이 field를 변경하면 flush 때 반영된다.

## 1차 캐시와 동일성

```java
Member first = em.find(Member.class, 1L);
Member second = em.find(Member.class, 1L);
assert first == second;
```

이 cache는 보통 transaction 또는 `EntityManager` 범위다. 애플리케이션 전체나 분산 cache가 아니며, 대량 처리에서는 managed entity와 snapshot이 계속 쌓이지 않도록 주기적인 `flush()`와 `clear()`를 검토한다.

### 1차 cache와 공유 cache

1차 cache는 persistence context identity map이며 항상 lifecycle 관리에 참여한다. 2차 공유 cache는 persistence unit 범위의 선택 기능으로 provider와 cache 구현 설정이 필요하다. Redis 같은 임의의 application cache와 같은 계층으로 보지 말고, transaction consistency, invalidation과 query cache 사용 여부를 별도로 검증한다.

## 쓰기 지연과 변경 감지

`persist()`와 field 변경은 context에 기록되고 provider는 synchronization 때 필요한 SQL을 만든다. Hibernate의 변경 감지는 로드 snapshot과 현재 상태를 비교한다. 기본 UPDATE가 변경된 column만 포함한다고 가정하지 말고 생성 SQL을 확인한다.

```java
Member member = em.find(Member.class, 1L);
member.changeName("new-name");
// managed entity에는 update용 save 호출이 필요하지 않다.
```

쓰기 지연은 모든 식별자 전략에서 같은 모양이 아니다. Hibernate에서 DB가 insert 때 ID를 주는 `IDENTITY`는 식별자를 얻기 위해 insert가 앞당겨질 수 있다. batch 가능 여부는 provider, generator와 JDBC 설정을 함께 본다.

## flush는 동기화이지 commit이 아니다

Flush는 managed state를 DB SQL과 동기화하지만 transaction을 commit하거나 1차 cache를 비우지 않는다.

- transaction commit 전에 flush된다.
- `em.flush()`로 명시할 수 있다.
- 기본 `AUTO` mode에서 query 결과에 영향을 줄 변경은 query 전에 보이도록 provider가 처리한다.
- `COMMIT` mode에서는 context의 미반영 변경이 query 결과에 보이는지가 명세상 보장되지 않는다.

Constraint 위반을 일찍 확인하거나 대량 작업의 batch 경계를 제어하려고 명시적으로 flush할 수 있다. flush 뒤 rollback하면 DB transaction도 rollback되므로 flush를 영구 저장으로 오해하지 않는다.

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

## 출처

- [Jakarta Persistence 3.2, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#entity-operations)
- [Jakarta Persistence 3.2, Queries and Flush Mode](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#queries-and-flush-mode)
- [Hibernate ORM current User Guide, Persistence Context](https://docs.hibernate.org/stable/orm/userguide/html_single/#chapters/pc/PersistenceContext)
- 강의: [영속성 컨텍스트 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21686), [영속성 컨텍스트 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21687)
- 강의: [플러시](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21688), [준영속 상태](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21689), [정리](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21690)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Transactions|트랜잭션]]
