---
tags: [querydsl, jpa, dynamic-query, bulk-dml, persistence-context]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Querydsl Dynamic Query", "Querydsl BooleanBuilder", "Querydsl Bulk DML"]
---

# Querydsl 동적 query와 bulk DML

동적 query는 입력 조건을 문자열로 이어 붙이는 문제가 아니라 predicate tree를 어떤 책임과 의미로 조합할지의 문제다. Bulk DML은 많은 row를 효율적으로 바꾸지만 persistence context의 entity lifecycle을 우회한다.

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

조건을 순서대로 추가하는 과정이 명확하고 AND와 OR group을 imperative하게 조립하기 쉽다. 조건이 많아지면 하나의 method가 input validation, predicate 구성과 query 실행을 모두 떠안을 수 있으므로 작은 이름 있는 predicate로 나눈다.

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

Helper가 `BooleanExpression`을 반환하면 `and`, `or`로 재조합하기 쉽다. 하지만 기술 조건을 무분별하게 공유하면 query마다 join과 null semantics가 달라져 오히려 결합이 커진다. Repository 내부에서 domain 의미가 분명한 조건만 재사용한다.

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

Version, update timestamp와 audit actor가 필요하면 set expression에 명시하고 정책을 검증한다. Delete cascade가 필요하면 DB FK cascade, 명시적 child delete 또는 entity 단위 제거 중 하나를 의식적으로 선택한다.

## 출처

- [OpenFeign Querydsl JPA tutorial, update and delete clauses](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [Jakarta Persistence 3.2, Bulk Update and Delete](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#bulk-update-and-delete-operations)
- [`BooleanBuilder` 동적 query](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30139)
- [`where` 다중 parameter 동적 query](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30140)
- [수정과 삭제 bulk operation](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30141)

## 관련 문서

- [[JPA-Persistence-Context|Persistence context와 flush]]
- [[JPA-JPQL|JPQL bulk DML]]
- [[Querydsl-Repository-and-Paging|Querydsl repository 구성]]
