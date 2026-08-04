---
tags: [jpa, spring-data-jpa, repository, entity-manager]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Data Repository", "SimpleJpaRepository"]
---

# Spring Data JPA Repository 추상화

Spring Data JPA는 repository 인터페이스를 읽어 proxy를 만들고, 기본 CRUD는 `SimpleJpaRepository`, 선언 쿼리는 query executor, 확장 기능은 fragment에 위임한다. 반복 코드는 줄지만 JPA의 unit of work와 생성 SQL은 그대로 남는다.

## 계층과 책임

| 층 | 책임 | 대표 API |
|---|---|---|
| Jakarta Persistence | ORM 표준과 생명주기 | `EntityManager`, `Query` |
| Hibernate | 대표 JPA 구현체 | HQL, provider hint, dirty checking 구현 |
| Spring Data JPA | JPA용 repository 조립 | `JpaRepository`, `@Query` |
| 애플리케이션 | transaction과 use case | service, domain policy |

```text
Application -> Spring Data JPA -> Jakarta Persistence <- Hibernate
```

Spring Data JPA 없이 `EntityManager`를 직접 써도 되고, Hibernate 대신 다른 JPA provider를 쓸 수도 있다. 반대로 repository 이름이 같아도 각 Spring Data 모듈의 쿼리 언어와 트랜잭션 특성까지 같아지는 것은 아니다.

## 현재 repository 인터페이스 구조

Spring Data JPA 4.1의 핵심 구조는 다음과 같다.

```text
Repository<T, ID>
├─ CrudRepository<T, ID>
│  └─ ListCrudRepository<T, ID>
├─ PagingAndSortingRepository<T, ID>
│  └─ ListPagingAndSortingRepository<T, ID>
└─ JpaRepository<T, ID>
   ├─ ListCrudRepository<T, ID>
   ├─ ListPagingAndSortingRepository<T, ID>
   └─ QueryByExampleExecutor<T>
```

Spring Data 3.0부터 sorting 계열이 CRUD 계열을 상속한다고 가정하면 안 된다. 필요한 기능을 조합하거나 JPA라면 보통 `JpaRepository`를 선택한다. 선택한 CRUD 메서드만 노출하려면 `@RepositoryDefinition` 또는 `Repository`를 직접 상속할 수 있다.

```java
public interface MemberRepository extends JpaRepository<Member, Long> {
}
```

대표 JPA 전용 메서드는 `flush()`, `saveAndFlush()`, batch delete와 `getReferenceById()`다. 과거의 `getOne()`과 `getById()` 대신 현재 API를 사용한다. reference는 실제 필드 접근 때 조회될 수 있으므로 transaction 밖에서 안전한 DTO처럼 다루지 않는다.

## proxy가 만들어지는 과정

1. Spring Boot가 application class 하위 package의 repository interface를 탐색한다.
2. domain type과 ID metadata, query method, fragment를 분석한다.
3. base implementation과 query interceptor를 조합한 proxy bean을 등록한다.
4. 호출 시 기본 메서드는 `SimpleJpaRepository`, 선언 메서드는 해석된 query로 전달한다.

탐색 경계를 바꾸거나 persistence unit이 여러 개면 `@EnableJpaRepositories(basePackages = ...)`로 명시한다. repository interface가 scan 범위 밖에 있거나 entity scan 범위와 어긋나면 bean 또는 managed type 오류가 난다.

Inherited CRUD method는 `SimpleJpaRepository`의 transaction 설정을 따른다. Read operation은 기본 `readOnly = true`, 나머지는 일반 `@Transactional`이다. 반면 직접 선언한 query method에는 transaction 설정이 자동 적용되지 않는다. 보통 service의 use case 시작점에서 경계를 정하며, 바깥 transaction이 repository 설정보다 우선한다. `readOnly`는 write 금지 장치가 아니라 JDBC와 provider에 전달되는 최적화 hint다. Hibernate에서는 flush mode를 `MANUAL`로 바꿔 dirty checking 비용을 줄일 수 있지만 의미적 불변성을 보장하지 않는다.

Repository infrastructure는 provider 예외를 Spring `DataAccessException` hierarchy로 변환한다. 원인 SQLState와 constraint 이름도 함께 남겨야 retry 가능 여부를 구분할 수 있다.

## 순수 JPA와 비교

```java
@Repository
public class JpaMemberRepository {
    @PersistenceContext
    private EntityManager em;

    public void save(Member member) {
        em.persist(member);
    }

    public Member find(Long id) {
        return em.find(Member.class, id);
    }
}
```

Spring Data가 없애는 것은 이 위임 코드다. 아래의 `EntityManager` 의미는 그대로다.

