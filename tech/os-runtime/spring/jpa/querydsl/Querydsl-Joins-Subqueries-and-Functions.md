---
tags: [querydsl, jpa, join, subquery, database-function]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Querydsl Joins", "Querydsl Subquery", "Querydsl SQL Function"]
---

# Querydsl join, subquery와 function

Querydsl JPA가 표현할 수 있는 범위는 DSL API, 직렬화되는 JPQL/HQL, JPA provider와 target DB 기능의 교집합이다. Java에서 compile된다는 사실만으로 표준 JPQL 이식성과 provider 실행 가능성이 보장되지는 않는다.

## Association join과 root join

```java
List<Member> result = queryFactory
    .selectFrom(member)
    .join(member.team, team)
    .where(team.name.eq("platform"))
    .fetch();
```

Mapped association join은 FK join condition을 mapping에서 가져온다. 여러 root를 `from(member, team)`에 나열하고 `where`로 연결하는 theta join은 cross join 후보를 만든 뒤 filtering하므로, 의도와 생성 SQL을 확인한다. 이 방식으로는 outer join을 만들 수 없다.

Jakarta Persistence 3.2는 연관관계가 없는 entity type을 대상으로 하는 range join과 left range join도 표준화했다. 다만 오래된 provider와 Querydsl serializer는 이 문법을 지원하지 않을 수 있다. 과거 Hibernate 5.1 extension 설명과 현재 표준을 구분하고, 실제 version 조합을 integration test로 검증한다.

### 연관관계 없는 entity의 outer join

```java
List<Tuple> rows = queryFactory
    .select(member, team)
    .from(member)
    .leftJoin(team).on(member.username.eq(team.name))
    .fetch();
```

연관관계 join은 `leftJoin(member.team, team)`처럼 association path와 alias를 넘기지만, 연관관계 없는 join은 `leftJoin(team)`처럼 대상 entity 하나만 넘기고 ON에 조건을 적는다. OpenFeign Querydsl 7.7과 Hibernate 7.4.11에서 association 형태에 같은 ON을 주면 `on t1_0.id=m1_0.team_id and m1_0.username=t1_0.name`처럼 mapping의 FK 조건에 AND로 붙었고, 대상 entity 형태는 `on m1_0.username=t1_0.name`만 join 조건이 됐다. 연관관계 없는 조인을 의도하고 association path를 넘기면 같은 팀 소속이면서 이름도 같은 대상이라는 다른 의미가 된다. 실측에서도 이름이 같은 팀이 있는 member가 소속 팀이 달라 team이 null로 나왔다.

## ON과 WHERE의 차이

```java
List<Tuple> rows = queryFactory
    .select(member, team)
    .from(member)
    .leftJoin(member.team, team)
    .on(team.name.eq("platform"))
    .fetch();
```

`ON`은 join 대상 row를 제한한다. 같은 조건을 `WHERE`로 옮기면 unmatched left row가 제거되어 outer join 의미가 달라질 수 있다. Inner join은 `ON`으로 거르든 `WHERE`로 거르든 결과가 같고 optimizer도 두 위치를 비슷하게 처리할 수 있으므로 익숙한 `WHERE`에 둔다. `ON` 필터는 outer join에서 join 대상만 줄여야 할 때 쓴다.

## Fetch join

```java
Member loaded = queryFactory
    .selectFrom(member)
    .join(member.team, team).fetchJoin()
    .where(member.id.eq(id))
    .fetchOne();
```

