---
tags: [querydsl, jpa, dynamic-query, bulk-dml, persistence-context]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Querydsl Dynamic Query", "Querydsl BooleanBuilder", "Querydsl Bulk DML"]
---

# Querydsl 동적 query와 bulk DML

동적 query는 입력 조건을 문자열로 이어 붙이는 문제가 아니라 predicate tree를 어떤 책임과 의미로 조합할지의 문제다. Bulk DML은 많은 row를 효율적으로 바꾸지만 persistence context의 entity lifecycle을 우회한다.

## 구현 방식 비교

회원 이름과 주문 상태처럼 선택 조건이 있는 검색은 값이 없을 때 해당 조건이 where 절에서 아예 빠져야 한다. 같은 요구를 세 방식으로 구현하면 차이가 드러난다.

| 방식 | 조건 분기 위치 | 오류 발견 시점 | 생성 query 가독성 | 표준 여부 |
|---|---|---|---|---|
| JPQL 문자열 조립 | 문자열 조립과 parameter binding 두 곳에서 같은 분기 반복 | 실행 시점 | 조립 code가 길고 연결어 처리가 섞임 | 표준 |
| JPA Criteria | `Predicate` 목록에 모아 `cb.and(...)` | 문자열 attribute는 실행 시점, static metamodel을 쓰면 compile 시점 | code만 보고 JPQL과 SQL을 떠올리기 어려움 | 표준 |
| Querydsl | 조건 method나 `BooleanBuilder` | path와 type 오류는 compile 시점 | `select/from/join/where`가 SQL 모양에 가까움 | 비표준 library, annotation processing 필요 |

문자열 조립은 조건마다 첫 조건인지 확인해 `where`나 `and`를 붙이고 같은 분기를 `setParameter`에서 다시 반복하므로, 둘이 어긋나거나 문자열에 오타가 있으면 실행해야 드러난다. Criteria는 표준이지만 유지보수할 사람이 생성 query를 읽어 내기 어려워 실무에서 피한다는 평가가 있다. Querydsl은 동적 query뿐 아니라 복잡한 정적 query도 SQL처럼 읽히게 하지만 Q type 생성과 fork 선택 비용이 따른다([[Querydsl-Setup-and-Compatibility]]). 이 평가는 경험에 근거한 판단이라 팀 역량과 build 제약에 따라 달라진다. Criteria를 써야 하는 환경에서는 조건을 이름 있는 단위로 묶는 [[Spring-Data-JPA-Specification-and-QBE|Specification]]을 비교한다.

## `BooleanBuilder`

```java
BooleanBuilder builder = new BooleanBuilder();

if (username != null && !username.isBlank()) {
    builder.and(member.username.eq(username));
}
if (ageGoe != null) {
    builder.and(member.age.goe(ageGoe));
}

List<Member> result = queryFactory
    .selectFrom(member)
    .where(builder)
    .fetch();
```

조건을 순서대로 추가하는 과정이 명확하고 AND와 OR group을 imperative하게 조립하기 쉽다. 항상 들어가야 하는 조건은 `new BooleanBuilder(member.status.eq(MemberStatus.ACTIVE))`처럼 생성자에 넣고 시작할 수 있고, `and(null)`은 무시된다. 조건이 많아지면 하나의 method가 input validation, predicate 구성과 query 실행을 모두 떠안을 수 있으므로 작은 이름 있는 predicate로 나눈다.

## Null을 반환하는 predicate helper

```java
private BooleanExpression usernameEq(String username) {
    return username == null || username.isBlank()
        ? null
        : member.username.eq(username);
}

private BooleanExpression ageGoe(Integer ageGoe) {
    return ageGoe == null ? null : member.age.goe(ageGoe);
}

List<Member> search(MemberCondition condition) {
    return queryFactory
        .selectFrom(member)
        .where(
            usernameEq(condition.username()),
            ageGoe(condition.ageGoe())
        )
        .fetch();
}
```

Querydsl의 `where(Predicate...)`는 null predicate를 제외한다. 이 성질은 `where` varargs 조립에 한정해 이해하고, 다른 API가 null을 같은 방식으로 처리한다고 가정하지 않는다.

Helper가 `Predicate`가 아니라 `BooleanExpression`을 반환해야 `and()`, `or()`로 다시 조립할 수 있다. 같은 helper를 entity 조회와 DTO projection query에서 그대로 재사용하고, 노출 가능 상태와 노출 기간처럼 늘 함께 쓰는 조건은 `isServiceable()` 같은 이름으로 묶는다. 하지만 기술 조건을 무분별하게 공유하면 query마다 join과 null semantics가 달라져 오히려 결합이 커진다. Repository 내부에서 domain 의미가 분명한 조건만 재사용한다.

### 조합할 때의 null

Null을 반환하는 helper를 `and()`로 묶으면 위치에 따라 결과가 다르다. OpenFeign Querydsl 7.7 source와 실행으로 확인했다.

- `left.and(null)`은 `left`를 그대로 반환한다. 오른쪽 null은 무시된다.
- `left`가 null이면 `.and()` 호출 자체가 Java `NullPointerException`이다. `usernameEq(username).and(ageGoe(age))`는 username 조건이 비는 순간 실패한다.
- `Expressions.allOf(BooleanExpression...)`과 `ExpressionUtils.allOf(Predicate...)`는 null 인자를 건너뛴다. 앞의 것은 `BooleanExpression`을 반환해 다시 조합할 수 있다. `BooleanBuilder.and(null)`도 무시한다.
- 인자가 모두 null이면 조합 결과도 null이고, 이를 `where`에 넘기면 조건이 통째로 사라져 전체 row를 읽는다.

