---
tags: [querydsl, jpa, join, subquery, database-function]
status: done
verified_at: 2026-08-04
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

Mapped association join은 FK join condition을 mapping에서 가져온다. 여러 root를 `from(member, team)`에 나열하고 `where`로 연결하는 방식은 cross join 후보를 만든 뒤 filtering하므로, 의도와 생성 SQL을 확인한다.

Jakarta Persistence 3.2는 연관관계가 없는 entity type을 대상으로 하는 range join과 left range join도 표준화했다. 다만 오래된 provider와 Querydsl serializer는 이 문법을 지원하지 않을 수 있다. 과거 Hibernate 5.1 extension 설명과 현재 표준을 구분하고, 실제 version 조합을 integration test로 검증한다.

## ON과 WHERE의 차이

```java
List<Tuple> rows = queryFactory
    .select(member, team)
    .from(member)
    .leftJoin(member.team, team)
    .on(team.name.eq("platform"))
    .fetch();
```

`ON`은 join 대상 row를 제한한다. 같은 조건을 `WHERE`로 옮기면 unmatched left row가 제거되어 outer join 의미가 달라질 수 있다. Inner join에서는 optimizer가 두 위치를 비슷하게 처리할 수 있어도 의도에 맞는 위치를 선택한다.

## Fetch join

```java
Member loaded = queryFactory
    .selectFrom(member)
    .join(member.team, team).fetchJoin()
    .where(member.id.eq(id))
    .fetchOne();
```

Fetch join은 association을 같은 query에서 초기화하는 fetch plan이다. To-one fetch는 N+1을 줄이는 데 효과적이지만, to-many fetch는 parent row를 child 수만큼 증폭하고 여러 collection을 병렬 fetch하면 Cartesian product가 커질 수 있다.

Hibernate 7.4는 지원 DB에서 collection fetch와 limit을 결합할 때 SQL을 재작성해 limit을 DB에서 처리한다. 과거 JVM 제한보다 개선됐지만 JPA provider 공통 동작은 아니다. Page 의미, root 수와 collection 완전성을 test하고 portable한 기본안으로 root ID page 후 association 조회나 batch fetch를 검토한다.

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
- Subquery 위치가 standard JPQL 범위인가
- Function이 provider에 등록되고 target dialect에서 실행되는가
- 최종 JPQL, SQL과 execution plan을 확인했는가

## 출처

- [Jakarta Persistence 3.2, Query Language](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#query-language)
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
