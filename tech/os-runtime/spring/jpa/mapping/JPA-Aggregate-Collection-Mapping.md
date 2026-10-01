---
tags: [jpa, hibernate, ddd, aggregate, orphan-removal, order-column]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Aggregate Mapping", "JPA 애그리거트 컬렉션", "orphanRemoval과 OrderColumn"]
---

# JPA 애그리거트 컬렉션 매핑

애그리거트는 비즈니스 일관성 경계이고, JPA 연관관계는 객체와 테이블을 연결하는 구현 수단이다. `cascade`, `orphanRemoval`, `@OrderColumn`을 붙였다고 애그리거트 경계가 자동으로 올바르게 만들어지는 것은 아니다. 경계를 먼저 정하고 컬렉션의 소유, 삭제, 순서와 조회 방식을 매핑한다.

## Aggregate Root가 변경을 통제한다

자식 컬렉션을 외부에 수정 가능한 상태로 노출하지 않는다. 추가, 제거, 이동은 root의 행위 메서드로 표현하고 그 안에서 불변식을 검사한다.

```java
public List<Lesson> lessons() {
  return Collections.unmodifiableList(lessons);
}

public void removeLesson(LessonId id) {
  if (lessons.size() == 1) throw new LastLessonCannotBeRemoved();
  lessons.removeIf(lesson -> lesson.id().equals(id));
}
```

Hibernate가 추적하는 내부 컬렉션은 변경 가능한 상태로 유지하고, 호출자에게만 읽기 전용 view를 준다. 읽기 전용 view는 root를 통한 변경까지 막는 immutable snapshot과는 다르다.

### 컬렉션 field는 선언 때 초기화하고 참조를 바꾸지 않는다

`private List<Lesson> lessons = new ArrayList<>();`처럼 field 선언에서 초기화한다. Hibernate는 컬렉션 값의 null semantics를 지원하지 않으므로 생성자나 getter의 null 검사도 사라진다. 영속화하면 Hibernate가 원래 컬렉션을 lazy loading과 변경 추적을 맡는 wrapper로 바꾼다. Hibernate 7.4.11에서 `ArrayList`로 선언한 bag은 `persist()` 직후와 조회 뒤 모두 `org.hibernate.collection.spi.PersistentBag`이었다.

그 뒤 setter나 임의의 method가 새 `List`로 참조를 교체하면 Hibernate가 추적하던 wrapper와 끊어진다. 7.4.11에서 `orphanRemoval = true` 컬렉션의 참조를 새 `ArrayList`로 바꾸고 flush하자 `HibernateException: A collection with orphan deletion was no longer referenced by the owning entity instance`가 났다. 두 entity가 같은 컬렉션 instance를 공유할 수도 없다. 컬렉션 setter를 공개하지 않고, 원소 추가와 제거는 `add()`, `remove()`, `clear()`를 쓰는 root method로만 한다.

## Cascade와 orphanRemoval

| 설정 | 의미 | 주의점 |
|---|---|---|
| `cascade = PERSIST` | root 저장을 새 자식 저장으로 전파 | 기존 자식 재연결 의미까지 대신하지 않음 |
| `cascade = REMOVE` | root 삭제를 자식 삭제로 전파 | `OneToOne`, `OneToMany` 소유 관계에 한정 |
| `orphanRemoval = true` | 관계에서 빠진 privately owned 자식을 flush 때 삭제 | 공유되거나 다른 부모로 이동할 자식에는 부적합 |

`orphanRemoval`은 root와 생명주기를 함께하는 자식에만 사용한다. 새 객체, detached 객체, 이미 removed 상태인 객체에는 명세상 같은 의미를 기대할 수 없다. 다른 부모로 이동시키는 모델이라면 orphan 처리 순서에 기대지 말고 명시적인 이동 유스케이스와 제약을 설계한다.

### orphanRemoval을 끄고 이동을 지원할 때

`orphanRemoval = true`는 컬렉션에서 원소를 빼는 순간 flush 때 삭제를 예약한다. 명세도 orphan이 된 entity를 다른 관계에 다시 붙이지 말라고 하므로, 수업을 다른 섹션으로 옮기는 동작(제거 후 재삽입)과 충돌한다. 이동이 필요한 커리큘럼은 `orphanRemoval`을 끄고 저장과 갱신만 `cascade`로 전파할 수 있다.

대가는 삭제를 code가 책임지는 것이다. 객체 model에서는 컬렉션에서 빼면 삭제지만 DB에는 DELETE가 필요하므로, 애플리케이션 서비스가 `removeLesson`, `removeSection`에서 child repository로 명시적으로 삭제해 고아 row를 남기지 않는다. child repository는 그 aggregate를 다루는 component 안에 두고 밖으로 노출하지 않는다. repository test로 삭제 필요성을 확인하고도 서비스 구현에서 delete 호출을 빠뜨리기 쉬우므로, `flush()`와 `clear()` 뒤 다시 조회해 row가 실제로 사라졌는지 test로 고정한다.

## 순서가 도메인 상태인 List

커리큘럼의 수업 순서처럼 위치 자체가 비즈니스 의미라면 단순 `List`만으로 DB 순서가 보존된다고 가정하지 않는다.

- `@OrderColumn`은 별도 index column으로 위치를 저장한다.
- 중간 삽입, 삭제, 이동은 뒤쪽 여러 row의 index UPDATE를 만들 수 있다.
- `@OrderBy`는 속성이나 SQL 정렬 기준으로 조회하는 것이며 사용자가 정한 위치를 저장하는 `@OrderColumn`과 목적이 다르다.
- 큰 목록에서 이동이 잦다면 sparse rank, 별도 position 값, 순서 전용 모델을 비교한다.
- Hibernate 7부터 `@OneToMany(mappedBy)` 쪽에 `@OrderColumn`을 붙이면 기동 때 경고(7.4.11의 HHH160246, `@OrderBy` 권장)가 난다. 7.4.11에서도 index 값은 기록됐지만 Hibernate 문서는 양쪽 관계를 함께 맞춰야 위치가 갱신된다고 한다. 경고 없이 위치를 소유하려면 부모 쪽 단방향 `@OneToMany`와 `@JoinColumn`, 또는 명시적 position field를 비교한다.