```java
private BooleanExpression searchCondition(MemberCondition condition) {
    // usernameEq(...).and(ageGoe(...))는 username이 비면 NPE
    return Expressions.allOf(usernameEq(condition.username()), ageGoe(condition.ageGoe()));
}
```

조합 method는 `left.and(right)` 체인 대신 null-safe 조합을 쓰거나 각 helper가 null을 반환하지 않음을 보장한다. 모든 조건이 빠지는 입력은 아래 조건 객체 규칙대로 기본 조건, limit 또는 paging으로 막고 test한다.

## 조건 객체와 입력 의미

```java
public record MemberCondition(
    String username,
    String teamName,
    Integer ageGoe,
    Integer ageLoe
) {}
```

- Null이 조건 없음인지 `IS NULL` 검색인지 API contract에서 구분한다.
- 빈 문자열을 무시할지 exact match할지 먼저 정한다.
- Range 시작이 끝보다 큰 입력은 query 전에 거절한다.
- Enum, ID와 date는 controller에서 typed value로 변환한다.
- 모든 조건이 비었을 때 full scan을 허용할지 명시한다.
- 검색 endpoint의 page size와 sort path를 allowlist한다.

조건 객체는 HTTP DTO를 그대로 persistence layer에 노출하는 구실이 아니다. Application input에서 query condition으로 변환하면 공개 field와 entity field의 변경을 분리할 수 있다.

## Bulk update와 delete

```java
long updated = queryFactory
    .update(member)
    .set(member.status, MemberStatus.INACTIVE)
    .where(member.lastLoginAt.lt(cutoff))
    .execute();

long deleted = queryFactory
    .delete(member)
    .where(member.status.eq(MemberStatus.WITHDRAWN))
    .execute();
```

기존 값에 기반한 산술은 `set(member.age, member.age.add(1))`, `member.age.multiply(2)`처럼 expression으로 쓴다.

Bulk DML은 대상 entity를 하나씩 load하고 변경 감지하는 대신 집합 query를 실행한다. 영향 row 수를 반환하므로 기대 범위와 비교할 수 있다. 대신 다음 entity-level 동작을 자동으로 제공하지 않는다.

- 현재 persistence context의 managed object 동기화
- JPA cascade와 orphan removal
- Entity callback과 domain method
- Optimistic version 증가와 per-entity conflict 확인
- Auditing field와 second-level cache의 세밀한 동기화

## 안전한 실행 순서

```java
entityManager.flush();
long affected = queryFactory
    .update(member)
    .set(member.status, MemberStatus.INACTIVE)
    .where(member.id.in(ids))
    .execute();
entityManager.clear();
```

Bulk 직전 flush는 이전 변경을 DB에 반영하고, 실행 뒤 clear는 stale managed state를 제거한다. 무조건적인 clear는 같은 transaction에서 아직 저장하지 않은 변경을 버릴 수 있으므로 flush 순서와 transaction 경계를 test한다. 가능하면 bulk operation을 짧은 별도 use case로 격리하고 이후 entity를 다시 조회한다.

Clear 없이 다시 조회하는 것만으로는 부족하다. 재조회 SQL은 실행되어 DB의 새 값을 읽지만, 결과 row의 식별자와 같은 entity가 context에 이미 있으면 provider는 그 managed instance를 돌려주고 읽은 값으로 덮지 않는다. Hibernate 문서가 말하는 application 수준 repeatable read이며 DB isolation level이 아니라 1차 cache의 identity 보장에서 나온다. Hibernate 7.4.11에서 회원 3명 중 2명의 이름을 bulk로 바꾼 뒤 entity query는 같은 instance와 옛 이름 3개를, 같은 조건의 scalar projection은 새 값을 반환했고 `clear()` 뒤에야 entity query도 새 값을 돌려줬다. 다른 transaction이나 native SQL이 바꾼 경우도 같은 규칙이다([[JPA-Persistence-Context]]).

Version, update timestamp와 audit actor가 필요하면 set expression에 명시하고 정책을 검증한다. Delete cascade가 필요하면 DB FK cascade, 명시적 child delete 또는 entity 단위 제거 중 하나를 의식적으로 선택한다.

## 출처

- [OpenFeign Querydsl JPA tutorial, update and delete clauses](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [OpenFeign Querydsl 7.7, BooleanExpression source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/types/dsl/BooleanExpression.java)
- [OpenFeign Querydsl 7.7, Expressions source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/types/dsl/Expressions.java)
- [OpenFeign Querydsl 7.7, ExpressionUtils source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/types/ExpressionUtils.java)
- [OpenFeign Querydsl 7.7, BooleanBuilder source](https://github.com/OpenFeign/querydsl/blob/7.7/querydsl-libraries/querydsl-core/src/main/java/com/querydsl/core/BooleanBuilder.java)
- [Jakarta Persistence 3.2, Bulk Update and Delete](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a5636)
- [Jakarta Persistence 3.2, Criteria API](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a6925)
- [Hibernate ORM 7.4 User Guide, Physical Transactions](https://docs.hibernate.org/orm/7.4/userguide/html_single/#transactions-physical)
- [`BooleanBuilder` 동적 query](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30139)
- [`where` 다중 parameter 동적 query](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30140)
- [수정과 삭제 bulk operation](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30141)
- [동적 query와 성능 최적화 조회, Builder 사용](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30145)
- [동적 query와 성능 최적화 조회, where 절 parameter 사용](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30146)
- [주문 repository 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24298)
- [주문 검색 기능 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24301)

## 관련 문서

- [[JPA-Persistence-Context|Persistence context와 flush]]
- [[JPA-JPQL|JPQL bulk DML]]
- [[Querydsl-Repository-and-Paging|Querydsl repository 구성]]
