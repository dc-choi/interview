---
tags: [jpa, hibernate, id-generation, sequence, equals-hashcode]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Identifier Strategy", "JPA 식별자 전략", "JPA entity equals hashCode", "allocationSize"]
---

# JPA 식별자 전략과 엔티티 동등성

Entity identity는 DB primary key와 persistence context 안의 Java instance를 잇는다. 식별자를 언제 얻는지가 쓰기 지연과 JDBC batch 가능 여부를 정하고, `equals`와 `hashCode`는 context 밖의 instance와 Java collection에서 같은 row를 어떻게 판단할지 정한다. [[JPA-Entity-Mapping|JPA 엔티티와 상속 매핑]]에서 분리한 문서다.

## identifier 전략

| 전략 | 식별자 획득 | 설계 포인트 |
|---|---|---|
| `IDENTITY` | insert 때 DB가 생성 | Hibernate batch insert와 쓰기 지연이 제한될 수 있음 |
| `SEQUENCE` | DB sequence에서 선할당 | `allocationSize`와 DB sequence increment를 맞춰 왕복을 줄임 |
| `TABLE` | 별도 generator table | portable하지만 contention과 추가 SQL을 측정 |
| `UUID` | UUID generator | Jakarta Persistence 3.1부터 표준, ID Java type과 저장 형식 확인 |
| `AUTO` | provider가 type과 DB에 맞춰 선택 | 생성되는 DB object와 실제 전략을 확인 |

Business key가 변경될 수 있으면 immutable surrogate key를 entity identity로 두고 business uniqueness는 별도 unique constraint로 표현하는 편이 안정적이다. Composite key는 `@EmbeddedId` 또는 `@IdClass`를 사용하며 equality와 DB equality가 일치해야 한다. 식별자 type과 대체 키 선택은 [[Primary-Key-Strategy]], Spring Data의 신규 판별과 assigned ID 저장은 [[Spring-Data-JPA-Entity-Persistence]]에 둔다.

## 식별자를 얻는 시점

Persistence context는 1차 cache를 identifier로 관리하므로 `persist()` 시점에 ID가 필요하다.

- `IDENTITY`: DB가 INSERT 때 값을 만든다. Hibernate는 ID를 얻으려고 `persist()` 직후 INSERT를 실행하고 JDBC generated key로 ID를 채운다. INSERT를 commit까지 미룰 수 없고 Hibernate는 이 entity의 JDBC insert batching을 끈다.
- `SEQUENCE`: `persist()` 때 sequence에서 값만 가져오고 INSERT는 flush까지 미룬다. `@SequenceGenerator(name, sequenceName, initialValue, allocationSize)`로 table별 sequence와 시작 값을 지정한다.

Hibernate 7.4.11과 H2에서 `IDENTITY` entity는 `persist()` 직후 `insert ... values (?, default)`가 실행됐다. `SEQUENCE` entity 3개는 `select next value for ...`만 실행했고 INSERT 3개는 flush 때 나갔다.

### allocationSize와 pooled optimizer

`allocationSize` 기본값은 50이고 Hibernate가 생성하는 DDL도 `create sequence ... increment by 50`이 된다. Hibernate 기본 pooled optimizer는 sequence 값 하나를 50개 ID 구간의 경계로 해석하고 구간 안의 ID는 memory에서 나눠 준다. 같은 환경에서 entity 52개를 저장하는 동안 sequence 호출은 3번이었다(첫 구간을 잡을 때 한 번 더 호출). 여러 서버가 같은 sequence를 호출해도 DB가 서로 다른 값을 주므로 구간이 겹치지 않는다.

- 기존 DB sequence의 `INCREMENT BY`와 `allocationSize`가 다르면 Hibernate는 기본 설정(`hibernate.id.sequence.increment_size_mismatch_strategy=EXCEPTION`)에서 불일치를 감지해 예외를 낸다. migration으로 만든 sequence와 mapping을 함께 바꾼다.
- memory에 받아 둔 구간은 서버가 재시작하면 버려지므로 ID에 빈틈이 생긴다. 생성 ID를 빈틈 없는 business 번호로 쓰지 않는다.
- `TABLE` 전략도 같은 `allocationSize` 최적화를 쓰지만 별도 transaction과 row lock으로 sequence를 흉내 내므로 Hibernate 문서도 성능이 나쁘다고 본다. sequence를 지원하는 DB에서는 보통 `SEQUENCE`를 먼저 검토한다.

## equals와 hashCode

Hibernate는 같은 session 안에서 같은 row를 같은 Java instance로 보장하므로 context 안에서는 기본 `Object.equals`로도 충분하다. 문제는 다른 context에서 읽은 instance, 저장 전 instance와 proxy를 `Set`이나 `Map` key로 섞을 때다. Hibernate 문서는 변하지 않는 natural id가 가장 좋다고 하고, 대리 키만 있으면 두 조건을 지키라고 한다.

- ID 비교는 저장된 entity끼리만 한다. ID가 `null`인 새 entity를 같다고 보면 서로 다른 새 객체가 합쳐진다. `getId()`에 `@Nullable`을 붙이면 IDE와 정적 분석기가 null 가능성을 알 수 있다.
- `hashCode`는 flush 전후에 바뀌지 않게 class 기준 상수로 둔다. generated ID로 hash를 계산하면 `Set`에 넣은 뒤 ID가 채워지면서 bucket이 바뀌어 `contains()`가 false가 된다.