| API | 의미 |
|---|---|
| `persist` | 새 instance를 managed 상태로 전환 |
| `find` | ID 조회, persistence context 우선 |
| `merge` | 상태를 managed instance에 복사하고 그 instance 반환 |
| `remove` | managed instance 삭제 예약 |
| `flush` | 변경 내용을 DB와 동기화 |
| `clear` | context의 managed instance 제거 |

## 프로젝트 설정 원칙

- Spring Boot dependency management가 정한 Spring Data JPA, Hibernate, Jakarta Persistence 조합을 기본으로 사용한다.
- DB driver는 실행 환경에 맞춰 넣고 H2는 개발 또는 test profile에 한정한다.
- SQL 로그와 bind parameter 로그는 진단할 때만 켠다. 운영에서는 비용과 개인정보 노출을 함께 검토한다.
- schema 자동 생성은 학습과 test에 유용하지만 운영 변경은 migration으로 관리한다.
- entity 관계, cascade와 fetch type은 repository가 아니라 domain 및 transaction 경계에서 결정한다.

현재 project generator에서 보통 Spring Data JPA, 사용할 DB driver와 test dependency를 고른다. Web과 Lombok은 실제 요구가 있을 때만 추가한다. Starter의 transitive dependency에는 ORM, Spring JDBC와 transaction, connection pool 등이 들어오므로 `./gradlew dependencies`로 실제 version을 확인한다. Boot test starter는 JUnit 5와 AssertJ를 제공한다.

H2 client와 server를 분리해 쓰면 protocol version을 맞추고, file mode와 TCP mode의 connection URL을 구분한다. Repository test는 `flush()`와 `clear()`를 사용해 persistence context 착시를 제거하고 실제 SQL, lazy loading과 rollback을 확인한다. Datasource proxy나 SQL parameter logger는 optional 진단 도구이며 운영에서는 overhead와 민감 값 노출을 측정한다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

`create`와 `create-drop`은 schema를 지우므로 격리된 환경에서만 쓴다. `update`는 변경 순서, 삭제, index를 충분히 통제하지 못해 운영 migration 수단으로 삼지 않는다.

## 추상화의 경계

- method name이 짧은 CRUD와 조건 조회에는 생산성이 높다.
- 복잡한 조회는 `@Query`, Specification, custom fragment, Querydsl 또는 native SQL로 내려간다.
- repository가 반환한 entity는 persistence context와 lazy loading 규칙을 따른다.
- 어떤 API를 선택해도 index, 실행 계획, row 수와 transaction 경계는 별도로 검증한다.

## 출처

- [Spring Data JPA 4.1, Core Concepts](https://docs.spring.io/spring-data/jpa/reference/repositories/core-concepts.html)
- [Spring Data JPA 4.1, JpaRepository API](https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/JpaRepository.html)
- [Spring Data JPA 4.1, Transactionality](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html)
- [Spring Boot 4.1, JPA and Spring Data JPA](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.jpa-and-spring-data)
- [Jakarta Persistence 3.2 Specification](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)
- [매일메일, JPA를 사용하는 이유](https://www.maeil-mail.kr/question/25)
- [매일메일, JPA와 Hibernate, Spring Data JPA](https://www.maeil-mail.kr/question/26)
- [매일메일, EntityManager](https://www.maeil-mail.kr/question/29)
- [강의 소개](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27906)
- [강의 자료](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27995)
- [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27997)
- [라이브러리 살펴보기](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27998)
- [H2 데이터베이스 설치](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27999)
- [Spring Data JPA와 DB 설정](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28000)
- [예제 domain model](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28002)
- [순수 JPA 기반 repository](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28004)
- [공통 interface 설정](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28005)
- [공통 interface 적용](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28006)
- [공통 interface 분석](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28007)
- [Spring Data JPA 구현체 분석](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28027)
- 김영한 강사, [스프링 데이터 JPA 소개 1, 등장 이유](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114660)
- 김영한 강사, [스프링 데이터 JPA 소개 2, 기능](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114661)
- 김영한 강사, [스프링 데이터 JPA 주요 기능](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114662)
- 김영한 강사, [스프링 데이터 JPA 적용 1](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114663)
- 김영한 강사, [스프링 데이터 JPA 적용 2](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114664)
- 김영한 강사, [스프링 데이터 JPA 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114665)

## 관련 문서

- [[JPA-Ecosystem-and-Version-Migration|JPA 생태계와 버전 전환]]
- [[JPA-Persistence-Context|영속성 컨텍스트]]
- [[JPA-Relationship-Mapping|연관관계 매핑]]
- [[Spring-Data-JPA-Entity-Persistence|엔티티 저장]]
