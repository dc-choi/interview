---
tags: [querydsl, jpa, predicate, pagination, aggregation]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Querydsl Predicates", "Querydsl 결과 조회", "Querydsl 기본 문법"]
---

# Querydsl predicate와 결과 조회

Q type의 path와 expression을 조합하면 property 이름과 값 type의 불일치를 Java compiler가 확인한다. 이 보장은 DSL 표현식까지이며, provider가 생성한 SQL의 의미, dialect 지원, index와 실행 계획은 runtime 검증 대상이다.

## JPQL과 Querydsl의 관계

```java
List<Member> members = queryFactory
    .selectFrom(member)
    .where(
        member.username.eq(username),
        member.age.between(20, 39)
    )
    .orderBy(member.age.desc(), member.id.asc())
    .fetch();
```

`where(Predicate...)`에 전달된 식은 AND로 결합되고 null 식은 제외된다. OR grouping은 `a.or(b)`처럼 expression tree에 명시한다. Parameter value는 보통 bind parameter가 되지만, query text와 bind value를 함께 관찰해야 최종 동작을 알 수 있다.

## 자주 쓰는 조건

| 의미 | Expression 예 |
|---|---|
| 같음, 다름 | `eq`, `ne` |
| 범위와 비교 | `between`, `gt`, `goe`, `lt`, `loe` |
| 집합 | `in`, `notIn` |
| Null | `isNull`, `isNotNull` |
| String | `startsWith`, `contains`, `like`, `equalsIgnoreCase` |
| Collection | `isEmpty`, `any` |

사용자 입력의 `%`와 `_`를 literal 검색으로 취급하려면 escape 정책을 명시한다. 대소문자 무시 함수나 leading wildcard는 index 사용을 바꿀 수 있으므로 실제 DB plan을 확인한다.

## 결과 cardinality

| API | 결과와 실패 의미 |
|---|---|
| `fetch()` | `List<T>`, 결과가 없으면 빈 list |
| `fetchOne()` | 0건이면 null, 2건 이상이면 non-unique exception |
| `fetchFirst()` | `limit(1).fetchOne()`에 해당 |

`fetchFirst()`는 여러 건 중 하나를 임의로 고르는 안전장치가 아니다. Unique한 결과가 요구되면 database constraint와 `fetchOne()`으로 invariant를 검증한다. 한 건만 필요해도 deterministic `orderBy`가 없으면 어떤 row가 선택될지 보장되지 않는다.

`fetchResults()`와 `fetchCount()`는 현재 Querydsl 계열에서 deprecated다. 특히 multiple `groupBy`나 `having`이 있는 count는 결과를 memory로 가져와 셀 수 있어 비용이 급증한다. Content query와 단순화한 count query를 각각 작성한다.

## 정렬과 paging

```java
List<Member> page = queryFactory
    .selectFrom(member)
    .orderBy(
        member.username.asc().nullsLast(),
        member.id.asc()
    )
    .offset(offset)
    .limit(size)
    .fetch();
```

Offset과 limit은 provider가 dialect별 SQL로 번역한다. Page 사이의 중복과 누락을 줄이려면 마지막 sort key에 unique한 tie-breaker를 둔다. 외부 `Sort` property를 path template로 곧바로 만들지 말고 API field에서 검증된 `OrderSpecifier`로 변환하는 allowlist를 둔다.

## 집계와 grouping

```java
List<Tuple> rows = queryFactory
    .select(team.name, member.count(), member.age.avg())
    .from(member)
    .join(member.team, team)
    .groupBy(team.name)
    .having(member.count().goe(2L))
    .fetch();
```

`count`, `sum`, `avg`, `max`, `min`, `groupBy`, `having`을 SQL과 비슷하게 조합한다. Aggregate의 Java result type과 null 가능성은 expression별로 확인한다. `Tuple`은 ad hoc 검증에는 편하지만 Querydsl type이므로 repository 밖에는 명시적 DTO를 반환한다.

## CASE, 상수와 문자열

```java
StringExpression label = new CaseBuilder()
    .when(member.age.between(0, 19)).then("minor")
    .when(member.age.between(20, 64)).then("adult")
    .otherwise("senior");

StringExpression display = member.username
    .concat("_")
    .concat(member.age.stringValue());
```

Simple case와 searched case를 지원하고 `Expressions.constant()`로 projection 상수를 넣을 수 있다. Presentation label처럼 DB 밖에서 결정할 수 있는 값은 application mapping이 더 단순할 수 있다. Number나 enum의 문자열 변환은 provider와 dialect 표현을 확인한다.

## 출처

- [OpenFeign Querydsl JPA tutorial](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [OpenFeign Querydsl 7.5, AbstractJPAQuery](https://github.com/OpenFeign/querydsl/blob/7.5/querydsl-libraries/querydsl-jpa/src/main/java/com/querydsl/jpa/impl/AbstractJPAQuery.java)
- [Jakarta Persistence 3.2, Query Language](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#query-language)
- [JPQL과 Querydsl 시작](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30122)
- [기본 Q type 활용](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30123)
- [검색 조건 query](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30124)
- [결과 조회](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30125)
- [정렬](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30126)
- [Paging](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30127)
- [집합과 aggregation](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30128)
- [CASE expression](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30133)
- [상수와 문자열 연결](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30134)
- [Querydsl 소개, 기존 방식의 문제점](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114667)
- [Querydsl 소개, type-safe query](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114668)

## 관련 문서

- [[Querydsl-Dynamic-Queries-and-Bulk-DML|동적 predicate 조합]]
- [[Querydsl-Projections|Projection과 DTO]]
- [[Pagination-Optimization|Pagination 최적화]]