```java
@MappedSuperclass
public abstract class AbstractEntity {
  @Id @GeneratedValue
  private Long id;

  public @Nullable Long getId() { return id; }

  @Override
  public final boolean equals(Object o) {
    if (this == o) return true;
    if (o == null) return false;
    Class<?> oClass = o instanceof HibernateProxy p ? p.getHibernateLazyInitializer().getPersistentClass() : o.getClass();
    Class<?> thisClass = this instanceof HibernateProxy p ? p.getHibernateLazyInitializer().getPersistentClass() : getClass();
    if (thisClass != oClass) return false;
    return getId() != null && getId().equals(((AbstractEntity) o).getId());
  }

  @Override
  public final int hashCode() {
    return this instanceof HibernateProxy p ? p.getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
  }
}
```

JPA Buddy가 생성하는 형태와 같은 구조이며 공통 식별자와 동등성을 `@MappedSuperclass`에 모은다. Hibernate 7.4.11에서 확인한 proxy 동작과 주의점은 다음과 같다.

- proxy는 entity를 상속한 별도 instance라 자기 field는 비어 있고 method 호출만 target에 위임한다. 상대 객체의 field를 직접 읽은 비교는 false, getter 비교는 true였다. 비교에는 getter를 쓴다. ID getter는 proxy를 초기화하지 않는다.
- `getClass()`는 proxy class와 실제 class가 달라 실패하므로 `HibernateProxy`의 persistent class로 비교한다.
- 위 `final` method는 proxy가 가로채지 않아 초기화 없이 비교했다. `final`이 아닌 `equals`는 proxy에서 호출하면 proxy가 초기화되어 SELECT가 나갔다. 다만 명세는 entity의 모든 method가 non-final이어야 한다고 하므로 `final`은 Hibernate 전용 선택이다.
- 상속 hierarchy의 다형성 연관 proxy는 선언 type으로 만들어진다. `Item` 연관이 실제로는 `Book`이어도 proxy의 persistent class는 `Item`이라 같은 row의 실제 instance와 class 비교가 어긋났다. hierarchy에서는 root class 기준 비교나 초기화를 감수한 `Hibernate.getClass()`를 검토한다.

### Lombok과 toString

- `@EqualsAndHashCode`는 기본으로 static과 transient가 아닌 field 전체를 쓴다. lazy 연관이 비교에 들어가 지연 로딩을 유발하고, generated ID와 변경 가능한 field가 섞여 저장 전후 hash가 바뀐다. `@Data`도 같은 equals를 만든다. JPA Buddy는 entity의 `@EqualsAndHashCode`와 `@Data`를 inspection으로 경고하고 JPA 전용 구현으로 바꾸는 action을 제공한다.
- `@ToString`도 기본으로 모든 non-static field를 출력하므로 연관 field는 `@ToString.Exclude`로 빼 lazy loading과 양방향 순환의 `StackOverflowError`를 막는다. 상위 `AbstractEntity`의 id까지 보려면 `@ToString(callSuper = true)`를 쓴다.
- 정적 분석기가 proxy class 비교를 다른 type 비교 실수로 경고하면 JPA와 Hibernate 환경에서 필요한 code이므로 그 검사만 build의 exclude filter로 제외한다.

Value type의 equality는 구성 값 전체로 판단하므로 이 규칙을 가져오지 않는다([[JPA-Value-Types]]). proxy 초기화와 동일성 규칙은 [[JPA-Loading-and-Cascade]]에 둔다.

## 출처

- [Jakarta Persistence 3.2, Entity Classes](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a18)
- [Jakarta Persistence 3.2, Primary Keys](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a132)
- [Jakarta Persistence 3.2, GeneratedValue Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14790)
- [Jakarta Persistence 3.2, SequenceGenerator Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a16164)
- [Hibernate ORM 7.4 User Guide, Using IDENTITY columns](https://docs.hibernate.org/orm/7.4/userguide/html_single/#identifiers-generators-identity)
- [Hibernate ORM 7.4 User Guide, Optimizers](https://docs.hibernate.org/orm/7.4/userguide/html_single/#identifiers-generators-optimizer)
- [Hibernate ORM 7.4 User Guide, Batching](https://docs.hibernate.org/orm/7.4/userguide/html_single/#batch)
- [Hibernate ORM 7.4 User Guide, Best practices for identifiers](https://docs.hibernate.org/orm/7.4/userguide/html_single/#best-practices-mapping-identifiers)
- [Hibernate ORM 7.4 User Guide, Implementing equals() and hashCode()](https://docs.hibernate.org/orm/7.4/userguide/html_single/#mapping-model-pojo-equalshashcode)
- [Hibernate ORM 7.4 API, `Hibernate`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/Hibernate.html)
- [Hibernate ORM 7.4 API, `LazyInitializer`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/proxy/LazyInitializer.html)
- [Project Lombok, @EqualsAndHashCode](https://projectlombok.org/features/EqualsAndHashCode)
- [Project Lombok, @ToString](https://projectlombok.org/features/ToString)
- [Best practices and common pitfalls of using Lombok with JPA — JPA Buddy](https://jpa-buddy.com/guides/best-practices-and-common-pitfalls-of-using-lombok-with-jpa/)
- [인프런, 김영한, 기본 키 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21694)
- [인프런, 토비, 엔티티 식별자와 JPA 엔티티](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301462)
- [인프런, 토비, 엔티티의 equals()와 hashCode() 구현](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312377)
- [인프런, 토비, Member 애그리거트 개발](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313420)

## 관련 문서

- [[JPA-Entity-Mapping|JPA 엔티티와 상속 매핑]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[Primary-Key-Strategy|기본 키 전략]]
- [[Spring-Data-JPA-Entity-Persistence|Spring Data JPA 엔티티 저장과 신규 판별]]