Fetch join은 association을 같은 query에서 초기화하는 fetch plan이다. To-one fetch는 N+1을 줄이는 데 효과적이지만, to-many fetch는 parent row를 child 수만큼 증폭하고 여러 collection을 병렬 fetch하면 Cartesian product가 커질 수 있다. Index 없는 `List` 같은 bag을 둘 이상 fetch하면 Hibernate가 `MultipleBagFetchException`으로 거부하므로 collection fetch는 query당 하나로 둔다([[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]).

Hibernate 7.4는 지원 DB에서 collection fetch와 limit을 결합할 때 SQL을 재작성해 limit을 DB에서 처리한다. 과거 JVM 제한보다 개선됐지만 JPA provider 공통 동작은 아니다. Page 의미, root 수와 collection 완전성을 test하고 portable한 기본안으로 root ID page 후 association 조회나 batch fetch를 검토한다.

### Fetch join 적용을 test로 단언한다

Fetch join은 SQL 기능이 아니라 SQL join으로 연관 entity를 한 번에 초기화하는 JPA 기능이다. 문법은 일반 join 뒤에 `.fetchJoin()`을 붙이는 것뿐이어서, 누군가 이를 지우거나 mapping을 바꿔도 결과 값만 보는 test는 통과한다. Fetch plan 회귀는 초기화 여부로 단언한다.

```java
em.flush();
em.clear(); // setup에서 persist한 instance를 context에서 비운다

Member found = queryFactory
    .selectFrom(member)
    .join(member.team, team).fetchJoin()
    .where(member.username.eq("member1"))
    .fetchOne();

PersistenceUnitUtil util = em.getEntityManagerFactory().getPersistenceUnitUtil();
assertThat(util.isLoaded(found, "team")).isTrue();
```

Hibernate 7.4.11에서 LAZY `team`을 fetch join 없이 읽으면 false, fetch join으로 읽으면 true였다. `clear()`를 빠뜨리면 setup에서 persist한 실제 `Team` instance가 그대로 참조되어 fetch join 없이도 true가 나왔다. 명세는 attribute의 load state를 볼 때 `isLoaded(entity, attributeName)`을 쓰라고 하며, 연관 객체를 넘기는 `isLoaded(found.getTeam())`도 proxy 초기화 여부를 보여 준다. 이 검사는 test의 fetch plan 단언용이며 business 분기에는 쓰지 않는다([[JPA-Loading-and-Cascade]]). Query 수 자체는 Hibernate statistics로 단언할 수 있다([[JPA-Aggregate-Collection-Mapping]]).

## Subquery와 alias

```java
QMember memberSub = new QMember("memberSub");

List<Member> result = queryFactory
    .selectFrom(member)
    .where(member.age.goe(
        JPAExpressions
            .select(memberSub.age.avg())
            .from(memberSub)
    ))
    .fetch();
```

Outer query와 subquery에서 같은 Q singleton을 재사용하지 않고 별도 alias를 둔다. Standard JPQL subquery 위치는 `WHERE`와 `HAVING`이다. `SELECT` subquery가 실행되면 Hibernate HQL 같은 provider extension에 의존한 것이므로 portability를 별도로 표시한다.

Standard JPQL은 general `FROM` subquery를 지원하지 않는다. Hibernate HQL 7.4는 derived root, CTE와 lateral join을 지원하지만 Querydsl JPA DSL이 그 문법을 모두 모델링한다는 뜻은 아니다. 다음 대안을 query shape와 종속성에 따라 비교한다.

- Join으로 query를 다시 구성한다.
- 여러 query로 나누고 application에서 조합한다.
- 명시적 HQL을 query repository에 격리한다.
- `JPASQLQuery`, Querydsl SQL 또는 native SQL을 사용한다.

`JPASQLQuery`는 entity Q type이 아니라 table/column을 나타내는 SQL metadata가 필요할 수 있다. JPQL builder와 SQL builder의 path model을 혼동하지 않는다.

## Database function

DSL에 있는 `lower`, `upper`, `concat` 같은 표준 expression을 우선한다. 임의 function은 template로 표현할 수 있다.

```java
StringExpression normalized = Expressions.stringTemplate(
    "function('replace', {0}, {1}, {2})",
    member.username,
    Expressions.constant("member"),
    Expressions.constant("M")
);
```

`stringTemplate`은 query text를 만드는 도구이지 DB function을 등록하는 API가 아니다. Provider가 function 이름과 return type을 알아야 하고 DB가 실행해야 한다. Hibernate에서 custom HQL function이 필요하면 `FunctionContributor`로 등록하고 dialect별 integration test를 둔다. Template에 사용자 입력을 query fragment로 연결하지 말고 expression parameter로 전달한다.

## 경계 체크리스트

- Association join인지 unrelated entity join인지 구분했는가
- Left join filter가 `ON`과 `WHERE` 중 의도한 위치에 있는가
- Fetch join이 row 수와 pagination을 바꾸지 않는가
- Fetch join 적용 여부를 `clear()` 뒤 초기화 단언으로 test했는가
- Subquery 위치가 standard JPQL 범위인가
- Function이 provider에 등록되고 target dialect에서 실행되는가
- 최종 JPQL, SQL과 execution plan을 확인했는가

## 출처

- [Jakarta Persistence 3.2, Subqueries](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a5196)
- [Jakarta Persistence 3.2, PersistenceUnitUtil](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#_persistenceunitutil_)
- [Hibernate ORM 7.4, HQL guide](https://docs.hibernate.org/stable/orm/querylanguage/html_single/)
- [Hibernate ORM 7.4, Limits and Fetch Joins](https://docs.hibernate.org/orm/7.4/whats-new/)
- [Hibernate ORM 7.4, FunctionContributor](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/boot/model/FunctionContributor.html)
- [OpenFeign Querydsl JPA tutorial](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [기본 join](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30129)
- [ON clause join](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30130)
- [Fetch join](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30131)
- [Subquery](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30132)
- [SQL function 호출](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30142)

## 관련 문서

- [[JPA-JPQL|JPQL과 HQL]]
- [[JPA-Loading-and-Cascade|Loading과 fetch plan]]
- [[JPA-API-Collection-Query-Optimization|Collection query 최적화]]