도메인 메서드는 `moveLesson(from, to)`처럼 의도를 드러내고 index 경계, 빈 section 허용 여부, 마지막 수업 제거 가능 여부를 함께 검증한다.

## 조회 계획은 유스케이스가 정한다

애그리거트 전체를 항상 EAGER로 바꾸지 않는다. 변경 유스케이스에서 필요한 그래프는 트랜잭션 안에서 fetch join이나 `@EntityGraph`로 가져오고, 목록 화면은 projection을 사용할 수 있다.

- 컬렉션 순회 전에 실제 SQL 수와 row 증폭을 확인한다.
- 컬렉션 fetch join과 pagination은 provider/version별 SQL과 page semantics를 검증하고, portable한 기본안으로는 함께 쓰지 않는다.
- 애그리거트가 크다는 이유로 한 트랜잭션에서 부분만 로드한 채 불변식을 검사하면 누락된 상태로 판단할 수 있다.
- OSIV에 기대어 컨트롤러 직렬화 중 지연 로딩하지 않는다.

### N+1을 test로 고정한다

`findById` 뒤 모든 섹션의 수업을 순회하면 섹션 조회 1번에 섹션 수만큼 수업 조회가 더해진다. Hibernate 7.4.11에서 섹션 2개, 수업 6개를 lazy로 순회하자 prepared statement가 4개였다. SQL log로 먼저 확인하고, `hibernate.generate_statistics=true`로 켠 `Statistics#getPrepareStatementCount()`를 test에서 전후 비교해 query 수를 단언하면 회귀를 막는다. datasource-proxy나 p6spy로 실행 문장 수를 세는 방법도 있다.

전체 graph가 필요한 유스케이스(내비게이션, 구조 변경)만 `@EntityGraph(attributePaths = {"sections", "sections.lessons"})`를 붙인 `findWithSectionsById` 같은 method를 쓰고 조회 전용 finder로 따로 노출한다. Spring Data JPA는 `property.nestedProperty` 형태의 중첩 경로를 지원한다. 두 컬렉션이 모두 `@OrderColumn` List면 7.4.11에서 left outer join 한 번(prepared statement 1개)으로 읽혔다. 둘 다 bag이면 query에 graph를 적용하는 순간 `MultipleBagFetchException`이 났고, `EntityManager.find`의 fetch graph에서는 두 번째 bag을 별도 SELECT로 채웠다([[JPA-JPQL]]).

## 설계 체크리스트

- 자식이 root 없이 독립적으로 존재하거나 다른 부모와 공유되는가?
- 컬렉션에서 제거가 곧 DB 삭제라는 도메인 의미인가?
- 순서는 계산 가능한 정렬인가, 사용자가 바꾸는 영속 상태인가?
- 컬렉션 이동 한 번이 만드는 UPDATE 수를 측정했는가?
- 양방향 관계라면 root 메서드가 양쪽을 함께 동기화하는가?
- 명령 모델과 목록 조회 모델을 같은 fetch 전략으로 강제하고 있지 않은가?
- 컬렉션 field를 선언 때 초기화하고 컬렉션 setter를 막았는가?
- `orphanRemoval`을 끈 삭제 유스케이스가 자식을 명시적으로 지우고 test로 확인하는가?
- 유스케이스별 query 수를 test로 단언하는가?

## 출처

- [Jakarta Persistence 3.2, Entity Relationships and orphanRemoval](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a516)
- [Jakarta Persistence 3.2 API — OneToMany](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/onetomany)
- [Hibernate ORM current User Guide, Ordered Lists](https://docs.hibernate.org/stable/orm/userguide/html_single/#collections-unidirectional-ordered-list)
- [Hibernate ORM 7.4 User Guide, Collections](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collections)
- [Hibernate ORM 7.4 User Guide, Wrappers](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collection-wrapper)
- [Hibernate ORM 7.4 User Guide, Mapping Lists](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collection-list)
- [Hibernate ORM 7.4 User Guide, Statistics](https://docs.hibernate.org/orm/7.4/userguide/html_single/#statistics)
- [Hibernate ORM 7.4 User Guide, Best practices for logging](https://docs.hibernate.org/orm/7.4/userguide/html_single/#best-practices-logging)
- [Hibernate ORM 7.4 API, `Statistics`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/stat/Statistics.html)
- [Hibernate ORM 7.4.11, `CollectionBinder` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/boot/model/internal/CollectionBinder.java)
- [Spring Data JPA 4.1 API, `EntityGraph`](https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/EntityGraph.html)
- [토비 강사 — 애그리거트와 JPA](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313420)
- [토비 강사 — 커리큘럼 도메인 개발 (1)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470528)
- [토비 강사 — 커리큘럼 도메인 개발, 제거와 orphanRemoval](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470529)
- [토비 강사 — 커리큘럼 애플리케이션 서비스, OrderColumn과 조회](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471509)
- [토비 강사 — 커리큘럼 애플리케이션 서비스 개발 (3)](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471510)
- [토비 강사 — 코드 리뷰와 개선 리팩터링](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471512)
- [김영한 강사 — 엔티티 설계시 주의점](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24284)

## 관련 문서

- [[DDD|DDD와 Aggregate]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델 통합/분리]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
