---
tags: [jpa, hibernate, ddd, aggregate, orphan-removal, order-column]
status: done
verified_at: 2026-08-04
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

## Cascade와 orphanRemoval

| 설정 | 의미 | 주의점 |
|---|---|---|
| `cascade = PERSIST` | root 저장을 새 자식 저장으로 전파 | 기존 자식 재연결 의미까지 대신하지 않음 |
| `cascade = REMOVE` | root 삭제를 자식 삭제로 전파 | `OneToOne`, `OneToMany` 소유 관계에 한정 |
| `orphanRemoval = true` | 관계에서 빠진 privately owned 자식을 flush 때 삭제 | 공유되거나 다른 부모로 이동할 자식에는 부적합 |

`orphanRemoval`은 root와 생명주기를 함께하는 자식에만 사용한다. 새 객체, detached 객체, 이미 removed 상태인 객체에는 명세상 같은 의미를 기대할 수 없다. 다른 부모로 이동시키는 모델이라면 orphan 처리 순서에 기대지 말고 명시적인 이동 유스케이스와 제약을 설계한다.

## 순서가 도메인 상태인 List

커리큘럼의 수업 순서처럼 위치 자체가 비즈니스 의미라면 단순 `List`만으로 DB 순서가 보존된다고 가정하지 않는다.

- `@OrderColumn`은 별도 index column으로 위치를 저장한다.
- 중간 삽입, 삭제, 이동은 뒤쪽 여러 row의 index UPDATE를 만들 수 있다.
- `@OrderBy`는 속성이나 SQL 정렬 기준으로 조회하는 것이며 사용자가 정한 위치를 저장하는 `@OrderColumn`과 목적이 다르다.
- 큰 목록에서 이동이 잦다면 sparse rank, 별도 position 값, 순서 전용 모델을 비교한다.

도메인 메서드는 `moveLesson(from, to)`처럼 의도를 드러내고 index 경계, 빈 section 허용 여부, 마지막 수업 제거 가능 여부를 함께 검증한다.

## 조회 계획은 유스케이스가 정한다

애그리거트 전체를 항상 EAGER로 바꾸지 않는다. 변경 유스케이스에서 필요한 그래프는 트랜잭션 안에서 fetch join이나 `@EntityGraph`로 가져오고, 목록 화면은 projection을 사용할 수 있다.

- 컬렉션 순회 전에 실제 SQL 수와 row 증폭을 확인한다.
- 컬렉션 fetch join과 pagination은 provider/version별 SQL과 page semantics를 검증하고, portable한 기본안으로는 함께 쓰지 않는다.
- 애그리거트가 크다는 이유로 한 트랜잭션에서 부분만 로드한 채 불변식을 검사하면 누락된 상태로 판단할 수 있다.
- OSIV에 기대어 컨트롤러 직렬화 중 지연 로딩하지 않는다.

## 설계 체크리스트

- 자식이 root 없이 독립적으로 존재하거나 다른 부모와 공유되는가?
- 컬렉션에서 제거가 곧 DB 삭제라는 도메인 의미인가?
- 순서는 계산 가능한 정렬인가, 사용자가 바꾸는 영속 상태인가?
- 컬렉션 이동 한 번이 만드는 UPDATE 수를 측정했는가?
- 양방향 관계라면 root 메서드가 양쪽을 함께 동기화하는가?
- 명령 모델과 목록 조회 모델을 같은 fetch 전략으로 강제하고 있지 않은가?

## 출처

- [Jakarta Persistence 3.2 명세 — orphanRemoval](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#relationship-mapping-defaults)
- [Jakarta Persistence 3.2 API — OneToMany](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/onetomany)
- [Hibernate ORM current User Guide, Ordered Lists](https://docs.hibernate.org/stable/orm/userguide/html_single/#collections-ordered)
- [토비 강사 — 애그리거트와 JPA](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313420)
- [토비 강사 — 커리큘럼 도메인 개발, 제거와 orphanRemoval](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=470529)
- [토비 강사 — 커리큘럼 애플리케이션 서비스, OrderColumn과 조회](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=471509)

## 관련 문서

- [[DDD|DDD와 Aggregate]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델 통합/분리]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
